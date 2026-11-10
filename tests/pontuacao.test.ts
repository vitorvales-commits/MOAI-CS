// Roda com: node --experimental-strip-types tests/pontuacao.test.ts
// Casos espelham a lógica de referência do prompt de 07/10/2026 (seção 6, pontuação).
import assert from 'node:assert/strict';
import { calcularScoreCS, rankingCSAtivos, aproveitamentoIndicador, bonusDoPeriodo, type BonusRegistro } from '../lib/pontuacao.ts';

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
assert.equal(cart.elegiveis, 5, 'Carteira e redutores (churn, downsell) não contam como indicadores que pontuam');
assert.equal(calcularScoreCS(metas(5), { numConselhos: 1, metaPropria: 6 }).score, cart.score, 'tamanho da carteira não muda a nota');
assert.equal(calcularScoreCS(metas(5), { numConselhos: 20, metaPropria: null }).score, cart.score);

// bater exatamente todas as metas vale 100
assert.equal(cart.score, 100);
// extrapola: dobro de cases = (18*2 + 54) / 72 = 125
const dobro = calcularScoreCS(metas(10), { numConselhos: 6, metaPropria: 6 });
assert.equal(dobro.score, 125);
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

// três indicadores de crescimento pontuam e renormalizam: (0,5*18 + 0*18 + 1*12) / 48; churn dentro do limite não soma
const poucos = calcularScoreCS({
  casesSucesso: { meta: 10, alcancado: 5, tipoMeta: 'min' }, churn: { meta: 4, alcancado: 0, tipoMeta: 'max' },
  matchmakings: { meta: 8, alcancado: 0, tipoMeta: 'min' }, rounds: { meta: 1, alcancado: 1, tipoMeta: 'min' },
}, { numConselhos: 4, metaPropria: 4 });
assert.equal(poucos.estado, 'com_pontuacao'); assert.equal(poucos.elegiveis, 3); assert.equal(poucos.score, 44);

// Caso George, novembro de 2026: nenhuma entrega, churn zero com limite 2 e carteira 6 de 6. Antes dava 12.
const george = calcularScoreCS({
  casesSucesso: { meta: 12, alcancado: 0, tipoMeta: 'min' }, matchmakings: { meta: 37, alcancado: 0, tipoMeta: 'min' },
  indicacoes: { meta: 5, alcancado: 0, tipoMeta: 'min' }, upsell: { meta: 1, alcancado: 0, tipoMeta: 'min' },
  rounds: { meta: 1, alcancado: 0, tipoMeta: 'min' }, churn: { meta: 2, alcancado: 0, tipoMeta: 'max' },
  downsell: { meta: 0, alcancado: 0, tipoMeta: 'max' },
}, { numConselhos: 6, metaPropria: 6 });
assert.equal(george.score, 0, 'sem entrega a nota é zero: nem carteira nem churn zero dão ponto');
assert.equal(george.itens.find((i) => i.chave === 'churn')!.pontos, 0);

// Redutor estourado desconta: metas(5) é 100; churn 4 com limite 2 desconta 0,5 * 10/72 * 100 = 6,9
const estouro = calcularScoreCS({ ...metas(5), churn: { meta: 2, alcancado: 4, tipoMeta: 'max' } }, { numConselhos: 6, metaPropria: 6 });
assert.equal(estouro.score, 93);
const ch = estouro.itens.find((i) => i.chave === 'churn')!;
assert.equal(ch.estourou, true); assert.equal(ch.pontos, -6.9);
// limite zero estourado desconta o peso inteiro: downsell 1 com limite 0 tira 3/72*100 = 4,2
const ds = calcularScoreCS({ ...metas(5), downsell: { meta: 0, alcancado: 1, tipoMeta: 'max' } }, { numConselhos: 6, metaPropria: 6 });
assert.equal(ds.score, 96);
// a nota nunca fica negativa
const negativo = calcularScoreCS({ ...george.itens.reduce((o, i) => o, {}), casesSucesso: { meta: 10, alcancado: 0, tipoMeta: 'min' },
  matchmakings: { meta: 10, alcancado: 0, tipoMeta: 'min' }, rounds: { meta: 1, alcancado: 0, tipoMeta: 'min' },
  churn: { meta: 1, alcancado: 5, tipoMeta: 'max' } }, { numConselhos: 1, metaPropria: 1 });
assert.equal(negativo.score, 0);

// ranking só com ativos e elegíveis, sem Ex CS
const bom = (score: number, el = 4) => ({ score, elegiveis: el, estado: 'com_pontuacao' as const, itens: [], bonus: 0 });
const sem = { score: null, elegiveis: 1, estado: 'sem_dados_suficientes' as const, itens: [], bonus: 0 };
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

