// Visão de metas semanais para as telas (PR 2a). Função pura: recebe o MetasSemanaisCS já calculado por
// metasSemanaisDoCS e devolve as linhas da semana atual e as semanas fechadas do mês. Nenhum número é
// recalculado aqui além do ritmo, que vem de calcularRitmo (lib/ritmo.ts).
//
// Regra do ritmo da semana (decisão PR 2a):
//   previsto = meta efetiva x dias úteis decorridos na semana / dias úteis da semana (hoje incluso).
//   Meta 1: o previsto só passa de 1 no último dia útil da semana, então antes disso o status é "cedo", nunca
//   "atras". Meta 2: "atras" só a partir de 60% dos dias úteis com zero feito (previsto 1,2 sem item).
//   Realizado ausente (sem vínculo do CS) não vira zero: status fica nulo e a tela mostra "sem apuração".
import { calcularRitmo, diasUteisEntre, type StatusRitmo } from './ritmo';
import type { MetasSemanaisCS, ParcelaMetaSemanal, IndicadorSemanal } from './metas-semanais';

export const LABEL_INDICADOR_SEMANAL: Record<IndicadorSemanal, string> = {
  cases: 'Cases de sucesso',
  matchmakings: 'Matchmakings',
  matchmakings_resultado: 'Matchmakings com resultado',
  indicacoes: 'Indicações',
  upsell: 'Upsell',
  rounds: 'Rounds',
};

export interface LinhaSemanaAtual {
  indicador: IndicadorSemanal;
  label: string;
  inicio: string; // AAAA-MM-DD
  fim: string;
  base: number | null; // base da semana (dias úteis), sem déficit herdado
  deficitRecebido: number | null; // déficit da semana anterior que cai nesta
  efetiva: number | null; // meta efetiva da semana: base + déficit recebido
  realizado: number | null; // null quando não há como medir (ausente, não zero)
  falta: number | null; // efetiva menos realizado, nunca negativo
  diasUteisTotal: number;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  previsto: number | null;
  status: StatusRitmo | null; // null quando não há efetiva ou realizado
  semData: number; // itens sem data utilizável no mês (P8), para o detalhe
  excedeMeta: boolean;
}

export interface SemanaFechadaMes {
  indicador: IndicadorSemanal;
  label: string;
  inicio: string;
  fim: string;
  base: number | null;
  deficitRecebido: number | null;
  efetiva: number | null;
  realizado: number | null;
  deficitTransferido: number | null;
  atingiu: boolean | null; // null sem efetiva ou sem realizado
  estado: 'fechada' | 'aguardando_fechamento';
}

// Linhas da semana corrente, uma por indicador de P4 que tem meta mensal. Indicador sem meta mensal não entra.
export function linhasSemanaAtual(m: MetasSemanaisCS, hoje: string): LinhaSemanaAtual[] {
  const saida: LinhaSemanaAtual[] = [];
  for (const ind of m.indicadores) {
    if (ind.metaMensal === null) continue;
    const p: ParcelaMetaSemanal | undefined = ind.parcelas.find((x) => x.estado === 'corrente');
    if (!p) continue;
    saida.push(linhaDe(ind.indicador, p, hoje));
  }
  return saida;
}

function linhaDe(indicador: IndicadorSemanal, p: ParcelaMetaSemanal, hoje: string): LinhaSemanaAtual {
  const total = diasUteisEntre(p.parcelaInicio, p.parcelaFim);
  const decorridos = diasUteisEntre(p.parcelaInicio, hoje < p.parcelaFim ? hoje : p.parcelaFim);
  const efetiva = p.metaEfetiva;
  const realizado = p.realizado;
  const temAmbos = efetiva !== null && realizado !== null;
  const ritmo = efetiva !== null && realizado !== null
    ? calcularRitmo({ indicador, base: 'util', mes: p.parcelaInicio.slice(0, 7), hoje, meta: efetiva, realizado, uteis: { decorridos, total } })
    : null;
  return {
    indicador,
    label: LABEL_INDICADOR_SEMANAL[indicador],
    inicio: p.parcelaInicio,
    fim: p.parcelaFim,
    base: p.base,
    deficitRecebido: p.deficitRecebido,
    efetiva,
    realizado,
    falta: temAmbos ? Math.max(0, efetiva! - realizado!) : null,
    diasUteisTotal: total,
    diasUteisDecorridos: decorridos,
    diasUteisRestantes: total - decorridos,
    previsto: ritmo ? ritmo.previsto : null,
    status: ritmo ? ritmo.status : null,
    semData: p.semData,
    excedeMeta: p.excedeMeta,
  };
}

// Semanas já fechadas (ou aguardando o fechamento de segunda) do mês, para o modo "Semanas do mês".
export function semanasFechadasDoMes(m: MetasSemanaisCS): SemanaFechadaMes[] {
  const saida: SemanaFechadaMes[] = [];
  for (const ind of m.indicadores) {
    if (ind.metaMensal === null) continue;
    for (const p of ind.parcelas) {
      if (p.estado !== 'fechada' && p.estado !== 'aguardando_fechamento') continue;
      const ok = p.metaEfetiva !== null && p.realizado !== null;
      saida.push({
        indicador: ind.indicador,
        label: LABEL_INDICADOR_SEMANAL[ind.indicador],
        inicio: p.parcelaInicio,
        fim: p.parcelaFim,
        base: p.base,
        deficitRecebido: p.deficitRecebido,
        efetiva: p.metaEfetiva,
        realizado: p.realizado,
        deficitTransferido: p.deficitTransferido,
        atingiu: ok ? p.realizado! >= p.metaEfetiva! : null,
        estado: p.estado,
      });
    }
  }
  return saida;
}
