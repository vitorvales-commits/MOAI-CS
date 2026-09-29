// GET  /api/cs/:nome/advertencias — histórico + pontuação ativa daquele CS.
// POST /api/cs/:nome/advertencias — aplica um tipo do catálogo a esse CS (só gestor).
// Brainstorm 29/09/2026: visível igual pro gestor e pro próprio CS (mesma filosofia do 1:1 — é
// "pra noção geral de como tá", não uma ferramenta de gestão pro CS mexer). Mesma regra de acesso
// de leitura de /api/cs/[nome]/um-a-um: gestor vê qualquer CS, um CS comum só vê o próprio.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarAdvertenciasCS, aplicarAdvertencia } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar as próprias advertências.' }, { status: 403 });
    }
    const { registros, pontuacaoAtiva } = await listarAdvertenciasCS(supabase, nome);
    return NextResponse.json({ registros, pontuacaoAtiva });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode aplicar uma advertência.' }, { status: 403 });
    }
    const body = await req.json();
    const tipoId = String(body?.tipoId || '').trim();
    const observacao = body?.observacao ? String(body.observacao) : null;
    if (!tipoId) {
      return NextResponse.json({ error: 'Parâmetro obrigatório: tipoId' }, { status: 400 });
    }
    const id = await aplicarAdvertencia(supabase, nome, tipoId, observacao);
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
