// Alerta de NPS (22/10/2026). Puro: sem banco. Espelho testado de alertas_nps_candidatos() no SQL, que é
// quem grava em alertas_nps; este arquivo é a regra de referência e a fonte do texto da fila de ação.
// Encontro de NPS = group_id mais mes_grupo_titulo. Respostas sem group_id não alertam (seguem na contagem
// de aliases pendentes). Detrator e nota do CS baixa são individuais e nominais; NPS e média do encontro
// são agregados e só valem com a amostra mínima.
import {
  ALERTA_NPS_LIMIAR_DETRATOR, ALERTA_NPS_LIMIAR_NOTA_CS, ALERTA_NPS_MINIMO, ALERTA_NPS_MEDIA_MINIMA,
  ALERTA_NPS_AMOSTRA_MINIMA,
} from './constants.ts';

export type CriterioAlertaNps = 'detrator' | 'nota_cs_baixa' | 'nps_encontro' | 'media_encontro';

export type ConfigAlertaNps = {
  limiarDetrator: number; limiarNotaCs: number; npsMinimo: number; mediaMinima: number; amostraMinima: number;
};
export const CONFIG_ALERTA_NPS_PADRAO: ConfigAlertaNps = {
  limiarDetrator: ALERTA_NPS_LIMIAR_DETRATOR, limiarNotaCs: ALERTA_NPS_LIMIAR_NOTA_CS,
  npsMinimo: ALERTA_NPS_MINIMO, mediaMinima: ALERTA_NPS_MEDIA_MINIMA, amostraMinima: ALERTA_NPS_AMOSTRA_MINIMA,
};
// Linha de alerta_nps_config (snake_case) para o formato acima.
export function configDeLinha(r: any): ConfigAlertaNps {
  return {
    limiarDetrator: Number(r.limiar_detrator), limiarNotaCs: Number(r.limiar_nota_cs), npsMinimo: Number(r.nps_minimo),
    mediaMinima: Number(r.media_minima), amostraMinima: Number(r.amostra_minima),
  };
}

export type RespostaNps = {
  groupId: string | null; mes: string; respondente: string | null;
  notaConselheiro: number | null; notaCs: number | null;
  comentarioConselheiro?: string | null; comentarioCs?: string | null;
};
export type AlertaNps = {
  groupId: string; mes: string; criterio: CriterioAlertaNps; respondente: string | null;
  valor: number; referencia: number; amostra: number | null; comentario: string | null;
};

const SEM_NOME = '(sem nome)';
const arredonda = (x: number, casas: number) => Math.round(x * 10 ** casas) / 10 ** casas;

export function avaliarAlertasNps(respostas: RespostaNps[], config: ConfigAlertaNps = CONFIG_ALERTA_NPS_PADRAO): AlertaNps[] {
  const validas = respostas.filter((r): r is RespostaNps & { groupId: string } => !!r.groupId);
  const saida = new Map<string, AlertaNps>();
  const guardar = (a: AlertaNps) => {
    // Mesmo fato nunca vira dois alertas: com respostas repetidas do mesmo respondente fica a pior nota.
    const chave = [a.groupId, a.mes, a.criterio, a.respondente || ''].join('|');
    const atual = saida.get(chave);
    if (!atual || a.valor < atual.valor) saida.set(chave, a);
  };

  validas.forEach((r) => {
    const nome = (r.respondente || '').trim() || SEM_NOME;
    if (r.notaConselheiro !== null && r.notaConselheiro <= config.limiarDetrator) {
      guardar({ groupId: r.groupId, mes: r.mes, criterio: 'detrator', respondente: nome, valor: r.notaConselheiro, referencia: config.limiarDetrator, amostra: null, comentario: (r.comentarioConselheiro || '').trim() || null });
    }
    if (r.notaCs !== null && r.notaCs <= config.limiarNotaCs) {
      guardar({ groupId: r.groupId, mes: r.mes, criterio: 'nota_cs_baixa', respondente: nome, valor: r.notaCs, referencia: config.limiarNotaCs, amostra: null, comentario: (r.comentarioCs || '').trim() || null });
    }
  });

  const porEncontro = new Map<string, { groupId: string; mes: string; notas: number[] }>();
  validas.forEach((r) => {
    if (r.notaConselheiro === null) return;
    const chave = r.groupId + '|' + r.mes;
    const e = porEncontro.get(chave) || { groupId: r.groupId, mes: r.mes, notas: [] };
    e.notas.push(r.notaConselheiro);
    porEncontro.set(chave, e);
  });
  porEncontro.forEach((e) => {
    const n = e.notas.length;
    if (n < config.amostraMinima) return;
    const promotores = e.notas.filter((x) => x >= 9).length;
    const detratores = e.notas.filter((x) => x <= config.limiarDetrator).length;
    const nps = arredonda((100 * (promotores - detratores)) / n, 1);
    const media = arredonda(e.notas.reduce((s, x) => s + x, 0) / n, 2);
    if (nps < config.npsMinimo) guardar({ groupId: e.groupId, mes: e.mes, criterio: 'nps_encontro', respondente: null, valor: nps, referencia: config.npsMinimo, amostra: n, comentario: null });
    if (media < config.mediaMinima) guardar({ groupId: e.groupId, mes: e.mes, criterio: 'media_encontro', respondente: null, valor: media, referencia: config.mediaMinima, amostra: n, comentario: null });
  });

  return [...saida.values()];
}

// ---- texto da fila de ação: as quatro partes fixas ----
export type TextoAlertaNps = { oQue: string; numero: string; acao: string; quem: string };
const fmt = (n: number) => String(n).replace('.', ',');

export function textoAlertaNps(a: Pick<AlertaNps, 'criterio' | 'respondente' | 'valor' | 'referencia' | 'amostra'>, conselho: string, csResponsavel: string | null): TextoAlertaNps {
  const quem = csResponsavel || 'CS responsável';
  switch (a.criterio) {
    case 'detrator':
      return {
        oQue: `${a.respondente} deu nota ${fmt(a.valor)} ao conselheiro em ${conselho}`,
        numero: `Nota ${fmt(a.valor)}; detrator é nota até ${fmt(a.referencia)}`,
        acao: 'Contatar o membro em até 48 horas, antes que vire churn.',
        quem,
      };
    case 'nota_cs_baixa':
      return {
        oQue: `${a.respondente} deu nota ${fmt(a.valor)} ao CS em ${conselho}`,
        numero: `Nota ${fmt(a.valor)}; o corte é ${fmt(a.referencia)}`,
        acao: 'Conversar com o CS e com o membro sobre o que faltou na condução.',
        quem,
      };
    case 'nps_encontro':
      return {
        oQue: `NPS do conselheiro abaixo do corte em ${conselho}`,
        numero: `NPS ${fmt(a.valor)} contra o mínimo de ${fmt(a.referencia)}, com ${a.amostra} respostas`,
        acao: 'Conversar com o conselheiro e com o CS sobre o encontro.',
        quem,
      };
    case 'media_encontro':
      return {
        oQue: `Média das notas do conselheiro abaixo do corte em ${conselho}`,
        numero: `Média ${fmt(a.valor)} contra o mínimo de ${fmt(a.referencia)}, com ${a.amostra} respostas`,
        acao: 'Conversar com o conselheiro e com o CS sobre o encontro.',
        quem,
      };
  }
}
