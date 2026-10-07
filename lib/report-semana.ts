// Status do report semanal por CS e semana (07/10/2026). Função única, usada pelas Urgências, pelos
// Insights e reaproveitável pela aba Report do CS. Semana de segunda a domingo, prazo na sexta.
// Pura: datas ISO AAAA-MM-DD, nada de banco.
// Roda com: node --experimental-strip-types tests/report-semana.test.ts
import { REPORT_DIA_PRAZO, REPORT_SEGUNDA_FECHA_SEMANA_ANTERIOR } from './constants.ts';
import { diaNumero, isoDeDia } from './gtd-prazos.ts';

// Dia da semana ISO: 1 segunda, 7 domingo.
export function diaSemanaISO(iso: string): number {
  const n = diaNumero(iso) as number;
  return ((((n + 3) % 7) + 7) % 7) + 1;
}
export function segundaDaSemana(iso: string): string {
  return isoDeDia((diaNumero(iso) as number) - (diaSemanaISO(iso) - 1));
}

// Segunda feira da última semana cuja sexta de prazo já terminou. Na própria sexta, o prazo ainda
// vale até 23h59: a semana de referência é a anterior.
export function semanaReferenciaReport(hoje: string): string {
  const h = diaNumero(hoje) as number, dow = diaSemanaISO(hoje);
  const recuo = (dow - REPORT_DIA_PRAZO + 7) % 7;
  const sexta = recuo === 0 ? h - 7 : h - recuo;
  return isoDeDia(sexta - (REPORT_DIA_PRAZO - 1));
}

export type StatusReport = 'em_dia' | 'com_atraso' | 'pendente';

// Atribui um envio do Monday à semana e ao status pela data de envio. Terça a sexta: semana da
// própria data, em dia. Sábado e domingo: semana da própria data, com atraso. Segunda: semana
// anterior, com atraso (REPORT_SEGUNDA_FECHA_SEMANA_ANTERIOR).
export function atribuiReport(envio: string): { semana: string; status: StatusReport } {
  const dow = diaSemanaISO(envio), e = diaNumero(envio) as number;
  if (dow === 1 && REPORT_SEGUNDA_FECHA_SEMANA_ANTERIOR) return { semana: isoDeDia(e - 7), status: 'com_atraso' };
  return { semana: isoDeDia(e - (dow - 1)), status: dow <= REPORT_DIA_PRAZO ? 'em_dia' : 'com_atraso' };
}

export type EnvioReport = { tipo: 'nativo'; semana: string; data: string } | { tipo: 'monday'; data: string };

// Status da semana para um CS. O nativo vence o do Monday na mesma semana. Entre envios do Monday
// que caem na semana, o primeiro envio vence.
export function statusReportSemana(semana: string, envios: EnvioReport[]): StatusReport {
  const s = diaNumero(semana) as number;
  const nativo = envios.find((e) => e.tipo === 'nativo' && e.semana === semana);
  if (nativo) return (diaNumero(nativo.data) as number) <= s + (REPORT_DIA_PRAZO - 1) ? 'em_dia' : 'com_atraso';
  const candidatos = envios
    .filter((e) => e.tipo === 'monday')
    .map((e) => ({ data: e.data, ...atribuiReport(e.data) }))
    .filter((c) => c.semana === semana)
    .sort((a, b) => (diaNumero(a.data) as number) - (diaNumero(b.data) as number));
  return candidatos.length ? candidatos[0].status : 'pendente';
}

// As últimas n semanas de referência, da mais antiga para a mais recente.
export function semanasRecentes(hoje: string, n: number): string[] {
  const ref = diaNumero(semanaReferenciaReport(hoje)) as number;
  return Array.from({ length: n }, (_, i) => isoDeDia(ref - 7 * (n - 1 - i)));
}
