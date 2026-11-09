// Roda com: npx tsx tests/espelho-montagem.test.ts
// Montagem dos valores do espelho por tipo (etapa 5, PR B). O formato do piloto (Visita Churns) continua igual.
import assert from 'node:assert/strict';
import { montarColumnValues, valorTipadoParaMonday } from '../supabase/functions/sync-monday/fila-escrita.ts';

// Tipado: cada tipo vira o formato da API do Monday.
assert.equal(valorTipadoParaMonday('text', 'Bom'), 'Bom');
assert.deepEqual(valorTipadoParaMonday('long_text', 'Linha 1\nLinha 2'), { text: 'Linha 1\nLinha 2' });
assert.equal(valorTipadoParaMonday('numbers', 30), '30');
assert.equal(valorTipadoParaMonday('numbers', '2.50'), '2.50');
assert.deepEqual(valorTipadoParaMonday('date', '2026-11-05'), { date: '2026-11-05' });
assert.deepEqual(valorTipadoParaMonday('date', '2026-11-05T10:00:00+00:00'), { date: '2026-11-05' });
assert.deepEqual(valorTipadoParaMonday('status', 'Excluído no dash'), { label: 'Excluído no dash' });

// Nulo limpa a coluna, em qualquer tipo.
assert.equal(valorTipadoParaMonday('text', null), null);
assert.equal(valorTipadoParaMonday('status', null), null);

// Tipo desconhecido não passa em silêncio.
assert.throws(() => valorTipadoParaMonday('checkbox' as any, 'x'));

// montarColumnValues mistura os dois formatos no mesmo payload.
const misto = JSON.parse(montarColumnValues({
  chave_coluna: { tipo: 'text', valor: 'relatorio-1' },
  situacao_coluna: { tipo: 'status', valor: 'Anulada' },
  faltas_coluna: { tipo: 'long_text', valor: 'Fulano: Falta' },
  limpar_coluna: { tipo: 'date', valor: null },
}));
assert.deepEqual(misto, {
  chave_coluna: 'relatorio-1',
  situacao_coluna: { label: 'Anulada' },
  faltas_coluna: { text: 'Fulano: Falta' },
  limpar_coluna: null,
});

// Piloto (Visita Churns): valores crus, sem tipo, continuam como antes.
const piloto = JSON.parse(montarColumnValues({ date_mm7eccg9: '2026-11-20', text_mm7eya7z: 'Observação' }));
assert.deepEqual(piloto, { date_mm7eccg9: { date: '2026-11-20' }, text_mm7eya7z: 'Observação' });

console.log('espelho-montagem: ok');
