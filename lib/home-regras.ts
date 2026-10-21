// Regras das homes do gestor e do CS (redesenho de 20/10/2026, seção 7 do prompt). Funções puras: sem banco,
// sem IA e sem DOM. Rodam no servidor, nas rotas /api/equipe e /api/home-resumo, e o template só mostra o texto
// e os números que chegam prontos. Nenhum componente recalcula regra daqui.
import {
  DIAS_MIN_PROJECAO, HOME_FOCO_CONFIRMADOS_ALERTA, HOME_FOCO_DIAS_CONSELHO, HOME_FOCO_DIAS_REPORT,
  HOME_LIMIAR_PERTO_DO_LIMITE, HOME_PATAMAR_PONTUACAO, HOME_RITMO_LIMIAR_ACELERAR, HOME_RITMO_LIMIAR_NO_RITMO,
  RETENCAO_STATUS_POR_PROJECAO, SCORE_FAIXA_ATENCAO, SCORE_FAIXA_SAUDAVEL,
} from './constants';
import { calcularScoreCS, type IndicadorEntrada } from './pontuacao';

// Indicadores de crescimento (quanto mais, melhor) que entram na frase do mês e no contador "N de 4".
export const INDICADORES_CRESCIMENTO_HOME = ['casesSucesso', 'matchmakings', 'rounds', 'indicacoes'] as const;

// Quanto falta por semana para fechar a meta: falta dividido pelas semanas que restam no mês (mínimo de uma).
export function faltaPorSemana(falta: number, diasRestantes: number): number {
  const semanas = Math.max(1, diasRestantes / 7);
  return Math.round((falta / semanas) * 10) / 10;
}

// Fração do mês já decorrida (7.1.1). diasNoMes vem de diasDoMesReal, o último dia real do mês.
export function fracaoDoMes(diasDecorridos: number, diasNoMes: number): number {
  if (!(diasNoMes > 0)) return 0;
  return Math.min(1, Math.max(0, diasDecorridos / diasNoMes));
}

// Esperado até hoje, em unidade inteira, que é o número que a frase mostra.
export function esperadoAteHoje(meta: number, diasDecorridos: number, diasNoMes: number): number {
  return Math.round(meta * fracaoDoMes(diasDecorridos, diasNoMes));
}

export type Deficit = { esperado: number; deficit: number; deficitRelativo: number };

// Déficit (7.1.2): unidades que faltam contra o esperado até hoje e a mesma diferença como fração da meta.
// Negativo quando o realizado já passou do esperado.
export function deficitCrescimento(meta: number, realizado: number, diasDecorridos: number, diasNoMes: number): Deficit {
  const esperado = esperadoAteHoje(meta, diasDecorridos, diasNoMes);
  const deficit = esperado - realizado;
  return { esperado, deficit, deficitRelativo: meta > 0 ? deficit / meta : 0 };
}

export type StatusCrescimento = 'nenhum_ainda' | 'acelerar' | 'quase_no_ritmo' | 'no_ritmo';

// Status de cada indicador de crescimento pela razão realizado sobre esperado. Os limiares ficam em lib/constants.ts.
export function statusCrescimento(realizado: number, esperado: number): StatusCrescimento {
  if (esperado <= 0) return 'no_ritmo';
  if (realizado <= 0) return 'nenhum_ainda';
  const fracao = realizado / esperado;
  if (fracao >= HOME_RITMO_LIMIAR_NO_RITMO) return 'no_ritmo';
  if (fracao >= HOME_RITMO_LIMIAR_ACELERAR) return 'quase_no_ritmo';
  return 'acelerar';
}

export const ROTULO_STATUS_CRESCIMENTO: Record<StatusCrescimento, string> = {
  nenhum_ainda: 'Nenhum ainda', acelerar: 'Acelerar', quase_no_ritmo: 'Quase no ritmo', no_ritmo: 'No ritmo',
};

