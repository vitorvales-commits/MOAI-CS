// GET /api/gestor/nps-conselhos?ref=AAAA-MM&cs=
// Aba NPS dos conselhos (08/10/2026), só com o board NPS Conselhos Estratégicos 2026 (18393367198):
// notas de 0 a 10 por dimensão, onde a nota cai, evolução nos desafios e o que os membros sugerem.
// Presença e atas entram só como contexto do desafio. Sem IA; trechos anonimizados; nenhum nome de
// respondente sai na resposta. Gestor apenas.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { mesAtualBrasilia } from '@/lib/churn';
import { carregarNpsConselhos } from '@/lib/voz-membro-dados';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const sp = new URL(req.url).searchParams;
    const ref = sp.get('ref') || mesAtualBrasilia();
    if (!/^\d{4}-\d{2}$/.test(ref)) {
      return NextResponse.json({ error: 'Mês de referência inválido.' }, { status: 400 });
    }
    const cs = (sp.get('cs') || '').trim();
    return NextResponse.json(await carregarNpsConselhos(supabase, ref, cs));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('NPS dos conselhos falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar o NPS dos conselhos agora.' }, { status: 500 });
  }
}
