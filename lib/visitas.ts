// Visitas de reversão de churn (onda 2, 08/10/2026). Funções puras sobre as linhas de visitas_resultado
// (função SQL que já calcula retido_30, retido_90, retido_180, IEV, situação do membro e fidelidade).
// Aqui só se conta, se agrupa e se formata. Nenhuma regra de retenção é recalculada no cliente.
//
// Sem IA e sem nome de membro em nada que não seja a fila de ações (que é do gestor).
import { AMOSTRA_MINIMA, CAUSA_RAIZ_PRAZO_DIAS, VISITA_JANELA_MESES, VISITA_SLA_DIAS } from './constants.ts';

export type VisitaLinha = {
  id: number;
  membro_nome: string | null;
  membro_id: number | null;
  group_id: string | null;
  cs_responsavel: string | null;
  visitantes: string | null;
  etapa: string;
  produto: string | null;
  local: string | null;
  acao_principal: string | null;
  termometro: string | null;
  causa_raiz: string | null;
  etapa_origem: string | null;
  duracao: string | null;
  expansao: string | null;
  evitavel: boolean | null;
  identificavel_antes: boolean | null;
  mrr_em_risco: number | null;
  data_pedido: string | null;
  data_visita: string | null;
  data_desfecho: string | null;
  fim_fidelidade: string | null;
  proximo_acompanhamento: string | null;
  encerrada: boolean;
  retencao_imediata: boolean | null;
  situacao_hoje: string;
  dentro_fidelidade: boolean | null;
  dias_ate_visita: number | null;
  dias_ate_novo_risco: number | null;
  retido_30: string;
  retido_90: string;
  retido_180: string;
  iev: number | null;
  churn_item_id?: number | null;
  board_item_id?: number;
};

const DIA_MS = 24 * 60 * 60 * 1000;

// Diferença em dias entre duas datas ISO (AAAA-MM-DD). Positiva quando b é depois de a.
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DIA_MS);
}

// Retenção de uma visita maturada: retido sobre retido mais perdido. Abaixo de AMOSTRA_MINIMA, null.
function percentualRetencao(linhas: VisitaLinha[], campo: 'retido_30' | 'retido_90' | 'retido_180'): { pct: number | null; base: number; emMaturacao: number } {
  const maturadas = linhas.filter((l) => l[campo] === 'retido' || l[campo] === 'perdido');
  const emMaturacao = linhas.filter((l) => l[campo] === 'em_maturacao').length;
  const retidos = maturadas.filter((l) => l[campo] === 'retido').length;
  const base = maturadas.length;
  const pct = base >= AMOSTRA_MINIMA ? Math.round((retidos / base) * 1000) / 10 : null;
  return { pct, base, emMaturacao };
}

// ---- a2: o que fazer agora ----

export function filaAcoes(linhas: VisitaLinha[], hoje: string, limite = 5): string[] {
  const pedidos = linhas
    .filter((l) => l.etapa === 'pedido' && !l.data_visita && l.data_pedido && diasEntre(l.data_pedido, hoje) > VISITA_SLA_DIAS)
    .map((l) => ({ dias: diasEntre(l.data_pedido as string, hoje), texto: `Visitar ${l.membro_nome || 'membro sem nome'}, pedido há ${diasEntre(l.data_pedido as string, hoje)} dias, CS ${l.cs_responsavel || 'não informado'}, MRR R$ ${(l.mrr_em_risco ?? 0).toFixed(2).replace('.', ',')}` }))
    .sort((x, y) => y.dias - x.dias);
  const acompanhamentos = linhas
    .filter((l) => l.etapa === 'acompanhamento' && l.proximo_acompanhamento && l.proximo_acompanhamento < hoje)
    .map((l) => ({ dias: diasEntre(l.proximo_acompanhamento as string, hoje), texto: `Acompanhamento de ${l.membro_nome || 'membro sem nome'} venceu há ${diasEntre(l.proximo_acompanhamento as string, hoje)} dias, CS ${l.cs_responsavel || 'não informado'}` }))
    .sort((x, y) => y.dias - x.dias);
  const causas = linhas
    .filter((l) => l.etapa === 'visita' && !l.causa_raiz && l.data_visita && diasEntre(l.data_visita, hoje) > CAUSA_RAIZ_PRAZO_DIAS)
    .map((l) => ({ dias: diasEntre(l.data_visita as string, hoje), texto: `Registrar a causa raiz da visita a ${l.membro_nome || 'membro sem nome'}` }))
    .sort((x, y) => y.dias - x.dias);
  const fila = [...pedidos, ...acompanhamentos, ...causas].slice(0, limite).map((x) => x.texto);
  return fila.length ? fila : ['Nenhuma pendência de reversão hoje.'];
}

