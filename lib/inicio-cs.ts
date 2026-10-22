// Dados da home do CS (redesenho v3 e homes de 20/10/2026): a faixa do mês, a pontuação contra a mediana, as metas com
// ritmo, o foco de hoje, a simulação da pontuação, a semana e os pontos tomados. Só devolve números do próprio CS e a
// mediana do time (um número), nunca a lista nominal de colegas. Ranking e pontuação vêm de generateVisaoGestor
// (calcularScoreCS), o ritmo de calcularRitmo e as regras de foco, simulação e dica de lib/home-regras.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateCSReport, generateVisaoGestor, listarAdvertenciasCS, parseTituloConselho } from './reports';
import { variacaoDoRanking } from './evolucao-dados';
import { mediana } from './evolucao';
import { hojeSP } from './gtd-prazos';
import { MESES_ORDEM, PESOS_SCORE_CS } from './constants';
import { segundaFeiraBRT } from './indicadores-base';
import { listarEncontrosRelatorio } from './relatorio-conselho-dados';
import {
  dicaRitmo, focoDoDia, faltaPorSemana, simularPatamar, type ConselhoFoco, type MetaFoco, type RelatorioFoco,
} from './home-regras';

export { faltaPorSemana } from './home-regras';

// Indicadores de volume que entram nas metas do mês da home (Carteira e churn viram uma linha à parte).
export const INICIO_METAS = ['casesSucesso', 'upsell', 'matchmakings', 'rounds', 'indicacoes'] as const;

export type MetaInicio = {
  chave: string; label: string; meta: number | null; realizado: number | null;
  status: 'no_ritmo' | 'atencao' | 'atras' | 'cedo' | 'sem_meta';
  previsto: number | null; falta: number | null; porSemana: number | null;
};

// Último dia real do mês (cobre os 12 meses e ano bissexto), sem fixar 31 (bug registrado em 17/09/2026).
export function diasDoMesReal(ano: number, mes1a12: number): number {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
}

