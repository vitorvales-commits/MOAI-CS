// GET /api/cs/:nome/report/membros — membros elegíveis da base do CS, com o conselho de cada um,
// numa consulta só (membros_da_base_cs no banco). Alimenta o menu dependente de críticos da aba
// Report. Gestor consulta qualquer CS; CS comum só o próprio (o banco reconfere).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar a própria base.' }, { status: 403 });
    }
    const { data, error } = await supabase.rpc('membros_da_base_cs', { p_cs: nome });
    if (error) throw new Error(error.message);
    return NextResponse.json({ membros: data || [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
