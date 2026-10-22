// Leitura dos alertas de NPS para a fila de ação do gestor e para o histórico do conselho (22/10/2026).
// A tabela alertas_nps só é legível por gestor (RLS), então para CS comum a lista vem vazia.
// A regra de disparo mora no SQL (alertas_nps_candidatos) e em lib/alertas-nps.ts; aqui só se lê e se trata.
import type { SupabaseClient } from '@supabase/supabase-js';
import { textoAlertaNps, type CriterioAlertaNps, type TextoAlertaNps } from './alertas-nps.ts';

export type AlertaNpsItem = {
  id: string; groupId: string; mes: string; criterio: CriterioAlertaNps; respondente: string | null;
  valor: number; referencia: number; amostra: number | null; comentario: string | null;
  criadoEm: string; notificadoEm: string | null; tratadoEm: string | null; tratadoPor: string | null; notaTratamento: string | null;
  conselho: string; cs: string | null; texto: TextoAlertaNps;
};

const csDoTitulo = (titulo: string | null | undefined) => /\(([^)]+)\)\s*$/.exec(titulo || '')?.[1]?.trim() || null;

export async function listarAlertasNps(sb: SupabaseClient, filtro: { groupId?: string; apenasAbertos?: boolean } = {}): Promise<AlertaNpsItem[]> {
  let q = sb.from('alertas_nps').select('*').order('criado_em', { ascending: false }).limit(200);
  if (filtro.groupId) q = q.eq('group_id', filtro.groupId);
  if (filtro.apenasAbertos) q = q.is('tratado_em', null);
  const { data, error } = await q;
  if (error) throw new Error('Erro ao buscar alertas de NPS: ' + error.message);
  const linhas = (data || []) as any[];
  if (!linhas.length) return [];
  const ids = Array.from(new Set(linhas.map((l) => l.group_id)));
  const { data: grupos, error: errG } = await sb.from('conselhos_grupos').select('group_id, titulo').in('group_id', ids);
  if (errG) throw new Error('Erro ao buscar conselhos dos alertas: ' + errG.message);
  const titulo = new Map<string, string>((grupos || []).map((g: any) => [g.group_id, g.titulo]));
  return linhas.map((l) => {
    const conselho = titulo.get(l.group_id) || 'Conselho sem título';
    const cs = csDoTitulo(conselho);
    const base = {
      criterio: l.criterio as CriterioAlertaNps, respondente: l.respondente_nome as string | null,
      valor: Number(l.valor), referencia: Number(l.referencia), amostra: l.amostra as number | null,
    };
    return {
      id: l.id, groupId: l.group_id, mes: l.mes, ...base, comentario: l.detalhe?.comentario || null,
      criadoEm: l.criado_em, notificadoEm: l.notificado_em, tratadoEm: l.tratado_em, tratadoPor: l.tratado_por, notaTratamento: l.nota_tratamento,
      conselho, cs, texto: textoAlertaNps(base, conselho, cs),
    };
  });
}

export async function tratarAlertaNps(sb: SupabaseClient, id: string, nota: string | null): Promise<void> {
  const { error } = await sb.rpc('tratar_alerta_nps', { p_id: id, p_nota: nota });
  if (error) throw new Error('Erro ao marcar o alerta como tratado: ' + error.message);
}
