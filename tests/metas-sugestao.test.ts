// Roda com: npx tsx tests/metas-sugestao.test.ts
import assert from 'node:assert/strict';
import { sugerirCS, sugerirTime, taxaTime, rampa, motivoSemModelo, type EntradaCS, type IndicadorCatalogo } from '../lib/metas-sugestao.ts';

const cases: IndicadorCatalogo = { chave: 'cases', rotulo: 'Cases de Sucesso', direcao: 'min', fonte: 'calculado', agregacao_time: 'linha_unica' };
const mm: IndicadorCatalogo = { ...cases, chave: 'matchmakings', rotulo: 'Matchmakings', agregacao_time: 'soma' };
const churn: IndicadorCatalogo = { chave: 'churn', rotulo: 'Churn', direcao: 'max', fonte: 'calculado', agregacao_time: 'soma' };

// três meses, 10 conselhos por mês, 5 cases por mês, 60 membros
const cs = (nome: string, conselhosMes: number, casesMes: number, extra: Partial<EntradaCS> = {}): EntradaCS => ({
  nome, carteira: 5, membros: 30, mesesDeCasa: 5,
  historico: ['2026-07-01', '2026-08-01', '2026-09-01'].map((mes) => ({ mes, conselhos: conselhosMes, membros: 30, realizado: { cases: casesMes, matchmakings: casesMes, churn: 1 } })),
  ...extra,
});

// CS sem histórico recebe a taxa do time: 2 CS com 10 conselhos e 5 cases por mês dão 0,5 por conselho
const veterano = cs('Ana', 10, 5);
const outro = cs('Bia', 10, 5);
const novo: EntradaCS = { nome: 'Iasmin', historico: [], carteira: 3, membros: 18, mesesDeCasa: 0 };
const todos = [veterano, outro, novo];
assert.equal(taxaTime(todos, 'cases', 'min'), 0.5);
const s = sugerirCS(novo, cases, todos);
// esperado = 0,5 * 3 * 0,6 = 0,9; com 10% de crescimento 0,99; arredonda para 1
assert.equal(s.esperado!.toFixed(2), '0.99');
assert.equal(s.sugerido, 1);
assert.match(s.explicacao, /primeiro mês na carteira \(60%\)/);

// rampa: 60%, 80%, depois 100%
assert.deepEqual([0, 1, 2, 7].map(rampa), [0.6, 0.8, 1, 1]);

// CS com muita exposição fica perto da própria taxa, não da do time
const forte = cs('Cadu', 10, 30); // 1 case por conselho em 30 conselhos
const t2 = [forte, cs('Dani', 10, 5)];
const sf = sugerirCS(forte, cases, t2);
const rProprio = 90 / 30; // 3 por conselho
const rTime = (90 + 15) / 60;
const rCs = (90 + 6 * rTime) / (30 + 6);
assert.ok(Math.abs(rCs - rProprio) < Math.abs(rCs - rTime), 'perto da taxa própria');
assert.equal(sf.sugerido, Math.round(rCs * 5 * 1.1));

// linha_unica difere da soma das individuais; soma é igual a soma
const porCS = todos.map((e) => sugerirCS(e, mm, todos));
const tSoma = sugerirTime(mm, todos, porCS);
assert.equal(tSoma.sugerido, porCS.reduce((a, x) => a + (x.sugerido ?? 0), 0));
const porCSc = todos.map((e) => sugerirCS(e, cases, todos));
const tLinha = sugerirTime(cases, todos, porCSc);
assert.equal(tLinha.sugerido, Math.round(0.5 * (5 + 5 + 3) * 1.1));
assert.match(tLinha.explicacao, /A soma das individuais seria/);

// churn usa membros ativos e reduz 10%
const sc = sugerirCS(veterano, churn, todos.slice(0, 2));
assert.equal(sc.esperado!.toFixed(2), '0.90');
assert.equal(sc.sugerido, 1);

// dados insuficientes: menos de 6 conselhos na janela não sugere
const pouco = [cs('Eli', 1, 1, { historico: [{ mes: '2026-09-01', conselhos: 2, membros: 30, realizado: { cases: 1 } }] })];
const sp = sugerirCS(pouco[0], cases, pouco);
assert.equal(sp.sugerido, null);
assert.match(sp.explicacao, /insuficiente/);
assert.equal(sugerirTime(cases, pouco, [sp]).sugerido, null);

// esperado abaixo de 0,5 não vira meta
const zero = [cs('Fábio', 10, 0), cs('Gil', 10, 0)];
assert.equal(sugerirCS(zero[0], cases, zero).sugerido, null);

// política
assert.ok(motivoSemModelo({ ...cases, fonte: 'manual' }));
assert.ok(motivoSemModelo({ ...cases, chave: 'health_base', agregacao_time: 'razao_ponderada' }));
assert.equal(motivoSemModelo(cases), null);
console.log('metas-sugestao ok');
