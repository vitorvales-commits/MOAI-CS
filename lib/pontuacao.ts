// Pontuação ponderada do CS. Função pura e única: ranking, CS Top 3, card, radar, tooltip de composição e
// página do CS leem daqui. Nenhum componente recalcula.
//
// Regras (regras_negocio, score_cs, decisões do Vitor de 07/10/2026 e de 02/11/2026):
//  1. Só os indicadores de crescimento (direção mínima: cases, matchmakings, rounds, upsell, indicações)
//     geram pontos. Entram na média só os que têm meta cadastrada (maior que zero) e dado no período, com
//     os pesos renormalizados sobre esses elegíveis. Sem meta: fica de fora, nunca recebe crédito.
//  2. A Carteira nunca dá ponto (PESO_CARTEIRA_NA_PONTUACAO = 0): mede alocação da liderança, não
//     desempenho. Segue no retorno só como informação.
//  3. Indicador de mínimo não tem teto: quem supera a meta passa de 100 (TETO_APROVEITAMENTO_INDICADOR nulo).
//  4. Indicadores de máximo (Churn e Downsell) são redutores (02/11/2026): ficar dentro do limite NÃO dá
//     ponto, porque no primeiro dia do mês todo CS está com churn zero sem ter feito nada. Eles só
//     descontam quando passam do limite, na proporção do estouro: desconto = peso renormalizado vezes
//     (1 menos limite sobre realizado). Limite zero estourado desconta o peso inteiro. A nota nunca fica
//     abaixo de zero. Antes desta regra, um CS sem nenhuma entrega começava o mês com cerca de 12 pontos
//     só pelo churn zero (caso George, novembro de 2026).
// Roda com: npx tsx tests/pontuacao.test.ts
import { PESOS_SCORE_CS, PONTUACAO_MIN_INDICADORES_COM_META, TETO_APROVEITAMENTO_INDICADOR } from './constants.ts';

export const LABELS_SCORE_CS: Record<string, string> = {
  carteira: 'Carteira de conselhos', casesSucesso: 'Cases de Sucesso', matchmakings: 'Matchmakings',
  rounds: 'Rounds', upsell: 'Upsell', indicacoes: 'Indicações', churn: 'Churn', downsell: 'Downsell',
};

export type IndicadorEntrada = { meta: number | null | undefined; alcancado: number | null | undefined; tipoMeta?: 'min' | 'max' | string };

export type ScoreItem = {
  chave: string; label: string; peso: number;
  valorAlcancado: number | null; meta: number | null;
  // null quando o indicador está sem meta ou sem dado: nunca zero. Pode passar de 100. Nos redutores mostra
  // 100 dentro do limite e cai quando estoura, só para leitura: não é crédito.
  achievementPct: number | null;
  // Parte do aproveitamento acima de 100 (além da meta), em pontos percentuais. 0 quando não passou.
  alemDaMetaPct: number;
  // Pontos somados (crescimento) ou descontados (redutor, valor negativo ou zero). null quando fora da conta.
  pontos: number | null;
  semMeta: boolean;
  // Indicador informativo (Carteira): aparece com meta e valor, mas não soma nem desconta.
  semPontos: boolean;
  // Indicador de máximo: nunca soma, só desconta quando estoura o limite.
  redutor: boolean;
  // Verdadeiro quando o redutor passou do limite e está descontando.
  estourou: boolean;
};

export type ScoreCS = {
  // Pontuação renormalizada (100 = bateu exatamente todas as metas de crescimento elegíveis, sem estouro de
  // churn e downsell; passa de 100 para quem superou), ou null quando o estado é sem_dados_suficientes.
  score: number | null;
  // Quantidade de indicadores de crescimento que pontuam (com meta e dado). Carteira e redutores não contam.
  elegiveis: number;
  estado: 'com_pontuacao' | 'sem_dados_suficientes';
  itens: ScoreItem[];
  // Bônus de pontuação concedido pelo gestor no período (somado ao total). Zero quando a pontuação não existe.
  bonus: number;
};

// Registro de bônus como vem de bonus_aplicados. mes_referencia é AAAA-MM-DD (dia 1).
export type BonusRegistro = { pontos: number; mes_referencia: string; anulado_em?: string | null };

