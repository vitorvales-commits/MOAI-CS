// Pulso de CS (pedido do Vitor, 05/10/2026). A partir de outubro de 2026 o board "NPS time CS"
// (18412032453) recebe um formulário único e mensal no lugar da avaliação entre pares e do NPS
// interno antigo. Este módulo concentra tudo que a aplicação precisa saber sobre o Pulso: qual
// período usa a estrutura nova, o resumo agregado para o gestor e a leitura individual para o CS.
//
// Regras de privacidade, as mesmas do relatório mensal (nenhum nome de respondente sai daqui):
//   1. pulso_cs_items só é legível por gestor (RLS). generatePulsoCS devolve agregados e textos
//      embaralhados, sem respondente.
//   2. O CS comum recebe só o que foi escrito sobre ele, por pulso_cs_individual (SECURITY DEFINER),
//      que também exclui a autoavaliação.
//
// A régua do NPS interno é a padrão da MOAI (calcularNPS, 9 e 10 promotor, 7 e 8 neutro, 0 a 6
// detrator), aplicada à pergunta "De 0 a 10, o quanto você recomendaria trabalhar no time de CS da
// MOAI?". Nunca há uma segunda implementação do cálculo.
import type { SupabaseClient } from '@supabase/supabase-js';
import { MESES_ORDEM } from './constants';
import { calcularNPS, type NPSResultado } from './reports';

// Primeiro ciclo que usa o Pulso. Antes disso vale a estrutura antiga (feedback_items).
export const PULSO_ANO_INICIO = 2026;
export const PULSO_MES_INICIO = 'Outubro';

export type ModoFeedback = 'legado' | 'pulso' | 'ambos';

// Decide qual estrutura vale para o período selecionado. Visão Geral do ano de início mostra as duas,
// cada uma na sua seção, porque os dados antigos e os novos não são comparáveis entre si.
export function modoFeedbackDoPeriodo(mes: string, ano: number): ModoFeedback {
  const geral = mes === 'Visão Geral';
  const idxInicio = MESES_ORDEM.indexOf(PULSO_MES_INICIO);
  if (ano > PULSO_ANO_INICIO) return 'pulso';
  if (ano < PULSO_ANO_INICIO) return 'legado';
  if (geral) return 'ambos';
  const idx = MESES_ORDEM.indexOf(mes);
  return idx >= idxInicio ? 'pulso' : 'legado';
}

export function mesesDoPulso(ano: number): string[] {
  if (ano > PULSO_ANO_INICIO) return MESES_ORDEM.slice();
  if (ano < PULSO_ANO_INICIO) return [];
  return MESES_ORDEM.slice(MESES_ORDEM.indexOf(PULSO_MES_INICIO));
}

function embaralhar<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function textosLimpos(valores: (string | null | undefined)[]): string[] {
  return embaralhar(valores.map((v) => (v || '').trim()).filter((v) => v.length > 0));
}

