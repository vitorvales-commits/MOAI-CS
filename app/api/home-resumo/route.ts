// GET /api/home-resumo?mes=X&ano=Y — tudo que a home do CS comum pode ver ALÉM do próprio
// relatório individual (Parte A, pedido do Vitor 25/09/2026): os indicadores agregados do time
// (só soma/média, sem nome de ninguém — a parte numérica é borrada no front-end conforme
// /api/config) e as duas exceções sempre visíveis pra qualquer CS: o Top 3 nomeado com pontuação
// (e o detalhamento item a item da fórmula) e a própria posição no ranking geral, nunca a lista
// inteira. Liberado pra qualquer usuário moai (não só CS comum) — um gestor que também seja CS
// pode chamar isto pra ver a própria posição, mas o ranking nomeado completo/radar comparativo
// continuam só em /api/gestor/visao-geral.
import { NextRequest, NextResponse } from 'next/server';
import { generateHomeResumoCS } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, csNome } = await requireMoaiUser();
    const data = await generateHomeResumoCS(supabase, mes, ano, csNome);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
