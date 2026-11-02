// Sugestão de metas por CS e para o time (refeita em 02/11/2026). Funções puras: recebem o histórico já
// apurado (realizado e meta de cada CS nos últimos meses fechados) e devolvem a sugestão com a explicação.
// Quem apura o realizado são as mesmas funções do relatório (lib/metas-sugestao-dados.ts); aqui nada é recontado.
//
// Regra, na ordem em que o gestor a leria:
//  1. Base própria: média ponderada do realizado do CS nos últimos meses fechados (50%, 30% e 20%, do mais
//     recente para o mais antigo), quando ele tem pelo menos MIN_MESES_HISTORICO_PROPRIO meses de dado.
//  2. Sem histórico próprio (CS novo ou que herdou carteira): média do time por conselho vezes a carteira dele,
//     com a rampa de CS novo (60% no primeiro mês, 80% no segundo).
//  3. Crescimento: indicadores de mínimo pedem a base mais CRESCIMENTO_ALVO. Churn em quantidade pede a base
//     menos REDUCAO_ALVO_RETENCAO.
//  4. Nunca abaixar a régua de quem bateu: se o CS bateu a meta do último mês, a sugestão não fica abaixo dela.
//  5. Revenue Churn não tem histórico próprio útil: vem da composição da carteira (lib/metas-carteira.ts), com
//     piso no MRR do produto mais barato da carteira.
import {
  PESOS_MESES_SUGESTAO, MIN_MESES_HISTORICO_PROPRIO, RAMPA_CS_NOVO, CRESCIMENTO_ALVO,
  REDUCAO_ALVO_RETENCAO, LIMIAR_META_MINIMA,
} from './constants.ts';
import { metaRevenueChurn, formatarReais, type ProdutoCarteira } from './metas-carteira.ts';

export type Direcao = 'min' | 'max';
export type AgregacaoTime = 'soma' | 'linha_unica' | 'razao_ponderada';

export interface IndicadorCatalogo { chave: string; rotulo: string; direcao: Direcao; fonte: 'calculado' | 'manual'; agregacao_time: AgregacaoTime }

// Um mês fechado de um CS: realizado e meta vigente de cada indicador (null quando não havia meta).
export interface MesCS { mes: string; realizado: Record<string, number>; meta: Record<string, number | null> }

export interface EntradaCS {
  nome: string;
  historico: MesCS[]; // meses fechados em que a pessoa era CS, em qualquer ordem
  carteira: number; // conselhos ativos na carteira hoje
  membros: number; // membros ativos da carteira hoje
  mesesDeCasa: number; // 0 no primeiro mês do CS
  composicao: ProdutoCarteira[]; // carteira por produto, para o Revenue Churn
}

// Realizado do time (contagem única por item) nos mesmos meses da janela, para os indicadores de linha única.
export interface MesTime { mes: string; realizado: Record<string, number | null> }

export interface Sugestao {
  sugerido: number | null;
  esperado: number | null;
  base: 'propria' | 'time' | 'carteira' | null;
  explicacao: string;
}

// Indicadores sem regra de sugestão: o motivo vai para a tela, para o gestor saber que é política e não falha.
const SEM_REGRA = new Set(['carteira', 'critico', 'downsell']);
export function motivoSemModelo(c: IndicadorCatalogo): string | null {
  if (c.chave === 'revenue_churn') return null;
  if (c.fonte === 'manual') return 'Indicador definido por política (fonte manual). Mantém o valor atual.';
  if (c.agregacao_time === 'razao_ponderada') return 'Indicador de razão ponderada, definido por política. Mantém o valor atual.';
  if (SEM_REGRA.has(c.chave)) return 'Este indicador não tem regra de sugestão. Mantém o valor atual.';
  return null;
}

export const rampa = (mesesDeCasa: number): number => (mesesDeCasa < RAMPA_CS_NOVO.length ? RAMPA_CS_NOVO[Math.max(0, mesesDeCasa)] : 1);

const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
const pct = (n: number) => `${Math.round(n * 100)}%`;
const NOME_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (iso: string) => NOME_MES[Number(iso.slice(5, 7)) - 1];

