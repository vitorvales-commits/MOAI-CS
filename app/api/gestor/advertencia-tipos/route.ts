// GET  /api/gestor/advertencia-tipos — catálogo completo (ativos e inativos), pra tela de
// Controle de Perfis e pro seletor de "aplicar advertência" no perfil do CS.
// POST /api/gestor/advertencia-tipos — cria um novo tipo. Ambos só gestor.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarAdvertenciaTipos, criarAdvertenciaTipo } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode ver o catálogo de advertência.' }, { status: 403 });
    }
    const tipos = await listarAdvertenciaTipos(supabase);
    return NextResponse.json({ tipos });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode criar um tipo de advertência.' }, { status: 403 });
    }
    const body = await req.json();
    const nome = String(body?.nome || '').trim();
    const pontos = Number(body?.pontos);
    const validadeMeses = Number(body?.validadeMeses);
    if (!nome) return NextResponse.json({ error: 'Parâmetro obrigatório: nome' }, { status: 400 });
    if (!Number.isFinite(pontos) || pontos < 0) return NextResponse.json({ error: 'Pontos inválidos' }, { status: 400 });
    if (!Number.isFinite(validadeMeses) || validadeMeses <= 0) return NextResponse.json({ error: 'Validade inválida' }, { status: 400 });
    const id = await criarAdvertenciaTipo(supabase, nome, pontos, validadeMeses);
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
