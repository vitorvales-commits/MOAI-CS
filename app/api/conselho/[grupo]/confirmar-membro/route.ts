// POST /api/conselho/:grupo/confirmar-membro — B4 (pedido do Vitor, 25/09/2026): confirma o
// membro certo pra um registro de Big Deal/ata que a extração não conseguiu casar com o roster.
// Passa por confirmarMembroAta (lib/reports.ts), que chama a função SECURITY DEFINER
// confirmar_membro_ata — grava o apelido em atas_membro_aliases e atualiza TODAS as linhas
// existentes daquele group_id+nome_ata nas duas tabelas de ata, não só a ocorrência clicada.
import { NextRequest, NextResponse } from 'next/server';
import { confirmarMembroAta, getDadosBrutos } from '@/lib/reports';
import { requireMoaiUser, requireOwnConselhoOrGestor, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { grupo: string } }) {
  const grupo = decodeURIComponent(params.grupo);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    const dados = await getDadosBrutos(supabase);
    const grupoRow = dados.conselhosGrupos.find((g: any) => g.group_id === grupo && !g.is_repo);
    if (!grupoRow) return NextResponse.json({ error: `Conselho "${grupo}" não encontrado` }, { status: 404 });
    await requireOwnConselhoOrGestor(supabase, isGestor, csNome, grupoRow.titulo);
    const body = await req.json();
    const nomeAta = String(body?.nomeAta || '').trim();
    const membroOficial = String(body?.membroOficial || '').trim();
    if (!nomeAta || !membroOficial) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: nomeAta, membroOficial' }, { status: 400 });
    }
    const linhasAtualizadas = await confirmarMembroAta(supabase, grupo, nomeAta, membroOficial);
    return NextResponse.json({ linhasAtualizadas });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
