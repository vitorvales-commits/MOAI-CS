// POST /api/vitorio/consulta  registra o que foi perguntado ao Vitorio e o resultado (resposta, ambigua ou nada).
// Guarda o perfil, não a pessoa (VITORIO_REGISTRAR_PESSOA). Falha de registro nunca atrapalha quem perguntou.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { VITORIO_REGISTRAR_PESSOA } from '@/lib/constants';
import { perfilPermitido } from '@/lib/vitorio/servidor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    let b: any;
    try { b = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    const consulta = String(b?.consulta || '').trim().slice(0, 200);
    const resultado = String(b?.resultado || '');
    if (!consulta || !['resposta', 'ambigua', 'nada'].includes(resultado)) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400 });
    const { data, error } = await supabase.rpc('vitorio_registrar_consulta', {
      p_perfil: perfilPermitido(String(b?.perfil || ''), isGestor, csNome), p_consulta: consulta, p_resultado: resultado,
      p_chave: b?.chave ? String(b.chave).slice(0, 200) : null, p_gravar_email: VITORIO_REGISTRAR_PESSOA,
    });
    if (error) {
      // 54000: limite de 30 consultas por hora; o resto é falha de registro que a pessoa não precisa ver
      if (error.code !== '54000') console.error('[api/vitorio/consulta]', error.message);
      return NextResponse.json({ id: null });
    }
    return NextResponse.json({ id: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/consulta]', e);
    return NextResponse.json({ id: null });
  }
}
