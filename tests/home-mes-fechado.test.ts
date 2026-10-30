// Home do gestor em mês fechado sem metas (30/10/2026): nunca afirma ritmo, compara com o mês anterior e aponta
// onde o churn se concentrou.
import assert from 'node:assert/strict';
import { resumoMesFechado, textoVariacao, rotuloMesCurto } from '../lib/home-regras.ts';
import { montarHomeGestor } from '../lib/home-gestor.ts';

const realizado = {
  porCS: [
    { nome: 'Alejandro', valores: { churn: 8, casesSucesso: 0, upsell: 0, downsell: 0, rounds: 0 } },
    { nome: 'Vinicius W.', valores: { churn: 12, casesSucesso: 0, upsell: 1, downsell: 0, rounds: 0 } },
    { nome: 'Lucas', valores: { churn: 0, casesSucesso: 3, upsell: 0, downsell: 0, rounds: 0 } },
  ],
  time: { churn: 33, revenueChurn: 0, churnSemValor: 33, casesSucesso: 7, upsell: 1, downsell: 0, rounds: 0 },
  anterior: { mes: 'Dezembro', ano: 2025, churn: 17, revenueChurn: 0, churnSemValor: 17, casesSucesso: 10, upsell: 0, downsell: 0, rounds: 0 },
};

assert.equal(rotuloMesCurto('Dezembro', 2025), 'dez/25');
assert.equal(rotuloMesCurto('Março', 2026), 'mar/26');
assert.equal(textoVariacao(33, 17, 'dez/25'), '16 a mais que dez/25');
assert.equal(textoVariacao(7, 10, 'dez/25'), '3 a menos que dez/25');
assert.equal(textoVariacao(1, 1, 'dez/25'), 'igual a dez/25');
assert.equal(textoVariacao(1, null, null), '');

const r = resumoMesFechado('Janeiro', 2026, realizado);
assert.equal(r.frase, 'Janeiro fechou com 33 churns, 16 a mais que dez/25.');
assert.match(r.apoio, /Foram 7 cases de sucesso \(3 a menos que dez\/25\)\./);
assert.match(r.apoio, /Vinicius W\. concentrou 12 dos 33 churns do mês\./);
assert.doesNotMatch(r.frase + r.apoio, /no ritmo/);
assert.equal(r.concentracao?.nome, 'Vinicius W.');
const churn = r.retencao.find((l) => l.chave === 'churn')!;
assert.equal(churn.variacao, 16);
assert.equal(churn.menorMelhor, true);

// Sem concentração quando o maior responde por menos de um terço.
const espalhado = { ...realizado, porCS: realizado.porCS.map((c) => ({ ...c, valores: { ...c.valores, churn: 3 } })), time: { ...realizado.time, churn: 30 } };
assert.equal(resumoMesFechado('Janeiro', 2026, espalhado).concentracao, null);

// montarHomeGestor: mês passado sem metas e recorte histórico vira fechado; resumo de ritmo some.
const base = {
  mes: 'Janeiro', ano: 2026, geral: false, indicadores: {}, rankingGeral: [], variacoes: new Map(), conselhos: [], recordes: {},
  casesDoTime: [], casesPorCS: [],
  csAtivos: [{ nome: 'Alejandro' }, { nome: 'Vinicius W.' }, { nome: 'Lucas' }],
};
const h = montarHomeGestor({ ...base, rosterModo: 'quem_era_cs', realizado });
assert.ok(h.fechado);
assert.equal(h.resumo, null);
assert.deepEqual(h.time.find((p) => p.nome === 'Vinicius W.')!.realizado, { churn: 12, casesSucesso: 0 });

// Sem o recorte histórico (dados antigos da API), nada muda: segue o resumo de ritmo.
const semRecorte = montarHomeGestor({ ...base });
assert.equal(semRecorte.fechado, null);

// Mês passado com metas: segue o comportamento de sempre, com resumo de ritmo.
const comMetas = montarHomeGestor({ ...base, mes: 'Setembro', indicadores: { casesSucesso: { meta: 50, alcancado: 65 } }, rosterModo: 'quem_era_cs', realizado });
assert.equal(comMetas.fechado, null);
assert.ok(comMetas.resumo);

console.log('home-mes-fechado: ok');
