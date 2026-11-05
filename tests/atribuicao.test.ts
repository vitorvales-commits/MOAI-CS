// Roda com: npx tsx tests/atribuicao.test.ts
// Data de atribuição por indicador (D7 e P5 do pedido de 05/11/2026).
import assert from 'node:assert/strict';
import { dataDeAtribuicao, dataBRT } from '../lib/atribuicao.ts';

// D7: matchmaking de outubro com resultado registrado em novembro conta em novembro, e não muda outubro.
{
  const item = { data: '2026-10-20', created_at_monday: '2026-10-16T16:18:56Z', resultado_registrado_em: '2026-11-03T14:03:50Z' };
  assert.equal(dataDeAtribuicao('matchmakings_resultado', item), '2026-11-03', 'resultado conta no mês do registro');
  assert.equal(dataDeAtribuicao('matchmakings', item), '2026-10-20', 'o matchmaking em si continua em outubro');
}

// Sem resultado registrado, o item não entra em matchmakings_resultado.
{
  assert.equal(dataDeAtribuicao('matchmakings_resultado', { data: '2026-10-20', resultado_registrado_em: null }), null);
}

// Fallbacks: matchmakings sem data usa created_at_monday; rounds sem início idem.
{
  assert.equal(dataDeAtribuicao('matchmakings', { data: null, created_at_monday: '2026-10-16T16:18:56Z' }), '2026-10-16');
  assert.equal(dataDeAtribuicao('rounds', { inicio: null, created_at_monday: '2026-09-02T12:00:00Z' }), '2026-09-02');
  assert.equal(dataDeAtribuicao('rounds', { inicio: '2026-10-08T13:00:00Z', created_at_monday: '2026-09-02T12:00:00Z' }), '2026-10-08');
}

// P8: sem nenhuma data utilizável o resultado é null, nunca uma data inventada.
{
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: null }), null);
  assert.equal(dataDeAtribuicao('upsell', { data: null }), null);
  assert.equal(dataDeAtribuicao('indicacoes', {}), null);
}

// Fuso: 01/11 02h UTC é 31/10 23h em Brasília, então o item é de outubro.
{
  assert.equal(dataBRT('2026-11-01T02:00:00Z'), '2026-10-31');
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: '2026-11-01T02:00:00Z' }), '2026-10-31');
  assert.equal(dataBRT('2026-11-01T14:00:00Z'), '2026-11-01');
}

// Indicações: data do formulário, e created_at quando o formulário não tem data.
{
  assert.equal(dataDeAtribuicao('indicacoes', { data: '2026-10-23', created_at_monday: '2026-10-25T10:00:00Z' }), '2026-10-23');
  assert.equal(dataDeAtribuicao('indicacoes', { data: null, created_at_monday: '2026-10-25T10:00:00Z' }), '2026-10-25');
}

// Upsell usa só a data do item; data malformada vira null.
{
  assert.equal(dataDeAtribuicao('upsell', { data: '2026-10-14' }), '2026-10-14');
  assert.equal(dataDeAtribuicao('upsell', { data: 'ontem' }), null);
}

// Subordinação ao grupo (decisão de 05/11/2026). Feriados de 2026 da tabela feriados.
const FERIADOS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];
const grupoNov = { mes: '2026-11-01', feriados: FERIADOS_2026 };
{
  // Criado antes do mês do grupo: vai para o primeiro dia útil. 02/11 é Finados, então 03/11.
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: '2026-09-29T15:00:00Z' }, grupoNov), '2026-11-03');
  // Criado depois do mês: vai para o último dia útil de novembro (30/11, segunda).
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: '2026-12-03T15:00:00Z' }, grupoNov), '2026-11-30');
  // Dentro do mês: mantém a data.
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: '2026-11-10T15:00:00Z' }, grupoNov), '2026-11-10');
  // Sem grupo: a data de criação vale como está.
  assert.equal(dataDeAtribuicao('cases', { created_at_monday: '2026-09-29T15:00:00Z' }), '2026-09-29');
  // Matchmaking sem data própria usa a criação subordinada ao grupo.
  assert.equal(dataDeAtribuicao('matchmakings', { data: null, created_at_monday: '2026-09-30T12:00:00Z' }, { mes: '2026-10-01', feriados: FERIADOS_2026 }), '2026-10-01');
  // Rounds sem início usa a criação subordinada; com início, o próprio início vale, sem subordinar.
  assert.equal(dataDeAtribuicao('rounds', { inicio: null, created_at_monday: '2026-12-03T12:00:00Z' }, grupoNov), '2026-11-30');
  assert.equal(dataDeAtribuicao('rounds', { inicio: '2026-10-08T13:00:00Z' }, grupoNov), '2026-10-08');
  // Data própria de matchmaking não é subordinada, mesmo fora do mês do grupo.
  assert.equal(dataDeAtribuicao('matchmakings', { data: '2026-10-20', created_at_monday: '2026-12-03T12:00:00Z' }, grupoNov), '2026-10-20');
  // D7: matchmakings_resultado ignora o grupo.
  assert.equal(dataDeAtribuicao('matchmakings_resultado', { resultado_registrado_em: '2026-11-03T14:03:50Z' }, grupoNov), '2026-11-03');
}

console.log('atribuicao: todos os casos passaram');
