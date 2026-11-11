// Aliases agenda -> grupo do NPS: lista só o que está pendente (nome da agenda sem grupo), ordenado pelo número de
// eventos de agenda afetados, e confirma pela RPC confirmar_alias_agenda_conselho (security definer, só gestor).
import type { SupabaseClient } from '@supabase/supabase-js';
import { selectPaginado } from './supabase/paginar.ts';

export type AliasAgendaPendente = {
  nome: string; eventos: number;
  candidatos: { groupId: string; titulo: string | null }[];
};

// Pura: nomes da agenda que a view não resolve, com os candidatos não confirmados, do maior para o menor impacto.
export function montarPendentesAgenda(args: {
  nomesAgenda: (string | null)[];
  nomesResolvidos: Iterable<string>;
  candidatos: { conselheiro_nome: string; group_id: string }[];
  titulos: Map<string, string>;
}): AliasAgendaPendente[] {
  const resolvidos = new Set(args.nomesResolvidos);
  const eventos = new Map<string, number>();
  for (const n of args.nomesAgenda) if (n) eventos.set(n, (eventos.get(n) || 0) + 1);
  return [...eventos.entries()]
    .filter(([nome]) => !resolvidos.has(nome))
    .map(([nome, qtd]) => ({
      nome, eventos: qtd,
      candidatos: args.candidatos.filter((c) => c.conselheiro_nome === nome).map((c) => ({ groupId: c.group_id, titulo: args.titulos.get(c.group_id) || null })),
    }))
    .sort((a, b) => b.eventos - a.eventos || a.nome.localeCompare(b.nome, 'pt-BR'));
}

const RELACAO_AUSENTE = new Set(['42P01', 'PGRST205']);

export async function listarAliasesAgendaPendentes(sb: SupabaseClient): Promise<{ disponivel: boolean; pendentes: AliasAgendaPendente[] }> {
  const [agenda, view, cand] = await Promise.all([
    selectPaginado(() => sb.from('agenda_conselhos_items').select('conselheiro_nome').order('id'), { nome: 'agenda_conselhos_items' }),
    sb.from('v_agenda_conselho_grupo').select('conselheiro_nome'),
    sb.from('agenda_conselho_aliases').select('conselheiro_nome, group_id').eq('confirmado', false),
  ]);
  for (const r of [view, cand]) {
    if (!r.error) continue;
    // Migrações 20261009b e 20261009c ainda não aplicadas: não há o que revisar, e isso não é erro.
    if (RELACAO_AUSENTE.has((r.error as any).code)) return { disponivel: false, pendentes: [] };
    throw new Error('Erro ao buscar aliases da agenda: ' + r.error.message);
  }
  const candidatos = (cand.data || []) as { conselheiro_nome: string; group_id: string }[];
  const ids = [...new Set(candidatos.map((c) => c.group_id))];
  const titulos = new Map<string, string>();
  if (ids.length) {
    const { data, error } = await sb.from('conselhos_grupos').select('group_id, titulo').in('group_id', ids);
    if (error) throw new Error('Erro ao buscar conselhos_grupos: ' + error.message);
    (data || []).forEach((g: any) => titulos.set(g.group_id, g.titulo));
  }
  return {
    disponivel: true,
    pendentes: montarPendentesAgenda({
      nomesAgenda: agenda.map((a: any) => a.conselheiro_nome),
      nomesResolvidos: (view.data || []).map((v: any) => v.conselheiro_nome),
      candidatos, titulos,
    }),
  };
}

export async function confirmarAliasAgendaConselho(sb: SupabaseClient, conselheiroNome: string, groupId: string): Promise<void> {
  const { error } = await sb.rpc('confirmar_alias_agenda_conselho', { p_conselheiro_nome: conselheiroNome, p_group_id: groupId });
  if (error) throw new Error('Erro ao confirmar alias da agenda: ' + error.message);
}
