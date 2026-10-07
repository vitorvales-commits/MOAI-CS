// GET /api/gestor/visao-geral/acoes — Urgências (report semanal e GTD) e Insights da Visão geral do
// gestor, numa única chamada agregada. Só gestor: a checagem vem ANTES de tocar em qualquer dado
// (403 para CS comum e para quem não tem vínculo). Cada seção é isolada e devolve a mensagem real do
// erro só dela.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { acoesVisaoGeralGestor } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    return NextResponse.json(await acoesVisaoGeralGestor(supabase));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
