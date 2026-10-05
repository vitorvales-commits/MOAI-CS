// Onda 1 do churn (pedido do Vitor, 30/09/2026): camada de dados, gráfico, anonimização e IA do
// churn na visão do gestor. Tudo que a aba Churn (app/gestor-html.ts), as rotas
// /api/gestor/churn* e o relatório imprimível (app/gestor/churn/relatorio) precisam passa por
// aqui, para existir uma regra só de recorte, de rótulo e de desenho.
//
// Regras que NÃO moram aqui, e sim no banco (supabase/migrations/20260930_churn_onda1.sql):
// semana do mês (semana_do_mes), data de referência (churn_items.data_referencia = data do
// Monday, senão o dia de criação do item), filtro do recorte (churn_filtrados) e classificação do
// CS (cs_categoria). O TypeScript só lê e desenha.
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  granularidade: Granularidade;
  referencia: string; // AAAA-MM
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
  cs: string | null;
  // Produtos marcados, sem a Comunidade. Nulo significa todos os produtos (padrão).
  produtos: string[] | null;
  // A Comunidade vem fora da conta por padrão e aparece à parte no bloco Comunidade.
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
function mesAtualBrasilia(): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === 'year')!.value;
  const mes = partes.find((p) => p.type === 'month')!.value;
  return `${ano}-${mes}`;
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
  const referencia = /^\d{4}-(0[1-9]|1[0-2])$/.test(refBruta) ? refBruta : mesAtualBrasilia();
  const anoRef = Number(referencia.slice(0, 4));
  if (anoRef < 2020 || anoRef > 2100) throw new RecorteInvalido('Mês de referência inválido.');
  const catBruta = textoFiltro(get('categoria'), 30);
  if (catBruta && !CATEGORIAS_CS.some((c) => c.chave === catBruta)) throw new RecorteInvalido('Categoria de CS inválida.');
  const { inicio, fim } = intervaloDaGranularidade(granularidade, referencia);
  const { produtos, comunidade } = lerProdutos(entrada);
  return {
    granularidade, referencia, inicio, fim,
    cs: textoFiltro(get('cs')),
    produtos,
    incluirComunidade: comunidade,
    csCategoria: (catBruta as CategoriaCs) || null,
  };
}

// Mesma seleção em forma de URL: a cópia do link reproduz a visão e o relatório herda o estado.
// produtos ausente = todos; produtos vazio = nenhum marcado; comunidade=1 = Comunidade na conta.
export function recorteParaQuery(r: Recorte): string {
  const p = new URLSearchParams({ granularidade: r.granularidade, ref: r.referencia });
  if (r.cs) p.set('cs', r.cs);
  if (r.produtos !== null) p.set('produtos', r.produtos.join(','));
  if (r.incluirComunidade) p.set('comunidade', '1');
  if (r.csCategoria) p.set('categoria', r.csCategoria);
  return p.toString();
}

// Chave que identifica a seleção de produtos em churn_analises.filtro_produto. Nula só para o recorte
// antigo (todos os produtos e Comunidade dentro), que é o que a coluna nula já significava.
export function chaveProdutos(r: Pick<Recorte, 'produtos' | 'incluirComunidade'>): string | null {
  if (r.produtos === null) return r.incluirComunidade ? null : 'todos_exceto_comunidade';
  const base = [...r.produtos].sort().join('|') || 'nenhum';
  return r.incluirComunidade ? `${base}|comunidade` : base;
}

