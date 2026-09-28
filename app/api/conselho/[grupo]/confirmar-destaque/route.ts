// POST /api/conselho/:grupo/confirmar-destaque — Parte F (pedido do Vitor, 28/09/2026): confirma
// o membro certo pro texto livre de "quem se destacou na reunião" (board de NPS) que não casou
// automaticamente com o roster. Mesmo padrão de /confirmar-membro (Big Deal/ata): passa por
// confirmarAliasNpsDestaque (lib/reports.ts), que chama a função SECURITY DEFINER
// confirmar_alias_nps_destaque — grava o alias em nps_destaque_aliases, aplicado a TODAS as
// ocorrências futuras daquele texto pra este conselho, não só a clicada.
import { NextRequest, NextResponse } from 'next/server';
import { confirmarAliasNpsDestaque } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { grupo: string } }) {
  const grupo = decodeURIComponent(params.grupo);
  try {
    const { supabase } = await requireMoaiUser();
    const body = await req.json();
    const nomeDestaque = String(body?.nomeDestaque || '').trim();
    const membroOficial = String(body?.membroOficial || '').trim();
    if (!nomeDestaque || !membroOficial) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: nomeDestaque, membroOficial' }, { status: 400 });
    }
    await confirmarAliasNpsDestaque(supabase, grupo, nomeDestaque, membroOficial);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
