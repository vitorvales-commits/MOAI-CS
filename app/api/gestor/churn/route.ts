// GET /api/gestor/churn?granularidade=mes|semana&ref=AAAA-MM&cs=&produtos=a,b&comunidade=1&categoria=: aba Churn
// da visão de gestor (onda 1, 30/09/2026). Devolve a série (via churn_serie), o gráfico já
// desenhado no servidor (graficoChurnSVG, o mesmo componente do relatório), a tabela de motivos,
// as opções de filtro e a análise salva do recorte, com aviso de desatualização por base_hash.
// Gestor-only, mesmo padrão de /api/gestor/visao-geral. Recalcula a cada acesso, como o resto do
// app; são 6 consultas leves em paralelo, carregadas só quando o gestor abre a aba (nunca na
// home), então não somam na concorrência de getDadosBrutos.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import {
  parseRecorte, RecorteInvalido, buscarSerie, graficoChurnSVG, tabelaMotivosHTML, amostraCorHTML,
  buscarOpcoesFiltro, buscarAnalise, buscarHashRecorte, iaDisponivel, descreverRecorte, recorteParaQuery,
  buscarComunidade, buscarRecordeChurn, referenciaDoGrafico, validarCsAtivo,
} from '@/lib/churn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const recorte = parseRecorte(new URL(req.url).searchParams);
    await validarCsAtivo(supabase, recorte);
    const [serie, opcoes, analise, hashAtual, comunidade, recorde] = await Promise.all([
      buscarSerie(supabase, recorte),
      buscarOpcoesFiltro(supabase),
      buscarAnalise(supabase, recorte),
      buscarHashRecorte(supabase, recorte),
      buscarComunidade(supabase, recorte),
      buscarRecordeChurn(supabase, recorte),
    ]);
    const referencia = referenciaDoGrafico(recorde, recorte.granularidade);
    return NextResponse.json({
      recorte,
      descricao: descreverRecorte(recorte),
      query: recorteParaQuery(recorte),
      total: serie.total,
      periodos: serie.periodos.map((p) => ({ rotulo: p.rotuloLongo, total: p.total })),
      legenda: serie.porMotivo.map((m) => ({ ...m, amostra: amostraCorHTML(m.cor) })),
      graficoSvg: graficoChurnSVG(serie, 'churnAba', referencia),
      comunidade,
      recorde: { referencia, ...recorde },
      tabelaHtml: tabelaMotivosHTML(serie),
      opcoes,
      analise: analise ? { ...analise, desatualizada: !!analise.baseHash && analise.baseHash !== hashAtual } : null,
      iaDisponivel: iaDisponivel(),
    });
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e?.status) return authErrorResponse(e);
    console.error('churn gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar o churn agora.' }, { status: 500 });
  }
}
