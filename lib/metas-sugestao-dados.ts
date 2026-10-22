// Monta, no servidor, as entradas do modelo de sugestão de metas (lib/metas-sugestao.ts) e a validação
// retroativa. O realizado de cada CS e mês vem de generateCSReport, as mesmas funções dos indicadores
// do relatório; a exposição vem de conselhosRealizadosNoPeriodo. Nada é recontado aqui.
// Custo: uma chamada de generateCSReport por CS e mês da janela, com os dados brutos carregados uma vez.
import type { SupabaseClient } from '@supabase/supabase-js';
import { MESES_ORDEM, JANELA_SUGESTAO_MESES, ERRO_MEDIO_MAX_SUGESTAO } from './constants.ts';
import {
  generateCSReport, getDadosBrutos, getCSListParaAgregados, buscarResumoReports, gruposDaCarteira,
  periodosCsSeguro, conselhosRealizadosNoPeriodo, periodoDatas,
  type DadosBrutos, type ResumoReport, type CSConfig,
} from './reports.ts';
import { hojeSP } from './gtd-prazos.ts';
import {
  sugerirCS, sugerirTime, motivoSemModelo,
  type EntradaCS, type IndicadorCatalogo, type MesCS, type Sugestao, type SugestaoTime,
} from './metas-sugestao.ts';

// Chave do catálogo no banco -> chave do indicador no relatório do CS.
const CHAVE_RELATORIO: Record<string, string> = {
  cases: 'casesSucesso', matchmakings: 'matchmakings', rounds: 'rounds', upsell: 'upsell', indicacoes: 'indicacoes', churn: 'churn',
};

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

interface Contexto {
  sb: SupabaseClient; dados: DadosBrutos; resumo: ResumoReport[]; roster: CSConfig[];
  periodos: { nome_curto: string; primeiro_mes: string; ultimo_mes: string | null }[];
  cache: Map<string, Promise<any>>;
}

export async function criarContexto(sb: SupabaseClient): Promise<Contexto> {
  const [dados, resumo, lista, periodos] = await Promise.all([getDadosBrutos(sb), buscarResumoReports(sb), getCSListParaAgregados(sb), periodosCsSeguro(sb)]);
  return { sb, dados, resumo, roster: lista.filter((c) => c.ativo && !c.ex), periodos: periodos || [], cache: new Map() };
}

// Cache por requisição: o mesmo CS e mês nunca é calculado duas vezes (janela do alvo e da validação se sobrepõem).
function relatorio(ctx: Contexto, nome: string, mes: string) {
  const k = nome + '|' + mes;
  if (!ctx.cache.has(k)) ctx.cache.set(k, generateCSReport(ctx.sb, nome, nomeMes(mes), Number(mes.slice(0, 4)), ctx.dados, ctx.resumo));
  return ctx.cache.get(k)! as ReturnType<typeof generateCSReport>;
}

const periodoDe = (ctx: Contexto, nome: string) => ctx.periodos.find((p) => p.nome_curto === nome);
function eraCSNoMes(ctx: Contexto, nome: string, mes: string): boolean {
  const p = periodoDe(ctx, nome);
  if (!p) return false;
  return p.primeiro_mes.slice(0, 7) <= mes.slice(0, 7) && (p.ultimo_mes === null || p.ultimo_mes.slice(0, 7) >= mes.slice(0, 7));
}
function mesesDeCasa(ctx: Contexto, nome: string, mesAlvo: string): number {
  const p = periodoDe(ctx, nome);
  if (!p) return 99;
  const a = p.primeiro_mes, b = mesAlvo;
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
}

function carteiraAtual(ctx: Contexto, cs: CSConfig) {
  // Mesma regra de numConselhos: grupos do título com o CS entre parênteses, sem reposição; aqui também sem congelados.
  const grupos = gruposDaCarteira(ctx.dados, cs.apelidoConselho).filter((g: any) => !g.congelado);
  const membros = grupos.reduce((s: number, g: any) => s + ctx.dados.conselhosMembros.filter((m: any) => m.group_id === g.group_id).length, 0);
  return { carteira: grupos.length, membros };
}

async function entradaDoCS(ctx: Contexto, cs: CSConfig, janela: string[], mesAlvo: string, catalogo: IndicadorCatalogo[]): Promise<EntradaCS> {
  const { carteira, membros } = carteiraAtual(ctx, cs);
  const historico: MesCS[] = [];
  for (const mes of janela) {
    if (!eraCSNoMes(ctx, cs.nome, mes)) continue;
    const rel = await relatorio(ctx, cs.nome, mes);
    const { mesInicio, mesFim } = periodoDatas(nomeMes(mes), Number(mes.slice(0, 4)));
    const realizados = conselhosRealizadosNoPeriodo(ctx.dados, cs.nome, mesInicio, mesFim).length;
    // Sem histórico no mês: usa a carteira de conselhos ativos (aproximada pela atual, não há foto histórica da carteira).
    const realizado: Record<string, number> = {};
    catalogo.forEach((c) => {
      const chave = CHAVE_RELATORIO[c.chave];
      const ind: any = chave ? (rel.indicadores as any)[chave] : null;
      if (ind) realizado[c.chave] = Number(ind.calculado ?? ind.alcancado ?? 0);
    });
    historico.push({ mes, conselhos: realizados > 0 ? realizados : carteira, membros, realizado });
  }
  return { nome: cs.nome, historico, carteira, membros, mesesDeCasa: mesesDeCasa(ctx, cs.nome, mesAlvo) };
}

