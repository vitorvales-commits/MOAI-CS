// POST /api/gestor/alertas-nps/:id/tratar — marca um alerta de NPS como tratado, com nota curta (só gestor).
import { NextRequest, NextResponse } from 'next/server';
import { tratarAlertaNps } from '@/lib/alertas-nps-dados';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode tratar um alerta.' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const nota = String(body?.nota || '').trim().slice(0, 300) || null;
    await tratarAlertaNps(supabase, params.id, nota);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
