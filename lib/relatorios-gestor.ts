// Acompanhamento dos relatórios do conselho pela visão de gestor (27/10/2026). Módulo puro: recebe os encontros
// com relatório exigido e os relatórios enviados, já lidos do banco, e devolve o painel pronto em três níveis.
// Primeiro, a leitura de relance (cobertura e como foram os encontros). Segundo, as leituras que pedem ação, geradas
// por um catálogo de regras fixas e determinísticas, sem IA, no mesmo formato de Insight de lib/insights.ts. Terceiro,
// o detalhe de cada relatório. Nova regra exige só um novo registro em CATALOGO_LEITURAS_RELATORIO.
// Roda com: npx tsx tests/relatorios-gestor.test.ts
import type { Insight, Severidade } from './insights.ts';
import {
  REL_GESTOR_FALTAS_RECORRENTES_MIN, REL_GESTOR_JANELA_HISTORICO_DIAS, REL_GESTOR_ATRASOS_REINCIDENTES_MIN,
  REL_GESTOR_SEM_RETORNO_MIN, REL_GESTOR_LEITURAS_VISIVEIS, REL_GESTOR_DETALHES_VISIVEIS,
} from './constants.ts';
import type { EstadoRelatorio } from './pontos.ts';

export const AVALIACOES_ORDEM = ['Muito bom', 'Bom', 'Regular', 'Ruim'] as const;
export type AvaliacaoEncontro = (typeof AVALIACOES_ORDEM)[number];

// Entrada: encontro com relatório exigido (uma linha de encontros_pendentes_relatorio) e relatório enviado.
export type EncontroEntrada = {
  groupId: string; conselho: string; cs: string | null; dataEncontro: string; estado: EstadoRelatorio;
};
export type RelatorioEntrada = {
  id: string; groupId: string; conselho: string; dataEncontro: string; csNome: string; avaliacao: string; avanco: string;
  membroAtencaoId: number | null; membroAtencaoNome: string | null; membroAtencaoMotivo: string | null; combinado: string | null;
  enviadoEm: string; estado: EstadoRelatorio | null;
  faltas: { membroId: number; nome: string; tipo: 'falta' | 'desistencia'; categoria: string | null; justificativa: string | null }[];
};

// Saída.
export type SegmentoBarra = { chave: string; rotulo: string; qtd: number; tom: 'ok' | 'gold' | 'red' | 'neutro' };
export type CoberturaCS = { cs: string; exigidos: number; enviados: number; atrasados: number; pendentes: number };
export type Relance = {
  exigidos: number; enviados: number; semRelatorio: number;
  cobertura: SegmentoBarra[]; // no prazo, com atraso, atrasado, a preencher
  avaliacoes: SegmentoBarra[]; // Muito bom, Bom, Regular, Ruim
  porCS: CoberturaCS[];
  // Mesmo recorte do mês anterior, para comparar o preenchimento (exigidos, no prazo, atrasados, sem relatório).
  anterior: { mes: string; exigidos: number; noPrazo: number; atrasados: number; semRelatorio: number };
  emAtencao: number; faltas: number; desistencias: number;
};
export type DetalheRelatorio = {
  id: string; groupId: string; conselho: string; cs: string; dataEncontro: string; avaliacao: string; avanco: string;
  membroAtencao: { nome: string | null; motivo: string | null } | null; combinado: string | null;
  estado: EstadoRelatorio | null; enviadoEm: string;
  faltas: RelatorioEntrada['faltas']; destaque: 'alerta' | 'atencao' | null;
};
export type PainelRelatorios = {
  mes: string; vazio: 'sem_encontros' | 'sem_relatorios' | null;
  relance: Relance; leituras: { visiveis: Insight[]; restantes: Insight[]; total: number };
  detalhe: { visiveis: DetalheRelatorio[]; restantes: DetalheRelatorio[]; total: number };
};

export type CtxRelatorios = {
  mes: string; // AAAA-MM do recorte (America/Sao_Paulo)
  hoje: string; // ISO, para a janela do histórico
  encontros: EncontroEntrada[]; // todos os encontros com relatório exigido, de qualquer mês
  relatorios: RelatorioEntrada[]; // todos os relatórios enviados, de qualquer mês
};

