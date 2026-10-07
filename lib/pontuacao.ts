// Pontuação ponderada do CS (07/10/2026). Função pura e única: ranking, CS Top 3, card, radar,
// tooltip de composição e página do CS leem daqui. Nenhum componente recalcula.
//
// Regras (regras_negocio, score_cs, e decisões do Vitor de 07/10/2026):
//  1. Só entra na média o indicador que tem meta cadastrada (maior que zero) e dado no período,
//     com os pesos renormalizados sobre os elegíveis. Sem meta: fica de fora, nunca recebe crédito.
//  2. A Carteira nunca dá ponto (PESO_CARTEIRA_NA_PONTUACAO = 0): o número de conselhos mede
//     alocação da liderança, não desempenho. Ela segue no retorno como informação, sem pontos.
//  3. Indicador de mínimo não tem teto: o aproveitamento é alcançado sobre meta e passa de 1 para
//     quem supera a meta (TETO_APROVEITAMENTO_INDICADOR nulo). Indicador de máximo (Churn,
//     Downsell) nunca passa de 1: ficar abaixo do máximo não dá bônus.
// Roda com: node --experimental-strip-types tests/pontuacao.test.ts
import { PESOS_SCORE_CS, PONTUACAO_MIN_INDICADORES_COM_META, TETO_APROVEITAMENTO_INDICADOR } from './constants.ts';

export const LABELS_SCORE_CS: Record<string, string> = {
  carteira: 'Carteira de conselhos', casesSucesso: 'Cases de Sucesso', matchmakings: 'Matchmakings',
  rounds: 'Rounds', upsell: 'Upsell', indicacoes: 'Indicações', churn: 'Churn', downsell: 'Downsell',
};

export type IndicadorEntrada = { meta: number | null | undefined; alcancado: number | null | undefined; tipoMeta?: 'min' | 'max' | string };

export type ScoreItem = {
  chave: string; label: string; peso: number;
  valorAlcancado: number | null; meta: number | null;
  // null quando o indicador está sem meta ou sem dado: nunca zero. Pode passar de 100.
  achievementPct: number | null;
  // Parte do aproveitamento acima de 100 (além da meta), em pontos percentuais. 0 quando não passou.
  alemDaMetaPct: number;
  pontos: number | null;
  semMeta: boolean;
  // Indicador informativo (Carteira): aparece com meta e valor, mas não soma pontos.
  semPontos: boolean;
};

export type ScoreCS = {
  // Pontuação renormalizada (100 = bateu exatamente todas as metas elegíveis; passa de 100 para
  // quem superou), ou null quando o estado é sem_dados_suficientes.
  score: number | null;
  // Quantidade de indicadores que pontuam (com meta e dado). A Carteira não conta.
  elegiveis: number;
  estado: 'com_pontuacao' | 'sem_dados_suficientes';
  itens: ScoreItem[];
};

// Aproveitamento (1 = bateu a meta), ou null quando não há meta ou dado. Mínimo sem teto, máximo
// limitado a 1.
export function aproveitamentoIndicador(ind: IndicadorEntrada | null | undefined): number | null {
  if (!ind) return null;
  const { alcancado, meta } = ind;
  if (alcancado === null || alcancado === undefined || Number.isNaN(alcancado)) return null;
  if (meta === null || meta === undefined || !(meta > 0)) return null;
  // Máximo: dentro do limite vale 1 (sem bônus); acima dele cai como meta sobre alcançado.
  if (ind.tipoMeta === 'max') return alcancado <= meta ? 1 : meta / alcancado;
  const ach = Math.max(0, alcancado / meta);
  return TETO_APROVEITAMENTO_INDICADOR === null ? ach : Math.min(TETO_APROVEITAMENTO_INDICADOR, ach);
}

// indicadores: chave de PESOS_SCORE_CS (exceto carteira) para { meta, alcancado, tipoMeta }.
// carteira: numConselhos contra a meta PRÓPRIA do CS, só informativa.
export function calcularScoreCS(
  indicadores: Record<string, IndicadorEntrada | null | undefined>,
  carteira: { numConselhos: number; metaPropria: number | null | undefined },
  minElegiveis: number = PONTUACAO_MIN_INDICADORES_COM_META,
): ScoreCS {
  let somaPeso = 0, somaPonderada = 0, elegiveis = 0;
  const itens: ScoreItem[] = Object.keys(PESOS_SCORE_CS).map((chave) => {
    const peso = PESOS_SCORE_CS[chave];
    const entrada: IndicadorEntrada | null | undefined = chave === 'carteira'
      ? { meta: carteira.metaPropria, alcancado: carteira.numConselhos, tipoMeta: 'min' }
      : indicadores[chave];
    const ach = aproveitamentoIndicador(entrada);
    const meta = entrada && entrada.meta !== null && entrada.meta !== undefined && entrada.meta > 0 ? Number(entrada.meta) : null;
    const valor = entrada && entrada.alcancado !== null && entrada.alcancado !== undefined ? Number(entrada.alcancado) : null;
    const semPontos = !(peso > 0);
    if (ach !== null && !semPontos) { somaPonderada += ach * peso; somaPeso += peso; elegiveis++; }
    const achPct = ach === null ? null : Math.round(ach * 100);
    return {
      chave, label: LABELS_SCORE_CS[chave] || chave, peso,
      valorAlcancado: valor, meta,
      achievementPct: achPct,
      alemDaMetaPct: achPct !== null && achPct > 100 ? achPct - 100 : 0,
      pontos: ach === null || semPontos ? null : Math.round(ach * peso * 10) / 10,
      semMeta: meta === null,
      semPontos,
    };
  });
  const estado = elegiveis >= minElegiveis ? 'com_pontuacao' : 'sem_dados_suficientes';
  return {
    score: estado === 'com_pontuacao' && somaPeso > 0 ? Math.round((somaPonderada / somaPeso) * 100) : null,
    elegiveis, estado, itens,
  };
}

export type CandidatoRanking<T> = { nome: string; ativo: boolean; ex?: boolean; pontuacao: ScoreCS; extra: T };
export type LinhaRanking<T> = CandidatoRanking<T> & { posicao: number };

// Só CS ativos e elegíveis, ordenados por pontuação. Empate: mais indicadores elegíveis e, depois,
// ordem alfabética. Ex CS e CS inativos nunca entram em ranking nominal.
export function rankingCSAtivos<T>(candidatos: CandidatoRanking<T>[]): LinhaRanking<T>[] {
  return candidatos
    .filter((c) => c.ativo && !c.ex && c.pontuacao.estado === 'com_pontuacao' && c.pontuacao.score !== null)
    .sort((a, b) =>
      (b.pontuacao.score as number) - (a.pontuacao.score as number)
      || b.pontuacao.elegiveis - a.pontuacao.elegiveis
      || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((c, i) => ({ ...c, posicao: i + 1 }));
}
