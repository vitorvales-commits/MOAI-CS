// Espelha getReportPublico(nome, mes, ano) do Code.gs original.
// GET /api/cs/:nome?mes=Setembro&ano=2026
import { NextRequest, NextResponse } from 'next/server';
import { generateCSReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  const nome = decodeURIComponent(params.nome);
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const data = await generateCSReport(nome, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