export interface SugestaoIndicador {
  chave: string; rotulo: string; direcao: string; semModelo: string | null;
  vigente: { time: number | null; porCS: Record<string, number | null> };
  mediaRealizada: { time: number | null; porCS: Record<string, number> };
  time: SugestaoTime | null;
  porCS: Record<string, Sugestao>;
}

export async function sugerirMetas(ctx: Contexto, mesAlvo: string, catalogo: IndicadorCatalogo[], roster: CSConfig[] = ctx.roster) {
  const janela = mesesDaJanela(mesAlvo);
  const entradas = await Promise.all(roster.map((cs) => entradaDoCS(ctx, cs, janela, mesAlvo, catalogo)));
  const vigente = (indicador: string, escopo: 'time' | 'cs', cs: string | null) =>
    ctx.dados.metasResolvidas.find((r) => r.mes === mesAlvo && r.indicador === indicador && r.escopo === escopo && (escopo === 'time' || r.cs_nome === cs))?.valor ?? null;

  const indicadores: SugestaoIndicador[] = catalogo.map((c) => {
    const semModelo = motivoSemModelo(c);
    const porCS: Record<string, Sugestao> = {};
    const vigPorCS: Record<string, number | null> = {};
    const mediaCS: Record<string, number> = {};
    entradas.forEach((e) => {
      vigPorCS[e.nome] = vigente(c.chave, 'cs', e.nome);
      const meses = e.historico.length;
      mediaCS[e.nome] = meses ? e.historico.reduce((s, m) => s + (m.realizado[c.chave] ?? 0), 0) / meses : 0;
      if (!semModelo) porCS[e.nome] = sugerirCS(e, c, entradas);
    });
    const time = semModelo ? null : sugerirTime(c, entradas, entradas.map((e) => porCS[e.nome]));
    const mediaTime = Object.values(mediaCS).reduce((s, v) => s + v, 0);
    return {
      chave: c.chave, rotulo: c.rotulo, direcao: c.direcao, semModelo,
      vigente: { time: vigente(c.chave, 'time', null), porCS: vigPorCS },
      mediaRealizada: { time: mediaTime, porCS: mediaCS },
      time, porCS,
    };
  });
  return { mes: mesAlvo, janela, indicadores };
}

// Validação retroativa: para cada mês alvo, roda o modelo só com a janela anterior a ele e compara com o realizado.
// Erro = |sugerido - realizado| / max(realizado, 1). Bateu = realizado >= sugerido (min) ou <= sugerido (max).
export interface ValidacaoIndicador { chave: string; rotulo: string; n: number; erroMedio: number | null; metasBatidas: number; bloqueado: boolean }
export async function validarRetroativo(ctx: Contexto, meses: string[], catalogo: IndicadorCatalogo[]): Promise<{ porIndicador: ValidacaoIndicador[]; detalhe: any[] }> {
  const acc = new Map<string, { erros: number[]; bateu: number }>();
  const detalhe: any[] = [];
  for (const mes of meses) {
    const roster = ctx.roster.filter((cs) => eraCSNoMes(ctx, cs.nome, mes));
    const r = await sugerirMetas(ctx, mes, catalogo, roster);
    for (const ind of r.indicadores) {
      if (ind.semModelo) continue;
      const cat = catalogo.find((c) => c.chave === ind.chave)!;
      for (const cs of roster) {
        const s = ind.porCS[cs.nome];
        if (!s || s.sugerido === null) continue;
        const rel: any = await relatorio(ctx, cs.nome, mes);
        const ind2 = rel.indicadores[CHAVE_RELATORIO[ind.chave]];
        const real = Number(ind2.calculado ?? ind2.alcancado ?? 0);
        const erro = Math.abs(s.sugerido - real) / Math.max(real, 1);
        const bateu = cat.direcao === 'max' ? real <= s.sugerido : real >= s.sugerido;
        const a = acc.get(ind.chave) || { erros: [], bateu: 0 };
        a.erros.push(erro); if (bateu) a.bateu++;
        acc.set(ind.chave, a);
        detalhe.push({ mes, cs: cs.nome, indicador: ind.chave, sugerido: s.sugerido, realizado: real, vigente: ind.vigente.porCS[cs.nome], bateu });
      }
    }
  }
  const porIndicador = catalogo.filter((c) => !motivoSemModelo(c)).map((c) => {
    const a = acc.get(c.chave);
    const erroMedio = a && a.erros.length ? a.erros.reduce((s, x) => s + x, 0) / a.erros.length : null;
    return { chave: c.chave, rotulo: c.rotulo, n: a?.erros.length ?? 0, erroMedio, metasBatidas: a?.bateu ?? 0, bloqueado: erroMedio !== null && erroMedio > ERRO_MEDIO_MAX_SUGESTAO };
  });
  return { porIndicador, detalhe };
}
