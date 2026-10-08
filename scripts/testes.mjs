// Roda todos os arquivos de tests/ com o mesmo executor (tsx), um processo por arquivo, e para no
// primeiro que falhar. Funciona igual no Windows e no Linux (npm test). Criado em 08/10/2026 porque cada
// teste vinha sendo rodado à mão com executores diferentes e uma falha só aparecia em um deles.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const arquivos = readdirSync('tests').filter((f) => f.endsWith('.test.ts')).sort();
let falhas = 0;
for (const f of arquivos) {
  const r = spawnSync('npx', ['tsx', `tests/${f}`], { stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status === 0) {
    console.log(`ok      ${f}`);
  } else {
    falhas++;
    console.log(`FALHOU  ${f}`);
    console.log((r.stderr || r.stdout || '').split('\n').slice(0, 12).join('\n'));
  }
}
console.log(`\n${arquivos.length - falhas} de ${arquivos.length} arquivos de teste aprovados.`);
process.exit(falhas ? 1 : 0);
