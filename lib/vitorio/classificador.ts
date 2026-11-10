// Classificação de intenção do Vitorio 2 (30/10/2026): BM25 sobre as frases exemplo de cada intenção (o motor de public/vitorio-busca.js,
// com as palavras interrogativas mantidas) combinado com sinais estruturais (entidades presentes). A pergunta chega com as entidades
// já trocadas por marcadores (zcs, zconselho, zperiodo...); os exemplos passam pela mesma extração, então os dois lados casam.
import { buscar, indexar, normalizar, type Indice } from './busca.ts';
import { extrair, type Dicionario } from './entidades.ts';
import { INTENCOES } from './intencoes/index.ts';
import type { Entidades, Intencao } from './tipos.ts';

// Palavras que o motor normalmente descarta mas aqui decidem a intenção (quem x quando x quanto, esta x sao) e as de primeira pessoa.
export const MANTER = ['ate', 'mais', 'esta', 'estao', 'sao', 'quem', 'qual', 'quais', 'quando', 'onde', 'como', 'quanto', 'quantos', 'quantas', 'que', 'meu', 'minha', 'meus', 'minhas', 'eu', 'voce', 'porque'];
const MARCADOR: Record<string, string> = { cs: 'zcs', conselho: 'zconselho', membro: 'zmembro', indicador: 'zindicador', periodo: 'zperiodo', produto: 'zproduto' };
const PENALIDADE_DESCONHECIDO = 0.35; // palavra fora dos exemplos (como "fiz") pesa pouco contra a intenção
const BONUS_EXATO = 1.2; // pergunta idêntica a um exemplo
const INDICADORES_DE_CHURN = new Set(['churn', 'revenue_churn']);

export function exemploMascarado(ex: string, dic?: Dicionario): string {
  const n = normalizar(ex.replace(/\{(\w+)\}/g, (_, k) => ' ' + (MARCADOR[k] || k) + ' '));
  return dic ? extrair(n, dic, '2026-10-30').mascarado : n;
}

export type Classificador = { indice: Indice; intencoes: Map<string, Intencao>; vocabulario: Set<string>; exatos: Map<string, string> };
export function criarClassificador(dic?: Dicionario, intencoes: Intencao[] = INTENCOES): Classificador {
  const docs = intencoes.map((i) => ({ chave: i.id, titulo: '', corpo: '', perguntas: i.exemplos.map((e) => exemploMascarado(e, dic)), palavras: [] as string[] }));
  const vocabulario = new Set<string>();
  const exatos = new Map<string, string>();
  // exemplos que, depois da máscara, ficam idênticos em intenções diferentes (churn e outros indicadores) não valem como prova exata
  const donos = new Map<string, Set<string>>();
  docs.forEach((d) => d.perguntas.forEach((p) => { p.split(' ').forEach((w) => vocabulario.add(w)); (donos.get(p) || donos.set(p, new Set()).get(p)!).add(d.chave); }));
  donos.forEach((ids, p) => { if (ids.size === 1) exatos.set(p, [...ids][0]); });
  return { indice: indexar(docs, [], { manter: MANTER }), intencoes: new Map(intencoes.map((i) => [i.id, i])), vocabulario, exatos };
}

export type Classificacao = { intencao: Intencao | null; confianca: number; margem: number; exato: boolean; ranking: { id: string; score: number }[] };
export function classificar(cl: Classificador, mascarado: string, ent: Entidades, minimo = 0): Classificacao {
  const r = buscar(cl.indice, mascarado, { limiarResposta: 0, limiarMinimo: minimo, margemAmbiguidade: 0, penalidadeDesconhecido: PENALIDADE_DESCONHECIDO } as any) as any;
  const lista: { doc: { chave: string }; score: number }[] = r.ranking || [];
  const ajust = lista.map((x) => {
    const it = cl.intencoes.get(x.doc.chave)!;
    let s = x.score;
    // entidade obrigatória presente reforça; entidade citada que a intenção nem usa enfraquece um pouco
    it.obrigatorias.forEach((t) => { if ((ent as any)[t]) s += 0.06; });
    const usa = new Set<string>([...it.obrigatorias, ...(it.opcionais || [])]);
    (['conselho', 'membro', 'indicador'] as const).forEach((t) => { if ((ent as any)[t] && !usa.has(t) && it.familia !== 'social') s -= 0.05; });
    if (ent.periodo && !it.exemplos.some((e) => e.includes('{periodo}')) && it.familia !== 'social') s -= 0.03;
    return { id: it.id, score: s };
  }).sort((a, b) => b.score - a.score);
  const exato = cl.exatos.get(mascarado);
  if (exato) { const x = ajust.find((a) => a.id === exato); if (x) { x.score = Math.max(x.score, BONUS_EXATO); ajust.sort((a, b) => b.score - a.score); } }
  const top = ajust[0];
  let id = top ? top.id : null;
  // churn é um indicador: a pergunta de valor sobre ele tem intenção própria (churn do mês e receita perdida)
  if (id === 'indicadores.valor' && ent.indicador && INDICADORES_DE_CHURN.has(ent.indicador.id)) id = 'churn.mes';
  // carteira é indicador e também o tamanho da carteira do CS
  if (id === 'indicadores.valor' && ent.indicador && ent.indicador.id === 'carteira') id = 'carteira.resumo_cs';
  return { intencao: id ? cl.intencoes.get(id)! : null, confianca: top ? top.score : 0, margem: top ? top.score - (ajust[1]?.score ?? 0) : 0, exato: !!exato, ranking: ajust.slice(0, 3) };
}
