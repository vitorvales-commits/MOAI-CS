// Voz do liderado (pedido do Vitor, 05/10/2026). Transforma as respostas abertas do Pulso de CS em
// insights e em uma fila de sugestões que o líder trata com status: backlog (padrão), em andamento,
// realizado ou rejeitado. A visão que guia a tela é uma só: o líder quer entender o que os liderados
// dizem, do tema que mais se repete até o que ainda está sem resposta.
//
// De onde vêm os dados: um trigger do banco (voz_materializar, migração 20261005b_voz_liderado.sql)
// quebra cada resposta aberta de pulso_cs_items em sugestões de voz_liderado_itens e preserva o
// status a cada sincronização. Este módulo só lê, classifica por tema, resume e grava o status.
//
// Privacidade, as mesmas do Pulso: nenhum payload daqui leva o nome de quem respondeu nem o id da
// resposta de origem. A recorrência de um tema (em quantas respostas distintas aparece) é contada
// no servidor e só o número sai.
import type { SupabaseClient } from '@supabase/supabase-js';

export type StatusVoz = 'backlog' | 'em_andamento' | 'realizado' | 'rejeitado';
export const STATUS_VOZ: { chave: StatusVoz; rotulo: string }[] = [
  { chave: 'backlog', rotulo: 'Backlog' },
  { chave: 'em_andamento', rotulo: 'Em andamento' },
  { chave: 'realizado', rotulo: 'Realizado' },
  { chave: 'rejeitado', rotulo: 'Rejeitado' },
];
export function statusVozValido(s: any): s is StatusVoz {
  return STATUS_VOZ.some((x) => x.chave === s);
}

export const CAMPOS_VOZ: Record<string, string> = {
  melhorar: 'Melhorar no CS',
  comecar_parar_continuar: 'Começar, parar e continuar',
  tema_apoio: 'Apoio e desenvolvimento',
  lideranca_saber: 'Alerta à liderança',
  feedback_lideranca: 'Feedback à liderança',
};
export const TIPOS_VOZ: Record<string, string> = { comecar: 'Começar', parar: 'Parar', continuar: 'Continuar' };

// ============ temas ============
// Classificação por palavras, aplicada ao texto sem acento e em minúsculas. Fica no código, e não no
// banco, para que ajustar uma regra reclassifique tudo na hora, sem migração. Um texto recebe até dois
// temas, os de mais ocorrências, e cai em Outros quando nada bate.
export const TEMAS_VOZ: { chave: string; rotulo: string; termos: RegExp }[] = [
  { chave: 'processos', rotulo: 'Processos e sistemas', termos: /\b(monday|crm|sistema\w*|processo\w*|rotina\w*|automa\w*|dashboard|painel|checklist\w*|planilha\w*|ferramenta\w*|fluxo\w*|registro\w*|documenta\w*|template\w*)\b/g },
  { chave: 'carteira', rotulo: 'Carteira e acompanhamento', termos: /\b(carteira\w*|acompanhamento\w*|acompanhar|follow\w*|cobertura|conselho\w*|conselheiro\w*|reposic\w*|gtd)\b/g },
  { chave: 'carga', rotulo: 'Carga e priorização', termos: /\b(sobrecarga\w*|carga|urgente\w*|urgencia\w*|demanda\w*|prioridade\w*|priorizac\w*|interrupc\w*|prazo\w*|volume|atrasad\w*|capacidade|redistribui\w*)\b/g },
  { chave: 'comunicacao', rotulo: 'Comunicação e alinhamento', termos: /\b(comunicac\w*|alinhamento\w*|alinhar|reuniao|reunioes|transparenc\w*|clareza|informac\w*|feedback\w*|expectativa\w*)\b/g },
  { chave: 'membros', rotulo: 'Relacionamento com membros', termos: /\b(engajamento|membro\w*|relacionamento\w*|cliente\w*|retencao|churn|cancelamento\w*|experiencia)\b/g },
  { chave: 'cultura', rotulo: 'Time e cultura', termos: /\b(uniao|cultura|colaborac\w*|apoio|clima|confianca|integracao|ambiente|motivac\w*|presenca)\b/g },
  { chave: 'desenvolvimento', rotulo: 'Desenvolvimento e capacitação', termos: /\b(desenvolvimento|treinamento\w*|capacitac\w*|aprendizado|curso\w*|mentoria|crescimento|carreira|ia|inteligencia artificial|habilidade\w*|conhecimento)\b/g },
  { chave: 'lideranca', rotulo: 'Liderança e gestão', termos: /\b(lideranca|gestor\w*|gestao|decisao|decisoes|direcao|autonomia)\b/g },
  { chave: 'reconhecimento', rotulo: 'Reconhecimento e remuneração', termos: /\b(salario\w*|remuneracao|reconhecimento|bonus|beneficio\w*|promocao|plano de carreira)\b/g },
];
export const TEMA_OUTROS = { chave: 'outros', rotulo: 'Outros' };

