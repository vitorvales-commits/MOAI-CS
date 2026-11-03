// Roda com: npx tsx tests/mes-ata.test.ts
// Cobre todas as variantes de mes_ata presentes em produção em 03/11/2026.
import assert from 'node:assert/strict';
import { normalizarMesAta, mesAtaCasa } from '../lib/mes-ata.ts';

const casos: [string, number, number | null][] = [
  ['Janeiro', 0, null], ['Fevereiro', 1, null], ['Marco', 2, null], ['Março', 2, null], ['Junho', 5, null], ['Maio', 4, null],
  ['Outubro', 9, null], ['Novembro', 10, null], ['Dezembro', 11, null],
  ['Janeiro/2026', 0, 2026], ['Março/2026', 2, 2026], ['Julho/2026', 6, 2026], ['Agosto/2026', 7, 2026], ['Setembro/2026', 8, 2026],
  ['Outubro/2025', 9, 2025], ['Novembro/2025', 10, 2025], ['Dezembro/2025', 11, 2025],
  ['Julho/2026 (Guia 12)', 6, 2026], ['  MARÇO/2026 ', 2, 2026],
];
for (const [entrada, mesIdx, ano] of casos) assert.deepEqual(normalizarMesAta(entrada), { mesIdx, ano }, entrada);
assert.equal(normalizarMesAta('').mesIdx, -1);
assert.equal(normalizarMesAta(null).mesIdx, -1);
assert.equal(normalizarMesAta('Foo/2026').mesIdx, -1);

assert.ok(mesAtaCasa('Julho/2026 (Guia 12)', 6, 2026), 'variante com sufixo casa');
assert.ok(mesAtaCasa('Marco/2026', 2, 2026));
assert.ok(!mesAtaCasa('Outubro/2025', 9, 2026), 'ano diferente não casa');
assert.ok(!mesAtaCasa('Outubro', 9, 2026), 'sem ano explícito não casa');
console.log('mes-ata.test.ts ok');
