// ============================================================================
// Edge Function: sync-sympla (11/11/2026)
// ============================================================================
// Lê os eventos do organizador MOAI na API pública v3 do Sympla e grava em sympla_eventos o evento e as
// contagens de ingressos, check-ins e vendas dos últimos 7 dias. Roda pelo cron sync-sympla-15min.
//
// Segurança: o token do Sympla só existe no secret SYMPLA_TOKEN desta função (supabase secrets set). Ele
// nunca passa pelo Next.js, pelo Vercel, por tabela ou por log. Nenhum dado pessoal de participante é
// gravado: a função recebe a lista de participantes só para contar. Mesmo portão X-Sync-Secret da
// sync-monday. Sem token, registra um aviso no sync_log e sai com sucesso, para a cadeia cron e banco
// poder ser provada antes de o token existir.
// ============================================================================
import {
  SYMPLA_BASE, SYMPLA_JANELA_PASSADO_DIAS, SYMPLA_PAGE_SIZE,
  eventoDaApi, contarEvento, eventosParaContar, temProximaPagina, type EventoSymplaLinha,
} from './logica.ts';

const SYMPLA_TOKEN = Deno.env.get('SYMPLA_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SYNC_FUNCTION_SECRET = Deno.env.get('SYNC_FUNCTION_SECRET');
const MAX_PAGINAS = 50;

async function logSync(status: 'sucesso' | 'erro', itens?: number, erro?: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/sync_log`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ board: 'sympla', status, itens_sincronizados: itens ?? null, erro: erro ?? null, finished_at: new Date().toISOString() }]),
    });
  } catch (e) {
    console.error('[sync-sympla] não consegui gravar sync_log:', (e as Error)?.message);
  }
}

// Erro sem corpo da resposta: o Sympla pode ecoar parâmetros, e o token nunca vai para log.
async function symplaGet(caminho: string, params: Record<string, string | number>): Promise<any> {
  const url = new URL(SYMPLA_BASE + caminho);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const res = await fetch(url.toString(), { headers: { s_token: SYMPLA_TOKEN!, Accept: 'application/json' } });
    if (res.ok) return await res.json();
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (tentativa + 1))); continue; }
    throw new Error(`Sympla ${caminho.replace(/\d+/g, ':id')}: HTTP ${res.status}`);
  }
  throw new Error(`Sympla ${caminho.replace(/\d+/g, ':id')}: sem resposta após 3 tentativas`);
}

async function listarTudo(caminho: string, params: Record<string, string | number>): Promise<any[]> {
  const todos: any[] = [];
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const corpo = await symplaGet(caminho, { ...params, page_size: SYMPLA_PAGE_SIZE, page });
    const lote = Array.isArray(corpo?.data) ? corpo.data : [];
    todos.push(...lote);
    if (!temProximaPagina(corpo) || lote.length === 0) break;
  }
  return todos;
}

function dataSymplaFiltro(ms: number): string {
  const d = new Date(ms - 3 * 3600_000); // Brasília
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function upsert(rows: any[]) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sympla_eventos?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase upsert sympla_eventos: ${res.status} ${await res.text()}`);
}

// Eventos já contados depois do fim (terminados há mais de 2 dias): não precisam de nova leitura.
async function jaFechados(agora: number): Promise<Set<number>> {
  const corte = encodeURIComponent(new Date(agora - 2 * 86_400_000).toISOString());
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sympla_eventos?select=id&contagem_em=not.is.null&fim=lt.${corte}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase leitura sympla_eventos: ${res.status}`);
  const linhas = (await res.json()) as { id: number }[];
  return new Set(linhas.map((l) => Number(l.id)));
}

async function sincronizar(): Promise<number> {
  const agora = Date.now();
  const brutos = await listarTudo('/events', {
    from: dataSymplaFiltro(agora - SYMPLA_JANELA_PASSADO_DIAS * 86_400_000),
    field_sort: 'start_date', sort: 'ASC',
  });
  const eventos = brutos.map(eventoDaApi).filter((e): e is EventoSymplaLinha => !!e);
  const agoraIso = new Date(agora).toISOString();
  // Primeiro grava os eventos sem tocar nas contagens já existentes.
  await upsert(eventos.map((e) => ({ ...e, synced_at: agoraIso })));
  // Depois conta os eventos ativos, um por vez (a API do Sympla limita a taxa de chamadas).
  const alvo = eventosParaContar(eventos, agora, await jaFechados(agora));
  const falhas: string[] = [];
  for (const e of alvo) {
    try {
      const participantes = await listarTudo(`/events/${e.id}/participants`, {});
      const pedidos = await listarTudo(`/events/${e.id}/orders`, {});
      const c = contarEvento(participantes, pedidos, agora);
      await upsert([{ ...e, ...c, contagem_em: new Date().toISOString(), synced_at: agoraIso }]);
    } catch (err) {
      falhas.push(`${e.id}: ${(err as Error).message}`);
    }
  }
  if (falhas.length) throw new Error(`contagem falhou em ${falhas.length} de ${alvo.length} eventos: ${falhas.slice(0, 3).join('; ')}`);
  return eventos.length;
}

Deno.serve(async (req) => {
  if (!SYNC_FUNCTION_SECRET || req.headers.get('x-sync-secret') !== SYNC_FUNCTION_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  if (!SYMPLA_TOKEN) {
    await logSync('sucesso', 0, 'AVISO: aguardando o token do Sympla (secret SYMPLA_TOKEN)');
    return new Response(JSON.stringify({ aviso: 'sem token' }), { headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const n = await sincronizar();
    await logSync('sucesso', n);
    return new Response(JSON.stringify({ eventos: n }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    await logSync('erro', undefined, msg);
    return new Response(JSON.stringify({ erro: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
