// POST /api/gestor/config — liga/desliga revelarIndicadoresEquipe pra todo mundo que não é
// gestor, de uma vez, sem deploy (Parte B, pedido do Vitor 25/09/2026). Restrito a is_gestor(),
// checado aqui e de novo dentro de set_revelar_indicadores_equipe (SECURITY DEFINER), já que
// configuracoes_globais não tem nenhuma policy própria.
import { NextRequest, NextResponse } from 'next/server';
import { setRevelarIndicadoresEquipe } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const body = await req.json();
    const revelarIndicadoresEquipe = await setRevelarIndicadoresEquipe(supabase, !!body?.revelarIndicadoresEquipe);
    return NextResponse.json({ revelarIndicadoresEquipe });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
