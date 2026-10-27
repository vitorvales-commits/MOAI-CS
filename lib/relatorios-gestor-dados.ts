// Leitura dos relatórios do conselho para a visão de gestor (27/10/2026). Só consulta: encontros com relatório exigido
// (encontros_pendentes_relatorio, sem filtro de CS, o que só o gestor consegue) e relatórios enviados com as faltas.
// O cálculo do painel é de lib/relatorios-gestor.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { listarEncontrosRelatorio } from './relatorio-conselho-dados';
import { montarPainelRelatorios, type EncontroEntrada, type PainelRelatorios, type RelatorioEntrada } from './relatorios-gestor';

export async function carregarPainelRelatorios(sb: SupabaseClient, mes: string): Promise<PainelRelatorios> {
  const [encontrosBrutos, rels, membros] = await Promise.all([
    listarEncontrosRelatorio(sb, null),
    sb.from('relatorios_conselho').select('*, relatorio_conselho_faltas(*)').order('data_encontro', { ascending: false }),
    sb.from('conselhos_membros').select('id, nome'),
  ]);
  if (rels.error) throw new Error('Erro ao buscar os relatórios do conselho: ' + rels.error.message);
  if (membros.error) throw new Error('Erro ao buscar os membros dos conselhos: ' + membros.error.message);

  const nomePorMembro = new Map<number, string>((membros.data || []).map((m: any) => [Number(m.id), m.nome as string]));
  const encontros: EncontroEntrada[] = encontrosBrutos.map((e) => ({ groupId: e.groupId, conselho: e.conselho, cs: e.cs, dataEncontro: e.dataEncontro, estado: e.estado }));
  const porChave = new Map(encontrosBrutos.map((e) => [e.groupId + '|' + new Date(e.dataEncontro).getTime(), e]));

  const relatorios: RelatorioEntrada[] = (rels.data || []).map((r: any) => {
    const enc = porChave.get(r.group_id + '|' + new Date(r.data_encontro).getTime());
    return {
      id: r.id, groupId: r.group_id, conselho: enc?.conselho || 'Conselho', dataEncontro: r.data_encontro, csNome: r.cs_nome,
      avaliacao: r.avaliacao, avanco: r.avanco,
      membroAtencaoId: r.membro_atencao_id === null ? null : Number(r.membro_atencao_id),
      membroAtencaoNome: r.membro_atencao_id === null ? null : nomePorMembro.get(Number(r.membro_atencao_id)) || null,
      membroAtencaoMotivo: r.membro_atencao_motivo, combinado: r.combinado, enviadoEm: r.enviado_em, estado: enc?.estado ?? null,
      faltas: (r.relatorio_conselho_faltas || []).map((f: any) => ({ membroId: Number(f.membro_id), nome: f.membro_nome, tipo: f.tipo, categoria: f.categoria, justificativa: f.justificativa })),
    };
  });
  return montarPainelRelatorios({ mes, hoje: new Date().toISOString(), encontros, relatorios });
}
