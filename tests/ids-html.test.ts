// Roda com: node --experimental-strip-types tests/ids-html.test.ts
// Guarda (08/10/2026): todo getElementById('x') dos scripts do gestor e da home precisa achar o id x no
// HTML estático da página ou em HTML montado pelo próprio script. Nasceu de um defeito real: o
// elemento churnErro saiu do HTML junto com o bloco de análise por IA, carregarChurn() quebrava no
// null antes de qualquer fetch e a aba inteira ficava em "Carregando…".
import assert from 'node:assert/strict';
import { GESTOR_HTML, GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { DASHBOARD_HTML } from '../app/dashboard-html.ts';

// ids declarados: atributo id em qualquer HTML (estático ou dentro de strings do script) e el.id = '...'
function idsDeclarados(fonte: string): Set<string> {
  const ids = new Set<string>();
  for (const m of fonte.matchAll(/\bid\s*=\s*\\?["']([A-Za-z][\w-]*)\\?["']/g)) ids.add(m[1]);
  for (const m of fonte.matchAll(/\.id\s*=\s*["']([A-Za-z][\w-]*)["']/g)) ids.add(m[1]);
  return ids;
}

// ids pedidos: só getElementById com string literal (id montado por concatenação fica de fora)
function idsPedidos(script: string): Set<string> {
  const ids = new Set<string>();
  for (const m of script.matchAll(/getElementById\(\s*["']([A-Za-z][\w-]*)["']\s*\)/g)) ids.add(m[1]);
  return ids;
}

function faltando(html: string, script: string): string[] {
  const declarados = idsDeclarados(html + '\n' + script);
  return Array.from(idsPedidos(script)).filter((id) => !declarados.has(id)).sort();
}

// ---- o próprio detector funciona ----
assert.deepEqual(faltando('<div id="a"></div>', "document.getElementById('a'); document.getElementById('b');"), ['b']);
assert.deepEqual(faltando('', "var h = '<p id=\"montado\"></p>'; document.getElementById('montado');"), [], 'id montado pelo script conta');
assert.deepEqual(faltando('', "document.getElementById('x' + i);"), [], 'id por concatenação fica de fora');

// ---- página do gestor ----
const faltaGestor = faltando(GESTOR_HTML, GESTOR_SCRIPT);
assert.deepEqual(faltaGestor, [], 'ids pedidos pelo script do gestor e ausentes do HTML: ' + faltaGestor.join(', '));

// ---- home (HTML e script no mesmo template) ----
const scriptsHome = Array.from(DASHBOARD_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)).map((m) => m[1]).join('\n');
assert.ok(scriptsHome.length > 0, 'a home tem script inline');
const faltaHome = faltando(DASHBOARD_HTML, scriptsHome);
assert.deepEqual(faltaHome, [], 'ids pedidos pelo script da home e ausentes do HTML: ' + faltaHome.join(', '));

console.log('ids-html: testes aprovados');
