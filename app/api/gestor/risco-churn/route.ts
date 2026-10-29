// GET /api/gestor/risco-churn: risco de churn por membro (regras fixas, sem IA), ordenado por urgência e impacto,
// com a carteira ao lado de cada CS. POST altera um peso ou limiar. Gestor apenas: a checagem vem antes de qualquer leitura.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { calcularRiscoCarteira } from '@/lib/risco-churn-dados';
import { RISCO_CONFIG_PADRAO, FIDELIDADE_MESES } from '@/lib/risco-churn';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const r = await calcularRiscoCarteira(supabase);
    return NextResponse.json({ ...r, fidelidadeMeses: FIDELIDADE_MESES, padrao: RISCO_CONFIG_PADRAO });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('Risco de churn falhou', e);
    return NextResponse.json({ error: 'Não foi possível calcular o risco de churn agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const corpo = await req.json().catch(() => null);
    const chave = String(corpo?.chave || ''), valor = Number(corpo?.valor);
    if (!(chave in RISCO_CONFIG_PADRAO) || !Number.isFinite(valor) || valor < 0 || valor > 1000) {
      return NextResponse.json({ error: 'Peso inválido. Use um número entre 0 e 1000.' }, { status: 400 });
    }
    const { error } = await supabase.rpc('definir_risco_churn_config', { p_chave: chave, p_valor: valor });
    if (error) return NextResponse.json({ error: 'Não foi possível salvar o peso. Confira se a migration de risco de churn foi aplicada.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Não foi possível salvar o peso agora.' }, { status: 500 });
  }
}
