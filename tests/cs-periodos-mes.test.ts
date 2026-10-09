// Roda com: npx tsx tests/cs-periodos-mes.test.ts
// Quem era CS em cada mês (revisão out/2026, C3).
import assert from 'node:assert/strict';
import { csDoMes } from '../lib/cs-periodos.ts';

const periodos = [
  { nome_curto: 'George', nome_completo: 'George Washington', primeiro_mes: '2026-05-01', ultimo_mes: null },
  { nome_curto: 'Alejandro', nome_completo: 'Alejandro Colina', primeiro_mes: '2026-05-01', ultimo_mes: '2026-09-01' },
  { nome_curto: 'Rodrigo', nome_completo: 'Rodrigo Queiroz Campos', primeiro_mes: '2026-06-01', ultimo_mes: null },
  { nome_curto: 'Luana', nome_completo: 'Luana Sampaio Alves', primeiro_mes: '2026-09-01', ultimo_mes: null },
];
// Maio: sem Rodrigo nem Luana
assert.deepEqual(csDoMes(periodos, '2026-05').map((p) => p.nome_curto), ['Alejandro', 'George']);
// Junho: Rodrigo entra
assert.deepEqual(csDoMes(periodos, '2026-06-01').map((p) => p.nome_curto), ['Alejandro', 'George', 'Rodrigo']);
// Setembro: último mês do Alejandro ainda conta; Luana entra
assert.deepEqual(csDoMes(periodos, '2026-09').map((p) => p.nome_curto), ['Alejandro', 'George', 'Luana', 'Rodrigo']);
// Outubro: Alejandro saiu
assert.deepEqual(csDoMes(periodos, '2026-10').map((p) => p.nome_curto), ['George', 'Luana', 'Rodrigo']);
console.log('quem era CS no mês: todos os casos passaram');
