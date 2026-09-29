// PATCH /api/gestor/advertencia-tipos/:id — edita um tipo (nome/pontos/validade/ativo). Cobre
// tanto edição normal quanto desativar sem apagar (ativo=false). Só gestor.
import { NextRequest, NextResponse } from 'next/server';
import { editarAdvertenciaTipo } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode editar um tipo de advertência.' }, { status: 403 });
    }
    const body = await req.json();
    const nome = String(body?.nome || '').trim();
    const pontos = Number(body?.pontos);
    const validadeMeses = Number(body?.validadeMeses);
    const ativo = !!body?.ativo;
    if (!nome) return NextResponse.json({ error: 'Parâmetro obrigatório: nome' }, { status: 400 });
    if (!Number.isFinite(pontos) || pontos < 0) return NextResponse.json({ error: 'Pontos inválidos' }, { status: 400 });
    if (!Number.isFinite(validadeMeses) || validadeMeses <= 0) return NextResponse.json({ error: 'Validade inválida' }, { status: 400 });
    await editarAdvertenciaTipo(supabase, params.id, nome, pontos, validadeMeses, ativo);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
