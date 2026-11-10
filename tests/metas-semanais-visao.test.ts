// Roda com: npx tsx tests/metas-semanais-visao.test.ts
// Regra do ritmo da semana (PR 2a): meta 1 não vira "atras" antes do último dia útil; meta 2 vira "atras" a partir
// de 60% dos dias úteis com zero feito; realizado ausente fica nulo, nunca zero; superávit não gera falta.
import assert from 'node:assert/strict';
import { diasUteisEntre } from '../lib/ritmo.ts';
import { linhasSemanaAtual, semanasFechadasDoMes, resumoSemanaTime } from '../lib/metas-semanais-visao.ts';
import type { MetasSemanaisCS, ParcelaMetaSemanal } from '../lib/metas-semanais.ts';

// Semana de 09/11 a 15/11/2026: segunda a domingo, cinco dias úteis, sem feriado nacional.
function parcela(over: Partial<ParcelaMetaSemanal>): ParcelaMetaSemanal {
  return {
    inicio: '2026-11-09', fim: '2026-11-15', base: 1, manual: false, deficitRecebido: 0, metaEfetiva: 1,
    realizado: 0, deficitTransferido: null, excedeMeta: false, estado: 'corrente', diasUteis: 5,
    parcelaInicio: '2026-11-09', parcelaFim: '2026-11-15', fechada: false, semData: 0, ...over,
  };
}

function cs(indicadores: { indicador: any; metaMensal: number | null; parcelas: ParcelaMetaSemanal[] }[]): MetasSemanaisCS {
  return {
    cs: 'Vilker', fotoUrl: null, mes: '2026-11-01',
    indicadores: indicadores.map((i) => ({ ...i, mensalRealizado: null, excedeMeta: false, semDataTotal: 0 })),
  };
}

// 1. Contagem de dias úteis da semana.
assert.equal(diasUteisEntre('2026-11-09', '2026-11-15'), 5);
assert.equal(diasUteisEntre('2026-11-09', '2026-11-11'), 3);
assert.equal(diasUteisEntre('2026-11-11', '2026-11-09'), 0);

// 2. Meta 1, meio da semana (quarta, 3 de 5 dias úteis), zero feito: "cedo", nunca "atras".
{
  const m = cs([{ indicador: 'cases', metaMensal: 4, parcelas: [parcela({ metaEfetiva: 1, base: 1 })] }]);
  const l = linhasSemanaAtual(m, '2026-11-11')[0];
  assert.equal(l.status, 'cedo');
  assert.equal(l.falta, 1);
  assert.equal(l.diasUteisRestantes, 2);
}

// 3. Meta 1, último dia útil (sexta) com zero feito: "atras".
{
  const m = cs([{ indicador: 'cases', metaMensal: 4, parcelas: [parcela({ metaEfetiva: 1, base: 1 })] }]);
  assert.equal(linhasSemanaAtual(m, '2026-11-13')[0].status, 'atras');
}

// 4. Meta 2 com zero feito (decisão da #50): quarta (2 dias úteis restantes) é "atencao", porque o que falta cabe nos
// dias restantes. Quinta (1 dia restante) é "atras", porque faltam 2 e não cabem. Regra no cabeçalho do módulo.
{
  const m = cs([{ indicador: 'matchmakings', metaMensal: 8, parcelas: [parcela({ metaEfetiva: 2, base: 2 })] }]);
  assert.equal(linhasSemanaAtual(m, '2026-11-11')[0].status, 'atencao');
  assert.equal(linhasSemanaAtual(m, '2026-11-12')[0].status, 'atras');
}

// 5. Realizado ausente (sem vínculo do CS): nulo em tudo, sem status e sem falta. Não vira zero.
{
  const m = cs([{ indicador: 'upsell', metaMensal: 4, parcelas: [parcela({ metaEfetiva: 2, base: 2, realizado: null })] }]);
  const l = linhasSemanaAtual(m, '2026-11-11')[0];
  assert.equal(l.realizado, null);
  assert.equal(l.falta, null);
  assert.equal(l.status, null);
}

// 6. Superávit: efetiva 8, realizado 12 não gera falta e fica "no ritmo".
{
  const m = cs([{ indicador: 'matchmakings', metaMensal: 40, parcelas: [parcela({ metaEfetiva: 8, base: 8, realizado: 12 })] }]);
  const l = linhasSemanaAtual(m, '2026-11-11')[0];
  assert.equal(l.falta, 0);
  assert.equal(l.status, 'no_ritmo');
}

// 7. Déficit herdado aparece separado da base, e a efetiva é a soma dos dois.
{
  const m = cs([{ indicador: 'cases', metaMensal: 10, parcelas: [parcela({ base: 3, deficitRecebido: 2, metaEfetiva: 5, realizado: 1 })] }]);
  const l = linhasSemanaAtual(m, '2026-11-11')[0];
  assert.equal(l.base, 3);
  assert.equal(l.deficitRecebido, 2);
  assert.equal(l.efetiva, 5);
  assert.equal(l.falta, 4);
}

// 8. Indicador sem meta mensal não entra; semana fechada não entra na semana atual, entra nos fechamentos.
{
  const fechada = parcela({ inicio: '2026-11-02', fim: '2026-11-08', parcelaInicio: '2026-11-02', parcelaFim: '2026-11-08', estado: 'fechada', fechada: true, metaEfetiva: 3, realizado: 0, deficitTransferido: 3, base: 3 });
  const m = cs([
    { indicador: 'rounds', metaMensal: null, parcelas: [parcela({})] },
    { indicador: 'cases', metaMensal: 9, parcelas: [fechada, parcela({ estado: 'futura', metaEfetiva: 3, base: 3 })] },
  ]);
  assert.equal(linhasSemanaAtual(m, '2026-11-11').length, 0, 'cases sem parcela corrente e rounds sem meta: nada');
  const f = semanasFechadasDoMes(m);
  assert.equal(f.length, 1);
  assert.equal(f[0].atingiu, false);
  assert.equal(f[0].deficitTransferido, 3);
}

// 9. Time na semana: soma só CS com realizado apurado; realizado ausente conta como sem apuração, nunca zero.
{
  const a = cs([{ indicador: 'cases', metaMensal: 4, parcelas: [parcela({ metaEfetiva: 2, base: 2, realizado: 1 })] }]);
  const b = cs([{ indicador: 'cases', metaMensal: 4, parcelas: [parcela({ metaEfetiva: 2, base: 2, realizado: null })] }]);
  const r = resumoSemanaTime([a, b], '2026-11-11').find((x) => x.indicador === 'cases')!;
  assert.equal(r.csComMeta, 2);
  assert.equal(r.csSemApuracao, 1);
  assert.equal(r.efetivaTotal, 2, 'só o CS apurado entra na soma da efetiva');
  assert.equal(r.realizadoTotal, 1);
  assert.equal(r.falta, 1);
}

console.log('metas-semanais-visao: ok');
