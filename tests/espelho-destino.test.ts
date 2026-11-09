// Roda com: npx tsx tests/espelho-destino.test.ts
// Espelho nativo (etapa 5, PR B): decisão de destino, renomear, vínculo recriado e idempotência.
import assert from 'node:assert/strict';
import { decidirDestinoEspelho, precisaRenomear, vinculoFoiRecriado } from '../supabase/functions/sync-monday/espelho.ts';

// Ordem: vínculo válido vence; depois a chave achada no board; por último criar.
assert.deepEqual(decidirDestinoEspelho('111', ['999']), { tipo: 'vinculo', itemId: '111', duplicatas: 0 });
assert.deepEqual(decidirDestinoEspelho(null, ['222']), { tipo: 'achado', itemId: '222', duplicatas: 0 });
assert.deepEqual(decidirDestinoEspelho(null, []), { tipo: 'criar', duplicatas: 0 });

// Duplicatas pela chave: usa o primeiro e informa quantas há a mais.
assert.deepEqual(decidirDestinoEspelho(null, ['301', '302', '303']), { tipo: 'achado', itemId: '301', duplicatas: 2 });

// Idempotência: uma tentativa anterior criou o item e perdeu a resposta. Na nova tentativa, a busca pela
// chave acha o item criado, então a decisão deixa de ser "criar". Nunca dois itens para a mesma linha.
const primeiraTentativa = decidirDestinoEspelho(null, []);
assert.equal(primeiraTentativa.tipo, 'criar');
const segundaTentativa = decidirDestinoEspelho(null, ['444']);
assert.notEqual(segundaTentativa.tipo, 'criar');
assert.equal(segundaTentativa.itemId, '444');

// Vínculo para item que sumiu do Monday (lido, mas não válido): recria pelo caminho da chave ou de criar,
// e o resultado registra vinculo_recriado.
assert.equal(vinculoFoiRecriado('111', null), true);
assert.equal(vinculoFoiRecriado('111', '111'), false);
assert.equal(vinculoFoiRecriado(null, null), false);
assert.deepEqual(decidirDestinoEspelho(null, ['555']), { tipo: 'achado', itemId: '555', duplicatas: 0 });

// Renomear: só quando o nome muda; nome vazio na linha de origem não apaga o nome do item.
assert.equal(precisaRenomear('Indicador | CS | 2026-10', 'Indicador | CS | 2026-10'), false);
assert.equal(precisaRenomear('Indicador | CS | 2026-10', 'Indicador | CS | 2026-11'), true);
assert.equal(precisaRenomear(null, 'Novo nome'), true);
assert.equal(precisaRenomear('Atual', null), false);
assert.equal(precisaRenomear('Atual', ''), false);

console.log('espelho-destino: ok');
