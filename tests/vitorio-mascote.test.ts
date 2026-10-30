// Roda com: npx tsx tests/vitorio-mascote.test.ts
// Várias instâncias do Vitorio na mesma página (botão, painel, tour) não podem repetir ids nem colidir clipPath.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vitorioSvg, vitorioHtml, VITORIO_CSS, VITORIO_TAMANHOS } from '../lib/vitorio/mascote.ts';

const ids = (s: string) => [...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const refs = (s: string) => [...s.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
const pagina = vitorioHtml('botao', VITORIO_TAMANHOS.botao) + vitorioHtml('painel', VITORIO_TAMANHOS.painel, 'respondendo') + vitorioHtml('tour', 112, 'apresentando');
const todos = ids(pagina);
assert.ok(todos.length >= 6);
assert.equal(new Set(todos).size, todos.length, 'ids repetidos entre instâncias: ' + todos);
refs(pagina).forEach((r) => assert.ok(todos.includes(r), 'referência sem alvo: ' + r));
assert.ok(ids(vitorioSvg('a')).every((i) => i.startsWith('a-')), 'todo id interno leva o prefixo');
assert.equal(vitorioSvg('x y!'), vitorioSvg('xy'), 'o prefixo é saneado');

// a silhueta da referência está inteira no SVG do app
const ref = readFileSync(new URL('../docs/vitorio/vitorio-referencia.svg', import.meta.url), 'utf8');
const caminhos = [...ref.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
const meu = vitorioSvg('t');
caminhos.forEach((d) => assert.ok(meu.includes('d="' + d + '"'), 'falta o caminho da referência: ' + d.slice(0, 30)));
[...ref.matchAll(/points="([^"]+)"/g)].forEach((m) => assert.ok(meu.includes('points="' + m[1] + '"'), 'falta o polígono ' + m[1]));

// estados e acessibilidade ao movimento
['neutro', 'respondendo', 'nada', 'apresentando'].forEach((e) => assert.ok(VITORIO_CSS.includes('data-estado=' + e), 'estado sem CSS: ' + e));
assert.ok(/prefers-reduced-motion:reduce[\s\S]*animation:none/.test(VITORIO_CSS));
assert.ok(/3\.4s/.test(VITORIO_CSS) && /5\.5s/.test(VITORIO_CSS) && /3\.6s/.test(VITORIO_CSS), 'tempos do briefing');
console.log('vitorio mascote ok');
