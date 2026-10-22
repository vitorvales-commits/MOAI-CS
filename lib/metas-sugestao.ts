// Sugestão de metas por CS e para o time (22/10/2026). Funções puras: recebem o histórico já apurado
// (realizado e exposição por CS e mês) e devolvem a sugestão com a explicação. Quem apura o realizado
// são as mesmas funções do relatório; aqui nada é recontado.
//
// Modelo Gama Poisson com encolhimento (estimador bayesiano empírico):
//   r_time = soma(x) / soma(E)                      taxa do time na janela
//   r_cs   = (x_cs + a * r_time) / (E_cs + a)       taxa do CS puxada para a do time quando há pouco histórico
//   lambda = r_cs * carteira * rampa                esperado no mês alvo
// Direção mínima: lambda * (1 + crescimento). Direção máxima (churn): taxa por membro ativo e
// lambda * (1 - redução). Contagem vira inteiro; lambda >= 0,5 garante meta mínima 1.
import {
  FORCA_PRIOR_CONSELHOS, FORCA_PRIOR_MEMBROS, RAMPA_CS_NOVO, CRESCIMENTO_ALVO,
  REDUCAO_ALVO_RETENCAO, LIMIAR_META_MINIMA, MIN_EXPOSICAO_SUGESTAO,
} from './constants.ts';

export type Direcao = 'min' | 'max';
export type AgregacaoTime = 'soma' | 'linha_unica' | 'razao_ponderada';

export interface IndicadorCatalogo { chave: string; rotulo: string; direcao: Direcao; fonte: 'calculado' | 'manual'; agregacao_time: AgregacaoTime }

// Um mês fechado de um CS: conselhos realizados (exposição), membros ativos e o realizado de cada indicador.
export interface MesCS { mes: string; conselhos: number; membros: number; realizado: Record<string, number> }

export interface EntradaCS {
  nome: string;
  historico: MesCS[];
  carteira: number; // conselhos ativos na carteira
  membros: number; // membros ativos da carteira
  mesesDeCasa: number; // 0 no primeiro mês do CS
}

export interface Sugestao { sugerido: number | null; esperado: number | null; explicacao: string }

// Indicadores sem sugestão: o motivo vai para a tela, para o gestor saber que é política e não falha.
const SEM_REGRA = new Set(['carteira', 'critico', 'downsell']);
export function motivoSemModelo(c: IndicadorCatalogo): string | null {
  if (c.fonte === 'manual') return 'Indicador definido por política (fonte manual). Mantém o valor atual.';
  if (c.agregacao_time === 'razao_ponderada') return 'Indicador de razão ponderada, definido por política. Mantém o valor atual.';
  if (SEM_REGRA.has(c.chave)) return 'Este indicador não tem regra de sugestão. Mantém o valor atual.';
  return null;
}

export const rampa = (mesesDeCasa: number): number => (mesesDeCasa < RAMPA_CS_NOVO.length ? RAMPA_CS_NOVO[Math.max(0, mesesDeCasa)] : 1);

const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
const pct = (n: number) => `${Math.round(n * 100)}%`;

// Exposição de um mês: conselhos realizados para direção mínima, membros ativos para direção máxima.
const exposicao = (m: MesCS, dir: Direcao) => (dir === 'max' ? m.membros : m.conselhos);
const unidade = (dir: Direcao) => (dir === 'max' ? 'membro' : 'conselho');

export function exposicaoTotal(entradas: EntradaCS[], dir: Direcao): number {
  return entradas.reduce((s, e) => s + e.historico.reduce((a, m) => a + exposicao(m, dir), 0), 0);
}

export function taxaTime(entradas: EntradaCS[], chave: string, dir: Direcao): number | null {
  const E = exposicaoTotal(entradas, dir);
  if (E <= 0) return null;
  const x = entradas.reduce((s, e) => s + e.historico.reduce((a, m) => a + (m.realizado[chave] ?? 0), 0), 0);
  return x / E;
}

