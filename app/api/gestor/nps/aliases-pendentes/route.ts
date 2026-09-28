// GET  /api/gestor/nps/aliases-pendentes — aliases conselho-do-board-de-NPS -> group_id ainda não
// confirmados, mais o roster de conselhos ativos pro seletor manual.
// POST /api/gestor/nps/aliases-pendentes — confirma um alias (conselhoRaw, groupId).
// Parte D (pedido do Vitor, 28/09/2026), gestor-only — mesmo padrão de confirmar-membro em
// /api/conselho/[grupo]/confirmar-membro.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarAliasesNpsPendentes, listarConselhosAtivosParaAlias, confirmarAliasNpsConselho } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const [pendentes, roster] = await Promise.all([
      listarAliasesNpsPendentes(supabase),
      listarConselhosAtivosParaAlias(supabase),
    ]);
    return NextResponse.json({ pendentes, roster });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const body = await req.json();
    const conselhoRaw = String(body?.conselhoRaw || '').trim();
    const groupId = String(body?.groupId || '').trim();
    if (!conselhoRaw || !groupId) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: conselhoRaw, groupId' }, { status: 400 });
    }
    await confirmarAliasNpsConselho(supabase, conselhoRaw, groupId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