// Projeção de retenção (7.2.1): só para indicadores de fluxo. Abaixo de DIAS_MIN_PROJECAO dias decorridos não projeta.
export function projecaoFluxo(realizado: number, diasDecorridos: number, diasNoMes: number): number | null {
  if (diasDecorridos < DIAS_MIN_PROJECAO || !(diasNoMes > 0)) return null;
  return Math.round((realizado / diasDecorridos) * diasNoMes);
}

export type StatusRetencao = 'sob_controle' | 'perto_do_limite' | 'atencao';

// Status de retenção e de críticos contra o limite (7.2.2). A projeção só entra quando a constante estiver ligada.
export function statusRetencao(limite: number, realizado: number, projecao: number | null): StatusRetencao {
  if (realizado > limite) return 'atencao';
  if (RETENCAO_STATUS_POR_PROJECAO && projecao !== null && projecao > limite) return 'atencao';
  if (limite > 0 && realizado / limite >= HOME_LIMIAR_PERTO_DO_LIMITE) return 'perto_do_limite';
  return 'sob_controle';
}

export const ROTULO_STATUS_RETENCAO: Record<StatusRetencao, string> = {
  sob_controle: 'Sob controle', perto_do_limite: 'Perto do limite', atencao: 'Atenção',
};

export type FaixaPessoa = 'em_risco' | 'acompanhar' | 'ok' | 'sem_dados';

// Anel da foto no Time de CS. Usa a mesma régua da Visão da área (SCORE_FAIXA_ATENCAO e SCORE_FAIXA_SAUDAVEL),
// sem critério novo.
export function faixaPessoa(score: number | null | undefined): FaixaPessoa {
  if (score === null || score === undefined) return 'sem_dados';
  if (score < SCORE_FAIXA_ATENCAO) return 'em_risco';
  if (score < SCORE_FAIXA_SAUDAVEL) return 'acompanhar';
  return 'ok';
}

// Junta itens em frase natural: "a, b e c".
export function juntarLista(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
}

