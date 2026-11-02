// Monta, no servidor, as entradas do modelo de sugestão de metas (lib/metas-sugestao.ts), o desempenho de um
// mês fechado contra a meta (usado na matriz de metas e no painel de sugestão) e a validação retroativa.
// O realizado de cada CS e mês vem de generateCSReport, as mesmas funções dos indicadores do relatório; o do
// time vem de metas_time_mensal e de totaisRealizadoTime (contagem única). Nada é recontado aqui.
// Custo: uma chamada de generateCSReport por CS e mês da janela, com os dados brutos carregados uma vez.
import type { SupabaseClient } from '@supabase/supabase-js';
import { MESES_ORDEM, JANELA_SUGESTAO_MESES, ERRO_MEDIO_MAX_SUGESTAO } from './constants.ts';
import {
  generateCSReport, getDadosBrutos, getCSListParaAgregados, buscarResumoReports, gruposDaCarteira,
  periodosCsSeguro, parseTituloConselho, totaisRealizadoTime, grafiasCS, normalizeNome,
  type DadosBrutos, type ResumoReport, type CSConfig,
} from './reports.ts';
import { hojeSP } from './gtd-prazos.ts';
import { periodosPorMetas } from './cs-periodos.ts';
import { composicaoCarteira, pisoRevenueChurn, type ProdutoCarteira } from './metas-carteira.ts';
import {
  sugerirCS, sugerirTime, motivoSemModelo,
  type EntradaCS, type IndicadorCatalogo, type MesCS, type MesTime, type Sugestao, type SugestaoTime,
} from './metas-sugestao.ts';

// Chave do catálogo no banco para o valor realizado no relatório do CS. Fonte única deste mapeamento.
const REALIZADO_DO_RELATORIO: Record<string, (rel: any) => number | null> = {
  cases: (r) => num(r.indicadores.casesSucesso?.calculado),
  matchmakings: (r) => num(r.indicadores.matchmakings?.calculado),
  matchmakings_resultado: (r) => num(r.indicadores.matchmakingsResultado?.calculado),
  rounds: (r) => num(r.indicadores.rounds?.calculado),
  upsell: (r) => num(r.indicadores.upsell?.calculado),
  downsell: (r) => num(r.indicadores.downsell?.calculado),
  indicacoes: (r) => num(r.indicadores.indicacoes?.calculado),
  churn: (r) => num(r.indicadores.churn?.calculado),
  revenue_churn: (r) => num(r.indicadores.revenueChurn?.alcancado),
  critico: (r) => num(r.indicadores.criticos?.calculado),
  health_base: (r) => num(r.indicadores.healthDaBase?.calculado),
  carteira: (r) => (Array.isArray(r.conselhos) ? r.conselhos.length : null),
};
// Indicadores cujo histórico alimenta a sugestão (os demais são por política ou carteira).
const COM_HISTORICO = ['cases', 'matchmakings', 'matchmakings_resultado', 'rounds', 'upsell', 'indicacoes', 'churn'];
function num(v: any): number | null { return v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v); }

