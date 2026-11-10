// POST /api/gestor/saude-dados/restaurar — restaura uma exclusão de dado nativo do dash. Só gestor: a checagem vem
// antes de qualquer consulta, e o banco recusa linha que não é nativa (com a mensagem dele, mostrada na tela).
import { NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const corpo = (await req.json().catch(() => null)) as { id?: unknown } | null;
    const id = Number(corpo?.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Registro inválido.' }, { status: 400 });
    const { data, error } = await supabase.rpc('restaurar_da_lixeira', { p_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ ok: true, mensagem: data ?? null });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
