// GET /api/gestor/ritmo-limiar — limiar atual do ritmo semanal (0 a 1).
// POST /api/gestor/ritmo-limiar — { limiar } grava o limiar (salvar_limiar_ritmo). Restrito a gestor, checado de novo no banco.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const { data, error } = await supabase.from('ritmo_semanal_config').select('valor').eq('chave', 'limiar').maybeSingle();
    if (error) return NextResponse.json({ error: 'Não foi possível ler o limiar agora.' }, { status: 500 });
    return NextResponse.json({ limiar: data ? Number(data.valor) : null });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Não foi possível ler o limiar agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const corpo = await req.json().catch(() => null);
    const limiar = corpo && typeof corpo.limiar === 'number' ? corpo.limiar : NaN;
    if (!(limiar > 0 && limiar <= 1)) return NextResponse.json({ error: 'O limiar precisa estar entre 1% e 100%.' }, { status: 400 });
    const { error } = await supabase.rpc('salvar_limiar_ritmo', { p_valor: limiar });
    if (error) {
      if (error.code === '42501') return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      console.error('salvar_limiar_ritmo', error);
      return NextResponse.json({ error: 'Não foi possível salvar o limiar agora.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, limiar });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST ritmo-limiar falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar o limiar agora.' }, { status: 500 });
  }
}
