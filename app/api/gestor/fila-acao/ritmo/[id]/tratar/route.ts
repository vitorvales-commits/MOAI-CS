// POST /api/gestor/fila-acao/ritmo/:id/tratar — marca um item de ritmo semanal como tratado (tratar_item_ritmo).
// Restrito a gestor: checado aqui e de novo dentro da função SECURITY DEFINER no banco.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    if (!RE_UUID.test(params.id)) return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
    const { error } = await supabase.rpc('tratar_item_ritmo', { p_id: params.id });
    if (error) {
      if (error.code === '42501') return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      console.error('tratar_item_ritmo', error);
      return NextResponse.json({ error: 'Não foi possível marcar o item agora.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST tratar ritmo falhou', e);
    return NextResponse.json({ error: 'Não foi possível marcar o item agora.' }, { status: 500 });
  }
}
