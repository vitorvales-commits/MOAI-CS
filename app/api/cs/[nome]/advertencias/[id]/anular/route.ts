// POST /api/cs/:nome/advertencias/:id/anular — anula uma advertência sem apagá-la (só gestor). Motivo obrigatório.
import { NextRequest, NextResponse } from 'next/server';
import { anularAdvertencia } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { nome: string; id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode anular uma advertência.' }, { status: 403 });
    }
    const body = await req.json();
    const motivo = String(body?.motivo || '').trim();
    if (!motivo) return NextResponse.json({ error: 'Informe o motivo da anulação.' }, { status: 400 });
    await anularAdvertencia(supabase, params.id, motivo);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
