// lib/consulta.ts
// Consulta rápida em linguagem natural sobre o dash de CS.
// Camada determinística, sem IA e sem custo por pergunta. A regra de cálculo
// vive no banco (metas_cs_base), aqui só se interpreta a pergunta e se
// formata a resposta. Extensível por INTENCOES: para um novo tipo de
// pergunta (presença em conselhos, NPS, ranking, comparação entre CS),
// acrescenta um item nessa lista com reconhece/responder — não mexe na rota
// nem na tela.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Filtro = 'ambos' | 'bateu' | 'nao_bateu';

export interface CsRef {
  nome: string;
  nome_completo?: string | null;
}

export interface LinhaMeta {
  cs: string;
  mes: string;
  metrica: string;
  direcao: 'min' | 'max';
  meta: number | null;
  alcancado_manual: number | null;
  realizado_calculado: number | null;
  realizado: number;
  fonte: 'calculado' | 'manual' | 'sem_dado';
  status: 'bateu' | 'nao_bateu' | 'sem_meta';
  percentual: number | null;
  divergencia: boolean;
}

export interface ConsultaInterpretada {
  intencao: 'metas';
  cs: string | null;
  mes: string; // AAAA-MM-01
  filtro: Filtro;
}

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const ROTULO_METRICA: Record<string, string> = {
  cases: 'Cases de Sucesso',
  matchmakings: 'Matchmakings',
  rounds: 'Rounds',
  indicacoes: 'Indicações',
  upsell: 'Upsell',
  downsell: 'Downsell',
  churn: 'Churn',
  revenue_churn: 'Revenue Churn',
  health_base: 'Health da Base',
  presenca: 'Presença nos conselhos',
  suspensoes: 'Suspensões',
  critico: 'Críticos',
};

export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function primeiroDia(ano: number, mes0: number): string {
  const m = String(mes0 + 1).padStart(2, '0');
  return `${ano}-${m}-01`;
}

export function rotuloMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  const nome = MESES[m - 1] === 'marco' ? 'março' : MESES[m - 1];
  return `${nome} de ${a}`;
}

export function interpretarMes(pergunta: string, hoje: Date = new Date()): string {
  const p = normalizar(pergunta);
  const anoExplicito = p.match(/\b(20\d{2})\b/);
  for (let i = 0; i < MESES.length; i++) {
    if (new RegExp(`\\b${MESES[i]}\\b`).test(p)) {
      const ano = anoExplicito ? Number(anoExplicito[1]) : hoje.getFullYear();
      return primeiroDia(ano, i);
    }
  }
  if (/(mes passado|ultimo mes|mes anterior)/.test(p)) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return primeiroDia(d.getFullYear(), d.getMonth());
  }
  return primeiroDia(hoje.getFullYear(), hoje.getMonth());
}

export function interpretarCs(pergunta: string, roster: CsRef[]): string | null {
  const p = normalizar(pergunta);
  for (const cs of roster) {
    const alvos = [cs.nome, ...(cs.nome_completo ? [cs.nome_completo.split(' ')[0]] : [])]
      .map(normalizar)
      .filter(Boolean);
    if (alvos.some((a) => new RegExp(`\\b${a}\\b`).test(p))) return cs.nome;
  }
  return null;
}

export function interpretarFiltro(pergunta: string): Filtro {
  const p = normalizar(pergunta);
  const neg = /(nao (bateu|atingiu|cumpriu|alcancou|bateram)|faltou|faltaram|abaixo da meta|pendentes)/.test(p);
  const pos = /(^|[^a-z])(bateu|atingiu|cumpriu|alcancou|bateram|batidas)/.test(
    p.replace(/nao (bateu|atingiu|cumpriu|alcancou|bateram)/g, ''),
  );
  if (neg && !pos) return 'nao_bateu';
  if (pos && !neg) return 'bateu';
  return 'ambos';
}

export function interpretar(
  pergunta: string,
  roster: CsRef[],
  hoje: Date = new Date(),
): ConsultaInterpretada {
  return {
    intencao: 'metas',
    cs: interpretarCs(pergunta, roster),
    mes: interpretarMes(pergunta, hoje),
    filtro: interpretarFiltro(pergunta),
  };
}

function rotulo(m: string): string {
  return ROTULO_METRICA[m] ?? m;
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '0';
  return Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1).replace('.', ',');
}

function descreverLinha(l: LinhaMeta): string {
  const alvo = l.direcao === 'max' ? `limite de ${fmt(l.meta)}` : `meta de ${fmt(l.meta)}`;
  return `${rotulo(l.metrica)} (${fmt(l.realizado)} contra ${alvo})`;
}

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

