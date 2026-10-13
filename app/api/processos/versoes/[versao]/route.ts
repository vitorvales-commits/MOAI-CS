// GET /api/processos/versoes/:versao  conteúdo completo de uma versão publicada (só gestor), para pré-visualizar ou comparar.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { lerVersaoProcessos } from '@/lib/processos';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { versao: string } }) {
  noStore();
  const versao = Number(params.versao);
  if (!Number.isInteger(versao) || versao <= 0) return NextResponse.json({ error: 'Versão inválida.' }, { status: 400 });
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode ver versões antigas dos processos.' }, { status: 403 });
    const v = await lerVersaoProcessos(supabase, versao);
    if (!v) return NextResponse.json({ error: 'Versão não encontrada.' }, { status: 404 });
    return NextResponse.json(v);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/processos/versoes/:versao GET]', e);
    return NextResponse.json({ error: 'Não foi possível carregar a versão.' }, { status: 500 });
  }
}
