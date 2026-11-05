// Roda com: npx tsx tests/admin-isolamento.test.ts
// Garante que só a rota de fechamento de metas semanais importa o cliente com service role (lib/supabase/admin.ts).
// Varre o código-fonte; não importa o módulo, porque 'server-only' lança fora do servidor.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = process.cwd();
const PERMITIDO = ['app', 'api', 'interno', 'metas-semanais', 'fechar', 'route.ts'].join(sep);
const IGNORAR = new Set(['node_modules', '.next', '.git']);

function arquivos(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (/\.(ts|tsx|mts|mjs|js)$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

// Import do módulo admin: caminho relativo ou alias @/lib/supabase/admin.
const IMPORTA_ADMIN = /from\s+['"](?:@\/lib\/supabase\/admin|(?:\.\.?\/)+(?:lib\/)?supabase\/admin(?:\.ts)?|\.\/admin(?:\.ts)?)['"]/;

const infratores: string[] = [];
for (const arq of arquivos(RAIZ)) {
  const rel = relative(RAIZ, arq);
  if (rel === join('lib', 'supabase', 'admin.ts')) continue;
  if (rel.endsWith(PERMITIDO) || rel.includes(join('app', 'api', 'interno', 'metas-semanais', 'fechar'))) continue;
  if (IMPORTA_ADMIN.test(readFileSync(arq, 'utf8'))) infratores.push(rel);
}
assert.deepEqual(infratores, [], 'só a rota de fechamento pode importar lib/supabase/admin.ts');

// O próprio módulo admin precisa declarar server-only.
const admin = readFileSync(join(RAIZ, 'lib', 'supabase', 'admin.ts'), 'utf8');
assert.match(admin, /^import 'server-only';/m, 'lib/supabase/admin.ts precisa começar com import server-only');

// A rota de fechamento de fato importa o admin (senão a regra acima não protege nada).
const rota = readFileSync(join(RAIZ, 'app', 'api', 'interno', 'metas-semanais', 'fechar', 'route.ts'), 'utf8');
assert.match(rota, /from '@\/lib\/supabase\/admin'/, 'a rota de fechamento usa o cliente admin');

console.log('admin-isolamento: só a rota de fechamento importa o cliente admin');
