// Roda com: npx tsx tests/dock.test.ts
// O dock é a única porta de entrada para a grade de conselhos: o item Conselhos do gestor aponta para a aba
// ?aba=conselhos e nenhum outro item leva à mesma aba.
import assert from 'node:assert/strict';
import { montarDock } from '../lib/ui/tema.ts';

const gestor = montarDock('gestor', 'conselhos');
const itens = [...gestor.matchAll(/<a[^>]*data-chave="([^"]+)"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*data-chave="([^"]+)"/g)]
  .map((m) => ({ chave: m[1] || m[4], href: m[2] || m[3] }));
const conselhos = itens.filter((i) => i.chave === 'conselhos');
assert.equal(conselhos.length, 1, 'um único item Conselhos no dock do gestor');
assert.equal(conselhos[0].href, '/gestor?aba=conselhos');
assert.equal(itens.filter((i) => i.href.includes('aba=conselhos')).length, 1, 'um único caminho para a grade no dock do gestor');
assert.ok(!itens.some((i) => i.href.includes('rede-conselhos') && i.chave === 'conselhos'), 'a Rede de conselhos fica na Visão da área');

const cs = montarDock('cs', 'meus-conselhos');
assert.ok(cs.includes('href="/?aba=conselhos"'), 'Meus conselhos do CS aponta para ?aba=conselhos');
console.log('dock ok');