function argsFiltro(r: Pick<Recorte, 'inicio' | 'fim' | 'cs' | 'produtos' | 'incluirComunidade' | 'csCategoria'>) {
  return {
    p_inicio: r.inicio, p_fim: r.fim, p_cs: r.cs, p_cs_categoria: r.csCategoria,
    p_produtos: r.produtos, p_incluir_comunidade: r.incluirComunidade,
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
  const partes: string[] = [];
  if (r.cs) partes.push(`CS ${r.cs}`);
  else if (r.csCategoria) partes.push(r.csCategoria === 'cs_ex' ? 'Ex CS' : CATEGORIAS_CS.find((c) => c.chave === r.csCategoria)!.rotulo);
  else partes.push('todos os CS');
  if (r.produtos === null) partes.push('todos os produtos');
  else if (r.produtos.length === 0) partes.push('nenhum produto marcado');
  else partes.push(`produtos ${r.produtos.map(rotuloProduto).join(', ')}`);
  partes.push(r.incluirComunidade ? 'Comunidade incluída na conta' : 'Comunidade fora da conta, apresentada à parte');
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

export async function buscarSerie(supabase: SupabaseClient, r: Recorte, granularidade: Granularidade = r.granularidade): Promise<SerieChurn> {
  const { inicio, fim } = intervaloDaGranularidade(granularidade, r.referencia);
  const { data, error } = await supabase.rpc('churn_serie', {
    p_granularidade: granularidade, ...argsFiltro({ ...r, inicio, fim }),
  });
  if (error) throw new Error('churn_serie: ' + error.message);
  const porChave = new Map<string, PeriodoSerie>();
  for (const row of (data || []) as any[]) {
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

export function graficoChurnSVG(serie: SerieChurn, idPrefixo = 'churn', referencia: ReferenciaRecorde | null = null): string {
  const W = 720, H = 280, padL = 34, padR = 8, padT = 22, padB = 30;
  const n = serie.periodos.length || 1;
  // a linha de recorte entra na escala, senão um recorde acima das barras ficaria fora do quadro
  const maxTotal = Math.max(1, referencia?.valor ?? 0, ...serie.periodos.map((p) => p.total));
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

  // Linha tracejada no valor do recorde, com selo de mês e valor. Vem por cima das barras e abaixo
  // do rótulo, com contorno branco no texto para continuar legível sobre qualquer cor.
  let linhaRecorde = '';
  if (referencia) {
    const yr = y(referencia.valor).toFixed(1);
    linhaRecorde = `<g class="churn-recorde"><title>${esc(referencia.texto)}</title>`
      + `<line x1="${padL}" x2="${W - padR}" y1="${yr}" y2="${yr}" stroke="#1A1A1A" stroke-width="1.4" stroke-dasharray="6 4"/>`
      + `<text x="${W - padR}" y="${(y(referencia.valor) - 5).toFixed(1)}" font-size="10.5" font-weight="700" fill="#1A1A1A" text-anchor="end" font-family="Inter,sans-serif" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">${esc(referencia.texto)}</text></g>`;
  }

  const titulo = serie.granularidade === 'semana' ? 'Churn por semana do mês, por motivo' : 'Churn por mês, por motivo';
  return `<svg class="churn-grafico" role="img" aria-label="${esc(titulo)}, total ${serie.total}${referencia ? ', ' + esc(referencia.texto) : ''}" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%;height:auto;">`
    + `<defs><pattern id="${hachuraId}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E9E9E9"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9F9F9F" stroke-width="2"/></pattern></defs>`
    + grade
    + `<line x1="${padL}" x2="${W - padR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#C6C4C4" stroke-width="1"/>`
    + barras + linhaRecorde + '</svg>';
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

// ============ bloco Comunidade (fora da conta principal, sempre visível) ============

export interface ResumoComunidade {
  incluida: boolean;
  total: number;
  totalRecorte: number;
  pct: number;
  periodos: { rotulo: string; rotuloLongo: string; qtd: number }[];
  porMotivo: { chave: string; rotulo: string; cor: string; qtd: number; pct: number }[];
}

export async function buscarComunidade(supabase: SupabaseClient, r: Recorte): Promise<ResumoComunidade> {
  // mesmo intervalo do gráfico, independente do filtro de produto e de CS
  const { data, error } = await supabase.rpc('churn_comunidade_resumo', {
    p_granularidade: r.granularidade, p_inicio: r.inicio, p_fim: r.fim,
  });
  if (error) throw new Error('churn_comunidade_resumo: ' + error.message);
  const periodos = new Map<string, { rotulo: string; rotuloLongo: string; qtd: number }>();
  const motivos: Record<string, number> = {};
  let totalRecorte = 0;
  for (const row of (data || []) as any[]) {
    totalRecorte = row.total_recorte ?? totalRecorte;
    const chave = `${row.periodo_inicio}|${row.semana ?? ''}`;
    if (!periodos.has(chave)) {
      const [a, m] = String(row.periodo_inicio).split('-').map(Number);
      periodos.set(chave, {
        rotulo: row.semana ? `Semana ${row.semana}` : `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`,
        rotuloLongo: row.semana ? `Semana ${row.semana} (${dataBR(row.periodo_inicio)} a ${dataBR(row.periodo_fim)})` : rotuloMesLongo(`${a}-${pad2(m)}`),
        qtd: 0,
      });
    }
    if (row.motivo && row.qtd > 0) {
      periodos.get(chave)!.qtd += row.qtd;
      motivos[row.motivo] = (motivos[row.motivo] || 0) + row.qtd;
    }
  }
  const total = Object.values(motivos).reduce((s, v) => s + v, 0);
  return {
    incluida: r.incluirComunidade, total, totalRecorte,
    pct: totalRecorte ? Math.round((total / totalRecorte) * 1000) / 10 : 0,
    periodos: [...periodos.values()],
    porMotivo: ordenarMotivos(motivos, total),
  };
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

// Recorde de churn no MESMO recorte do gráfico (CS, categoria, produtos e Comunidade), calculado
// sobre o histórico inteiro, nunca sobre a janela exibida.
export async function buscarRecordeChurn(supabase: SupabaseClient, r: Recorte): Promise<RecordeIndicador> {
  const { data, error } = await supabase.rpc('indicador_recordes', {
    p_indicador: 'churn', p_cs: r.cs, p_motivo: null,
    p_produtos: r.produtos, p_incluir_comunidade: r.incluirComunidade, p_cs_categoria: r.csCategoria,
  });
  if (error) throw new Error('indicador_recordes: ' + error.message);
  return mapearRecorde(((data || []) as any[])[0] || { indicador: 'churn' });
}

export async function buscarPainelRecordes(supabase: SupabaseClient, cs: string | null): Promise<RecordeIndicador[]> {
  const { data, error } = await supabase.rpc('recordes_painel', { p_cs: cs });
  if (error) throw new Error('recordes_painel: ' + error.message);
  return ((data || []) as any[]).map(mapearRecorde);
}

// Linha de referência do gráfico: mensal no modo por mês, semanal no modo por semana do mês.
export interface ReferenciaRecorde { valor: number; texto: string }
export function referenciaDoGrafico(rec: RecordeIndicador | null, granularidade: Granularidade): ReferenciaRecorde | null {
  if (!rec) return null;
  if (granularidade === 'semana') {
    if (!rec.semanal || rec.semanal.valor <= 0) return null;
    const s = rec.semanal;
    return { valor: s.valor, texto: `Recorde semanal ${s.valor}, semana ${s.semana} de ${rotuloMesCurto(s.mes)}${s.emAndamento ? ', em andamento' : ''}` };
  }
  if (!rec.mensal || rec.mensal.valor <= 0) return null;
  return { valor: rec.mensal.valor, texto: `Recorde ${rec.mensal.valor} em ${rotuloMesCurto(rec.mensal.mes)}${rec.mensal.emAndamento ? ', em andamento' : ''}` };
}
export function rotuloMesCurto(isoData: string): string {
  const [a, m] = isoData.split('-').map(Number);
  return `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`;
}

// ============ análise salva ============

export interface AnaliseChurn {
  id: string;
  status: 'rascunho' | 'publicada';
  textoIa: string | null;
  textoGestor: string | null;
  baseHash: string | null;
  modeloIa: string | null;
  geradoEm: string | null;
  editadoPor: string | null;
  editadoEm: string | null;
}

export async function buscarAnalise(supabase: SupabaseClient, r: Recorte): Promise<AnaliseChurn | null> {
  let q = supabase.from('churn_analises')
    .select('id, status, texto_ia, texto_gestor, base_hash, modelo_ia, gerado_em, editado_por, editado_em')
    .eq('periodo_tipo', r.granularidade).eq('data_inicio', r.inicio).eq('data_fim', r.fim);
  q = r.cs ? q.eq('filtro_cs', r.cs) : q.is('filtro_cs', null);
  const chaveProd = chaveProdutos(r);
  q = chaveProd ? q.eq('filtro_produto', chaveProd) : q.is('filtro_produto', null);
  q = r.csCategoria ? q.eq('filtro_cs_categoria', r.csCategoria) : q.is('filtro_cs_categoria', null);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error('churn_analises: ' + error.message);
  if (!data) return null;
  return {
    id: data.id, status: data.status, textoIa: data.texto_ia, textoGestor: data.texto_gestor, baseHash: data.base_hash,
    modeloIa: data.modelo_ia, geradoEm: data.gerado_em, editadoPor: data.editado_por, editadoEm: data.editado_em,
  };
}

export async function buscarHashRecorte(supabase: SupabaseClient, r: Recorte): Promise<string> {
  const { data, error } = await supabase.rpc('churn_recorte_hash', argsFiltro(r));
  if (error) throw new Error('churn_recorte_hash: ' + error.message);
  return String(data || '');
}

export function argsRecorteEscrita(r: Recorte) {
  return {
    p_periodo_tipo: r.granularidade, p_inicio: r.inicio, p_fim: r.fim,
    p_filtro_cs: r.cs, p_filtro_produto: chaveProdutos(r), p_filtro_cs_categoria: r.csCategoria,
  };
}

// ============ itens identificáveis e anonimização (só gestor) ============

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
}

export async function buscarItens(supabase: SupabaseClient, r: Recorte): Promise<ItemChurn[]> {
  const { data, error } = await supabase.rpc('churn_itens_recorte', argsFiltro(r));
  if (error) throw new Error('churn_itens_recorte: ' + error.message);
  return (data || []) as ItemChurn[];
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

// ============ IA ============

export function iaDisponivel(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
}

const INSTRUCAO_IA = `Você é analista de retenção da MOAI, uma rede de conselhos estratégicos para empresários. Receberá os dados de churn de um recorte já filtrado pelo gestor e deve explicar por que os membros saíram.

Regras obrigatórias de escrita:
1. Escreva em português formal, em prosa corrida, com parágrafos. Não use listas, marcadores, títulos, negrito, itálico nem qualquer marcação.
2. Não use travessão nem hífen em nenhuma palavra ou pontuação. Reescreva a frase quando precisar.
3. Cite sempre as contagens reais que aparecem nos dados, com o total do recorte como referência.
4. Distinga com clareza o que é fato observado nos dados do que é hipótese sua, dizendo explicitamente quando algo é hipótese.
5. Nunca invente motivo, número, nome ou citação que não esteja nos dados.
6. Nunca mencione nome de membro nem de empresa. Os textos já chegam anonimizados; se aparecer a marca [identificação omitida], mantenha a omissão.
7. Encerre com recomendações práticas de retenção, ligadas aos motivos mais frequentes.
8. Tamanho entre 350 e 700 palavras.`;

function trecho(s: string | null, max = 400): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max) + '...' : t;
}

export function montarContextoIA(r: Recorte, serie: SerieChurn, itens: ItemChurn[], termos: string[]): string {
  const linhas: string[] = [];
  linhas.push(`Recorte: ${descreverRecorte(r)}.`);
  linhas.push(`Total de churns no recorte: ${serie.total}.`);
  linhas.push('');
  linhas.push('Contagem por motivo declarado:');
  serie.porMotivo.forEach((m) => linhas.push(`${m.rotulo}: ${m.qtd} (${String(m.pct).replace('.', ',')}%)`));
  linhas.push('');
  linhas.push(`Contagem por ${serie.granularidade === 'semana' ? 'semana do mês' : 'mês'}:`);
  serie.periodos.forEach((p) => linhas.push(`${p.rotuloLongo}: ${p.total}`));

  const contar = (f: (i: ItemChurn) => string) => {
    const m = new Map<string, number>();
    itens.forEach((i) => m.set(f(i), (m.get(f(i)) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  linhas.push('');
  linhas.push('Contagem por produto:');
  contar((i) => i.produto || 'não informado').forEach(([k, v]) => linhas.push(`${k}: ${v}`));
  linhas.push('');
  linhas.push('Contagem por CS responsável (equipe interna, não são membros):');
  contar((i) => `${i.quem_e_seu_cs || 'não informado'} (${CATEGORIAS_CS.find((c) => c.chave === i.cs_categoria)?.rotulo || 'sem classificação'})`)
    .forEach(([k, v]) => linhas.push(`${k}: ${v}`));

  const notas = itens.map((i) => i.nota_retorno).filter((n): n is number => n !== null && n !== undefined).map(Number);
  linhas.push('');
  if (notas.length) {
    const media = notas.reduce((s, v) => s + v, 0) / notas.length;
    const faixa = (a: number, b: number) => notas.filter((n) => n >= a && n <= b).length;
    linhas.push(`Nota de disposição para voltar à MOAI (0 a 10): ${notas.length} respostas, média ${media.toFixed(1).replace('.', ',')}; `
      + `${faixa(0, 6)} entre 0 e 6, ${faixa(7, 8)} entre 7 e 8, ${faixa(9, 10)} entre 9 e 10.`);
  } else {
    linhas.push('Nota de disposição para voltar à MOAI: nenhuma resposta no recorte.');
  }

  const blocoTextos = (titulo: string, campo: keyof ItemChurn, limite: number) => {
    const comTexto = itens.filter((i) => (i[campo] as string | null)?.trim());
    linhas.push('');
    linhas.push(`${titulo} (${comTexto.length} respostas${comTexto.length > limite ? `, mostrando ${limite}` : ''}):`);
    comTexto.slice(-limite).forEach((i) => {
      linhas.push(`[${infoMotivo(i.motivo_principal).rotulo}; ${i.produto || 'produto não informado'}] ${anonimizar(trecho(i[campo] as string), termos)}`);
    });
  };
  blocoTextos('Explicações dos membros sobre a saída', 'explicacao', 60);
  blocoTextos('Expectativas que não foram atendidas', 'expectativa_nao_atendida', 40);
  blocoTextos('Sugestões de melhoria para a rede', 'sugestao_melhoria', 30);
  return linhas.join('\n');
}

// A instrução já proíbe marcação e traço; esta limpeza é a garantia de que nada disso chega ao
// editor mesmo se o modelo escorregar.
export function limparTextoIA(texto: string): string {
  return texto
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/(\p{L})-(\p{L})/gu, '$1 $2')
    .replace(/\s+-\s+/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class IaRecusou extends Error {}

export async function gerarRascunhoIA(contexto: string): Promise<{ texto: string; modelo: string }> {
  const modelo = process.env.ANTHROPIC_MODEL!;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 80_000, maxRetries: 1 });
  const response = await client.messages.create({
    model: modelo,
    max_tokens: 16000,
    system: INSTRUCAO_IA,
    messages: [{ role: 'user', content: contexto }],
  });
  if (response.stop_reason === 'refusal') throw new IaRecusou('A IA recusou gerar o rascunho para este recorte.');
  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!texto) throw new Error('A IA não devolveu texto.');
  return { texto: limparTextoIA(texto), modelo };
}
