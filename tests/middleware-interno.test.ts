// Roda com: npx tsx tests/middleware-interno.test.ts
// Middleware real (lib/supabase/middleware.ts): exceção do fechamento de metas e o que continua barrado.
// O Supabase aponta para um endereço fechado, então nada sai da máquina e o gate normal falha de forma previsível.
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

const CAMINHO = '/api/interno/metas-semanais/fechar';
const SEGREDO = 'segredo-de-teste-123';
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_ANON_KEY = 'chave-anon-de-teste';
process.env.METAS_FECHAMENTO_SECRET = SEGREDO;

const passou = (r: Response) => r.headers.get('x-middleware-next') === '1';
const req = (metodo: string, caminho: string, segredo?: string) =>
  new NextRequest(`http://localhost${caminho}`, {
    method: metodo,
    headers: segredo === undefined ? {} : { 'x-metas-secret': segredo },
  });

async function main() {
  const { updateSession } = await import('../lib/supabase/middleware.ts');

  // Caminho exato, POST, segredo certo: passa direto para a rota.
  assert.ok(passou(await updateSession(req('POST', CAMINHO, SEGREDO))), 'segredo certo deve passar');

  // Segredo errado: barrado com 401.
  let r = await updateSession(req('POST', CAMINHO, 'errado-123456789012'));
  assert.equal(r.status, 401);
  assert.ok(!passou(r));

  // Segredo ausente: barrado com 401.
  r = await updateSession(req('POST', CAMINHO));
  assert.equal(r.status, 401);

  // GET no caminho exato, mesmo com segredo certo: barrado com 401.
  r = await updateSession(req('GET', CAMINHO, SEGREDO));
  assert.equal(r.status, 401);
  assert.ok(!passou(r));

  // Variável ausente: falha fechada, barrado com 401 mesmo com cabeçalho preenchido.
  const guardado = process.env.METAS_FECHAMENTO_SECRET;
  delete process.env.METAS_FECHAMENTO_SECRET;
  r = await updateSession(req('POST', CAMINHO, SEGREDO));
  assert.equal(r.status, 401, 'sem METAS_FECHAMENTO_SECRET o caminho fica fechado');
  process.env.METAS_FECHAMENTO_SECRET = guardado;

  // Outro caminho de API com o segredo certo: não é exceção, cai no gate normal, que barra sem sessão.
  r = await updateSession(req('POST', '/api/cs-lista', SEGREDO));
  assert.ok(!passou(r), 'outro caminho continua barrado');
  assert.ok([401, 503].includes(r.status), 'rota de API sem sessão responde 401 ou 503, nunca passa');

  // Página comum sem sessão: redireciona para o login.
  r = await updateSession(req('GET', '/'));
  assert.ok(!passou(r));
  assert.ok(r.status >= 300 && r.status < 400, 'página sem sessão vai para o login');

  console.log('middleware-interno: todos os casos passaram');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
