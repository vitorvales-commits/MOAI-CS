// Espelha getListaCSPublica() do Code.gs original — lista simples de nomes (ativos, com conta
// Monday ativa), usada pelo front-end em telas que só precisam do seletor de CS sem o resto do
// payload pesado de getEquipeComFotos.
import { NextResponse } from 'next/server';
import { getCSListCompleto } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase } = await requireMoaiUser();
    const lista = await getCSListCompleto(supabase);
    return NextResponse.json(lista.map((c) => c.nome));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
