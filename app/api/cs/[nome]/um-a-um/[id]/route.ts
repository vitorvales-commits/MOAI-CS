// PATCH /api/cs/:nome/um-a-um/:id — edita um registro existente (só gestor).
import { NextRequest, NextResponse } from 'next/server';
import { editarUmAUm } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { nome: string; id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode editar um registro de 1:1.' }, { status: 403 });
    }
    const body = await req.json();
    const data = String(body?.data || '').trim();
    const oQueFoiFalado = body?.oQueFoiFalado ? String(body.oQueFoiFalado) : null;
    const combinados = body?.combinados ? String(body.combinados) : null;
    if (!data) {
      return NextResponse.json({ error: 'Parâmetro obrigatório: data' }, { status: 400 });
    }
    await editarUmAUm(supabase, params.id, data, oQueFoiFalado, combinados);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
