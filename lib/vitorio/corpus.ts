// Corpus do Vitorio (30/10/2026): monta os documentos indexáveis a partir de três fontes. Funções puras.
//  1. Processos publicados (FAQ, PROCESSOS, POPS, FLUXOS por atividade, MODELOS): aqui.
//  2. Registro de navegação: lib/vitorio/navegacao.ts.  3. Glossário dos indicadores: lib/vitorio/glossario.ts.
// A chave de cada documento é colecao:id e é a mesma usada em vitorio_perguntas_extras.
import type { DocVitorio } from './busca.ts';
import { normalizar } from './busca.ts';
import { NAVEGACAO_FIXA, navegacaoDoDock } from './navegacao.ts';
import { GLOSSARIO } from './glossario.ts';

export type Perfil = 'cs' | 'gestor';
type Mapa = Record<string, any>;

export function mapaDosDados(dados: { nome: string; tipo: string; valor?: unknown }[]): Mapa {
  const m: Mapa = {};
  (dados || []).forEach((c) => { if (c && c.tipo === 'valor') m[c.nome] = c.valor; });
  return m;
}

// Texto corrido de qualquer valor (string, lista ou objeto), sem HTML.
export function textoDe(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(textoDe).filter(Boolean).join('. ');
  if (typeof v === 'object') return Object.keys(v as object).map((k) => textoDe((v as Mapa)[k])).filter(Boolean).join('. ');
  return '';
}
const tira = (s: string) => s.replace(/\s+/g, ' ').trim();
export function slug(t: string): string { return normalizar(t).split(' ').slice(0, 8).join('-'); }

function dataBr(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function corpusProcessos(m: Mapa, publicadoEm: string | null): DocVitorio[] {
  const data = dataBr(publicadoEm);
  const docs: DocVitorio[] = [];
  const base = (colecao: DocVitorio['colecao'], id: string, d: Partial<DocVitorio>, origem: string, verbo: string): DocVitorio => ({
    chave: colecao + ':' + id, colecao, titulo: '', corpo: '', perguntas: [], palavras: [], destino: '/processos?item=' + encodeURIComponent(colecao + ':' + id),
    origem, verbo, data, ...d,
  });
  const vistos: Record<string, number> = {};
  const unico = (colecao: string, id: string) => { const k = colecao + ':' + id; vistos[k] = (vistos[k] || 0) + 1; return vistos[k] > 1 ? id + '-' + vistos[k] : id; };

  (m.FAQ || []).forEach((f: Mapa, i: number) => {
    if (!f || !f.q) return;
    docs.push(base('faq', unico('faq', slug(String(f.q))), {
      titulo: tira(String(f.q)), corpo: textoDe(f.a), perguntas: [tira(String(f.q))], palavras: [textoDe(f.cat)], alvo: 'cs/faq/' + i,
    }, 'Processos, Dúvidas gerais', 'Abrir a dúvida'));
  });
  (m.PROCESSOS || []).forEach((p: Mapa) => {
    if (!p || !p.id) return;
    const f0 = Array.isArray(p.fluxos) && p.fluxos[0];
    docs.push(base('processos', unico('processos', String(p.id)), {
      titulo: tira(String(p.nome || p.id)), corpo: textoDe(p.subs), alvo: f0 ? 'gestor/fluxos/' + f0 : 'gestor/arquitetura',
    }, 'Processos, Processo', 'Abrir o processo'));
  });
  (m.POPS || []).forEach((p: Mapa) => {
    if (!p || !p.id) return;
    const f0 = Array.isArray(p.fluxos) && p.fluxos[0];
    const termos = (p.termos || []).map((t: Mapa) => textoDe(t.termo) + ': ' + textoDe(t.sig));
    docs.push(base('pops', unico('pops', String(p.id)), {
      titulo: tira(String(p.nome || p.id)),
      corpo: textoDe([p.objetivo, (p.matriz || []).map((x: Mapa) => x.at), (p.regras || []).map((x: Mapa) => x.t), termos, p.observacoes]),
      palavras: [textoDe(p.cod), textoDe(p.setor)], alvo: f0 ? 'gestor/fluxos/' + f0 + '/pop' : 'gestor/arquitetura',
    }, 'Processos, POP', 'Abrir o POP'));
  });
  (m.FLUXOS || []).forEach((f: Mapa) => {
    if (!f || !f.id) return;
    const nos = (f.nodes || []).filter((n: Mapa) => n && n.txt);
    docs.push(base('fluxos', unico('fluxos', String(f.id)), {
      titulo: tira(String(f.nome || f.id)), corpo: textoDe([f.resumo, f.gatilho, nos.map((n: Mapa) => n.txt)]),
      palavras: [textoDe(f.busca), textoDe(f.cod)], alvo: 'gestor/fluxos/' + f.id,
    }, 'Processos, Fluxo', 'Abrir o fluxo'));
    nos.forEach((n: Mapa) => {
      // início e fim do fluxo (tipos s e e) repetem o título e só poluiriam a busca
      if (n.tipo === 's' || n.tipo === 'e') return;
      docs.push(base('fluxos', unico('fluxos', f.id + '.' + n.id), {
        titulo: tira(String(n.txt)), corpo: textoDe([n.txt, n.tarefas]), palavras: [textoDe(f.nome)], alvo: 'gestor/fluxos/' + f.id + '/' + n.id,
      }, 'Processos, Atividade do fluxo ' + tira(String(f.nome || f.id)), 'Abrir a atividade'));
    });
  });
  const corpos: Mapa = m.MODELO_CORPO || {};
  Object.keys(m.MODELOS || {}).forEach((id) => {
    const mo = m.MODELOS[id] || {};
    docs.push(base('modelos', unico('modelos', id), {
      titulo: tira(String(mo.nome || id)), corpo: textoDe([mo.tipo, mo.origem, String(corpos[id] || '').slice(0, 4000)]), alvo: 'mod:' + id,
    }, 'Processos, Modelo', 'Abrir o modelo'));
  });
  return docs;
}

export type ExtrasPerguntas = Record<string, string[]>;

// Corpus completo para um perfil. A navegação só traz páginas que o perfil enxerga; o glossário só traz definições
// com destino para o perfil ou sem destino nenhum.
export function montarCorpus(args: { dados: { nome: string; tipo: string; valor?: unknown }[]; publicadoEm: string | null; perfil: Perfil; extras?: ExtrasPerguntas }): DocVitorio[] {
  const lista = [
    ...corpusProcessos(mapaDosDados(args.dados), args.publicadoEm),
    ...navegacaoDoDock().filter((d) => d.perfis.includes(args.perfil)),
    ...NAVEGACAO_FIXA.filter((d) => d.perfis.includes(args.perfil)),
    ...GLOSSARIO.filter((g) => g.perfis.includes(args.perfil)),
  ].map((d) => {
    const { perfis, destinos, ...doc } = d as any;
    const destino = destinos ? (destinos[args.perfil] ?? null) : doc.destino;
    return { ...doc, destino } as DocVitorio;
  });
  const extras = args.extras || {};
  return lista.map((d) => (extras[d.chave] && extras[d.chave].length ? { ...d, perguntas: d.perguntas.concat(extras[d.chave]) } : d));
}