// ---- c1: funil e indicadores ----

// Janela de VISITA_JANELA_MESES meses de data_pedido terminando na referência (AAAA-MM)
export function dentroDaJanelaVisitas(l: VisitaLinha, referencia: string): boolean {
  if (!l.data_pedido) return false;
  const [ano, mes] = referencia.split('-').map(Number);
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10); // último dia do mês de referência
  const inicioDate = new Date(Date.UTC(ano, mes - 1 - VISITA_JANELA_MESES + 1, 1));
  const inicio = inicioDate.toISOString().slice(0, 10);
  return l.data_pedido >= inicio && l.data_pedido <= fim;
}

export function funil(linhas: VisitaLinha[]) {
  const pedidos = linhas.length;
  const visitados = linhas.filter((l) => !!l.data_visita).length;
  const emAcompanhamento = linhas.filter((l) => l.etapa === 'acompanhamento').length;
  const revertidos = linhas.filter((l) => l.etapa === 'revertido').length;
  const perdidos = linhas.filter((l) => l.etapa === 'perdido').length;
  const tempos = linhas.map((l) => l.dias_ate_visita).filter((n): n is number => n !== null && n !== undefined);
  const novos = linhas.map((l) => l.dias_ate_novo_risco).filter((n): n is number => n !== null && n !== undefined);
  const encerradas = revertidos + perdidos;
  const mrrTotal = linhas.reduce((s, l) => s + (l.mrr_em_risco || 0), 0);
  const mrrPreservado = linhas.filter((l) => l.retido_90 === 'retido').reduce((s, l) => s + (l.mrr_em_risco || 0), 0);
  const r30 = percentualRetencao(linhas, 'retido_30');
  const r90 = percentualRetencao(linhas, 'retido_90');
  const r180 = percentualRetencao(linhas, 'retido_180');
  const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10 : null);
  return {
    pedidos,
    visitados,
    emAcompanhamento,
    revertidos,
    perdidos,
    cobertura: pedidos ? Math.round((visitados / pedidos) * 1000) / 10 : null,
    tempoMedioVisitaDias: media(tempos),
    retencaoImediata: encerradas >= AMOSTRA_MINIMA ? Math.round((revertidos / encerradas) * 1000) / 10 : null,
    retencaoImediataDentroFidelidade: retencaoImediataPor(linhas, true),
    retencaoImediataForaFidelidade: retencaoImediataPor(linhas, false),
    retencao30: r30,
    retencao90: r90,
    retencao180: r180,
    mrrEmRisco: Math.round(mrrTotal * 100) / 100,
    mrrPreservado: Math.round(mrrPreservado * 100) / 100,
    tempoMedioNovoRiscoDias: media(novos),
  };
}

function retencaoImediataPor(linhas: VisitaLinha[], dentro: boolean) {
  const grupo = linhas.filter((l) => l.dentro_fidelidade === dentro && l.encerrada);
  const revertidos = grupo.filter((l) => l.retencao_imediata === true).length;
  if (grupo.length < AMOSTRA_MINIMA) return { pct: null, base: grupo.length };
  return { pct: Math.round((revertidos / grupo.length) * 1000) / 10, base: grupo.length };
}

// ---- c1: eficácia por ação principal e por causa raiz ----

export type LinhaEficacia = { chave: string; visitas: number; revertidos: number; retencao90: number | null; base90: number };

export function eficacia(linhas: VisitaLinha[], campo: 'acao_principal' | 'causa_raiz'): LinhaEficacia[] {
  const grupos = new Map<string, VisitaLinha[]>();
  for (const l of linhas) {
    const k = (l[campo] || 'Sem informação').trim();
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(l);
  }
  return Array.from(grupos.entries()).map(([chave, ls]) => {
    const r = percentualRetencao(ls, 'retido_90');
    return { chave, visitas: ls.length, revertidos: ls.filter((l) => l.etapa === 'revertido').length, retencao90: r.pct, base90: r.base };
  }).sort((x, y) => y.visitas - x.visitas || x.chave.localeCompare(y.chave, 'pt-BR'));
}

// ---- c1: calibração do termômetro ao sair ----

