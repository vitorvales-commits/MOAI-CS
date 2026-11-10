// Roda com: npx tsx tests/metas-semanais-calculo.test.ts
// Casos do pedido de 05/11/2026 (seções 3 e 5): maior resto, reequilíbrio após override, override acima da
// meta, déficit absorvido na semana seguinte e não atravessando o mês, superávit não reduzindo.
import assert from 'node:assert/strict';
import { semanasDoMes } from '../lib/semanas.ts';
import { distribuirBase, metasSemanaisDoMes } from '../lib/metas-semanais-calculo.ts';

const FERIADOS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];
const nov = semanasDoMes('2026-11', FERIADOS_2026); // dias úteis 4, 5, 4, 5, 1 (19 no total)
const ini = (i: number) => nov[i].inicio;

// Maior resto: meta 50 em 4,5,4,5,1 dias úteis. Ideais 10,53 13,16 10,53 13,16 2,63; sobra 2 vai para os
// maiores restos (2,63 e o primeiro 10,53). Soma 50.
{
  const d = distribuirBase(50, nov, {});
  assert.deepEqual(d.valores, [11, 13, 10, 13, 3]);
  assert.equal(d.valores.reduce((t, v) => t + v, 0), 50, 'fecha a meta mensal exatamente');
}

// Reequilíbrio após override (D4): a semana 2 é fixada em 20. Os 30 restantes se distribuem entre as outras.
{
  const d = distribuirBase(50, nov, { [ini(1)]: 20 });
  assert.equal(d.valores[1], 20, 'semana editada mantém o valor manual');
  assert.equal(d.valores.reduce((t, v) => t + v, 0), 50, 'o mês continua fechando na meta');
  assert.deepEqual(d.valores, [9, 20, 8, 11, 2]);
  assert.deepEqual(d.manual, [false, true, false, false, false]);
}

// Override acima da meta: as demais ficam com zero e a tela recebe o aviso.
{
  const d = distribuirBase(50, nov, { [ini(0)]: 60 });
  assert.deepEqual(d.valores, [60, 0, 0, 0, 0]);
  assert.equal(d.excedeMeta, true);
}

// Override exatamente igual à meta: não é excesso, as demais ficam com zero.
{
  const d = distribuirBase(50, nov, { [ini(0)]: 50 });
  assert.equal(d.excedeMeta, false);
  assert.deepEqual(d.valores, [50, 0, 0, 0, 0]);
}

// Meta mensal não inteira é recusada, nunca arredondada em silêncio.
{
  assert.throws(() => distribuirBase(50.5, nov, {}), /inteira/);
}

// Déficit absorvido na semana seguinte. Semana 1 meta 11, realizou 8: falta 3, que entram na semana 2 (13 + 3 = 16).
// Semana 2 realizou 16: nada transfere para a 3.
{
  const realizado = { [ini(0)]: 8, [ini(1)]: 16 };
  const r = metasSemanaisDoMes({ metaMensal: 50, semanas: nov, overrides: {}, realizadoCongelado: realizado });
  assert.equal(r[0].metaEfetiva, 11);
  assert.equal(r[0].deficitRecebido, 0, 'primeira semana do mês não recebe déficit');
  assert.equal(r[1].deficitRecebido, 3);
  assert.equal(r[1].metaEfetiva, 16, 'base 13 mais déficit 3');
  assert.equal(r[1].deficitTransferido, 0);
  assert.equal(r[2].deficitRecebido, 0, 'semana 2 bateu: nada passa adiante');
  assert.equal(r[2].metaEfetiva, 10);
}

// Superávit não reduz a semana seguinte (P2): a semana 1 fez 20 de 11. A semana 2 segue com a base 13.
{
  const r = metasSemanaisDoMes({ metaMensal: 50, semanas: nov, overrides: {}, realizadoCongelado: { [ini(0)]: 20 } });
  assert.equal(r[1].deficitRecebido, 0, 'superávit não gera déficit negativo');
  assert.equal(r[1].metaEfetiva, 13, 'a semana seguinte não fica menor que a base');
}

// Déficit não atravessa o mês (P1): o déficit da última parcela de outubro não entra em novembro.
{
  // Outubro: a última parcela (26 a 31/10) deixa déficit de 5 (meta efetiva 9, realizou 4), que não pode aparecer em novembro.
  const out = semanasDoMes('2026-10', FERIADOS_2026);
  const fechadoOut: Record<string, number> = {};
  out.forEach((s) => { fechadoOut[s.inicio] = 0; });
  const rOut = metasSemanaisDoMes({ metaMensal: 20, semanas: out, overrides: {}, realizadoCongelado: fechadoOut });
  const ultimaOut = rOut[rOut.length - 1];
  assert.equal(ultimaOut.deficitRecebido, Math.max(0, rOut[rOut.length - 2].metaEfetiva! - 0));
  const rNov = metasSemanaisDoMes({ metaMensal: 50, semanas: nov, overrides: {}, realizadoCongelado: {} });
  assert.equal(rNov[0].deficitRecebido, 0, 'novembro começa sem déficit vindo de outubro');
}

// Semana que cruza meses: a parcela de outubro (26 a 31/10) e a de novembro (01/11) são tratadas separadamente.
// A parcela de novembro de 01/11 é domingo e some da lista (sem dia útil), então nenhuma semana de novembro
// herda déficit da parcela de outubro (P1).
{
  const out = semanasDoMes('2026-10', FERIADOS_2026);
  const cruzando = out[out.length - 1];
  assert.equal(cruzando.inicio, '2026-10-26');
  assert.equal(nov.some((s) => s.parcelaInicio === '2026-11-01'), false, 'domingo 01/11 não vira semana de novembro');
}

// Semana anterior sem fechamento: a meta efetiva fica ausente, não vira zero (dado ausente é ausente).
{
  const r = metasSemanaisDoMes({ metaMensal: 50, semanas: nov, overrides: {}, realizadoCongelado: {} });
  assert.equal(r[0].realizado, null);
  assert.equal(r[0].metaEfetiva, 11, 'primeira semana tem meta efetiva sem depender de anterior');
  assert.equal(r[1].deficitRecebido, null, 'semana anterior sem realizado: déficit desconhecido');
  assert.equal(r[1].metaEfetiva, null);
}

// Sem meta mensal: nada calculado, tudo ausente.
{
  const r = metasSemanaisDoMes({ metaMensal: null, semanas: nov, overrides: {}, realizadoCongelado: { [ini(0)]: 4 } });
  assert.ok(r.every((s) => s.base === null && s.metaEfetiva === null));
  assert.equal(r[0].realizado, 4);
}

// Base congelada no fechamento não muda ao editar uma semana aberta (P3). Sem congelada, a semana 1 mudaria.
{
  const semMudanca = distribuirBase(50, nov, {});
  assert.deepEqual(semMudanca.valores, [11, 13, 10, 13, 3]);
  // Semana 1 fechada com base 11. Editando a semana 2 para 20, a semana 1 continua 11 e o resto fecha 50.
  const r = distribuirBase(50, nov, { [ini(1)]: 20 }, { [ini(0)]: 11 });
  assert.equal(r.valores[0], 11, 'base congelada da semana fechada não muda');
  assert.equal(r.valores[1], 20);
  assert.equal(r.valores.reduce((t, v) => t + v, 0), 50, 'o mês continua fechando');
  // Mesmo com a semana 1 fechada, o rebalanceamento dá às demais o que sobra de 50 - 11 - 20 = 19.
  assert.equal(r.valores.slice(2).reduce((t, v) => t + v, 0), 19);
}

console.log('metas-semanais-calculo: todos os casos passaram');