// ---- onde estão os pontos (detalharScoreCS) ----
import { detalharScoreCS } from '../lib/pontuacao.ts';
{
  const s = calcularScoreCS(metas(2), { numConselhos: 6, metaPropria: 6 });
  const d = detalharScoreCS(s);
  const cs = d.itens.find((i) => i.chave === 'casesSucesso')!;
  // peso 18 de 72 elegíveis = 25; aproveitamento 40% conquista 10 e deixa 15 em aberto
  assert.equal(cs.pesoNormalizado, 25); assert.equal(cs.conquistado, 10); assert.equal(cs.emAberto, 15);
  const churnD = d.itens.find((i) => i.chave === 'churn')!;
  assert.equal(churnD.foraDaConta, true); assert.equal(churnD.motivoFora, 'redutor'); assert.equal(churnD.desconto, 0);
  assert.equal(d.itens.find((i) => i.chave === 'carteira')!.foraDaConta, true);
  assert.equal(d.itens.find((i) => i.chave === 'carteira')!.motivoFora, 'informativo');
  const soma = d.itens.reduce((t, i) => t + (i.pesoNormalizado || 0), 0);
  assert.ok(Math.abs(soma - 100) < 0.5, 'pesos renormalizados somam 100');
  const semMeta = calcularScoreCS({ ...metas(2), downsell: { meta: null, alcancado: 0, tipoMeta: 'max' } }, { numConselhos: 6, metaPropria: 6 });
  const dd = detalharScoreCS(semMeta).itens.find((i) => i.chave === 'downsell')!;
  assert.equal(dd.foraDaConta, true); assert.equal(dd.motivoFora, 'sem_meta'); assert.equal(dd.emAberto, null);
}
console.log('pontuacao: detalharScoreCS ok');

// ---- bônus de pontuação (concedido pelo gestor, mês de vigência) ----
{
  const bonus: BonusRegistro[] = [
    { pontos: 20, mes_referencia: '2026-10-01' },
    { pontos: 5, mes_referencia: '2026-11-01' },
    { pontos: 7, mes_referencia: '2026-10-01', anulado_em: '2026-10-15T10:00:00Z' },
  ];
  // Soma só o mês escolhido; anulado não soma; o período geral soma o ano inteiro.
  assert.equal(bonusDoPeriodo(bonus, '2026-10-01', '2026-10-31'), 20);
  assert.equal(bonusDoPeriodo(bonus, '2026-11-01', '2026-11-30'), 5);
  assert.equal(bonusDoPeriodo(bonus, '2026-01-01', '2026-12-31'), 25);
  assert.equal(bonusDoPeriodo(bonus, '2026-12-01', '2026-12-31'), 0);
  assert.equal(bonusDoPeriodo([], '2026-10-01', '2026-10-31'), 0);
}
{
  const base = calcularScoreCS(metas(5), { numConselhos: 6, metaPropria: 6 });
  const comBonus = calcularScoreCS(metas(5), { numConselhos: 6, metaPropria: 6 }, undefined, 20);
  // O bônus soma ao total final, sem mexer nos indicadores.
  assert.equal(comBonus.score, (base.score as number) + 20);
  assert.equal(comBonus.bonus, 20);
  assert.equal(detalharScoreCS(comBonus).bonus, 20);
  assert.equal(detalharScoreCS(base).bonus, 0);
  // Total pode passar de 100: quem bate todas as metas e ganha bônus fica acima de 100.
  const bateu = calcularScoreCS(
    { casesSucesso: { meta: 5, alcancado: 5, tipoMeta: 'min' }, matchmakings: { meta: 10, alcancado: 10, tipoMeta: 'min' },
      rounds: { meta: 2, alcancado: 2, tipoMeta: 'min' }, upsell: { meta: 1, alcancado: 1, tipoMeta: 'min' },
      indicacoes: { meta: 4, alcancado: 4, tipoMeta: 'min' } },
    { numConselhos: 6, metaPropria: 6 }, undefined, 15);
  assert.equal(bateu.score, 115);
}
{
  // Sem dados suficientes: o bônus não cria pontuação nem torna o CS elegível.
  const semDados = calcularScoreCS({}, { numConselhos: 1, metaPropria: 1 }, undefined, 50);
  assert.equal(semDados.estado, 'sem_dados_suficientes');
  assert.equal(semDados.score, null);
  assert.equal(semDados.bonus, 0);
  assert.equal(detalharScoreCS(semDados).bonus, 0);
}
console.log('pontuacao: bônus ok');
