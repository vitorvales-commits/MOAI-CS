// Montagem dos dados da voz do membro, em duas leituras separadas por fonte (revisto em 08/10/2026).
//
// carregarSaidaMembro: só o formulário de saída (board de churn 10008640053, tabelas churn_items e
// churn_detalhes). Alimenta a aba Churn: as três perguntas abertas lidas separadamente e a disposição
// para voltar. carregarNpsConselhos: só o NPS dos conselhos (board 18393367198, nps_conselhos_items),
// com presença e atas como contexto. Alimenta a aba NPS dos conselhos. Até 08/10/2026 as duas fontes
// eram misturadas numa única aba, o que deixava as notas de NPS no meio da leitura de churn.
//
// Lê o banco com o cliente do próprio gestor (RLS), anonimiza todo trecho de texto e nunca devolve
// nome de respondente do NPS. Sem IA: temas por expressão regular, contagens e regras fixas.
import { anonimizar, buscarTermosIdentificaveis, infoMotivo } from './churn.ts';
import { parseTituloConselho, ganhoRelatado } from './reports.ts';
import { semAcento, TEMA_OUTROS } from './voz.ts';
import { ehSemSugestao, polaridadeAvaliacaoCs } from './voz-membro/sugestoes.ts';
import {
  classificarTemasMembro, ehNaoResposta, ehPreenchidoPeloCs, ehPrimeiroConselho, ehTravado,
  montarTemas, resumoNotas, conselhosComNotasBaixas, justificativasNotaBaixa, tabelaDesafio, frasesDesafio,
  distribuicaoContinuidade, DIMENSOES_NOTA, PERGUNTAS_SAIDA, resumoRetorno, frasesRetorno,
  type TextoVoz, type RespostaNps, type ExtrasConselho, type FonteVoz, type ResumoTemas, TEMAS_MEMBRO,
} from './voz-membro.ts';
import { VOZ_MEMBRO_JANELA_MESES, AMOSTRA_MINIMA, STATUS_AUSENTE_SET } from './constants.ts';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STATUS_FORA_DO_CONSELHO = ['Não era do conselho', 'Retirado', 'Churn'];
const TRECHOS_POR_TEMA = 5;

function addMeses(ref: string, n: number): string {
  const [a, m] = ref.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}
