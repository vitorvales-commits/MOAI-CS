// Fechamento das semanas de metas (05/11/2026, fase 2, P3). Quem chama esta função é a rota
// app/api/interno/metas-semanais/fechar/route.ts, com o cliente admin. Este arquivo não importa o cliente admin,
// recebe o cliente como parâmetro, para o teste de isolamento continuar válido.
//
// Regras:
//   - Só fecha parcela cujo fim já passou (parcelaFim anterior a hoje).
//   - Parcela já fechada não muda, a não ser com reprocessar (P3: o realizado fica congelado).
//   - retroativo marca parcela fechada depois de mais de DIAS_PARA_RETROATIVO dias do seu fim.
//   - Dado ausente fica nulo (realizado, base, déficit, meta efetiva), nunca zero.
import type { SupabaseClient } from '@supabase/supabase-js';
import { carregarDadosMetas, montarMetasSemanaisCS, type MetasSemanaisCS, type ParcelaMetaSemanal } from './metas-semanais.ts';
import { getCSListParaAgregados } from './reports.ts';
import { hojeSP } from './gtd-prazos.ts';

export const DIAS_PARA_RETROATIVO = 7;

export interface LinhaFechamento {
  cs_nome: string;
  indicador: string;
  mes: string;
  semana_inicio: string;
  base: number | null;
  deficit_recebido: number | null;
  meta_efetiva: number | null;
  realizado: number | null;
  sem_data: number;
  retroativo: boolean;
}

const diasEntre = (ini: string, fim: string) =>
  Math.round((Date.UTC(+fim.slice(0, 4), +fim.slice(5, 7) - 1, +fim.slice(8, 10)) - Date.UTC(+ini.slice(0, 4), +ini.slice(5, 7) - 1, +ini.slice(8, 10))) / 86_400_000);

// Função pura: a partir da montagem de um CS, as linhas que devem ser gravadas agora.
export function linhasDeFechamento(r: MetasSemanaisCS, hoje: string, reprocessar: boolean): LinhaFechamento[] {
  const linhas: LinhaFechamento[] = [];
  r.indicadores.forEach((ind) => {
    ind.parcelas.forEach((p: ParcelaMetaSemanal) => {
      const terminou = p.parcelaFim < hoje;
      if (!terminou) return;
      if (p.fechada && !reprocessar) return;
      linhas.push({
        cs_nome: r.cs,
        indicador: ind.indicador,
        mes: r.mes,
        semana_inicio: p.inicio,
        base: p.base,
        deficit_recebido: p.deficitRecebido,
        meta_efetiva: p.metaEfetiva,
        realizado: p.realizado,
        sem_data: ind.semDataTotal,
        retroativo: diasEntre(p.parcelaFim, hoje) > DIAS_PARA_RETROATIVO,
      });
    });
  });
  return linhas;
}

// Mês anterior e mês atual de Brasília, em 'AAAA-MM-01'. Fechar os dois cobre a última semana do mês anterior,
// que termina depois da virada do mês.
export function mesesDoFechamento(hoje: string): string[] {
  const ano = +hoje.slice(0, 4), mes = +hoje.slice(5, 7);
  const anterior = mes === 1 ? `${ano - 1}-12-01` : `${ano}-${String(mes - 1).padStart(2, '0')}-01`;
  return [anterior, `${hoje.slice(0, 7)}-01`];
}

export interface ResultadoFechamento {
  hoje: string;
  reprocessar: boolean;
  porMes: Record<string, { cs: number; linhasCandidatas: number; gravadas: number }>;
}

// Grava em lotes. Sem reprocessar, a unique key faz a linha existente ser ignorada (ignoreDuplicates).
export async function fecharMetasSemanais(
  sb: SupabaseClient,
  opcoes: { meses?: string[]; reprocessar?: boolean; hoje?: string },
): Promise<ResultadoFechamento> {
  const hoje = opcoes.hoje ?? hojeSP();
  const reprocessar = !!opcoes.reprocessar;
  const meses = opcoes.meses && opcoes.meses.length ? opcoes.meses : mesesDoFechamento(hoje);
  const roster = (await getCSListParaAgregados(sb)).filter((c) => c.ativo && !c.ex);
  const porMes: ResultadoFechamento['porMes'] = {};

  for (const mes of meses) {
    const dados = await carregarDadosMetas(sb, mes);
    const linhas = roster.flatMap((cs) => linhasDeFechamento(montarMetasSemanaisCS(cs, mes, dados), hoje, reprocessar));
    let gravadas = 0;
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const { error } = await sb.from('metas_semanais_fechamento').upsert(lote, {
        onConflict: 'cs_nome,indicador,mes,semana_inicio',
        ignoreDuplicates: !reprocessar,
      });
      if (error) throw new Error(`Erro ao gravar fechamento de ${mes}: ${error.message}`);
      gravadas += lote.length;
    }
    porMes[mes] = { cs: roster.length, linhasCandidatas: linhas.length, gravadas };
  }
  return { hoje, reprocessar, porMes };
}
