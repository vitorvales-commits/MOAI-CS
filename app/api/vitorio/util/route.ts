// POST /api/vitorio/util  marca se a resposta ajudou (sim ou não) numa consulta registrada. Não útil entra na fila do gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMoaiUser();
    let b: any;
    try { b = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    if (!UUID.test(String(b?.id || '')) || typeof b?.util !== 'boolean') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    const { error } = await supabase.rpc('vitorio_marcar_util', { p_id: b.id, p_util: b.util });
    if (error) console.error('[api/vitorio/util]', error.message);
    return NextResponse.json({ ok: !error });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/util]', e);
    return NextResponse.json({ ok: false });
  }
}