function respostaDeUmCs(nome: string, linhas: LinhaMeta[], mes: string, filtro: Filtro): string {
  const comMeta = linhas.filter((l) => l.status !== 'sem_meta');
  const bateu = comMeta.filter((l) => l.status === 'bateu');
  const nao = comMeta.filter((l) => l.status === 'nao_bateu');
  const semMeta = linhas.filter((l) => l.status === 'sem_meta' && (l.realizado ?? 0) > 0);
  const divergentes = linhas.filter((l) => l.divergencia);

  const partes: string[] = [];
  partes.push(
    `${nome} em ${rotuloMes(mes)}: ${bateu.length} de ${comMeta.length} metas batidas.`,
  );
  if (filtro !== 'nao_bateu') {
    partes.push(bateu.length ? `Bateu ${juntar(bateu.map(descreverLinha))}.` : 'Não bateu nenhuma meta.');
  }
  if (filtro !== 'bateu') {
    partes.push(nao.length ? `Não bateu ${juntar(nao.map(descreverLinha))}.` : 'Nenhuma meta ficou abaixo do esperado.');
  }
  if (semMeta.length) {
    partes.push(
      `Sem meta cadastrada, mas com registro: ${juntar(semMeta.map((l) => `${rotulo(l.metrica)} (${fmt(l.realizado)})`))}.`,
    );
  }
  if (divergentes.length) {
    partes.push(
      `Atenção: em ${juntar(divergentes.map((l) => rotulo(l.metrica)))} o valor autodeclarado no Monday difere do calculado, e a resposta usa o calculado.`,
    );
  }
  return partes.join(' ');
}

export function responderMetas(linhas: LinhaMeta[], consulta: ConsultaInterpretada): string {
  if (!linhas.length) {
    return `Não há metas cadastradas para ${consulta.cs ?? 'o time'} em ${rotuloMes(consulta.mes)}.`;
  }
  const porCs = new Map<string, LinhaMeta[]>();
  for (const l of linhas) porCs.set(l.cs, [...(porCs.get(l.cs) ?? []), l]);
  return [...porCs.entries()]
    .map(([nome, ls]) => respostaDeUmCs(nome, ls, consulta.mes, consulta.filtro))
    .join('\n\n');
}

// ============ despacho por intenção (extensível) ============
// Cada intenção reconhece um jeito de perguntar e sabe montar sua própria resposta. Hoje só
// existe a intenção de metas; uma nova entra acrescentando um item aqui (reconhece + responder)
// e a função SQL que ela precisa, sem tocar na rota nem na tela.

export interface RespostaIntencao {
  resposta: string;
  // Resumo curto (ex.: "Rodrigo|2026-09-01") pra trilha de auditoria — nunca o texto integral da
  // pergunta, ver log_access em app/api/consulta/route.ts.
  resource: string;
}

export interface IntencaoDef {
  nome: string;
  reconhece: (pergunta: string) => boolean;
  responder: (supabase: SupabaseClient, pergunta: string, roster: CsRef[], hoje?: Date) => Promise<RespostaIntencao>;
}

function reconheceMetas(pergunta: string): boolean {
  const p = normalizar(pergunta);
  return /(meta|bateu|bater|atingiu|cumpriu|alcancou|desempenho|indicador|resultado)/.test(p);
}

async function responderMetasIntencao(
  supabase: SupabaseClient,
  pergunta: string,
  roster: CsRef[],
  hoje: Date = new Date(),
): Promise<RespostaIntencao> {
  const consulta = interpretar(pergunta, roster, hoje);
  const { data, error } = await supabase.rpc('consultar_metas_cs', { p_cs: consulta.cs, p_mes: consulta.mes });
  if (error) throw error;
  const linhas = (data ?? []) as LinhaMeta[];
  return {
    resposta: responderMetas(linhas, consulta),
    resource: `${consulta.cs ?? 'time'}|${consulta.mes}`,
  };
}

// ---- meta e recorde do time (Parte G, 29/09/2026) ----
// Perguntas sobre o time como um todo ("o time bateu a meta de rounds", "quais recordes foram
// batidos") usam metas_time_mensal em vez de consultar_metas_cs com cs nulo, porque essa última
// devolve a quebra por CS, não o agregado do time (que não é soma das metas individuais).

export interface LinhaTimeMeta {
  indicador: string;
  mes: string;
  meta: number | null;
  meta_mes_origem: string | null;
  realizado: number | null;
  fonte: 'calculado' | 'sem_dado';
  status: 'bateu' | 'nao_bateu' | 'sem_meta';
  percentual: number | null;
  em_recorde: boolean;
  recorde_valor: number | null;
  recorde_mes: string | null;
  recorde_distancia: number | null;
}

