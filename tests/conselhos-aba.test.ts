// Roda com: npx tsx tests/conselhos-aba.test.ts
import assert from 'node:assert/strict';
import { filtrarCardsPorCS, fraseSituacaoConselhos } from '../lib/conselhos-aba.ts';

const c = (cs: string, o: object = {}) => ({ csResponsavel: cs, congelado: false, atencao: false, proximaData: '2026-10-23T17:00:00Z', proximaDataEhFutura: true, ...o });

assert.equal(filtrarCardsPorCS([c('Rodrigo'), c('Amanda')], 'rodrigo').length, 1);
assert.equal(filtrarCardsPorCS([c('Rodrigo')], null).length, 0, 'sem CS vinculado não enxerga nada');

assert.equal(
  fraseSituacaoConselhos([c('A'), c('A', { atencao: true }), c('B', { proximaData: null }), c('B', { congelado: true, atencao: true })]),
  '3 conselhos ativos, 1 com selo Atenção e 1 sem próximo encontro na agenda.',
);
assert.equal(fraseSituacaoConselhos([c('A')]), '1 conselho ativo, nenhum com selo Atenção e todos com próximo encontro na agenda.');
assert.equal(fraseSituacaoConselhos([]), 'Nenhum conselho ativo encontrado para este recorte.');
console.log('conselhos-aba ok');