// Dias de diferença entre dois ISO de data (YYYY-MM-DD), sem depender do fuso do servidor.
function diasEntre(de: string, ate: string): number {
  return Math.round((new Date(ate + 'T12:00:00Z').getTime() - new Date(de + 'T12:00:00Z').getTime()) / 86400000);
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function somarDiasIso(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function dadosInicioCS(sb: SupabaseClient, seletorMes: string, ano: number, csNome: string) {
  const hoje = hojeSP();
  // Independentes da visão do time: começam juntas (21/10/2026). O catch vazio só evita rejeição sem tratamento
  // se a visão falhar antes; o erro real aparece no await de cada uma.
  const relatorioP = generateCSReport(sb, csNome, seletorMes, ano);
  const reportPendenteP = reportPendenteDoCS(sb, csNome);
  const advertenciasP = listarAdvertenciasCS(sb, csNome);
  // Relatórios do conselho pendentes (encontros_pendentes_relatorio): falha aqui não derruba a home.
  const relatoriosP = listarEncontrosRelatorio(sb, csNome).catch(() => []);
  relatorioP.catch(() => undefined); advertenciasP.catch(() => undefined);
  const visao = await generateVisaoGestor(sb, seletorMes, ano, false);
  const minha = visao.porCS.find((c) => c.nome === csNome);
  if (!minha) throw new Error('Este perfil não aparece entre os CS ativos do período.');
  const meuRank = visao.ranking.find((r) => r.nome === csNome) || null;
  const med = mediana(visao.ranking.map((r) => r.scoreReal));

  const variacoes = await variacaoDoRanking(sb, seletorMes, ano, visao.ranking, hoje).catch(() => null);
  const variacao = variacoes ? variacoes.get(csNome) ?? null : null;

  const idxMes = MESES_ORDEM.indexOf(seletorMes);
  const diasNoMes = idxMes === -1 ? null : diasDoMesReal(ano, idxMes + 1);
  const mesAtual = idxMes !== -1 && hoje.slice(0, 7) === ano + '-' + String(idxMes + 1).padStart(2, '0');
  const dia = Number(hoje.slice(8, 10));
  const diasRestantes = mesAtual && diasNoMes ? diasNoMes - dia : null;

  const linhaRitmo = visao.ritmo ? visao.ritmo.linhas.find((l) => l.nome === csNome) : null;
  const metas: MetaInicio[] = INICIO_METAS.map((chave) => {
    const ind: any = (minha.indicadores as any)[chave];
    const it: any = linhaRitmo ? linhaRitmo.itens[chave] : null;
    const meta = ind && ind.meta !== null && ind.meta !== undefined && ind.meta > 0 ? Number(ind.meta) : null;
    const realizado = ind && ind.calculado !== null && ind.calculado !== undefined ? Number(ind.calculado) : null;
    return {
      chave, label: (visao.labelsIndicador as any)[chave] || chave, meta, realizado,
      status: meta === null ? 'sem_meta' : (it ? it.status : 'sem_meta'),
      previsto: it && it.previsto !== undefined ? it.previsto : null,
      falta: meta === null ? null : Math.max(0, meta - (realizado || 0)),
      porSemana: meta === null || diasRestantes === null || meta - (realizado || 0) <= 0 ? null : faltaPorSemana(meta - (realizado || 0), diasRestantes),
    } as MetaInicio;
  });
  const comMeta = metas.filter((m) => m.status !== 'sem_meta');
  const noRitmo = comMeta.filter((m) => m.status === 'no_ritmo' || m.status === 'cedo').length;
  // Foco: o indicador atrás do ritmo com a maior falta proporcional à meta.
  const atras = comMeta.filter((m) => m.status === 'atras' && m.falta !== null && m.meta)
    .sort((a, b) => (b.falta as number) / (b.meta as number) - (a.falta as number) / (a.meta as number))[0] || null;
  const foco = atras && diasRestantes !== null
    ? { chave: atras.chave, label: atras.label, falta: atras.falta, porSemana: faltaPorSemana(atras.falta as number, diasRestantes) }
    : null;
  const dica = atras && diasRestantes !== null
    ? dicaRitmo({ label: atras.label, meta: atras.meta as number, realizado: atras.realizado || 0, diasRestantes })
    : null;

  // Simulação (7.5): o indicador atrasado de maior peso, pelo mesmo calcularScoreCS.
  const atrasadosComPeso = metas.filter((m) => m.status === 'atras' && m.meta !== null)
    .sort((a, b) => (PESOS_SCORE_CS[b.chave] || 0) - (PESOS_SCORE_CS[a.chave] || 0));
  const simulacao = atrasadosComPeso.length
    ? simularPatamar({
      indicadores: minha.indicadores as any,
      carteira: { numConselhos: (minha.indicadores as any).numConselhos?.calculado ?? 0, metaPropria: (minha.indicadores as any).numConselhos?.meta },
      chave: atrasadosComPeso[0].chave, scoreAtual: meuRank ? meuRank.scoreReal : null,
    })
    : null;

  // Foco de hoje (7.4) e semana: conselhos e GTD do próprio CS, pelo relatório individual.
  const relatorio = await relatorioP;
  const conselhosFoco: ConselhoFoco[] = (relatorio.conselhos || []).map((c: any) => ({
    nome: (parseTituloConselho(c.nome)?.contato) || c.nome,
    diasAte: c.proximaData && c.proximaDataEhFutura ? diasEntre(hoje, String(c.proximaData).slice(0, 10)) : null,
    confirmados: (c.confirmadosFuturos || []).length,
    membros: Number(c.membros || 0),
    gtdAtrasadas: c.gtd && c.gtd.etapasAtrasadas ? c.gtd.etapasAtrasadas.length : 0,
    gtdFeitas: c.gtd ? Number(c.gtd.feitas || 0) : 0,
    gtdTotal: c.gtd ? Number(c.gtd.total || 0) : 0,
    presencaPct: c.registros ? Math.round((Number(c.presente || 0) / Number(c.registros)) * 100) : null,
  }));
  const reportPendente = await reportPendenteP;
  const diaSemanaHoje = new Date(hoje + 'T12:00:00Z').getUTCDay();
  const reportDiasAtePrazo = reportPendente ? (5 - diaSemanaHoje + 7) % 7 : null;
  const metasFoco: MetaFoco[] = metas.filter((m) => m.meta !== null).map((m) => ({
    chave: m.chave, label: m.label, meta: m.meta as number, realizado: m.realizado || 0,
    esperado: m.previsto ?? 0, peso: PESOS_SCORE_CS[m.chave] || 0,
  }));
  const futuros = conselhosFoco.filter((c) => c.diasAte !== null && c.diasAte >= 0).sort((a, b) => (a.diasAte as number) - (b.diasAte as number));
  const proximo = futuros.length ? { titulo: futuros[0].nome, quando: formatarQuando(hoje, futuros[0].diasAte as number) } : null;
  const relatoriosFoco: RelatorioFoco[] = (await relatoriosP)
    .filter((e) => e.estado === 'a_preencher' || e.estado === 'vence_hoje' || e.estado === 'atrasado')
    .map((e) => ({ groupId: e.groupId, conselho: (parseTituloConselho(e.conselho)?.contato) || e.conselho, dataEncontro: e.dataEncontro, estado: e.estado as RelatorioFoco['estado'], diasRestantes: e.diasRestantes }));
  const focoHoje = focoDoDia({ conselhos: conselhosFoco, reportDiasAtePrazo, metas: metasFoco, proximo, relatorios: relatoriosFoco });
  const focoNumeros = focoHoje.conselho ? numerosDoConselho(focoHoje.conselho) : [];
  const fraseSituacao = focoHoje.tipo === 'tudo_em_dia' ? 'Tudo em dia por aqui.'
    : focoHoje.tipo === 'conselho' ? 'Um conselho nesta semana pede atenção.'
    : focoHoje.tipo === 'report' ? 'O report da semana ainda está pendente.'
    : focoHoje.tipo === 'relatorio' ? 'Um relatório de conselho pede preenchimento.' : 'Uma meta do mês pede atenção.';

  const semana = montarSemana(hoje, conselhosFoco, reportPendente);

  const cart: any = (minha.indicadores as any).numConselhos;
  const churn: any = (minha.indicadores as any).churn;

  let pontos: { ativos: number; proximoVencimento: string | null } | null = null;
  try {
    const adv = await advertenciasP;
    pontos = { ativos: adv.pontuacaoAtiva, proximoVencimento: adv.proximoVencimento ? adv.proximoVencimento.slice(0, 10) : null };
  } catch { pontos = null; }

  return {
    periodo: { mes: seletorMes, ano, hoje, diasNoMes, diasRestantes, mesAtual },
    pontuacao: {
      nota: meuRank ? meuRank.scoreReal : null, posicao: meuRank ? meuRank.posicao : null,
      estado: minha.pontuacao.estado, elegiveis: minha.pontuacao.elegiveis, minimo: visao.minimoIndicadores,
      mediana: med,
      // Posição relativa à mediana, nunca a lista de colegas: 'acima', 'na' ou 'abaixo'.
      contraMediana: meuRank && meuRank.scoreReal !== null && med !== null
        ? (meuRank.scoreReal > med ? 'acima' : (meuRank.scoreReal === med ? 'na' : 'abaixo'))
        : null,
      variacaoPontos: variacao ? variacao.pontos : null,
      simulacao,
    },
    faixa: { noRitmo, comMeta: comMeta.length, foco },
    dica,
    focoHoje: { ...focoHoje, numeros: focoNumeros, anel: focoHoje.conselho ? { valor: focoHoje.conselho.confirmados, total: focoHoje.conselho.membros } : null },
    fraseSituacao,
    semana,
    metas,
    carteira: { numConselhos: cart ? cart.calculado : null, meta: cart ? cart.meta : null, semMetaPropria: !!(cart && cart.semMetaPropria), churn: churn ? churn.calculado : null, metaChurn: churn ? churn.meta : null },
    pontosTomados: pontos,
  };
}

// O report do CS está pendente ou atrasado nesta semana, pela mesma função de status usada na aba Report.
async function reportPendenteDoCS(sb: SupabaseClient, csNome: string): Promise<boolean> {
  const { data, error } = await sb.rpc('status_report_semana', { p_semana: segundaFeiraBRT() });
  if (error) return false;
  const estado = ((data || []) as any[]).find((r) => r.cs_nome === csNome)?.estado ?? null;
  return estado === 'pendente' || estado === 'atrasado';
}

// Números em vidro do foco de hoje quando o foco é um conselho: confirmados, GTD, etapas atrasadas e presença.
function numerosDoConselho(c: ConselhoFoco): { rotulo: string; valor: string; alerta: boolean }[] {
  const numeros = [{ rotulo: 'Confirmados', valor: c.confirmados + ' de ' + c.membros, alerta: c.confirmados <= 3 }];
  if (c.gtdTotal) numeros.push({ rotulo: 'GTD do ciclo', valor: (c.gtdFeitas || 0) + ' de ' + c.gtdTotal + ' etapas', alerta: false });
  numeros.push({ rotulo: 'Etapas atrasadas', valor: String(c.gtdAtrasadas), alerta: c.gtdAtrasadas > 0 });
  if (c.presencaPct !== null && c.presencaPct !== undefined) numeros.push({ rotulo: 'Presença', valor: c.presencaPct + '%', alerta: false });
  return numeros.slice(0, 4);
}

function formatarQuando(hoje: string, diasAte: number): string {
  if (diasAte === 0) return 'hoje';
  const dataIso = somarDiasIso(hoje, diasAte);
  return DIAS_SEMANA[new Date(dataIso + 'T12:00:00Z').getUTCDay()].toLowerCase() + ', ' + dataIso.slice(8, 10) + '/' + dataIso.slice(5, 7);
}

// Sua semana (6.5): os sete dias a partir da segunda desta semana, com a marca de cada conselho e do prazo do report.
function montarSemana(hoje: string, conselhos: ConselhoFoco[], reportPendente: boolean) {
  const segunda = somarDiasIso(hoje, -((new Date(hoje + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const proximos: { dataIso: string; rotulo: string; titulo: string; tipo: 'conselho' | 'report' }[] = [];
  const dias = Array.from({ length: 7 }, (_, i) => {
    const dataIso = somarDiasIso(segunda, i);
    const diasAte = diasEntre(hoje, dataIso);
    const dow = new Date(dataIso + 'T12:00:00Z').getUTCDay();
    const conselhosNoDia = conselhos.filter((c) => c.diasAte === diasAte);
    if (conselhosNoDia.length) conselhosNoDia.forEach((c) => proximos.push({ dataIso, rotulo: DIAS_SEMANA[dow], titulo: 'Conselho ' + c.nome, tipo: 'conselho' }));
    if (dow === 5 && reportPendente) proximos.push({ dataIso, rotulo: DIAS_SEMANA[dow], titulo: 'Prazo do report semanal, às 19h', tipo: 'report' });
    return { dataIso, rotulo: DIAS_SEMANA[dow], dia: Number(dataIso.slice(8, 10)), hoje: diasAte === 0, fimDeSemana: dow === 0 || dow === 6, marcas: conselhosNoDia.length + (dow === 5 && reportPendente ? 1 : 0) };
  });
  return { dias, proximos: proximos.filter((p) => p.dataIso >= hoje).slice(0, 4) };
}
