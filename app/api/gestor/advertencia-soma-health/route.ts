// GET  /api/gestor/advertencia-soma-health — estado da chave que soma pontos ativos ao Health da Base.
// POST /api/gestor/advertencia-soma-health — liga ou desliga a chave. Só gestor; o banco confere de novo
// e registra quem alterou em configuracoes_globais.atualizado_por e em access_audit_log.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const { data, error } = await supabase.rpc('advertencia_soma_health_ligada');
    if (error) throw new Error(error.message);
    return NextResponse.json({ ligado: !!data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const body = await req.json();
    const { data, error } = await supabase.rpc('definir_advertencia_soma_health', { p_ligado: !!body?.ligado });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ligado: !!data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
