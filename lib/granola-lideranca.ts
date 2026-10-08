// Gravações do Granola para o gestor (08/10/2026). Leitura só do gestor: granola_notas tem RLS de
// is_gestor(), e esta função nunca é chamada por rota que um CS comum consiga acessar.
// private_notes_* do Granola nunca chega aqui: a Edge Function não grava esses campos.
import type { SupabaseClient } from '@supabase/supabase-js';

export type GravacaoGranola = {
  noteId: string;
  titulo: string | null;
  dataReuniao: string | null;
  webUrl: string | null;
  vinculo: 'auto' | 'manual' | 'pendente' | 'ignorada';
  csNome: string | null;
  resumoMarkdown: string | null;
  transcricao: { quem: string; texto: string; inicio: string | null }[] | null;
  // true quando alguma 1:1 já aponta para esta gravação (ela sai da lista "sem 1:1 ligada").
  ligadaA1a1: boolean;
};

const COLUNAS = 'note_id, titulo, data_reuniao, web_url, vinculo, cs_nome, resumo_markdown, transcricao, excluida_no_granola';

function mapGravacao(r: any, ligadas: Set<string>): GravacaoGranola {
  return {
    noteId: r.note_id,
    titulo: r.titulo ?? null,
    dataReuniao: r.data_reuniao ?? null,
    webUrl: r.web_url ?? null,
    vinculo: r.vinculo,
    csNome: r.cs_nome ?? null,
    resumoMarkdown: r.resumo_markdown ?? null,
    transcricao: Array.isArray(r.transcricao) ? r.transcricao : null,
    ligadaA1a1: ligadas.has(r.note_id),
  };
}

// Gravações vinculadas a um CS (automático ou manual), mais recentes primeiro. Sem 1:1 ligada primeiro
// na ordenação da tela; a tela decide o que mostrar em cada bloco.
export async function notasDoCS(sb: SupabaseClient, cs: string): Promise<GravacaoGranola[]> {
  const [{ data: notas, error: errN }, { data: regs, error: errR }] = await Promise.all([
    sb.from('granola_notas').select(COLUNAS).eq('cs_nome', cs).in('vinculo', ['auto', 'manual'])
      .eq('excluida_no_granola', false).order('data_reuniao', { ascending: false }),
    sb.from('um_a_um_registros').select('granola_note_id').eq('cs_nome', cs).not('granola_note_id', 'is', null),
  ]);
  if (errN) throw new Error('Erro ao buscar gravações do Granola: ' + errN.message);
  if (errR) throw new Error('Erro ao buscar 1:1 ligadas: ' + errR.message);
  const ligadas = new Set((regs || []).map((r: any) => r.granola_note_id as string));
  return (notas || []).map((r: any) => mapGravacao(r, ligadas));
}

// Gravações sem CS identificado (vinculo pendente, não excluídas), para a Fila da liderança.
export async function notasPendentes(sb: SupabaseClient): Promise<GravacaoGranola[]> {
  const { data, error } = await sb.from('granola_notas').select(COLUNAS)
    .eq('vinculo', 'pendente').eq('excluida_no_granola', false).order('data_reuniao', { ascending: false });
  if (error) throw new Error('Erro ao buscar gravações pendentes: ' + error.message);
  return (data || []).map((r: any) => mapGravacao(r, new Set()));
}
