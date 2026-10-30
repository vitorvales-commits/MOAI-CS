// Payload da home do gestor (redesenho de 20/10/2026). Monta, no servidor, tudo que o template mostra:
// frase do mês, indicadores com status, pódio, time, conselhos consolidados e cases. Os números de origem vêm do
// generateEquipeReport (lib/reports.ts); as regras vêm de lib/home-regras.ts. O template só renderiza.
import { LIMIAR_PRESENCA_ATENCAO, MESES_ORDEM } from './constants';
import { hojeSP } from './gtd-prazos';
import {
  INDICADORES_CRESCIMENTO_HOME, esperadoAteHoje, faixaPessoa, frasesPodio, resumoMesGestor, resumoMesFechado, statusCrescimento,
  type IndicadorCrescimentoEntrada, type IndicadorRetencaoEntrada, type PessoaPodio, type RealizadoMesFechado,
} from './home-regras';

const ROTULOS_CRESCIMENTO: Record<string, string> = {
  casesSucesso: 'Cases de sucesso', matchmakings: 'Matchmakings', rounds: 'Rounds', indicacoes: 'Indicações',
};

type IndicadorEquipe = { meta?: number | null; alcancado?: number | null; tipoMeta?: string; percentualBase?: number | null; membrosTotal?: number | null };
type ScoreItemEquipe = { chave: string; valorAlcancado: number | null; meta: number | null; achievementPct: number | null; semMeta: boolean; semPontos: boolean };
type LinhaPontuacao = {
  nome: string; nomeCompleto?: string; fotoUrl?: string | null; score: number | null; posicao: number | null;
  detalhamento: ScoreItemEquipe[];
};

// Dias decorridos no mês escolhido: o dia de hoje no mês corrente, o mês inteiro para mês passado e zero para mês futuro.
export function diasDoPeriodo(mes: string, ano: number, geral: boolean): { diasDecorridos: number; diasNoMes: number; emCurso: boolean } | null {
  const idx = MESES_ORDEM.indexOf(mes);
  if (geral || idx === -1) return null;
  const diasNoMes = new Date(Date.UTC(ano, idx + 1, 0)).getUTCDate();
  const hoje = hojeSP();
  const mesHoje = hoje.slice(0, 7);
  const alvo = ano + '-' + String(idx + 1).padStart(2, '0');
  if (mesHoje === alvo) return { diasDecorridos: Number(hoje.slice(8, 10)), diasNoMes, emCurso: true };
  return { diasDecorridos: mesHoje > alvo ? diasNoMes : 0, diasNoMes, emCurso: false };
}

