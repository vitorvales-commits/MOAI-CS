// Roda com: node --experimental-strip-types tests/pontuacao.test.ts
// Casos espelham a lógica de referência do prompt de 07/10/2026 (seção 6).
import assert from 'node:assert/strict';
import { calcularScoreCS, rankingCSAtivos, aproveitamentoIndicador } from '../lib/pontuacao.ts';

const so_carteira = calcularScoreCS({}, { numConselhos: 1, metaPropria: 1 });
assert.equal(so_carteira.estado, 'sem_dados_suficientes', 'Luana: só carteira tem meta');
assert.equal(so_carteira.score, null);
assert.equal(so_carteira.elegiveis, 1);
const cases = so_carteira.itens.find((i) => i.chave === 'casesSucesso')!;
assert.equal(cases.achievementPct, null, 'sem meta nunca vira percentual');
assert.equal(cases.pontos, null);
assert.equal(cases.semMeta, true);

// indicador sem meta, mesmo com valor zero em indicador de máximo, não pontua
assert.equal(aproveitamentoIndicador({ meta: null, alcancado: 0, tipoMeta: 'max' }), null);
assert.equal(aproveitamentoIndicador({ meta: 0, alcancado: 5, tipoMeta: 'min' }), null);
assert.equal(aproveitamentoIndicador({ meta: 10, alcancado: null, tipoMeta: 'min' }), null);

// quatro indicadores pontuam e os pesos renormalizam: (1*15 + 0.5*18 + 1*10 + 0*18) / 61
const quatro = calcularScoreCS({
  casesSucesso: { meta: 10, alcancado: 5, tipoMeta: 'min' },
  churn: { meta: 4, alcancado: 0, tipoMeta: 'max' },
  matchmakings: { meta: 8, alcancado: 0, tipoMeta: 'min' },
}, { numConselhos: 4, metaPropria: 4 });
assert.equal(quatro.estado, 'com_pontuacao');
assert.equal(quatro.elegiveis, 4);
assert.equal(quatro.score, 56); // 34 / 61 = 55,74 por cento
assert.equal(quatro.itens.find((i) => i.chave === 'rounds')!.semMeta, true);

// meta de máximo: metade da meta dá 50 por cento
assert.equal(aproveitamentoIndicador({ meta: 4, alcancado: 2, tipoMeta: 'max' }), 0.5);

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
  { nome: 'Bia', ativo: true, pontuacao: bom(60), extra: null },
]);
assert.deepEqual(r.map((x) => x.nome), ['Ana', 'Vilker', 'Caio', 'Bia'], 'empate: elegíveis e alfabética');
assert.deepEqual(r.map((x) => x.posicao), [1, 2, 3, 4]);
assert.equal(rankingCSAtivos([{ nome: 'A', ativo: true, pontuacao: bom(50), extra: null }]).length, 1, 'menos de três: sem preencher');

console.log('pontuacao: testes aprovados');
