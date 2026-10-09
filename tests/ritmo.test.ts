// Roda com: npx tsx tests/ritmo.test.ts
// Ritmo do mês em andamento (revisão out/2026, V3). Outubro de 2026 tem 21 dias úteis, já descontado
// o feriado de 12/10 (segunda). Até sexta, 9/10, passaram 7 dias úteis.
import assert from 'node:assert/strict';
import { calcularRitmo, diasUteisDoMes } from '../lib/ritmo.ts';

const base = { indicador: 'rounds', mes: '2026-10', hoje: '2026-10-09' };

// Contagem de dias úteis
assert.deepEqual(diasUteisDoMes('2026-10', '2026-10-09'), { decorridos: 7, total: 21 });
// Feriado de 12/10 não entra na contagem: 13/10 (terça) é o 8º dia útil decorrido
assert.deepEqual(diasUteisDoMes('2026-10', '2026-10-13'), { decorridos: 8, total: 21 });
// Mês inteiro decorrido quando hoje é depois do fim
assert.equal(diasUteisDoMes('2026-10', '2026-11-05').decorridos, 21);

// Base dias úteis: meta 30, fração 7/21 => previsto 10
const noRitmo = calcularRitmo({ ...base, base: 'util', meta: 30, realizado: 12 });
assert.equal(noRitmo.status, 'no_ritmo');
assert.ok(Math.abs((noRitmo.previsto ?? 0) - 10) < 1e-9);
assert.equal(noRitmo.baseTexto, '7 de 21 dias úteis');
assert.ok(Math.abs((noRitmo.projecao ?? 0) - 12 / (7 / 21)) < 1e-9);

// Atenção: realizado 8 de previsto 10 => 80%, dentro do limiar de 70%
assert.equal(calcularRitmo({ ...base, base: 'util', meta: 30, realizado: 8 }).status, 'atencao');

// Atrás: 5 de 10 => 50%, abaixo de 70%
assert.equal(calcularRitmo({ ...base, base: 'util', meta: 30, realizado: 5 }).status, 'atras');

// Cedo: no início do mês, previsto menor que 1 e realizado zero
const cedo = calcularRitmo({ ...base, hoje: '2026-10-01', base: 'util', meta: 10, realizado: 0 });
assert.equal(cedo.status, 'cedo');
assert.ok((cedo.previsto ?? 0) < 1);

// Sem meta
assert.equal(calcularRitmo({ ...base, base: 'util', meta: null, realizado: 4 }).status, 'sem_meta');
assert.equal(calcularRitmo({ ...base, base: 'util', meta: 0, realizado: 4 }).status, 'sem_meta');

// Base conselho: 4 de 6 conselhos realizados, meta 12 => previsto 8
const conselhoAtras = calcularRitmo({ ...base, base: 'conselho', meta: 12, realizado: 5, conselhosTotal: 6, conselhosRealizados: 4 });
assert.equal(conselhoAtras.baseTexto, '4 de 6 conselhos realizados');
assert.equal(conselhoAtras.status, 'atras'); // 5 de 8 = 62%
const conselhoAtencao = calcularRitmo({ ...base, base: 'conselho', meta: 12, realizado: 6, conselhosTotal: 6, conselhosRealizados: 4 });
assert.equal(conselhoAtencao.status, 'atencao'); // 6 de 8 = 75%
assert.ok(Math.abs((conselhoAtencao.projecao ?? 0) - 9) < 1e-9);

// Base conselho sem conselho no mês cai para dias úteis
const semConselho = calcularRitmo({ ...base, base: 'conselho', meta: 30, realizado: 12, conselhosTotal: 0, conselhosRealizados: 0 });
assert.ok(semConselho.baseTexto.includes('dias úteis'));

// Projeção só a partir de 25% do mês: em 5/10 (3 de 21 dias) não projeta
const cedoDemais = calcularRitmo({ ...base, hoje: '2026-10-05', base: 'util', meta: 30, realizado: 3 });
assert.equal(cedoDemais.projecao, null);

console.log('ritmo: todos os casos passaram');

// Meta cheia (GTD): sem previsto, com faixas de 70% e 100%
import { avaliarMetaCheia } from '../lib/ritmo.ts';
assert.equal(avaliarMetaCheia(100, 100).status, 'no_ritmo');
assert.equal(avaliarMetaCheia(100, 75).status, 'atencao');
assert.equal(avaliarMetaCheia(100, 40).status, 'atras');
assert.equal(avaliarMetaCheia(100, null).status, 'atras');
assert.equal(avaliarMetaCheia(null, 40).status, 'sem_meta');
console.log('meta cheia: todos os casos passaram');
