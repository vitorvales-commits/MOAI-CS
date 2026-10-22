// Alerta de NPS: critérios, amostra mínima, nominal contra agregado e texto da fila.
// Roda com: npx tsx tests/alertas-nps.test.ts
import assert from 'node:assert/strict';
import { avaliarAlertasNps, textoAlertaNps, CONFIG_ALERTA_NPS_PADRAO, configDeLinha } from '../lib/alertas-nps.ts';
import { ALERTA_NPS_AMOSTRA_MINIMA, ALERTA_NPS_LIMIAR_DETRATOR } from '../lib/constants.ts';

const resp = (nota: number | null, extra: Partial<Parameters<typeof avaliarAlertasNps>[0][number]> = {}, i = 0) => ({
  groupId: 'g1', mes: 'Setembro 2026', respondente: 'Pessoa ' + i, notaConselheiro: nota, notaCs: 10, ...extra,
});
const lote = (notas: number[]) => notas.map((n, i) => resp(n, {}, i));

// ---- detrator: 6 alerta, 7 não ----
assert.equal(ALERTA_NPS_LIMIAR_DETRATOR, 6);
let a = avaliarAlertasNps([resp(6, { respondente: 'Ana', comentarioConselheiro: 'Faltou preparo' })]);
assert.equal(a.length, 1);
assert.deepEqual([a[0].criterio, a[0].respondente, a[0].valor, a[0].comentario], ['detrator', 'Ana', 6, 'Faltou preparo']);
assert.equal(avaliarAlertasNps([resp(7)]).length, 0, 'nota 7 não é detrator');

// ---- nota do CS baixa: individual, nominal ----
a = avaliarAlertasNps([resp(10, { notaCs: 6, respondente: 'Bia', comentarioCs: 'Pouco contato' })]);
assert.deepEqual(a.map((x) => [x.criterio, x.respondente, x.valor]), [['nota_cs_baixa', 'Bia', 6]]);
assert.equal(avaliarAlertasNps([resp(10, { notaCs: 7 })]).length, 0);

// ---- agregados só com 5 respostas: 4 não avalia, 5 avalia ----
assert.equal(ALERTA_NPS_AMOSTRA_MINIMA, 5);
const ruins4 = lote([7, 7, 7, 7]); // NPS -0, média 7: abaixo dos dois cortes, mas só 4 respostas
assert.equal(avaliarAlertasNps(ruins4).length, 0, 'com 4 respostas não há alerta agregado');
const ruins5 = avaliarAlertasNps(lote([7, 7, 7, 7, 7]));
assert.deepEqual(ruins5.map((x) => x.criterio).sort(), ['media_encontro', 'nps_encontro']);
const nps = ruins5.find((x) => x.criterio === 'nps_encontro')!;
assert.deepEqual([nps.valor, nps.referencia, nps.amostra, nps.respondente], [0, 70, 5, null]);
assert.equal(ruins5.find((x) => x.criterio === 'media_encontro')!.valor, 7);

// ---- NPS e média: exatamente no corte não alerta ----
// 7 promotores e 3 neutros: NPS 70 (no corte, não alerta) e média 9,1 (acima de 8,5)
assert.equal(avaliarAlertasNps(lote([9, 9, 9, 9, 9, 9, 9, 8, 8, 8])).length, 0);
// NPS abaixo de 70 com média boa: 6 promotores, 1 detrator, 3 neutros = NPS 50; média 8,7
const so = avaliarAlertasNps(lote([10, 10, 10, 10, 10, 9, 8, 8, 8, 4]));
assert.deepEqual(so.map((x) => x.criterio).sort(), ['detrator', 'nps_encontro']);

// ---- Julio Faccioli em setembro: 11 respostas, NPS 63,6 ----
const julio = avaliarAlertasNps(lote([10, 10, 10, 10, 10, 10, 9, 9, 8, 2, 8]).map((r, i) => ({ ...r, groupId: 'faccioli', respondente: i === 9 ? 'Juliana' : r.respondente })));
const n = julio.find((x) => x.criterio === 'nps_encontro')!;
assert.deepEqual([n.valor, n.amostra], [63.6, 11]);

// ---- sem group_id não alerta; encontros diferentes não se misturam ----
assert.equal(avaliarAlertasNps(lote([1, 1, 1, 1, 1]).map((r) => ({ ...r, groupId: null }))).length, 0);
const dois = avaliarAlertasNps([...lote([7, 7, 7, 7, 7]), ...lote([10, 10, 10, 10, 10]).map((r) => ({ ...r, groupId: 'g2' }))]);
assert.ok(dois.every((x) => x.groupId === 'g1'));

// ---- mesmo respondente duas vezes no mesmo encontro: um alerta só, com a pior nota ----
a = avaliarAlertasNps([resp(5, { respondente: 'Caio' }), resp(3, { respondente: 'Caio' })]);
assert.deepEqual(a.map((x) => x.valor), [3]);

// ---- configuração editável muda o resultado ----
assert.equal(avaliarAlertasNps([resp(7)], { ...CONFIG_ALERTA_NPS_PADRAO, limiarDetrator: 7 }).length, 1);
assert.deepEqual(configDeLinha({ limiar_detrator: '6', limiar_nota_cs: '6', nps_minimo: '70', media_minima: '8.5', amostra_minima: 5 }), CONFIG_ALERTA_NPS_PADRAO);

// ---- texto da fila: quatro partes ----
const t = textoAlertaNps({ criterio: 'detrator', respondente: 'Ana', valor: 5, referencia: 6, amostra: null }, 'Fast Track | Julio Faccioli (Vitor)', 'Vitor');
assert.ok(t.oQue.includes('Ana') && t.numero.includes('5') && t.acao.includes('48 horas') && t.quem === 'Vitor');
const t2 = textoAlertaNps({ criterio: 'media_encontro', respondente: null, valor: 8.2, referencia: 8.5, amostra: 7 }, 'X', null);
assert.ok(t2.numero.includes('8,2') && t2.numero.includes('8,5') && t2.quem === 'CS responsável');
for (const x of [t, t2]) for (const campo of Object.values(x)) assert.ok(!/[–—-]/.test(campo.replace(/Fast Track \| Julio Faccioli \(Vitor\)/, '').replace(/^X$/, '')), 'sem travessão nem hífen: ' + campo);

console.log('alertas-nps: todos os testes aprovados');