function janela(ref: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMeses(ref, -(n - 1 - i)));
}
function nomeMes(ref: string): string {
  return MESES[Number(ref.slice(5, 7)) - 1];
}
// "Agosto 2026" (mes_grupo_titulo do NPS) vira "2026-08"
function mesDoTituloNps(titulo: string | null): string | null {
  if (!titulo) return null;
  const [nome, ano] = titulo.trim().split(/\s+/);
  const i = MESES.findIndex((m) => semAcento(m) === semAcento(nome || ''));
  if (i < 0 || !ano) return null;
  return `${ano}-${String(i + 1).padStart(2, '0')}`;
}
// Lê uma tabela inteira em páginas de 1000 (o limite padrão do PostgREST corta respostas maiores)
async function todas(consulta: (de: number, ate: number) => any): Promise<any[]> {
  const out: any[] = [];
  let de = 0;
  while (true) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    de += 1000;
  }
  return out;
}
function pct(parte: number, base: number): number | null {
  return base >= AMOSTRA_MINIMA ? Math.round((parte / base) * 1000) / 10 : null;
}
// modo "mes" compara o mês com o mês anterior; "tres" compara os três meses com os três anteriores (rodada 2, N1)
function periodo(ref: string, modo: 'mes' | 'tres' = 'tres') {
  const n = modo === 'mes' ? 1 : VOZ_MEMBRO_JANELA_MESES;
  const meses = janela(ref, n);
  const mesesAnteriores = janela(addMeses(ref, -n), n);
  return { meses, mesesAnteriores, dentroAtual: new Set(meses), dentroAnterior: new Set(mesesAnteriores) };
}
// Até TRECHOS_POR_TEMA trechos anonimizados por tema, os mais recentes primeiro
function trechosPorTema(resumo: ResumoTemas, textos: TextoVoz[], termos: string[]) {
  const out: Record<string, { fonte: string; mes: string; texto: string }[]> = {};
  for (const linha of resumo.ranking) {
    out[linha.chave] = textos
      .filter((t) => !ehPreenchidoPeloCs(t.texto) && !ehNaoResposta(t.texto) && classificarTemasMembro(t.texto as string).some((x) => x.chave === linha.chave))
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, TRECHOS_POR_TEMA)
      .map((t) => ({ fonte: t.fonte, mes: t.mes, texto: anonimizar(t.texto, termos) }));
  }
  return out;
}
// Uma leitura de temas pronta para a tela: ranking, insights por regra, trechos e rodapé
function leituraDeTemas(atual: TextoVoz[], anterior: TextoVoz[], termos: string[], contarPreenchidosPeloCs: boolean) {
  const resumo = montarTemas(atual, anterior);
  const insights: string[] = [];
  const topo = resumo.ranking[0];
  if (topo) insights.push(`O tema mais citado é ${topo.rotulo}, em ${topo.textos} ${topo.textos === 1 ? 'resposta' : 'respostas'}.`);
  const cresceu = resumo.ranking.filter((l) => l.delta >= 3).sort((x, y) => y.delta - x.delta)[0];
  if (cresceu) insights.push(`${cresceu.rotulo} cresceu ${cresceu.delta} respostas em relação ao período anterior.`);
  const rodape = `${resumo.textosAnalisados} respostas com conteúdo, ${resumo.descartadosVazios} sem conteúdo` +
    (contarPreenchidosPeloCs ? `, ${resumo.preenchidosPeloCs} preenchidas pelo CS no lugar do membro` : '') + '.';
  return {
    ranking: resumo.ranking,
    textosAnalisados: resumo.textosAnalisados,
    descartadosVazios: resumo.descartadosVazios,
    preenchidosPeloCs: resumo.preenchidosPeloCs,
    insights,
    trechos: trechosPorTema(resumo, atual, termos),
    rodape,
  };
}

