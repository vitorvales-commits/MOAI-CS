// GET /api/gestor/pulso?mes=Outubro&ano=2026 (mes pode ser "Visão Geral").
// Pulso de CS (pedido do Vitor, 05/10/2026): NPS interno, clareza de prioridades, gargalos,
// reconhecimentos e textos do formulário mensal do time de CS. Gestor apenas, garantido aqui e pela
// RLS de pulso_cs_items. Nenhum nome de respondente sai nesta resposta.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generatePulsoCS } from '@/lib/pulso';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    return NextResponse.json(await generatePulsoCS(supabase, mes, ano));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('pulso gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar o Pulso de CS agora.' }, { status: 500 });
  }
}
