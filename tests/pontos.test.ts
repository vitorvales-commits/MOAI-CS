// Pontos automáticos: datas e chaves (lib/pontos.ts) e leitura de validade (lib/indicadores-base.ts).
// Roda com: npx tsx tests/pontos.test.ts
import assert from 'node:assert/strict';
import {
  fimDoMesSP, validoAteDoTipo, prazoReportSexta19, estadoReportNoPrazo, geraPontoReportAtrasado,
  prazoRelatorioConselho, estadoRelatorioConselho, diasRestantesRelatorio, chaveReportAtrasado, chaveRelatorioAtrasado, rotuloOrigem,
} from '../lib/pontos.ts';
import { advertenciaAtiva, pontuacaoAtiva, pontuacaoHistorica } from '../lib/indicadores-base.ts';

const d = (s: string) => new Date(s);

// ---- report: sexta 19h00 no prazo, 19h01 atrasado (semana de 19/10/2026, sexta 23/10) ----
const semana = '2026-10-19';
assert.equal(prazoReportSexta19(semana).toISOString(), '2026-10-23T22:00:00.000Z');
assert.equal(estadoReportNoPrazo(semana, null, d('2026-10-23T22:00:00Z')), 'pendente', 'exatamente 19h00 ainda é pendente');
assert.equal(estadoReportNoPrazo(semana, null, d('2026-10-23T22:01:00Z')), 'atrasado', '19h01 é atrasado');
assert.equal(estadoReportNoPrazo(semana, d('2026-10-23T22:00:00Z'), d('2026-10-30T12:00:00Z')), 'enviado_no_prazo');
assert.equal(estadoReportNoPrazo(semana, d('2026-10-23T22:01:00Z'), d('2026-10-30T12:00:00Z')), 'enviado_com_atraso', 'enviar depois não anula');
assert.equal(geraPontoReportAtrasado('atrasado'), true);
assert.equal(geraPontoReportAtrasado('enviado_com_atraso'), true);
assert.equal(geraPontoReportAtrasado('pendente'), false);
assert.equal(geraPontoReportAtrasado('enviado_no_prazo'), false);

// ---- validade até o fim do mês, 23h59 de Brasília ----
assert.equal(fimDoMesSP(d('2026-10-31T12:00:00-03:00')).toISOString(), '2026-11-01T02:59:59.999Z', 'aplicada em 31/10 vence em 31/10 23h59');
assert.equal(fimDoMesSP(d('2026-10-22T10:00:00-03:00')).toISOString(), '2026-11-01T02:59:59.999Z');
assert.equal(fimDoMesSP(d('2026-11-01T01:00:00Z')).toISOString(), '2026-11-01T02:59:59.999Z', '31/10 22h em Brasília ainda é outubro');
assert.equal(fimDoMesSP(d('2026-12-15T12:00:00Z')).toISOString(), '2027-01-01T02:59:59.999Z', 'virada de ano');
assert.equal(fimDoMesSP(d('2028-02-10T12:00:00Z')).toISOString(), '2028-03-01T02:59:59.999Z', 'fevereiro bissexto');
assert.equal(validoAteDoTipo('meses', 1, d('2026-09-29T17:23:46Z')).toISOString(), '2026-10-29T17:23:46.000Z');
assert.equal(validoAteDoTipo('fim_do_mes', 1, d('2026-10-22T15:00:00Z')).toISOString(), '2026-11-01T02:59:59.999Z');

// ---- leitura de validade só por valido_ate; anulada fora dos totais ----
const agora = d('2026-10-31T23:00:00-03:00');
assert.equal(advertenciaAtiva('2026-11-01T02:59:59.999Z', agora), true, 'ainda ativa às 23h do último dia');
assert.equal(advertenciaAtiva('2026-11-01T02:59:59.999Z', d('2026-11-01T00:00:00-03:00')), false, 'vencida à meia noite');
const regs = [
  { valido_ate: '2026-11-01T02:59:59.999Z', pontos: 5, anulada_em: null },
  { valido_ate: '2026-11-01T02:59:59.999Z', pontos: 5, anulada_em: '2026-10-25T12:00:00Z' },
  { valido_ate: '2026-09-30T02:59:59.999Z', pontos: 10, anulada_em: null },
];
assert.equal(pontuacaoAtiva(regs, agora), 5, 'anulada e vencida não contam nos ativos');
assert.equal(pontuacaoHistorica(regs), 15, 'histórico inclui vencida e exclui anulada');

// ---- relatório do conselho: sétimo dia 23h59 e 00h00 do oitavo ----
const encontro = d('2026-10-14T17:00:00Z'); // 14/10 14h em Brasília
assert.equal(prazoRelatorioConselho(encontro).toISOString(), '2026-10-22T02:59:59.999Z', 'prazo = 21/10 23h59 Brasília');
assert.equal(estadoRelatorioConselho(encontro, null, d('2026-10-22T02:59:00Z')), 'vence_hoje', 'sétimo dia 23h58 ainda vale');
assert.equal(estadoRelatorioConselho(encontro, null, d('2026-10-22T03:00:00Z')), 'atrasado', '00h00 do oitavo dia é atrasado');
assert.equal(estadoRelatorioConselho(encontro, null, d('2026-10-15T12:00:00Z')), 'a_preencher');
assert.equal(estadoRelatorioConselho(encontro, d('2026-10-22T02:59:00Z'), d('2026-10-30T12:00:00Z')), 'enviado_no_prazo');
assert.equal(estadoRelatorioConselho(encontro, d('2026-10-22T03:00:00Z'), d('2026-10-30T12:00:00Z')), 'enviado_com_atraso');
assert.equal(diasRestantesRelatorio(encontro, d('2026-10-15T12:00:00Z')), 6);
assert.equal(diasRestantesRelatorio(encontro, d('2026-10-21T20:00:00Z')), 0);
assert.equal(diasRestantesRelatorio(encontro, d('2026-10-23T12:00:00Z')), -2);

// ---- chaves e rótulos ----
assert.equal(chaveReportAtrasado('Rodrigo', '2026-10-26'), 'report:Rodrigo:2026-10-26');
assert.equal(chaveRelatorioAtrasado('group_x', '2026-10-14T17:00:00+00:00'), 'relatorio:group_x:2026-10-14T17:00:00+00:00');
assert.equal(rotuloOrigem('sistema', null), 'Automático');
assert.equal(rotuloOrigem('manual', 'vitor@x'), 'Aplicado por vitor@x');

console.log('pontos: todos os testes aprovados');
