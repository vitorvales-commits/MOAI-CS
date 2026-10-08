// GET /api/gestor/membro/voz?ref=AAAA-MM&cs=&fonte=todas|saida|nps
// Blocos b2 (o que os membros estão falando), b4 (por que as notas são baixas), b5 (por que não evoluem
// no desafio) e o cartão 4 de a1 (membros travados no mês). Tudo determinístico: temas por expressão
// regular, contagens e regras fixas da especificação (sem IA). Trechos de texto saem anonimizados.
// Nenhum nome de respondente do NPS entra na resposta, só o conselho. Gestor apenas.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { mesAtualBrasilia } from '@/lib/churn';
import { carregarVozMembro } from '@/lib/voz-membro-dados';

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
    const fonte = sp.get('fonte') || 'todas';

    const payload = await carregarVozMembro(supabase, ref, cs, fonte);
    return NextResponse.json(payload);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('voz do membro falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar a voz do membro agora.' }, { status: 500 });
  }
}