// ======================================================================================
// Gráficos de sugestões do NPS (revisão out/2026, rodada 2, Fase 7). Descartam textos sem sugestão antes de
// contar. Conselho: sugestao_texto é sempre crítica, então barras por tema com o mês e o mês anterior.
// CS: avalia_cs_texto é elogio ou crítica pela nota de hoje, então barras divergentes por tema.
const TEMAS_NO_GRAFICO = 6;
function temasDoMesPorPolo(lista: TextoVoz[], mes: string): Map<string, number> {
  const m = new Map<string, number>();
  lista.filter((t) => t.mes === mes).forEach((t) => {
    new Set(classificarTemasMembro(t.texto as string).map((x) => x.chave)).forEach((c) => m.set(c, (m.get(c) || 0) + 1));
  });
  return m;
}
function graficoConselho(textos: TextoVoz[], ref: string, dentroAtual: Set<string>, termos: string[]) {
  const mesAnt = addMeses(ref, -1);
  const validos = textos.filter((t) => t.texto && !ehSemSugestao(t.texto));
  const contaRef = temasDoMesPorPolo(validos, ref);
  const contaAnt = temasDoMesPorPolo(validos, mesAnt);
  const rotulos = new Map<string, string>();
  validos.forEach((t) => classificarTemasMembro(t.texto as string).forEach((x) => rotulos.set(x.chave, x.rotulo)));
  const chaves = Array.from(new Set([...contaRef.keys(), ...contaAnt.keys()])).filter((c) => c !== TEMA_OUTROS.chave)
    .sort((a, b) => (contaRef.get(b) || 0) - (contaRef.get(a) || 0) || (rotulos.get(a) || a).localeCompare(rotulos.get(b) || b, 'pt-BR'));
  const topo = chaves.slice(0, TEMAS_NO_GRAFICO);
  const topoSet = new Set(topo);
  const doMes = textos.filter((t) => t.mes === ref);
  const semSugestao = doMes.filter((t) => ehSemSugestao(t.texto)).length;
  const outrosRef = validos.filter((t) => t.mes === ref && !classificarTemasMembro(t.texto as string).some((x) => topoSet.has(x.chave))).length;
  const outrosAnt = validos.filter((t) => t.mes === mesAnt && !classificarTemasMembro(t.texto as string).some((x) => topoSet.has(x.chave))).length;
  const trechos: Record<string, { texto: string; mes: string; conselho: string | null; nota: number | null }[]> = {};
  topo.forEach((c) => {
    trechos[c] = validos.filter((t) => dentroAtual.has(t.mes) && classificarTemasMembro(t.texto as string).some((x) => x.chave === c))
      .sort((x, y) => y.mes.localeCompare(x.mes))
      .map((t) => ({ texto: anonimizar(t.texto as string, termos), mes: t.mes, conselho: t.conselho ?? null, nota: t.nota ?? null }));
  });
  return {
    temas: topo.map((c) => ({ chave: c, rotulo: rotulos.get(c) || c, mesRef: contaRef.get(c) || 0, mesAnterior: contaAnt.get(c) || 0 })),
    outros: { mesRef: outrosRef, mesAnterior: outrosAnt },
    respondentes: doMes.length,
    semSugestao,
    trechos,
  };
}
function graficoCs(textos: TextoVoz[], ref: string, dentroAtual: Set<string>, termos: string[]) {
  const mesAnt = addMeses(ref, -1);
  const comPolo = textos.filter((t) => t.texto && !ehSemSugestao(t.texto) && polaridadeAvaliacaoCs(t.nota ?? null));
  const poloDe = (t: TextoVoz) => polaridadeAvaliacaoCs(t.nota ?? null) as 'elogio' | 'critica';
  const contaPolo = (polo: 'elogio' | 'critica', mes: string) => temasDoMesPorPolo(comPolo.filter((t) => poloDe(t) === polo), mes);
  const cRefCrit = contaPolo('critica', ref), cRefElog = contaPolo('elogio', ref);
  const cAntCrit = contaPolo('critica', mesAnt), cAntElog = contaPolo('elogio', mesAnt);
  const rotulos = new Map<string, string>();
  comPolo.forEach((t) => classificarTemasMembro(t.texto as string).forEach((x) => rotulos.set(x.chave, x.rotulo)));
  const chaves = Array.from(new Set([...cRefCrit.keys(), ...cRefElog.keys(), ...cAntCrit.keys(), ...cAntElog.keys()])).filter((c) => c !== TEMA_OUTROS.chave)
    .sort((a, b) => ((cRefCrit.get(b) || 0) + (cRefElog.get(b) || 0)) - ((cRefCrit.get(a) || 0) + (cRefElog.get(a) || 0)) || (rotulos.get(a) || a).localeCompare(rotulos.get(b) || b, 'pt-BR'));
  const topo = chaves.slice(0, TEMAS_NO_GRAFICO).sort((a, b) => (cRefCrit.get(b) || 0) - (cRefCrit.get(a) || 0));
  const trechos: Record<string, { texto: string; nota: number | null; mes: string; conselho: string | null }[]> = {};
  topo.forEach((c) => {
    ['critica', 'elogio'].forEach((polo) => {
      trechos[`${polo}|${c}`] = comPolo.filter((t) => dentroAtual.has(t.mes) && poloDe(t) === polo && classificarTemasMembro(t.texto as string).some((x) => x.chave === c))
        .sort((x, y) => y.mes.localeCompare(x.mes))
        .map((t) => ({ texto: anonimizar(t.texto as string, termos), nota: t.nota ?? null, mes: t.mes, conselho: t.conselho ?? null }));
    });
  });
  const doMes = textos.filter((t) => t.mes === ref);
  return {
    temas: topo.map((c) => ({ chave: c, rotulo: rotulos.get(c) || c,
      critica: cRefCrit.get(c) || 0, elogio: cRefElog.get(c) || 0, criticaAnterior: cAntCrit.get(c) || 0, elogioAnterior: cAntElog.get(c) || 0 })),
    respondentes: doMes.length,
    semSugestao: doMes.filter((t) => ehSemSugestao(t.texto)).length,
    trechos,
  };
}

