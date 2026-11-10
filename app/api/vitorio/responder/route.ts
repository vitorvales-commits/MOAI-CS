// POST /api/vitorio/responder: pipeline do Vitorio no servidor (B1).
// Corpo: { texto } (caminho principal) ou os campos estruturados, mantidos para teste:
//   { tipo: 'elenco', mes: 'AAAA-MM-DD' } ou { tipo: 'carteira', group_id, data: 'AAAA-MM-DD' }.
// Leitura com o cliente da própria pessoa: vitorio_dicionario (CS, apelidos, vigências) e cs_periodos (RLS moai_select).
// Registra a consulta por vitorio_registrar_consulta_v2, com intenção e entidades (sem o texto de e-mail).
// Não devolve número, pontuação nem dado de 1:1.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { VITORIO_REGISTRAR_PESSOA } from '@/lib/constants';
import { perfilPermitido } from '@/lib/vitorio/servidor';
import { responderCarteira, responderElenco, type DadosTime } from '@/lib/vitorio/time-carteira';
import { responderTexto, type DadosPipeline, type Saida } from '@/lib/vitorio/pipeline';
import { normalizarTexto } from '@/lib/vitorio/texto';

export const dynamic = 'force-dynamic';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function hojeSP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// Resultado para o registro: resposta, ambigua (esclarecimento) ou nada (sem intenção).
function resultadoDoRegistro(s: Saida): 'resposta' | 'ambigua' | 'nada' {
  if (s.status === 'resposta') return 'resposta';
  if (s.status === 'esclarecimento') return 'ambigua';
  return 'nada';
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    const b: any = await req.json().catch(() => null);
    if (!b) return NextResponse.json({ error: 'Pergunta inválida.' }, { status: 400 });

    const [{ data: dic, error: eDic }, { data: periodos, error: ePer }] = await Promise.all([
      supabase.rpc('vitorio_dicionario'),
      supabase.from('cs_periodos').select('nome_curto, nome_completo, primeiro_mes, ultimo_mes'),
    ]);
    if (eDic || ePer) return NextResponse.json({ error: 'Não consegui ler os dados agora.' }, { status: 503 });

    const cs: { id: number; nome_curto: string; ativo: boolean; apelidos?: string[] }[] = dic?.cs || [];
    const apelidosCs: Record<number, string[]> = {};
    (dic?.apelidos || []).forEach((a: any) => {
      if (a.classe === 'cs' && a.cs_id != null) (apelidosCs[a.cs_id] ||= []).push(a.texto);
    });
    const conselhos: any[] = dic?.conselhos || [];
    const titulos: Record<string, string> = {};
    conselhos.forEach((v) => { if (v.titulo) titulos[v.group_id] = v.titulo; });

    const dados: DadosPipeline = {
      hojeIso: hojeSP(),
      periodos: (periodos || []).map((p: any) => ({
        nome_curto: p.nome_curto,
        nome_completo: p.nome_completo,
        primeiro_mes: String(p.primeiro_mes),
        ultimo_mes: p.ultimo_mes ? String(p.ultimo_mes) : null,
      })),
      ativosHoje: cs.filter((c) => c.ativo).map((c) => c.nome_curto),
      csPorId: Object.fromEntries(cs.map((c) => [c.id, c.nome_curto])),
      conselhos: titulos,
      // Início nulo (sem limite inferior) é a carga inicial: vira '-infinity' explicitamente.
      vigencias: conselhos.map((v: any) => ({ group_id: v.group_id, cs_id: v.cs_id, inicio: v.inicio ?? '-infinity', fim: v.fim ?? null })),
      conselhosLista: Object.entries(titulos).map(([group_id, titulo]) => ({ group_id, titulo })),
      csLista: cs.map((c) => ({ id: c.id, nome_curto: c.nome_curto, apelidos: apelidosCs[c.id] || [] })),
    };

    // Caminho principal: texto livre, pelo pipeline do servidor.
    if (typeof b.texto === 'string') {
      const texto = b.texto.trim().slice(0, 200);
      if (!texto || !normalizarTexto(texto)) return NextResponse.json({ error: 'Pergunta vazia.' }, { status: 400 });
      const saida = responderTexto(texto, dados);
      const perfil = perfilPermitido(String(b.perfil || ''), isGestor, csNome);
      // Registro: falha nunca atrapalha quem perguntou; o limite de 30 por hora também não aparece.
      const { error } = await supabase.rpc('vitorio_registrar_consulta_v2', {
        p_perfil: perfil,
        p_consulta: texto,
        p_resultado: resultadoDoRegistro(saida),
        p_chave: null,
        p_gravar_email: VITORIO_REGISTRAR_PESSOA,
        p_intencao: saida.intencao,
        p_entidades: saida.entidades,
      });
      if (error && error.code !== '54000') console.error('[api/vitorio/responder] registro', error.message);
      return NextResponse.json(saida);
    }

    // Campos estruturados (teste): mesmo pipeline de respostas, sem classificar o texto.
    if (b.tipo !== 'elenco' && b.tipo !== 'carteira') return NextResponse.json({ error: 'Pergunta inválida.' }, { status: 400 });
    if (b.tipo === 'elenco') {
      const mes = String(b.mes || '');
      if (!DATA.test(mes)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
      return NextResponse.json(responderElenco(mes, dados as DadosTime));
    }
    const groupId = String(b.group_id || '');
    const data = String(b.data || '');
    if (!groupId || !DATA.test(data)) return NextResponse.json({ error: 'Pergunta inválida.' }, { status: 400 });
    return NextResponse.json(responderCarteira(groupId, data, dados as DadosTime));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/responder]', e);
    return NextResponse.json({ error: 'Erro ao responder.' }, { status: 500 });
  }
}
