// GET  /api/gestor/agenda-aliases — nomes da agenda sem grupo (só os pendentes, do maior para o menor impacto em eventos),
// com o grupo candidato, mais o roster de conselhos ativos para trocar o grupo.
// POST /api/gestor/agenda-aliases — confirma ou troca o grupo de um nome (conselheiroNome, groupId).
// Gestor apenas; mesmo padrão de /api/gestor/nps/aliases-pendentes.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarAliasesAgendaPendentes, confirmarAliasAgendaConselho } from '@/lib/aliases-agenda';
import { listarConselhosAtivosParaAlias } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const [{ disponivel, pendentes }, roster] = await Promise.all([listarAliasesAgendaPendentes(supabase), listarConselhosAtivosParaAlias(supabase)]);
    return NextResponse.json({ disponivel, pendentes, roster });
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
    const conselheiroNome = String(body?.conselheiroNome || '').trim();
    const groupId = String(body?.groupId || '').trim();
    if (!conselheiroNome || !groupId) return NextResponse.json({ error: 'Parâmetros obrigatórios: conselheiroNome, groupId' }, { status: 400 });
    await confirmarAliasAgendaConselho(supabase, conselheiroNome, groupId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
