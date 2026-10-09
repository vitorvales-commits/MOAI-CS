// Onda 1 do churn (pedido do Vitor, 30/09/2026): camada de dados, gráfico, anonimização e IA do
// churn na visão do gestor. Tudo que a aba Churn (app/gestor-html.ts), as rotas
// /api/gestor/churn* e o relatório imprimível (app/gestor/churn/relatorio) precisam passa por
// aqui, para existir uma regra só de recorte, de rótulo e de desenho.
//
// Regras que NÃO moram aqui, e sim no banco (supabase/migrations/20260930_churn_onda1.sql):
// semana do mês (semana_do_mes), data de referência (churn_items.data_referencia = data do
// Monday, senão o dia de criação do item), filtro do recorte (churn_filtrados) e classificação do
// CS (cs_categoria). O TypeScript só lê e desenha.
import type { SupabaseClient } from '@supabase/supabase-js';
import { acaoParaMotivo } from '../config/acoes-por-motivo';

// ============ recorte ============

export type Granularidade = 'mes' | 'semana';
export type CategoriaCs = 'cs_ativo' | 'cs_ex' | 'nao_cs' | 'nao_informado' | 'nao_classificado';

export const CATEGORIAS_CS: { chave: CategoriaCs; rotulo: string }[] = [
  { chave: 'cs_ativo', rotulo: 'CS ativos' },
  { chave: 'cs_ex', rotulo: 'Ex CS' },
  { chave: 'nao_cs', rotulo: 'Não é CS (Comunidade, High End, Comercial)' },
  { chave: 'nao_informado', rotulo: 'CS não informado' },
  { chave: 'nao_classificado', rotulo: 'Sem classificação' },
];

// Janela da visão mensal: 12 meses terminando no mês de referência.
export const MESES_JANELA_MENSAL = 12;

// Churn oficial em dois níveis explícitos. carteira_atual: churns de CS ativos hoje, sem a Comunidade
// (a Comunidade não tem CS), o número que se compara com a meta. toda_a_rede: todos os churns,
// incluindo ex CS, sem CS e, se o filtro de produto permitir, a Comunidade.
export type BaseChurn = 'carteira_atual' | 'toda_a_rede';
export const BASES_CHURN: { chave: BaseChurn; rotulo: string; definicao: string }[] = [
  { chave: 'carteira_atual', rotulo: 'Carteira atual', definicao: 'CS ativos, sem a Comunidade' },
  { chave: 'toda_a_rede', rotulo: 'Toda a rede', definicao: 'todos os CS e ex CS' },
];
export function rotuloBase(b: BaseChurn): string {
  return BASES_CHURN.find((x) => x.chave === b)!.rotulo;
}
// Valor antigo do filtro de produto único; segue aceito na URL e vira a chave nova.
export const PRODUTO_SEM_VALOR = '__sem_produto__';
export const PRODUTO_SEM_INFORMACAO = 'sem_produto_informado';
// Ordem fixa das opções do filtro; produto novo que apareça no Monday entra depois, em ordem alfabética.
export const PRODUTOS_ORDEM = ['Fast Track', 'Executivo', 'C-Level', 'C-Level +', 'High End', 'Alavanca', PRODUTO_SEM_INFORMACAO];
const MAX_PRODUTOS_FILTRO = 20;

// A chave é o valor canônico de churn_items.produto_normalizado; o rótulo é o que se escreve na tela.
export function rotuloProduto(chave: string): string {
  if (chave === PRODUTO_SEM_INFORMACAO) return 'Sem produto informado';
  return chave.replace(/-/g, ' ');
}

export interface Recorte {
  base: BaseChurn;
  granularidade: Granularidade;
  referencia: string; // AAAA-MM
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
  cs: string | null;
  // Produtos marcados, sem a Comunidade. Nulo significa todos os produtos (padrão).
  produtos: string[] | null;
  // A Comunidade vem fora da conta por padrão e aparece à parte, numa linha sob o gráfico. Só pode
  // entrar na base toda_a_rede; na carteira atual ela nunca entra.
  incluirComunidade: boolean;
  csCategoria: CategoriaCs | null;
}

export class RecorteInvalido extends Error {}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function ultimoDia(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
export function mesAtualBrasilia(): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === 'year')!.value;
  const mes = partes.find((p) => p.type === 'month')!.value;
  return `${ano}-${mes}`;
}
// Mês de referência padrão: o último mês FECHADO. O mês em andamento continua selecionável.
export function ultimoMesFechado(): string {
  const [a, m] = mesAtualBrasilia().split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}
export function diaAtualBrasilia(): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(new Date()));
}

function lerProdutos(entrada: URLSearchParams | Record<string, unknown>): { produtos: string[] | null; comunidade: boolean } {
  let bruto: unknown;
  if (entrada instanceof URLSearchParams) bruto = entrada.has('produtos') ? entrada.get('produtos') : undefined;
  else bruto = entrada['produtos'];
  let comunidade = false;
  const flag = entrada instanceof URLSearchParams ? entrada.get('comunidade') : entrada['comunidade'];
  if (flag === '1' || flag === 1 || flag === true || flag === 'true') comunidade = true;

  let lista: unknown[] | null = null;
  if (Array.isArray(bruto)) lista = bruto;
  else if (typeof bruto === 'string') lista = bruto.split(',');
  else {
    // compatibilidade com o filtro antigo de produto único
    const legado = textoFiltro(entrada instanceof URLSearchParams ? entrada.get('produto') : entrada['produto']);
    if (legado) lista = [legado];
  }
  if (lista === null) return { produtos: null, comunidade };

  const vistos = new Set<string>();
  for (const item of lista) {
    const t = textoFiltro(item, 60);
    if (!t) continue;
    if (t.toLowerCase() === 'comunidade') { comunidade = true; continue; }
    vistos.add(t === PRODUTO_SEM_VALOR ? PRODUTO_SEM_INFORMACAO : t);
  }
  if (vistos.size > MAX_PRODUTOS_FILTRO) throw new RecorteInvalido('Produtos demais no filtro.');
  return { produtos: [...vistos], comunidade };
}

