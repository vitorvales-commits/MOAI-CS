// Testes de processos: validação do servidor e núcleo do editor (public/processos.js).
// Roda com: npx tsx tests/processos.test.ts
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { validarPublicacao, erroDoBanco, PROC_MARCADOR } from '../lib/processos.ts';

const require = createRequire(import.meta.url);
const N = require('../public/processos.js');

let ok = 0;
function t(nome: string, fn: () => void) { fn(); ok++; console.log('ok', nome); }

// Documento no mesmo formato do mapa de processos real: dados em CAIXA ALTA, helpers, depois o motor.
const HTML = `<!doctype html><html><head><title>Mapa</title><style>b{}</style></head><body><main id="app"></main>
<script>// cabeçalho
const META = { titulo: 'Mapa de processos', data: '13/10' };
const PROCESSOS = [
  { id:'onb', nome:'Onboarding', subs:['a','b'] },
  { id:'churn', nome:'Churn', subs:['c'] }
];
// comentário entre blocos
const M = (nome, tipo) => ({ nome, tipo });
const GAL = 'Galeria';
const MODELOS = {
  guia: M('Guia', 'Guia'),
  form: M('Formulário', 'Form')
};
const CORPO = {"guia": "<h1>Guia<\\/h1><p>R$ 10 e $& texto</p>"};
const FAQ = [ { cat:'A', q:'O que é?', a:'Resposta' } ];
const $ = (s) => document.querySelector(s);
function render(){ document.getElementById('app').textContent = META.titulo + PROCESSOS.length + Object.keys(MODELOS).length; }
render();
</script></body></html>`;

function avaliar(ext: any) {
  const ctx: any = {};
  vm.createContext(ctx);
  const nomes = ext.declaracoes.map((d: any) => d.nome);
  vm.runInContext(ext.regiao + '\n;globalThis.__r = {' + nomes.map((n: string) => n + ':' + n).join(',') + '};', ctx);
  return ext.declaracoes.map((d: any) => {
    const v = ctx.__r[d.nome];
    return typeof v === 'function' ? { nome: d.nome, tipo: 'fonte', fonte: d.fonte } : { nome: d.nome, tipo: 'valor', valor: JSON.parse(JSON.stringify(v)) };
  });
}

