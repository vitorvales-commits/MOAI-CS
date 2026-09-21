// Espelha getVezesDestaquePublico(nome) [GET] e setVezesDestaquePublico(nome, vezes) [POST] do
// Code.gs original. Leitura/escrita leve e independente do relatório pesado, direto no
// cs_config — mesmo padrão do original (não invalida nenhum cache de relatório).
// A escrita passa pela função set_destaque (RPC), única forma permitida de alterar cs_config —
// ver comentário em lib/reports.ts.
import { NextRequest, NextResponse } from 'next/server';
import { getVezesDestaque, setVezesDestaque } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase } = await requireMoaiUser();
    const vezes = await getVezesDestaque(supabase, nome);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase } = await requireMoaiUser();
    const body = await req.json();
    const vezes = await setVezesDestaque(supabase, nome, body?.vezes);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
