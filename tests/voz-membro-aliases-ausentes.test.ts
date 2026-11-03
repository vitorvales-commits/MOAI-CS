// Roda com: npx tsx tests/voz-membro-aliases-ausentes.test.ts
// Tabela ou view de aliases ausente avisa e segue; qualquer outro erro sobe.
import assert from 'node:assert/strict';
import { avisarSeFalta } from '../lib/voz-membro-dados.ts';

const avisos: string[] = [];
const original = console.warn;
console.warn = (m: string) => { avisos.push(m); };
avisarSeFalta('agenda_conselho_aliases', { code: 'PGRST205', message: 'x' });
avisarSeFalta('v_agenda_conselho_grupo', { code: '42P01', message: 'x' });
console.warn = original;
assert.equal(avisos.length, 2);
assert.match(avisos[0], /agenda_conselho_aliases/);
assert.throws(() => avisarSeFalta('agenda_conselho_aliases', { code: '42501', message: 'permissão negada' }), /permissão negada/);
console.log('voz-membro-aliases-ausentes.test.ts ok');
