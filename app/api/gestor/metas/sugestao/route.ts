// GET /api/gestor/metas/sugestao?mes=2026-11-01 — sugestão de metas do modelo determinístico
// (lib/metas-sugestao.ts) para o mês pedido. Só gestor. Não grava nada: a gravação continua sendo o POST
// de /api/gestor/metas, acionado pelo gestor na matriz. Com validar=1 devolve também a validação
// retroativa dos três últimos meses fechados (mais pesada, usada na revisão do modelo).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { criarContexto, sugerirMetas, validarRetroativo, mesesDaJanela, somarMeses } from '@/lib/metas-sugestao-dados';
import type { IndicadorCatalogo } from '@/lib/metas-sugestao';
import { hojeSP } from '@/lib/gtd-prazos';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get('mes');
    if (!mes || !/^\d{4}-\d{2}-01$/.test(mes)) return NextResponse.json({ error: 'Parâmetro mes inválido (esperado AAAA-MM-01).' }, { status: 400 });

    const { data: catalogo, error } = await supabase.from('indicadores_catalogo').select('chave, rotulo, direcao, fonte, agregacao_time').order('chave');
    if (error) throw new Error(error.message);
    const ctx = await criarContexto(supabase);
    const resultado = await sugerirMetas(ctx, mes, (catalogo ?? []) as IndicadorCatalogo[]);
    let validacao = null;
    if (searchParams.get('validar') === '1') {
      const corrente = hojeSP().slice(0, 7) + '-01';
      const meses = [3, 2, 1].map((n) => somarMeses(corrente, -n));
      validacao = { meses, ...(await validarRetroativo(ctx, meses, (catalogo ?? []) as IndicadorCatalogo[])) };
    }
    return NextResponse.json({ ...resultado, validacao, janelaMeses: mesesDaJanela(mes) });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/metas/sugestao falhou', e);
    return NextResponse.json({ error: 'Não foi possível calcular as sugestões agora: ' + (e?.message || e) }, { status: 500 });
  }
}
