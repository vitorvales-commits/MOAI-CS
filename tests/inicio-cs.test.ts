// Roda com: npx tsx tests/inicio-cs.test.ts
// Funções puras da home do CS: último dia real do mês e meta por semana.
import assert from 'node:assert/strict';
import { diasDoMesReal, faltaPorSemana } from '../lib/inicio-cs.ts';

// bug do dia 31: cada mês usa o último dia real
assert.equal(diasDoMesReal(2026, 1), 31);
assert.equal(diasDoMesReal(2026, 2), 28);
assert.equal(diasDoMesReal(2028, 2), 29, 'ano bissexto');
assert.equal(diasDoMesReal(2026, 4), 30);
assert.equal(diasDoMesReal(2026, 6), 30);
assert.equal(diasDoMesReal(2026, 9), 30);
assert.equal(diasDoMesReal(2026, 10), 31);
assert.equal(diasDoMesReal(2026, 11), 30);
assert.equal(diasDoMesReal(2026, 12), 31);

// 3 em falta com 11 dias restantes (1,57 semana): cerca de 1,9 por semana
assert.equal(faltaPorSemana(3, 11), 1.9);
// menos de uma semana restante conta como uma semana inteira
assert.equal(faltaPorSemana(2, 3), 2);
assert.equal(faltaPorSemana(2, 0), 2);
console.log('inicio-cs: testes aprovados');
