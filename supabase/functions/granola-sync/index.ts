// ============================================================================
// MOAI CS Dashboard — granola-sync (Supabase Edge Function)
//
// Puxa as gravações de 1:1 do Granola para granola_notas (08/10/2026). Roda por sondagem a cada 15
// minutos, pelo pg_cron (job granola-sync-15min), que chama esta função com o mesmo cabeçalho
// X-Sync-Secret de sync-monday.
//
// Fontes: secret GRANOLA_FONTES, um JSON [{"gestor":"email","chave":"grn_...","pasta":"fol_..."}].
// Sem o secret, a função registra sem_configuracao em sync_log e responde 200.
// A chave nunca é gravada nem logada. Só private_notes_* do Granola nunca é lido.
// Regras de vínculo, transcrição e retenção estão em logica.ts e na migração 20261008c_granola.sql.
// ============================================================================
import {
  lerFontes,
  participantesDaNota,
  vincularCS,
  linhaGranola,
  normalizarTranscricao,
  idNotaValido,
  type FonteGranola,
} from './logica.ts';

// Constantes da sincronização (decisões de 08/10/2026, a confirmar pelo Vitor).
const GRANOLA_BASE = 'https://public-api.granola.ai/v1';
const GRANOLA_INICIO = '2026-09-01T00:00:00Z';
const GRANOLA_SOBREPOSICAO_MIN = 120;
const GRANOLA_PAUSA_MS = 250;
const GRANOLA_RETENCAO_TRANSCRICAO_DIAS = 180;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SYNC_FUNCTION_SECRET = Deno.env.get('SYNC_FUNCTION_SECRET')!;

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