// Soma dos bônus não anulados cujo mês de referência cai no intervalo [mesInicio, mesFim] (datas AAAA-MM-DD,
// inclusivas). Mês: um bônus soma só no mês escolhido. Período geral: soma o ano inteiro.
export function bonusDoPeriodo(bonus: BonusRegistro[], mesInicio: string, mesFim: string): number {
  return bonus
    .filter((b) => !b.anulado_em && b.mes_referencia >= mesInicio && b.mes_referencia <= mesFim)
    .reduce((s, b) => s + (Number(b.pontos) || 0), 0);
}

const temMeta = (m: number | null | undefined, redutor: boolean) =>
  m !== null && m !== undefined && !Number.isNaN(m) && (redutor ? m >= 0 : m > 0);
const temValor = (v: number | null | undefined) => v !== null && v !== undefined && !Number.isNaN(v);

// Aproveitamento (1 = bateu a meta), ou null quando não há meta ou dado. Mínimo sem teto, máximo limitado
// a 1. Usado também pelo radar e pelos selos de status: não é a regra de pontos dos redutores.
export function aproveitamentoIndicador(ind: IndicadorEntrada | null | undefined): number | null {
  if (!ind) return null;
  const { alcancado, meta } = ind;
  if (!temValor(alcancado)) return null;
  if (meta === null || meta === undefined || !(meta > 0)) return null;
  if (ind.tipoMeta === 'max') return (alcancado as number) <= meta ? 1 : meta / (alcancado as number);
  const ach = Math.max(0, (alcancado as number) / meta);
  return TETO_APROVEITAMENTO_INDICADOR === null ? ach : Math.min(TETO_APROVEITAMENTO_INDICADOR, ach);
}

// Fração do peso que um redutor desconta: 0 dentro do limite, 1 menos limite sobre realizado quando
// estoura, 1 quando o limite é zero e houve qualquer ocorrência. null sem meta ou sem dado.
export function fracaoDesconto(ind: IndicadorEntrada | null | undefined): number | null {
  if (!ind || !temValor(ind.alcancado) || !temMeta(ind.meta, true)) return null;
  const real = ind.alcancado as number, lim = ind.meta as number;
  if (real <= lim) return 0;
  return lim > 0 ? 1 - lim / real : 1;
}

const um = (n: number) => Math.round(n * 10) / 10;