// ---- utilitários de data (Brasília, UTC menos 3 o ano todo, sem horário de verão desde 2019) ----
const MS_DIA = 86400000;
export function mesDeBrasilia(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
export function dataCurta(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
const lista = (nomes: string[]): string => {
  const u = [...new Set(nomes)];
  return u.length <= 1 ? (u[0] || '') : u.slice(0, -1).join(', ') + ' e ' + u[u.length - 1];
};
const plural = (n: number, um: string, varios: string): string => n + ' ' + (n === 1 ? um : varios);

const ruim = (a: string) => a === 'Regular' || a === 'Ruim';

// ---- regras de leitura ----
export type RegraLeitura = { id: string; severidade: Severidade; avaliar: (c: CtxLeitura) => Insight[] };
// Contexto das regras: o recorte do mês e o histórico da janela, já separados.
export type CtxLeitura = {
  mes: string; doMes: RelatorioEntrada[]; historico: RelatorioEntrada[]; encontrosDoMes: EncontroEntrada[];
};

const porConselhoRecentesPrimeiro = (rs: RelatorioEntrada[]): Map<string, RelatorioEntrada[]> => {
  const m = new Map<string, RelatorioEntrada[]>();
  [...rs].sort((a, b) => b.dataEncontro.localeCompare(a.dataEncontro)).forEach((r) => { (m.get(r.groupId) || m.set(r.groupId, []).get(r.groupId)!).push(r); });
  return m;
};

export const CATALOGO_LEITURAS_RELATORIO: RegraLeitura[] = [
  {
    // Desistência registrada: é o sinal mais próximo de churn que o relatório traz.
    id: 'rel_desistencia', severidade: 'alta',
    avaliar: (c) => c.doMes.flatMap((r) => r.faltas.filter((f) => f.tipo === 'desistencia').map((f) => ({ r, f }))).map(({ r, f }) => ({
      id: 'rel_desistencia_' + r.id + '_' + f.membroId, severidade: 'alta' as Severidade,
      oQue: `O CS registrou a desistência de ${f.nome} no conselho ${r.conselho}.`,
      numero: `Encontro de ${dataCurta(r.dataEncontro)}`,
      referencia: f.justificativa ? `motivo registrado: ${f.justificativa}` : 'sem motivo registrado',
      acao: 'Combinar com o CS uma conversa individual com o membro esta semana e, se a saída for provável, abrir o fluxo de churn.',
      responsaveis: [r.csNome], impacto: 3,
    })),
  },
  {
    // Dois encontros seguidos do mesmo conselho avaliados como Regular ou Ruim.
    id: 'rel_avaliacao_em_queda', severidade: 'alta',
    avaliar: (c) => {
      const saida: Insight[] = [];
      porConselhoRecentesPrimeiro(c.historico).forEach((rs) => {
        if (rs.length < 2 || !ruim(rs[0].avaliacao) || !ruim(rs[1].avaliacao)) return;
        if (mesDeBrasilia(rs[0].dataEncontro) !== c.mes) return;
        saida.push({
          id: 'rel_avaliacao_em_queda_' + rs[0].groupId, severidade: 'alta',
          oQue: `O conselho ${rs[0].conselho} teve dois encontros seguidos avaliados abaixo do esperado.`,
          numero: `${rs[1].avaliacao} em ${dataCurta(rs[1].dataEncontro)} e ${rs[0].avaliacao} em ${dataCurta(rs[0].dataEncontro)}`,
          referencia: 'o padrão esperado é Bom ou Muito bom',
          acao: 'Sentar com o CS para entender o que mudou, ler o NPS do encontro e decidir se vale uma visita ou a troca de dinâmica.',
          responsaveis: [rs[0].csNome], impacto: 2,
        });
      });
      return saida;
    },
  },
  {
    // Encontro do mês avaliado como Ruim (ou Regular) que ainda não é reincidência.
    id: 'rel_encontro_abaixo', severidade: 'media',
    avaliar: (c) => {
      const saida: Insight[] = [];
      porConselhoRecentesPrimeiro(c.historico).forEach((rs) => {
        const ult = rs[0];
        if (mesDeBrasilia(ult.dataEncontro) !== c.mes || !ruim(ult.avaliacao)) return;
        if (rs.length >= 2 && ruim(rs[1].avaliacao)) return; // já coberto por rel_avaliacao_em_queda
        saida.push({
          id: 'rel_encontro_abaixo_' + ult.groupId, severidade: ult.avaliacao === 'Ruim' ? 'alta' : 'media',
          oQue: `O encontro de ${dataCurta(ult.dataEncontro)} do conselho ${ult.conselho} foi avaliado pelo CS como ${ult.avaliacao.toLowerCase()}.`,
          numero: ult.avaliacao,
          referencia: rs.length >= 2 ? `o encontro anterior foi ${rs[1].avaliacao.toLowerCase()}` : 'primeiro relatório do conselho no período',
          acao: 'Perguntar ao CS o que pesou e se o próximo encontro precisa de preparação diferente.',
          responsaveis: [ult.csNome], impacto: 1,
        });
      });
      return saida;
    },
  },
  {
    // Membro em atenção: agrupa por membro; reincidência (dois relatórios ou mais na janela) sobe a severidade.
    id: 'rel_membro_atencao', severidade: 'media',
    avaliar: (c) => {
      const doMes = c.doMes.filter((r) => r.membroAtencaoId !== null);
      const saida: Insight[] = [];
      const vistos = new Set<string>();
      doMes.forEach((r) => {
        const chave = r.groupId + ':' + r.membroAtencaoId;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        const vezes = c.historico.filter((h) => h.groupId === r.groupId && h.membroAtencaoId === r.membroAtencaoId).length;
        const nome = r.membroAtencaoNome || 'um membro';
        saida.push({
          id: 'rel_membro_atencao_' + chave, severidade: vezes >= 2 ? 'alta' : 'media',
          oQue: `O CS apontou ${nome} como membro que exige atenção no conselho ${r.conselho}.`,
          numero: vezes >= 2 ? `Apontado em ${vezes} relatórios` : 'Apontado neste relatório',
          referencia: r.membroAtencaoMotivo ? `motivo registrado: ${r.membroAtencaoMotivo}` : 'sem motivo registrado',
          acao: vezes >= 2 ? 'Definir com o CS um plano para o membro, com responsável e data, antes do próximo encontro.' : 'Acompanhar no próximo relatório se o ponto de atenção persiste.',
          responsaveis: [r.csNome], impacto: vezes,
        });
      });
      return saida;
    },
  },
  {
    // Mesmo membro com várias faltas justificadas na janela do histórico.
    id: 'rel_faltas_recorrentes', severidade: 'media',
    avaliar: (c) => {
      const saida: Insight[] = [];
      const por = new Map<string, { nome: string; conselho: string; cs: string; datas: string[]; categorias: string[]; ultimoMes: boolean }>();
      c.historico.forEach((r) => r.faltas.filter((f) => f.tipo === 'falta').forEach((f) => {
        const k = r.groupId + ':' + f.membroId;
        const x = por.get(k) || { nome: f.nome, conselho: r.conselho, cs: r.csNome, datas: [], categorias: [], ultimoMes: false };
        x.datas.push(r.dataEncontro);
        if (f.categoria) x.categorias.push(f.categoria);
        if (mesDeBrasilia(r.dataEncontro) === c.mes) x.ultimoMes = true;
        por.set(k, x);
      }));
      por.forEach((x, k) => {
        if (x.datas.length < REL_GESTOR_FALTAS_RECORRENTES_MIN || !x.ultimoMes) return;
        const cont = new Map<string, number>();
        x.categorias.forEach((cat) => cont.set(cat, (cont.get(cat) || 0) + 1));
        const top = [...cont.entries()].sort((a, b) => b[1] - a[1])[0];
        saida.push({
          id: 'rel_faltas_recorrentes_' + k, severidade: 'media',
          oQue: `${x.nome} faltou a ${x.datas.length} encontros do conselho ${x.conselho} depois de confirmar presença.`,
          numero: plural(x.datas.length, 'falta', 'faltas') + ' em ' + REL_GESTOR_JANELA_HISTORICO_DIAS + ' dias',
          referencia: top ? `motivo mais frequente: ${top[0].toLowerCase()}` : 'sem categoria registrada',
          acao: 'Pedir ao CS uma conversa direta com o membro para entender se o horário ou o formato deixou de servir.',
          responsaveis: [x.cs], impacto: x.datas.length,
        });
      });
      return saida;
    },
  },
  {
    // Faltas sem retorno do membro: sinal de contato falhando, no conjunto do mês.
    id: 'rel_sem_retorno', severidade: 'media',
    avaliar: (c) => {
      const itens = c.doMes.flatMap((r) => r.faltas.filter((f) => f.tipo === 'falta' && f.categoria === 'Sem retorno do membro').map((f) => ({ r, f })));
      if (itens.length < REL_GESTOR_SEM_RETORNO_MIN) return [];
      const conselhos = [...new Set(itens.map((i) => i.r.conselho))];
      return [{
        id: 'rel_sem_retorno', severidade: 'media' as Severidade,
        oQue: 'Vários membros que confirmaram presença faltaram sem dar retorno ao CS.',
        numero: plural(itens.length, 'falta', 'faltas') + ' sem retorno em ' + plural(conselhos.length, 'conselho', 'conselhos'),
        referencia: `conselhos: ${lista(conselhos)}`,
        acao: 'Revisar com os CS o canal de confirmação e lembrete antes do encontro, e definir quem liga para quem não responde.',
        responsaveis: itens.map((i) => i.r.csNome), impacto: itens.length,
      }];
    },
  },
  {
    // CS que enviou relatório com atraso, ou segue atrasado, mais de uma vez no recorte.
    id: 'rel_cs_reincidente_atraso', severidade: 'baixa',
    avaliar: (c) => {
      const por = new Map<string, number>();
      c.encontrosDoMes.forEach((e) => { if (e.cs && (e.estado === 'atrasado' || e.estado === 'enviado_com_atraso')) por.set(e.cs, (por.get(e.cs) || 0) + 1); });
      return [...por.entries()].filter(([, n]) => n >= REL_GESTOR_ATRASOS_REINCIDENTES_MIN).map(([cs, n]) => ({
        id: 'rel_cs_reincidente_atraso_' + cs, severidade: 'baixa' as Severidade,
        oQue: `${cs} entregou ou deixou atrasados vários relatórios de conselho neste mês.`,
        numero: plural(n, 'relatório fora do prazo', 'relatórios fora do prazo'),
        referencia: 'o prazo é de 7 dias após o encontro e cada atraso gera 5 pontos',
        acao: 'Conversar com o CS sobre a rotina de registro logo após o encontro, em vez de acumular.',
        responsaveis: [cs], impacto: n,
      }));
    },
  },
];

const ORDEM: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };

export function leiturasRelatorios(c: CtxLeitura, catalogo: RegraLeitura[] = CATALOGO_LEITURAS_RELATORIO) {
  const todos = catalogo.flatMap((r) => r.avaliar(c))
    .sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade] || b.impacto - a.impacto || a.id.localeCompare(b.id));
  return { visiveis: todos.slice(0, REL_GESTOR_LEITURAS_VISIVEIS), restantes: todos.slice(REL_GESTOR_LEITURAS_VISIVEIS), total: todos.length };
}

