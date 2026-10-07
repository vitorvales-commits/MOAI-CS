// GET /api/gestor/cs/:nome?mes=X&ano=Y — página do CS na visão do gestor. Uma única chamada agregada
// devolve cabeçalho (foto, pontuação, posição), radar, GTD, críticos por produto, Health da Base e
// advertências. Restrita a quem tem is_gestor()=true: a checagem vem ANTES de tocar em qualquer
// dado (403 para CS comum e para quem não tem vínculo), nunca monta a resposta pra depois filtrar.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { paginaCSGestor } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    if (!mes || !ano) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
    }
    const data = await paginaCSGestor(supabase, nome, mes, ano);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status === 404) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
