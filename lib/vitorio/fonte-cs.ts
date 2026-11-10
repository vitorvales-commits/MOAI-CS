// Qual fonte responde "quem era CS" e "quem cuidava de um conselho" numa data (Vitorio 2, B1).
// Puro: não acessa banco. canonico.conselho_cs_vigencia só tem histórico desde INICIO_VIGENCIA (carga inicial).
// Antes disso, o elenco de um mês vem de cs_periodos com a mesma regra do dash (csDoMes / nomesDoRoster).
// Carteira (qual CS cuidava de qual conselho) antes da carga não tem fonte: o Vitorio diz que não tem o registro.
import { nomesDoRoster, type LinhaPeriodo } from '../cs-periodos.ts';

export const INICIO_VIGENCIA = '2026-10-30';

export type Pergunta = 'elenco' | 'carteira';
export type FonteCs = 'vigencia' | 'cs_periodos' | 'ativos_hoje' | 'sem_registro';

export interface FonteDecidida { fonte: FonteCs; rotulo: string }

const ROTULO: Record<FonteCs, string> = {
  vigencia: 'vigências de conselho (canonico.conselho_cs_vigencia, desde 30/10/2026)',
  cs_periodos: 'períodos de CS (cs_periodos, regra quem_era_cs do dash)',
  ativos_hoje: 'CS ativos hoje (cs_config, mês corrente ou futuro)',
  sem_registro: 'sem registro para essa data',
};

// Decide a fonte. dataIso é AAAA-MM-DD; para elenco de mês, vale o primeiro dia do mês.
export function fonteParaData(dataIso: string, pergunta: Pergunta, hojeIso: string): FonteDecidida {
  const d = dataIso.slice(0, 10);
  if (pergunta === 'elenco' && d.slice(0, 7) >= hojeIso.slice(0, 7)) {
    return { fonte: 'ativos_hoje', rotulo: ROTULO.ativos_hoje };
  }
  if (d >= INICIO_VIGENCIA) return { fonte: 'vigencia', rotulo: ROTULO.vigencia };
  if (pergunta === 'elenco') return { fonte: 'cs_periodos', rotulo: ROTULO.cs_periodos };
  return { fonte: 'sem_registro', rotulo: ROTULO.sem_registro };
}

// Elenco de um mês fechado antes da carga: nomes de cs_periodos, pela mesma regra do dash.
export function elencoAntesDaCarga(periodos: LinhaPeriodo[], mesIso: string, hojeIso: string, ativosHoje: string[]): string[] {
  return nomesDoRoster(periodos, mesIso, hojeIso, ativosHoje).nomes;
}

export interface VigenciaConselho { group_id: string; cs_id: number; inicio: string; fim: string | null }

// Quem cuidava do conselho na data, pela vigência. null quando a vigência não cobre a data.
export function csDaCarteira(vigencias: VigenciaConselho[], groupId: string, dataIso: string): number | null {
  const d = dataIso.slice(0, 10);
  const v = vigencias.find((x) => x.group_id === groupId && x.inicio <= d && (x.fim === null || x.fim > d));
  return v ? v.cs_id : null;
}
