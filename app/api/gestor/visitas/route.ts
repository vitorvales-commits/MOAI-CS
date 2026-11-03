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

// Campos que a edição precisa e que a lista não traz: data de alteração no Monday (lido_em), próximo
// acompanhamento e observações. Ficam fora de carregarVisitas para não entrarem no relatório imprimível.
// Se a leitura falhar (ou a coluna ainda não existir), vão nulos e a tela mantém o botão Editar desabilitado.
async function acrescentarCamposDeEdicao(supabase: any, linhas: any[]) {
  const extras = new Map<number, any>();
  try {
    const ids = linhas.map((l) => l.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase
        .from('visitas_churn')
        .select('id, monday_updated_at, proximo_acompanhamento, observacoes')
        .in('id', ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
      (data || []).forEach((r: any) => extras.set(Number(r.id), r));
    }
  } catch (e) {
    console.error('visitas gestor: campos de edição indisponíveis', e);
  }
  linhas.forEach((l) => {
    const x = extras.get(Number(l.id));
    l.mondayUpdatedAt = x?.monday_updated_at ?? null;
    l.proximoAcompanhamento = x?.proximo_acompanhamento ?? null;
    l.observacoes = x?.observacoes ?? null;
  });
}

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
    await acrescentarCamposDeEdicao(supabase, payload.c3.linhas);

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
