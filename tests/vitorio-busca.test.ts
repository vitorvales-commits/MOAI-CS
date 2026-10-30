// Roda com: npx tsx tests/vitorio-busca.test.ts
// Motor de busca do Vitorio sobre o conteúdo publicado real dos processos (tests/fixtures/processos-publicados.json,
// extraído do banco em 30/10/2026 com SQL de leitura; corpo dos modelos truncado em 1200 caracteres).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarCorpus, corpusProcessos, extrasOrfas, type Perfil } from '../lib/vitorio/corpus.ts';
import { indexar, buscar, normalizar, radical, trecho, type DocVitorio } from '../lib/vitorio/busca.ts';
import { SINONIMOS } from '../lib/vitorio/sinonimos.ts';

const fx = JSON.parse(readFileSync(new URL('./fixtures/processos-publicados.json', import.meta.url), 'utf8'));
const dados = Object.entries(fx).map(([nome, valor]) => ({ nome, tipo: 'valor', valor }));
function prepara(perfil: Perfil) {
  const docs = montarCorpus({ dados, publicadoEm: fx.atualizadoEm, perfil });
  return { docs, ind: indexar(docs, SINONIMOS) };
}
const gestor = prepara('gestor');
const cs = prepara('cs');
const chaves = (r: { itens: { doc: DocVitorio }[] }) => r.itens.map((i) => i.doc.chave);

// normalização e radical
assert.equal(normalizar('Reunião 1:1, Ação!'), 'reuniao 1a1 acao');
assert.equal(radical('cancelamento'), radical('cancelar'));
assert.equal(radical('relatórios'.normalize('NFD').replace(/[̀-ͯ]/g, '')), radical('relatorio'));
assert.notEqual(radical('conselho'), radical('conselheiro'), 'palavras de sentido diferente não se fundem');

// consulta sem acento encontra item com acento, e o resultado é o mesmo com ou sem acento
const a = buscar(gestor.ind, 'politica de reposicao');
const b = buscar(gestor.ind, 'política de reposição');
assert.equal(a.itens[0].doc.chave, 'modelos:politica_repos');
assert.deepEqual(chaves(a), chaves(b));

// erro de digitação
const digit = buscar(gestor.ind, 'relatoiro pos conselho');
assert.notEqual(digit.tipo, 'nada');
assert.ok(/relatorio/.test(normalizar(digit.itens[0].doc.titulo + ' ' + digit.itens[0].doc.corpo)), 'o primeiro resultado fala em relatório');
assert.ok(chaves(digit).some((c) => /prazo-relatorio-conselho|relatorios-conselho|fluxos:pos|relatorio_cons/.test(c)), 'traz o relatório pós conselho: ' + chaves(digit));

// sinônimo: "cancelamento" encontra item que só fala em churn
const soChurn = gestor.docs.filter((d) => d.colecao !== 'glossario' && d.colecao !== 'navegacao').filter((d) => {
  const t = normalizar(d.titulo + ' ' + d.corpo + ' ' + d.palavras.join(' '));
  return /\bchurn\b/.test(t) && !/cancel/.test(t);
});
assert.ok(soChurn.length > 0, 'a fixture tem item que fala em churn sem a palavra cancelamento');
const canc = buscar(gestor.ind, 'cancelamento');
assert.notEqual(canc.tipo, 'nada');
assert.ok(chaves(canc).some((c) => soChurn.some((d) => d.chave === c)) || soChurn.some((d) => d.chave === canc.itens[0].doc.chave) ||
  /churn/.test(normalizar(canc.itens[0].doc.titulo)), 'cancelamento leva a um item de churn: ' + chaves(canc));

// pergunta da FAQ reescrita com outras palavras encontra a própria FAQ
const faq = buscar(gestor.ind, 'o cs faz o que pelos membros');
assert.equal(faq.tipo, 'resposta');
assert.equal(faq.itens[0].doc.chave, 'faq:o que o cs faz pelo membro');
const faq2 = buscar(gestor.ind, 'quanto tempo dura o onboarding');
assert.equal(faq2.itens[0].doc.colecao, 'faq');

// consulta genérica de duas palavras gera ambígua, com até três opções
const gen = buscar(gestor.ind, 'reuniao conselho');
assert.equal(gen.tipo, 'ambigua');
assert.ok(gen.itens.length >= 2 && gen.itens.length <= 3);

