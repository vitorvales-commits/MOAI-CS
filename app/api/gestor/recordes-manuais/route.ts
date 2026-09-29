// GET /api/gestor/recordes-manuais — lista os recordes manuais já cadastrados (recorde anterior
// ao histórico sincronizado). POST — { indicador, escopo, cs, valor, mes, obs } — grava via
// definir_recorde_manual. Restrito a gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const { data, error } = await supabase
      .from('recordes_manuais')
      .select('indicador, escopo, cs_nome, valor, mes_referencia, observacao, atualizado_por, atualizado_em')
      .order('indicador');
    if (error) throw new Error(error.message);
    return NextResponse.json({ recordes: data ?? [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/recordes-manuais falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar os recordes agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const body = await req.json();
    const indicador = typeof body?.indicador === 'string' ? body.indicador : null;
    const escopo = typeof body?.escopo === 'string' ? body.escopo : null;
    const cs = typeof body?.cs === 'string' && body.cs.trim() ? body.cs.trim() : null;
    const valor = Number(body?.valor);
    const mes = typeof body?.mes === 'string' ? body.mes : null;
    const obs = typeof body?.obs === 'string' ? body.obs.slice(0, 500) : null;
    if (!indicador || !escopo || !Number.isFinite(valor) || !mes || !/^\d{4}-\d{2}-01$/.test(mes)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const { error } = await supabase.rpc('definir_recorde_manual', {
      p_indicador: indicador, p_escopo: escopo, p_cs: cs, p_valor: valor, p_mes: mes, p_obs: obs,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/recordes-manuais falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar o recorde agora.' }, { status: 500 });
  }
}
