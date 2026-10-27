// GET /api/gestor/relatorios-conselho?ref=AAAA-MM — acompanhamento dos relatórios pós conselho pelo gestor:
// cobertura do mês, como foram os encontros, leituras que pedem ação e o detalhe de cada relatório.
// Regras fixas, sem IA. Gestor apenas: a checagem vem antes de qualquer leitura.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { mesAtualBrasilia } from '@/lib/churn';
import { carregarPainelRelatorios } from '@/lib/relatorios-gestor-dados';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const ref = new URL(req.url).searchParams.get('ref') || mesAtualBrasilia();
    if (!/^\d{4}-\d{2}$/.test(ref)) return NextResponse.json({ error: 'Mês de referência inválido.' }, { status: 400 });
    return NextResponse.json(await carregarPainelRelatorios(supabase, ref));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('Relatórios do conselho (gestor) falharam', e);
    return NextResponse.json({ error: 'Não foi possível carregar os relatórios dos conselhos agora.' }, { status: 500 });
  }
}