function textoFiltro(v: unknown, max = 80): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) throw new RecorteInvalido('Filtro longo demais.');
  return t;
}

export function intervaloDaGranularidade(granularidade: Granularidade, referencia: string): { inicio: string; fim: string } {
  const [ano, mes] = referencia.split('-').map(Number);
  const fim = `${ano}-${pad2(mes)}-${pad2(ultimoDia(ano, mes))}`;
  if (granularidade === 'semana') return { inicio: `${ano}-${pad2(mes)}-01`, fim };
  const ini = new Date(Date.UTC(ano, mes - 1 - (MESES_JANELA_MENSAL - 1), 1));
  return { inicio: `${ini.getUTCFullYear()}-${pad2(ini.getUTCMonth() + 1)}-01`, fim };
}

// Aceita URLSearchParams (GET) ou um objeto JSON (POST). Nunca confia em inicio/fim vindos do
// cliente: o intervalo é sempre derivado de granularidade + referência.
export function parseRecorte(entrada: URLSearchParams | Record<string, unknown>): Recorte {
  const get = (k: string): unknown => (entrada instanceof URLSearchParams ? entrada.get(k) : entrada[k]);
  const granularidade = get('granularidade') === 'semana' ? 'semana' : 'mes';
  const refBruta = typeof get('ref') === 'string' ? String(get('ref')) : '';
  const referencia = /^\d{4}-(0[1-9]|1[0-2])$/.test(refBruta) ? refBruta : ultimoMesFechado();
  const anoRef = Number(referencia.slice(0, 4));
  if (anoRef < 2020 || anoRef > 2100) throw new RecorteInvalido('Mês de referência inválido.');
  const catBruta = textoFiltro(get('categoria'), 30);
  if (catBruta && !CATEGORIAS_CS.some((c) => c.chave === catBruta)) throw new RecorteInvalido('Categoria de CS inválida.');
  const { inicio, fim } = intervaloDaGranularidade(granularidade, referencia);
  const { produtos, comunidade } = lerProdutos(entrada);
  const base: BaseChurn = get('base') === 'toda_a_rede' ? 'toda_a_rede' : 'carteira_atual';
  return {
    base, granularidade, referencia, inicio, fim,
    cs: textoFiltro(get('cs')),
    produtos,
    incluirComunidade: base === 'toda_a_rede' && comunidade,
    csCategoria: (catBruta as CategoriaCs) || null,
  };
}

// Mesma seleção em forma de URL: a cópia do link reproduz a visão e o relatório herda o estado.
// produtos ausente = todos; produtos vazio = nenhum marcado; comunidade=1 = Comunidade na conta.
export function recorteParaQuery(r: Recorte): string {
  const p = new URLSearchParams({ granularidade: r.granularidade, ref: r.referencia });
  if (r.base === 'toda_a_rede') p.set('base', 'toda_a_rede');
  if (r.cs) p.set('cs', r.cs);
  if (r.produtos !== null) p.set('produtos', r.produtos.join(','));
  if (r.incluirComunidade) p.set('comunidade', '1');
  if (r.csCategoria) p.set('categoria', r.csCategoria);
  return p.toString();
}

// Chave que identifica a seleção em churn_analises.filtro_produto. Nula só para o recorte antigo
// (toda a rede, todos os produtos e Comunidade dentro), que é o que a coluna nula já significava.
export function chaveProdutos(r: Pick<Recorte, 'base' | 'produtos' | 'incluirComunidade'>): string | null {
  const lista = r.produtos === null ? 'todos' : ([...r.produtos].sort().join('|') || 'nenhum');
  if (r.base === 'carteira_atual') return `carteira_atual|${lista}`;
  if (r.produtos === null) return r.incluirComunidade ? null : 'todos_exceto_comunidade';
  return r.incluirComunidade ? `${lista}|comunidade` : lista;
}

function argsFiltro(r: Pick<Recorte, 'inicio' | 'fim' | 'cs' | 'produtos' | 'incluirComunidade' | 'csCategoria' | 'base'>) {
  return {
    p_inicio: r.inicio, p_fim: r.fim, p_cs: r.cs, p_cs_categoria: r.csCategoria,
    p_produtos: r.produtos, p_incluir_comunidade: r.incluirComunidade, p_base: r.base,
  };
}

// ============ rótulos ============

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function rotuloMesLongo(referencia: string): string {
  const [ano, mes] = referencia.split('-').map(Number);
  return `${MESES_LONGOS[mes - 1]} de ${ano}`;
}
function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Texto do recorte em linguagem clara, dizendo o que está dentro e o que está fora da conta.
export function descreverRecorte(r: Recorte): string {
  const periodo = r.granularidade === 'semana'
    ? `semanas de ${rotuloMesLongo(r.referencia)}`
    : `${MESES_JANELA_MENSAL} meses de ${dataBR(r.inicio)} a ${dataBR(r.fim)}`;
  const partes: string[] = [`${rotuloBase(r.base)}: ${BASES_CHURN.find((b) => b.chave === r.base)!.definicao}`];
  if (r.cs) partes.push(`CS ${r.cs}`);
  else if (r.csCategoria) partes.push(r.csCategoria === 'cs_ex' ? 'Ex CS' : CATEGORIAS_CS.find((c) => c.chave === r.csCategoria)!.rotulo);
  if (r.produtos === null) partes.push('todos os produtos');
  else if (r.produtos.length === 0) partes.push('nenhum produto marcado');
  else partes.push(`produtos ${r.produtos.map(rotuloProduto).join(', ')}`);
  partes.push(r.incluirComunidade ? 'Comunidade incluída na conta' : 'Comunidade fora da conta');
  return `${periodo}, ${partes.join(', ')}`;
}

