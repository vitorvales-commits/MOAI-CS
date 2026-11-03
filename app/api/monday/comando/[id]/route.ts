// GET /api/monday/comando/[id]: estado de uma edição enfileirada, para o cartão mostrar enviando, salvo, conflito ou erro.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { estadoVisual } from '@/lib/sincronia';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Comando inválido.' }, { status: 400 });

    const { data, error } = await supabase.rpc('sincronia_comando_status', { p_id: id });
    if (error) return NextResponse.json({ error: 'Não foi possível ler o comando.' }, { status: 500 });
    const linha = Array.isArray(data) ? data[0] : null;
    if (!linha) return NextResponse.json({ error: 'Comando não encontrado.' }, { status: 404 });
    return NextResponse.json({ ...linha, visual: estadoVisual(linha.estado, linha.erro) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Erro ao ler o comando.' }, { status: 500 });
  }
}
