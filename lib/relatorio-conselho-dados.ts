// Leitura e gravação do relatório do conselho (22/10/2026). Toda regra de estado, prazo e faltas vive no SQL
// (encontros_pendentes_relatorio, faltas_do_encontro, salvar_relatorio_conselho); aqui só se chama e se formata.
import type { SupabaseClient } from '@supabase/supabase-js';
import { encontroDeLinha, type EncontroRelatorio, type EntradaRelatorio } from './relatorio-conselho';

export async function listarEncontrosRelatorio(sb: SupabaseClient, cs?: string | null): Promise<EncontroRelatorio[]> {
  const { data, error } = await sb.rpc('encontros_pendentes_relatorio', { p_cs: cs || null, p_desde: null });
  if (error) throw new Error('Erro ao buscar os relatórios do conselho: ' + error.message);
  return ((data || []) as any[]).map(encontroDeLinha);
}

export type RelatorioEnviado = {
  id: string; groupId: string; dataEncontro: string; csNome: string; avaliacao: string; avanco: string;
  membroAtencaoId: number | null; membroAtencaoNome: string | null; membroAtencaoMotivo: string | null; combinado: string | null;
  enviadoEm: string; enviadoPor: string; atualizadoEm: string;
  faltas: { membroId: number; nome: string; tipo: 'falta' | 'desistencia'; categoria: string | null; justificativa: string | null }[];
};

// Encontros do conselho com relatório exigido, relatórios enviados com o conteúdo, faltas por membro e os presentes
// do mês de cada encontro (para escolher o membro que exige atenção).
export async function dadosRelatoriosDoConselho(sb: SupabaseClient, groupId: string) {
  const encontros = (await listarEncontrosRelatorio(sb)).filter((e) => e.groupId === groupId);
  const [{ data: rels, error: e1 }, { data: fm, error: e2 }, { data: membros, error: e3 }] = await Promise.all([
    sb.from('relatorios_conselho').select('*, relatorio_conselho_faltas(*)').eq('group_id', groupId).order('data_encontro', { ascending: false }),
    sb.rpc('faltas_por_membro_conselho', { p_group_id: groupId }),
    sb.from('conselhos_membros').select('id, nome').eq('group_id', groupId),
  ]);
  const erro = e1 || e2 || e3;
  if (erro) throw new Error('Erro ao buscar os relatórios do conselho: ' + erro.message);
  const nomePorId = new Map<number, string>((membros || []).map((m: any) => [Number(m.id), m.nome]));
  const relatorios: RelatorioEnviado[] = (rels || []).map((r: any) => ({
    id: r.id, groupId: r.group_id, dataEncontro: r.data_encontro, csNome: r.cs_nome, avaliacao: r.avaliacao, avanco: r.avanco,
    membroAtencaoId: r.membro_atencao_id === null ? null : Number(r.membro_atencao_id),
    membroAtencaoNome: r.membro_atencao_id === null ? null : nomePorId.get(Number(r.membro_atencao_id)) || null,
    membroAtencaoMotivo: r.membro_atencao_motivo, combinado: r.combinado,
    enviadoEm: r.enviado_em, enviadoPor: r.enviado_por, atualizadoEm: r.atualizado_em,
    faltas: (r.relatorio_conselho_faltas || []).map((f: any) => ({ membroId: Number(f.membro_id), nome: f.membro_nome, tipo: f.tipo, categoria: f.categoria, justificativa: f.justificativa })),
  }));
  const faltasPorMembro = ((fm || []) as any[]).map((f) => ({
    membroId: Number(f.membro_id), nome: f.membro_nome, faltas: Number(f.faltas), categoriaMaisFrequente: f.categoria_mais_frequente, ultimaFalta: f.ultima_falta,
  }));
  return { encontros, relatorios, faltasPorMembro };
}

// Presentes do mês do encontro: candidatos a "membro que exige atenção".
export async function presentesDoEncontro(sb: SupabaseClient, groupId: string, mesNome: string): Promise<{ id: number; nome: string }[]> {
  const { data: membros, error } = await sb.from('conselhos_membros').select('id, nome').eq('group_id', groupId);
  if (error) throw new Error('Erro ao buscar os presentes do encontro: ' + error.message);
  const ids = (membros || []).map((m: any) => Number(m.id));
  if (!ids.length) return [];
  const { data: st, error: errSt } = await sb.from('conselhos_status_mensal').select('membro_id').in('membro_id', ids).eq('mes', mesNome).in('status', ['Presente', 'Reposição']);
  if (errSt) throw new Error('Erro ao buscar os presentes do encontro: ' + errSt.message);
  const presentes = new Set((st || []).map((s: any) => Number(s.membro_id)));
  return (membros || []).filter((m: any) => presentes.has(Number(m.id))).map((m: any) => ({ id: Number(m.id), nome: m.nome as string }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function salvarRelatorioConselho(sb: SupabaseClient, groupId: string, dataEncontro: string, e: EntradaRelatorio): Promise<string> {
  const { data, error } = await sb.rpc('salvar_relatorio_conselho', {
    p_group_id: groupId, p_data_encontro: dataEncontro, p_avaliacao: e.avaliacao, p_avanco: e.avanco,
    p_membro_atencao_id: e.membroAtencaoId, p_membro_atencao_motivo: e.membroAtencaoMotivo || null, p_combinado: e.combinado || null,
    p_faltas: e.faltas.map((f) => ({ membro_id: f.membroId, categoria: f.categoria, justificativa: f.justificativa })),
  });
  if (error) throw Object.assign(new Error(error.message), { codigo: error.code });
  return data as string;
}
