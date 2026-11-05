// Metas semanais por CS (05/11/2026, fase 2). Ponto único de cálculo: telas e rotas chamam metasSemanaisDoCS.
//
// Divisão:
//   montarMetasSemanaisCS   pura. Recebe dados já carregados e devolve as metas e o realizado por parcela de mês.
//   carregarDadosMetas      lê o banco com selectPaginado (PostgREST corta em 1000 linhas sem erro).
//   metasSemanaisDoCS       junta as duas.
//
// Vínculo com o CS, o mesmo de lib/reports.ts: cases, rounds e upsell por nome na coluna de pessoa (nomeBateColunaPessoa
// com grafiasCS); matchmakings por creator_id (userId do CS); indicações pelo nome do report (reports_resumo_cs).
// Data de cada item: dataDeAtribuicao (lib/atribuicao.ts). Item sem data utilizável não entra em semana nenhuma (P8).
//
// Realizado por parcela: soma os itens cuja data cai na parcela do mês. Parcela já fechada usa o realizado congelado
// de metas_semanais_fechamento (P3). Parcela aberta usa o realizado ao vivo.
import type { SupabaseClient } from '@supabase/supabase-js';
import { selectPaginado } from './supabase/paginar.ts';
import { grafiasCS, nomeBateColunaPessoa, normalizeNome, type CSConfig, type ResumoReport } from './reports.ts';
import { dataDeAtribuicao, type IndicadorAtribuicao } from './atribuicao.ts';
import { semanasDoMes, type SemanaDoMes } from './semanas.ts';
import { metasSemanaisDoMes, type SemanaMeta } from './metas-semanais-calculo.ts';
import { MESES_ORDEM, ROUNDS_STATUS_VALIDO, UD_STATUS_VALIDO } from './constants.ts';

// Indicadores de P4: os únicos com meta semanal.
export const INDICADORES_SEMANAIS = ['cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds'] as const;
export type IndicadorSemanal = (typeof INDICADORES_SEMANAIS)[number];

// Linhas já carregadas. Só os campos que o cálculo usa.
export interface DadosMetas {
  cases: { id: number; cs_raw: string | null; mes_grupo_titulo: string; created_at_monday: string | null }[];
  matchmakings: { id: number; creator_id: number | null; mes_grupo_titulo: string; data: string | null; created_at_monday: string | null; resultado: string | null; resultado_registrado_em: string | null }[];
  rounds: { id: number; cs_responsavel_raw: string | null; mes_grupo_titulo: string; status: string | null; inicio: string | null; created_at_monday: string | null }[];
  upsell: { id: number; cs_raw: string | null; status: string | null; tipo_troca: string | null; data: string | null }[];
  reports: Pick<ResumoReport, 'cs_nome' | 'data_efetiva' | 'indicacoes'>[];
  feriados: string[]; // 'AAAA-MM-DD'
  metasMensais: { indicador: string; mes: string; cs_nome: string; valor: number | null }[];
  overrides: { cs_nome: string; indicador: string; mes: string; semana_inicio: string; valor: number }[];
  fechamentos: { cs_nome: string; indicador: string; mes: string; semana_inicio: string; realizado: number | null }[];
}

// Uma parcela de mês de um indicador. realizado null quando não há como medir (sem vínculo do CS).
export interface ParcelaMetaSemanal extends SemanaMeta {
  diasUteis: number;
  parcelaInicio: string;
  parcelaFim: string;
  fechada: boolean; // realizado vem do fechamento congelado
  semData: number; // itens do mês do grupo sem data utilizável (P8)
}

export interface MetasIndicadorCS {
  indicador: IndicadorSemanal;
  metaMensal: number | null; // null: sem meta cadastrada, mostrado como ausente
  mensalRealizado: number | null; // soma das parcelas do mês, para conferência com o Geral
  parcelas: ParcelaMetaSemanal[];
  excedeMeta: boolean;
  semDataTotal: number;
}

export interface MetasSemanaisCS {
  cs: string;
  mes: string; // 'AAAA-MM-01'
  indicadores: MetasIndicadorCS[];
}

const nomeDoMes = (mes: string) => MESES_ORDEM[Number(mes.slice(5, 7)) - 1];

// Texto do grupo casa com o mês: mesma regra de filtrarPorMesAnoFlexivel em lib/reports.ts (exato com ano,
// depois exato sem ano, depois contém). Sem casar, o item não conta como "sem data do mês".
function grupoDoMes(grupo: string | null | undefined, mes: string): boolean {
  const t = (grupo || '').trim().toUpperCase();
  const nome = nomeDoMes(mes).toUpperCase();
  const ano = mes.slice(0, 4);
  return t === `${nome} ${ano}` || t === nome || t.indexOf(nome) !== -1;
}

type ItemMedido = { data: string | null; valor: number; grupoDoMes: boolean };

