// Espelha getReportPublico(nome, mes, ano) do Code.gs original.
// GET /api/cs/:nome?mes=Setembro&ano=2026
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateCSReport } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  const nome = decodeURIComponent(params.nome);
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    // Parte A (pedido do Vitor 25/09/2026): gestor continua vendo qualquer perfil, sem restrição
    // nenhuma; um CS comum só pode consultar o PRÓPRIO relatório (o vínculo em cs_usuarios).
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar o próprio relatório.' }, { status: 403 });
    }
    const data = await generateCSReport(supabase, nome, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