// Meses com dado do indicador, do mais recente para o mais antigo.
function mesesComDado(e: EntradaCS, chave: string): MesCS[] {
  return e.historico.filter((m) => m.realizado[chave] !== undefined && m.realizado[chave] !== null)
    .sort((a, b) => (a.mes < b.mes ? 1 : -1));
}

// Média ponderada pelos PESOS_MESES_SUGESTAO, renormalizada sobre os meses que existem.
export function mediaPonderada(valores: number[]): number | null {
  const n = Math.min(valores.length, PESOS_MESES_SUGESTAO.length);
  if (!n) return null;
  let soma = 0, pesos = 0;
  for (let i = 0; i < n; i++) { soma += valores[i] * PESOS_MESES_SUGESTAO[i]; pesos += PESOS_MESES_SUGESTAO[i]; }
  return soma / pesos;
}

// Média do time por conselho na janela: soma do realizado de quem tem histórico sobre a soma das carteiras
// desses CS em cada mês com dado.
export function taxaTimePorConselho(todos: EntradaCS[], chave: string): number | null {
  let x = 0, e = 0;
  todos.forEach((cs) => mesesComDado(cs, chave).forEach((m) => { x += m.realizado[chave]; e += cs.carteira; }));
  return e > 0 ? x / e : null;
}
export function taxaTimePorMembro(todos: EntradaCS[], chave: string): number | null {
  let x = 0, e = 0;
  todos.forEach((cs) => mesesComDado(cs, chave).forEach((m) => { x += m.realizado[chave]; e += cs.membros; }));
  return e > 0 ? x / e : null;
}

export function sugerirCS(e: EntradaCS, c: IndicadorCatalogo, todos: EntradaCS[], metaChurnDoCS?: number | null): Sugestao {
  if (c.chave === 'revenue_churn') {
    const r = metaRevenueChurn(e.composicao, metaChurnDoCS ?? null);
    return { sugerido: r.valor, esperado: r.valor, base: 'carteira', explicacao: r.explicacao };
  }
  const dir = c.direcao;
  const meses = mesesComDado(e, c.chave);
  const nome = c.rotulo.toLowerCase();
  const partes: string[] = [];
  let esperado: number;
  let base: Sugestao['base'];

  if (meses.length >= MIN_MESES_HISTORICO_PROPRIO) {
    esperado = mediaPonderada(meses.map((m) => m.realizado[c.chave])) as number;
    base = 'propria';
    const serie = meses.slice(0, PESOS_MESES_SUGESTAO.length).map((m) => `${rotuloMes(m.mes)} ${fmt(m.realizado[c.chave], 0)}`).join(', ');
    partes.push(`${e.nome} realizou ${serie}. Média ponderada, com mais peso no mês mais recente: ${fmt(esperado)}.`);
  } else {
    const taxa = dir === 'max' ? taxaTimePorMembro(todos, c.chave) : taxaTimePorConselho(todos, c.chave);
    if (taxa === null) {
      return { sugerido: null, esperado: null, base: null, explicacao: 'Nem o CS nem o time têm meses fechados com este indicador. Mantém a meta vigente.' };
    }
    const exp = dir === 'max' ? e.membros : e.carteira;
    const fr = rampa(e.mesesDeCasa);
    esperado = taxa * exp * fr;
    base = 'time';
    partes.push(`${e.nome} ainda não tem ${MIN_MESES_HISTORICO_PROPRIO} meses fechados próprios. O time faz ${fmt(taxa, 2)} ${dir === 'max' ? 'por membro' : 'por conselho'}; com ${exp} ${dir === 'max' ? 'membros' : 'conselhos'}${fr < 1 ? ` e ${pct(fr)} de rampa por ser ${e.mesesDeCasa === 0 ? 'o primeiro' : 'o segundo'} mês` : ''}, o esperado é ${fmt(esperado)}.`);
  }

  if (dir === 'max') {
    const alvo = esperado * (1 - REDUCAO_ALVO_RETENCAO);
    const sugerido = Math.max(0, Math.round(alvo));
    partes.push(`Pedindo ${pct(REDUCAO_ALVO_RETENCAO)} a menos: ${fmt(alvo)}. Limite sugerido ${sugerido}.`);
    return { sugerido, esperado: alvo, base, explicacao: partes.join(' ') };
  }

  const alvo = esperado * (1 + CRESCIMENTO_ALVO);
  partes.push(`Com ${pct(CRESCIMENTO_ALVO)} de crescimento: ${fmt(alvo)}.`);
  if (alvo < LIMIAR_META_MINIMA) {
    return { sugerido: null, esperado: alvo, base, explicacao: [...partes, `Abaixo de ${fmt(LIMIAR_META_MINIMA)}, não vira meta. Mantém a meta vigente.`].join(' ') };
  }
  let sugerido = Math.max(1, Math.round(alvo));
  const ult = meses[0];
  const metaUlt = ult ? ult.meta[c.chave] ?? null : null;
  if (ult && metaUlt !== null && metaUlt > 0 && ult.realizado[c.chave] >= metaUlt && sugerido < metaUlt) {
    partes.push(`Bateu a meta de ${rotuloMes(ult.mes)} (${fmt(ult.realizado[c.chave], 0)} de ${fmt(metaUlt, 0)}), então a régua não desce: fica em ${fmt(metaUlt, 0)}.`);
    sugerido = metaUlt;
  } else {
    partes.push(`Sugestão ${sugerido}.`);
  }
  return { sugerido, esperado: alvo, base, explicacao: partes.join(' ') };
}