// Itens do indicador para o CS, já com a data de atribuição. null: o CS não tem vínculo para este indicador
// (ex.: sem userId do Monday para matchmakings), então o realizado é ausente, não zero.
export function itensDoIndicador(ind: IndicadorSemanal, cs: CSConfig, dados: DadosMetas, mes: string): ItemMedido[] | null {
  const grafias = grafiasCS(cs);
  const bateNome = (texto: string | null) => nomeBateColunaPessoa(texto, grafias);
  const minhaMM = (userId: number | null | undefined) => userId !== null && userId !== undefined;
  const grupo = { mes, feriados: dados.feriados };

  // Geral segue o grupo do mês: cases, matchmakings e rounds só contam os itens do grupo deste mês, e a data de
  // criação é subordinada ao grupo (lib/atribuicao.ts). Matchmakings com resultado é a exceção (D7).
  switch (ind) {
    case 'cases':
      return dados.cases.filter((r) => bateNome(r.cs_raw) && grupoDoMes(r.mes_grupo_titulo, mes)).map((r) => ({
        data: dataDeAtribuicao('cases', r, grupo), valor: 1, grupoDoMes: true,
      }));
    case 'matchmakings': {
      if (!minhaMM(cs.userId)) return null;
      return dados.matchmakings.filter((r) => Number(r.creator_id) === cs.userId && grupoDoMes(r.mes_grupo_titulo, mes)).map((r) => ({
        data: dataDeAtribuicao('matchmakings', r, grupo), valor: 1, grupoDoMes: true,
      }));
    }
    case 'matchmakings_resultado': {
      if (!minhaMM(cs.userId)) return null;
      return dados.matchmakings
        .filter((r) => Number(r.creator_id) === cs.userId && (r.resultado || '').trim().length > 0)
        .map((r) => ({ data: dataDeAtribuicao('matchmakings_resultado', r), valor: 1, grupoDoMes: grupoDoMes(r.mes_grupo_titulo, mes) }));
    }
    case 'rounds':
      return dados.rounds.filter((r) => r.status === ROUNDS_STATUS_VALIDO && bateNome(r.cs_responsavel_raw) && grupoDoMes(r.mes_grupo_titulo, mes)).map((r) => ({
        data: dataDeAtribuicao('rounds', r, grupo), valor: 1, grupoDoMes: true,
      }));
    case 'upsell':
      // upsell_downsell_items não tem grupo do mês: item sem data não é atribuído a mês nenhum (grupoDoMes falso).
      return dados.upsell.filter((r) => r.status === UD_STATUS_VALIDO && r.tipo_troca === 'Upsell' && bateNome(r.cs_raw)).map((r) => ({
        data: dataDeAtribuicao('upsell', r), valor: 1, grupoDoMes: false,
      }));
    case 'indicacoes': {
      // Indicações vêm do report: valor é o número de indicações do report, data é a do report (data_efetiva).
      const alvo = normalizeNome(cs.nome);
      return dados.reports.filter((r) => normalizeNome(r.cs_nome || '') === alvo).map((r) => ({
        data: dataDeAtribuicao('indicacoes', { data: r.data_efetiva }), valor: Number(r.indicacoes ?? 0), grupoDoMes: false,
      }));
    }
  }
}

const dentro = (data: string, ini: string, fim: string) => data >= ini && data <= fim;

function metaMensalDoCS(dados: DadosMetas, cs: string, mes: string, ind: IndicadorSemanal): number | null {
  const r = dados.metasMensais.find((m) => m.indicador === ind && m.mes === mes && normalizeNome(m.cs_nome) === normalizeNome(cs));
  return r && r.valor !== null && r.valor !== undefined ? Number(r.valor) : null;
}