// Paleta dos motivos: seis primeiros slots da paleta categórica de referência, validada com o
// script do skill de visualização (contraste abaixo de 3:1 em três cores, por isso o gráfico
// sempre vem com tabela e rótulo de total). Os dois "sem motivo" ficam em cinza, um liso e outro
// hachurado, porque não são categorias de verdade e não devem competir com as seis.
export const MOTIVOS: { chave: string; rotulo: string; cor: string }[] = [
  { chave: 'falta_de_tempo', rotulo: 'Falta de tempo', cor: '#2a78d6' },
  { chave: 'financeiro', rotulo: 'Motivos financeiros', cor: '#eb6834' },
  { chave: 'questoes_internas_empresa', rotulo: 'Questões internas da empresa', cor: '#1baf7a' },
  { chave: 'ausencia_de_brasilia', rotulo: 'Ausência de Brasília', cor: '#eda100' },
  { chave: 'insatisfacao', rotulo: 'Insatisfação', cor: '#e87ba4' },
  { chave: 'questoes_pessoais', rotulo: 'Questões pessoais', cor: '#008300' },
  { chave: 'nao_desejo_informar', rotulo: 'Preferiu não informar', cor: '#9F9F9F' },
  { chave: 'nao_informado', rotulo: 'Sem resposta', cor: 'hachura' },
];
const COR_MOTIVO_DESCONHECIDO = '#5D5D5D';

export function infoMotivo(chave: string): { chave: string; rotulo: string; cor: string } {
  const m = MOTIVOS.find((x) => x.chave === chave);
  if (m) return m;
  const rotulo = chave.replace(/_/g, ' ');
  return { chave, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1), cor: COR_MOTIVO_DESCONHECIDO };
}

// ============ série ============

export interface PeriodoSerie {
  inicio: string;
  fim: string;
  semana: number | null;
  rotulo: string;
  rotuloLongo: string;
  total: number;
  porMotivo: Record<string, number>;
}
export interface SerieChurn {
  granularidade: Granularidade;
  periodos: PeriodoSerie[];
  total: number;
  porMotivo: { chave: string; rotulo: string; cor: string; qtd: number; pct: number }[];
}

export function montarSerie(rows: any[], granularidade: Granularidade): SerieChurn {
  const porChave = new Map<string, PeriodoSerie>();
  for (const row of rows) {
    const chave = `${row.periodo_inicio}|${row.semana ?? ''}`;
    let p = porChave.get(chave);
    if (!p) {
      const [a, m] = String(row.periodo_inicio).split('-').map(Number);
      const rotulo = row.semana ? `Semana ${row.semana}` : `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`;
      const rotuloLongo = row.semana
        ? `Semana ${row.semana} (${dataBR(row.periodo_inicio)} a ${dataBR(row.periodo_fim)})`
        : rotuloMesLongo(`${a}-${pad2(m)}`);
      p = { inicio: row.periodo_inicio, fim: row.periodo_fim, semana: row.semana ?? null, rotulo, rotuloLongo, total: 0, porMotivo: {} };
      porChave.set(chave, p);
    }
    if (row.motivo && row.qtd > 0) {
      p.porMotivo[row.motivo] = (p.porMotivo[row.motivo] || 0) + row.qtd;
      p.total += row.qtd;
    }
  }
  const periodos = [...porChave.values()].sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));
  const totais: Record<string, number> = {};
  periodos.forEach((p) => Object.entries(p.porMotivo).forEach(([k, v]) => (totais[k] = (totais[k] || 0) + v)));
  const total = Object.values(totais).reduce((s, v) => s + v, 0);
  return { granularidade, periodos, total, porMotivo: ordenarMotivos(totais, total) };
}

// ============ consulta única da tela ============
// Uma só função no banco (churn_tela) devolve série, total do mês de referência, motivo mais citado,
// variação, recorde no mesmo filtro e resumo da Comunidade, todos de um mesmo conjunto materializado.
// Nenhum componente calcula total por conta própria.

export interface TelaChurn {
  base: BaseChurn;
  referencia: string; // AAAA-MM
  emAndamento: boolean;
  primeiroMesCarteira: string | null; // primeiro mês com churn de CS ativo, derivado dos dados
  serie: SerieChurn;
  totalMes: number;
  totalMesAnterior: number;
  motivoTop: { chave: string; rotulo: string; qtd: number } | null;
  recordeMensal: { valor: number; mes: string; emAndamento: boolean } | null;
  recordeSemanal: { valor: number; mes: string; semana: number; emAndamento: boolean } | null;
  comunidade: ResumoComunidade;
}

export interface ResumoComunidade {
  incluida: boolean;
  totalMes: number;
  totalRedeMes: number;
  porMotivo: { chave: string; rotulo: string; cor: string; qtd: number; pct: number }[];
}

