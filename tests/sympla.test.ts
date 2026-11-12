// Roda com: npx tsx tests/sympla.test.ts
// Contagens da sync-sympla: só números saem da lista de participantes.
import assert from 'node:assert/strict';
import { dataSymplaParaIso, eventoDaApi, contarEvento, eventosParaContar, temProximaPagina } from '../supabase/functions/sync-sympla/logica.ts';

assert.equal(dataSymplaParaIso('2026-11-24 10:00:00'), '2026-11-24T13:00:00.000Z');
assert.equal(dataSymplaParaIso('2026-11-24T10:00:00Z'), '2026-11-24T10:00:00.000Z');
assert.equal(dataSymplaParaIso(''), null);

const ev = eventoDaApi({ id: 3647115, name: ' Mesa ', start_date: '2026-11-24 10:00:00', end_date: '2026-11-24 12:00:00', url: 'https://www.sympla.com.br/evento/x/3647115?token=abc', published: 1, cancelled: 0 })!;
assert.equal(ev.nome, 'Mesa');
assert.equal(ev.url, 'https://www.sympla.com.br/evento/x/3647115'); // token do link privado nunca é gravado
assert.equal(ev.publicado, true);
assert.equal(ev.cancelado, false);
assert.equal(eventoDaApi({ id: 'x' }), null);

const agora = new Date('2026-11-20T12:00:00Z').getTime();
const pedidos = [
  { id: 1, order_status: 'A', order_date: '2026-11-18 09:00:00' },
  { id: 2, order_status: 'A', order_date: '2026-11-01 09:00:00' },
  { id: 3, order_status: 'C', order_date: '2026-11-19 09:00:00' }, // cancelado não conta
];
const participantes = [
  { order_id: 1, first_name: 'A', checkin: [{ check_in: true }] },
  { order_id: 1, first_name: 'B', checkin: [{ check_in: false }] },
  { order_id: 2, first_name: 'C' },
  { order_id: 3, first_name: 'D' },
];
const c = contarEvento(participantes, pedidos, agora);
assert.equal(c.vendidos, 3);
assert.equal(c.checkins, 1);
assert.equal(c.vendidos_7d, 2);
assert.equal(c.ultima_venda, '2026-11-18T12:00:00.000Z');
assert.deepEqual(Object.keys(c).sort(), ['checkins', 'ultima_venda', 'vendidos', 'vendidos_7d']);
// Sem pedidos, conta todos os participantes.
assert.equal(contarEvento(participantes, [], agora).vendidos, 4);

const lista = [
  { ...ev, id: 1, inicio: '2026-11-25T13:00:00Z', fim: '2026-11-25T15:00:00Z', cancelado: false },
  { ...ev, id: 2, inicio: '2026-10-01T13:00:00Z', fim: '2026-10-01T15:00:00Z', cancelado: false },
  { ...ev, id: 3, inicio: '2026-11-22T13:00:00Z', fim: '2026-11-22T15:00:00Z', cancelado: true },
  { ...ev, id: 4, inicio: '2026-11-21T13:00:00Z', fim: '2026-11-21T15:00:00Z', cancelado: false },
];
assert.deepEqual(eventosParaContar(lista, agora).map((e) => e.id), [4, 1, 2]); // 2 encerrado sem contagem: fecha
const jaFechado = new Map<number, string | null>([[2, '2026-10-02T12:00:00Z']]);
assert.deepEqual(eventosParaContar(lista, agora, 40, jaFechado).map((e) => e.id), [4, 1]); // contado depois do fim: não relê
const contadoAntes = new Map<number, string | null>([[2, '2026-10-01T14:00:00Z']]);
assert.deepEqual(eventosParaContar(lista, agora, 40, contadoAntes).map((e) => e.id), [4, 1, 2]);
assert.equal(temProximaPagina({ pagination: { has_next: true } }), true);
assert.equal(temProximaPagina({}), false);
console.log('sympla: todos os testes passaram');
