// Roda com: npx tsx tests/vitorio-navegacao.test.ts
// 1) Todo item do dock tem entrada de navegação no Vitorio (com frases de pergunta). 2) Todo alvo data-tour dos roteiros existe
// no HTML da página correspondente. 3) Regras do tour (página, convite, versão nova).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gruposCS, gruposGestor } from '../lib/ui/tema.ts';
import { FRASES_DOCK, NAVEGACAO_FIXA, navegacaoDoDock } from '../lib/vitorio/navegacao.ts';
import { ROTEIROS } from '../lib/vitorio/roteiros.ts';
import { chavePagina, decidirConvite, roteiroDaPagina } from '../lib/vitorio/tour.ts';
import { GLOSSARIO } from '../lib/vitorio/glossario.ts';
import { montarVitorio } from '../lib/vitorio/montagem.ts';
import { GESTOR_HTML } from '../app/gestor-html.ts';
import { GESTOR_CS_HTML } from '../app/gestor-cs-html.ts';
import { DASHBOARD_HTML } from '../app/dashboard-html.ts';
import { PROCESSOS_HTML } from '../lib/processos-ui.ts';

// 1. dock x navegação
const itens: { perfil: 'gestor' | 'cs'; chave: string; href: string }[] = [];
gruposGestor({}).forEach((g) => g.itens.forEach((i) => itens.push({ perfil: 'gestor', chave: i.chave, href: i.href })));
gruposCS({ tambemGestor: true }).forEach((g) => g.itens.forEach((i) => itens.push({ perfil: 'cs', chave: i.chave, href: i.href })));
assert.ok(itens.length >= 17);
const nav = navegacaoDoDock();
itens.forEach((i) => {
  const frases = FRASES_DOCK[i.perfil + ':' + i.chave];
  assert.ok(frases && frases.length >= 2, 'item do dock sem frases de pergunta no Vitorio: ' + i.perfil + ':' + i.chave + ' (lib/vitorio/navegacao.ts)');
  // O item Gestor do dock do CS só existe para quem também é gestor; o perfil efetivo dele é gestor.
  if (i.perfil === 'cs' && i.chave === 'gestor') return;
  const e = nav.find((n) => n.chave === 'navegacao:' + i.perfil + '-' + i.chave);
  assert.ok(e, 'item do dock sem entrada de navegação: ' + i.perfil + ':' + i.chave);
  assert.equal(e!.destino, i.href);
  assert.deepEqual(e!.perfis, [i.perfil]);
});
Object.keys(FRASES_DOCK).forEach((k) => assert.ok(itens.some((i) => i.perfil + ':' + i.chave === k), 'frases para um item que não existe mais no dock: ' + k));
NAVEGACAO_FIXA.forEach((n) => assert.ok(n.destino && n.perfis.length === 1 && n.perfis[0] === (n.chave.includes('-gestor') || n.chave.startsWith('navegacao:gestor') ? 'gestor' : 'cs'), 'perfil/destino da entrada fixa ' + n.chave));

// 2. alvos data-tour
const paginas: Record<string, string> = {
  'gestor-area': GESTOR_HTML, 'gestor-cs': GESTOR_CS_HTML, 'cs-inicio': DASHBOARD_HTML, 'cs-conselhos': DASHBOARD_HTML, 'cs-acompanhamento': DASHBOARD_HTML,
  'gestor-processos': PROCESSOS_HTML + readFileSync(new URL('../public/processos.js', import.meta.url), 'utf8'), 'cs-processos': PROCESSOS_HTML,
};
const vitorio = montarVitorio('cs');
assert.deepEqual(ROTEIROS.map((r) => r.id).sort(), Object.keys(paginas).sort(), 'todo roteiro tem página de verificação');
ROTEIROS.forEach((r) => {
  assert.ok(r.passos.length >= 2 && r.passos.length <= 7, r.id + ': de dois a sete passos (quatro a sete fora do Processos curto)');
  assert.equal(r.passos[r.passos.length - 1].alvo, 'vitorio', r.id + ': o último passo apresenta o Vitorio');
  assert.equal(new Set(r.passos.map((p) => p.id)).size, r.passos.length);
  r.passos.forEach((p) => {
    const html = p.alvo === 'vitorio' ? vitorio : paginas[r.id];
    assert.ok(html.includes('data-tour="' + p.alvo + '"'), r.id + ': alvo data-tour="' + p.alvo + '" não existe no HTML da página');
    assert.ok(p.novoDesde >= 1 && p.novoDesde <= r.versao);
    // texto de interface em português formal, sem hífen nem travessão na prosa
    assert.ok(!/[-–—]/.test(p.titulo + p.texto), r.id + '/' + p.id + ': hífen ou travessão no texto');
  });
});
['kpis', 'mapa-time', 'fila-acao'].forEach((a) => assert.equal((GESTOR_HTML.match(new RegExp('data-tour="' + a + '"', 'g')) || []).length, 1, 'alvo único: ' + a));
assert.ok(ROTEIROS.filter((r) => r.perfil === 'cs' && r.pagina !== 'processos').every((r) => r.passos.length >= 4 || r.pagina === 'conselhos'), 'tours do CS têm de quatro a sete passos (Meus conselhos tem três por ter só dois níveis na tela)');

// 3. página, perfil e convite
assert.equal(chavePagina('gestor', '/gestor', null), 'area');
assert.equal(chavePagina('gestor', '/gestor', 'visaoGeral'), 'area');
assert.equal(chavePagina('gestor', '/gestor', 'churn'), null);
assert.equal(chavePagina('gestor', '/gestor/cs/Amanda', null), 'cs-do-gestor');
assert.equal(chavePagina('cs', '/', null), 'inicio');
assert.equal(chavePagina('cs', '/', 'conselhos'), 'conselhos');
assert.equal(chavePagina('cs', '/', 'report'), 'acompanhamento');
assert.equal(chavePagina('cs', '/processos', null), 'processos');
assert.equal(chavePagina('cs', '/gestor', null), null, 'CS nunca recebe tour de gestor');
assert.equal(roteiroDaPagina('cs', 'area'), null);
const r = roteiroDaPagina('gestor', 'area')!;
assert.equal(decidirConvite(r, null).tipo, 'primeiro');
assert.equal(decidirConvite(r, null).passos.length, r.passos.length);
assert.equal(decidirConvite(r, r.versao).tipo, 'nenhum');
const novo = { ...r, versao: 2, passos: r.passos.map((p, i) => (i === 1 ? { ...p, novoDesde: 2 } : p)) };
const c = decidirConvite(novo, 1);
assert.equal(c.tipo, 'mudou');
assert.deepEqual(c.passos.map((p) => p.id), [novo.passos[1].id], 'versão nova mostra só os passos novos');
assert.equal(decidirConvite({ ...r, versao: 2 }, 1).tipo, 'nenhum', 'versão nova sem passo novo não incomoda');
assert.equal(decidirConvite(null, null).tipo, 'nenhum');
// texto visível do glossário e da navegação: sem hífen nem travessão na prosa
[...GLOSSARIO, ...NAVEGACAO_FIXA, ...nav].forEach((d) => assert.ok(!/[-–—]/.test(d.titulo + d.corpo + d.verbo + d.origem + d.perguntas.join(' ')), 'hífen ou travessão em ' + d.chave));
console.log('vitorio navegacao ok (' + itens.length + ' itens do dock, ' + ROTEIROS.length + ' tours, ' + ROTEIROS.reduce((s, x) => s + x.passos.length, 0) + ' passos)');
