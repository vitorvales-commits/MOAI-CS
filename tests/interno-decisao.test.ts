// Roda com: npx tsx tests/interno-decisao.test.ts
// Decisão da exceção interna (lib/supabase/interno.ts): caminho exato, POST, segredo em tempo constante, falha fechada.
import assert from 'node:assert/strict';
import { decidirRotaInterna, iguaisEmTempoConstante, CAMINHO_FECHAMENTO } from '../lib/supabase/interno.ts';

const SEGREDO = 'segredo-de-teste-123';

// Caminho exato com POST e segredo certo: liberado.
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, SEGREDO, SEGREDO), 'liberar');

// Outro caminho nunca é tratado aqui: segue o gate normal, mesmo com segredo certo.
assert.equal(decidirRotaInterna('POST', '/api/cs-lista', SEGREDO, SEGREDO), 'normal');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO + '/extra', SEGREDO, SEGREDO), 'normal');
assert.equal(decidirRotaInterna('GET', '/', SEGREDO, SEGREDO), 'normal');

// GET no caminho exato: negado, mesmo com segredo certo.
assert.equal(decidirRotaInterna('GET', CAMINHO_FECHAMENTO, SEGREDO, SEGREDO), 'negar');
assert.equal(decidirRotaInterna('PUT', CAMINHO_FECHAMENTO, SEGREDO, SEGREDO), 'negar');

// Segredo errado, ausente ou vazio: negado.
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, 'errado-123456789012', SEGREDO), 'negar');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, SEGREDO.slice(0, -1), SEGREDO), 'negar', 'prefixo não vale');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, null, SEGREDO), 'negar');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, '', SEGREDO), 'negar');

// Variável de ambiente ausente: falha fechada, mesmo com cabeçalho preenchido.
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, SEGREDO, undefined), 'negar');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, SEGREDO, ''), 'negar');
assert.equal(decidirRotaInterna('POST', CAMINHO_FECHAMENTO, '', ''), 'negar');

// Comparação: mesma string iguais; tamanhos diferentes diferentes; um caractere trocado diferente.
assert.equal(iguaisEmTempoConstante('abc', 'abc'), true);
assert.equal(iguaisEmTempoConstante('abc', 'abcd'), false);
assert.equal(iguaisEmTempoConstante('abc', 'abd'), false);

console.log('interno-decisao: todos os casos passaram');
