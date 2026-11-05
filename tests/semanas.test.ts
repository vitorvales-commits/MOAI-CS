// Roda com: npx tsx tests/semanas.test.ts
// Casos do pedido de 05/11/2026 (seção 4, calendário). Novembro de 2026 é o teste obrigatório.
import assert from 'node:assert/strict';
import { inicioDaSemana, diasUteis, semanasDoMes, diasUteisDecorridos, diasUteisDaSemana } from '../lib/semanas.ts';

// Feriados nacionais de 2026 da tabela feriados (seed da migração 20261105).
const FERIADOS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];

// 2026-11-01 é domingo. Semanas: 26/10 a 01/11 (sem dia útil em novembro), 02 a 08, 09 a 15, 16 a 22, 23 a 29, 30/11 a 06/12.
{
  const sem = semanasDoMes('2026-11', FERIADOS_2026);
  assert.deepEqual(sem.map((s) => s.diasUteis), [4, 5, 4, 5, 1], 'semanas de novembro: 4, 5, 4, 5 e 1');
  assert.equal(sem.reduce((t, s) => t + s.diasUteis, 0), 19, 'novembro de 2026 tem 19 dias úteis');
  assert.equal(sem[0].inicio, '2026-11-02', 'primeira semana de novembro começa na segunda 02/11');
  assert.equal(sem[sem.length - 1].parcelaInicio, '2026-11-30', 'última parcela é só 30/11');
  assert.equal(sem[sem.length - 1].parcelaFim, '2026-11-30');
}

// Semana que começa em outubro: a parcela de novembro é só 1/11 e vale zero dias úteis (domingo).
{
  const sem = semanasDoMes('2026-11', FERIADOS_2026);
  const primeira = sem[0];
  assert.equal(primeira.inicio, '2026-11-02');
  const outubro = semanasDoMes('2026-10', FERIADOS_2026);
  const cruzando = outubro[outubro.length - 1];
  assert.equal(cruzando.inicio, '2026-10-26', 'semana de 26/10 aparece em outubro');
  assert.equal(cruzando.fim, '2026-11-01', 'e termina em 01/11');
  assert.equal(cruzando.parcelaFim, '2026-10-31', 'a parcela de outubro para em 31/10');
}

// Segunda-feira e domingo caem na mesma semana; domingo volta para a segunda anterior.
{
  assert.equal(inicioDaSemana('2026-11-08'), '2026-11-02', 'domingo 08/11 pertence à semana de 02/11');
  assert.equal(inicioDaSemana('2026-11-02'), '2026-11-02', 'segunda é o próprio início');
  assert.equal(inicioDaSemana('2026-11-04'), '2026-11-02', 'quarta volta à segunda');
}

// Dias úteis: fim de semana não conta, feriado não conta, intervalo invertido vale zero.
{
  assert.equal(diasUteis({ inicio: '2026-11-07', fim: '2026-11-08' }, FERIADOS_2026), 0, 'sábado e domingo');
  assert.equal(diasUteis({ inicio: '2026-11-02', fim: '2026-11-06' }, FERIADOS_2026), 4, 'segunda a sexta com Finados na segunda');
  assert.equal(diasUteis({ inicio: '2026-11-10', fim: '2026-11-06' }, FERIADOS_2026), 0, 'intervalo invertido');
}

// Dias úteis decorridos: antes da semana zero, depois da semana tudo, dentro dela até hoje inclusive.
{
  const semana = { inicio: '2026-11-09', fim: '2026-11-15' };
  assert.equal(diasUteisDecorridos(semana, '2026-11-08', FERIADOS_2026), 0, 'antes da semana');
  assert.equal(diasUteisDecorridos(semana, '2026-11-11', FERIADOS_2026), 3, 'quarta: segunda, terça e quarta');
  assert.equal(diasUteisDecorridos(semana, '2026-11-20', FERIADOS_2026), 5, 'depois da semana: total');
  assert.equal(diasUteisDaSemana(semana, FERIADOS_2026), 5);
}

// Feriado no meio da semana sai da contagem decorrida também.
{
  const semana = { inicio: '2026-11-16', fim: '2026-11-22' };
  assert.equal(diasUteisDecorridos(semana, '2026-11-20', FERIADOS_2026), 4, 'Consciência Negra em 20/11 não conta');
  assert.equal(diasUteisDaSemana(semana, FERIADOS_2026), 4);
}

console.log('semanas: todos os casos passaram');