export function semAcento(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function classificarTemas(texto: string): { chave: string; rotulo: string }[] {
  const t = semAcento(texto);
  const pontos = TEMAS_VOZ.map((tema, ordem) => {
    const m = t.match(new RegExp(tema.termos.source, 'g'));
    return { tema, ordem, n: m ? m.length : 0 };
  }).filter((x) => x.n > 0);
  if (pontos.length === 0) return [TEMA_OUTROS];
  pontos.sort((a, b) => b.n - a.n || a.ordem - b.ordem);
  return pontos.slice(0, 2).map((x) => ({ chave: x.tema.chave, rotulo: x.tema.rotulo }));
}

// ============ resumo ============

export type ItemVoz = {
  id: string;
  campo: string;
  campoRotulo: string;
  tipo: string | null;
  tipoRotulo: string | null;
  mes: string;
  texto: string;
  status: StatusVoz;
  observacao: string | null;
  statusAlteradoEm: string | null;
  criadoEm: string;
  diasNoBacklog: number | null;
  temas: { chave: string; rotulo: string }[];
  recorrencia: number; // em quantas respostas distintas o tema mais forte do item aparece
};

export type TemaResumo = { chave: string; rotulo: string; respostas: number; itens: number; porStatus: Record<StatusVoz, number> };

function zerarStatus(): Record<StatusVoz, number> {
  return { backlog: 0, em_andamento: 0, realizado: 0, rejeitado: 0 };
}

const DIA_MS = 24 * 60 * 60 * 1000;

// Função pura. Recebe as linhas ativas de voz_liderado_itens (com pulso_item_id, usado só aqui dentro
// para contar respostas distintas) e devolve itens, temas e a lista do que o time quer manter. O id
// da resposta de origem nunca entra no retorno.
export function montarVoz(linhas: any[], agora: Date = new Date()) {
  const comTemas = linhas.map((r) => ({ r, temas: classificarTemas(r.texto) }));

  // quem pede ação entra no quadro, quem pede para manter vira insight à parte
  const acionaveis = comTemas.filter((x) => x.r.tipo !== 'continuar');
  const manter = comTemas.filter((x) => x.r.tipo === 'continuar');

  const respostasPorTema = new Map<string, Set<number>>();
  acionaveis.forEach((x) => x.temas.forEach((t) => {
    if (!respostasPorTema.has(t.chave)) respostasPorTema.set(t.chave, new Set());
    respostasPorTema.get(t.chave)!.add(Number(x.r.pulso_item_id));
  }));

  const temasMapa = new Map<string, TemaResumo>();
  acionaveis.forEach((x) => x.temas.forEach((t) => {
    if (!temasMapa.has(t.chave)) temasMapa.set(t.chave, { chave: t.chave, rotulo: t.rotulo, respostas: respostasPorTema.get(t.chave)!.size, itens: 0, porStatus: zerarStatus() });
    const tm = temasMapa.get(t.chave)!;
    tm.itens++;
    tm.porStatus[x.r.status as StatusVoz]++;
  }));
  const temas = Array.from(temasMapa.values()).sort((a, b) => b.respostas - a.respostas || b.itens - a.itens || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  const itens: ItemVoz[] = acionaveis.map((x) => {
    const criado = new Date(x.r.criado_em);
    const rec = Math.max(...x.temas.map((t) => respostasPorTema.get(t.chave)?.size || 0), 0);
    return {
      id: x.r.id,
      campo: x.r.campo,
      campoRotulo: CAMPOS_VOZ[x.r.campo] || x.r.campo,
      tipo: x.r.tipo || null,
      tipoRotulo: x.r.tipo ? TIPOS_VOZ[x.r.tipo] || null : null,
      mes: x.r.mes_grupo_titulo,
      texto: x.r.texto,
      status: x.r.status,
      observacao: x.r.observacao_lider || null,
      statusAlteradoEm: x.r.status_alterado_em || null,
      criadoEm: x.r.criado_em,
      diasNoBacklog: x.r.status === 'backlog' && !isNaN(criado.getTime()) ? Math.max(0, Math.floor((agora.getTime() - criado.getTime()) / DIA_MS)) : null,
      temas: x.temas,
      recorrencia: rec,
    };
  }).sort((a, b) => b.recorrencia - a.recorrencia || (a.criadoEm < b.criadoEm ? 1 : -1));

  const porStatus = zerarStatus();
  itens.forEach((i) => { porStatus[i.status]++; });
  const total = itens.length;
  const tratadas = total - porStatus.backlog;

  return {
    resumo: {
      total,
      porStatus,
      taxaTratamento: total > 0 ? Math.round((tratadas / total) * 100) : null,
      respostasComSugestao: new Set(acionaveis.map((x) => Number(x.r.pulso_item_id))).size,
    },
    temas,
    itens,
    manter: manter.map((x) => ({ texto: x.r.texto, mes: x.r.mes_grupo_titulo })),
  };
}

// Frases curtas que respondem à pergunta do líder, nesta ordem de importância: o que mais se repete e
// ainda está parado, o que é alerta, o que está esquecido, o que o time quer manter, o gargalo mais
// citado. Texto corrido, sem travessão, porque a tela mostra como está.
export function gerarInsights(
  v: ReturnType<typeof montarVoz>,
  gargalos: { rotulo: string; qtd: number }[],
  respostasNoPeriodo: number,
): string[] {
  const out: string[] = [];
  if (v.resumo.total === 0) return out;

  const comBacklog = v.temas.filter((t) => t.porStatus.backlog > 0);
  const topo = v.temas[0];
  if (topo && topo.respostas >= 2) {
    out.push(`O tema mais citado é ${topo.rotulo}, presente em ${topo.respostas} de ${respostasNoPeriodo} resposta(s), com ${topo.porStatus.backlog} sugestão(ões) ainda em backlog.`);
  } else if (topo) {
    out.push(`Nenhum tema se repete em mais de uma resposta ainda. O mais frequente é ${topo.rotulo}, com ${topo.itens} sugestão(ões).`);
  }
  const parado = comBacklog.find((t) => t.respostas >= 2 && t.porStatus.em_andamento + t.porStatus.realizado === 0);
  if (parado && parado.chave !== topo?.chave) {
    out.push(`${parado.rotulo} aparece em ${parado.respostas} respostas e ainda não tem nenhuma sugestão em andamento ou realizada.`);
  }

  const alertas = v.itens.filter((i) => i.campo === 'lideranca_saber' && i.status === 'backlog').length;
  if (alertas > 0) out.push(`${alertas} alerta(s) à liderança aguardam uma primeira resposta. Vale tratar antes das demais sugestões.`);

  const antigas = v.itens.filter((i) => (i.diasNoBacklog || 0) >= 30).length;
  if (antigas > 0) out.push(`${antigas} sugestão(ões) estão há 30 dias ou mais em backlog, sem decisão.`);

  const parar = v.itens.filter((i) => i.tipo === 'parar' && i.status === 'backlog').length;
  if (parar > 0) out.push(`O time pede para parar ${parar} prática(s) que ainda não foram avaliadas.`);

  if (v.manter.length > 0) out.push(`O time também deixou ${v.manter.length} ponto(s) que quer manter, listados abaixo para que não se percam numa mudança.`);

  if (gargalos[0] && gargalos[0].qtd >= 2) out.push(`O maior gargalo apontado é ${gargalos[0].rotulo}, citado ${gargalos[0].qtd} vezes.`);

  if (v.resumo.taxaTratamento !== null) {
    out.push(`${v.resumo.taxaTratamento}% das sugestões já receberam uma decisão (${v.resumo.porStatus.em_andamento} em andamento, ${v.resumo.porStatus.realizado} realizada(s), ${v.resumo.porStatus.rejeitado} rejeitada(s)).`);
  }
  return out;
}

// ============ leitura e escrita ============

function linhasDoPeriodo<T extends { mes_grupo_titulo: string }>(linhas: T[], mes: string): T[] {
  if (mes === 'Visão Geral') return linhas;
  const alvo = mes.trim().toUpperCase();
  return linhas.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase() === alvo);
}

// GET /api/gestor/voz. Só gestor, garantido pela rota e pela RLS das tabelas.
export async function generateVozLiderado(sb: SupabaseClient, mes: string, ano: number) {
  const { data: linhasAll, error } = await sb.from('voz_liderado_itens')
    .select('id, pulso_item_id, campo, tipo, mes_grupo_titulo, texto, status, observacao_lider, status_alterado_em, criado_em')
    .eq('ativo', true).limit(5000);
  if (error) throw new Error('Erro ao buscar voz_liderado_itens: ' + error.message);

  const { data: pulso, error: errP } = await sb.from('pulso_cs_items').select('id, mes_grupo_titulo, gargalos').limit(5000);
  if (errP) throw new Error('Erro ao buscar pulso_cs_items: ' + errP.message);

  const doPeriodo = linhasDoPeriodo((linhasAll || []) as any[], mes);
  const pulsoPeriodo = linhasDoPeriodo((pulso || []) as any[], mes);
  const v = montarVoz(doPeriodo);

  const contagem = new Map<string, number>();
  pulsoPeriodo.forEach((p: any) => (Array.isArray(p.gargalos) ? p.gargalos : []).forEach((g: string) => { const k = (g || '').trim(); if (k) contagem.set(k, (contagem.get(k) || 0) + 1); }));
  const gargalos = Array.from(contagem.entries()).map(([rotulo, qtd]) => ({ rotulo, qtd })).sort((a, b) => b.qtd - a.qtd || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  const mesesNosDados = Array.from(new Set(((linhasAll || []) as any[]).map((r) => r.mes_grupo_titulo))).filter(Boolean);

  return {
    periodo: { mes, ano, geral: mes === 'Visão Geral', geradoEm: new Date().toISOString() },
    mesesDisponiveis: mesesNosDados,
    respostasNoPeriodo: pulsoPeriodo.length,
    ...v,
    gargalos,
    insights: gerarInsights(v, gargalos, pulsoPeriodo.length),
    status: STATUS_VOZ,
    temasDisponiveis: [...TEMAS_VOZ.map((t) => ({ chave: t.chave, rotulo: t.rotulo })), TEMA_OUTROS],
    campos: Object.entries(CAMPOS_VOZ).map(([chave, rotulo]) => ({ chave, rotulo })),
  };
}
export type VozGestor = Awaited<ReturnType<typeof generateVozLiderado>>;

// Muda o status de uma sugestão. A função do banco valida de novo que o chamador é gestor, confere o
// status e grava a auditoria. observacao nula mantém a observação atual, texto vazio apaga.
export async function definirStatusVoz(sb: SupabaseClient, id: string, status: string, observacao?: string | null) {
  if (!statusVozValido(status)) throw new Error('Status inválido.');
  const { data, error } = await sb.rpc('voz_definir_status', { p_id: id, p_status: status, p_observacao: observacao === undefined ? null : observacao });
  if (error) throw new Error(error.message);
  const r = (data || {}) as any;
  return {
    id: r.id as string,
    status: r.status as StatusVoz,
    observacao: (r.observacao_lider || null) as string | null,
    statusAlteradoEm: (r.status_alterado_em || null) as string | null,
  };
}