function contarRanking(valores: string[]): { rotulo: string; qtd: number }[] {
  const mapa = new Map<string, number>();
  valores.forEach((v) => { const k = v.trim(); if (k) mapa.set(k, (mapa.get(k) || 0) + 1); });
  return Array.from(mapa.entries())
    .map(([rotulo, qtd]) => ({ rotulo, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

// ============ resumo agregado (gestor) ============

export type ResumoPulso = {
  respostas: number;
  nps: NPSResultado;
  clareza: { media: number | null; total: number; baixa: number; media_faixa: number; alta: number };
  gargalos: { rotulo: string; qtd: number }[];
  destaques: { rotulo: string; qtd: number }[];
  textos: {
    melhorar: string[];
    comecarPararContinuar: string[];
    temaApoio: string[];
    liderancaSaber: string[];
    feedbackLideranca: string[];
  };
};

// Função pura: recebe linhas de pulso_cs_items e devolve o resumo. Não lê respondente_nome, de
// propósito, para que nenhum caminho de código o leve até a resposta da API.
export function resumirPulso(linhas: any[]): ResumoPulso {
  const claras = linhas.map((r) => r.nota_clareza).filter((n) => typeof n === 'number') as number[];
  const mediaClareza = claras.length > 0 ? Math.round((claras.reduce((a, b) => a + b, 0) / claras.length) * 10) / 10 : null;
  return {
    respostas: linhas.length,
    nps: calcularNPS(linhas.map((r) => r.nota_recomendacao)),
    clareza: {
      media: mediaClareza,
      total: claras.length,
      baixa: claras.filter((n) => n <= 6).length,
      media_faixa: claras.filter((n) => n >= 7 && n <= 8).length,
      alta: claras.filter((n) => n >= 9).length,
    },
    gargalos: contarRanking(linhas.flatMap((r) => (Array.isArray(r.gargalos) ? r.gargalos : []))),
    destaques: contarRanking(linhas.map((r) => r.destaque_colaboracao || '')),
    textos: {
      melhorar: textosLimpos(linhas.map((r) => r.melhorar_texto)),
      comecarPararContinuar: textosLimpos(linhas.map((r) => r.comecar_parar_continuar)),
      temaApoio: textosLimpos(linhas.map((r) => r.tema_apoio_texto)),
      liderancaSaber: textosLimpos(linhas.map((r) => r.lideranca_saber_texto)),
      feedbackLideranca: textosLimpos(linhas.map((r) => r.feedback_lideranca_texto)),
    },
  };
}

function linhasDoPeriodo(linhas: any[], mes: string): any[] {
  if (mes === 'Visão Geral') return linhas;
  const alvo = mes.trim().toUpperCase();
  return linhas.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase() === alvo);
}

// GET /api/gestor/pulso. Só gestor, garantido pela rota e pela RLS da tabela.
export async function generatePulsoCS(sb: SupabaseClient, mes: string, ano: number) {
  const { data, error } = await sb.from('pulso_cs_items').select(
    'id, mes_grupo_titulo, nota_recomendacao, nota_clareza, gargalos, melhorar_texto, comecar_parar_continuar, destaque_colaboracao, tema_apoio_texto, lideranca_saber_texto, feedback_lideranca_texto, respondente_nome',
  ).limit(5000);
  if (error) throw new Error('Erro ao buscar pulso_cs_items: ' + error.message);
  const todas = (data || []) as any[];

  const { count: csAtivos, error: errCs } = await sb.from('cs_config').select('nome', { count: 'exact', head: true }).eq('ativo', true);
  if (errCs) throw new Error('Erro ao contar CS ativos: ' + errCs.message);

  const meses = mesesDoPulso(ano);
  const doPeriodo = linhasDoPeriodo(todas, mes);
  const resumo = resumirPulso(doPeriodo);

  // Adesão: quantos responderam contra quantos CS ativos existem. Só faz sentido para um mês.
  // respondente_nome é lido aqui apenas para contar respondentes distintos, nunca é devolvido.
  const respondentes = new Set(doPeriodo.map((r) => (r.respondente_nome || '').trim().toLowerCase()).filter(Boolean));
  const adesao = mes === 'Visão Geral' ? null : { responderam: respondentes.size, esperados: csAtivos || 0 };

  const serie = meses.map((m) => {
    const r = resumirPulso(linhasDoPeriodo(todas, m));
    return { mes: m, respostas: r.respostas, nps: r.nps.score, clareza: r.clareza.media };
  }).filter((s) => s.respostas > 0);

  return {
    periodo: { mes, ano, geral: mes === 'Visão Geral', geradoEm: new Date().toISOString() },
    mesesDisponiveis: meses,
    resumo,
    adesao,
    serie,
  };
}
export type PulsoGestor = Awaited<ReturnType<typeof generatePulsoCS>>;

// ============ leitura individual (CS) ============

export type PulsoIndividual = {
  modo: ModoFeedback;
  respostas: number;
  avaliadores: number;
  destaques: number;
  falas: string[];
};

// Só chama o banco quando o período usa o Pulso. A função do banco valida sozinha se o chamador é
// gestor ou o próprio CS, então a rota não precisa repetir a regra.
export async function buscarPulsoIndividual(sb: SupabaseClient, nomeCS: string, mes: string, ano: number): Promise<PulsoIndividual> {
  const modo = modoFeedbackDoPeriodo(mes, ano);
  const vazio: PulsoIndividual = { modo, respostas: 0, avaliadores: 0, destaques: 0, falas: [] };
  if (modo === 'legado') return vazio;
  const { data, error } = await sb.rpc('pulso_cs_individual', { p_cs: nomeCS, p_mes: mes === 'Visão Geral' ? null : mes });
  if (error) throw new Error('Erro ao buscar o Pulso de CS: ' + error.message);
  const d = (data || {}) as any;
  return {
    modo,
    respostas: Number(d.respostas) || 0,
    avaliadores: Number(d.avaliadores) || 0,
    destaques: Number(d.destaques) || 0,
    falas: Array.isArray(d.falas) ? d.falas : [],
  };
}