function numeroPt(n: number): string {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export type IndicadorCrescimentoEntrada = { chave: string; label: string; realizado: number; meta: number; formatar?: (n: number) => string };
export type IndicadorRetencaoEntrada = { chave: string; label: string; realizado: number; limite: number; fluxo: boolean; formatar?: (n: number) => string };

export type LinhaCrescimento = {
  chave: string; label: string; realizado: number; meta: number; esperado: number; deficit: number;
  deficitRelativo: number; status: StatusCrescimento; rotuloStatus: string; textoDeficit: string;
};

export type LinhaRetencao = {
  chave: string; label: string; realizado: number; limite: number; projecao: number | null;
  status: StatusRetencao; rotuloStatus: string; percentualLimite: number; textoProjecao: string;
};

export type ResumoMesGestor = {
  saudacao: string; frase: string; apoio: string; frentesAtras: number;
  metasNoRitmo: number; totalMetas: number; crescimento: LinhaCrescimento[]; retencao: LinhaRetencao[];
};

// Frase do mês do gestor (7.1). Também devolve as linhas já calculadas que o template mostra em cada indicador.
export function resumoMesGestor(args: {
  diasDecorridos: number; diasNoMes: number;
  crescimento: IndicadorCrescimentoEntrada[]; retencao: IndicadorRetencaoEntrada[];
}): ResumoMesGestor {
  const { diasDecorridos, diasNoMes } = args;
  const crescimento: LinhaCrescimento[] = args.crescimento.map((i) => {
    const fmt = i.formatar || numeroPt;
    const d = deficitCrescimento(i.meta, i.realizado, diasDecorridos, diasNoMes);
    const status = statusCrescimento(i.realizado, d.esperado);
    let textoDeficit: string;
    if (i.realizado <= 0) textoDeficit = d.esperado + (d.esperado === 1 ? ' esperado até hoje.' : ' esperados até hoje.');
    else if (d.deficit > 0) textoDeficit = fmt(d.deficit) + ' abaixo do esperado.';
    else if (d.deficit === 0) textoDeficit = 'No esperado até hoje.';
    else textoDeficit = fmt(-d.deficit) + ' acima do esperado.';
    return { chave: i.chave, label: i.label, realizado: i.realizado, meta: i.meta, ...d, status, rotuloStatus: ROTULO_STATUS_CRESCIMENTO[status], textoDeficit };
  });
  const retencao: LinhaRetencao[] = args.retencao.map((i) => {
    const projecao = i.fluxo ? projecaoFluxo(i.realizado, diasDecorridos, diasNoMes) : null;
    const status = statusRetencao(i.limite, i.realizado, projecao);
    const fmt = i.formatar || numeroPt;
    const percentualLimite = i.limite > 0 ? Math.round((i.realizado / i.limite) * 100) : 0;
    const textoProjecao = projecao !== null
      ? 'No ritmo atual fecha em ' + fmt(projecao) + '.'
      : percentualLimite + '% do limite usado.';
    return { chave: i.chave, label: i.label, realizado: i.realizado, limite: i.limite, projecao, status, rotuloStatus: ROTULO_STATUS_RETENCAO[status], percentualLimite, textoProjecao };
  });

  const atras = crescimento.filter((l) => l.status !== 'no_ritmo');
  const retencaoAcima = retencao.filter((l) => l.projecao !== null && RETENCAO_STATUS_POR_PROJECAO && l.projecao > l.limite);
  const frentesAtras = atras.length + retencaoAcima.length;
  const metasNoRitmo = crescimento.filter((l) => l.status === 'no_ritmo').length;

  let saudacao: string;
  if (frentesAtras === 0) saudacao = 'O time está no ritmo.';
  else if (frentesAtras === 1) saudacao = 'O time está atrás do ritmo em 1 frente.';
  else saudacao = 'O time está atrás do ritmo em ' + frentesAtras + ' frentes.';

  let frase: string;
  let apoio: string;
  if (atras.length === 0 && retencaoAcima.length === 0) {
    frase = 'O time está no ritmo em todas as frentes do mês.';
    apoio = 'Nenhum indicador de crescimento ou retenção pede atenção agora.';
  } else {
    const principal = atras.length ? atras.reduce((a, b) => (b.deficitRelativo > a.deficitRelativo ? b : a)) : null;
    if (principal) {
      const fmt = args.crescimento.find((i) => i.chave === principal.chave)?.formatar || numeroPt;
      frase = principal.label + ' é o maior risco do mês: ' + fmt(principal.realizado) + ' de ' + fmt(principal.meta) +
        ', quando o esperado até hoje seria ' + fmt(principal.esperado) + '.';
    } else {
      frase = 'As metas de crescimento estão no ritmo, mas a retenção pede atenção.';
    }
    const partes: string[] = [];
    const outros = atras.filter((l) => l !== principal);
    if (outros.length) partes.push(juntarLista(outros.map((l) => l.label)) + (outros.length === 1 ? ' também está' : ' também estão') + ' atrás do ritmo.');
    for (const r of retencaoAcima) {
      const fmt = args.retencao.find((i) => i.chave === r.chave)?.formatar || numeroPt;
      partes.push(r.label + ' no ritmo atual fecha em ' + fmt(r.projecao as number) + ', acima do limite de ' + fmt(r.limite) + '.');
    }
    apoio = partes.join(' ');
  }
  return { saudacao, frase, apoio, frentesAtras, metasNoRitmo, totalMetas: crescimento.length, crescimento, retencao };
}

export type PessoaPodio = {
  nome: string; valores: Record<string, number | null | undefined>;
  variacaoPontos: number | null | undefined; metasOk: number; comMeta: number;
};

// Frase de cada pessoa no pódio (7.3), em ordem de prioridade. Nunca repete a mesma frase para duas pessoas:
// quando a frase já foi usada, devolve null e o template não mostra a linha.
export function frasesPodio(pessoas: PessoaPodio[], indicadores: { chave: string; label: string }[]): Record<string, string | null> {
  const liderPorIndicador: Record<string, string> = {};
  for (const ind of indicadores) {
    const comValor = pessoas.filter((p) => p.valores[ind.chave] !== null && p.valores[ind.chave] !== undefined);
    if (!comValor.length) continue;
    const max = Math.max(...comValor.map((p) => Number(p.valores[ind.chave])));
    const empatados = comValor.filter((p) => Number(p.valores[ind.chave]) === max);
    if (max > 0 && empatados.length === 1) liderPorIndicador[ind.chave] = empatados[0].nome;
  }
  const comAlta = pessoas.filter((p) => p.variacaoPontos !== null && p.variacaoPontos !== undefined && p.variacaoPontos > 0);
  const maiorAlta = comAlta.length ? Math.max(...comAlta.map((p) => Number(p.variacaoPontos))) : 0;
  const altaEmpatada = comAlta.filter((p) => Number(p.variacaoPontos) === maiorAlta);
  const nomeMaiorAlta = maiorAlta > 0 && altaEmpatada.length === 1 ? altaEmpatada[0].nome : null;

  const usadas = new Set<string>();
  const saida: Record<string, string | null> = {};
  for (const p of pessoas) {
    let frase: string | null = null;
    const ind = indicadores.find((i) => liderPorIndicador[i.chave] === p.nome && !usadas.has('ind:' + i.chave));
    if (ind) {
      frase = 'Maior volume de ' + minusculaInicial(ind.label) + ' do time';
      usadas.add('ind:' + ind.chave);
    } else if (nomeMaiorAlta === p.nome && !usadas.has('alta')) {
      frase = 'Quem mais subiu no mês';
      usadas.add('alta');
    } else {
      frase = p.metasOk + ' de ' + p.comMeta + ' indicadores com meta batidos ou no ritmo';
    }
    saida[p.nome] = frase && !usadas.has('frase:' + frase) ? frase : null;
    if (saida[p.nome]) usadas.add('frase:' + frase);
  }
  return saida;
}

export type ConselhoFoco = {
  nome: string; diasAte: number | null; confirmados: number; membros: number; gtdAtrasadas: number;
  gtdFeitas?: number; gtdTotal?: number; presencaPct?: number | null;
};
export type MetaFoco = { chave: string; label: string; meta: number; realizado: number; esperado: number; peso: number };
export type FocoDoDia = { tipo: 'conselho' | 'report' | 'meta' | 'tudo_em_dia'; titulo: string; texto: string; conselho?: ConselhoFoco };

// Foco de hoje do CS (7.4), na ordem de prioridade: conselho próximo com pouca confirmação ou GTD atrasado, report
// com prazo perto, meta de maior peso atrás do ritmo e, por fim, o próximo compromisso.
export function focoDoDia(args: {
  conselhos: ConselhoFoco[]; reportDiasAtePrazo: number | null; metas: MetaFoco[];
  proximo: { titulo: string; quando: string } | null;
}): FocoDoDia {
  const conselhos = args.conselhos
    .filter((c) => c.diasAte !== null && c.diasAte >= 0 && c.diasAte <= HOME_FOCO_DIAS_CONSELHO
      && (c.confirmados <= HOME_FOCO_CONFIRMADOS_ALERTA || c.gtdAtrasadas > 0))
    .sort((a, b) => (a.diasAte as number) - (b.diasAte as number) || a.confirmados - b.confirmados);
  if (conselhos.length) {
    const c = conselhos[0];
    const quando = c.diasAte === 0 ? 'É hoje.' : (c.diasAte === 1 ? 'Falta 1 dia.' : 'Faltam ' + c.diasAte + ' dias.');
    const gtd = c.gtdAtrasadas > 0 ? ' ' + c.gtdAtrasadas + (c.gtdAtrasadas === 1 ? ' etapa do GTD atrasada.' : ' etapas do GTD atrasadas.') : '';
    return {
      tipo: 'conselho', titulo: 'Preparar o conselho ' + c.nome,
      texto: quando + ' ' + c.confirmados + ' de ' + c.membros + ' membros confirmaram.' + gtd, conselho: c,
    };
  }
  if (args.reportDiasAtePrazo !== null && args.reportDiasAtePrazo <= HOME_FOCO_DIAS_REPORT) {
    const texto = args.reportDiasAtePrazo <= 0 ? 'O prazo é hoje, às 19h.' : 'O prazo é amanhã, às 19h.';
    return { tipo: 'report', titulo: 'Enviar o report da semana', texto };
  }
  const atras = args.metas.filter((m) => m.meta > 0 && m.esperado > m.realizado);
  if (atras.length) {
    const m = atras.reduce((a, b) => {
      if (b.peso !== a.peso) return b.peso > a.peso ? b : a;
      return (b.esperado - b.realizado) / b.meta > (a.esperado - a.realizado) / a.meta ? b : a;
    });
    const falta = m.meta - m.realizado;
    return {
      tipo: 'meta', titulo: m.label + ' está atrás do ritmo',
      texto: (falta === 1 ? 'Falta 1' : 'Faltam ' + numeroPt(falta)) + ' para a meta de ' + numeroPt(m.meta) + '.',
    };
  }
  return {
    tipo: 'tudo_em_dia', titulo: 'Tudo em dia',
    texto: args.proximo ? 'Próximo compromisso: ' + args.proximo.titulo + ', ' + args.proximo.quando + '.' : 'Nenhum compromisso marcado nos próximos dias.',
  };
}

// Simulação da pontuação (7.5). Pelo mesmo calcularScoreCS, mede quantas unidades a mais no indicador de crescimento
// atrasado de maior peso levam a nota ao próximo patamar, sem passar da meta. Null quando não há como chegar.
export function simularPatamar(args: {
  indicadores: Record<string, IndicadorEntrada | null | undefined>;
  carteira: { numConselhos: number; metaPropria: number | null | undefined };
  chave: string; scoreAtual: number | null;
}): { unidades: number; patamar: number } | null {
  const { indicadores, carteira, chave, scoreAtual } = args;
  if (scoreAtual === null || scoreAtual === undefined) return null;
  const ind = indicadores[chave];
  if (!ind || ind.meta === null || ind.meta === undefined || !(ind.meta > 0)) return null;
  const realizado = Number(ind.alcancado ?? 0);
  const falta = Math.ceil(Number(ind.meta) - realizado);
  if (!(falta > 0)) return null;
  const patamar = (Math.floor(scoreAtual / HOME_PATAMAR_PONTUACAO) + 1) * HOME_PATAMAR_PONTUACAO;
  for (let unidades = 1; unidades <= falta; unidades++) {
    const hipotetico = { ...indicadores, [chave]: { ...ind, alcancado: realizado + unidades } };
    const score = calcularScoreCS(hipotetico, carteira).score;
    if (score !== null && score >= patamar) return { unidades, patamar };
  }
  return null;
}

// Dica do ritmo do CS (7.6): quanto falta e o ritmo semanal necessário até o fim do mês.
export function dicaRitmo(args: { label: string; meta: number; realizado: number; diasRestantes: number | null }): string | null {
  const falta = args.meta - args.realizado;
  if (!(falta > 0) || args.diasRestantes === null || args.diasRestantes <= 0) return null;
  const porSemana = faltaPorSemana(falta, args.diasRestantes);
  return args.label + ' está atrás do ritmo: ' + (falta === 1 ? 'falta 1' : 'faltam ' + numeroPt(falta)) +
    ' em ' + args.diasRestantes + ' dias, cerca de ' + numeroPt(porSemana) + ' por semana.';
}
