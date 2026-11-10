// Extração de entidades do Vitorio 2 (30/10/2026): dicionário montado a partir do banco (CS, conselhos, membros, indicadores,
// produtos, tipos de advertência) e correspondência por texto exato e por trigramas, com desambiguação. Funções puras: o
// carregamento do banco está em lib/vitorio/dicionario-dados.ts.
import { NIVEL_ORDEM } from '../constants.ts';
import { normalizar } from './busca.ts';
import { extrairPeriodo } from './periodo.ts';
import type { Entidade, Entidades, TipoEntidade } from './tipos.ts';

export type Entrada = { tipo: TipoEntidade; id: string; rotulo: string; chaves: string[]; grupos?: string[] };
export type FontesDicionario = {
  cs: { nome: string; nomeCompleto?: string | null; apelido?: string | null; aliases?: string[] }[];
  conselhos: { groupId: string; titulo: string }[];
  membros: { nome: string; groupId?: string }[];
  aliasesMembros?: { membro: string; nomeAta: string }[];
  indicadores: { chave: string; rotulo: string }[];
  advertencias: { codigo: string; nome: string }[];
};
export type Dicionario = { entradas: Entrada[]; porChave: Map<string, Entrada[]>; vocabulario: Set<string> };

// Como as pessoas falam de cada indicador do catálogo (indicadores_catalogo.chave).
export const SINONIMOS_INDICADOR: Record<string, string[]> = {
  cases: ['cases de sucesso', 'case de sucesso', 'cases', 'case'],
  matchmakings: ['matchmakings', 'matchmaking', 'matches', 'conexoes'],
  rounds: ['rounds', 'round', 'rodadas'],
  indicacoes: ['indicacoes', 'indicacao'],
  upsell: ['upsell', 'upsells', 'upgrade', 'upgrades'],
  downsell: ['downsell', 'downsells', 'downgrade'],
  churn: ['churn', 'churns', 'cancelamentos', 'saidas'],
  revenue_churn: ['revenue churn', 'receita perdida', 'churn de receita'],
  carteira: ['carteira', 'tamanho da carteira'],
  presenca: ['presenca', 'frequencia', 'taxa de presenca'],
  suspensoes: ['suspensoes', 'suspensao'],
  critico: ['criticos', 'membros criticos', 'critico'],
  health_base: ['health da base', 'health', 'saude da base'],
};

const PRODUTOS = [...NIVEL_ORDEM];
const PRIMEIRA_PESSOA = new Set(['eu', 'meu', 'minha', 'meus', 'minhas', 'mim', 'comigo', 'estou', 'tenho', 'sou']);
// Palavras que também são nomes mas aqui são só fala comum: nunca viram entidade sozinhas.
const COMUNS = new Set(['novo', 'nova', 'grupo', 'quem', 'como', 'qual', 'quais', 'quando', 'onde', 'para', 'tudo', 'time', 'area', 'mais', 'fast', 'track', 'level', 'alta', 'alto', 'sobre', 'esse', 'essa', 'este', 'esta', 'bom', 'boa', 'dia', 'tarde', 'noite']);

function chavesNome(...partes: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  partes.forEach((p) => { if (p) { const n = normalizar(p); if (n.length >= 3) out.add(n); } });
  return [...out];
}

export function parseTitulo(titulo: string): { nivel: string; contato: string; cs: string | null } | null {
  const m = /^(.+?)\s*\|\s*(.+?)\s*(?:\(([^)]+)\))?\s*$/.exec(titulo || '');
  return m ? { nivel: m[1].trim(), contato: m[2].trim(), cs: m[3] ? m[3].trim() : null } : null;
}

export function montarDicionario(f: FontesDicionario): Dicionario {
  const entradas: Entrada[] = [];
  f.cs.forEach((c) => entradas.push({ tipo: 'cs', id: c.nome, rotulo: c.nome, chaves: chavesNome(c.nome, c.nomeCompleto, c.apelido, ...(c.aliases || []), (c.nomeCompleto || '').split(' ')[0]) }));
  f.conselhos.forEach((g) => {
    const t = parseTitulo(g.titulo);
    // o contato inteiro, o primeiro nome (as pessoas dizem 'o conselho da Renata') e o título completo
    const chaves = t ? chavesNome(t.contato, t.contato.split(' ')[0].length >= 4 ? t.contato.split(' ')[0] : null, t.nivel + ' ' + t.contato, g.titulo) : chavesNome(g.titulo);
    entradas.push({ tipo: 'conselho', id: g.groupId, rotulo: g.titulo, chaves });
  });
  const aliases = new Map<string, string[]>();
  (f.aliasesMembros || []).forEach((a) => aliases.set(a.membro, [...(aliases.get(a.membro) || []), a.nomeAta]));
  const porMembro = new Map<string, Entrada>();
  f.membros.forEach((m) => {
    const ja = porMembro.get(m.nome);
    if (ja) { if (m.groupId) ja.grupos!.push(m.groupId); return; }
    const primeiro = m.nome.split(' ')[0];
    const en: Entrada = { tipo: 'membro', id: m.nome, rotulo: m.nome, chaves: chavesNome(m.nome, ...(aliases.get(m.nome) || []), primeiro.length >= 4 ? primeiro : null), grupos: m.groupId ? [m.groupId] : [] };
    porMembro.set(m.nome, en); entradas.push(en);
  });
  f.indicadores.forEach((i) => entradas.push({ tipo: 'indicador', id: i.chave, rotulo: i.rotulo, chaves: chavesNome(i.rotulo, i.chave.replace(/_/g, ' '), ...(SINONIMOS_INDICADOR[i.chave] || [])) }));
  PRODUTOS.forEach((p) => entradas.push({ tipo: 'produto', id: p, rotulo: p, chaves: chavesNome(p, p.replace('-', ' ').replace('+', ' plus')) }));
  f.advertencias.forEach((a) => entradas.push({ tipo: 'advertencia', id: a.codigo, rotulo: a.nome, chaves: chavesNome(a.nome) }));
  const porChave = new Map<string, Entrada[]>();
  const vocabulario = new Set<string>();
  entradas.forEach((e) => e.chaves.forEach((k) => {
    if (COMUNS.has(k)) return;
    porChave.set(k, [...(porChave.get(k) || []), e]);
    k.split(' ').forEach((w) => vocabulario.add(w));
  }));
  return { entradas, porChave, vocabulario };
}

