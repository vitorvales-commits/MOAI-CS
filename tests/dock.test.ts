// Roda com: npx tsx tests/dock.test.ts
// Dock v3 (21/10/2026): Processos é atalho de primeiro nível nos dois perfis, fora de qualquer menu.
import assert from 'node:assert/strict';
import { montarDock } from '../lib/ui/tema.ts';

const conta = (s: string, sub: string) => s.split(sub).length - 1;

for (const perfil of ['cs', 'gestor'] as const) {
  const html = montarDock(perfil, 'inicio', {}, { inicial: 'v' });
  // Aparece exatamente uma vez, como atalho, e nunca como item escondido dentro de um grupo.
  assert.equal(conta(html, 'href="/processos"'), 1, perfil + ': um único link para /processos');
  assert.ok(/<a class="dock-atalho" href="\/processos"/.test(html), perfil + ': Processos é atalho do dock');
  assert.ok(!/class="mi[^"]*" href="\/processos"/.test(html), perfil + ': Processos não está dentro de menu');
  // Rótulo textual presente (não depende de passar o cursor).
  assert.ok(html.includes('<span class="grp-lbl">Processos</span>'), perfil + ': rótulo visível');
  // Ativo na própria página.
  const ativo = montarDock(perfil, 'processos', {}, { inicial: 'v', semFerramentas: true });
  assert.ok(ativo.includes('class="dock-atalho on"') && ativo.includes('aria-current="page"'), perfil + ': atalho ativo');
  // Sem busca e sem sync quando a página não trata esses controles.
  assert.ok(!ativo.includes('dockBusca') && !ativo.includes('dockSync'), perfil + ': semFerramentas omite busca e sync');
  assert.ok(html.includes('dockBusca') && html.includes('dockSync'), perfil + ': padrão mantém busca e sync');
}

// Item Gestor continua condicionado ao servidor.
assert.ok(!montarDock('cs', 'inicio').includes('href="/gestor"'));
assert.ok(montarDock('cs', 'inicio', {}, { tambemGestor: true }).includes('href="/gestor"'));

console.log('dock: ok');