export function calibracao(linhas: VisitaLinha[]) {
  const termos = Array.from(new Set(linhas.map((l) => l.termometro || 'Sem informação')));
  return termos.map((termo) => {
    const ls = linhas.filter((l) => (l.termometro || 'Sem informação') === termo);
    return {
      termometro: termo,
      retido: ls.filter((l) => l.retido_90 === 'retido').length,
      perdido: ls.filter((l) => l.retido_90 === 'perdido').length,
      emMaturacao: ls.filter((l) => l.retido_90 === 'em_maturacao').length,
    };
  }).sort((x, y) => x.termometro.localeCompare(y.termometro, 'pt-BR'));
}

// ---- c1: IEV por safra (mês da visita) ----

export function ievPorSafra(linhas: VisitaLinha[], hoje: string) {
  const safras = new Map<string, VisitaLinha[]>();
  for (const l of linhas) {
    if (!l.data_visita) continue;
    const k = l.data_visita.slice(0, 7);
    if (!safras.has(k)) safras.set(k, []);
    safras.get(k)!.push(l);
  }
  return Array.from(safras.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([safra, ls]) => {
    const ultimaVisita = ls.map((l) => l.data_visita as string).sort().pop() as string;
    const emMaturacao = diasEntre(ultimaVisita, hoje) < 180;
    const ievs = ls.map((l) => l.iev).filter((n): n is number => n !== null && n !== undefined);
    return {
      safra,
      visitas: ls.length,
      iev: emMaturacao || ievs.length === 0 ? null : Math.round((ievs.reduce((s, n) => s + n, 0) / ievs.length) * 10) / 10,
      status: emMaturacao ? 'em maturação' : ievs.length === 0 ? 'sem dados' : 'maturada',
    };
  });
}

// ---- c2: perfil (vale a pena visitar?) ----

// Retenção em 90 dias por faixa de um atributo, dentro e fora da fidelidade. Faixas com menos de
// AMOSTRA_MINIMA visitas maturadas aparecem como amostra pequena.
export function perfil(linhas: VisitaLinha[], campo: 'produto' | 'local' | 'duracao' | 'visitantes') {
  const grupos = new Map<string, VisitaLinha[]>();
  for (const l of linhas) {
    const k = (l[campo] || 'Sem informação').trim();
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(l);
  }
  return Array.from(grupos.entries()).map(([faixa, ls]) => {
    const maturadas = ls.filter((l) => l.retido_90 === 'retido' || l.retido_90 === 'perdido');
    const pct = maturadas.length >= AMOSTRA_MINIMA ? Math.round((maturadas.filter((l) => l.retido_90 === 'retido').length / maturadas.length) * 1000) / 10 : null;
    const dentro = maturadas.filter((l) => l.dentro_fidelidade === true);
    const fora = maturadas.filter((l) => l.dentro_fidelidade === false);
    const pctDe = (xs: VisitaLinha[]) => (xs.length >= AMOSTRA_MINIMA ? Math.round((xs.filter((l) => l.retido_90 === 'retido').length / xs.length) * 1000) / 10 : null);
    return { faixa, maturadas: maturadas.length, retencao90: pct, dentroFidelidade: pctDe(dentro), foraFidelidade: pctDe(fora), amostraPequena: pct === null };
  }).sort((x, y) => y.maturadas - x.maturadas || x.faixa.localeCompare(y.faixa, 'pt-BR'));
}

// ---- c3: CSV da lista de visitas ----

// Protege contra fórmula no Excel: campo que começa com = + - @ ganha apóstrofo antes
function celula(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[";\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const LINK_BOARD = 'https://moai-global.monday.com/boards/18432210313/pulses/';

export function csvVisitas(linhas: VisitaLinha[]): string {
  const cab = ['Membro', 'CS', 'Etapa', 'Data do pedido', 'Data da visita', 'Dias até a visita', 'MRR em risco (R$)', 'Ação principal', 'Causa raiz', 'Termômetro ao sair', 'Retenção em 90 dias', 'IEV', 'Link no Monday'];
  const corpo = linhas.map((l) => [
    l.membro_nome, l.cs_responsavel, l.etapa, l.data_pedido, l.data_visita,
    l.dias_ate_visita, l.mrr_em_risco === null ? '' : String(l.mrr_em_risco).replace('.', ','),
    l.acao_principal, l.causa_raiz, l.termometro, l.retido_90, l.iev,
    LINK_BOARD + (l.board_item_id ?? l.id),
  ].map(celula).join(';'));
  return '﻿' + [cab.join(';'), ...corpo].join('\r\n') + '\r\n';
}
