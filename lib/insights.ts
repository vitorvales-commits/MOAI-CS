// Insights da Visão geral do gestor (07/10/2026). Regras fixas e determinísticas, sem IA e sem custo
// por acesso. O catálogo é uma lista de registros: nova regra exige só um novo registro em
// CATALOGO_INSIGHTS. Cada insight tem quatro partes fixas: o que está acontecendo, o número com a
// referência, a ação recomendada e quem age. Módulo puro, recebe o contexto já calculado no
// servidor. Texto sem travessão e sem hífen.
// Roda com: node --experimental-strip-types tests/insights.test.ts
import {
  INSIGHT_RITMO_LIMIAR, INSIGHT_GTD_ETAPA_LIMIAR, INSIGHT_REPORT_ADESAO_LIMIAR,
  INSIGHT_ADVERTENCIA_ALERTA_PONTOS, INSIGHT_GTD_CONCENTRACAO_MIN_ATRASADAS, INSIGHTS_MAX_VISIVEIS,
} from './constants.ts';

export type Severidade = 'alta' | 'media' | 'baixa';
export type Insight = {
  id: string; severidade: Severidade;
  oQue: string; numero: string; referencia: string; acao: string; responsaveis: string[];
  impacto: number;
};

export type CtxInsights = {
  hoje: string; diaDoMes: number; diasNoMes: number;
  // Indicadores do mês por CS ativo (calculado e meta). Chaves: casesSucesso, matchmakings, rounds,
  // upsell, indicacoes, churn.
  cs: { nome: string; indicadores: Record<string, { meta: number | null; calculado: number | null }>; pontosAdvertencia: number;
        health: { calculado: number | null; meta: number | null } | null }[];
  // Status do report nas últimas semanas de referência, da mais antiga para a mais recente.
  report: { semanas: string[]; porCS: Record<string, ('em_dia' | 'com_atraso' | 'pendente')[]> };
  gtd: {
    atrasadasPorCS: Record<string, number>;
    // Cumprimento por etapa nos ciclos fechados da janela, com o pior desempenho por CS.
    etapas: { chave: string; rotulo: string; feitos: number; total: number; porCS: { cs: string; feitos: number; total: number }[] }[];
  };
};

export const fmtNum = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');
const pct = (f: number) => Math.round(f * 100);

export type RegraInsight = { id: string; severidade: Severidade; avaliar: (c: CtxInsights) => Insight[] };

const INDICADORES_RITMO: { chave: string; label: string; acao: string }[] = [
  { chave: 'casesSucesso', label: 'Cases de Sucesso', acao: 'Fazer o follow dos matchmakings e registrar o que fechou como case.' },
  { chave: 'matchmakings', label: 'Matchmakings', acao: 'Puxar nas próximas atas os desafios mapeados e propor os matchmakings.' },
  { chave: 'rounds', label: 'Rounds', acao: 'Confirmar a agenda dos rounds do mês com cada CS.' },
  { chave: 'upsell', label: 'Upsell', acao: 'Revisar as oportunidades mapeadas no GTD e priorizar as mais maduras.' },
  { chave: 'indicacoes', label: 'Indicações', acao: 'Pedir indicação no encerramento de cada conselho.' },
];

