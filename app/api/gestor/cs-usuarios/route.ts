// GET lista os vínculos e-mail -> CS / POST vincula (ou atualiza) um e-mail a um CS já cadastrado
// / DELETE remove um vínculo (Parte A, pedido do Vitor 25/09/2026) — restrito a is_gestor(),
// checado aqui e de novo dentro de listar_cs_usuarios/vincular_cs_usuario/desvincular_cs_usuario
// (SECURITY DEFINER), já que cs_usuarios não tem nenhuma policy própria. É esse vínculo que faz a
// home de um CS comum saber quais são "os próprios números" (ver meu_cs() em lib/auth.ts).
import { NextRequest, NextResponse } from 'next/server';
import { listarCSUsuarios, vincularCSUsuario, desvincularCSUsuario } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const vinculos = await listarCSUsuarios(supabase);
    return NextResponse.json({ vinculos });
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
    const nome = String(body?.nome || '').trim();
    if (!email || !nome) return NextResponse.json({ error: 'Informe e-mail e CS.' }, { status: 400 });
    await vincularCSUsuario(supabase, email, nome);
    const vinculos = await listarCSUsuarios(supabase);
    return NextResponse.json({ vinculos });
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
    await desvincularCSUsuario(supabase, email);
    const vinculos = await listarCSUsuarios(supabase);
    return NextResponse.json({ vinculos });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
