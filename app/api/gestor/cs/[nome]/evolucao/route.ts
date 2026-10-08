// GET  /api/gestor/cs/:nome/evolucao?mes=&ano=&meses= — pontuação, posição, radar e mediana do time nos
//      últimos meses, terminando no mês escolhido. Meses em EVOLUCAO_JANELAS (padrão 6).
// POST /api/gestor/cs/:nome/evolucao — { acao: 'reabrir', ano, mes } apaga a fotografia de um mês fechado.
// Restrita a gestor: a checagem vem ANTES de tocar em qualquer dado.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { MESES_ORDEM, EVOLUCAO_JANELAS, EVOLUCAO_JANELA_PADRAO, EVOLUCAO_MES_INICIAL } from '@/lib/constants';
import { RADAR_EIXOS } from '@/lib/reports';
import { mesesDaJanela, mediana, serieDoCS, leituraEvolucao, maiorQuedaIndicador, type EixoSerie } from '@/lib/evolucao';
import { obterMesesTime } from '@/lib/evolucao-dados';
import { hojeSP } from '@/lib/gtd-prazos';

export const dynamic = 'force-dynamic';

function mesNumero(mesNome: string | null, ano: number): number | null {
  if (!mesNome || mesNome === 'Visão Geral') return 12;
  const idx = MESES_ORDEM.indexOf(mesNome);
  return idx === -1 ? null : idx + 1;
}

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  const { searchParams } = new URL(req.url);
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const ano = Number(searchParams.get('ano'));
    const mesFim = mesNumero(searchParams.get('mes'), ano);
    const n = Number(searchParams.get('meses') || EVOLUCAO_JANELA_PADRAO);
    if (!ano || !mesFim) return NextResponse.json({ error: 'Parâmetros obrigatórios: mes e ano válidos' }, { status: 400 });
    if (!EVOLUCAO_JANELAS.includes(n)) return NextResponse.json({ error: 'Janela inválida' }, { status: 400 });

    const hoje = hojeSP();
    const janela = mesesDaJanela(ano, mesFim, n, EVOLUCAO_MES_INICIAL);
    const calculados = await obterMesesTime(supabase, janela, hoje);

    const meses = calculados.map((m) => {
      const linhas = m.linhas || [];
      const cs = linhas.find((l) => l.csNome === nome) || null;
      return {
        ano: m.ano,
        mes: m.mes,
        rotulo: m.rotulo,
        aberto: m.aberto,
        pendente: m.pendente,
        cs: cs ? { pontuacao: cs.pontuacao, posicao: cs.posicao, totalRankeados: cs.totalRankeados, estado: cs.estado, elegiveis: cs.elegiveis, radar: cs.radar } : null,
        medianaTime: mediana(linhas.map((l) => l.pontuacao)),
      };
    });

    const serie = serieDoCS(meses.map((m) => ({ rotulo: m.rotulo, aberto: m.aberto, cs: m.cs, medianaTime: m.medianaTime })));
    const eixos: EixoSerie[] = RADAR_EIXOS.map((e, i) => ({
      chave: e.chave,
      label: e.label,
      pctPorMes: meses.map((m) => (m.cs && m.cs.radar[i] ? m.cs.radar[i].pct : null)),
    }));

    return NextResponse.json({
      meses,
      leitura: leituraEvolucao(serie),
      maiorQueda: maiorQuedaIndicador(eixos),
      hoje,
    });
  } catch (e: any) {
    console.error('gestor evolucao GET', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const body = await req.json();
    if (body?.acao !== 'reabrir') return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    const ano = Number(body?.ano), mes = Number(body?.mes);
    if (!ano || !mes || mes < 1 || mes > 12) return NextResponse.json({ error: 'Parâmetros obrigatórios: ano e mes' }, { status: 400 });
    const { data, error } = await supabase.rpc('reabrir_fechamento_mensal', { p_ano: ano, p_mes: mes });
    if (error) throw new Error(error.message);
    return NextResponse.json({ apagadas: data });
  } catch (e: any) {
    console.error('gestor evolucao POST', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