// Função pura. Monta as metas semanais de um CS no mês, indicador a indicador.
export function montarMetasSemanaisCS(cs: CSConfig, mes: string, dados: DadosMetas): MetasSemanaisCS {
  const semanas: SemanaDoMes[] = semanasDoMes(mes, dados.feriados);
  const indicadores: MetasIndicadorCS[] = INDICADORES_SEMANAIS.map((ind) => {
    const metaMensal = metaMensalDoCS(dados, cs.nome, mes, ind);
    const itens = itensDoIndicador(ind, cs, dados, mes);
    const overrides: Record<string, number> = {};
    dados.overrides.filter((o) => normalizeNome(o.cs_nome) === normalizeNome(cs.nome) && o.indicador === ind && o.mes === mes)
      .forEach((o) => { overrides[o.semana_inicio] = Number(o.valor); });
    const fechadas = new Map<string, number | null>();
    dados.fechamentos.filter((f) => normalizeNome(f.cs_nome) === normalizeNome(cs.nome) && f.indicador === ind && f.mes === mes)
      .forEach((f) => fechadas.set(f.semana_inicio, f.realizado === null || f.realizado === undefined ? null : Number(f.realizado)));

    // Realizado por parcela: congelado quando a parcela está fechada, ao vivo quando não.
    const realizadoCongelado: Record<string, number | null | undefined> = {};
    const semData = itens ? itens.filter((i) => i.data === null && i.grupoDoMes).length : 0;
    semanas.forEach((s) => {
      const fechado = fechadas.has(s.inicio);
      if (fechado) { realizadoCongelado[s.inicio] = fechadas.get(s.inicio) ?? null; return; }
      if (itens === null) { realizadoCongelado[s.inicio] = null; return; }
      realizadoCongelado[s.inicio] = itens.filter((i) => i.data !== null && dentro(i.data, s.parcelaInicio, s.parcelaFim))
        .reduce((t, i) => t + i.valor, 0);
    });

    const calc = metasSemanaisDoMes({ metaMensal, semanas, overrides, realizadoCongelado });
    const parcelas: ParcelaMetaSemanal[] = calc.map((c) => {
      const s = semanas.find((x) => x.inicio === c.inicio)!;
      return {
        ...c,
        diasUteis: s.diasUteis,
        parcelaInicio: s.parcelaInicio,
        parcelaFim: s.parcelaFim,
        fechada: fechadas.has(c.inicio),
        semData,
      };
    });
    const mensalRealizado = itens === null ? null : itens.filter((i) => i.data !== null && i.data.slice(0, 7) === mes.slice(0, 7))
      .reduce((t, i) => t + i.valor, 0);
    return {
      indicador: ind,
      metaMensal,
      mensalRealizado,
      parcelas,
      excedeMeta: calc.some((c) => c.excedeMeta),
      semDataTotal: semData,
    };
  });
  return { cs: cs.nome, mes, indicadores };
}

// Leitura do banco. Paginada, com ordem estável por id.
export async function carregarDadosMetas(sb: SupabaseClient, mes: string): Promise<DadosMetas> {
  const [cases, matchmakings, rounds, upsell, feriados, metasMensais, overrides, fechamentos, reports] = await Promise.all([
    selectPaginado(() => sb.from('cases_items').select('id, cs_raw, mes_grupo_titulo, created_at_monday').order('id'), { nome: 'cases_items' }),
    selectPaginado(() => sb.from('matchmakings_items').select('id, creator_id, mes_grupo_titulo, data, created_at_monday, resultado, resultado_registrado_em').order('id'), { nome: 'matchmakings_items' }),
    selectPaginado(() => sb.from('rounds_items').select('id, cs_responsavel_raw, mes_grupo_titulo, status, inicio, created_at_monday').order('id'), { nome: 'rounds_items' }),
    selectPaginado(() => sb.from('upsell_downsell_items').select('id, cs_raw, status, tipo_troca, data').order('id'), { nome: 'upsell_downsell_items' }),
    selectPaginado(() => sb.from('feriados').select('data').order('data'), { nome: 'feriados' }),
    selectPaginado(() => sb.from('metas_definidas').select('indicador, mes, cs_nome, valor').eq('escopo', 'cs').eq('mes', mes).order('id'), { nome: 'metas_definidas' }),
    selectPaginado(() => sb.from('metas_semanais_override').select('cs_nome, indicador, mes, semana_inicio, valor').eq('mes', mes).order('id'), { nome: 'metas_semanais_override' }),
    selectPaginado(() => sb.from('metas_semanais_fechamento').select('cs_nome, indicador, mes, semana_inicio, realizado').eq('mes', mes).order('semana_inicio'), { nome: 'metas_semanais_fechamento' }),
    (async () => {
      const { data, error } = await sb.rpc('reports_resumo_cs');
      if (error) throw new Error('Erro ao buscar reports_resumo_cs: ' + error.message);
      return (data || []) as ResumoReport[];
    })(),
  ]);
  return {
    cases: cases as DadosMetas['cases'],
    matchmakings: matchmakings as DadosMetas['matchmakings'],
    rounds: rounds as DadosMetas['rounds'],
    upsell: upsell as DadosMetas['upsell'],
    feriados: (feriados as { data: string }[]).map((f) => f.data),
    metasMensais: metasMensais as DadosMetas['metasMensais'],
    overrides: overrides as DadosMetas['overrides'],
    fechamentos: fechamentos as DadosMetas['fechamentos'],
    reports: reports.map((r) => ({ cs_nome: r.cs_nome, data_efetiva: r.data_efetiva, indicacoes: r.indicacoes })),
  };
}

// Função única usada por telas e rotas.
export async function metasSemanaisDoCS(sb: SupabaseClient, cs: CSConfig, mes: string): Promise<MetasSemanaisCS> {
  const dados = await carregarDadosMetas(sb, mes);
  return montarMetasSemanaisCS(cs, mes, dados);
}
