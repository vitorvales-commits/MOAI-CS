// Roda com: node --experimental-strip-types tests/pontuacao.test.ts
// Casos espelham a lógica de referência do prompt de 07/10/2026 (seção 6, pontuação).
import assert from 'node:assert/strict';
import { calcularScoreCS, rankingCSAtivos, aproveitamentoIndicador } from '../lib/pontuacao.ts';

const metas = (cases: number) => ({
  casesSucesso: { meta: 5, alcancado: cases, tipoMeta: 'min' }, matchmakings: { meta: 10, alcancado: 10, tipoMeta: 'min' },
  rounds: { meta: 2, alcancado: 2, tipoMeta: 'min' }, upsell: { meta: 1, alcancado: 1, tipoMeta: 'min' },
  indicacoes: { meta: 4, alcancado: 4, tipoMeta: 'min' }, churn: { meta: 2, alcancado: 0, tipoMeta: 'max' },
  downsell: { meta: 1, alcancado: 0, tipoMeta: 'max' },
});

// Carteira nunca dá ponto
const cart = calcularScoreCS(metas(5), { numConselhos: 6, metaPropria: 6 });
const item = cart.itens.find((i) => i.chave === 'carteira')!;
assert.equal(item.peso, 0); assert.equal(item.semPontos, true); assert.equal(item.pontos, null);
assert.equal(item.achievementPct, 100, 'a Carteira segue visível contra a meta');
assert.equal(cart.elegiveis, 7, 'a Carteira não conta como indicador que pontua');
assert.equal(calcularScoreCS(metas(5), { numConselhos: 1, metaPropria: 6 }).score, cart.score, 'tamanho da carteira não muda a nota');
assert.equal(calcularScoreCS(metas(5), { numConselhos: 20, metaPropria: null }).score, cart.score);

// bater exatamente todas as metas vale 100
assert.equal(cart.score, 100);
// extrapola: dobro de cases = (18*2 + 67) / 85 = 121,18
const dobro = calcularScoreCS(metas(10), { numConselhos: 6, metaPropria: 6 });
assert.equal(dobro.score, 121);
const cases = dobro.itens.find((i) => i.chave === 'casesSucesso')!;
assert.equal(cases.achievementPct, 200); assert.equal(cases.alemDaMetaPct, 100); assert.equal(cases.pontos, 36);
assert.equal(cart.itens.find((i) => i.chave === 'casesSucesso')!.alemDaMetaPct, 0);

// máximo sem bônus
assert.equal(aproveitamentoIndicador({ meta: 3, alcancado: 0, tipoMeta: 'max' }), 1);
assert.equal(aproveitamentoIndicador({ meta: 3, alcancado: 3, tipoMeta: 'max' }), 1);
assert.equal(aproveitamentoIndicador({ meta: 2, alcancado: 4, tipoMeta: 'max' }), 0.5);
assert.equal(aproveitamentoIndicador({ meta: 5, alcancado: 10, tipoMeta: 'min' }), 2);

// sem meta fora da média
assert.equal(aproveitamentoIndicador({ meta: null, alcancado: 0, tipoMeta: 'max' }), null);
assert.equal(aproveitamentoIndicador({ meta: 0, alcancado: 5, tipoMeta: 'min' }), null);
assert.equal(aproveitamentoIndicador({ meta: 10, alcancado: null, tipoMeta: 'min' }), null);

// Luana: só carteira com meta, nenhum indicador pontua
const luana = calcularScoreCS({}, { numConselhos: 1, metaPropria: 1 });
assert.equal(luana.estado, 'sem_dados_suficientes'); assert.equal(luana.score, null); assert.equal(luana.elegiveis, 0);

// quatro indicadores pontuam e os pesos renormalizam: (0,5*18 + 0*18 + 1*10) / 46
const poucos = calcularScoreCS({
  casesSucesso: { meta: 10, alcancado: 5, tipoMeta: 'min' }, churn: { meta: 4, alcancado: 0, tipoMeta: 'max' },
  matchmakings: { meta: 8, alcancado: 0, tipoMeta: 'min' },
}, { numConselhos: 4, metaPropria: 4 });
assert.equal(poucos.estado, 'com_pontuacao'); assert.equal(poucos.elegiveis, 3); assert.equal(poucos.score, 41);

// ranking só com ativos e elegíveis, sem Ex CS
const bom = (score: number, el = 4) => ({ score, elegiveis: el, estado: 'com_pontuacao' as const, itens: [] });
const sem = { score: null, elegiveis: 1, estado: 'sem_dados_suficientes' as const, itens: [] };
const r = rankingCSAtivos([
  { nome: 'Luma', ativo: false, ex: true, pontuacao: bom(90), extra: null },
  { nome: 'Luana', ativo: true, pontuacao: sem, extra: null },
  { nome: 'Rodrigo', ativo: false, pontuacao: bom(80), extra: null },
  { nome: 'Vilker', ativo: true, pontuacao: bom(70, 5), extra: null },
  { nome: 'Ana', ativo: true, pontuacao: bom(70, 5), extra: null },
  { nome: 'Caio', ativo: true, pontuacao: bom(70, 4), extra: null },
  { nome: 'Bia', ativo: true, pontuacao: bom(121), extra: null },
]);
assert.deepEqual(r.map((x) => x.nome), ['Bia', 'Ana', 'Vilker', 'Caio'], 'quem passa de 100 lidera; empate: elegíveis e alfabética');

console.log('pontuacao: testes aprovados');
