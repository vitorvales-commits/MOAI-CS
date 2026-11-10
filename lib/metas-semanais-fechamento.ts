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
import { carregarDadosMetas, elencoDoMes, montarMetasSemanaisCS, type MetasSemanaisCS, type ParcelaMetaSemanal } from './metas-semanais.ts';
import { normalizeNome } from './reports.ts';
import { semanasDoMes } from './semanas.ts';
import { hojeSP } from './gtd-prazos.ts';
import type { ModoRoster } from './cs-periodos.ts';

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
  porMes: Record<string, { cs: number; modo: ModoRoster; linhasCandidatas: number; gravadas: number; removidasForaDoElenco: number; itensRitmo: number; erroRitmo: string | null }>;
}

// Grava em lotes. Sem reprocessar, a unique key faz a linha existente ser ignorada (ignoreDuplicates).
export async function fecharMetasSemanais(
  sb: SupabaseClient,
  opcoes: { meses?: string[]; reprocessar?: boolean; hoje?: string },
): Promise<ResultadoFechamento> {
  const hoje = opcoes.hoje ?? hojeSP();
  const reprocessar = !!opcoes.reprocessar;
  const meses = opcoes.meses && opcoes.meses.length ? opcoes.meses : mesesDoFechamento(hoje);
  const porMes: ResultadoFechamento['porMes'] = {};

  for (const mes of meses) {
    // Elenco do mês, pela mesma regra de metasSemanaisDoCS (elencoDoMes), e não pelo cs_config de hoje.
    const { modo, cs: elenco } = await elencoDoMes(sb, mes, hoje);
    const dados = await carregarDadosMetas(sb, mes);
    const linhas = elenco.flatMap((cs) => linhasDeFechamento(montarMetasSemanaisCS(cs, mes, dados), hoje, reprocessar));
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

    // Reprocessar: quem não estava no elenco do mês sai do fechamento daquele mês (linhas de CS fora do elenco).
    let removidas = 0;
    if (reprocessar) {
      const noElenco = new Set(elenco.map((c) => normalizeNome(c.nome)));
      const { data, error: erroLeitura } = await sb.from('metas_semanais_fechamento').select('cs_nome').eq('mes', mes);
      if (erroLeitura) throw new Error(`Erro ao ler fechamento de ${mes}: ${erroLeitura.message}`);
      const foraDoElenco = [...new Set((data || []).map((r: { cs_nome: string }) => r.cs_nome))]
        .filter((nome) => !noElenco.has(normalizeNome(nome)));
      if (foraDoElenco.length) {
        const { error: erroRemover, count } = await sb.from('metas_semanais_fechamento')
          .delete({ count: 'exact' }).eq('mes', mes).in('cs_nome', foraDoElenco);
        if (erroRemover) throw new Error(`Erro ao remover fechamento fora do elenco de ${mes}: ${erroRemover.message}`);
        removidas = count ?? 0;
      }
    }
    // Fila de ação, fonte ritmo_semanal (migração 20261110): cada semana do mês já encerrada, na mesma execução.
    // Idempotente por CS e semana no banco; semana sem fechamento gravado não gera item.
    // Falha aqui não derruba o fechamento, que já gravou as linhas: o erro volta no resultado do mês, e a geração
    // roda de novo no próximo fechamento (idempotente).
    let itensRitmo = 0;
    let erroRitmo: string | null = null;
    try {
      for (const semana of semanasDoMes(mes, dados.feriados).filter((s) => s.fim < hoje)) {
        const { data, error } = await sb.rpc('gerar_itens_ritmo_semanal', { p_semana_inicio: semana.inicio });
        if (error) throw new Error(`semana ${semana.inicio}: ${error.message}`);
        itensRitmo += Number(data ?? 0);
      }
    } catch (e: any) {
      erroRitmo = e?.message || String(e);
    }
    porMes[mes] = { cs: elenco.length, modo, linhasCandidatas: linhas.length, gravadas, removidasForaDoElenco: removidas, itensRitmo, erroRitmo };
  }
  return { hoje, reprocessar, porMes };
}
