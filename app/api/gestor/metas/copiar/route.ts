// POST /api/gestor/metas/copiar — { de, para } (AAAA-MM-01) — copia todas as metas de um mês pra
// outro sem sobrescrever o que já foi definido no destino (copiar_metas_mes, ON CONFLICT DO
// NOTHING). Restrito a gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function mesValido(mes: unknown): mes is string {
  return typeof mes === 'string' && /^\d{4}-\d{2}-01$/.test(mes);
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const body = await req.json();
    const de = body?.de;
    const para = body?.para;
    if (!mesValido(de) || !mesValido(para)) {
      return NextResponse.json({ error: 'Parâmetros de/para inválidos.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('copiar_metas_mes', { p_de: de, p_para: para });
    if (error) throw new Error(error.message);
    return NextResponse.json({ copiadas: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/metas/copiar falhou', e);
    return NextResponse.json({ error: 'Não foi possível copiar as metas agora.' }, { status: 500 });
  }
}
