// POST /api/processos/restaurar  { versao, versaoBase }  republica uma versão antiga como versão nova (só gestor).
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { erroDoBanco } from '@/lib/processos';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode restaurar versões dos processos.' }, { status: 403 });
    let corpo: any;
    try { corpo = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    const versao = Number(corpo?.versao), versaoBase = Number(corpo?.versaoBase);
    if (!Number.isInteger(versao) || versao <= 0 || !Number.isInteger(versaoBase) || versaoBase < 0) {
      return NextResponse.json({ error: 'Versão inválida.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('processos_restaurar', { p_versao: versao, p_versao_base: versaoBase });
    if (error) {
      const t = erroDoBanco(error);
      if (t.status === 500) console.error('[api/processos/restaurar POST]', error);
      return NextResponse.json({ error: t.erro }, { status: t.status });
    }
    return NextResponse.json({ versao: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/processos/restaurar POST]', e);
    return NextResponse.json({ error: 'Não foi possível restaurar a versão.' }, { status: 500 });
  }
}