export async function buscarTela(supabase: SupabaseClient, r: Recorte, granularidade: Granularidade = r.granularidade): Promise<TelaChurn> {
  const { data, error } = await supabase.rpc('churn_tela', {
    p_granularidade: granularidade, p_ref: `${r.referencia}-01`, p_cs: r.cs, p_cs_categoria: r.csCategoria,
    p_produtos: r.produtos, p_incluir_comunidade: r.incluirComunidade, p_base: r.base,
  });
  if (error) throw new Error('churn_tela: ' + error.message);
  const t: any = data || {};
  const com: any = t.comunidade || {};
  const totalCom = Number(com.total_mes || 0);
  const motivosCom: Record<string, number> = {};
  (com.por_motivo || []).forEach((m: any) => (motivosCom[m.motivo] = m.qtd));
  const refMes = String(t.ref).slice(0, 7);
  return {
    base: r.base, referencia: refMes, emAndamento: !!t.em_andamento,
    primeiroMesCarteira: t.primeiro_mes_carteira ?? null,
    serie: montarSerie(t.serie || [], granularidade),
    totalMes: Number(t.total_mes || 0), totalMesAnterior: Number(t.total_mes_anterior || 0),
    motivoTop: t.motivo_top ? { ...infoMotivo(t.motivo_top.motivo), qtd: t.motivo_top.qtd } : null,
    recordeMensal: t.recorde_mensal ? { valor: t.recorde_mensal.valor, mes: t.recorde_mensal.mes, emAndamento: !!t.recorde_mensal.em_andamento } : null,
    recordeSemanal: t.recorde_semanal ? { valor: t.recorde_semanal.valor, mes: t.recorde_semanal.mes, semana: t.recorde_semanal.semana, emAndamento: !!t.recorde_semanal.em_andamento } : null,
    comunidade: {
      incluida: !!com.incluida, totalMes: totalCom, totalRedeMes: Number(com.total_rede_mes || 0),
      porMotivo: ordenarMotivos(motivosCom, totalCom),
    },
  };
}

export async function buscarSerie(supabase: SupabaseClient, r: Recorte, granularidade: Granularidade = r.granularidade): Promise<SerieChurn> {
  return (await buscarTela(supabase, r, granularidade)).serie;
}

// ============ textos da tela (uma definição por número, escrita no próprio rótulo) ============

export interface TextosTela {
  rotuloNumero: string;
  definicaoNumero: string;
  variacao: string;
  motivoRotulo: string;
  motivoFracao: string;
  notaRecorde: string;
  avisoCarteira: string | null;
  linhaComunidade: string;
  linkLista: string;
}

function mesAnteriorDe(referencia: string): string {
  const [a, m] = referencia.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}
function mesLongoSemAno(referencia: string): string {
  return MESES_LONGOS[Number(referencia.slice(5, 7)) - 1];
}

export function textosTela(t: TelaChurn, r: Recorte, hoje: number = diaAtualBrasilia()): TextosTela {
  const ref = t.referencia;
  const mesRef = rotuloMesLongo(ref);
  const rotuloNumero = t.emAndamento ? `Churns em ${mesRef}, até ${hoje} de ${mesLongoSemAno(ref)}` : `Churns em ${mesRef}`;
  const def = BASES_CHURN.find((b) => b.chave === t.base)!.definicao;
  const definicaoNumero = t.base === 'carteira_atual'
    ? `${rotuloBase(t.base)}: ${def}.`
    : `${rotuloBase(t.base)}: ${def}, ${r.incluirComunidade ? 'com' : 'sem'} a Comunidade.`;

  let variacao = '';
  if (!t.emAndamento) {
    const d = t.totalMes - t.totalMesAnterior;
    const ant = rotuloMesLongo(mesAnteriorDe(ref));
    variacao = d === 0 ? `Igual a ${ant}` : `${Math.abs(d)} a ${d > 0 ? 'mais' : 'menos'} que em ${ant}`;
  }

  const motivoRotulo = t.motivoTop ? t.motivoTop.rotulo : 'Sem churn no mês';
  const motivoFracao = t.motivoTop ? `${t.motivoTop.qtd} de ${t.totalMes}` : '';

  let notaRecorde = '';
  const quem = `neste filtro (${rotuloBase(t.base).toLowerCase()})`;
  if (r.granularidade === 'semana') {
    const s = t.recordeSemanal;
    if (s && s.valor > 0) {
      notaRecorde = `Recorde semanal ${quem}: ${s.valor} na semana ${s.semana} de ${rotuloMesLongo(s.mes.slice(0, 7))}${s.emAndamento ? ', em andamento' : ''}.`;
    }
  } else {
    const m = t.recordeMensal;
    if (m && m.valor > 0) {
      notaRecorde = m.mes.slice(0, 7) === ref
        ? `Este mês é o recorde histórico ${quem}: ${m.valor} churns${m.emAndamento ? ', em andamento' : ''}.`
        : `Recorde histórico ${quem}: ${m.valor} em ${rotuloMesLongo(m.mes.slice(0, 7))}${m.emAndamento ? ', em andamento' : ''}.`;
    }
  }

  let avisoCarteira: string | null = null;
  if (t.base === 'carteira_atual' && t.primeiroMesCarteira) {
    const primeiro = t.primeiroMesCarteira.slice(0, 7);
    const inicioJanela = r.granularidade === 'semana' ? ref : r.inicio.slice(0, 7);
    if (inicioJanela < primeiro) avisoCarteira = `Antes de ${rotuloMesCurto(t.primeiroMesCarteira)} a carteira era de outros CS.`;
  }

  const c = t.comunidade;
  const n = (v: number) => `${v} churn${v === 1 ? '' : 's'}`;
  const linhaComunidade = c.incluida
    ? `Comunidade incluída nesta conta: ${n(c.totalMes)} em ${mesRef}.`
    : `Fora desta conta: Comunidade, ${n(c.totalMes)} em ${mesRef}.`;
  const linkLista = `Ver os ${t.totalMes} churns ${t.emAndamento ? 'deste mês até hoje' : 'deste mês'}`;
  return { rotuloNumero, definicaoNumero, variacao, motivoRotulo, motivoFracao, notaRecorde, avisoCarteira, linhaComunidade, linkLista };
}