// indicadores: chave de PESOS_SCORE_CS (exceto carteira) para { meta, alcancado, tipoMeta }.
// carteira: numConselhos contra a meta PRÓPRIA do CS, só informativa.
export function calcularScoreCS(
  indicadores: Record<string, IndicadorEntrada | null | undefined>,
  carteira: { numConselhos: number; metaPropria: number | null | undefined },
  minElegiveis: number = PONTUACAO_MIN_INDICADORES_COM_META,
  // Bônus do período (bonusDoPeriodo). Soma ao total só quando há pontuação; nunca cria pontuação.
  bonus: number = 0,
): ScoreCS {
  const chaves = Object.keys(PESOS_SCORE_CS);
  const entradaDe = (chave: string): IndicadorEntrada | null | undefined => (chave === 'carteira'
    ? { meta: carteira.metaPropria, alcancado: carteira.numConselhos, tipoMeta: 'min' }
    : indicadores[chave]);

  // Base da renormalização: só os de crescimento com meta e dado.
  let somaPeso = 0, somaPonderada = 0, elegiveis = 0;
  chaves.forEach((chave) => {
    const peso = PESOS_SCORE_CS[chave];
    const e = entradaDe(chave);
    if (!(peso > 0) || !e || e.tipoMeta === 'max') return;
    const ach = aproveitamentoIndicador(e);
    if (ach === null) return;
    somaPeso += peso; somaPonderada += ach * peso; elegiveis++;
  });

  let desconto = 0;
  const itens: ScoreItem[] = chaves.map((chave) => {
    const peso = PESOS_SCORE_CS[chave];
    const entrada = entradaDe(chave);
    const redutor = !!entrada && entrada.tipoMeta === 'max' && chave !== 'carteira';
    const semPontos = !(peso > 0);
    const metaOk = !!entrada && temMeta(entrada.meta, redutor);
    const meta = metaOk ? Number((entrada as IndicadorEntrada).meta) : null;
    const valor = entrada && temValor(entrada.alcancado) ? Number(entrada.alcancado) : null;
    const ach = aproveitamentoIndicador(entrada);
    const achPct = redutor && meta === 0 && valor !== null ? (valor === 0 ? 100 : 0) : (ach === null ? null : Math.round(ach * 100));
    let pontos: number | null = null;
    let estourou = false;
    if (!semPontos && somaPeso > 0) {
      if (redutor) {
        const f = fracaoDesconto(entrada);
        if (f !== null) {
          const d = f * (peso / somaPeso) * 100;
          desconto += d; estourou = f > 0;
          pontos = f > 0 ? -um(d) : 0;
        }
      } else if (ach !== null) {
        pontos = um(ach * peso);
      }
    }
    return {
      chave, label: LABELS_SCORE_CS[chave] || chave, peso,
      valorAlcancado: valor, meta,
      achievementPct: achPct,
      alemDaMetaPct: !redutor && achPct !== null && achPct > 100 ? achPct - 100 : 0,
      pontos,
      semMeta: meta === null,
      semPontos,
      redutor,
      estourou,
    };
  });
  const estado = elegiveis >= minElegiveis ? 'com_pontuacao' : 'sem_dados_suficientes';
  const bruto = somaPeso > 0 ? (somaPonderada / somaPeso) * 100 - desconto : null;
  const comPontuacao = estado === 'com_pontuacao' && bruto !== null;
  const bonusEfetivo = comPontuacao ? Math.max(0, Math.round(Number(bonus) || 0)) : 0;
  return {
    score: comPontuacao ? Math.max(0, Math.round(bruto as number)) + bonusEfetivo : null,
    elegiveis, estado, itens, bonus: bonusEfetivo,
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

// Onde estão os pontos que faltam. Deriva só do ScoreCS já calculado: para cada indicador de crescimento,
// o peso renormalizado (soma 100), os pontos conquistados e os que seguem em aberto. Redutores aparecem fora
// da conta com o desconto que estão aplicando (zero dentro do limite). Não recalcula a pontuação.
export type DetalheScoreItem = {
  chave: string; label: string; peso: number;
  pesoNormalizado: number | null; conquistado: number | null; emAberto: number | null;
  valorAlcancado: number | null; meta: number | null;
  foraDaConta: boolean; motivoFora: 'sem_meta' | 'informativo' | 'redutor' | null;
  // Pontos descontados pelo redutor (positivo), 0 dentro do limite, null para os demais.
  desconto: number | null;
};
// bonus: pontos de bônus do período que compõem o total (zero quando não há). Vai como linha "Bônus" na composição.
export type DetalheScore = { itens: DetalheScoreItem[]; totalEmAberto: number | null; totalDesconto: number; bonus: number };

export function detalharScoreCS(s: ScoreCS): DetalheScore {
  const entram = s.itens.filter((i) => i.pontos !== null && !i.semPontos && !i.redutor);
  const soma = entram.reduce((t, i) => t + i.peso, 0);
  let totalDesconto = 0;
  const itens: DetalheScoreItem[] = s.itens.map((i) => {
    const entra = !i.redutor && i.pontos !== null && !i.semPontos && soma > 0 && i.achievementPct !== null;
    const pesoNormalizado = entra ? (i.peso / soma) * 100 : null;
    const conquistado = entra ? ((i.achievementPct as number) / 100) * (pesoNormalizado as number) : null;
    const desconto = i.redutor && i.pontos !== null ? Math.abs(i.pontos) : null;
    if (desconto) totalDesconto += desconto;
    const motivoFora: DetalheScoreItem['motivoFora'] = entra ? null
      : i.semPontos ? 'informativo' : (i.redutor && i.pontos !== null ? 'redutor' : 'sem_meta');
    return {
      chave: i.chave, label: i.label, peso: i.peso,
      pesoNormalizado: pesoNormalizado === null ? null : um(pesoNormalizado),
      conquistado: conquistado === null ? null : um(conquistado),
      emAberto: entra ? um(Math.max(0, (pesoNormalizado as number) - (conquistado as number))) : null,
      valorAlcancado: i.valorAlcancado, meta: i.meta,
      foraDaConta: !entra, motivoFora, desconto: desconto === null ? null : um(desconto),
    };
  });
  const abertos = itens.filter((i) => i.emAberto !== null);
  return {
    itens,
    totalEmAberto: abertos.length ? um(abertos.reduce((t, i) => t + (i.emAberto as number), 0)) : null,
    totalDesconto: um(totalDesconto),
    bonus: s.bonus,
  };
}
