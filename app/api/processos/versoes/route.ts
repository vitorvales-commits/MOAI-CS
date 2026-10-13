// GET /api/processos/versoes  histórico de publicações do documento de processos (só gestor), sem o conteúdo.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { listarVersoesProcessos } from '@/lib/processos';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode ver o histórico dos processos.' }, { status: 403 });
    return NextResponse.json({ versoes: await listarVersoesProcessos(supabase) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/processos/versoes GET]', e);
    return NextResponse.json({ error: 'Não foi possível carregar o histórico.' }, { status: 500 });
  }
}
