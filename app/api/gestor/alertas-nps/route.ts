// GET /api/gestor/alertas-nps?grupo=<group_id> — alertas de NPS (abertos e tratados) de um conselho, para o
// histórico da página do conselho. Só gestor: a lista nunca vai para o cache compartilhado do detalhe do conselho.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarAlertasNps } from '@/lib/alertas-nps-dados';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const grupo = new URL(req.url).searchParams.get('grupo');
    if (!grupo) return NextResponse.json({ error: 'Parâmetro obrigatório: grupo' }, { status: 400 });
    return NextResponse.json({ alertas: await listarAlertasNps(supabase, { groupId: grupo }) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
