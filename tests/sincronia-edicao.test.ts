// Roda com: npx tsx tests/sincronia-edicao.test.ts
// Edição de visitas pela fila de escrita (etapa 4b): validação, estado visual e fila de ação do gestor.
import assert from 'node:assert/strict';
import { validarEdicao, estadoVisual, escritasPendentesDaFila, HORAS_PENDENTE } from '../lib/sincronia.ts';

// Validação do corpo.
{
  const ok = validarEdicao({ itemId: '13441800409', valores: { text_mm7eya7z: 'visita de teste' }, lidoEm: '2026-11-02T14:00:00Z' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.edicao.valores, { text_mm7eya7z: 'visita de teste' });

  assert.equal(validarEdicao(null).ok, false);
  assert.equal(validarEdicao({ itemId: 'abc', valores: { text_mm7eya7z: 'x' }, lidoEm: '2026-11-02T14:00:00Z' }).ok, false);
  assert.equal(validarEdicao({ itemId: '1', valores: { text_mm7eya7z: 'x' }, lidoEm: 'ontem' }).ok, false);
  assert.equal(validarEdicao({ itemId: '1', valores: {}, lidoEm: '2026-11-02T14:00:00Z' }).ok, false);
  // Coluna fora da lista de editáveis é recusada, mesmo que exista no board.
  const coluna = validarEdicao({ itemId: '1', valores: { name: 'outro nome' }, lidoEm: '2026-11-02T14:00:00Z' });
  assert.equal(coluna.ok, false);
  // Data precisa estar em AAAA-MM-DD.
  assert.equal(validarEdicao({ itemId: '1', valores: { date_mm7eccg9: '15/11/2026' }, lidoEm: '2026-11-02T14:00:00Z' }).ok, false);
  assert.equal(validarEdicao({ itemId: '1', valores: { date_mm7eccg9: '2026-11-15' }, lidoEm: '2026-11-02T14:00:00Z' }).ok, true);
  // Observação longa demais é recusada.
  assert.equal(validarEdicao({ itemId: '1', valores: { text_mm7eya7z: 'x'.repeat(5001) }, lidoEm: '2026-11-02T14:00:00Z' }).ok, false);
}

// Estado visual do cartão.
assert.equal(estadoVisual('pendente'), 'enviando');
assert.equal(estadoVisual('executando'), 'enviando');
assert.equal(estadoVisual('concluido'), 'salvo');
assert.equal(estadoVisual('conflito'), 'conflito');
assert.equal(estadoVisual('erro'), 'erro');
assert.equal(estadoVisual('cancelado'), 'erro');

// Fila de ação: só erro ou conflito com mais de 24 horas, mais antigo primeiro.
{
  const agora = new Date('2026-11-03T12:00:00Z');
  assert.equal(HORAS_PENDENTE, 24);
  const base = { board_id: '18432210313', item_id: '1', erro: null };
  const linhas = [
    { ...base, id: 1, estado: 'conflito', criado_em: '2026-11-02T10:00:00Z', executado_em: '2026-11-02T10:01:00Z' },
    { ...base, id: 2, estado: 'erro', criado_em: '2026-11-03T11:00:00Z', executado_em: '2026-11-03T11:00:30Z' },
    { ...base, id: 3, estado: 'conflito', criado_em: '2026-11-01T08:00:00Z', executado_em: '2026-11-01T08:00:05Z' },
    { ...base, id: 4, estado: 'concluido', criado_em: '2026-11-01T08:00:00Z', executado_em: '2026-11-01T08:00:05Z' },
    { ...base, id: 5, estado: 'cancelado', criado_em: '2026-11-01T08:00:00Z', executado_em: null },
    { ...base, id: 6, estado: 'erro', criado_em: '2026-11-02T12:01:00Z', executado_em: null },
  ];
  const fila = escritasPendentesDaFila(linhas, agora);
  assert.deepEqual(fila.map((l) => l.id), [3, 1]);
}

console.log('ok: edição de visitas conferida (validação, estado visual e fila de ação)');
