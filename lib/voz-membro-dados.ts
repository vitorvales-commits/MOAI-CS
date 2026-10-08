// Montagem dos dados da voz do membro (churn, onda 2, 08/10/2026). Usada pela rota /api/gestor/membro/voz
// e pelo relatório imprimível, para que os dois mostrem exatamente os mesmos números. Lê o banco com o
// cliente do próprio gestor (RLS) e nunca devolve nome de respondente do NPS. Sem IA.
import { anonimizar, buscarTermosIdentificaveis, mesAtualBrasilia } from './churn.ts';
import { parseTituloConselho, ganhoRelatado } from './reports.ts';
import { semAcento } from './voz.ts';
import {
  classificarTemasMembro, ehNaoResposta, ehPreenchidoPeloCs, ehPrimeiroConselho, ehTravado,
  montarTemas, resumoNotas, conselhosComNotasBaixas, justificativasNotaBaixa, tabelaDesafio, frasesDesafio,
  type TextoVoz, type RespostaNps, type ExtrasConselho,
} from './voz-membro.ts';
import { VOZ_MEMBRO_JANELA_MESES, AMOSTRA_MINIMA } from './constants.ts';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STATUS_FORA_DO_CONSELHO = ['Não era do conselho', 'Retirado', 'Churn'];

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

