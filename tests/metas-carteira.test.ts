// Roda com: npx tsx tests/metas-carteira.test.ts
import assert from 'node:assert/strict';
import { mrrDoProduto, composicaoCarteira, pisoRevenueChurn, mrrMedioCarteira, metaRevenueChurn } from '../lib/metas-carteira.ts';

// grafia do título ("C-Level+") e do board de churn ("C-Level +") resolvem para o mesmo preço
assert.equal(mrrDoProduto('C-Level+'), 2497);
assert.equal(mrrDoProduto('C-Level +'), 2497);
assert.equal(mrrDoProduto('fast track'), 900);
assert.equal(mrrDoProduto('Setorial'), null);
assert.equal(mrrDoProduto(null), null);

const comp = composicaoCarteira([
  { produto: 'High End', membros: 4 }, { produto: 'Executivo', membros: 6 }, { produto: 'Executivo', membros: 5 },
  { produto: 'Setorial', membros: 9 },
]);
assert.deepEqual(comp.map((p) => [p.produto, p.conselhos, p.membros]), [['Executivo', 2, 11], ['High End', 1, 4]]);
assert.equal(pisoRevenueChurn(comp), 1247);
assert.equal(Math.round(mrrMedioCarteira(comp) as number), Math.round((11 * 1247 + 4 * 4500) / 15));
assert.equal(pisoRevenueChurn([]), null);

// sem membros cadastrados usa a média dos conselhos
assert.equal(mrrMedioCarteira(composicaoCarteira([{ produto: 'C-Level', membros: 0 }, { produto: 'High End', membros: 0 }])), (1797 + 4500) / 2);

// meta: nunca abaixo do piso
const luana = composicaoCarteira([{ produto: 'C-Level+', membros: 7 }]);
assert.equal(metaRevenueChurn(luana, 0).valor, 2497);
assert.equal(metaRevenueChurn(luana, null).valor, 2497);
assert.equal(metaRevenueChurn(luana, 2).valor, 4994);
assert.equal(metaRevenueChurn([], 2).valor, null);
console.log('metas-carteira ok');
