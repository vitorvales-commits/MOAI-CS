// Roda com: npx tsx tests/metas-sugestao.test.ts
// Modelo de 02/11/2026: base própria ponderada, fallback do time por conselho, régua que não desce para quem
// bateu, linha única pelo realizado único do time e Revenue Churn pela carteira.
import assert from 'node:assert/strict';
import {
  sugerirCS, sugerirTime, rampa, motivoSemModelo, mediaPonderada, taxaTimePorConselho,
  type EntradaCS, type IndicadorCatalogo, type MesCS,
} from '../lib/metas-sugestao.ts';
import { composicaoCarteira } from '../lib/metas-carteira.ts';

const cases: IndicadorCatalogo = { chave: 'cases', rotulo: 'Cases de Sucesso', direcao: 'min', fonte: 'calculado', agregacao_time: 'linha_unica' };
const mm: IndicadorCatalogo = { ...cases, chave: 'matchmakings', rotulo: 'Matchmakings', agregacao_time: 'soma' };
const churn: IndicadorCatalogo = { chave: 'churn', rotulo: 'Churn', direcao: 'max', fonte: 'calculado', agregacao_time: 'soma' };
const revenue: IndicadorCatalogo = { chave: 'revenue_churn', rotulo: 'Revenue Churn', direcao: 'max', fonte: 'manual', agregacao_time: 'soma' };

const mes = (m: string, realizado: Record<string, number>, meta: Record<string, number | null> = {}): MesCS => ({ mes: m, realizado, meta });
const cs = (nome: string, historico: MesCS[], extra: Partial<EntradaCS> = {}): EntradaCS => ({
  nome, historico, carteira: 6, membros: 36, mesesDeCasa: 6, composicao: composicaoCarteira([{ produto: 'Executivo', membros: 36 }]), ...extra,
});

// média ponderada 50/30/20 do mais recente para o mais antigo, renormalizada quando falta mês
assert.equal(mediaPonderada([40, 30, 20]), 33);
assert.equal(mediaPonderada([40, 30]), (40 * 0.5 + 30 * 0.3) / 0.8);
assert.equal(mediaPonderada([]), null);

// George: matchmakings 37 (ago), 22 (set), 48 (out). Base 0,5*48 + 0,3*22 + 0,2*37 = 38; com 10% = 41,8, que daria 42;
// mas ele bateu a meta de out (48 de 43), então a régua fica em 43.
const george = cs('George', [mes('2026-08-01', { matchmakings: 37 }), mes('2026-09-01', { matchmakings: 22 }), mes('2026-10-01', { matchmakings: 48 }, { matchmakings: 43 })]);
const sg = sugerirCS(george, mm, [george]);
assert.equal(sg.base, 'propria');
assert.equal(sg.sugerido, 43);
assert.match(sg.explicacao, /out 48, set 22, ago 37/);

// régua não desce: bateu a meta de out (12 de 10) mas a média ponderada daria menos
const queda = cs('Rodrigo', [mes('2026-09-01', { cases: 2 }), mes('2026-10-01', { cases: 12 }, { cases: 10 }), mes('2026-08-01', { cases: 1 })]);
// base 0,5*12 + 0,3*2 + 0,2*1 = 6,8; com 10% = 7,48 → 7; bateu 10, fica 10
const sq = sugerirCS(queda, cases, [queda]);
assert.equal(sq.sugerido, 10);
assert.match(sq.explicacao, /a régua não desce/);
// sem ter batido, segue a média
const naoBateu = cs('Mateus', [mes('2026-09-01', { cases: 2 }), mes('2026-10-01', { cases: 6 }, { cases: 10 })]);
assert.equal(sugerirCS(naoBateu, cases, [naoBateu]).sugerido, Math.round(((6 * 0.5 + 2 * 0.3) / 0.8) * 1.1));

