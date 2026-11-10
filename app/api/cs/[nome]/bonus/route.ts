// GET /api/cs/:nome/bonus — bônus de pontuação daquele CS, com anulados. Gestor vê qualquer CS; um CS comum só o
// próprio. O banco (RLS de bonus_aplicados) também limita a leitura à própria sessão.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarBonusCS } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar os próprios bônus.' }, { status: 403 });
    }
    const registros = await listarBonusCS(supabase, nome);
    return NextResponse.json({ registros });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