const DIRECAO_METRICA: Record<string, 'min' | 'max'> = {
  churn: 'max',
  revenue_churn: 'max',
  downsell: 'max',
  suspensoes: 'max',
  critico: 'max',
};

function direcaoDe(indicador: string): 'min' | 'max' {
  return DIRECAO_METRICA[indicador] ?? 'min';
}

function descreverLinhaTime(l: LinhaTimeMeta): string {
  const alvo = direcaoDe(l.indicador) === 'max' ? `limite de ${fmt(l.meta)}` : `meta de ${fmt(l.meta)}`;
  return `${rotulo(l.indicador)} (${fmt(l.realizado)} contra ${alvo})`;
}

function descreverRecordeLinha(l: LinhaTimeMeta): string {
  const base = `${rotulo(l.indicador)}, com ${fmt(l.realizado)}`;
  if (l.recorde_valor === null || l.recorde_valor === undefined) return base;
  const origem = l.recorde_mes ? ` em ${rotuloMes(l.recorde_mes)}` : '';
  return `${base}, superando o recorde anterior de ${fmt(l.recorde_valor)}${origem}`;
}

function respostaTime(linhas: LinhaTimeMeta[], mes: string, filtro: Filtro): string {
  const comMeta = linhas.filter((l) => l.status !== 'sem_meta');
  const bateu = comMeta.filter((l) => l.status === 'bateu');
  const nao = comMeta.filter((l) => l.status === 'nao_bateu');
  const recordes = linhas.filter((l) => l.em_recorde);

  const partes: string[] = [];
  partes.push(`Time em ${rotuloMes(mes)}: ${bateu.length} de ${comMeta.length} metas batidas.`);
  if (filtro !== 'nao_bateu') {
    partes.push(bateu.length ? `Bateu ${juntar(bateu.map(descreverLinhaTime))}.` : 'Não bateu nenhuma meta.');
  }
  if (filtro !== 'bateu') {
    partes.push(nao.length ? `Não bateu ${juntar(nao.map(descreverLinhaTime))}.` : 'Nenhuma meta ficou abaixo do esperado.');
  }
  partes.push(recordes.length ? `Novo recorde em ${juntar(recordes.map(descreverRecordeLinha))}.` : 'Nenhum recorde novo neste mês.');
  return partes.join(' ');
}

function reconheceRecordesTime(pergunta: string): boolean {
  const p = normalizar(pergunta);
  return /recorde/.test(p) || /(\bo time\b|\ba equipe\b|\bdo time\b|\bda equipe\b|\btime inteiro\b)/.test(p);
}

async function responderRecordesTimeIntencao(
  supabase: SupabaseClient,
  pergunta: string,
  _roster: CsRef[],
  hoje: Date = new Date(),
): Promise<RespostaIntencao> {
  const mes = interpretarMes(pergunta, hoje);
  const filtro = interpretarFiltro(pergunta);
  const { data, error } = await supabase.rpc('metas_time_mensal', { p_mes: mes });
  if (error) throw error;
  const linhas = ((data ?? []) as LinhaTimeMeta[]).filter((l) => l.indicador !== 'carteira');
  if (!linhas.length) {
    return { resposta: `Não há indicadores cadastrados para o time em ${rotuloMes(mes)}.`, resource: `time|${mes}` };
  }
  return { resposta: respostaTime(linhas, mes, filtro), resource: `time|${mes}` };
}

const INTENCOES: IntencaoDef[] = [
  { nome: 'recordes_time', reconhece: reconheceRecordesTime, responder: responderRecordesTimeIntencao },
  { nome: 'metas', reconhece: reconheceMetas, responder: responderMetasIntencao },
];

const RESPOSTA_SEM_INTENCAO =
  'Ainda não sei responder essa pergunta. Hoje sei falar sobre metas batidas e não batidas, por exemplo quais metas o Rodrigo bateu e não bateu, ou metas do time neste mês.';

export async function processarPergunta(
  supabase: SupabaseClient,
  pergunta: string,
  roster: CsRef[],
  hoje: Date = new Date(),
): Promise<RespostaIntencao & { intencao: string }> {
  for (const intencao of INTENCOES) {
    if (intencao.reconhece(pergunta)) {
      const r = await intencao.responder(supabase, pergunta, roster, hoje);
      return { ...r, intencao: intencao.nome };
    }
  }
  return { resposta: RESPOSTA_SEM_INTENCAO, resource: 'sem_intencao', intencao: 'nenhuma' };
}
