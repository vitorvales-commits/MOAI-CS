// Espelha getEquipeReportPublico(mes, ano) do Code.gs original.
// GET /api/equipe?mes=Setembro&ano=2026  (mes pode ser "Visão Geral")
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateEquipeReport } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase } = await requireMoaiUser();
    const data = await generateEquipeReport(supabase, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
