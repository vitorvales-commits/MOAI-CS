// Roda com: npx tsx tests/metas-semanais.test.ts
// Montagem das metas semanais de um CS a partir de dados já carregados (lib/metas-semanais.ts, parte pura).
import assert from 'node:assert/strict';
import { montarMetasSemanaisCS, type DadosMetas } from '../lib/metas-semanais.ts';
import type { CSConfig } from '../lib/reports.ts';

const FERIADOS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];
const MES = '2026-11-01';

const cs = (over: Partial<CSConfig> = {}): CSConfig => ({
  nome: 'Rodrigo', nomeCompleto: 'Rodrigo Gianesini', userId: 123, apelidoConselho: null, vezesDestaque: 0,
  fotoUrl: null, metaCarteira: null, ativo: true, ex: false, ...over,
});

const vazio = (): DadosMetas => ({
  cases: [], matchmakings: [], rounds: [], upsell: [], reports: [], feriados: FERIADOS_2026,
  metasMensais: [], overrides: [], fechamentos: [],
});

const parcela = (r: ReturnType<typeof montarMetasSemanaisCS>, ind: string, i: number) =>
  r.indicadores.find((x) => x.indicador === ind)!.parcelas[i];

// 1. Meta de 50 em cases: bases 11, 13, 10, 13 e 3, fechando a meta mensal. CS vinculado sem itens: realizado zero.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'cases', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  const r = montarMetasSemanaisCS(cs(), MES, d);
  const ps = r.indicadores.find((x) => x.indicador === 'cases')!.parcelas;
  assert.deepEqual(ps.map((p) => p.base), [11, 13, 10, 13, 3]);
  assert.equal(ps.reduce((t, p) => t + (p.base ?? 0), 0), 50, 'soma das bases fecha a meta mensal');
  assert.equal(ps[0].realizado, 0, 'CS vinculado sem itens mostra zero, porque o zero é medido');
}

// 2. Déficit encadeado: semana 2-8 realizou 3 (base 13), semana 9-15 realizou 2. Dados de cases por created_at_monday.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'cases', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  d.cases.push(
    { id: 1, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-04T13:00:00Z' },
    { id: 2, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-04T14:00:00Z' },
    { id: 3, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-04T15:00:00Z' },
    { id: 4, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-10T12:00:00Z' },
    { id: 5, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-10T12:00:00Z' },
  );
  const ps = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'cases')!.parcelas;
  assert.equal(ps[0].realizado, 3, 'três cases entre 02 e 08/11');
  assert.equal(ps[1].realizado, 2, 'dois cases entre 09 e 15/11');
  assert.equal(ps[1].deficitRecebido, 11 - 3, 'déficit de 8 da semana 1');
  assert.equal(ps[1].metaEfetiva, 13 + 8);
  assert.equal(ps[2].deficitRecebido, 21 - 2);
  assert.equal(ps[2].metaEfetiva, 10 + 19);
}

// 3. Item de cases sem data, no grupo de novembro: não entra em semana nenhuma e aparece como sem data (P8).
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'cases', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  d.cases.push({ id: 9, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: null });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'cases')!;
  assert.equal(ind.semDataTotal, 1);
  assert.ok(ind.parcelas.every((p) => p.realizado === 0), 'sem data não cai em semana');
}

// 4. D7: matchmaking de outubro com resultado registrado em novembro conta em novembro, não em outubro.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'matchmakings_resultado', mes: MES, cs_nome: 'Rodrigo', valor: 10 });
  d.matchmakings.push({
    id: 7, creator_id: 123, mes_grupo_titulo: 'Outubro 2026', data: '2026-10-20', created_at_monday: '2026-10-16T16:18:56Z',
    resultado: 'Negocio fechado', resultado_registrado_em: '2026-11-03T14:03:50Z',
  });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'matchmakings_resultado')!;
  assert.equal(ind.parcelas[0].realizado, 1, 'resultado de 03/11 conta na semana de 02/11');
  assert.equal(ind.mensalRealizado, 1, 'e no mês de novembro');
}

// 5. Matchmakings sem resultado não entram em matchmakings_resultado.
{
  const d = vazio();
  d.matchmakings.push({ id: 8, creator_id: 123, mes_grupo_titulo: 'Novembro 2026', data: '2026-11-04', created_at_monday: null, resultado: '  ', resultado_registrado_em: null });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'matchmakings_resultado')!;
  assert.ok(ind.parcelas.every((p) => p.realizado === 0));
}

// 6. Sem userId do Monday: matchmakings fica ausente (null), nunca zero, e o déficit seguinte também fica ausente.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'matchmakings', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  const ind = montarMetasSemanaisCS(cs({ userId: null }), MES, d).indicadores.find((x) => x.indicador === 'matchmakings')!;
  assert.equal(ind.parcelas[0].realizado, null);
  assert.equal(ind.parcelas[1].deficitRecebido, null, 'sem realizado anterior, déficit é desconhecido');
  assert.equal(ind.parcelas[1].metaEfetiva, null);
}

// 7. Semana fechada usa o realizado congelado (P3), mesmo que os itens ao vivo digam outra coisa.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'cases', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  d.fechamentos.push({ cs_nome: 'Rodrigo', indicador: 'cases', mes: MES, semana_inicio: '2026-11-02', realizado: 5 });
  const ps = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'cases')!.parcelas;
  assert.equal(ps[0].realizado, 5);
  assert.equal(ps[0].fechada, true);
  assert.equal(ps[1].deficitRecebido, 6, 'déficit usa o congelado: 11 menos 5');
}

// 8. Override: semana 2 fixada em 20; as demais se reequilibram e fecham 50 (D4).
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'cases', mes: MES, cs_nome: 'Rodrigo', valor: 50 });
  d.overrides.push({ cs_nome: 'Rodrigo', indicador: 'cases', mes: MES, semana_inicio: '2026-11-09', valor: 20 });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'cases')!;
  assert.deepEqual(ind.parcelas.map((p) => p.base), [9, 20, 8, 11, 2]);
  assert.equal(ind.parcelas[1].manual, true);
  assert.equal(ind.excedeMeta, false);
}

// 9. Indicações vêm do report pelo nome do CS, com a data do report.
{
  const d = vazio();
  d.metasMensais.push({ indicador: 'indicacoes', mes: MES, cs_nome: 'Rodrigo', valor: 10 });
  d.reports.push({ cs_nome: 'RODRIGO', data_efetiva: '2026-11-05', indicacoes: 2 });
  d.reports.push({ cs_nome: 'Outro CS', data_efetiva: '2026-11-05', indicacoes: 9 });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'indicacoes')!;
  assert.equal(ind.parcelas[0].realizado, 2, 'só o report do próprio CS, com nome em outra caixa');
}

// 10. Sem meta mensal cadastrada: base e meta efetiva ausentes, realizado continua medido.
{
  const d = vazio();
  d.cases.push({ id: 11, cs_raw: 'Rodrigo Gianesini', mes_grupo_titulo: 'Novembro 2026', created_at_monday: '2026-11-04T13:00:00Z' });
  const ind = montarMetasSemanaisCS(cs(), MES, d).indicadores.find((x) => x.indicador === 'cases')!;
  assert.equal(ind.metaMensal, null);
  assert.ok(ind.parcelas.every((p) => p.base === null && p.metaEfetiva === null));
  assert.equal(ind.parcelas[0].realizado, 1);
}

console.log('metas-semanais: todos os casos passaram');
