// GET /api/gestor/agenda?inicio=YYYY-MM-DD&fim=YYYY-MM-DD — agenda visual da home do gestor
// (Parte C, pedido do Vitor 28/09/2026): conselhos + Rounds no intervalo, restrito a
// is_gestor()=true no banco (mesmo padrão de /api/gestor/visao-geral).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateAgendaVisual } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  if (!inicio || !fim) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: inicio, fim (YYYY-MM-DD)' }, { status: 400 });
  }
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const data = await generateAgendaVisual(supabase, inicio, fim);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
