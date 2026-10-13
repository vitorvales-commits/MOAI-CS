// Roda com: npx tsx tests/agenda.test.ts
// Funções puras da agenda de conselhos (faixa, turno, cobrança, prazo, nome exibido).
import assert from 'node:assert/strict';
import { faixaDoSemaforo, turnoDoMinuto, precisaCobranca, prazoCobranca, nomeExibido, instanteBRT, csDoRound } from '../lib/agenda.ts';

// Faixas
assert.equal(faixaDoSemaforo(0), 'vermelho');
assert.equal(faixaDoSemaforo(1), 'vermelho');
assert.equal(faixaDoSemaforo(3), 'laranja');
assert.equal(faixaDoSemaforo(5), 'amarelo');
assert.equal(faixaDoSemaforo(6), 'verde');
assert.equal(faixaDoSemaforo(8), 'azul');

// Turnos (manhã antes de 12h, tarde de 12h a antes de 18h, noite a partir de 18h)
assert.equal(turnoDoMinuto(9 * 60), 'manha');
assert.equal(turnoDoMinuto(12 * 60), 'tarde');
assert.equal(turnoDoMinuto(14 * 60), 'tarde');
assert.equal(turnoDoMinuto(18 * 60), 'noite');
assert.equal(turnoDoMinuto(19 * 60 + 60), 'noite');

// Cobrança
assert.equal(precisaCobranca({ confirmados: 3, passado: false, congelado: false }), true);
assert.equal(precisaCobranca({ confirmados: 4, passado: false, congelado: false }), false);
assert.equal(precisaCobranca({ confirmados: 0, passado: true, congelado: false }), false);
assert.equal(precisaCobranca({ confirmados: 0, passado: false, congelado: true }), false);

// Prazo: conselho na quarta 14/10, hoje terça 13/10: cobrar hoje (a véspera é hoje).
assert.deepEqual(prazoCobranca('2026-10-14', '2026-10-13'), { tipo: 'hoje' });
// Conselho quinta 15/10, hoje terça 13/10: cobrar até quarta 14/10.
assert.deepEqual(prazoCobranca('2026-10-15', '2026-10-13'), { tipo: 'ate', diaIso: '2026-10-14' });
// Conselho no próprio dia: cobrar hoje.
assert.deepEqual(prazoCobranca('2026-10-13', '2026-10-13'), { tipo: 'hoje' });
// Cruzamento de mês: conselho 1º de novembro, hoje 30 de outubro: véspera 31/10.
assert.deepEqual(prazoCobranca('2026-11-01', '2026-10-30'), { tipo: 'ate', diaIso: '2026-10-31' });

// Fuso: 17h UTC é 14h em Brasília.
assert.deepEqual(instanteBRT('2026-10-13T17:00:00+00:00'), { diaIso: '2026-10-13', minutos: 14 * 60 });
// 02h UTC do dia 14 ainda é dia 13 em Brasília (23h).
assert.deepEqual(instanteBRT('2026-10-14T02:00:00+00:00'), { diaIso: '2026-10-13', minutos: 23 * 60 });

// Nome exibido
assert.equal(nomeExibido('Henrique Guimalhaes [André Froes]', null), 'Henrique Guimalhaes');
assert.equal(nomeExibido('Eduardo Gallo (Gallo)', 'Eduardo Gallo'), 'Eduardo Gallo');
assert.equal(nomeExibido('João Vitor', 'João Vitor Alonso'), 'João Vitor Alonso');

// Rounds com CS múltiplo
assert.deepEqual(csDoRound('Vitor, Mateus'), ['Vitor', 'Mateus']);
assert.deepEqual(csDoRound(null), []);

console.log('agenda: testes aprovados');