// ordem fixa da paleta (a cor segue o motivo, nunca o ranking), motivo desconhecido no fim
function ordenarMotivos(totais: Record<string, number>, total: number) {
  const ordem = (k: string) => {
    const i = MOTIVOS.findIndex((m) => m.chave === k);
    return i === -1 ? 999 : i;
  };
  return Object.keys(totais)
    .sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b))
    .map((k) => ({ ...infoMotivo(k), qtd: totais[k], pct: total ? Math.round((totais[k] / total) * 1000) / 10 : 0 }));
}

// ============ gráfico (componente único, SVG gerado no servidor) ============
// Barras empilhadas por motivo, uma barra por período. O mesmo componente atende mês e semana
// (parâmetro vem na própria série) e é usado tanto na aba Churn quanto no relatório impresso.
// Tooltip nativo via <title> em cada segmento (contagem e percentual do período), total escrito
// acima de cada barra, eixo e grade recessivos, 2px de respiro entre segmentos.

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
export { esc as escHtml };

function pctTexto(v: number, total: number) {
  return total ? `${(Math.round((v / total) * 1000) / 10).toString().replace('.', ',')}%` : '0%';
}

function passoEixo(max: number) {
  if (max <= 5) return 1;
  const bruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

export function graficoChurnSVG(serie: SerieChurn, idPrefixo = 'churn', destaqueInicio: string | null = null): string {
  const W = 720, H = 280, padL = 34, padR = 8, padT = 22, padB = 30;
  const n = serie.periodos.length || 1;
  const maxTotal = Math.max(1, ...serie.periodos.map((p) => p.total));
  const passo = passoEixo(maxTotal);
  const topo = Math.ceil(maxTotal / passo) * passo;
  const areaH = H - padT - padB;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(56, slot * 0.62);
  const y = (v: number) => padT + areaH - (v / topo) * areaH;
  const hachuraId = `${idPrefixo}Hachura`;

  let grade = '';
  for (let v = 0; v <= topo; v += passo) {
    grade += `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E9E9E9" stroke-width="1"/>`
      + `<text x="${padL - 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="10" fill="#9F9F9F" text-anchor="end" font-family="Inter,sans-serif">${v}</text>`;
  }

  const ordem = serie.porMotivo.map((m) => m.chave);
  let barras = '';
  serie.periodos.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const x = cx - bw / 2;
    let acumulado = 0;
    const chaves = ordem.filter((k) => p.porMotivo[k]);
    chaves.forEach((k, idx) => {
      const v = p.porMotivo[k];
      const y0 = y(acumulado), y1 = y(acumulado + v);
      acumulado += v;
      const alturaBruta = y0 - y1;
      const gap = idx < chaves.length - 1 ? 2 : 0;
      const h = Math.max(1, alturaBruta - gap);
      const topoSeg = y1 + gap;
      const info = infoMotivo(k);
      const fill = info.cor === 'hachura' ? `url(#${hachuraId})` : info.cor;
      const ultimo = idx === chaves.length - 1;
      const r = ultimo ? Math.min(4, h / 2, bw / 2) : 0;
      const d = ultimo
        ? `M${x.toFixed(1)},${(topoSeg + h).toFixed(1)} V${(topoSeg + r).toFixed(1)} Q${x.toFixed(1)},${topoSeg.toFixed(1)} ${(x + r).toFixed(1)},${topoSeg.toFixed(1)} H${(x + bw - r).toFixed(1)} Q${(x + bw).toFixed(1)},${topoSeg.toFixed(1)} ${(x + bw).toFixed(1)},${(topoSeg + r).toFixed(1)} V${(topoSeg + h).toFixed(1)} Z`
        : `M${x.toFixed(1)},${(topoSeg + h).toFixed(1)} V${topoSeg.toFixed(1)} H${(x + bw).toFixed(1)} V${(topoSeg + h).toFixed(1)} Z`;
      barras += `<g class="churn-seg"><title>${esc(p.rotuloLongo)}: ${esc(info.rotulo)}, ${v} churn${v === 1 ? '' : 's'} (${pctTexto(v, p.total)} do período)</title><path d="${d}" fill="${fill}"/></g>`;
    });
    // alvo de hover maior que a marca: coluna inteira com o total do período
    barras += `<g class="churn-col"><title>${esc(p.rotuloLongo)}: ${p.total} churn${p.total === 1 ? '' : 's'} no total</title>`
      + `<rect x="${(padL + slot * i).toFixed(1)}" y="${padT}" width="${slot.toFixed(1)}" height="${areaH}" fill="transparent"/></g>`;
    if (p.total > 0) {
      barras += `<text x="${cx.toFixed(1)}" y="${(y(p.total) - 6).toFixed(1)}" font-size="11" font-weight="700" fill="#1A1A1A" text-anchor="middle" font-family="Inter,sans-serif">${p.total}</text>`;
    }
    barras += `<text x="${cx.toFixed(1)}" y="${H - 10}" font-size="10.5" fill="#5D5D5D" text-anchor="middle" font-family="Inter,sans-serif">${esc(p.rotulo)}</text>`;
  });

  // Destaque do mês de referência: contorno âmbar em volta da coluna (o recorde virou nota de texto).
  let destaque = '';
  if (destaqueInicio) {
    const i = serie.periodos.findIndex((p) => p.inicio === destaqueInicio);
    if (i >= 0) {
      destaque = `<rect class="churn-destaque" x="${(padL + slot * i + 2).toFixed(1)}" y="${padT - 4}" width="${(slot - 4).toFixed(1)}" height="${(areaH + 6).toFixed(1)}" rx="8" fill="none" stroke="#C89A2E" stroke-width="2"/>`;
    }
  }

  const titulo = serie.granularidade === 'semana' ? 'Churn por semana do mês, por motivo' : 'Churn por mês, por motivo';
  return `<svg class="churn-grafico" role="img" aria-label="${esc(titulo)}, total ${serie.total}" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%;height:auto;">`
    + `<defs><pattern id="${hachuraId}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E9E9E9"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9F9F9F" stroke-width="2"/></pattern></defs>`
    + grade
    + `<line x1="${padL}" x2="${W - padR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#C6C4C4" stroke-width="1"/>`
    + destaque + barras + '</svg>';
}

