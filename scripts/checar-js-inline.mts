// Extrai os scripts inline de app/gestor-html.ts e app/dashboard-html.ts e roda node --check em cada um.
// Uso: npx tsx scripts/checar-js-inline.mts
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { DASHBOARD_HTML } from '../app/dashboard-html.ts';
import { gestorCSScript } from '../app/gestor-cs-html.ts';

const dir = mkdtempSync(join(tmpdir(), 'moai-js-'));
const scripts: Record<string, string> = { 'gestor.js': GESTOR_SCRIPT, 'gestor-cs.js': gestorCSScript('Teste') };
[...DASHBOARD_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => { scripts[`dashboard-${i}.js`] = m[1]; });
let falhas = 0;
for (const [nome, js] of Object.entries(scripts)) {
  const arq = join(dir, nome);
  writeFileSync(arq, js);
  const r = spawnSync(process.execPath, ['--check', arq], { encoding: 'utf8' });
  console.log(r.status === 0 ? 'ok     ' : 'FALHOU ', nome);
  if (r.status !== 0) { falhas++; console.log(r.stderr.split('\n').slice(0, 6).join('\n')); }
}
process.exit(falhas ? 1 : 0);
