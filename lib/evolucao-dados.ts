// Acesso a dados da evolução (08/10/2026). Meses em sequência, nunca em paralelo, para não estourar
// a memória nem o tempo da função. Mês aberto é calculado ao vivo. Mês fechado é lido de
// cs_fechamento_mensal; se não existir, é calculado e gravado pela RPC salvar_fechamento_mensal, até
// FECHAMENTO_MAX_POR_REQUISICAO meses por chamada. Os excedentes voltam com pendente true.
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateVisaoGestor, RADAR_EIXOS } from './reports';
import { MESES_ORDEM, FECHAMENTO_DIA_CORTE, FECHAMENTO_MAX_POR_REQUISICAO, EVOLUCAO_MES_INICIAL } from './constants';
import { mesAberto, linhasFechamento, variacaoRanking, type MesRef, type LinhaFechamento } from './evolucao';

export type MesEvolucao = {
  ano: number;
  mes: number;
  rotulo: string;
  aberto: boolean;
  pendente: boolean;
  linhas: LinhaFechamento[] | null;
};

function rotuloMes(m: MesRef): string {
  return MESES_ORDEM[m.mes - 1] + ' ' + m.ano;
}

function mapLinhaBanco(r: any): LinhaFechamento {
  return {
    csNome: r.cs_nome,
    pontuacao: r.pontuacao ?? null,
    estado: r.estado,
    elegiveis: r.elegiveis ?? 0,
    posicao: r.posicao ?? null,
    totalRankeados: r.total_rankeados ?? 0,
    radar: Array.isArray(r.radar) ? r.radar : [],
  };
}

export async function obterMesesTime(sb: SupabaseClient, meses: MesRef[], hoje: string): Promise<MesEvolucao[]> {
  const resultado: MesEvolucao[] = [];
  let gravadosNestaRequisicao = 0;

  for (const m of meses) {
    const nome = MESES_ORDEM[m.mes - 1];
    const rotulo = rotuloMes(m);

    if (mesAberto(m.ano, m.mes, hoje, FECHAMENTO_DIA_CORTE)) {
      const visao = await generateVisaoGestor(sb, nome, m.ano, false);
      resultado.push({ ...m, rotulo, aberto: true, pendente: false, linhas: linhasFechamento(visao.porCS, visao.ranking, RADAR_EIXOS) });
      continue;
    }

    const { data, error } = await sb.from('cs_fechamento_mensal').select('*').eq('ano', m.ano).eq('mes', m.mes);
    if (error) throw new Error('Erro ao ler fechamento de ' + rotulo + ': ' + error.message);
    if (data && data.length) {
      resultado.push({ ...m, rotulo, aberto: false, pendente: false, linhas: data.map(mapLinhaBanco) });
      continue;
    }

    if (gravadosNestaRequisicao >= FECHAMENTO_MAX_POR_REQUISICAO) {
      resultado.push({ ...m, rotulo, aberto: false, pendente: true, linhas: null });
      continue;
    }

    const visao = await generateVisaoGestor(sb, nome, m.ano, false);
    const linhas = linhasFechamento(visao.porCS, visao.ranking, RADAR_EIXOS);
    const { error: errGravacao } = await sb.rpc('salvar_fechamento_mensal', {
      p_ano: m.ano,
      p_mes: m.mes,
      p_dia_corte: FECHAMENTO_DIA_CORTE,
      p_linhas: linhas.map((l) => ({
        csNome: l.csNome, pontuacao: l.pontuacao, estado: l.estado, elegiveis: l.elegiveis,
        posicao: l.posicao, totalRankeados: l.totalRankeados, radar: l.radar,
      })),
    });
    if (errGravacao) throw new Error('Erro ao gravar fechamento de ' + rotulo + ': ' + errGravacao.message);
    gravadosNestaRequisicao++;
    resultado.push({ ...m, rotulo, aberto: false, pendente: false, linhas });
  }
  return resultado;
}

// Variação do ranking contra o mês anterior, por nome. Mês anterior sem dado, ou antes do início da
// evolução, ou Visão Geral (sem mês anterior): mapa vazio, e quem chama trata como variação nula.
export async function variacaoDoRanking(
  sb: SupabaseClient,
  mesNome: string,
  ano: number,
  ranking: { nome: string; posicao: number | null; scoreReal: number | null }[],
  hoje: string,
): Promise<Map<string, ReturnType<typeof variacaoRanking>>> {
  const mapa = new Map<string, ReturnType<typeof variacaoRanking>>();
  const idx = MESES_ORDEM.indexOf(mesNome);
  if (idx === -1) return mapa;
  const anterior: MesRef = idx === 0 ? { ano: ano - 1, mes: 12 } : { ano, mes: idx };
  const chave = anterior.ano + '-' + String(anterior.mes).padStart(2, '0');
  if (chave < EVOLUCAO_MES_INICIAL) return mapa;

  const [m] = await obterMesesTime(sb, [anterior], hoje);
  const linhas = m.linhas || [];
  for (const r of ranking) {
    const ant = linhas.find((l) => l.csNome === r.nome);
    mapa.set(r.nome, variacaoRanking(
      { posicao: r.posicao, pontuacao: r.scoreReal },
      ant ? { posicao: ant.posicao, pontuacao: ant.pontuacao } : null,
    ));
  }
  return mapa;
}
