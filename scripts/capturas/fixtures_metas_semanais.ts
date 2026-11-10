// Fixtures das metas semanais para as capturas (home do CS, página do CS e home do gestor). Números do fechamento real
// de 02/11 e de outubro (lidos em 10/11/2026), com o cálculo das funções reais. Dados de exemplo, nunca gravados.
import type { MetasSemanaisCS, ParcelaMetaSemanal, IndicadorSemanal } from '../../lib/metas-semanais.ts';
import { linhasSemanaAtual, semanasFechadasDoMes } from '../../lib/metas-semanais-visao.ts';

export const HOJE = '2026-11-11';

export type Linha = { ind: IndicadorSemanal; base: number | null; def: number | null; efetiva: number | null; real: number | null };

// Semana 02/11 a 08/11, fechada (metas_semanais_fechamento em 10/11/2026).
export const NOV_02: Record<string, Linha[]> = {
  George: [
    { ind: 'cases', base: 3, def: 0, efetiva: 3, real: 0 },
    { ind: 'indicacoes', base: 1, def: 0, efetiva: 1, real: 1 },
    { ind: 'matchmakings', base: 8, def: 0, efetiva: 8, real: 12 },
    { ind: 'matchmakings_resultado', base: 4, def: 0, efetiva: 4, real: 1 },
  ],
  Vilker: [
    { ind: 'cases', base: 2, def: 0, efetiva: 2, real: 0 },
    { ind: 'indicacoes', base: 2, def: 0, efetiva: 2, real: 0 },
    { ind: 'matchmakings', base: 6, def: 0, efetiva: 6, real: 1 },
    { ind: 'matchmakings_resultado', base: 3, def: 0, efetiva: 3, real: 1 },
  ],
};

// Semana 09/11 a 15/11, corrente. Base e realizado ao vivo são de exemplo; o déficit herdado vem do fechamento de 02/11.
export const NOV_09_LIVE: Record<string, { ind: IndicadorSemanal; base: number; real: number }[]> = {
  George: [
    { ind: 'cases', base: 3, real: 1 },
    { ind: 'indicacoes', base: 1, real: 0 },
    { ind: 'matchmakings', base: 8, real: 4 },
    { ind: 'matchmakings_resultado', base: 4, real: 0 },
  ],
  Vilker: [
    { ind: 'cases', base: 2, real: 0 },
    { ind: 'indicacoes', base: 2, real: 0 },
    { ind: 'matchmakings', base: 6, real: 2 },
    { ind: 'matchmakings_resultado', base: 3, real: 1 },
  ],
};

// Outubro, mês fechado. Por CS e indicador, as cinco semanas de fechamento (base, déficit recebido, efetiva, realizado).
export const OUT: Record<string, { ind: IndicadorSemanal; semanas: [string, string, number, number, number, number][] }[]> = {
  George: [
    { ind: 'cases', semanas: [['2026-10-01', '2026-10-04', 1, 0, 1, 0], ['2026-10-05', '2026-10-11', 4, 1, 5, 3], ['2026-10-12', '2026-10-18', 3, 2, 5, 0], ['2026-10-19', '2026-10-25', 3, 5, 8, 7], ['2026-10-26', '2026-10-31', 3, 1, 4, 4]] },
    { ind: 'indicacoes', semanas: [['2026-10-01', '2026-10-04', 0, 0, 0, 1], ['2026-10-05', '2026-10-11', 1, 0, 1, 1], ['2026-10-12', '2026-10-18', 0, 0, 0, 0], ['2026-10-19', '2026-10-25', 1, 0, 1, 1], ['2026-10-26', '2026-10-31', 1, 0, 1, 0]] },
    { ind: 'matchmakings', semanas: [['2026-10-01', '2026-10-04', 4, 0, 4, 0], ['2026-10-05', '2026-10-11', 11, 4, 15, 6], ['2026-10-12', '2026-10-18', 8, 9, 17, 6], ['2026-10-19', '2026-10-25', 10, 11, 21, 33], ['2026-10-26', '2026-10-31', 10, 0, 10, 3]] },
  ],
  Vilker: [
    { ind: 'cases', semanas: [['2026-10-01', '2026-10-04', 1, 0, 1, 0], ['2026-10-05', '2026-10-11', 2, 1, 3, 0], ['2026-10-12', '2026-10-18', 1, 3, 4, 0], ['2026-10-19', '2026-10-25', 2, 4, 6, 1], ['2026-10-26', '2026-10-31', 2, 5, 7, 0]] },
    { ind: 'indicacoes', semanas: [['2026-10-01', '2026-10-04', 0, 0, 0, 0], ['2026-10-05', '2026-10-11', 2, 0, 2, 5], ['2026-10-12', '2026-10-18', 1, 0, 1, 0], ['2026-10-19', '2026-10-25', 2, 1, 3, 1], ['2026-10-26', '2026-10-31', 2, 2, 4, 4]] },
    { ind: 'matchmakings', semanas: [['2026-10-01', '2026-10-04', 3, 0, 3, 1], ['2026-10-05', '2026-10-11', 9, 2, 11, 3], ['2026-10-12', '2026-10-18', 7, 8, 15, 2], ['2026-10-19', '2026-10-25', 9, 13, 22, 14], ['2026-10-26', '2026-10-31', 8, 8, 16, 9]] },
  ],
};

