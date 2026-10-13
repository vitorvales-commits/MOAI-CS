// GET  /api/processos  documento de processos de CS completo (qualquer usuário do domínio).
// POST /api/processos  publica uma nova versão inteira do documento (só gestor). A divisão em seções
// e a comparação acontecem no editor; aqui só se valida o formato e se chama processos_publicar,
// que reconfere is_gestor(), recusa conflito de versão e grava o histórico.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { lerProcessos, publicarProcessos, validarPublicacao, erroDoBanco } from '@/lib/processos';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    const doc = await lerProcessos(supabase);
    return NextResponse.json({ ...doc, podeEditar: isGestor });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/processos GET]', e);
    return NextResponse.json({ error: 'Não foi possível carregar os processos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Só gestor pode alterar os processos.' }, { status: 403 });
    let corpo: unknown;
    try { corpo = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    const v = validarPublicacao(corpo);
    if ('erro' in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { data, error } = await publicarProcessos(supabase, v.valor);
    if (error) {
      const t = erroDoBanco(error);
      if (t.status === 500) console.error('[api/processos POST]', error);
      return NextResponse.json({ error: t.erro }, { status: t.status });
    }
    return NextResponse.json({ versao: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/processos POST]', e);
    return NextResponse.json({ error: 'Não foi possível salvar os processos agora.' }, { status: 500 });
  }
}
