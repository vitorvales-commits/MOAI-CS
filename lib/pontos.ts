// Pontos automáticos de advertência (22/10/2026). Puro: sem banco. A apuração roda no SQL
// (apurar_pontos_automaticos); estas funções são o espelho testado das regras de data e de chave, e a
// fonte das mensagens. Se a regra mudar, mude aqui e em valido_ate_do_tipo / status_report_semana_base.
import { PONTOS_REPORT_ATRASADO, PONTOS_RELATORIO_ATRASADO } from './constants.ts';

const MS_HORA = 3_600_000;
const FUSO_SP = '-03:00'; // Brasília não tem horário de verão desde 2019

// Instante em que uma data civil de Brasília (AAAA-MM-DD) começa, às 00:00.
function inicioDoDiaSP(iso: string): Date {
  return new Date(iso + 'T00:00:00' + FUSO_SP);
}
function somarDiasIso(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function diaCivilSP(instante: Date): string {
  return new Date(instante.getTime() - 3 * MS_HORA).toISOString().slice(0, 10);
}

// Último instante do mês corrente em Brasília (23:59:59.999). Mesma regra de fim_do_mes_sp no SQL.
export function fimDoMesSP(aplicadoEm: Date): Date {
  const [a, m] = diaCivilSP(aplicadoEm).split('-').map(Number);
  const primeiroDoProximo = inicioDoDiaSP(new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10));
  return new Date(primeiroDoProximo.getTime() - 1);
}

export type RegraValidade = 'meses' | 'fim_do_mes';
export function validoAteDoTipo(regra: RegraValidade, validadeMeses: number, aplicadoEm: Date): Date {
  if (regra === 'fim_do_mes') return fimDoMesSP(aplicadoEm);
  const d = new Date(aplicadoEm);
  d.setMonth(d.getMonth() + validadeMeses);
  return d;
}

// ---- report semanal: prazo sexta 19h ----
export const REPORT_PRAZO_HORA = 19;
export function prazoReportSexta19(semanaInicio: string): Date {
  return new Date(somarDiasIso(semanaInicio, 4) + 'T' + String(REPORT_PRAZO_HORA).padStart(2, '0') + ':00:00' + FUSO_SP);
}
export type EstadoReport = 'enviado_no_prazo' | 'enviado_com_atraso' | 'pendente' | 'atrasado';
// Mesmo critério de status_report_semana_base: o envio mais antigo decide; enviar às 19h00 ainda é no prazo.
export function estadoReportNoPrazo(semanaInicio: string, enviadoEm: Date | null, agora: Date): EstadoReport {
  const prazo = prazoReportSexta19(semanaInicio).getTime();
  if (enviadoEm) return enviadoEm.getTime() <= prazo ? 'enviado_no_prazo' : 'enviado_com_atraso';
  return agora.getTime() <= prazo ? 'pendente' : 'atrasado';
}
export function geraPontoReportAtrasado(estado: EstadoReport): boolean {
  return estado === 'atrasado' || estado === 'enviado_com_atraso';
}

// ---- relatório do conselho: 7 dias corridos depois do encontro, 23h59 ----
export const RELATORIO_PRAZO_DIAS = 7;
export function prazoRelatorioConselho(dataEncontro: Date): Date {
  const dia = diaCivilSP(dataEncontro);
  return new Date(inicioDoDiaSP(somarDiasIso(dia, RELATORIO_PRAZO_DIAS + 1)).getTime() - 1);
}
export type EstadoRelatorio = 'a_preencher' | 'vence_hoje' | 'atrasado' | 'enviado_no_prazo' | 'enviado_com_atraso';
export function estadoRelatorioConselho(dataEncontro: Date, enviadoEm: Date | null, agora: Date): EstadoRelatorio {
  const prazo = prazoRelatorioConselho(dataEncontro);
  if (enviadoEm) return enviadoEm.getTime() <= prazo.getTime() ? 'enviado_no_prazo' : 'enviado_com_atraso';
  if (agora.getTime() > prazo.getTime()) return 'atrasado';
  return diaCivilSP(agora) === diaCivilSP(prazo) ? 'vence_hoje' : 'a_preencher';
}
export function diasRestantesRelatorio(dataEncontro: Date, agora: Date): number {
  const dia = (d: Date) => Date.parse(diaCivilSP(d) + 'T00:00:00Z');
  return Math.round((dia(prazoRelatorioConselho(dataEncontro)) - dia(agora)) / (24 * MS_HORA));
}

// ---- início do CS: CS novo não leva ponto de antes da entrada (cs_config.inicio_em) ----
// Semana vale se a segunda-feira dela é igual ou posterior ao início; encontro vale se o dia (Brasília) é igual ou posterior.
// Espelha status_report_semana_base e _encontros_relatorio no SQL. inicioEm nulo = sem restrição.
export function semanaObrigatoria(inicioEm: string | null, semanaInicio: string): boolean {
  return inicioEm === null || semanaInicio >= inicioEm;
}
export function encontroObrigatorio(inicioEm: string | null, dataEncontro: Date): boolean {
  return inicioEm === null || diaCivilSP(dataEncontro) >= inicioEm;
}

// ---- chaves de idempotência e texto ----
export const chaveReportAtrasado = (csNome: string, semanaInicio: string) => `report:${csNome}:${semanaInicio}`;
export const chaveRelatorioAtrasado = (groupId: string, dataEncontroIso: string) => `relatorio:${groupId}:${dataEncontroIso}`;
export const PONTOS_AUTOMATICOS = { report_atrasado: PONTOS_REPORT_ATRASADO, relatorio_conselho_atrasado: PONTOS_RELATORIO_ATRASADO } as const;

// Linha de origem do histórico: Automático ou Aplicado por fulano.
export function rotuloOrigem(origem: 'manual' | 'sistema', aplicadoPor: string | null): string {
  return origem === 'sistema' ? 'Automático' : 'Aplicado por ' + (aplicadoPor || 'gestor');
}
