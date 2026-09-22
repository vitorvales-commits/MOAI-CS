// GET lista gestores / POST adiciona por e-mail / DELETE remove — tudo restrito a is_gestor(),
// checado aqui (defesa em camadas) e de novo dentro das funções SECURITY DEFINER
// listar_gestores/adicionar_gestor/remover_gestor (ver lib/reports.ts e a migração
// add_gestor_perfis_rpcs), já que a tabela gestores não tem nenhuma policy própria.
import { NextRequest, NextResponse } from 'next/server';
import { listarGestores, adicionarGestor, removerGestor } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const gestores = await listarGestores(supabase);
    return NextResponse.json({ gestores });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const body = await req.json();
    const email = String(body?.email || '').trim();
    if (!email) return NextResponse.json({ error: 'Informe um e-mail.' }, { status: 400 });
    await adicionarGestor(supabase, email);
    const gestores = await listarGestores(supabase);
    return NextResponse.json({ gestores });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get('email') || '').trim();
    if (!email) return NextResponse.json({ error: 'Informe um e-mail.' }, { status: 400 });
    await removerGestor(supabase, email);
    const gestores = await listarGestores(supabase);
    return NextResponse.json({ gestores });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
