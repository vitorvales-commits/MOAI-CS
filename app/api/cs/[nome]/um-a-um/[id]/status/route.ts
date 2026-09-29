// PATCH /api/cs/:nome/um-a-um/:id/status — marca o status do 1:1 (pendente/cumprido/nao_cumprido).
// Brainstorm 29/09/2026: decidido separado da edição de conteúdo (editarUmAUm) — o gestor marca
// o status na revisão do 1:1 seguinte sem precisar reabrir o formulário de edição.
import { NextRequest, NextResponse } from 'next/server';
import { marcarStatusUmAUm, UmAUmStatus } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STATUS_VALIDOS: UmAUmStatus[] = ['pendente', 'cumprido', 'nao_cumprido'];

export async function PATCH(req: NextRequest, { params }: { params: { nome: string; id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode marcar o status de um 1:1.' }, { status: 403 });
    }
    const body = await req.json();
    const status = String(body?.status || '') as UmAUmStatus;
    if (!STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }
    await marcarStatusUmAUm(supabase, params.id, status);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
