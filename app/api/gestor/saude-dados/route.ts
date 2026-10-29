// GET /api/gestor/saude-dados — frescura dos dados por board para a faixa de saúde da visão de gestor.
// Só gestor: a função saude_dados() também recusa quem não é gestor.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { classificarSaude, minutosTexto, type LinhaSaude } from '@/lib/saude-dados';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const { data, error } = await supabase.rpc('saude_dados');
    if (error) throw new Error(error.message);
    const agora = new Date();
    const resumo = classificarSaude((data || []) as LinhaSaude[], agora);
    return NextResponse.json({
      ...resumo,
      itens: resumo.itens.map((i) => ({ ...i, paradoTexto: i.minutosParado === null ? null : minutosTexto(i.minutosParado) })),
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