// Legenda e tabela em HTML (a legenda é sempre presente com 2 ou mais séries; a tabela é a via
// acessível exigida pelo contraste baixo de algumas cores).
export function amostraCorHTML(cor: string): string {
  const estilo = cor === 'hachura'
    ? 'background:repeating-linear-gradient(45deg,#E9E9E9 0 3px,#9F9F9F 3px 5px);'
    : `background:${cor};`;
  return `<span class="churn-amostra" style="display:inline-block;width:10px;height:10px;border-radius:3px;flex-shrink:0;${estilo}"></span>`;
}

export function tabelaMotivosHTML(serie: SerieChurn): string {
  if (!serie.total) return '';
  const linhas = serie.porMotivo.map((m) =>
    `<tr><td><span style="display:inline-flex;align-items:center;gap:8px;">${amostraCorHTML(m.cor)}${esc(m.rotulo)}</span></td>`
    + `<td class="num">${m.qtd}</td><td class="num">${String(m.pct).replace('.', ',')}%</td></tr>`).join('');
  return `<table class="churn-tabela"><thead><tr><th>Motivo</th><th class="num">Churns</th><th class="num">Participação</th></tr></thead>`
    + `<tbody>${linhas}<tr class="churn-total"><td>Total</td><td class="num">${serie.total}</td><td class="num">100%</td></tr></tbody></table>`;
}

// ============ opções de filtro ============

export interface OpcoesFiltro {
  // Só CS ativos. Ex CS nunca aparecem por pessoa, só na opção agregada em `categorias`.
  cs: { valor: string; qtd: number }[];
  categorias: { chave: CategoriaCs; rotulo: string; qtd: number }[];
  // Produtos reais do Monday (sem a Comunidade), na ordem fixa, e a Comunidade à parte.
  produtos: { valor: string; rotulo: string; qtd: number }[];
  comunidade: { valor: string; rotulo: string; qtd: number };
}

export async function buscarOpcoesFiltro(supabase: SupabaseClient): Promise<OpcoesFiltro> {
  const [{ data, error }, { data: ativos, error: erroAtivos }] = await Promise.all([
    supabase.from('churn_items').select('quem_e_seu_cs, cs_categoria, produto_normalizado, eh_comunidade'),
    supabase.from('cs_config').select('nome').eq('ativo', true),
  ]);
  if (error) throw new Error('opções de churn: ' + error.message);
  if (erroAtivos) throw new Error('cs ativos: ' + erroAtivos.message);
  const nomesAtivos = new Set(((ativos || []) as { nome: string }[]).map((c) => c.nome.toLowerCase()));
  const cs = new Map<string, number>();
  const produtos = new Map<string, number>();
  let comunidade = 0;
  let exCs = 0;
  for (const r of (data || []) as any[]) {
    if (r.cs_categoria === 'cs_ex') exCs++;
    if (r.quem_e_seu_cs && nomesAtivos.has(String(r.quem_e_seu_cs).toLowerCase())) {
      cs.set(r.quem_e_seu_cs, (cs.get(r.quem_e_seu_cs) || 0) + 1);
    }
    if (r.eh_comunidade) { comunidade++; continue; }
    produtos.set(r.produto_normalizado, (produtos.get(r.produto_normalizado) || 0) + 1);
  }
  const ordem = (k: string) => { const i = PRODUTOS_ORDEM.indexOf(k); return i === -1 ? 999 : i; };
  const chavesProduto = [...new Set([...PRODUTOS_ORDEM, ...produtos.keys()])].sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b));
  return {
    cs: [...cs.entries()].map(([valor, qtd]) => ({ valor, qtd })).sort((a, b) => a.valor.localeCompare(b.valor)),
    categorias: exCs ? [{ chave: 'cs_ex' as CategoriaCs, rotulo: 'Ex CS', qtd: exCs }] : [],
    produtos: chavesProduto.map((valor) => ({ valor, rotulo: rotuloProduto(valor), qtd: produtos.get(valor) || 0 })),
    comunidade: { valor: 'Comunidade', rotulo: 'Comunidade', qtd: comunidade },
  };
}

// Recusa filtro por pessoa que não seja CS ativo. Ex CS só existem como a categoria agregada.
export async function validarCsAtivo(supabase: SupabaseClient, r: Recorte): Promise<void> {
  if (!r.cs) return;
  const { data, error } = await supabase.from('cs_config').select('nome').eq('ativo', true);
  if (error) throw new Error('cs ativos: ' + error.message);
  const ok = ((data || []) as { nome: string }[]).some((c) => c.nome.toLowerCase() === r.cs!.toLowerCase());
  if (!ok) throw new RecorteInvalido('Escolha um CS ativo. O histórico de ex CS está na opção agregada Ex CS.');
}

// ============ recordes calculados (mecanismo único: indicador_recordes no banco) ============

export interface RecordeIndicador {
  indicador: string;
  rotulo?: string;
  meta: number | null;
  mensal: { valor: number; mes: string; emAndamento: boolean; empates: number } | null;
  semanal: { valor: number; mes: string; semana: number; emAndamento: boolean } | null;
  valorMesCorrente: number | null;
  diferenca: number | null;
  historicoDesde: string | null;
  calculadoEm: string | null;
}