export function sugerirCS(e: EntradaCS, c: IndicadorCatalogo, todos: EntradaCS[]): Sugestao {
  const dir = c.direcao;
  const rTime = taxaTime(todos, c.chave, dir);
  if (exposicaoTotal(todos, dir) < MIN_EXPOSICAO_SUGESTAO || rTime === null) {
    return { sugerido: null, esperado: null, explicacao: `Histórico insuficiente: o time tem menos de ${MIN_EXPOSICAO_SUGESTAO} ${unidade(dir)}s na janela. Mantém a meta vigente.` };
  }
  const alfa = dir === 'max' ? FORCA_PRIOR_MEMBROS : FORCA_PRIOR_CONSELHOS;
  const Ecs = e.historico.reduce((a, m) => a + exposicao(m, dir), 0);
  const xcs = e.historico.reduce((a, m) => a + (m.realizado[c.chave] ?? 0), 0);
  const rCs = (xcs + alfa * rTime) / (Ecs + alfa);
  const base = dir === 'max' ? e.membros : e.carteira;
  const fatorRampa = rampa(e.mesesDeCasa);
  const lambda = rCs * base * fatorRampa;
  const ajuste = dir === 'max' ? 1 - REDUCAO_ALVO_RETENCAO : 1 + CRESCIMENTO_ALVO;
  const alvo = lambda * ajuste;
  const rotuloTaxa = dir === 'max' ? 'por membro ativo' : 'por conselho';
  const partes = [
    `Time tem ${fmt(rTime, 2)} ${c.rotulo.toLowerCase()} ${rotuloTaxa}.`,
    `${e.nome} tem ${base} ${dir === 'max' ? 'membros ativos' : 'conselhos'}${fatorRampa < 1 ? `, ${e.mesesDeCasa === 0 ? 'primeiro' : 'segundo'} mês na carteira (${pct(fatorRampa)})` : ''}.`,
    `Esperado ${fmt(lambda)}, ${dir === 'max' ? `com redução de ${pct(REDUCAO_ALVO_RETENCAO)}` : `com ${pct(CRESCIMENTO_ALVO)} de crescimento`} ${fmt(alvo)}.`,
  ];
  if (alvo < LIMIAR_META_MINIMA) {
    return { sugerido: null, esperado: alvo, explicacao: [...partes, `Abaixo de ${fmt(LIMIAR_META_MINIMA)}: não sugere meta, o esperado é quase zero. Mantém a meta vigente.`].join(' ') };
  }
  const sugerido = Math.max(1, Math.round(alvo));
  return { sugerido, esperado: alvo, explicacao: [...partes, `Sugestão ${sugerido}.`].join(' ') };
}

export interface SugestaoTime { sugerido: number | null; somaIndividuais: number | null; explicacao: string }

export function sugerirTime(c: IndicadorCatalogo, todos: EntradaCS[], porCS: Sugestao[]): SugestaoTime {
  const dir = c.direcao;
  const rTime = taxaTime(todos, c.chave, dir);
  const soma = porCS.every((s) => s.sugerido === null) ? null : porCS.reduce((a, s) => a + (s.sugerido ?? 0), 0);
  if (exposicaoTotal(todos, dir) < MIN_EXPOSICAO_SUGESTAO || rTime === null) {
    return { sugerido: null, somaIndividuais: soma, explicacao: 'Histórico insuficiente na janela. Mantém a meta vigente do time.' };
  }
  if (c.agregacao_time === 'soma') {
    return { sugerido: soma, somaIndividuais: soma, explicacao: soma === null ? 'Nenhum CS com sugestão. Mantém a meta vigente do time.' : `Soma das metas individuais sugeridas: ${soma}.` };
  }
  // linha_unica: a meta do time não é a soma das individuais (o mesmo item pode contar para vários CS).
  const carteiraTotal = todos.reduce((s, e) => s + (dir === 'max' ? e.membros : e.carteira), 0);
  const ajuste = dir === 'max' ? 1 - REDUCAO_ALVO_RETENCAO : 1 + CRESCIMENTO_ALVO;
  const alvo = rTime * carteiraTotal * ajuste;
  if (alvo < LIMIAR_META_MINIMA) return { sugerido: null, somaIndividuais: soma, explicacao: 'Esperado do time abaixo de 0,5. Mantém a meta vigente.' };
  const sugerido = Math.max(1, Math.round(alvo));
  const dif = soma === null ? '' : ` A soma das individuais seria ${soma}, diferença de ${sugerido >= soma ? 'mais' : 'menos'} ${Math.abs(sugerido - soma)}.`;
  return { sugerido, somaIndividuais: soma, explicacao: `Time gera ${fmt(rTime, 2)} por ${dir === 'max' ? 'membro' : 'conselho'}, carteira total ${carteiraTotal}. Sugestão ${sugerido}.${dif}` };
}