export interface SugestaoTime { sugerido: number | null; somaIndividuais: number | null; explicacao: string }

export function sugerirTime(c: IndicadorCatalogo, historicoTime: MesTime[], porCS: Sugestao[]): SugestaoTime {
  const soma = porCS.every((s) => s.sugerido === null) ? null : porCS.reduce((a, s) => a + (s.sugerido ?? 0), 0);
  if (c.agregacao_time === 'soma' || c.chave === 'revenue_churn') {
    if (soma === null) return { sugerido: null, somaIndividuais: null, explicacao: 'Nenhum CS com sugestão. Mantém a meta vigente do time.' };
    const txt = c.chave === 'revenue_churn' ? formatarReais(soma) : String(soma);
    return { sugerido: soma, somaIndividuais: soma, explicacao: `Soma das metas individuais sugeridas: ${txt}.` };
  }
  // linha_unica: o mesmo item pode contar para vários CS, então a meta do time vem do realizado único do time.
  const meses = historicoTime.filter((m) => m.realizado[c.chave] !== null && m.realizado[c.chave] !== undefined)
    .sort((a, b) => (a.mes < b.mes ? 1 : -1));
  const media = mediaPonderada(meses.map((m) => m.realizado[c.chave] as number));
  if (media === null) return { sugerido: null, somaIndividuais: soma, explicacao: 'Sem realizado do time na janela. Mantém a meta vigente.' };
  const fator = c.direcao === 'max' ? 1 - REDUCAO_ALVO_RETENCAO : 1 + CRESCIMENTO_ALVO;
  const alvo = media * fator;
  if (c.direcao === 'min' && alvo < LIMIAR_META_MINIMA) return { sugerido: null, somaIndividuais: soma, explicacao: 'Esperado do time abaixo de 0,5. Mantém a meta vigente.' };
  const sugerido = c.direcao === 'max' ? Math.max(0, Math.round(alvo)) : Math.max(1, Math.round(alvo));
  const serie = meses.slice(0, PESOS_MESES_SUGESTAO.length).map((m) => `${rotuloMes(m.mes)} ${fmt(m.realizado[c.chave] as number, 0)}`).join(', ');
  const dif = soma === null || soma === sugerido ? '' : ` A soma das individuais seria ${soma}, porque um mesmo item conta para mais de um CS.`;
  return { sugerido, somaIndividuais: soma, explicacao: `Time realizou ${serie}, contando cada item uma vez. Média ponderada ${fmt(media)}, ${c.direcao === 'max' ? `com ${pct(REDUCAO_ALVO_RETENCAO)} a menos` : `com ${pct(CRESCIMENTO_ALVO)} de crescimento`} ${fmt(alvo)}. Sugestão ${sugerido}.${dif}` };
}
