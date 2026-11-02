// Roda com: npx tsx tests/fila-escrita.test.ts
// Fila de escrita (etapa 4a): regra de conflito, espera entre tentativas, valores para o Monday e isolamento do ciclo.
import assert from 'node:assert/strict';
import {
  decidirEscrita,
  proximaTentativa,
  montarColumnValues,
  executarCiclo,
  ESPERAS_MINUTOS,
  MAX_TENTATIVAS,
} from '../supabase/functions/sync-monday/fila-escrita.ts';

// Conflito: o Monday mudou depois da leitura do dash.
assert.equal(decidirEscrita('2026-11-02T10:00:00Z', '2026-11-02T10:05:00Z'), 'conflito');
// Mudança anterior à leitura: o dash viu o valor atual, pode escrever.
assert.equal(decidirEscrita('2026-11-02T10:00:00Z', '2026-11-02T09:59:59Z'), 'escrever');
// Mesmo instante: não é posterior, então escreve.
assert.equal(decidirEscrita('2026-11-02T10:00:00Z', '2026-11-02T10:00:00Z'), 'escrever');
// Sem leitura registrada ou sem data do Monday: escreve.
assert.equal(decidirEscrita(null, '2026-11-02T10:05:00Z'), 'escrever');
assert.equal(decidirEscrita('2026-11-02T10:00:00Z', null), 'escrever');

// Esperas: 1, 5, 30 e 120 minutos; a quinta falha esgota o comando.
const agora = new Date('2026-11-02T10:00:00Z');
assert.deepEqual(ESPERAS_MINUTOS, [1, 5, 30, 120]);
assert.equal(MAX_TENTATIVAS, 5);
assert.equal(proximaTentativa(1, agora)?.toISOString(), '2026-11-02T10:01:00.000Z');
assert.equal(proximaTentativa(2, agora)?.toISOString(), '2026-11-02T10:05:00.000Z');
assert.equal(proximaTentativa(3, agora)?.toISOString(), '2026-11-02T10:30:00.000Z');
assert.equal(proximaTentativa(4, agora)?.toISOString(), '2026-11-02T12:00:00.000Z');
assert.equal(proximaTentativa(5, agora), null);

// Valores para o Monday: data no formato {"date": ...}, texto como string.
assert.equal(
  montarColumnValues({ date_mm7eccg9: '2026-11-15', text_mm7eya7z: 'visita de teste' }),
  JSON.stringify({ date_mm7eccg9: { date: '2026-11-15' }, text_mm7eya7z: 'visita de teste' }),
);
assert.equal(montarColumnValues({ text_mm7eya7z: null as unknown as string }), '{"text_mm7eya7z":""}');

async function principal() {
// Isolamento: uma tarefa que lança erro não interrompe as seguintes, e o erro sai com o nome da tarefa.
{
  const registros: unknown[][] = [];
  const resultados = await executarCiclo(
    {
      fila_escrita: async () => { throw new Error('Monday fora do ar'); },
      churn: async () => 235,
      visitas_churn: async () => 0,
    },
    async (...args) => { registros.push(args); },
  );
  assert.equal(resultados.fila_escrita.status, 'erro');
  assert.equal(resultados.churn.status, 'sucesso');
  assert.equal(resultados.visitas_churn.status, 'sucesso');
  assert.deepEqual(registros[0], ['fila_escrita', 'erro', undefined, 'Monday fora do ar']);
  assert.equal(registros.length, 3);
}

// Se o registro também falhar, o ciclo segue e as tarefas seguintes rodam.
{
  let rodou = false;
  const resultados = await executarCiclo(
    { fila_escrita: async () => { throw new Error('falha'); }, churn: async () => { rodou = true; return 1; } },
    async () => { throw new Error('sync_log indisponível'); },
  );
  assert.equal(resultados.fila_escrita.status, 'erro');
  assert.equal(rodou, true);
}

// Desligada: não conta como sucesso nem como erro, e não registra nada.
{
  const registros: unknown[][] = [];
  const resultados = await executarCiclo(
    { fila_escrita: async () => null },
    async (...args) => { registros.push(args); },
  );
  assert.deepEqual(resultados.fila_escrita, { status: 'desligada' });
  assert.equal(registros.length, 0);
}

console.log('ok: fila de escrita conferida (conflito, esperas, valores, isolamento do ciclo)');
}

principal();