// ---- montagem do painel ----
export function montarPainelRelatorios(ctx: CtxRelatorios): PainelRelatorios {
  const encontrosDoMes = ctx.encontros.filter((e) => mesDeBrasilia(e.dataEncontro) === ctx.mes);
  const doMes = ctx.relatorios.filter((r) => mesDeBrasilia(r.dataEncontro) === ctx.mes);
  const corte = new Date(ctx.hoje).getTime() - REL_GESTOR_JANELA_HISTORICO_DIAS * MS_DIA;
  const historico = ctx.relatorios.filter((r) => new Date(r.dataEncontro).getTime() >= corte);

  const [ano, m] = ctx.mes.split('-').map(Number);
  const mesAnt = m === 1 ? (ano - 1) + '-12' : ano + '-' + String(m - 1).padStart(2, '0');
  const encAnt = ctx.encontros.filter((e) => mesDeBrasilia(e.dataEncontro) === mesAnt);
  const contaAnt = (...estados: EstadoRelatorio[]) => encAnt.filter((e) => estados.includes(e.estado)).length;
  const conta = (...estados: EstadoRelatorio[]) => encontrosDoMes.filter((e) => estados.includes(e.estado)).length;
  const enviados = conta('enviado_no_prazo', 'enviado_com_atraso');
  const cobertura: SegmentoBarra[] = [
    { chave: 'no_prazo', rotulo: 'Enviado no prazo', qtd: conta('enviado_no_prazo'), tom: 'ok' },
    { chave: 'com_atraso', rotulo: 'Enviado com atraso', qtd: conta('enviado_com_atraso'), tom: 'gold' },
    { chave: 'atrasado', rotulo: 'Atrasado', qtd: conta('atrasado'), tom: 'red' },
    { chave: 'a_preencher', rotulo: 'No prazo para preencher', qtd: conta('a_preencher', 'vence_hoje'), tom: 'neutro' },
  ];
  const tomAval: Record<string, SegmentoBarra['tom']> = { 'Muito bom': 'ok', 'Bom': 'ok', 'Regular': 'gold', 'Ruim': 'red' };
  const avaliacoes: SegmentoBarra[] = AVALIACOES_ORDEM.map((a) => ({ chave: a, rotulo: a, qtd: doMes.filter((r) => r.avaliacao === a).length, tom: tomAval[a] }));

  const cs = new Map<string, CoberturaCS>();
  encontrosDoMes.forEach((e) => {
    if (!e.cs) return;
    const x = cs.get(e.cs) || { cs: e.cs, exigidos: 0, enviados: 0, atrasados: 0, pendentes: 0 };
    x.exigidos++;
    if (e.estado === 'enviado_no_prazo' || e.estado === 'enviado_com_atraso') x.enviados++;
    else if (e.estado === 'atrasado') x.atrasados++;
    else x.pendentes++;
    cs.set(e.cs, x);
  });
  const porCS = [...cs.values()].sort((a, b) => b.atrasados - a.atrasados || (a.enviados / a.exigidos) - (b.enviados / b.exigidos) || a.cs.localeCompare(b.cs, 'pt-BR'));

  const relance: Relance = {
    exigidos: encontrosDoMes.length, enviados, semRelatorio: encontrosDoMes.length - enviados, cobertura, avaliacoes, porCS,
    anterior: { mes: mesAnt, exigidos: encAnt.length, noPrazo: contaAnt('enviado_no_prazo'), atrasados: contaAnt('atrasado'), semRelatorio: encAnt.length - contaAnt('enviado_no_prazo', 'enviado_com_atraso') },
    emAtencao: doMes.filter((r) => r.membroAtencaoId !== null).length,
    faltas: doMes.reduce((s, r) => s + r.faltas.filter((f) => f.tipo === 'falta').length, 0),
    desistencias: doMes.reduce((s, r) => s + r.faltas.filter((f) => f.tipo === 'desistencia').length, 0),
  };

  const leituras = leiturasRelatorios({ mes: ctx.mes, doMes, historico, encontrosDoMes });

  const ordemDetalhe = [...doMes].sort((a, b) => {
    const pa = prioridadeDetalhe(a), pb = prioridadeDetalhe(b);
    return pa - pb || b.dataEncontro.localeCompare(a.dataEncontro);
  }).map<DetalheRelatorio>((r) => ({
    id: r.id, groupId: r.groupId, conselho: r.conselho, cs: r.csNome, dataEncontro: r.dataEncontro, avaliacao: r.avaliacao, avanco: r.avanco,
    membroAtencao: r.membroAtencaoId === null ? null : { nome: r.membroAtencaoNome, motivo: r.membroAtencaoMotivo },
    combinado: r.combinado, estado: r.estado, enviadoEm: r.enviadoEm, faltas: r.faltas,
    destaque: r.avaliacao === 'Ruim' || r.faltas.some((f) => f.tipo === 'desistencia') ? 'alerta' : (r.avaliacao === 'Regular' || r.membroAtencaoId !== null ? 'atencao' : null),
  }));

  return {
    mes: ctx.mes,
    vazio: encontrosDoMes.length === 0 ? 'sem_encontros' : (doMes.length === 0 ? 'sem_relatorios' : null),
    relance, leituras,
    detalhe: { visiveis: ordemDetalhe.slice(0, REL_GESTOR_DETALHES_VISIVEIS), restantes: ordemDetalhe.slice(REL_GESTOR_DETALHES_VISIVEIS), total: ordemDetalhe.length },
  };
}

// Primeiro o que está fora do padrão (desistência, Ruim, Regular, membro em atenção), depois o resto por data.
function prioridadeDetalhe(r: RelatorioEntrada): number {
  if (r.faltas.some((f) => f.tipo === 'desistencia') || r.avaliacao === 'Ruim') return 0;
  if (r.avaliacao === 'Regular' || r.membroAtencaoId !== null) return 1;
  return 2;
}