// ======================================================================================
// Cobertura do NPS (revisão out/2026, rodada 2, N2). Conselheiro é o nome antes de " [" no título do grupo.
// Conselho que ainda não aconteceu (data depois de agora) nunca tem nota: aparece só em "proximos".
const conselheiroDoTituloNps = (titulo: string | null | undefined) => String(titulo || '').split(' [')[0].trim();
function coberturaNps(agendaRows: any[], respostasMes: RespostaNps[], ref: string, agora: Date) {
  const cancelado = (s: string | null) => semAcento(String(s || '')).includes('cancelad');
  const doMes = agendaRows.filter((a: any) => a.conselheiro_nome && a.data_iso && String(a.data_iso).slice(0, 7) === ref && !cancelado(a.status));
  const realizadas = doMes.filter((a: any) => new Date(a.data_iso).getTime() <= agora.getTime());
  const proximas = doMes.filter((a: any) => new Date(a.data_iso).getTime() > agora.getTime())
    .sort((x: any, y: any) => new Date(x.data_iso).getTime() - new Date(y.data_iso).getTime())
    .map((a: any) => ({ conselheiro: a.conselheiro_nome as string, dataIso: a.data_iso as string }));
  const comResposta = new Set(respostasMes.map((r) => semAcento(conselheiroDoTituloNps(r.nome_grupo))));
  const conselheirosRealizados = Array.from(new Set(realizadas.map((a: any) => a.conselheiro_nome as string)));
  const avaliados = conselheirosRealizados.filter((c) => comResposta.has(semAcento(c))).length;
  return {
    previstos: doMes.length,
    realizados: conselheirosRealizados.length,
    avaliados,
    proximos: proximas,
  };
}

// Pontos para "Onde a nota cai" (rodada 2, N3): por dimensão, a média de cada conselho na escala de 0 a 10.
// Gráfico de pontos, sem tabela. Notas de 5 pontos são convertidas para 10.
const DIMENSOES_PONTOS = [
  { chave: 'conselheiro', rotulo: 'Conselheiro', campo: 'nota_conselheiro', escala: 10 },
  { chave: 'cs', rotulo: 'CS', campo: 'nota_cs_hoje', escala: 10 },
  { chave: 'trocas', rotulo: 'Trocas', campo: 'nota_qualidade_trocas', escala: 5 },
  { chave: 'evolucao', rotulo: 'Evolução', campo: 'nota_evolucao_desafios', escala: 5 },
];
function pontosDimensoes(rs: RespostaNps[]) {
  return DIMENSOES_PONTOS.map((d) => {
    const porConselho = new Map<string, { conselho: string; cs: string | null; soma: number; n: number }>();
    rs.forEach((r) => {
      const v = (r as any)[d.campo];
      if (v === null || v === undefined || !r.group_id) return;
      const nota = d.escala === 5 ? Number(v) * 2 : Number(v);
      const k = String(r.group_id);
      if (!porConselho.has(k)) porConselho.set(k, { conselho: r.nome_grupo || k, cs: r.cs ?? null, soma: 0, n: 0 });
      const e = porConselho.get(k)!;
      e.soma += nota;
      e.n++;
    });
    return {
      chave: d.chave,
      rotulo: d.rotulo,
      pontos: Array.from(porConselho.values()).map((e) => ({ conselho: e.conselho, cs: e.cs, media: Math.round((e.soma / e.n) * 10) / 10, respostas: e.n })),
    };
  });
}

// ======================================================================================
// Aba Churn: formulário de saída
// ======================================================================================

