// Roda com: node --experimental-strip-types tests/insights.test.ts
// Cada regra com um caso que dispara e um que não dispara.
import assert from 'node:assert/strict';
import { CATALOGO_INSIGHTS, insightsGestor, type CtxInsights } from '../lib/insights.ts';

const ind = (meta: number | null, calculado: number | null) => ({ meta, calculado });
const base = (): CtxInsights => ({
  hoje: '2026-10-15', diaDoMes: 15, diasNoMes: 31,
  cs: ['Ana', 'Bia'].map((nome) => ({
    nome, pontosAdvertencia: 0, health: { calculado: 10, meta: 20 },
    indicadores: { casesSucesso: ind(10, 5), matchmakings: ind(10, 5), rounds: ind(4, 2), upsell: ind(2, 1), indicacoes: ind(4, 2), churn: ind(2, 0) },
  })),
  report: { semanas: ['a', 'b', 'c', 'd'], porCS: { Ana: ['em_dia', 'em_dia', 'em_dia', 'em_dia'], Bia: ['em_dia', 'com_atraso', 'em_dia', 'em_dia'] } },
  gtd: { atrasadasPorCS: { Ana: 2, Bia: 2 }, etapas: [{ chave: 'x', rotulo: 'Upsells', feitos: 8, total: 10, porCS: [] }] },
});
const ids = (c: CtxInsights) => CATALOGO_INSIGHTS.flatMap((r) => r.avaliar(c)).map((i) => i.id);
const regra = (id: string) => CATALOGO_INSIGHTS.find((r) => r.id === id)!;

assert.equal(CATALOGO_INSIGHTS.length, 7);
// base: dia 15 de 31 = 48% do mês, meta 20 de cases, realizado 10, esperado 9,7: não dispara
assert.deepEqual(ids(base()), [], 'cenário saudável não dispara nada');

// ritmo
const ritmo = base(); ritmo.cs[0].indicadores.casesSucesso = ind(10, 0); ritmo.cs[1].indicadores.casesSucesso = ind(10, 1);
const r1 = regra('ritmo_indicador').avaliar(ritmo);
assert.equal(r1.length, 1); assert.equal(r1[0].id, 'ritmo_indicador_casesSucesso'); assert.deepEqual(r1[0].responsaveis, ['Ana', 'Bia']);
assert.ok(r1[0].numero.includes('1 de 20'));

// churn
const churn = base(); churn.cs[1].indicadores.churn = ind(2, 3);
assert.deepEqual(regra('churn_acima').avaliar(churn)[0].responsaveis, ['Bia']);
assert.equal(regra('churn_acima').avaliar(base()).length, 0);

// report
const rep = base(); rep.report.porCS.Bia = ['em_dia', 'pendente', 'pendente', 'em_dia'];
assert.deepEqual(regra('report_adesao').avaliar(rep)[0].responsaveis, ['Bia']);
const rep2 = base(); rep2.report.porCS.Ana = ['pendente', 'em_dia', 'em_dia', 'em_dia']; rep2.report.porCS.Bia = ['em_dia', 'em_dia', 'em_dia', 'em_dia'];
assert.equal(regra('report_adesao').avaliar(rep2).length, 0, 'adesão de 87 por cento sem duas seguidas não dispara');

// gtd etapa
const gt = base(); gt.gtd.etapas = [{ chave: 'f', rotulo: 'Follow do Encaminhamento', feitos: 1, total: 10, porCS: [{ cs: 'Ana', feitos: 0, total: 5 }, { cs: 'Bia', feitos: 1, total: 5 }] }, { chave: 'g', rotulo: 'Upsells', feitos: 2, total: 10, porCS: [] }];
const g1 = regra('gtd_etapa_esquecida').avaliar(gt)[0];
assert.ok(g1.oQue.includes('Follow do Encaminhamento') && g1.oQue.includes('outras 1 etapa'));
assert.deepEqual(g1.responsaveis, ['Ana', 'Bia']);
const gt2 = base(); gt2.gtd.etapas = [{ chave: 'f', rotulo: 'Follow', feitos: 1, total: 3, porCS: [] }];
assert.equal(regra('gtd_etapa_esquecida').avaliar(gt2).length, 0, 'poucos ciclos não dispara');

// concentração
const co = base(); co.gtd.atrasadasPorCS = { Ana: 7, Bia: 3 };
assert.equal(regra('gtd_concentrado').avaliar(co)[0].responsaveis[0], 'Ana');
assert.equal(regra('gtd_concentrado').avaliar(base()).length, 0);
const co2 = base(); co2.gtd.atrasadasPorCS = { Ana: 2, Bia: 0 };
assert.equal(regra('gtd_concentrado').avaliar(co2).length, 0, 'total pequeno não dispara');

// críticos
const cr = base(); cr.cs[1].health = { calculado: 31, meta: 20 };
assert.deepEqual(regra('criticos_acima').avaliar(cr)[0].responsaveis, ['Bia']);
const cr2 = base(); cr2.cs[1].health = { calculado: 31, meta: null };
assert.equal(regra('criticos_acima').avaliar(cr2).length, 0, 'sem meta não dispara');

// advertência
const ad = base(); ad.cs[0].pontosAdvertencia = 4;
assert.deepEqual(regra('advertencia_alerta').avaliar(ad)[0].responsaveis, ['Ana']);
const ad2 = base(); ad2.cs[0].pontosAdvertencia = 3;
assert.equal(regra('advertencia_alerta').avaliar(ad2).length, 0, 'exatamente 3 não dispara');

// ordenação e recorte
const tudo = base();
tudo.cs.forEach((c) => { c.indicadores.casesSucesso = ind(10, 0); c.indicadores.matchmakings = ind(10, 0); c.indicadores.rounds = ind(4, 0); c.indicadores.upsell = ind(2, 0); c.indicadores.indicacoes = ind(4, 0); });
tudo.cs[0].pontosAdvertencia = 5;
const out = insightsGestor(tudo);
assert.equal(out.visiveis.length, 5); assert.ok(out.restantes.length >= 1);
assert.equal(out.visiveis[0].severidade, 'alta');
assert.equal(insightsGestor(base()).total, 0);
// texto sem travessão
JSON.stringify(out).split('"').forEach((t) => assert.ok(!/[—–]/.test(t), 'sem travessão'));

console.log('insights: testes aprovados');
