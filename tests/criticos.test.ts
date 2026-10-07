// Roda com: node --experimental-strip-types tests/criticos.test.ts
import assert from 'node:assert/strict';
import { nivelExibicao, percentualCriticosDecimos, consolidarCriticosPorProduto } from '../lib/criticos.ts';

assert.equal(nivelExibicao('Setorial'), 'Executivo');
assert.equal(nivelExibicao('C-Level'), 'C-Level');
assert.equal(nivelExibicao(''), 'Sem produto');
assert.equal(percentualCriticosDecimos(3, 20), 150);
assert.equal(percentualCriticosDecimos(0, 20), 0);
assert.equal(percentualCriticosDecimos(1, 3), 333);
assert.equal(percentualCriticosDecimos(0, 0), null, 'base zero não tem valor');
assert.equal(percentualCriticosDecimos(5, 3), null, 'críticos acima da base');
assert.equal(percentualCriticosDecimos(1.5, 3), null);

const r = consolidarCriticosPorProduto(
  { Executivo: 3, 'Fast Track': 1 },
  { Executivo: 12, Setorial: 8, 'Fast Track': 10, 'C-Level': 5 },
);
assert.deepEqual(r.linhas.map((l) => l.produto), ['Fast Track', 'Executivo', 'C-Level'], 'ordem de produto, Setorial agrupado em Executivo');
assert.equal(r.linhas[1].membros, 20);
assert.equal(r.linhas[1].percentualDecimos, 150);
assert.equal(r.linhas[2].percentualDecimos, 0, 'zero crítico com membros é zero real');
assert.deepEqual(r.total, { criticos: 4, membros: 35, percentualDecimos: 114 });
const vazio = consolidarCriticosPorProduto({}, {});
assert.equal(vazio.total.percentualDecimos, null);

console.log('criticos: testes aprovados');