function mapearRecorde(l: any): RecordeIndicador {
  const num = (v: any) => (v === null || v === undefined ? null : Number(v));
  return {
    indicador: l.indicador, rotulo: l.rotulo, meta: num(l.meta),
    mensal: l.recorde_mensal_valor === null || l.recorde_mensal_valor === undefined ? null
      : { valor: Number(l.recorde_mensal_valor), mes: l.recorde_mensal_mes, emAndamento: !!l.recorde_mensal_em_andamento, empates: l.meses_no_recorde ?? 1 },
    semanal: l.recorde_semanal_valor === null || l.recorde_semanal_valor === undefined ? null
      : { valor: Number(l.recorde_semanal_valor), mes: l.recorde_semanal_mes, semana: l.recorde_semanal_semana, emAndamento: !!l.recorde_semanal_em_andamento },
    valorMesCorrente: num(l.valor_mes_corrente), diferenca: num(l.diferenca_mensal),
    historicoDesde: l.historico_desde ?? null, calculadoEm: l.calculado_em ?? null,
  };
}

export async function buscarPainelRecordes(supabase: SupabaseClient, cs: string | null): Promise<RecordeIndicador[]> {
  const { data, error } = await supabase.rpc('recordes_painel', { p_cs: cs });
  if (error) throw new Error('recordes_painel: ' + error.message);
  return ((data || []) as any[]).map(mapearRecorde);
}

export function rotuloMesCurto(isoData: string): string {
  const [a, m] = isoData.split('-').map(Number);
  return `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`;
}

export interface ItemChurn {
  id: number;
  data_referencia: string;
  quem_e_seu_cs: string | null;
  cs_categoria: string | null;
  produto: string | null;
  motivo_principal: string;
  membro_nome: string | null;
  empresa: string | null;
  explicacao: string | null;
  expectativa_nao_atendida: string | null;
  sugestao_melhoria: string | null;
  nota_retorno: number | null;
  dentro: boolean;
  etiqueta: string | null;
}

// Itens do intervalo do recorte. Por padrão só os que fazem parte da base e do filtro (os N churns
// do número grande); com apenasDentro falso devolve também quem ficou de fora, com a etiqueta do
// motivo (Comunidade, Ex CS, Sem CS ou Fora do filtro), para a lista de auditoria.
export async function buscarItens(
  supabase: SupabaseClient, r: Recorte, opcoes: { inicio?: string; fim?: string; apenasDentro?: boolean } = {},
): Promise<ItemChurn[]> {
  const { data, error } = await supabase.rpc('churn_itens_recorte', argsFiltro({ ...r, inicio: opcoes.inicio ?? r.inicio, fim: opcoes.fim ?? r.fim }));
  if (error) throw new Error('churn_itens_recorte: ' + error.message);
  const itens = (data || []) as ItemChurn[];
  return opcoes.apenasDentro === false ? itens : itens.filter((i) => i.dentro);
}

// Intervalo do mês de referência, para a lista de auditoria.
export function intervaloDoMes(referencia: string): { inicio: string; fim: string } {
  const [ano, mes] = referencia.split('-').map(Number);
  return { inicio: `${ano}-${pad2(mes)}-01`, fim: `${ano}-${pad2(mes)}-${pad2(ultimoDia(ano, mes))}` };
}

export async function buscarTermosIdentificaveis(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc('churn_termos_identificaveis');
  if (error) throw new Error('churn_termos_identificaveis: ' + error.message);
  return ((data || []) as { termo: string }[]).map((t) => t.termo);
}

const MARCA_OMITIDA = '[identificação omitida]';