// Mês de referência AAAA-MM; cs opcional (mesmo campo "Quem é o seu CS" usado na tela de churn)
export async function carregarSaidaMembro(supabase: any, ref: string, cs: string) {
  const csNorm = semAcento(cs);
  const { meses, mesesAnteriores, dentroAtual, dentroAnterior } = periodo(ref);
  const mesAnterior = addMeses(ref, -1);

  const [churnItens, churnDet, termos] = await Promise.all([
    todas((de, ate) => supabase.from('churn_items').select('id, data, created_at_monday, quem_e_seu_cs, motivo_principal').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('churn_detalhes').select('churn_id, explicacao, expectativa_nao_atendida, sugestao_melhoria, nota_retorno').order('churn_id').range(de, ate)),
    buscarTermosIdentificaveis(supabase),
  ]);
  const detPorChurn = new Map<number, any>(churnDet.map((d: any) => [Number(d.churn_id), d]));
  const csBate = (c: string | null | undefined) => !csNorm || semAcento(c || '') === csNorm;

  type Saida = { mes: string; motivo: string; det: any; preenchidoPeloCs: boolean };
  const saidas: Saida[] = [];
  for (const it of churnItens) {
    if (!csBate(it.quem_e_seu_cs)) continue;
    const dataRef = it.data || (it.created_at_monday ? String(it.created_at_monday).slice(0, 10) : null);
    const mes = dataRef ? dataRef.slice(0, 7) : null;
    if (!mes) continue;
    const det = detPorChurn.get(Number(it.id)) || {};
    saidas.push({ mes, motivo: it.motivo_principal || 'nao_informado', det, preenchidoPeloCs: ehPreenchidoPeloCs(det.explicacao) });
  }

  // ---- as três perguntas abertas, cada uma com sua leitura de temas ----
  const perguntas = PERGUNTAS_SAIDA.map((p) => {
    const textosDe = (dentro: Set<string>): TextoVoz[] => saidas
      .filter((s) => dentro.has(s.mes))
      .map((s) => ({ fonte: 'saida' as FonteVoz, mes: s.mes, texto: s.det[p.campo] ?? null }));
    return { chave: p.chave, rotulo: p.rotulo, pergunta: p.pergunta, ...leituraDeTemas(textosDe(dentroAtual), textosDe(dentroAnterior), termos, true) };
  });

  // ---- disposição para voltar ----
  const linhasRetorno = (filtro: (s: Saida) => boolean) => saidas.filter(filtro).map((s) => ({
    motivo: s.motivo, nota: s.det.nota_retorno ?? null, preenchidoPeloCs: s.preenchidoPeloCs,
  }));
  const historico = resumoRetorno(linhasRetorno(() => true));
  const retornoMes = resumoRetorno(linhasRetorno((s) => s.mes === ref));
  const retornoMesAnterior = resumoRetorno(linhasRetorno((s) => s.mes === mesAnterior));
  const rotuloMotivo = (chave: string) => infoMotivo(chave).rotulo;
  const primeiroMes = saidas.map((s) => s.mes).sort()[0] || null;

  return {
    periodo: { ref, inicio: meses[0], anterior: { inicio: mesesAnteriores[0], fim: mesesAnteriores[mesesAnteriores.length - 1] } },
    filtros: { cs },
    b2: {
      perguntas,
      // lista de temas para o formulário de melhorias (mesmo catálogo das duas abas)
      temas: TEMAS_MEMBRO.map((x) => ({ chave: x.chave, rotulo: x.rotulo })),
    },
    retorno: {
      historico: {
        ...historico,
        porMotivo: historico.porMotivo.map((m) => ({ ...m, rotulo: rotuloMotivo(m.motivo), cor: infoMotivo(m.motivo).cor })),
        desde: primeiroMes,
      },
      frases: frasesRetorno(historico, rotuloMotivo),
      mes: { base: retornoMes.base, voltaria: retornoMes.faixas.voltaria, talvez: retornoMes.faixas.talvez, media: retornoMes.media },
      mesAnterior: { base: retornoMesAnterior.base, voltaria: retornoMesAnterior.faixas.voltaria, media: retornoMesAnterior.media },
    },
  };
}

// ======================================================================================
// Aba NPS dos conselhos
// ======================================================================================

