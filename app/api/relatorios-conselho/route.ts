// GET /api/relatorios-conselho — encontros com relatório exigido do CS logado (ou de todos, para o gestor, com
// ?cs=Nome para filtrar). Mesma fonte da home, da página do conselho e da fila do gestor.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarEncontrosRelatorio } from '@/lib/relatorio-conselho-dados';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    const pedido = new URL(req.url).searchParams.get('cs');
    const cs = isGestor ? pedido : csNome;
    if (!isGestor && !cs) return NextResponse.json({ error: 'Seu usuário não está vinculado a um CS.' }, { status: 403 });
    return NextResponse.json({ encontros: await listarEncontrosRelatorio(supabase, cs) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
