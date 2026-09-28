// GET  /api/cs/:nome/um-a-um — histórico de 1:1 daquele CS (mais recente primeiro).
// POST /api/cs/:nome/um-a-um — cria um novo registro (só gestor).
// Parte A (pedido do Vitor 28/09/2026): mesma regra de acesso de /api/cs/[nome] — gestor vê
// qualquer CS, um CS comum só vê o próprio (nome === csNome).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { listarUmAUm, criarUmAUm } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar os próprios 1:1.' }, { status: 403 });
    }
    const registros = await listarUmAUm(supabase, nome);
    return NextResponse.json({ registros });
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
      return NextResponse.json({ error: 'Só gestor pode registrar um 1:1.' }, { status: 403 });
    }
    const body = await req.json();
    const data = String(body?.data || '').trim();
    const oQueFoiFalado = body?.oQueFoiFalado ? String(body.oQueFoiFalado) : null;
    const combinados = body?.combinados ? String(body.combinados) : null;
    if (!data) {
      return NextResponse.json({ error: 'Parâmetro obrigatório: data' }, { status: 400 });
    }
    const id = await criarUmAUm(supabase, nome, data, oQueFoiFalado, combinados);
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