// Achado na validação de 30/09/2026: há empresas cadastradas no formulário como uma palavra
// genérica (ex.: "ANÁLISE"), e anonimizar essa palavra apagava "análise" do texto do próprio
// gestor. Termo de UMA palavra que seja vocabulário genérico de negócio não identifica ninguém e
// não é removido. Nomes de pessoa e razões sociais com mais de uma palavra nunca entram aqui.
const TERMOS_GENERICOS = new Set([
  'analise', 'analises', 'empresa', 'empresas', 'consultoria', 'consultorias', 'grupo', 'holding', 'servicos',
  'moai', 'brasil', 'brasilia', 'gestao', 'saude', 'educacao', 'tecnologia', 'engenharia', 'advocacia',
  'construtora', 'comercio', 'industria', 'investimentos', 'participacoes', 'negocios', 'solucoes',
  'marketing', 'financeiro', 'financeira', 'juridico', 'clinica', 'escritorio', 'nenhuma', 'nenhum',
  'autonomo', 'autonoma', 'particular', 'propria', 'proprio', 'diversos', 'varios', 'churn', 'membro', 'conselho',
]);
function ehTermoGenerico(termo: string): boolean {
  if (/\s/.test(termo)) return false;
  return TERMOS_GENERICOS.has(termo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
}

// Troca todo nome de membro e empresa conhecido por uma marca neutra, sem diferenciar maiúscula e
// minúscula e só em palavra inteira (um membro "Ana" não pode apagar metade de "planejamento").
// Termos mais longos primeiro, para "Maria Silva" não virar "[..] Silva" por causa de um termo
// "Maria" de outro membro. Termos com menos de 3 letras são ignorados (falso positivo demais).
export function anonimizar(texto: string | null | undefined, termos: string[]): string {
  let t = String(texto ?? '');
  const ordenados = [...new Set(termos.map((x) => x.trim()).filter((x) => x.length >= 3 && !ehTermoGenerico(x)))]
    .sort((a, b) => b.length - a.length);
  for (const termo of ordenados) {
    const corpo = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${corpo}(?![\\p{L}\\p{N}])`, 'giu');
    t = t.replace(re, MARCA_OMITIDA);
  }
  return t;
}

// ============ resposta da tela (usada pela rota e pelos testes) ============

// Pedidos de melhoria por motivo do mês (revisão out/2026, K4): quantos churns, até 3 trechos do que a
// pessoa sugeriu (anonimizados), a ação sugerida e os ids dos churns de origem para a melhoria.
export function agruparPedidosMelhoria(itens: ItemChurn[], termos: string[]) {
  const grupos = new Map<string, { chave: string; rotulo: string; acao: string; qtd: number; ids: number[]; trechos: string[] }>();
  itens.forEach((i) => {
    const chave = i.motivo_principal;
    if (!grupos.has(chave)) grupos.set(chave, { chave, rotulo: infoMotivo(chave).rotulo, acao: acaoParaMotivo(chave), qtd: 0, ids: [], trechos: [] });
    const g = grupos.get(chave)!;
    g.qtd++;
    g.ids.push(i.id);
    const texto = (i.sugestao_melhoria || '').trim();
    if (texto && g.trechos.length < 3 && !g.trechos.includes(texto)) g.trechos.push(anonimizar(texto, termos));
  });
  return Array.from(grupos.values()).sort((a, b) => b.qtd - a.qtd || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

export async function respostaTela(supabase: SupabaseClient, recorte: Recorte) {
  await validarCsAtivo(supabase, recorte);
  const [tela, opcoes] = await Promise.all([
    buscarTela(supabase, recorte),
    buscarOpcoesFiltro(supabase),
  ]);
  const textos = textosTela(tela, recorte);
  // Situação do mês e motivos com o mês anterior (K1 e K3), e pedidos de melhoria por motivo (K4).
  // A série é sempre mensal, mesmo quando a tela está em semanas.
  const serieMensal = await buscarSerie(supabase, recorte, 'mes');
  const refInicio = `${tela.referencia}-01`;
  const ultimos6 = serieMensal.periodos.filter((p) => p.inicio < refInicio).slice(-6);
  const periodoDoMes = (mes: string) => serieMensal.periodos.find((p) => p.inicio.slice(0, 7) === mes);
  const pAtual = periodoDoMes(tela.referencia);
  const pAnterior = periodoDoMes(mesAnteriorDe(tela.referencia));
  const chavesMotivo = Array.from(new Set([...Object.keys(pAtual?.porMotivo ?? {}), ...Object.keys(pAnterior?.porMotivo ?? {})]));
  const motivosMes = chavesMotivo
    .map((chave) => ({ chave, rotulo: infoMotivo(chave).rotulo, atual: pAtual?.porMotivo[chave] ?? 0, anterior: pAnterior?.porMotivo[chave] ?? 0 }))
    .sort((a, b) => b.atual - a.atual || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  const situacao = {
    churnsMes: tela.totalMes,
    churnsMesAnterior: tela.totalMesAnterior,
    mediaSeisMeses: ultimos6.length ? Math.round((ultimos6.reduce((s, p) => s + p.total, 0) / ultimos6.length) * 10) / 10 : null,
    mesesNaMedia: ultimos6.length,
  };
  const { inicio, fim } = intervaloDoMes(tela.referencia);
  const itensMes = await buscarItens(supabase, recorte, { inicio, fim, apenasDentro: true });
  const termos = await buscarTermosIdentificaveis(supabase);
  const pedidosMelhoria = agruparPedidosMelhoria(itensMes, termos);
  return {
    situacao,
    motivosMes,
    pedidosMelhoria,
    recorte,
    descricao: descreverRecorte(recorte),
    query: recorteParaQuery(recorte),
    bases: BASES_CHURN,
    referencia: tela.referencia,
    emAndamento: tela.emAndamento,
    totalMes: tela.totalMes,
    textos,
    comunidade: { incluida: tela.comunidade.incluida, totalMes: tela.comunidade.totalMes, porMotivo: tela.comunidade.porMotivo.map((m) => ({ ...m, amostra: amostraCorHTML(m.cor) })) },
    legenda: tela.serie.porMotivo.map((m) => ({ ...m, amostra: amostraCorHTML(m.cor) })),
    graficoSvg: graficoChurnSVG(tela.serie, 'churnAba', recorte.granularidade === 'mes' ? `${tela.referencia}-01` : null),
    temDados: tela.serie.total > 0,
    somaSerieMes: tela.serie.periodos.filter((p) => p.inicio.slice(0, 7) === tela.referencia).reduce((t, p) => t + p.total, 0),
    opcoes,
  };
}

// Lista de auditoria do mês de referência: os churns que compõem o número do mês (dentro) e, à parte,
// os que ficaram de fora com a etiqueta do motivo. Mesmo filtro e mesma base da tela.
export interface LinhaLista {
  id: number; data: string; membro: string; empresa: string; produto: string; cs: string;
  motivo: string; nota: number | null; dentro: boolean; etiqueta: string | null;
}
export async function listaAuditoria(supabase: SupabaseClient, recorte: Recorte) {
  await validarCsAtivo(supabase, recorte);
  const { inicio, fim } = intervaloDoMes(recorte.referencia);
  const itens = await buscarItens(supabase, recorte, { inicio, fim, apenasDentro: false });
  const linhas: LinhaLista[] = itens.map((i) => ({
    id: i.id, data: dataBR(i.data_referencia), membro: i.membro_nome || '', empresa: i.empresa || '',
    produto: i.produto ? rotuloProduto(i.produto) : 'Sem produto informado', cs: i.quem_e_seu_cs || '',
    motivo: infoMotivo(i.motivo_principal).rotulo, nota: i.nota_retorno ?? null,
    dentro: i.dentro, etiqueta: i.etiqueta,
  }));
  return { referencia: recorte.referencia, rotuloMes: rotuloMesLongo(recorte.referencia), linhas };
}
