// GET /api/gestor/visitas?ref=AAAA-MM              blocos a2, b3, cartões de a1, c1, c2 e c3 (JSON)
// GET /api/gestor/visitas?ref=AAAA-MM&formato=csv  lista de visitas (c3) em CSV, com registro de auditoria
// Visitas de reversão de churn. Os números saem da função visitas_resultado (SQL), montados em
// lib/visitas-dados.ts, o mesmo código que o relatório usa. Gestor apenas.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { mesAtualBrasilia } from '@/lib/churn';
import { carregarVisitas, csvVisitas } from '@/lib/visitas-dados';

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
    const { janela, payload } = await carregarVisitas(supabase, ref);

    if (sp.get('formato') === 'csv') {
      await supabase.rpc('log_access', {
        p_action: 'exportar_visitas_csv', p_result: 'ok', p_metadata: { ref, linhas: janela.length }, p_resource: 'visitas_churn',
      });
      return new NextResponse(csvVisitas(janela), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="visitas-churn-${ref}.csv"`,
        },
      });
    }
    return NextResponse.json(payload);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('visitas gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar as visitas agora.' }, { status: 500 });
  }
}
