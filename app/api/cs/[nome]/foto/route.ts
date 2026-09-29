// POST   /api/cs/:nome/foto — salva a foto customizada (recorte 480x480, data URI base64).
// DELETE /api/cs/:nome/foto — remove a foto customizada, volta pro padrão estático (FOTOS_CS) ou iniciais.
// Brainstorm 29/09/2026: liberado pro gestor OU pro próprio CS (nome === csNome) — mesma regra
// aplicada de novo dentro das RPCs set_cs_foto/remover_cs_foto (nunca confiar só na checagem daqui).
import { NextRequest, NextResponse } from 'next/server';
import { setCsFoto, removerCsFoto } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode trocar a própria foto.' }, { status: 403 });
    }
    const body = await req.json();
    const fotoBase64 = String(body?.fotoBase64 || '');
    if (!/^data:image\/[a-zA-Z+.-]+;base64,/.test(fotoBase64)) {
      return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 });
    }
    await setCsFoto(supabase, nome, fotoBase64);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode remover a própria foto.' }, { status: 403 });
    }
    await removerCsFoto(supabase, nome);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
