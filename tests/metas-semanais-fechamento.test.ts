// Roda com: npx tsx tests/metas-semanais-fechamento.test.ts
// Linhas de fechamento semanal (lib/metas-semanais-fechamento.ts, parte pura): só parcela que terminou, sem sobrescrever
// fechamento anterior, marca retroativo, e preserva ausência como nulo.
import assert from 'node:assert/strict';
import { montarMetasSemanaisCS, type DadosMetas } from '../lib/metas-semanais.ts';
import { linhasDeFechamento, mesesDoFechamento } from '../lib/metas-semanais-fechamento.ts';
import type { CSConfig } from '../lib/reports.ts';

const FERIADOS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];
const cs: CSConfig = {
  nome: 'Rodrigo', nomeCompleto: 'Rodrigo Gianesini', userId: 123, apelidoConselho: null, vezesDestaque: 0,
  fotoUrl: null, metaCarteira: null, ativo: true, ex: false,
};
const dados = (): DadosMetas => ({
  cases: [
    { id: 1, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-04T13:00:00Z' },
  ],
  matchmakings: [], rounds: [], upsell: [], reports: [], feriados: FERIADOS_2026,
  metasMensais: [{ indicador: 'cases', mes: '2026-11-01', cs_nome: 'Rodrigo', valor: 50 }],
  overrides: [], fechamentos: [],
});

// Em 23/11, as parcelas de novembro que já terminaram são 02-08, 09-15 e 16-22. As de 23-29 e 30/11 ainda não.
{
  const r = montarMetasSemanaisCS(cs, '2026-11-01', dados());
  const linhas = linhasDeFechamento(r, '2026-11-23', false);
  const cases = linhas.filter((l) => l.indicador === 'cases');
  assert.deepEqual(cases.map((l) => l.semana_inicio), ['2026-11-02', '2026-11-09', '2026-11-16'], 'só parcelas que terminaram');
  assert.equal(cases[0].realizado, 1, 'realizado da semana 02/11');
  assert.equal(cases[1].realizado, 0);
  // Retroativo: fechada com mais de 7 dias de atraso. A de 16 a 22 terminou há um dia: no prazo.
  assert.equal(cases[0].retroativo, true, '02 a 08 fechada 15 dias depois: retroativa');
  assert.equal(cases[1].retroativo, true, '09 a 15 fechada 8 dias depois: retroativa');
  assert.equal(cases[2].retroativo, false, '16 a 22 fechada no prazo');
}

// Fechamento retroativo: mesma semana fechada 30 dias depois do fim é marcada.
{
  const r = montarMetasSemanaisCS(cs, '2026-11-01', dados());
  const linhas = linhasDeFechamento(r, '2026-12-20', false).filter((l) => l.indicador === 'cases');
  assert.ok(linhas.every((l) => l.retroativo === true), 'fechado bem depois: retroativo');
}

// Parcela já fechada não é regravada, a não ser com reprocessar.
{
  const d = dados();
  d.fechamentos.push({ cs_nome: 'Rodrigo', indicador: 'cases', mes: '2026-11-01', semana_inicio: '2026-11-02', base: 10, realizado: 9 });
  const r = montarMetasSemanaisCS(cs, '2026-11-01', d);
  const semReprocessar = linhasDeFechamento(r, '2026-11-23', false).filter((l) => l.indicador === 'cases');
  assert.ok(!semReprocessar.some((l) => l.semana_inicio === '2026-11-02'), 'já fechada: não regrava');
  const comReprocessar = linhasDeFechamento(r, '2026-11-23', true).filter((l) => l.indicador === 'cases');
  assert.ok(comReprocessar.some((l) => l.semana_inicio === '2026-11-02'), 'com reprocessar: regrava');
  assert.equal(comReprocessar.find((l) => l.semana_inicio === '2026-11-02')!.realizado, 9, 'usa o congelado');
}

// Sem meta mensal: base, déficit e meta efetiva ficam nulos, nunca zero.
{
  const d = dados();
  d.metasMensais = [];
  const r = montarMetasSemanaisCS(cs, '2026-11-01', d);
  const linha = linhasDeFechamento(r, '2026-11-23', false).find((l) => l.indicador === 'cases' && l.semana_inicio === '2026-11-02')!;
  assert.equal(linha.base, null);
  assert.equal(linha.meta_efetiva, null);
  assert.equal(linha.realizado, 1);
}

// Meses do fechamento: em 09/11, fecha outubro e novembro (a última semana de outubro termina depois da virada).
assert.deepEqual(mesesDoFechamento('2026-11-09'), ['2026-10-01', '2026-11-01']);
assert.deepEqual(mesesDoFechamento('2027-01-04'), ['2026-12-01', '2027-01-01']);

console.log('metas-semanais-fechamento: todos os casos passaram');