export const mesIso = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}-01`;
export function somarMeses(iso: string, n: number): string {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 + n, 1));
  return mesIso(d.getUTCFullYear(), d.getUTCMonth() + 1);
}
const nomeMes = (iso: string) => MESES_ORDEM[Number(iso.slice(5, 7)) - 1];

// Meses fechados que entram na janela: os JANELA meses imediatamente anteriores ao mês alvo, nunca o corrente.
export function mesesDaJanela(mesAlvo: string, hoje: string = hojeSP()): string[] {
  const corrente = hoje.slice(0, 7) + '-01';
  const fim = mesAlvo < corrente ? mesAlvo : corrente;
  return Array.from({ length: JANELA_SUGESTAO_MESES }, (_, i) => somarMeses(fim, i - JANELA_SUGESTAO_MESES));
}

export interface Contexto {
  sb: SupabaseClient; dados: DadosBrutos; resumo: ResumoReport[]; roster: CSConfig[]; todos: CSConfig[];
  periodos: { nome_curto: string; primeiro_mes: string; ultimo_mes: string | null }[];
  cache: Map<string, Promise<any>>;
}

export async function criarContexto(sb: SupabaseClient): Promise<Contexto> {
  const [dados, resumo, lista, periodos] = await Promise.all([getDadosBrutos(sb), buscarResumoReports(sb), getCSListParaAgregados(sb), periodosCsSeguro(sb)]);
  const roster = lista.filter((c) => c.ativo && !c.ex);
  // Sem cs_periodos em produção: cai na regra C2, quem tem meta no mês é CS no mês.
  const porMetas = periodosPorMetas((dados.metas as any[]).filter((m) => m.mes_grupo_titulo && m.cs_nome), 2026, roster.map((c) => c.nome));
  return { sb, dados, resumo, roster, todos: lista, periodos: periodos && periodos.length ? periodos : porMetas, cache: new Map() };
}

// Cache por requisição: o mesmo CS e mês nunca é calculado duas vezes.
function relatorio(ctx: Contexto, nome: string, mes: string) {
  const k = nome + '|' + mes;
  if (!ctx.cache.has(k)) ctx.cache.set(k, generateCSReport(ctx.sb, nome, nomeMes(mes), Number(mes.slice(0, 4)), ctx.dados, ctx.resumo));
  return ctx.cache.get(k)! as ReturnType<typeof generateCSReport>;
}

const periodoDe = (ctx: Contexto, nome: string) => ctx.periodos.find((p) => p.nome_curto === nome);
export function eraCSNoMes(ctx: Contexto, nome: string, mes: string): boolean {
  const p = periodoDe(ctx, nome);
  if (!p) return false;
  return p.primeiro_mes.slice(0, 7) <= mes.slice(0, 7) && (p.ultimo_mes === null || p.ultimo_mes.slice(0, 7) >= mes.slice(0, 7));
}
function mesesDeCasa(ctx: Contexto, nome: string, mesAlvo: string): number {
  const p = periodoDe(ctx, nome);
  if (!p) return 0;
  const a = p.primeiro_mes, b = mesAlvo;
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
}

// Carteira atual do CS: grupos do título com o CS entre parênteses, sem reposição e sem congelados (mesma
// regra de numConselhos), com o produto de cada conselho lido do título do grupo.
export function carteiraAtual(ctx: Contexto, cs: CSConfig): { carteira: number; membros: number; composicao: ProdutoCarteira[] } {
  const grupos = gruposDaCarteira(ctx.dados, cs.apelidoConselho).filter((g: any) => !g.congelado);
  const porGrupo = grupos.map((g: any) => ({
    produto: parseTituloConselho(g.titulo)?.nivel ?? null,
    membros: ctx.dados.conselhosMembros.filter((m: any) => m.group_id === g.group_id).length,
  }));
  return { carteira: grupos.length, membros: porGrupo.reduce((s, g) => s + g.membros, 0), composicao: composicaoCarteira(porGrupo) };
}

const metaResolvida = (ctx: Contexto, mes: string, indicador: string, escopo: 'time' | 'cs', cs: string | null): number | null => {
  const r = ctx.dados.metasResolvidas.find((x) => x.mes === mes && x.indicador === indicador && x.escopo === escopo
    && (escopo === 'time' || normalizeNome(x.cs_nome || '') === normalizeNome(cs || '')));
  return r && r.valor !== null && r.valor !== undefined ? Number(r.valor) : null;
};

async function entradaDoCS(ctx: Contexto, cs: CSConfig, janela: string[], mesAlvo: string): Promise<EntradaCS> {
  const atual = carteiraAtual(ctx, cs);
  const historico: MesCS[] = [];
  for (const mes of janela) {
    if (!eraCSNoMes(ctx, cs.nome, mes)) continue;
    const rel = await relatorio(ctx, cs.nome, mes);
    const realizado: Record<string, number> = {};
    const meta: Record<string, number | null> = {};
    COM_HISTORICO.forEach((k) => {
      const v = REALIZADO_DO_RELATORIO[k](rel);
      if (v !== null) realizado[k] = v;
      meta[k] = metaResolvida(ctx, mes, k, 'cs', cs.nome);
    });
    // Matchmakings dependem do usuário do Monday: sem ele o zero é ausência de vínculo, não de entrega.
    if (cs.userId === null || cs.userId === undefined) { delete realizado.matchmakings; delete realizado.matchmakings_resultado; delete realizado.indicacoes; }
    historico.push({ mes, realizado, meta });
  }
  return { nome: cs.nome, historico, ...atual, mesesDeCasa: mesesDeCasa(ctx, cs.nome, mesAlvo) };
}

function historicoTime(ctx: Contexto, janela: string[]): MesTime[] {
  const nomes = new Set(ctx.todos.flatMap((m) => grafiasCS(m).map(normalizeNome)).filter(Boolean));
  return janela.map((mes) => {
    const t = totaisRealizadoTime(ctx.dados, nomes, nomeMes(mes), Number(mes.slice(0, 4)));
    return { mes, realizado: { cases: t.casesSucesso, rounds: t.rounds, upsell: t.upsell, downsell: t.downsell, churn: t.churn } };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Desempenho de um mês contra a meta daquele mês, por indicador, CS e time. Responde à pergunta do gestor ao
// definir metas novas: quanto cada um realizou da meta passada.
export interface CelulaDesempenho { meta: number | null; realizado: number | null; pct: number | null; bateu: boolean | null }
export interface DesempenhoMes { mes: string; porIndicador: Record<string, { time: CelulaDesempenho; porCS: Record<string, CelulaDesempenho> }> }

export function celula(meta: number | null, realizado: number | null, direcao: string): CelulaDesempenho {
  const temMeta = meta !== null && (direcao === 'max' ? meta >= 0 : meta > 0);
  const bateu = !temMeta || realizado === null ? null : (direcao === 'max' ? realizado <= (meta as number) : realizado >= (meta as number));
  const pct = temMeta && realizado !== null && (meta as number) > 0 ? Math.round((realizado / (meta as number)) * 100) : null;
  return { meta, realizado, pct, bateu };
}

export async function desempenhoDoMes(ctx: Contexto, mes: string, catalogo: IndicadorCatalogo[], roster: CSConfig[] = ctx.roster): Promise<DesempenhoMes> {
  const doMes = roster.filter((cs) => eraCSNoMes(ctx, cs.nome, mes) || cs.ativo);
  const rels = new Map<string, any>();
  await Promise.all(doMes.map(async (cs) => {
    try { rels.set(cs.nome, await relatorio(ctx, cs.nome, mes)); } catch { /* CS sem relatório no mês fica sem realizado */ }
  }));
  // Time: metas_time_mensal (mesma régua dos recordes da home), com o revenue churn da contagem única.
  const timeRealizado: Record<string, number | null> = {};
  const { data } = await ctx.sb.rpc('metas_time_mensal', { p_mes: mes });
  ((data || []) as any[]).forEach((l) => { timeRealizado[l.indicador] = num(l.realizado); });
  const nomes = new Set(ctx.todos.flatMap((m) => grafiasCS(m).map(normalizeNome)).filter(Boolean));
  const tot = totaisRealizadoTime(ctx.dados, nomes, nomeMes(mes), Number(mes.slice(0, 4)));
  if (timeRealizado.revenue_churn === null || timeRealizado.revenue_churn === undefined) timeRealizado.revenue_churn = tot.revenueChurn;

  const porIndicador: DesempenhoMes['porIndicador'] = {};
  catalogo.forEach((c) => {
    const porCS: Record<string, CelulaDesempenho> = {};
    doMes.forEach((cs) => {
      const rel = rels.get(cs.nome);
      const ler = REALIZADO_DO_RELATORIO[c.chave];
      porCS[cs.nome] = celula(metaResolvida(ctx, mes, c.chave, 'cs', cs.nome), rel && ler ? ler(rel) : null, c.direcao);
    });
    porIndicador[c.chave] = { time: celula(metaResolvida(ctx, mes, c.chave, 'time', null), timeRealizado[c.chave] ?? null, c.direcao), porCS };
  });
  return { mes, porIndicador };
}

// Piso de Revenue Churn por CS ativo (MRR do produto mais barato da carteira) e a composição que o explica.
export function pisosRevenueChurn(ctx: Contexto): Record<string, { piso: number | null; composicao: ProdutoCarteira[] }> {
  const out: Record<string, { piso: number | null; composicao: ProdutoCarteira[] }> = {};
  ctx.roster.forEach((cs) => {
    const { composicao } = carteiraAtual(ctx, cs);
    out[cs.nome] = { piso: pisoRevenueChurn(composicao), composicao };
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------
export interface SugestaoIndicador {
  chave: string; rotulo: string; direcao: string; semModelo: string | null;
  vigente: { time: number | null; porCS: Record<string, number | null> };
  time: SugestaoTime | null;
  porCS: Record<string, Sugestao>;
}

export async function sugerirMetas(ctx: Contexto, mesAlvo: string, catalogo: IndicadorCatalogo[], roster: CSConfig[] = ctx.roster) {
  const janela = mesesDaJanela(mesAlvo);
  const entradas = await Promise.all(roster.map((cs) => entradaDoCS(ctx, cs, janela, mesAlvo)));
  const histTime = historicoTime(ctx, janela);
  // Churn primeiro: a sugestão de Revenue Churn usa o limite de churn sugerido (ou o vigente) de cada CS.
  const ordem = [...catalogo].sort((a, b) => (a.chave === 'churn' ? -1 : b.chave === 'churn' ? 1 : 0));
  const churnPorCS: Record<string, number | null> = {};
  const porChave = new Map<string, SugestaoIndicador>();
  ordem.forEach((c) => {
    const semModelo = motivoSemModelo(c);
    const porCS: Record<string, Sugestao> = {};
    const vigPorCS: Record<string, number | null> = {};
    entradas.forEach((e) => {
      vigPorCS[e.nome] = metaResolvida(ctx, mesAlvo, c.chave, 'cs', e.nome);
      if (semModelo) return;
      porCS[e.nome] = sugerirCS(e, c, entradas, c.chave === 'revenue_churn' ? (churnPorCS[e.nome] ?? metaResolvida(ctx, mesAlvo, 'churn', 'cs', e.nome)) : undefined);
      if (c.chave === 'churn') churnPorCS[e.nome] = porCS[e.nome].sugerido;
    });
    const time = semModelo ? null : sugerirTime(c, histTime, entradas.map((e) => porCS[e.nome]));
    porChave.set(c.chave, { chave: c.chave, rotulo: c.rotulo, direcao: c.direcao, semModelo, vigente: { time: metaResolvida(ctx, mesAlvo, c.chave, 'time', null), porCS: vigPorCS }, time, porCS });
  });
  return { mes: mesAlvo, janela, indicadores: catalogo.map((c) => porChave.get(c.chave)!) };
}

// Validação retroativa: para cada mês alvo, roda o modelo só com a janela anterior a ele e compara com o realizado.
// Erro = |sugerido menos realizado| sobre max(realizado, 1). Bateu = realizado >= sugerido (min) ou <= sugerido (max).
export interface ValidacaoIndicador { chave: string; rotulo: string; n: number; erroMedio: number | null; metasBatidas: number; bloqueado: boolean }
export async function validarRetroativo(ctx: Contexto, meses: string[], catalogo: IndicadorCatalogo[]): Promise<{ porIndicador: ValidacaoIndicador[]; detalhe: any[] }> {
  const acc = new Map<string, { erros: number[]; bateu: number }>();
  const detalhe: any[] = [];
  const validaveis = catalogo.filter((c) => !motivoSemModelo(c) && COM_HISTORICO.includes(c.chave));
  for (const mes of meses) {
    const roster = ctx.roster.filter((cs) => eraCSNoMes(ctx, cs.nome, mes));
    const r = await sugerirMetas(ctx, mes, validaveis, roster);
    for (const ind of r.indicadores) {
      const cat = validaveis.find((c) => c.chave === ind.chave)!;
      for (const cs of roster) {
        const s = ind.porCS[cs.nome];
        if (!s || s.sugerido === null) continue;
        const real = REALIZADO_DO_RELATORIO[ind.chave](await relatorio(ctx, cs.nome, mes));
        if (real === null) continue;
        const erro = Math.abs(s.sugerido - real) / Math.max(real, 1);
        const bateu = cat.direcao === 'max' ? real <= s.sugerido : real >= s.sugerido;
        const a = acc.get(ind.chave) || { erros: [], bateu: 0 };
        a.erros.push(erro); if (bateu) a.bateu++;
        acc.set(ind.chave, a);
        detalhe.push({ mes, cs: cs.nome, indicador: ind.chave, sugerido: s.sugerido, realizado: real, vigente: ind.vigente.porCS[cs.nome], bateu });
      }
    }
  }
  const porIndicador = validaveis.map((c) => {
    const a = acc.get(c.chave);
    const erroMedio = a && a.erros.length ? a.erros.reduce((s, x) => s + x, 0) / a.erros.length : null;
    return { chave: c.chave, rotulo: c.rotulo, n: a?.erros.length ?? 0, erroMedio, metasBatidas: a?.bateu ?? 0, bloqueado: erroMedio !== null && erroMedio > ERRO_MEDIO_MAX_SUGESTAO };
  });
  return { porIndicador, detalhe };
}