const ext = N.extrairDocumento(HTML);
t('extrai a região de dados', () => {
  assert.equal(ext.modo, 'dados');
  assert.deepEqual(ext.declaracoes.map((d: any) => d.nome), ['META', 'PROCESSOS', 'M', 'GAL', 'MODELOS', 'CORPO', 'FAQ']);
  assert.ok(ext.moldura.includes(N.MARCADOR));
  assert.ok(ext.moldura.includes('const $ = (s)'));
  assert.ok(ext.moldura.includes('// cabeçalho'));
  assert.ok(!ext.moldura.includes('const PROCESSOS'));
});
const dados = avaliar(ext);
t('avalia dados e mantém funções como código', () => {
  assert.equal(dados.find((d: any) => d.nome === 'M').tipo, 'fonte');
  assert.deepEqual(dados.find((d: any) => d.nome === 'MODELOS').valor.guia, { nome: 'Guia', tipo: 'Guia' });
});
t('remonta e executa igual ao original', () => {
  const html = N.montarHtml({ moldura: ext.moldura, dados });
  const script = /<script>\/\/ cabe[\s\S]*?<\/script>/.exec(html)![0].replace(/^<script>|<\/script>$/g, '');
  assert.ok(!/<\/script/i.test(script));
  const doc: any = { el: { textContent: '' } };
  const ctx: any = { document: { getElementById: () => doc.el, querySelector: () => null } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  assert.equal(doc.el.textContent, 'Mapa de processos22');
  assert.ok(html.includes('R$ 10 e $& texto'));
  assert.ok(html.includes('<\\/h1>'));
});
t('arquivo sem dados fica inteiro', () => {
  const e = N.extrairDocumento('<html><body><p>oi</p><script>let x = 1;</script></body></html>');
  assert.equal(e.modo, 'inteiro');
});

const novos = JSON.parse(JSON.stringify(dados));
const proc = novos.find((d: any) => d.nome === 'PROCESSOS');
proc.valor[1].nome = 'Pedido de churn';
proc.valor.push({ id: 'upsell', nome: 'Upsell', subs: [] });
proc.valor.splice(0, 1);
const mod = novos.find((d: any) => d.nome === 'MODELOS');
mod.valor.roteiro = { nome: 'Roteiro', tipo: 'Roteiro' };
novos.push({ nome: 'NOVO', tipo: 'valor', valor: [1] });

t('compara item a item', () => {
  const b = N.compararDados(dados, novos);
  const p = b.find((x: any) => x.nome === 'PROCESSOS');
  assert.equal(p.situacao, 'alterado');
  const sit = Object.fromEntries(p.itens.map((i: any) => [i.chave, i.situacao]));
  assert.deepEqual(sit, { 'id:churn': 'alterado', 'id:upsell': 'novo', 'id:onb': 'removido' });
  assert.equal(b.find((x: any) => x.nome === 'NOVO').situacao, 'novo');
  assert.equal(b.find((x: any) => x.nome === 'META').situacao, 'igual');
});
t('aplica tudo por padrão', () => {
  const b = N.compararDados(dados, novos);
  const r = N.aplicarComparacao(dados, novos, b, {});
  assert.deepEqual(r, novos);
});
t('recusa itens e mantém removido no lugar', () => {
  const b = N.compararDados(dados, novos);
  const r = N.aplicarComparacao(dados, novos, b, { 'PROCESSOS|id:onb': false, 'PROCESSOS|id:churn': false, 'MODELOS|roteiro': false, NOVO: false });
  const p = r.find((d: any) => d.nome === 'PROCESSOS').valor;
  assert.deepEqual(p.map((x: any) => x.id), ['onb', 'churn', 'upsell']);
  assert.equal(p[1].nome, 'Churn');
  assert.equal(Object.keys(r.find((d: any) => d.nome === 'MODELOS').valor).length, 2);
  assert.equal(r.some((d: any) => d.nome === 'NOVO'), false);
});
t('resumo descreve as mudanças', () => {
  const r = N.resumoMudancas({ dados, moldura: 'x', titulo: 'a', versao: 1 }, { dados: novos, moldura: 'y', titulo: 'a' });
  assert.ok(r.descricao.includes('Processos: inclui "Upsell", atualiza "Pedido de churn", remove "Onboarding"'));
  assert.ok(r.descricao.includes('Estrutura visual'));
  assert.equal(r.total, 6);
});
t('chaves repetidas caem para posição', () => {
  assert.deepEqual(N.chavesLista([{ id: 'a' }, { id: 'a' }]), ['#0', '#1']);
});

const base = { titulo: 'P', moldura: '<script>' + PROC_MARCADOR + '</script>', descricao: 'teste', versaoBase: 0,
  dados: [{ nome: 'FAQ', tipo: 'valor', valor: [] }] };
t('valida publicação correta', () => { assert.equal(validarPublicacao(base).ok, true); });
t('exige descrição', () => { assert.equal(validarPublicacao({ ...base, descricao: ' ' }).ok, false); });
t('recusa nome repetido', () => { assert.equal(validarPublicacao({ ...base, dados: [base.dados[0], base.dados[0]] }).ok, false); });
t('recusa moldura sem marcador com dados', () => { assert.equal(validarPublicacao({ ...base, moldura: '<p>x</p>' }).ok, false); });
t('aceita documento inteiro sem dados', () => { assert.equal(validarPublicacao({ ...base, moldura: '<p>x</p>', dados: [] }).ok, true); });
t('recusa código que fecha script', () => {
  assert.equal(validarPublicacao({ ...base, dados: [{ nome: 'X', tipo: 'fonte', fonte: 'const X=1;</script>' }] }).ok, false);
});
t('conflito vira 409', () => { assert.equal(erroDoBanco({ code: '40001', message: 'conflito' }).status, 409); });
t('aponta referência quebrada', () => {
  const d = [
    { nome: 'MODELOS', tipo: 'valor', valor: { guia: {} } },
    { nome: 'FLUXOS', tipo: 'valor', valor: [{ id: 'f1', nome: 'Designação', nodes: [{ id: 'a', mod: ['guia', 'sumiu'] }], dispara: ['f2'] }] },
  ];
  const r = N.verificarReferencias(d);
  assert.equal(r.length, 2);
  assert.ok(r[0].includes('usa o modelo sumiu'));
  assert.equal(N.verificarReferencias([{ nome: 'FAQ', tipo: 'valor', valor: [] }]).length, 0);
});
console.log(ok + ' testes passaram');