export function montarHomeGestor(args: {
  mes: string; ano: number; geral: boolean;
  indicadores: Record<string, IndicadorEquipe | undefined>;
  rankingGeral: LinhaPontuacao[];
  csAtivos: { nome: string; nomeCompleto?: string; fotoUrl?: string | null }[];
  variacoes: Map<string, { pontos: number } | null | undefined>;
  conselhos: { status?: string; congelado?: boolean; membros?: number; presente?: number; ausente?: number; reposicao?: number; registros?: number; nome: string }[];
  recordes: Record<string, unknown>;
  casesDoTime: { nome: string; empresa?: string; produto?: string; csRaw?: string | null; cs: string; mesGrupo?: string }[];
  casesPorCS: { nome: string; qtd: number }[];
  // Recorte do time (rosterDoMes) e realizados do mês, do generateEquipeReport. Opcionais para não quebrar testes.
  rosterModo?: string | null;
  realizado?: RealizadoMesFechado | null;
}) {
  const periodo = diasDoPeriodo(args.mes, args.ano, args.geral);
  const ind = args.indicadores;

  // Crescimento: só indicadores com meta e dado. Retenção: fluxo (churn e revenue churn) e estoque (críticos).
  const crescimento: IndicadorCrescimentoEntrada[] = [];
  for (const chave of INDICADORES_CRESCIMENTO_HOME) {
    const i = ind[chave];
    if (!i || i.meta === null || i.meta === undefined || !(Number(i.meta) > 0)) continue;
    crescimento.push({ chave, label: ROTULOS_CRESCIMENTO[chave], realizado: Number(i.alcancado ?? 0), meta: Number(i.meta) });
  }
  const moeda = (n: number) => 'R$ ' + Number(n).toLocaleString('pt-BR');
  const retencao: IndicadorRetencaoEntrada[] = [];
  const churn = ind.churn, rev = ind.revenueChurn, criticos = ind.healthDaBase;
  if (churn && churn.meta && churn.meta > 0) retencao.push({ chave: 'churn', label: 'Churn', realizado: Number(churn.alcancado ?? 0), limite: Number(churn.meta), fluxo: true });
  if (rev && rev.meta && rev.meta > 0) retencao.push({ chave: 'revenueChurn', label: 'Revenue churn', realizado: Number(rev.alcancado ?? 0), limite: Number(rev.meta), fluxo: true, formatar: moeda });
  if (criticos && criticos.meta && criticos.meta > 0 && criticos.alcancado !== null && criticos.alcancado !== undefined) {
    retencao.push({ chave: 'healthDaBase', label: 'Membros críticos', realizado: Number(criticos.alcancado), limite: Number(criticos.meta), fluxo: false });
  }

  // Mês fechado sem nenhuma meta (30/10/2026): o resumo de ritmo diria "no ritmo em todas as frentes" só porque
  // não há meta atrasada. Nesse caso a home mostra o fechamento do mês (resumoMesFechado) e o resumo de ritmo some.
  const semMetas = crescimento.length === 0 && retencao.length === 0;
  const fechado = periodo && !periodo.emCurso && semMetas && args.rosterModo === 'quem_era_cs' && args.realizado
    ? resumoMesFechado(args.mes, args.ano, args.realizado)
    : null;
  const resumo = periodo && !fechado
    ? resumoMesGestor({ diasDecorridos: periodo.diasDecorridos, diasNoMes: periodo.diasNoMes, crescimento, retencao })
    : null;
  const linhasRetencaoExtra = resumo ? resumo.retencao.map((r) => ({
    ...r,
    percentualBase: r.chave === 'healthDaBase' ? (criticos?.percentualBase ?? null) : null,
    membrosTotal: r.chave === 'healthDaBase' ? (criticos?.membrosTotal ?? null) : null,
  })) : [];

  // Pódio: os três primeiros do ranking (rankingCSAtivos já devolve só CS ativos com dado suficiente).
  const dias = periodo;
  const metaBatida = (item: ScoreItemEquipe) => {
    if (item.semMeta || item.achievementPct === null || item.achievementPct === undefined) return false;
    if (item.achievementPct >= 100) return true;
    if (!dias || !INDICADORES_CRESCIMENTO_HOME.includes(item.chave as any)) return false;
    const esperado = esperadoAteHoje(Number(item.meta), dias.diasDecorridos, dias.diasNoMes);
    return statusCrescimento(Number(item.valorAlcancado ?? 0), esperado) === 'no_ritmo';
  };
  const pessoasPodio: PessoaPodio[] = args.rankingGeral.slice(0, 3).map((l) => {
    const comMeta = l.detalhamento.filter((i) => !i.semMeta && !i.semPontos && i.achievementPct !== null && i.achievementPct !== undefined);
    const valores: Record<string, number | null> = {};
    for (const i of l.detalhamento) valores[i.chave] = i.valorAlcancado ?? null;
    return {
      nome: l.nome, valores, variacaoPontos: args.variacoes.get(l.nome)?.pontos ?? null,
      metasOk: comMeta.filter(metaBatida).length, comMeta: comMeta.length,
    };
  });
  const frases = frasesPodio(pessoasPodio, INDICADORES_CRESCIMENTO_HOME.map((c) => ({ chave: c, label: ROTULOS_CRESCIMENTO[c] })));
  const podio = args.rankingGeral.slice(0, 3).map((l) => ({
    nome: l.nome, nomeCompleto: l.nomeCompleto || l.nome, fotoUrl: l.fotoUrl || null, score: l.score, posicao: l.posicao,
    faixa: faixaPessoa(l.score), variacaoPontos: args.variacoes.get(l.nome)?.pontos ?? null, frase: frases[l.nome] ?? null,
  }));
  const altas = podio.filter((p) => p.variacaoPontos !== null && p.variacaoPontos > 0);
  const maiorAlta = altas.length ? altas.reduce((a, b) => ((b.variacaoPontos as number) > (a.variacaoPontos as number) ? b : a)) : null;
  const primeiro = args.rankingGeral[0]?.score ?? null;
  const quarto = args.rankingGeral[3]?.score ?? null;

  // Time de CS: só CS ativos de cs_config (nunca ex CS nem inativos), com a pontuação de quem está no ranking e
  // "sem dados" para quem ainda não tem indicador suficiente. Ordem alfabética, sem ordenar por nota.
  const porNome = new Map(args.rankingGeral.map((l) => [l.nome, l]));
  const realizadoPorNome = new Map((args.realizado?.porCS || []).map((r) => [r.nome, r.valores]));
  const time = args.csAtivos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((c) => {
    const l = porNome.get(c.nome);
    const score = l ? l.score : null;
    const v = realizadoPorNome.get(c.nome);
    return {
      nome: c.nome, nomeCompleto: c.nomeCompleto || l?.nomeCompleto || c.nome, fotoUrl: c.fotoUrl || l?.fotoUrl || null, score, faixa: faixaPessoa(score),
      // No mês fechado sem metas, o número sob a foto é o realizado do CS, não a pontuação.
      realizado: fechado && v ? { churn: v.churn, casesSucesso: v.casesSucesso } : null,
    };
  });

  // Conselhos consolidados (a mesma soma que a home fazia no navegador, agora no servidor).
  const realizados = args.conselhos.filter((c) => c.status === 'realizado');
  const somaPresente = realizados.reduce((s, c) => s + Number(c.presente || 0), 0);
  const somaRegistros = realizados.reduce((s, c) => s + Number(c.registros || (Number(c.presente || 0) + Number(c.ausente || 0) + Number(c.reposicao || 0))), 0);
  const abaixoDoLimite = realizados.filter((c) => {
    if (c.congelado) return false;
    const reg = Number(c.registros || (Number(c.presente || 0) + Number(c.ausente || 0) + Number(c.reposicao || 0)));
    return reg > 0 && (Number(c.presente || 0) / reg) * 100 < LIMIAR_PRESENCA_ATENCAO;
  }).length;
  const conselhosBloco = {
    ativos: args.conselhos.filter((c) => !c.congelado).length,
    membros: realizados.reduce((s, c) => s + Number(c.membros || 0), 0),
    presencaAcumulada: somaRegistros ? Math.round((somaPresente / somaRegistros) * 100) : null,
    abaixoDoLimite,
    limiteAbaixo: LIMIAR_PRESENCA_ATENCAO,
  };

  // Cases: o total do período e os cinco primeiros, na ordem do grupo de mês do Monday (nunca por data de criação).
  const cases = {
    total: args.casesDoTime.length,
    porCS: args.casesPorCS,
    recentes: args.casesDoTime.slice(0, 5).map((c) => ({ nome: c.nome, cs: c.cs, produto: c.produto || '', empresa: c.empresa || '' })),
  };

  return {
    periodo: { mes: args.mes, ano: args.ano, geral: args.geral, diasDecorridos: periodo?.diasDecorridos ?? null, diasNoMes: periodo?.diasNoMes ?? null, emCurso: !!periodo?.emCurso },
    resumo: resumo ? { ...resumo, retencao: linhasRetencaoExtra } : null,
    fechado,
    podio: { pessoas: podio, distanciaPrimeiroQuarto: primeiro !== null && quarto !== null ? primeiro - quarto : null, maiorAlta: maiorAlta ? { nome: maiorAlta.nome, pontos: maiorAlta.variacaoPontos } : null },
    time,
    conselhos: conselhosBloco,
    cases,
    recordes: args.recordes,
  };
}
