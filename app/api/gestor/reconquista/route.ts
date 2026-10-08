// /api/gestor/reconquista (08/10/2026): rastreio de quem disse no formulário de saída que voltaria.
// GET ?talvez=1 inclui quem deu 7 ou 8 (padrão: só 9 e 10). POST { churnId, status, responsavel,
// proximoContato, observacao } grava pela função reconquista_definir, que confere is_gestor e audita.
// Nomes de ex membros aparecem aqui porque é uma fila de ação do gestor; a rota é só de gestor.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { carregarReconquista, definirReconquista, validarEntradaDefinir } from '@/lib/reconquista';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const talvez = new URL(req.url).searchParams.get('talvez') === '1';
    return NextResponse.json(await carregarReconquista(supabase, talvez));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('reconquista falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar o rastreio de reconquista agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    let entrada;
    try {
      entrada = validarEntradaDefinir(await req.json());
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Dados inválidos.' }, { status: 400 });
    }
    const registro = await definirReconquista(supabase, entrada);
    return NextResponse.json({ ok: true, registro });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    const msg = String(e?.message || '');
    if (/not authorized/.test(msg)) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    if (/não encontrada/.test(msg)) return NextResponse.json({ error: 'Esta saída não existe mais no board de churn.' }, { status: 404 });
    console.error('reconquista_definir falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar agora.' }, { status: 500 });
  }
}
