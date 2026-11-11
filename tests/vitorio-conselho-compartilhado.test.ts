// Roda com: npx tsx tests/vitorio-conselho-compartilhado.test.ts
// Regra: uma palavra que aparece no título de mais de um conselho sempre pede esclarecimento listando todos esses
// conselhos, mesmo com sinal de carteira. Só uma sequência de palavras presente em um único título resolve.
import assert from 'node:assert/strict';
import { responderTexto, type DadosPipeline } from '../lib/vitorio/pipeline.ts';

const titulos: Record<string, string> = {
  g1: 'Executivo | Maria Lima (Bia)',
  g2: 'Setorial | Joao Lima (Ana)',
  g3: 'Executivo | Lima (Vitor)',
  g4: 'Executivo | Adriana Soares (Mateus)',
  g5: 'Executivo | Andre Soares (Rodrigo)',
  g6: 'Reposições no Executivo | Adriana Soares',
};

const dados: DadosPipeline = {
  hojeIso: '2026-11-10',
  periodos: [],
  ativosHoje: ['Ana', 'Bia', 'Caio'],
  vigencias: Object.keys(titulos).map((g, i) => ({ group_id: g, cs_id: (i % 3) + 1, inicio: '-infinity', fim: null })),
  csPorId: { 1: 'Ana', 2: 'Bia', 3: 'Caio' },
  conselhos: titulos,
  conselhosLista: Object.entries(titulos).map(([group_id, titulo]) => ({ group_id, titulo })),
  csLista: [
    { id: 1, nome_curto: 'Ana', apelidos: [] },
    { id: 2, nome_curto: 'Bia', apelidos: [] },
    { id: 3, nome_curto: 'Caio', apelidos: [] },
  ],
};

// Opções de esclarecimento, como conjunto de group_ids.
const opcoesDe = (s: ReturnType<typeof responderTexto>) => {
  assert.equal(s.status, 'esclarecimento', `esperava esclarecimento, veio ${s.status}`);
  return new Set((s as any).opcoes.map((o: { valor: string }) => o.valor));
};

// 1. Sobrenome compartilhado com sinal de carteira: esclarecimento com todos os conselhos que o contêm.
assert.deepEqual([...opcoesDe(responderTexto('quem cuida do lima', dados))].sort(), ['g1', 'g2', 'g3']);
assert.deepEqual([...opcoesDe(responderTexto('de quem e o conselho lima', dados))].sort(), ['g1', 'g2', 'g3']);

// 2. Sobrenome compartilhado sem sinal de carteira: mesmo assim lista os conselhos (nunca escolha automática).
assert.deepEqual([...opcoesDe(responderTexto('conselho lima', dados))].sort(), ['g1', 'g2', 'g3']);

// 3. Sequência que existe em um único título resolve, sem esclarecimento.
const maria = responderTexto('quem cuida da maria lima', dados);
assert.equal(maria.status, 'resposta');
assert.equal(maria.entidades.conselho, 'g1');
const joao = responderTexto('quem cuida do joao lima', dados);
assert.equal(joao.status, 'resposta');
assert.equal(joao.entidades.conselho, 'g2');

// 4. Palavra única que existe em um único título também resolve.
const unico = responderTexto('quem cuida do maria', dados);
assert.equal(unico.status, 'resposta');
assert.equal(unico.entidades.conselho, 'g1');

// 5. Outro sobrenome compartilhado (Soares), com a versão de reposição excluída da lista.
assert.deepEqual([...opcoesDe(responderTexto('quem cuida do soares', dados))].sort(), ['g4', 'g5']);
const adriana = responderTexto('quem cuida da adriana soares', dados);
assert.equal(adriana.status, 'resposta');
assert.equal(adriana.entidades.conselho, 'g4');

// 6. Outro assunto junto de conselho compartilhado: sem intenção, nada de esclarecimento de carteira.
assert.equal(responderTexto('quantos membros tem o lima', dados).status, 'sem_intencao');

console.log('ok vitorio-conselho-compartilhado');