function trigramas(w: string): Set<string> {
  const s = '  ' + w + ' ', out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) out.add(s.substr(i, 3));
  return out;
}
export function jaccard(a: string, b: string): number {
  const x = trigramas(a), y = trigramas(b);
  let c = 0; x.forEach((g) => { if (y.has(g)) c++; });
  return c / (x.size + y.size - c);
}

// Corrige cada termo fora do vocabulário pelo termo mais próximo por trigramas (mesma inicial, similaridade mínima).
export function corrigirTermos(norm: string, vocabulario: Set<string>, minimo = 0.55): string {
  const lista = [...vocabulario];
  return norm.split(' ').map((t) => {
    if (t.length < 5 || vocabulario.has(t) || /\d/.test(t)) return t;
    let melhor = t, s = minimo;
    for (const v of lista) {
      if (v[0] !== t[0] || Math.abs(v.length - t.length) > 2) continue;
      const j = jaccard(t, v);
      if (j > s) { s = j; melhor = v; }
    }
    return melhor;
  }).join(' ');
}

const LIMIAR_NOME = 0.62; // trigramas: nomes pedem mais semelhança que palavras comuns, para não trocar um nome por outro

// Extrai entidades e devolve o texto mascarado (marcador z<tipo> no lugar de cada trecho reconhecido) para a classificação.
export function extrair(textoNormalizado: string, dic: Dicionario, hoje: string): { entidades: Entidades; mascarado: string } {
  const ent: Entidades = { ambiguas: [] };
  let q = textoNormalizado;
  const p = extrairPeriodo(q, hoje);
  if (p) { ent.periodo = p.periodo; q = (' ' + q + ' ').replace(' ' + p.texto + ' ', ' zperiodo ').trim(); }
  const tokens = q.split(' ');
  ent.eu = tokens.some((t) => PRIMEIRA_PESSOA.has(t)) && !tokens.some((t) => t === 'voce' || t === 'vc');
  const consumido = new Array(tokens.length).fill(false);
  const achados: { i: number; n: number; entradas: Entrada[]; texto: string }[] = [];
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      if (consumido.slice(i, i + n).some(Boolean)) continue;
      const cand = tokens.slice(i, i + n).join(' ');
      if (cand === 'zperiodo' || cand.length < 3) continue;
      let es = dic.porChave.get(cand);
      if (!es && cand.length >= 5 && !COMUNS.has(cand) && !/\d/.test(cand)) {
        let melhor = LIMIAR_NOME, achada: Entrada[] | undefined;
        dic.porChave.forEach((v, k) => {
          if (k.split(' ').length !== n || Math.abs(k.length - cand.length) > 3 || k[0] !== cand[0]) return;
          const j = jaccard(cand, k);
          if (j > melhor) { melhor = j; achada = v; }
        });
        es = achada;
      }
      if (!es) continue;
      achados.push({ i, n, entradas: es, texto: cand });
      for (let k = i; k < i + n; k++) consumido[k] = true;
    }
  }
  const temConselho = tokens.some((t) => t === 'conselho' || t === 'conselhos' || t === 'grupo'), temMembro = tokens.some((t) => t === 'membro' || t === 'membros');
  const marca: Record<number, string> = {};
  achados.sort((a, b) => a.i - b.i).forEach((a) => {
    // mesma grafia em tipos diferentes (contato de conselho e membro): o contexto decide, e na dúvida vale o conselho
    const tipos = [...new Set(a.entradas.map((e) => e.tipo))];
    let tipo: TipoEntidade = tipos[0];
    if (tipos.length > 1) tipo = temMembro && tipos.includes('membro') ? 'membro' : temConselho && tipos.includes('conselho') ? 'conselho' : (['cs', 'indicador', 'produto', 'conselho', 'membro', 'advertencia'] as TipoEntidade[]).find((t) => tipos.includes(t))!;
    const dist = new Map<string, Entrada>();
    a.entradas.filter((e) => e.tipo === tipo).forEach((e) => dist.set(e.id, e));
    const opcoes = [...dist.values()];
    const ja = (ent as any)[tipo];
    if (opcoes.length === 1) {
      if (!ja) (ent as any)[tipo] = { tipo, id: opcoes[0].id, rotulo: opcoes[0].rotulo } as Entidade;
      marca[a.i] = 'z' + tipo; for (let k = 1; k < a.n; k++) marca[a.i + k] = '';
    } else if (!ja) {
      ent.ambiguas.push({ tipo, texto: a.texto, opcoes: opcoes.slice(0, 8).map((e) => ({ tipo, id: e.id, rotulo: e.rotulo })) });
      marca[a.i] = 'z' + tipo; for (let k = 1; k < a.n; k++) marca[a.i + k] = '';
    }
  });
  const mascarado = tokens.map((t, i) => (i in marca ? marca[i] : t)).filter(Boolean).join(' ');
  return { entidades: ent, mascarado };
}
