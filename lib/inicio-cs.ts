// Dados da home do CS (redesenho v3, 20/10/2026): a faixa do mês, a pontuação contra a mediana, as metas com
// ritmo e os pontos tomados. Só devolve números do próprio CS e a mediana do time (um número), nunca a lista
// nominal de colegas. Nada é recalculado aqui: ranking, pontuação e ritmo vêm de generateVisaoGestor
// (calcularScoreCS e calcularRitmo), a mediana vem de lib/evolucao.ts e a variação de variacaoDoRanking.
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateVisaoGestor, listarAdvertenciasCS } from './reports';
import { variacaoDoRanking } from './evolucao-dados';
import { mediana } from './evolucao';
import { hojeSP } from './gtd-prazos';
import { MESES_ORDEM } from './constants';

// Indicadores de volume que entram nas metas do mês da home (Carteira e churn viram uma linha à parte).
export const INICIO_METAS = ['casesSucesso', 'upsell', 'matchmakings', 'rounds', 'indicacoes'] as const;

export type MetaInicio = {
  chave: string; label: string; meta: number | null; realizado: number | null;
  status: 'no_ritmo' | 'atencao' | 'atras' | 'cedo' | 'sem_meta';
  previsto: number | null; falta: number | null; porSemana: number | null;
};

// Último dia real do mês (cobre os 12 meses e ano bissexto), sem fixar 31 (bug registrado em 17/09/2026).
export function diasDoMesReal(ano: number, mes1a12: number): number {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
}

// Quanto falta por semana para fechar a meta: falta dividido pelas semanas que restam no mês (mínimo de uma).
export function faltaPorSemana(falta: number, diasRestantes: number): number {
  const semanas = Math.max(1, diasRestantes / 7);
  return Math.round((falta / semanas) * 10) / 10;
}

export async function dadosInicioCS(sb: SupabaseClient, seletorMes: string, ano: number, csNome: string) {
  const hoje = hojeSP();
  const visao = await generateVisaoGestor(sb, seletorMes, ano, false);
  const minha = visao.porCS.find((c) => c.nome === csNome);
  if (!minha) throw new Error('Este perfil não aparece entre os CS ativos do período.');
  const meuRank = visao.ranking.find((r) => r.nome === csNome) || null;
  const med = mediana(visao.ranking.map((r) => r.scoreReal));

  const variacoes = await variacaoDoRanking(sb, seletorMes, ano, visao.ranking, hoje).catch(() => null);
  const variacao = variacoes ? variacoes.get(csNome) ?? null : null;

  const idxMes = MESES_ORDEM.indexOf(seletorMes);
  const diasNoMes = idxMes === -1 ? null : diasDoMesReal(ano, idxMes + 1);
  const mesAtual = idxMes !== -1 && hoje.slice(0, 7) === ano + '-' + String(idxMes + 1).padStart(2, '0');
  const dia = Number(hoje.slice(8, 10));
  const diasRestantes = mesAtual && diasNoMes ? diasNoMes - dia : null;

  const linhaRitmo = visao.ritmo ? visao.ritmo.linhas.find((l) => l.nome === csNome) : null;
  const metas: MetaInicio[] = INICIO_METAS.map((chave) => {
    const ind: any = (minha.indicadores as any)[chave];
    const it: any = linhaRitmo ? linhaRitmo.itens[chave] : null;
    const meta = ind && ind.meta !== null && ind.meta !== undefined && ind.meta > 0 ? Number(ind.meta) : null;
    const realizado = ind && ind.calculado !== null && ind.calculado !== undefined ? Number(ind.calculado) : null;
    return {
      chave, label: (visao.labelsIndicador as any)[chave] || chave, meta, realizado,
      status: meta === null ? 'sem_meta' : (it ? it.status : 'sem_meta'),
      previsto: it && it.previsto !== undefined ? it.previsto : null,
      falta: meta === null ? null : Math.max(0, meta - (realizado || 0)),
      porSemana: meta === null || diasRestantes === null || meta - (realizado || 0) <= 0 ? null : faltaPorSemana(meta - (realizado || 0), diasRestantes),
    } as MetaInicio;
  });
  const comMeta = metas.filter((m) => m.status !== 'sem_meta');
  const noRitmo = comMeta.filter((m) => m.status === 'no_ritmo' || m.status === 'cedo').length;
  // Foco: o indicador atrás do ritmo com a maior falta proporcional à meta.
  const atras = comMeta.filter((m) => m.status === 'atras' && m.falta !== null && m.meta)
    .sort((a, b) => (b.falta as number) / (b.meta as number) - (a.falta as number) / (a.meta as number))[0] || null;
  const foco = atras && diasRestantes !== null
    ? { chave: atras.chave, label: atras.label, falta: atras.falta, porSemana: faltaPorSemana(atras.falta as number, diasRestantes) }
    : null;

  const cart: any = (minha.indicadores as any).numConselhos;
  const churn: any = (minha.indicadores as any).churn;

  let pontos: { ativos: number; proximoVencimento: string | null } | null = null;
  try {
    const adv = await listarAdvertenciasCS(sb, csNome);
    const vencimentos = adv.registros.filter((r) => r.ativa).map((r) => {
      const d = new Date(r.aplicadoEm); d.setMonth(d.getMonth() + r.validadeMeses);
      return d.toISOString().slice(0, 10);
    }).sort();
    pontos = { ativos: adv.pontuacaoAtiva, proximoVencimento: vencimentos[0] || null };
  } catch { pontos = null; }

  return {
    periodo: { mes: seletorMes, ano, hoje, diasNoMes, diasRestantes, mesAtual },
    pontuacao: {
      nota: meuRank ? meuRank.scoreReal : null, posicao: meuRank ? meuRank.posicao : null,
      estado: minha.pontuacao.estado, elegiveis: minha.pontuacao.elegiveis, minimo: visao.minimoIndicadores,
      mediana: med,
      // Posição relativa à mediana, nunca a lista de colegas: 'acima', 'na' ou 'abaixo'.
      contraMediana: meuRank && meuRank.scoreReal !== null && med !== null
        ? (meuRank.scoreReal > med ? 'acima' : (meuRank.scoreReal === med ? 'na' : 'abaixo'))
        : null,
      variacaoPontos: variacao ? variacao.pontos : null,
    },
    faixa: { noRitmo, comMeta: comMeta.length, foco },
    metas,
    carteira: { numConselhos: cart ? cart.calculado : null, meta: cart ? cart.meta : null, semMetaPropria: !!(cart && cart.semMetaPropria), churn: churn ? churn.calculado : null, metaChurn: churn ? churn.meta : null },
    pontosTomados: pontos,
  };
}
