// GET /api/conselho/:grupo?mes=Fevereiro&ano=2026 — detalhe completo de um conselho (métricas do
// período, encontros, membros com ata por mês). Alimenta os dois níveis de drill-down: o resumo
// rápido no modal de conselho (app/dashboard-html.ts) e a página completa app/conselho/[grupo].
// Mesma checagem de autenticação de toda rota do projeto — generateConselhoDetalhe não confia em
// nada vindo do client.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateConselhoDetalhe } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { grupo: string } }) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  const grupo = decodeURIComponent(params.grupo);
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase } = await requireMoaiUser();
    const data = await generateConselhoDetalhe(supabase, grupo, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
