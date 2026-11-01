// Roda com: npx tsx tests/prune-trava.test.ts
// Trava de sanidade dos prunes do sync-monday: leitura vazia, leitura parcial abaixo de 80% e mais de 50 remoções.
import assert from 'node:assert/strict';
import { decidirPrune, LIMITE_PRESENCA_PRUNE, LIMITE_REMOCAO_PRUNE } from '../supabase/functions/sync-monday/prune-trava.ts';

assert.equal(LIMITE_PRESENCA_PRUNE, 0.8);
assert.equal(LIMITE_REMOCAO_PRUNE, 50);

// Leitura vazia: o Monday devolveu nenhuma linha que existe no banco. Nada pode ser apagado.
{
  const d = decidirPrune(120, 0, 120);
  assert.equal(d.pode, false);
  assert.match(d.motivo, /confirmou 0 de 120/);
}

// Leitura parcial abaixo de 80%: 79 de 100 confirmadas (mínimo 80). A trava segura.
{
  const d = decidirPrune(100, 79, 21);
  assert.equal(d.pode, false);
  assert.match(d.motivo, /mínimo 80/);
}

// Exatamente 80% confirmadas passa a trava de presença.
{
  const d = decidirPrune(100, 80, 20);
  assert.equal(d.pode, true);
}

// Arredondamento para cima: 80% de 7 é 5,6, então o mínimo é 6.
{
  assert.equal(decidirPrune(7, 5, 2).pode, false);
  assert.equal(decidirPrune(7, 6, 1).pode, true);
}

// Mais de 50 remoções: 51 saem de uma vez, com presença de 249 de 300 (83%, acima do mínimo de 240).
// A trava de remoção segura, porque a de presença passa.
{
  const d = decidirPrune(300, 249, 51);
  assert.equal(d.pode, false);
  assert.match(d.motivo, /51 linha\(s\) sairiam de uma vez/);
}

// Exatamente 50 remoções, com presença de 200 de 250 (80%), passa as duas travas.
{
  assert.equal(decidirPrune(250, 200, 50).pode, true);
}

// Sem órfãos e leitura completa: prune pode rodar (no-op).
{
  assert.equal(decidirPrune(50, 50, 0).pode, true);
}

// Tabela vazia no banco: nada a comparar, pode.
{
  assert.equal(decidirPrune(0, 0, 0).pode, true);
}

console.log('ok: trava de prune conferida (leitura vazia, abaixo de 80%, mais de 50 remoções)');