function pausa(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sb(caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase HTTP ${r.status}: ${await r.text()}`);
  return r;
}

async function sbGet(caminho: string): Promise<any[]> {
  return (await sb(caminho)).json();
}

async function logSync(board: string, status: 'sucesso' | 'erro', itens?: number, erro?: string) {
  await sb('sync_log', {
    method: 'POST',
    body: JSON.stringify([{ board, status, itens_sincronizados: itens ?? null, erro: erro ?? null, finished_at: new Date().toISOString() }]),
  });
}

// Chamada à API do Granola. Respeita o limite de 5 requisições por segundo e tenta de novo uma vez
// depois de 5 segundos quando vier 429. Nenhuma mensagem de erro carrega a chave.
async function granolaGet(caminho: string, chave: string): Promise<{ status: number; corpo: any }> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await fetch(GRANOLA_BASE + caminho, { headers: { Authorization: 'Bearer ' + chave } });
    await pausa(GRANOLA_PAUSA_MS);
    if (r.status === 429 && tentativa === 0) {
      await pausa(5000);
      continue;
    }
    const texto = await r.text();
    let corpo: any = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = null; }
    return { status: r.status, corpo };
  }
  return { status: 429, corpo: null };
}

async function listarNotas(fonte: FonteGranola, updatedAfter: string): Promise<any[]> {
  const notas: any[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ folder_id: fonte.pasta, page_size: '30', updated_after: updatedAfter });
    if (cursor) qs.set('cursor', cursor);
    const { status, corpo } = await granolaGet('/notes?' + qs.toString(), fonte.chave);
    if (status !== 200) throw new Error('Granola, listar notas: HTTP ' + status);
    notas.push(...(corpo?.notes || []));
    cursor = corpo?.hasMore ? corpo.cursor : null;
  } while (cursor);
  return notas;
}

// Nota completa com transcrição. Em 413 (transcrição grande), a nota vem sem transcrição e os segmentos
// são paginados em /transcript. Em 404 (nota ainda sem resumo), devolve null e a nota é pulada.
async function buscarNota(id: string, chave: string, pularTranscricao: boolean): Promise<{ nota: any; transcricao: any[] | null | undefined } | null> {
  if (pularTranscricao) {
    const { status, corpo } = await granolaGet(`/notes/${id}`, chave);
    if (status === 404) return null;
    if (status !== 200) throw new Error('Granola, buscar nota: HTTP ' + status);
    return { nota: corpo, transcricao: undefined };
  }
  const completa = await granolaGet(`/notes/${id}?include=transcript`, chave);
  if (completa.status === 404) return null;
  if (completa.status === 200) return { nota: completa.corpo, transcricao: completa.corpo?.transcript ?? null };
  if (completa.status !== 413) throw new Error('Granola, buscar nota: HTTP ' + completa.status);

  const metadados = await granolaGet(`/notes/${id}`, chave);
  if (metadados.status === 404) return null;
  if (metadados.status !== 200) throw new Error('Granola, buscar nota: HTTP ' + metadados.status);
  const segmentos: any[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ page_size: '100' });
    if (cursor) qs.set('cursor', cursor);
    const t = await granolaGet(`/notes/${id}/transcript?` + qs.toString(), chave);
    if (t.status === 404) return null;
    if (t.status !== 200) throw new Error('Granola, transcrição: HTTP ' + t.status);
    const pagina = Array.isArray(t.corpo) ? t.corpo : (t.corpo?.transcript ?? t.corpo?.segments ?? []);
    segmentos.push(...pagina);
    cursor = t.corpo?.hasMore ? t.corpo.cursor : null;
  } while (cursor);
  return { nota: metadados.corpo, transcricao: segmentos };
}

async function sincronizarFonte(fonte: FonteGranola, emailsGestores: Set<string>, mapaCS: Map<string, string>): Promise<number> {
  const ultimo = await sbGet(`granola_notas?select=atualizado_em_granola&gestor_email=eq.${encodeURIComponent(fonte.gestor)}&order=atualizado_em_granola.desc.nullslast&limit=1`);
  const ref = ultimo[0]?.atualizado_em_granola;
  const updatedAfter = ref
    ? new Date(Date.parse(ref) - GRANOLA_SOBREPOSICAO_MIN * 60000).toISOString()
    : GRANOLA_INICIO;

  // Notas com transcrição já expurgada não têm a transcrição buscada de novo, para a retenção valer.
  const expurgadas = new Set((await sbGet('granola_notas?select=note_id&transcricao_expurgada_em=not.is.null')).map((r: any) => r.note_id));

  const resumos = await listarNotas(fonte, updatedAfter);
  let itens = 0;
  for (const resumo of resumos) {
    if (!idNotaValido(resumo?.id)) continue;
    const detalhe = await buscarNota(resumo.id, fonte.chave, expurgadas.has(resumo.id));
    if (!detalhe) continue;
    const participantes = participantesDaNota(detalhe.nota);
    const vinculo = vincularCS(participantes, emailsGestores, mapaCS);
    const transcricao = detalhe.transcricao === undefined ? undefined : normalizarTranscricao(detalhe.transcricao);
    const linha = linhaGranola(detalhe.nota, fonte, vinculo, participantes, transcricao);
    if (!linha) continue;
    await sb('granola_notas?on_conflict=note_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([linha]),
    });
    itens++;
  }
  return itens;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-sync-secret') !== SYNC_FUNCTION_SECRET) {
    return resposta({ error: 'unauthorized' }, 401);
  }

  const bruto = Deno.env.get('GRANOLA_FONTES');
  if (!bruto) {
    await logSync('granola', 'sucesso', 0, 'GRANOLA_FONTES ausente');
    return resposta({ status: 'sem_configuracao' });
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    await logSync('granola', 'erro', undefined, 'GRANOLA_FONTES não é JSON válido');
    return resposta({ error: 'GRANOLA_FONTES não é JSON válido' }, 500);
  }

  const { fontes, descartes } = lerFontes(json);
  if (descartes.length) {
    await logSync('granola', 'erro', undefined, 'Fontes descartadas: ' + descartes.map((d) => d.motivo).join('; '));
  }

  try {
    const emailsGestores = new Set((await sbGet('gestores?select=email')).map((g: any) => String(g.email).toLowerCase()));
    const mapaCS = new Map<string, string>();
    for (const u of await sbGet('cs_usuarios?select=email,nome')) mapaCS.set(String(u.email).toLowerCase(), u.nome);

    const resultados: { gestor: string; itens: number | null; erro: string | null }[] = [];
    for (const fonte of fontes) {
      const board = `granola:${fonte.gestor}`;
      try {
        const itens = await sincronizarFonte(fonte, emailsGestores, mapaCS);
        await logSync(board, 'sucesso', itens);
        resultados.push({ gestor: fonte.gestor, itens, erro: null });
      } catch (e: any) {
        const erro = String(e?.message || e);
        await logSync(board, 'erro', undefined, erro);
        resultados.push({ gestor: fonte.gestor, itens: null, erro });
      }
    }

    const rExp = await sb('rpc/expurgar_transcricoes_granola', {
      method: 'POST',
      body: JSON.stringify({ p_dias: GRANOLA_RETENCAO_TRANSCRICAO_DIAS }),
    });
    const linhasExpurgadas = await rExp.json();

    return resposta({ fontes: fontes.length, descartadas: descartes.length, resultados, transcricoesExpurgadas: linhasExpurgadas });
  } catch (e: any) {
    console.error('granola-sync', e?.message || e);
    return resposta({ error: String(e?.message || e) }, 500);
  }
});
