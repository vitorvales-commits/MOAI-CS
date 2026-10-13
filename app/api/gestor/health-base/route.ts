// GET /api/gestor/health-base — Health da Base de cada CS (health_base_cs). Cálculo único no banco:
// críticos declarados no Monday sobre a carteira da plataforma, com pontos de advertência só se a chave
// advertencia_soma_health estiver ligada. Gestor vê todos; CS comum vê só o próprio.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const cs = new URL(req.url).searchParams.get('cs');
    const { data, error } = await supabase.rpc('health_base_cs', { p_cs: cs && cs.trim() ? cs.trim() : null });
    if (error) throw new Error(error.message);
    return NextResponse.json({ cs: data || [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
