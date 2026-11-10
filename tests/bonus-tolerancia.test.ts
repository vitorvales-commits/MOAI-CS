// Roda com: npx tsx tests/bonus-tolerancia.test.ts
// Leitura do bônus enquanto a migração 20261110a não existe: ausência de função ou tabela vira "sem bônus" (com
// aviso no log); qualquer outro erro continua sendo lançado.
import assert from 'node:assert/strict';
import { ausenteOuLanca, ehAusenciaDoBonus } from '../lib/bonus-tolerancia.ts';

// Códigos de ausência, um por caso.
assert.equal(ehAusenciaDoBonus({ code: 'PGRST202', message: 'Could not find the function' }), true);
assert.equal(ehAusenciaDoBonus({ code: 'PGRST205', message: "Could not find the table 'public.bonus_aplicados'" }), true);
assert.equal(ehAusenciaDoBonus({ code: '42883', message: 'function x does not exist' }), true);
assert.equal(ehAusenciaDoBonus({ code: '42P01', message: 'relation "bonus_aplicados" does not exist' }), true);

// Mensagem "does not exist" sem código conhecido também conta como ausência.
assert.equal(ehAusenciaDoBonus({ code: null, message: 'function public.bonus_total_por_cs(date, date) does not exist' }), true);

// Erros que não são ausência: permissão, rede, dados. Não podem virar vazio.
assert.equal(ehAusenciaDoBonus({ code: '42501', message: 'permission denied for table bonus_aplicados' }), false);
assert.equal(ehAusenciaDoBonus({ code: 'PGRST301', message: 'JWT expired' }), false);
assert.equal(ehAusenciaDoBonus({ code: '22P02', message: 'invalid input syntax for type date' }), false);
assert.equal(ehAusenciaDoBonus(null), false);
assert.equal(ehAusenciaDoBonus(undefined), false);

// ausenteOuLanca: sem erro devolve false e não grava aviso.
const avisos: string[] = [];
const warnOriginal = console.warn;
console.warn = (...args: unknown[]) => { avisos.push(args.map(String).join(' ')); };
try {
  assert.equal(ausenteOuLanca(null, 'bonus_aplicados'), false);
  assert.equal(avisos.length, 0);

  // Ausência: devolve true e registra aviso com o nome da leitura.
  assert.equal(ausenteOuLanca({ code: 'PGRST202', message: 'Could not find the function' }, 'bonus_total_por_cs'), true);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /bonus_total_por_cs/);
  assert.match(avisos[0], /PGRST202/);
} finally {
  console.warn = warnOriginal;
}

// Outro erro: lança com a mensagem original, sem aviso de ausência.
assert.throws(
  () => ausenteOuLanca({ code: '42501', message: 'permission denied for table bonus_aplicados' }, 'bonus_aplicados'),
  /Erro ao buscar bonus_aplicados: permission denied/,
);

console.log('bonus-tolerancia: ok');
