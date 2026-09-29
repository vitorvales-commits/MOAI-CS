// PATCH  /api/cs/:nome/advertencias/:id — edita a observação de uma advertência aplicada (só gestor).
// DELETE /api/cs/:nome/advertencias/:id — exclui uma advertência aplicada por engano (só gestor).
import { NextRequest, NextResponse } from 'next/server';
import { editarAdvertenciaAplicada, excluirAdvertenciaAplicada } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { nome: string; id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode editar uma advertência.' }, { status: 403 });
    }
    const body = await req.json();
    const observacao = body?.observacao ? String(body.observacao) : null;
    await editarAdvertenciaAplicada(supabase, params.id, observacao);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { nome: string; id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode excluir uma advertência.' }, { status: 403 });
    }
    await excluirAdvertenciaAplicada(supabase, params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
