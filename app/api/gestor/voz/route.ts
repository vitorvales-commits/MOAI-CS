// GET /api/gestor/voz?mes=Visão Geral&ano=2026 e POST /api/gestor/voz (muda o status).
// Voz do liderado (pedido do Vitor, 05/10/2026): sugestões do Pulso de CS com insights e quadro de
// status. Gestor apenas, garantido aqui, pela RLS das tabelas e de novo dentro de voz_definir_status.
// Nenhum nome de respondente sai nesta resposta.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateVozLiderado, definirStatusVoz, statusVozValido } from '@/lib/voz';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes') || 'Visão Geral';
  const ano = Number(searchParams.get('ano')) || new Date().getFullYear();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    return NextResponse.json(await generateVozLiderado(supabase, mes, ano));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('voz gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar a Voz do liderado agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const status = body?.status;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Identificador de sugestão inválido.' }, { status: 400 });
    }
    if (!statusVozValido(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }
    const observacao = body?.observacao === undefined || body?.observacao === null ? null : String(body.observacao).slice(0, 600);
    return NextResponse.json(await definirStatusVoz(supabase, id, status, observacao));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('voz status falhou', e);
    return NextResponse.json({ error: e?.message || 'Não foi possível salvar o status.' }, { status: 400 });
  }
}