export async function carregarNpsConselhos(supabase: any, ref: string, cs: string, modo: 'mes' | 'tres' = 'mes') {
  const csNorm = semAcento(cs);
  const { meses, mesesAnteriores, dentroAtual, dentroAnterior } = periodo(ref, modo);

  const [npsRows, grupos, membros, statusRows, atas, termos, agendaRows] = await Promise.all([
    todas((de, ate) => supabase.from('nps_conselhos_items').select('id, group_id, mes_grupo_titulo, nota_conselho, nota_conselheiro, nota_cs_hoje, nota_qualidade_trocas, nota_evolucao_desafios, continuidade_desafios, sugestao_texto, avalia_cs_texto').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_grupos').select('group_id, titulo, is_repo').order('group_id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_membros').select('id, group_id').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_status_mensal').select('membro_id, status').eq('mes', nomeMes(ref)).order('membro_id').range(de, ate)),
    todas((de, ate) => supabase.from('atas_conselho_extraido').select('id, group_id, membro_nome_ata, ganhos').eq('mes_ata', `${nomeMes(ref)}/${ref.slice(0, 4)}`).order('id').range(de, ate)),
    buscarTermosIdentificaveis(supabase),
    todas((de, ate) => supabase.from('agenda_conselhos_items').select('conselheiro_nome, data_iso, status').order('id').range(de, ate)),
  ]);

  // conselho -> título e CS (o CS sai do título, como em lib/reports.ts)
  const tituloDoGrupo = new Map<string, string>(grupos.map((g: any) => [g.group_id, g.titulo || g.group_id]));
  const csDoGrupo = (groupId: string | null) => {
    const titulo = groupId ? tituloDoGrupo.get(groupId) : null;
    return titulo ? parseTituloConselho(titulo)?.cs || '' : '';
  };
  const csBate = (c: string | null | undefined) => !csNorm || semAcento(c || '') === csNorm;
  const csDisponiveis = new Set<string>();

  // ---- respostas do NPS (sem nome do respondente) ----
  const respostas: { mes: string; r: RespostaNps }[] = [];
  const textosSugestao: TextoVoz[] = [];
  const textosCs: TextoVoz[] = [];
  for (const r of npsRows) {
    const mes = mesDoTituloNps(r.mes_grupo_titulo);
    if (!mes || (!dentroAtual.has(mes) && !dentroAnterior.has(mes))) continue;
    const csDoConselho = csDoGrupo(r.group_id);
    if (csDoConselho) csDisponiveis.add(csDoConselho);
    if (!csBate(csDoConselho)) continue;
    const nomeConselho = r.group_id ? tituloDoGrupo.get(r.group_id) || null : null;
    respostas.push({ mes, r: {
      group_id: r.group_id, nome_grupo: nomeConselho, cs: csDoConselho || null,
      nota_conselheiro: r.nota_conselheiro, nota_cs_hoje: r.nota_cs_hoje,
      nota_qualidade_trocas: r.nota_qualidade_trocas, nota_evolucao_desafios: r.nota_evolucao_desafios,
      continuidade_desafios: r.continuidade_desafios, sugestao_texto: r.sugestao_texto, avalia_cs_texto: r.avalia_cs_texto,
    } });
    textosSugestao.push({ fonte: 'nps_sugestao', mes, texto: r.sugestao_texto ?? null, nota: r.nota_conselho ?? null, conselho: nomeConselho });
    textosCs.push({ fonte: 'nps_cs', mes, texto: r.avalia_cs_texto ?? null, nota: r.nota_cs_hoje ?? null });
  }
  const respAtual = respostas.filter((x) => dentroAtual.has(x.mes)).map((x) => x.r);
  const respAnterior = respostas.filter((x) => dentroAnterior.has(x.mes)).map((x) => x.r);
  const respDoMes = respostas.filter((x) => x.mes === ref).map((x) => x.r);
  const respDoMesAnterior = respostas.filter((x) => x.mes === addMeses(ref, -1)).map((x) => x.r);

  // ---- o que os membros sugerem: sugestões sobre o conselho e avaliação do CS, separadas ----
  // Gráficos (revisão out/2026, rodada 2, Fase 7): sugestão sobre o conselho em barras por tema; avaliação do CS em barras divergentes.
  const sugestoes = {
    conselho: graficoConselho(textosSugestao, ref, dentroAtual, termos),
    cs: graficoCs(textosCs, ref, dentroAtual, termos),
    // Cobertura em uma linha (C3): conselhos do time com resposta no mês de referência. A data do conselho
    // não está na tabela de NPS, então o universo são os conselhos ativos (conselhos_grupos).
    cobertura: coberturaNps(agendaRows, respDoMes, ref, new Date()),
    semTexto: {
      conselho: textosSugestao.filter((t) => dentroAtual.has(t.mes) && !t.texto).length,
      cs: textosCs.filter((t) => dentroAtual.has(t.mes) && !t.texto).length,
    },
  };

  // ---- presença e ganhos por conselho, no mês de referência ----
  const membroDoGrupo = new Map<number, string>(membros.map((m: any) => [Number(m.id), m.group_id]));
  const presenca = new Map<string, { agendados: number; presentes: number }>();
  for (const s of statusRows) {
    const grupo = membroDoGrupo.get(Number(s.membro_id));
    // Mesma regra de presencaDoMes (lib/reports.ts): só conta quem tem presença apurada no mês,
    // Presente ou ausente (Ausente, Não vai). Confirmado, Agd. Confirmação, Congelado e afins ainda não
    // dizem se a pessoa foi, e antes (até 08/10/2026) entravam no denominador e geravam presença 0%.
    if (!grupo || !s.status || STATUS_FORA_DO_CONSELHO.includes(s.status)) continue;
    const presente = s.status === 'Presente';
    const ausente = STATUS_AUSENTE_SET.includes(s.status);
    if (!presente && !ausente) continue;
    if (!presenca.has(grupo)) presenca.set(grupo, { agendados: 0, presentes: 0 });
    const p = presenca.get(grupo)!;
    p.agendados++;
    if (presente) p.presentes++;
  }
  const ataPorGrupo = new Map<string, { membros: Set<string>; comGanho: Set<string> }>();
  for (const a of atas) {
    if (!ataPorGrupo.has(a.group_id)) ataPorGrupo.set(a.group_id, { membros: new Set(), comGanho: new Set() });
    const e = ataPorGrupo.get(a.group_id)!;
    const nome = (a.membro_nome_ata || '').trim();
    if (!nome) continue;
    e.membros.add(nome);
    if (ganhoRelatado(a.ganhos)) e.comGanho.add(nome);
  }
  const extras: ExtrasConselho = new Map();
  const gruposDesafio = new Set([...respAtual.map((r) => r.group_id as string), ...presenca.keys(), ...ataPorGrupo.keys()]);
  for (const g of gruposDesafio) {
    const p = presenca.get(g);
    const a = ataPorGrupo.get(g);
    extras.set(g, {
      presencaPercentual: p ? pct(p.presentes, p.agendados) : null,
      ganhosPercentual: a && a.membros.size >= AMOSTRA_MINIMA ? pct(a.comGanho.size, a.membros.size) : null,
    });
  }

  // ---- notas e desafio ----
  const tabela = tabelaDesafio(respAtual, extras);
  const travadosDe = (rs: RespostaNps[]) => {
    const base = rs.filter((r) => !!r.continuidade_desafios && !ehPrimeiroConselho(r));
    const travados = base.filter(ehTravado).length;
    return { travados, base: base.length, pct: pct(travados, base.length) };
  };
  const conselhosAtivos = grupos.filter((g: any) => !g.is_repo).length;

  return {
    periodo: { ref, inicio: meses[0], anterior: { inicio: mesesAnteriores[0], fim: mesesAnteriores[mesesAnteriores.length - 1] } },
    filtros: { cs },
    csDisponiveis: Array.from(csDisponiveis).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    respostas: { janela: respAtual.length, anterior: respAnterior.length, mes: respDoMes.length },
    b4: {
      dimensoes: resumoNotas(respAtual, respAnterior),
      conselhos: conselhosComNotasBaixas(respAtual),
      pontos: pontosDimensoes(respAtual),
      justificativas: justificativasNotaBaixa(respAtual),
      dimensoesRotulos: DIMENSOES_NOTA,
    },
    b5: {
      tabela,
      frases: frasesDesafio(tabela),
      percentualTravados: { janela: travadosDe(respAtual), anterior: travadosDe(respAnterior) },
      continuidade: { atual: distribuicaoContinuidade(respAtual), anterior: distribuicaoContinuidade(respAnterior) },
      semPresenca: tabela.filter((l) => l.presencaPercentual === null).length,
      aviso: `Só ${ataPorGrupo.size} de ${conselhosAtivos} conselhos têm atas extraídas neste mês; a coluna de ganhos cobre apenas esses.`,
    },
    sugestoes,
    travadosMes: { atual: travadosDe(respDoMes), anterior: travadosDe(respDoMesAnterior) },
  };
}
