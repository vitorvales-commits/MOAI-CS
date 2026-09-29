// GET /cs-foto/:nome — foto customizada de um CS, servida como imagem de verdade a partir do
// data URI base64 guardado em cs_fotos. Fica FORA de /api de propósito, mesmo espírito de
// /conselheiro-foto/:id: next.config.mjs força no-store em /api/*, e aqui o objetivo é o
// navegador guardar a imagem em vez de embuti-la em base64 dentro do JSON a cada carregamento de
// perfil/grid do time/ranking/relatório mensal. Cache `private`: só o navegador de quem está
// logado guarda, nunca um CDN no meio do caminho.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase } = await requireMoaiUser();
    const { data, error } = await supabase.from('cs_fotos').select('foto_base64').eq('cs_nome', nome).maybeSingle();
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
