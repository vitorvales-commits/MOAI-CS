// GET /conselheiro-foto/:mondayItemId — foto de um conselheiro (board "Conselheiros 2026"), servida
// como imagem de verdade a partir do data URI base64 que o sync-monday guarda em
// conselheiros_fotos. Fica FORA de /api de propósito: next.config.mjs força no-store em /api/*, e
// aqui o objetivo é justamente o navegador guardar a imagem (35 fotos de ~200KB cada, que antes
// iriam embutidas em base64 dentro do JSON da grade de conselhos a cada carregamento). Cache
// `private`: só o navegador de quem está logado guarda, nunca um CDN no meio do caminho.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    const { supabase } = await requireMoaiUser();
    const { data, error } = await supabase.from('conselheiros_fotos').select('foto_base64').eq('monday_item_id', id).maybeSingle();
    if (error) throw new Error(error.message);
    const m = data?.foto_base64 ? String(data.foto_base64).match(/^data:([^;]+);base64,(.*)$/) : null;
    if (!m) return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
    return new NextResponse(Buffer.from(m[2], 'base64'), {
      headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' },
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
