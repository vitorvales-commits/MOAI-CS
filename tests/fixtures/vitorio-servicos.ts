// Monta os serviços do pipeline com a fixture (dicionário, fonte e corpus real dos processos) para os testes.
import { readFileSync } from 'node:fs';
import { criarClassificador } from '../../lib/vitorio/classificador.ts';
import { montarCorpus } from '../../lib/vitorio/corpus.ts';
import { indexarDocs, type Servicos } from '../../lib/vitorio/responder.ts';
import { DIC, HOJE, CS, fonteFixture, type AjustesFonte } from './vitorio-dados.ts';

const fx = JSON.parse(readFileSync(new URL('./processos-publicados.json', import.meta.url), 'utf8'));
const dados = Object.entries(fx).map(([nome, valor]) => ({ nome, tipo: 'valor', valor }));
const cl = criarClassificador(DIC);
const cache: Record<string, ReturnType<typeof montarCorpus>> = {};

export type Quem = { perfil: 'cs' | 'gestor'; csNome?: string | null; nome?: string; aj?: AjustesFonte };
export function servicos(q: Quem): Servicos {
  const perfil = q.perfil;
  const docs = (cache[perfil] ||= montarCorpus({ dados, publicadoEm: fx.atualizadoEm, perfil }));
  const vocabulario = new Set<string>(cl.vocabulario);
  docs.forEach((d) => (d.titulo + ' ' + d.corpo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).forEach((w) => w && vocabulario.add(w)));
  return {
    dic: DIC, cl, docs, indiceDocs: indexarDocs(docs), vocabulario, f: fonteFixture(q.aj),
    ctx: { perfil, isGestor: perfil === 'gestor', csNome: q.csNome === undefined ? (perfil === 'cs' ? 'George' : null) : q.csNome, nome: q.nome || (q.csNome || 'Vitor'), hoje: HOJE },
    apelidos: Object.fromEntries(CS.map((c) => [c.nome, c.apelido])),
  };
}
