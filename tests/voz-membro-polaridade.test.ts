// Roda com: npx tsx tests/voz-membro-polaridade.test.ts
// Polaridade pela nota (N1) e dicionário de temas com "Tecnologia e formulários" (N2), revisão out/2026.
import assert from 'node:assert/strict';
import { polaridadeDaNota } from '../lib/voz-membro/polaridade.ts';
import { classificarTemasMembro } from '../lib/voz-membro.ts';

// N1: 9 e 10 elogio; 7 e 8 crítica com rótulo neutro; 0 a 6 crítica
assert.deepEqual(polaridadeDaNota(10), { polaridade: 'elogio', rotulo: null });
assert.deepEqual(polaridadeDaNota(9), { polaridade: 'elogio', rotulo: null });
assert.deepEqual(polaridadeDaNota(8), { polaridade: 'critica', rotulo: 'neutro' });
assert.deepEqual(polaridadeDaNota(7), { polaridade: 'critica', rotulo: 'neutro' });
assert.deepEqual(polaridadeDaNota(6), { polaridade: 'critica', rotulo: null });
assert.deepEqual(polaridadeDaNota(0), { polaridade: 'critica', rotulo: null });
assert.equal(polaridadeDaNota(null), null);

// N2: textos de tecnologia caem em "Tecnologia e formulários", e não em "Local e estrutura"
const chaves = (t: string) => classificarTemasMembro(t).map((x) => x.chave);
const tecnologia = [
  'Internet mais fácil. Simplificar os cadastros nos formulários',
  'Melhorar wifi para responder o nps',
  'Internet melhor',
];
for (const t of tecnologia) {
  assert.ok(chaves(t).includes('tecnologia'), `deveria ser tecnologia: ${t}`);
  assert.ok(!chaves(t).includes('estrutura'), `não deveria ser estrutura: ${t}`);
}

// Textos de local e estrutura continuam onde estavam
const estrutura = [
  'algumas taças de café estavam com sujeira dentro',
  'Local mais privado',
];
for (const t of estrutura) {
  assert.ok(chaves(t).includes('estrutura'), `deveria ser estrutura: ${t}`);
  assert.ok(!chaves(t).includes('tecnologia'), `não deveria ser tecnologia: ${t}`);
}

console.log('polaridade e temas: todos os casos passaram');
