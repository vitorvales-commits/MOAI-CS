// Pontuação ponderada do CS (07/10/2026). Função pura e única: ranking, CS Top 3, card, radar,
// tooltip de composição e página do CS leem daqui. Nenhum componente recalcula.
//
// Regra de elegibilidade (regras_negocio, score_cs): só entra na média o indicador que tem meta
// cadastrada (maior que zero) e dado no período, com os pesos renormalizados sobre os elegíveis.
// Indicador sem meta nunca recebe crédito por padrão: aparece como sem meta e fica de fora.
// Roda com: node --experimental-strip-types tests/pontuacao.test.ts
import { PESOS_SCORE_CS, PONTUACAO_MIN_INDICADORES_COM_META } from './constants.ts';

export const LABELS_SCORE_CS: Record<string, string> = {
  carteira: 'Carteira de conselhos', casesSucesso: 'Cases de Sucesso', matchmakings: 'Matchmakings',
  rounds: 'Rounds', upsell: 'Upsell', indicacoes: 'Indicações', churn: 'Churn', downsell: 'Downsell',
};

export type IndicadorEntrada = { meta: number | null | undefined; alcancado: number | null | undefined; tipoMeta?: 'min' | 'max' | string };

export type ScoreItem = {
  chave: string; label: string; peso: number;
  valorAlcancado: number | null; meta: number | null;
  // null quando o indicador está sem meta ou sem dado: nunca zero.
  achievementPct: number | null;
  pontos: number | null;
  semMeta: boolean;
};

export type ScoreCS = {
  // Pontuação renormalizada de 0 a 100, ou null quando o estado é sem_dados_suficientes.
  score: number | null;
  elegiveis: number;
  estado: 'com_pontuacao' | 'sem_dados_suficientes';
  itens: ScoreItem[];
};

// Aproveitamento de 0 a 1, ou null quando não há meta ou dado.
export function aproveitamentoIndicador(ind: IndicadorEntrada | null | undefined): number | null {
  if (!ind) return null;
  const { alcancado, meta } = ind;
  if (alcancado === null || alcancado === undefined || Number.isNaN(alcancado)) return null;
  if (meta === null || meta === undefined || !(meta > 0)) return null;
  if (ind.tipoMeta === 'max') return Math.max(0, Math.min(1, 1 - alcancado / meta));
  return Math.max(0, Math.min(1, alcancado / meta));
}

// indicadores: chave de PESOS_SCORE_CS (exceto carteira) para { meta, alcancado, tipoMeta }.
// carteira: numConselhos contra a meta PRÓPRIA do CS (sem meta própria, o indicador não entra).
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
    if (ach !== null) { somaPonderada += ach * peso; somaPeso += peso; elegiveis++; }
    return {
      chave, label: LABELS_SCORE_CS[chave] || chave, peso,
      valorAlcancado: valor, meta,
      achievementPct: ach === null ? null : Math.round(ach * 100),
      pontos: ach === null ? null : Math.round(ach * peso * 10) / 10,
      semMeta: meta === null,
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
