// GET /api/gestor/metas/desempenho?mes=2026-11-01 — para a matriz de metas do mês pedido, devolve quanto cada CS
// e o time realizaram da meta do mês anterior (lib/metas-sugestao-dados.ts, desempenhoDoMes) e o piso de Revenue
// Churn de cada CS pela composição da carteira (lib/metas-carteira.ts). Só gestor, só leitura. Fica separado do
// GET da matriz porque recalcula um relatório por CS: a matriz abre na hora e esta camada chega em seguida.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { criarContexto, desempenhoDoMes, pisosRevenueChurn, somarMeses } from '@/lib/metas-sugestao-dados';
import type { IndicadorCatalogo } from '@/lib/metas-sugestao';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const mes = new URL(req.url).searchParams.get('mes');
    if (!mes || !/^\d{4}-\d{2}-01$/.test(mes)) return NextResponse.json({ error: 'Parâmetro mes inválido (esperado AAAA-MM-01).' }, { status: 400 });

    const { data: catalogo, error } = await supabase.from('indicadores_catalogo').select('chave, rotulo, direcao, fonte, agregacao_time').order('chave');
    if (error) throw new Error(error.message);
    const ctx = await criarContexto(supabase);
    const anterior = somarMeses(mes, -1);
    const desempenho = await desempenhoDoMes(ctx, anterior, (catalogo ?? []) as IndicadorCatalogo[]);
    return NextResponse.json({ mes, anterior: desempenho, pisosRevenueChurn: pisosRevenueChurn(ctx) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/metas/desempenho falhou', e);
    return NextResponse.json({ error: 'Não foi possível calcular o realizado do mês anterior agora: ' + (e?.message || e) }, { status: 500 });
  }
}