export const CATALOGO_INSIGHTS: RegraInsight[] = [
  {
    id: 'ritmo_indicador', severidade: 'alta',
    avaliar: (c) => {
      const frac = c.diaDoMes / c.diasNoMes;
      const saida: Insight[] = [];
      INDICADORES_RITMO.forEach((ind) => {
        const linhas = c.cs.map((x) => ({ nome: x.nome, meta: x.indicadores[ind.chave]?.meta ?? null, real: x.indicadores[ind.chave]?.calculado ?? null }))
          .filter((l) => l.meta !== null && l.meta > 0);
        const metaTotal = linhas.reduce((s, l) => s + (l.meta as number), 0);
        if (metaTotal <= 0) return;
        const real = linhas.reduce((s, l) => s + (l.real ?? 0), 0);
        const esperado = metaTotal * frac;
        if (!(real < INSIGHT_RITMO_LIMIAR * esperado)) return;
        const atras = linhas.filter((l) => (l.real ?? 0) < INSIGHT_RITMO_LIMIAR * (l.meta as number) * frac).map((l) => l.nome);
        saida.push({
          id: 'ritmo_indicador_' + ind.chave, severidade: 'alta',
          oQue: `${ind.label} do time está abaixo do ritmo esperado para fechar a meta do mês.`,
          numero: `${fmtNum(real)} de ${fmtNum(metaTotal)}`,
          referencia: `o ritmo esperado hoje é ${fmtNum(esperado)}, no dia ${c.diaDoMes} de ${c.diasNoMes}`,
          acao: ind.acao, responsaveis: atras, impacto: atras.length,
        });
      });
      return saida;
    },
  },
  {
    id: 'churn_acima', severidade: 'alta',
    avaliar: (c) => {
      const linhas = c.cs.map((x) => ({ nome: x.nome, meta: x.indicadores.churn?.meta ?? null, real: x.indicadores.churn?.calculado ?? null }))
        .filter((l) => l.meta !== null && l.meta > 0);
      if (!linhas.length) return [];
      const acima = linhas.filter((l) => (l.real ?? 0) > (l.meta as number)).map((l) => l.nome);
      const total = linhas.reduce((s, l) => s + (l.real ?? 0), 0);
      const maximo = linhas.reduce((s, l) => s + (l.meta as number), 0);
      if (!acima.length && !(total > maximo)) return [];
      return [{
        id: 'churn_acima', severidade: 'alta',
        oQue: 'O churn do mês passou do máximo definido.',
        numero: `${fmtNum(total)} contra máximo de ${fmtNum(maximo)}`,
        referencia: 'soma dos máximos de churn dos CS ativos no mês',
        acao: 'Revisar os membros críticos dos CS citados e agendar um 1:1 de retenção.',
        responsaveis: acima, impacto: acima.length || 1,
      }];
    },
  },
  {
    id: 'report_adesao', severidade: 'media',
    avaliar: (c) => {
      const nomes = Object.keys(c.report.porCS);
      const n = c.report.semanas.length;
      if (!nomes.length || !n) return [];
      let enviados = 0;
      nomes.forEach((nome) => c.report.porCS[nome].forEach((s) => { if (s !== 'pendente') enviados++; }));
      const adesao = enviados / (nomes.length * n);
      const seguidas = (st: string[]) => st.some((s, i) => i > 0 && s === 'pendente' && st[i - 1] === 'pendente');
      const comDuasSeguidas = nomes.filter((nome) => seguidas(c.report.porCS[nome]));
      if (!(adesao < INSIGHT_REPORT_ADESAO_LIMIAR) && !comDuasSeguidas.length) return [];
      const comPendencia = nomes.filter((nome) => c.report.porCS[nome].includes('pendente'));
      const resp = comDuasSeguidas.length ? comDuasSeguidas : comPendencia;
      return [{
        id: 'report_adesao', severidade: 'media',
        oQue: comDuasSeguidas.length && !(adesao < INSIGHT_REPORT_ADESAO_LIMIAR) ? 'Há CS com duas semanas seguidas sem report.' : 'A adesão ao report semanal está abaixo do esperado.',
        numero: `${pct(adesao)} por cento de adesão nas últimas ${n} semanas`,
        referencia: `o esperado é pelo menos ${pct(INSIGHT_REPORT_ADESAO_LIMIAR)} por cento`,
        acao: 'Reforçar o prazo de sexta no ritual da equipe e cobrar individualmente quem acumula semanas pendentes.',
        responsaveis: resp, impacto: resp.length,
      }];
    },
  },
  {
    id: 'gtd_etapa_esquecida', severidade: 'media',
    avaliar: (c) => {
      const ruins = c.gtd.etapas.filter((e) => e.total >= 5 && e.feitos / e.total < INSIGHT_GTD_ETAPA_LIMIAR)
        .sort((a, b) => a.feitos / a.total - b.feitos / b.total);
      if (!ruins.length) return [];
      const pior = ruins[0];
      const piores = pior.porCS.filter((x) => x.total > 0).sort((a, b) => a.feitos / a.total - b.feitos / b.total).slice(0, 3).map((x) => x.cs);
      const outras = ruins.length - 1;
      return [{
        id: 'gtd_etapa_esquecida', severidade: 'media',
        oQue: `A etapa ${pior.rotulo} do GTD é a mais esquecida${outras > 0 ? `, e outras ${outras} ${outras === 1 ? 'etapa também está' : 'etapas também estão'} abaixo do esperado` : ''}.`,
        numero: `${pct(pior.feitos / pior.total)} por cento cumprida em ${pior.total} ciclos encerrados`,
        referencia: `o esperado é pelo menos ${pct(INSIGHT_GTD_ETAPA_LIMIAR)} por cento nos ciclos fechados dos últimos 60 dias`,
        acao: 'Revisar a etapa com o time, explicar o porquê dela e acompanhar no próximo ciclo. As etapas depois do conselho são as mais esquecidas.',
        responsaveis: piores, impacto: ruins.length,
      }];
    },
  },
  {
    id: 'gtd_concentrado', severidade: 'media',
    avaliar: (c) => {
      const total = Object.values(c.gtd.atrasadasPorCS).reduce((s, v) => s + v, 0);
      if (total < INSIGHT_GTD_CONCENTRACAO_MIN_ATRASADAS) return [];
      const [nome, n] = Object.entries(c.gtd.atrasadasPorCS).sort((a, b) => b[1] - a[1])[0];
      if (!(n > total / 2)) return [];
      return [{
        id: 'gtd_concentrado', severidade: 'media',
        oQue: `${nome} concentra mais da metade das etapas de GTD atrasadas do time.`,
        numero: `${n} de ${total} etapas atrasadas`,
        referencia: 'ciclos abertos, até 14 dias depois do conselho',
        acao: 'Puxar um 1:1 de prioridade com o CS e verificar sobrecarga de carteira.',
        responsaveis: [nome], impacto: n,
      }];
    },
  },
  {
    id: 'criticos_acima', severidade: 'media',
    avaliar: (c) => {
      const acima = c.cs.filter((x) => x.health && x.health.calculado !== null && x.health.meta !== null && x.health.meta > 0 && x.health.calculado > x.health.meta)
        .sort((a, b) => (b.health!.calculado as number) - (a.health!.calculado as number));
      if (!acima.length) return [];
      const p = acima[0];
      return [{
        id: 'criticos_acima', severidade: 'media',
        oQue: acima.length === 1 ? `${p.nome} está com o Health da Base acima da meta.` : `${acima.length} CS estão com o Health da Base acima da meta, o pior é ${p.nome}.`,
        numero: `${fmtNum(p.health!.calculado as number)} por cento contra meta de ${fmtNum(p.health!.meta as number)}`,
        referencia: 'percentual de membros críticos do report mais recente, mais pontos de advertência',
        acao: 'Abrir a lista de críticos no report do CS e definir uma ação por membro.',
        responsaveis: acima.map((x) => x.nome), impacto: acima.length,
      }];
    },
  },
  {
    id: 'advertencia_alerta', severidade: 'baixa',
    avaliar: (c) => {
      const acima = c.cs.filter((x) => x.pontosAdvertencia > INSIGHT_ADVERTENCIA_ALERTA_PONTOS).sort((a, b) => b.pontosAdvertencia - a.pontosAdvertencia);
      if (!acima.length) return [];
      return [{
        id: 'advertencia_alerta', severidade: 'baixa',
        oQue: acima.length === 1 ? `${acima[0].nome} acumula pontos de advertência acima do limite.` : `${acima.length} CS acumulam pontos de advertência acima do limite.`,
        numero: `${acima[0].pontosAdvertencia} pontos ativos`,
        referencia: `o alerta começa acima de ${INSIGHT_ADVERTENCIA_ALERTA_PONTOS} pontos`,
        acao: 'Registrar um 1:1 de alinhamento.',
        responsaveis: acima.map((x) => x.nome), impacto: acima.length,
      }];
    },
  },
];

const ORDEM_SEVERIDADE: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };

// Insights disparados, ordenados por severidade e depois por impacto (CS afetados), com o recorte
// visível (INSIGHTS_MAX_VISIVEIS) e o restante para o Ver todos.
export function insightsGestor(ctx: CtxInsights, catalogo: RegraInsight[] = CATALOGO_INSIGHTS) {
  const todos = catalogo.flatMap((r) => r.avaliar(ctx))
    .sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] || b.impacto - a.impacto || a.id.localeCompare(b.id));
  return { visiveis: todos.slice(0, INSIGHTS_MAX_VISIVEIS), restantes: todos.slice(INSIGHTS_MAX_VISIVEIS), total: todos.length };
}
