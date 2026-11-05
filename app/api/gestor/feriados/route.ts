// GET /api/gestor/feriados — lista de feriados do cálculo de dias úteis. Leitura para usuários MOAI.
// POST /api/gestor/feriados — { data, nome, abrangencia? } cria ou atualiza (salvar_feriado). Restrito a gestor.
// DELETE /api/gestor/feriados — { data } remove (remover_feriado). Restrito a gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { validarFeriado } from '@/lib/metas-semanais-api';

export const dynamic = 'force-dynamic';

function erroDoBanco(e: any) {
  const code = String(e?.code ?? '');
  if (code === '42501') return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
  if (code === '22023') return NextResponse.json({ error: e.message }, { status: 400 });
  console.error('feriados: erro no banco', e);
  return NextResponse.json({ error: 'Não foi possível gravar agora.' }, { status: 500 });
}

export async function GET() {
  try {
    const { supabase } = await requireMoaiUser();
    const { data, error } = await supabase.from('feriados').select('data, nome, abrangencia').order('data');
    if (error) throw new Error(error.message);
    return NextResponse.json({ feriados: data ?? [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/feriados falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar os feriados agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const v = validarFeriado(await req.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { error } = await supabase.rpc('salvar_feriado', { p_data: v.valor.data, p_nome: v.valor.nome, p_abrangencia: v.valor.abrangencia });
    if (error) return erroDoBanco(error);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/feriados falhou', e);
    return NextResponse.json({ error: 'Não foi possível gravar agora.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const corpo = await req.json().catch(() => null);
    const data = corpo && typeof corpo.data === 'string' ? corpo.data : '';
    const v = validarFeriado({ data, nome: 'remover' });
    if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { error } = await supabase.rpc('remover_feriado', { p_data: v.valor.data });
    if (error) return erroDoBanco(error);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('DELETE /api/gestor/feriados falhou', e);
    return NextResponse.json({ error: 'Não foi possível remover agora.' }, { status: 500 });
  }
}