// Monta a visão de voz do membro para o mês de referência (AAAA-MM), com cs e fonte opcionais
export async function carregarVozMembro(supabase: any, ref: string, cs: string, fonte: string) {
  const csNorm = semAcento(cs);
const meses = janela(ref, VOZ_MEMBRO_JANELA_MESES);
  const mesesAnteriores = janela(addMeses(ref, -VOZ_MEMBRO_JANELA_MESES), VOZ_MEMBRO_JANELA_MESES);
  const dentroAtual = new Set(meses);
  const dentroAnterior = new Set(mesesAnteriores);

  const [churnItens, churnDet, npsRows, grupos, membros, statusRows, atas, termos] = await Promise.all([
    todas((de, ate) => supabase.from('churn_items').select('id, data, created_at_monday, quem_e_seu_cs').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('churn_detalhes').select('churn_id, explicacao, expectativa_nao_atendida, sugestao_melhoria').order('churn_id').range(de, ate)),
    todas((de, ate) => supabase.from('nps_conselhos_items').select('id, group_id, mes_grupo_titulo, nota_conselheiro, nota_cs_hoje, nota_qualidade_trocas, nota_evolucao_desafios, continuidade_desafios, sugestao_texto, avalia_cs_texto').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_grupos').select('group_id, titulo, is_repo').order('group_id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_membros').select('id, group_id').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_status_mensal').select('membro_id, status').eq('mes', nomeMes(ref)).order('membro_id').range(de, ate)),
    todas((de, ate) => supabase.from('atas_conselho_extraido').select('id, group_id, membro_nome_ata, ganhos').eq('mes_ata', `${nomeMes(ref)}/${ref.slice(0, 4)}`).order('id').range(de, ate)),
    buscarTermosIdentificaveis(supabase),
  ]);

  // conselho -> título e CS (o CS sai do título, como em lib/reports.ts)
  const tituloDoGrupo = new Map<string, string>(grupos.map((g: any) => [g.group_id, g.titulo || g.group_id]));
  const csDoGrupo = (groupId: string | null) => {
    const titulo = groupId ? tituloDoGrupo.get(groupId) : null;
    return titulo ? parseTituloConselho(titulo)?.cs || '' : '';
  };
  const csBate = (c: string | null | undefined) => !csNorm || semAcento(c || '') === csNorm;

  // ---- textos da saída (churn_detalhes) e do NPS (sugestão e avaliação de CS) ----
  const detPorChurn = new Map<number, any>(churnDet.map((d: any) => [Number(d.churn_id), d]));
  const textos: TextoVoz[] = [];
  for (const it of churnItens) {
    const dataRef = it.data || (it.created_at_monday ? String(it.created_at_monday).slice(0, 10) : null);
    const mes = dataRef ? dataRef.slice(0, 7) : null;
    if (!mes || (!dentroAtual.has(mes) && !dentroAnterior.has(mes))) continue;
    if (!csBate(it.quem_e_seu_cs)) continue;
    const d = detPorChurn.get(Number(it.id)) || {};
    for (const texto of [d.explicacao, d.expectativa_nao_atendida, d.sugestao_melhoria]) {
      textos.push({ fonte: 'saida', mes, texto: texto ?? null });
    }
  }

  // ---- respostas do NPS (sem nome do respondente) ----
  const respostas: { mes: string; r: RespostaNps }[] = [];
  for (const r of npsRows) {
    const mes = mesDoTituloNps(r.mes_grupo_titulo);
    if (!mes || (!dentroAtual.has(mes) && !dentroAnterior.has(mes))) continue;
    const csDoConselho = csDoGrupo(r.group_id);
    if (!csBate(csDoConselho)) continue;
    const nomeConselho = r.group_id ? tituloDoGrupo.get(r.group_id) || null : null;
    respostas.push({ mes, r: {
      group_id: r.group_id, nome_grupo: nomeConselho, cs: csDoConselho || null,
      nota_conselheiro: r.nota_conselheiro, nota_cs_hoje: r.nota_cs_hoje,
      nota_qualidade_trocas: r.nota_qualidade_trocas, nota_evolucao_desafios: r.nota_evolucao_desafios,
      continuidade_desafios: r.continuidade_desafios, sugestao_texto: r.sugestao_texto, avalia_cs_texto: r.avalia_cs_texto,
    } });
    textos.push({ fonte: 'nps_sugestao', mes, texto: r.sugestao_texto ?? null });
    textos.push({ fonte: 'nps_cs', mes, texto: r.avalia_cs_texto ?? null });
  }
  const filtroFonte = (t: TextoVoz) => fonte === 'todas' || (fonte === 'saida' ? t.fonte === 'saida' : t.fonte !== 'saida');
  const textosAtual = textos.filter((t) => dentroAtual.has(t.mes) && filtroFonte(t));
  const textosAnterior = textos.filter((t) => dentroAnterior.has(t.mes) && filtroFonte(t));

  const respAtual = respostas.filter((x) => dentroAtual.has(x.mes)).map((x) => x.r);
  const respAnterior = respostas.filter((x) => dentroAnterior.has(x.mes)).map((x) => x.r);
  const respDoMes = respostas.filter((x) => x.mes === ref).map((x) => x.r);
  const respDoMesAnterior = respostas.filter((x) => x.mes === addMeses(ref, -1)).map((x) => x.r);

  // ---- b2: temas e trechos ----
  const tema = montarTemas(textosAtual, textosAnterior);
  const trechos: Record<string, { fonte: string; mes: string; texto: string }[]> = {};
  for (const linha of tema.ranking) {
    trechos[linha.chave] = textosAtual
      .filter((t) => !ehPreenchidoPeloCs(t.texto) && !ehNaoResposta(t.texto) && classificarTemasMembro(t.texto as string).some((x) => x.chave === linha.chave))
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, 5)
      .map((t) => ({ fonte: t.fonte, mes: t.mes, texto: anonimizar(t.texto, termos) }));
  }

  // ---- presença e ganhos por conselho, no mês de referência (extras da tabela de desafio) ----
  const membroDoGrupo = new Map<number, string>(membros.map((m: any) => [Number(m.id), m.group_id]));
  const presenca = new Map<string, { agendados: number; presentes: number }>();
  for (const s of statusRows) {
    const grupo = membroDoGrupo.get(Number(s.membro_id));
    if (!grupo || !s.status || STATUS_FORA_DO_CONSELHO.includes(s.status)) continue;
    if (!presenca.has(grupo)) presenca.set(grupo, { agendados: 0, presentes: 0 });
    const p = presenca.get(grupo)!;
    p.agendados++;
    if (s.status === 'Presente') p.presentes++;
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

  // ---- b4: notas ----
  const dimensoes = resumoNotas(respAtual, respAnterior);
  const conselhosNotas = conselhosComNotasBaixas(respAtual);
  const justificativas = justificativasNotaBaixa(respAtual);

  // ---- b5: desafio ----
  const tabela = tabelaDesafio(respAtual, extras);
  const travadosDe = (rs: RespostaNps[]) => {
    const base = rs.filter((r) => !!r.continuidade_desafios && !ehPrimeiroConselho(r));
    const travados = base.filter(ehTravado).length;
    return { travados, base: base.length, pct: pct(travados, base.length) };
  };
  const desafioJanela = travadosDe(respAtual);
  const desafioAnterior = travadosDe(respAnterior);
  const desafioMes = travadosDe(respDoMes);
  const desafioMesAnterior = travadosDe(respDoMesAnterior);

  const conselhosAtivos = grupos.filter((g: any) => !g.is_repo).length;
  const comAta = ataPorGrupo.size;

  return ({
    periodo: { ref, inicio: meses[0], anterior: { inicio: mesesAnteriores[0], fim: mesesAnteriores[mesesAnteriores.length - 1] } },
    filtros: { cs, fonte },
    b2: {
      ...tema,
      trechos,
      rodape: `${tema.textosAnalisados} textos analisados, ${tema.descartadosVazios} descartados por não trazerem conteúdo, ${tema.preenchidosPeloCs} formulários de saída preenchidos pelo CS.`,
    },
    b4: { dimensoes, conselhos: conselhosNotas, justificativas },
    b5: {
      tabela,
      frases: frasesDesafio(tabela),
      percentualTravados: { janela: desafioJanela, anterior: desafioAnterior },
      aviso: `Só ${comAta} de ${conselhosAtivos} conselhos têm atas extraídas neste mês; a coluna de ganhos cobre apenas esses.`,
    },
    cartao4: { atual: desafioMes, anterior: desafioMesAnterior },
  });

}