// CS novo sem histórico: taxa do time por conselho vezes carteira e rampa
const a = cs('Ana', [mes('2026-09-01', { cases: 6 }), mes('2026-10-01', { cases: 6 })]);
const b = cs('Bia', [mes('2026-09-01', { cases: 6 }), mes('2026-10-01', { cases: 6 })]);
const iasmin = cs('Iasmin', [], { carteira: 5, mesesDeCasa: 0 });
assert.equal(taxaTimePorConselho([a, b, iasmin], 'cases'), 1);
const si = sugerirCS(iasmin, cases, [a, b, iasmin]);
// 1 por conselho * 5 * 0,6 = 3; com 10% = 3,3 → 3
assert.equal(si.base, 'time'); assert.equal(si.sugerido, 3);
assert.match(si.explicacao, /60% de rampa por ser o primeiro mês/);
assert.deepEqual([0, 1, 2, 7].map(rampa), [0.6, 0.8, 1, 1]);

// esperado abaixo de 0,5 não vira meta
const zero = cs('Gil', [mes('2026-09-01', { cases: 0 }), mes('2026-10-01', { cases: 0 })]);
assert.equal(sugerirCS(zero, cases, [zero]).sugerido, null);

// churn: média própria com 10% a menos, limite pode ser zero
const ch = cs('Vilker', [mes('2026-09-01', { churn: 2 }), mes('2026-10-01', { churn: 2 })]);
assert.equal(sugerirCS(ch, churn, [ch]).sugerido, 2);
const semChurn = cs('Vitor', [mes('2026-09-01', { churn: 0 }), mes('2026-10-01', { churn: 0 })]);
assert.equal(sugerirCS(semChurn, churn, [semChurn]).sugerido, 0);

// Revenue Churn: Luana com um conselho C-Level+ e limite zero fica no piso de R$ 2.497
const luana = cs('Luana', [], { composicao: composicaoCarteira([{ produto: 'C-Level+', membros: 7 }]) });
const sl = sugerirCS(luana, revenue, [luana], 0);
assert.equal(sl.sugerido, 2497); assert.equal(sl.base, 'carteira');
assert.match(sl.explicacao, /piso de R\$ 2\.497/);
// carteira mista com limite 2: 2 vezes o MRR médio por membro
const mista = cs('Rodrigo', [], { composicao: composicaoCarteira([{ produto: 'Executivo', membros: 6 }, { produto: 'C-Level', membros: 6 }]) });
assert.equal(sugerirCS(mista, revenue, [mista], 2).sugerido, Math.round(2 * (1247 + 1797) / 2));
assert.equal(motivoSemModelo(revenue), null, 'Revenue Churn tem regra própria mesmo sendo fonte manual');

// time: soma das individuais; linha única pelo realizado único do time
const porCS = [george, queda].map((e) => sugerirCS(e, mm, [george, queda]));
assert.equal(sugerirTime(mm, [], porCS).sugerido, porCS.reduce((t, x) => t + (x.sugerido ?? 0), 0));
const tl = sugerirTime(cases, [{ mes: '2026-10-01', realizado: { cases: 40 } }, { mes: '2026-09-01', realizado: { cases: 30 } }], [sq]);
assert.equal(tl.sugerido, Math.round(((40 * 0.5 + 30 * 0.3) / 0.8) * 1.1));
assert.match(tl.explicacao, /contando cada item uma vez/);
assert.equal(sugerirTime(cases, [], [sq]).sugerido, null);
const tr = sugerirTime(revenue, [], [sl]);
assert.equal(tr.sugerido, 2497); assert.match(tr.explicacao, /R\$ 2\.497/);

// política
assert.ok(motivoSemModelo({ ...cases, fonte: 'manual' }));
assert.ok(motivoSemModelo({ ...cases, chave: 'health_base', agregacao_time: 'razao_ponderada' }));
assert.equal(motivoSemModelo(cases), null);
console.log('metas-sugestao ok');