// fora do domínio
assert.equal(buscar(gestor.ind, 'receita de bolo').tipo, 'nada');
assert.equal(buscar(gestor.ind, 'xkcd zzzz qqqq').tipo, 'nada');
assert.equal(buscar(gestor.ind, '   ').tipo, 'nada');

// navegação
const nps = buscar(gestor.ind, 'onde vejo o nps');
assert.equal(nps.tipo, 'resposta');
assert.equal(nps.itens[0].doc.chave, 'navegacao:gestor-nps');
assert.equal(nps.itens[0].doc.destino, '/gestor?aba=nps');
const rel = buscar(cs.ind, 'onde preencho o relatorio do conselho');
assert.equal(rel.itens[0].doc.chave, 'navegacao:cs-relatorio-conselho');

// o perfil CS nunca recebe página exclusiva de gestor
assert.ok(!cs.docs.some((d) => (d.destino || '').startsWith('/gestor')), 'nenhum destino de gestor no corpus do CS');
assert.ok(!cs.docs.some((d) => d.chave.startsWith('navegacao:gestor-')));
['onde vejo o churn', 'mapa do time', 'fila de acao', 'controle de perfis', 'onde vejo o nps', 'visao da area'].forEach((q) => {
  buscar(cs.ind, q).itens.forEach((i) => assert.ok(!(i.doc.destino || '').startsWith('/gestor'), q + ' -> ' + i.doc.chave));
});
assert.ok(gestor.docs.some((d) => d.chave === 'navegacao:gestor-nps') && !cs.docs.some((d) => d.chave === 'navegacao:gestor-nps'));

// glossário: definição sai do código
const health = buscar(gestor.ind, 'o que e health da base');
assert.equal(health.itens[0].doc.chave, 'glossario:health-da-base');
const pts = buscar(cs.ind, 'quando levo ponto de advertencia');
assert.equal(pts.itens[0].doc.chave, 'glossario:pontos-advertencia');
assert.ok(/sexta às 19h gera 5 pontos/.test(pts.itens[0].doc.corpo) && /7 dias gera 5 pontos/.test(pts.itens[0].doc.corpo));

// perguntas extras entram no campo de perguntas do documento
const comExtra = montarCorpus({ dados, publicadoEm: null, perfil: 'gestor', extras: { 'pops:ciclo': ['como fecho o ciclo de um encontro'] } });
const r = buscar(indexar(comExtra, SINONIMOS), 'como fecho o ciclo de um encontro');
assert.equal(r.itens[0].doc.chave, 'pops:ciclo');

// trecho com os termos destacados
const t = trecho('O prazo do report semanal vence na sexta às 19h.', ['report', 'prazo'].map((x) => radical(x)), 200);
assert.ok(t.marcas.length >= 2 && t.texto.slice(t.marcas[0][0], t.marcas[0][1]) === 'prazo');

// chave da FAQ: pontuação e caixa não mudam; reescrever a pergunta gera pergunta extra órfã
const faqs = (q: string) => corpusProcessos({ FAQ: [{ q, a: 'Resposta.', cat: 'A área' }] }, null).filter((d) => d.colecao === 'faq')[0].chave;
const base = faqs('O que o CS faz pelo membro?');
assert.equal(base, 'faq:o que o cs faz pelo membro');
assert.equal(faqs('  o QUE o cs faz, pelo membro!! '), base, 'caixa, pontuação e espaços não mudam a chave');
assert.equal(faqs('O que o CS faz pelo Membro'), base);
assert.notEqual(faqs('O que o CS faz pelos membros?'), base, 'reescrever a pergunta muda a chave');
const extras = { [base]: ['o cs faz o que'], 'pops:ciclo': ['x'], 'faq:vazia': [] };
const vivos = corpusProcessos({ FAQ: [{ q: 'O que o CS faz pelos membros?', a: 'R.' }], POPS: [{ id: 'ciclo', nome: 'Ciclo' }] }, null);
assert.deepEqual(extrasOrfas(extras, vivos), [{ chave: base, frases: ['o cs faz o que'] }], 'órfã detectada; item vivo e lista vazia não contam');
assert.deepEqual(extrasOrfas(extras, [{ chave: base }, { chave: 'pops:ciclo' }]), []);

// chaves únicas
assert.equal(new Set(gestor.docs.map((d) => d.chave)).size, gestor.docs.length, 'chaves repetidas no corpus');
console.log('vitorio busca ok (' + gestor.docs.length + ' documentos para gestor, ' + cs.docs.length + ' para cs)');