export function parcela(inicio: string, fim: string, over: Partial<ParcelaMetaSemanal>): ParcelaMetaSemanal {
  return {
    inicio, fim, parcelaInicio: inicio, parcelaFim: fim, base: null, manual: false, deficitRecebido: null,
    metaEfetiva: null, realizado: null, deficitTransferido: null, excedeMeta: false, estado: 'futura', diasUteis: 5,
    fechada: false, semData: 0, ...over,
  };
}

// Mês de novembro: semana 02/11 fechada, 09/11 corrente, as demais futuras.
export function mesNovembro(cs: string): MetasSemanaisCS {
  const indicadores = NOV_02[cs].map((l) => {
    const viva = NOV_09_LIVE[cs].find((x) => x.ind === l.ind)!;
    // Déficit leva para a semana seguinte; superávit não reduz (P2), por isso o máximo com zero.
    const deficit09 = Math.max(0, l.efetiva! - (l.real ?? 0));
    const efetiva09 = viva.base + deficit09;
    const p02 = parcela('2026-11-02', '2026-11-08', {
      estado: 'fechada', fechada: true, base: l.base, deficitRecebido: l.def, metaEfetiva: l.efetiva, realizado: l.real,
      deficitTransferido: deficit09, diasUteis: 4,
    });
    const p09 = parcela('2026-11-09', '2026-11-15', {
      estado: 'corrente', base: viva.base, deficitRecebido: deficit09, metaEfetiva: efetiva09, realizado: viva.real,
    });
    const futuras = [parcela('2026-11-16', '2026-11-22', {}), parcela('2026-11-23', '2026-11-29', {}), parcela('2026-11-30', '2026-11-30', { diasUteis: 1 })];
    return { indicador: l.ind, metaMensal: 1, mensalRealizado: null, parcelas: [p02, p09, ...futuras], excedeMeta: false, semDataTotal: 0 };
  });
  return { cs, fotoUrl: null, mes: '2026-11-01', indicadores };
}

// Mês de outubro: todas as semanas fechadas. Semana 1 começa em 01/10; a última termina em 31/10.
export function mesOutubro(cs: string): MetasSemanaisCS {
  const indicadores = OUT[cs].map((x) => ({
    indicador: x.ind, metaMensal: 1, mensalRealizado: null, excedeMeta: false, semDataTotal: 0,
    parcelas: x.semanas.map(([ini, fim, base, def, efetiva, real]) => parcela(ini, fim, {
      estado: 'fechada', fechada: true, base, deficitRecebido: def, metaEfetiva: efetiva, realizado: real,
      deficitTransferido: Math.max(0, efetiva - real), diasUteis: 5,
    })),
  }));
  return { cs, fotoUrl: null, mes: '2026-10-01', indicadores };
}

// Fixture no formato de ini.dado.semanal da home. Mês atual: linhas da semana e fechamentos. Outro mês: só fechamentos.
export function fixtureSemanal(cs: string, mesAtual: boolean) {
  const m = mesAtual ? mesNovembro(cs) : mesOutubro(cs);
  return {
    mes: m.mes, hoje: HOJE, mesAtual,
    linhas: mesAtual ? linhasSemanaAtual(m, HOJE) : [],
    fechadas: semanasFechadasDoMes(m),
  };
}

// Fixture de metas gerais (ini.dado.metas) só para a opção Geral: a mesma leitura do ritmo mensal que a home já usa.
export function metasGeral(cs: string) {
  return NOV_02[cs].filter((l) => l.efetiva !== null).map((l) => ({
    chave: l.ind, label: l.ind, meta: l.efetiva, realizado: l.real, status: 'atencao', previsto: 0,
  }));
}

