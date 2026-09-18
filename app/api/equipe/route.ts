// Espelha getEquipeReportPublico(mes, ano) do Code.gs original.
// GET /api/equipe?mes=Setembro&ano=2026  (mes pode ser "Visão Geral")
import { NextRequest, NextResponse } from 'next/server';
import { generateEquipeReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const data = await generateEquipeReport(mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
