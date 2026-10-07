// Roda com: node --experimental-strip-types tests/gtd.test.ts
import assert from 'node:assert/strict';
import { taxaGtd, taxaGtdAgregada, blocoEtapa, dividirEtapas, gtdDoConselho, gtdAgregadoCS, cicloAtualPorId } from '../lib/gtd.ts';

assert.equal(taxaGtd(1, 9), 11, 'Zago');
assert.equal(taxaGtd(0, 9), 0);
assert.equal(taxaGtd(9, 9), 100);
assert.equal(taxaGtd(5, 9), 56);
assert.equal(taxaGtd(0, 0), null, 'sem etapas não tem valor');
assert.equal(taxaGtdAgregada([{ feitas: 1, total: 9 }, { feitas: 5, total: 9 }, { feitas: 9, total: 9 }]), 56, 'pooled');
assert.equal(taxaGtdAgregada([]), null);

assert.equal(blocoEtapa('D-1 Verificar a jornada'), 'antes');
assert.equal(blocoEtapa('D+2 Encaminhamentos'), 'depois');
assert.equal(blocoEtapa('D+9 Confirmação Individual e Anúncio da Data'), 'depois');
assert.equal(blocoEtapa('Sem prefixo'), null);
const et = [
  { label: 'D-1 Verificar a jornada', feito: true }, { label: 'D+2 Encaminhamentos', feito: false },
  { label: 'D+4 Gestão de Conhecimento', feito: true }, { label: 'Outro', feito: false },
];
const d = dividirEtapas(et);
assert.equal(d.antes[0].rotulo, 'Verificar a jornada'); assert.equal(d.antes[0].dias, 1); assert.equal(d.depois[1].dias, 4); assert.equal(d.semPrefixo[0].rotulo, 'Outro'); assert.equal(d.semPrefixo[0].dias, null);
assert.equal(d.antes.length, 1); assert.equal(d.depois.length, 2); assert.equal(d.semPrefixo.length, 1);

const n = (s: string) => s.trim().toLowerCase();
const e9 = (feitas: number) => Array.from({ length: 9 }, (_, i) => ({ label: i === 0 ? 'D-1 A' : 'D+' + (i + 1) + ' B', feito: i < feitas }));
const linha = (id: string, membro: string, cs: string, dc: string, feitas: number) => ({
  id_item_conselho: id, membro, cs_responsavel: cs, data_conselho: dc, data_snapshot: '2026-10-07',
  taxa_cumprimento: taxaGtd(feitas, 9), etapas: e9(feitas), etapas_atrasadas: [] as string[],
});
const hist = [
  linha('1', 'Fernando Zago', 'Vilker', '2026-10-16', 1), linha('1', 'Fernando Zago', 'Vilker', '2026-09-23', 9),
  linha('2', 'Gugu', 'Luana', '2026-10-23', 0), linha('2', 'Gugu', 'Luana', '2026-09-25', 5),
];
assert.equal(cicloAtualPorId(hist).length, 2);
const g = gtdDoConselho(hist, 'fernando zago', n);
assert.equal(g.vinculado, true);
assert.deepEqual(g.ciclos.map((c) => c.dataConselho), ['2026-10-16', '2026-09-23']);
assert.equal(g.ciclos[0].atual, true); assert.equal(g.ciclos[0].taxa, 11); assert.equal(g.ciclos[0].feitas, 1);
assert.equal(g.ciclos[0].antes.length, 1); assert.equal(g.ciclos[0].depois.length, 8);
assert.equal(gtdDoConselho(hist, 'Fulano', n).vinculado, false, 'sem vínculo, sem adivinhar');
assert.equal(gtdDoConselho(hist, null, n).ciclos.length, 0);

const ag = gtdAgregadoCS(hist, 'Vilker', n, new Set(['fernando zago']));
assert.equal(ag.conselhos.length, 1); assert.equal(ag.taxa, 11); assert.equal(ag.conselhos[0].vinculado, true);
const ag2 = gtdAgregadoCS(hist, 'Luana', n, new Set());
assert.equal(ag2.conselhos[0].vinculado, false); assert.equal(ag2.taxa, 0);
assert.equal(gtdAgregadoCS(hist, 'Ninguém', n, new Set()).taxa, null);

console.log('gtd: testes aprovados');
