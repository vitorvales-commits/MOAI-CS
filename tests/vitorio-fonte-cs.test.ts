// Roda com: npx tsx tests/vitorio-fonte-cs.test.ts
// Fonte certa para cada lado da data de carga (30/10/2026): cs_periodos antes, vigência depois.
import assert from 'node:assert/strict';
import { fonteParaData, elencoAntesDaCarga, csDaCarteira, INICIO_VIGENCIA, type VigenciaConselho } from '../lib/vitorio/fonte-cs.ts';
import type { LinhaPeriodo } from '../lib/cs-periodos.ts';

const HOJE = '2026-11-10';

// Elenco: antes da carga, sempre cs_periodos (setembro); a partir da carga e para o mês corrente, as regras novas.
assert.equal(INICIO_VIGENCIA, '2026-10-30');
assert.equal(fonteParaData('2026-09-15', 'elenco', HOJE).fonte, 'cs_periodos');
assert.equal(fonteParaData('2026-10-29', 'elenco', HOJE).fonte, 'cs_periodos');
assert.equal(fonteParaData('2026-10-30', 'elenco', HOJE).fonte, 'vigencia');
assert.equal(fonteParaData('2026-11-05', 'elenco', HOJE).fonte, 'ativos_hoje');
assert.equal(fonteParaData('2026-11-20', 'elenco', HOJE).fonte, 'ativos_hoje');

// Carteira: antes da carga não existe registro; a partir dela, vigência.
assert.equal(fonteParaData('2026-09-15', 'carteira', HOJE).fonte, 'sem_registro');
assert.equal(fonteParaData('2026-10-29', 'carteira', HOJE).fonte, 'sem_registro');
assert.equal(fonteParaData('2026-10-30', 'carteira', HOJE).fonte, 'vigencia');
assert.equal(fonteParaData('2026-11-05', 'carteira', HOJE).fonte, 'vigencia');

// Cada decisão traz o rótulo que vai para "Como cheguei nisso".
assert.match(fonteParaData('2026-09-15', 'elenco', HOJE).rotulo, /cs_periodos/);
assert.match(fonteParaData('2026-11-05', 'carteira', HOJE).rotulo, /conselho_cs_vigencia/);

// Elenco de setembro: quem estava em cs_periodos naquele mês, inclusive quem já saiu; nunca quem entrou depois.
const periodos: LinhaPeriodo[] = [
  { nome_curto: 'Ana', nome_completo: 'Ana A', primeiro_mes: '2026-08-01', ultimo_mes: '2026-09-01' },
  { nome_curto: 'Bia', nome_completo: 'Bia B', primeiro_mes: '2026-09-01', ultimo_mes: null },
  { nome_curto: 'Caio', nome_completo: 'Caio C', primeiro_mes: '2026-10-01', ultimo_mes: null },
];
assert.deepEqual(elencoAntesDaCarga(periodos, '2026-09-01', HOJE, ['Bia', 'Caio']), ['Ana', 'Bia']);
assert.deepEqual(elencoAntesDaCarga(periodos, '2026-08-01', HOJE, ['Bia', 'Caio']), ['Ana']);

// Carteira por vigência: vazia antes da carga, e depois segue o cs_id da vigência que cobre a data (fim exclusivo).
const vig: VigenciaConselho[] = [
  { group_id: 'g1', cs_id: 7, inicio: '2026-10-30', fim: '2026-11-01' },
  { group_id: 'g1', cs_id: 8, inicio: '2026-11-01', fim: null },
];
assert.equal(csDaCarteira(vig, 'g1', '2026-09-15'), null);
assert.equal(csDaCarteira(vig, 'g1', '2026-10-29'), null);
assert.equal(csDaCarteira(vig, 'g1', '2026-10-31'), 7);
assert.equal(csDaCarteira(vig, 'g1', '2026-11-01'), 8);
assert.equal(csDaCarteira(vig, 'g2', '2026-11-05'), null);

console.log('ok vitorio-fonte-cs');
