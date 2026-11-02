// Roda com: npx tsx tests/sincronia-edicao.test.ts
// Edição de visitas pela fila de escrita (etapa 4b): validação, chave de idempotência, resolução de conflito,
// estado visual e fila de ação do gestor.
import assert from 'node:assert/strict';
import {
  validarEdicao,
  validarResolucao,
  estadoVisual,
  escritasPendentesDaFila,
  HORAS_PENDENTE,
  type EscritaPendente,
} from '../lib/sincronia.ts';

// Validação do corpo da edição.
{
  const ok = validarEdicao({ itemId: '13441800409', valores: { text_mm7eya7z: 'visita de teste' }, lidoEm: '2026-11-02T14:00:00Z' });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.deepEqual(ok.edicao.valores, { text_mm7eya7z: 'visita de teste' });
    // Sem chave no corpo, a validação não inventa uma: quem gera é a rota.
    assert.equal(ok.edicao.chave, undefined);
  }

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

// Chave de idempotência: vem do corpo quando enviada, com 8 a 100 caracteres.
{
  const base = { itemId: '1', valores: { text_mm7eya7z: 'x' }, lidoEm: '2026-11-02T14:00:00Z' };
  const chave = '6f1c2b7e-9a4d-4e21-8c3b-0d5e7a9f1b2c';
  const com = validarEdicao({ ...base, chave });
  assert.equal(com.ok, true);
  if (com.ok) assert.equal(com.edicao.chave, chave);

  assert.equal(validarEdicao({ ...base, chave: 'curta' }).ok, false, 'chave com 5 caracteres');
  assert.equal(validarEdicao({ ...base, chave: 'x'.repeat(7) }).ok, false, 'chave com 7 caracteres');
  assert.equal(validarEdicao({ ...base, chave: 'x'.repeat(8) }).ok, true, 'chave com 8 caracteres');
  assert.equal(validarEdicao({ ...base, chave: 'x'.repeat(100) }).ok, true, 'chave com 100 caracteres');
  assert.equal(validarEdicao({ ...base, chave: 'x'.repeat(101) }).ok, false, 'chave com 101 caracteres');
  assert.equal(validarEdicao({ ...base, chave: 12345678 }).ok, false, 'chave que não é texto');
}

// Resolução de conflito: ação válida e chave só quando a ação cria comando novo.
{
  assert.deepEqual(validarResolucao({ acao: 'usar_monday' }), { ok: true, acao: 'usar_monday', chave: null });
  assert.deepEqual(validarResolucao({ acao: 'usar_monday', chave: 'qualquer-coisa' }), { ok: true, acao: 'usar_monday', chave: null });

  const reaplicar = validarResolucao({ acao: 'reaplicar', chave: '6f1c2b7e-9a4d-4e21-8c3b-0d5e7a9f1b2c' });
  assert.equal(reaplicar.ok, true);
  if (reaplicar.ok) assert.equal(reaplicar.acao, 'reaplicar');

  assert.equal(validarResolucao({ acao: 'reaplicar' }).ok, false, 'reaplicar sem chave');
  assert.equal(validarResolucao({ acao: 'reaplicar', chave: 'curta' }).ok, false, 'reaplicar com chave curta');
  assert.equal(validarResolucao({ acao: 'apagar', chave: '6f1c2b7e-9a4d' }).ok, false, 'ação fora da lista');
  assert.equal(validarResolucao({ chave: '6f1c2b7e-9a4d' }).ok, false, 'sem ação');
  assert.equal(validarResolucao({ acao: ['usar_monday'] }).ok, false, 'ação que não é texto');
  assert.equal(validarResolucao(null).ok, false);
  assert.equal(validarResolucao('usar_monday').ok, false);
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
  const base = { board_id: '18432210313', item_id: '1', erro: null, criado_por: 'cs.teste', valores: { text_mm7eya7z: 'x' } };
  const linhas: EscritaPendente[] = [
    { ...base, id: 1, estado: 'conflito', criado_em: '2026-11-02T10:00:00Z', executado_em: '2026-11-02T10:01:00Z' },
    { ...base, id: 2, estado: 'erro', criado_em: '2026-11-03T11:00:00Z', executado_em: '2026-11-03T11:00:30Z' },
    { ...base, id: 3, estado: 'conflito', criado_em: '2026-11-01T08:00:00Z', executado_em: '2026-11-01T08:00:05Z' },
    { ...base, id: 4, estado: 'concluido', criado_em: '2026-11-01T08:00:00Z', executado_em: '2026-11-01T08:00:05Z' },
    { ...base, id: 5, estado: 'cancelado', criado_em: '2026-11-01T08:00:00Z', executado_em: null },
    { ...base, id: 6, estado: 'erro', criado_em: '2026-11-02T12:01:00Z', executado_em: null },
  ];
  const fila = escritasPendentesDaFila(linhas, agora);
  assert.deepEqual(fila.map((l) => l.id), [3, 1]);
  // A linha que sai da fila carrega autor e valores para a tela.
  assert.equal(fila[0].criado_por, 'cs.teste');
  assert.deepEqual(fila[0].valores, { text_mm7eya7z: 'x' });
}

console.log('ok: edição de visitas conferida (validação, chave, resolução, estado visual e fila de ação)');
