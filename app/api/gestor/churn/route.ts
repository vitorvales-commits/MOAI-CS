// GET /api/gestor/churn?base=toda_a_rede&granularidade=mes|semana&ref=AAAA-MM&cs=&produtos=a,b&comunidade=1&categoria=
// Aba Churn da visão de gestor. Tudo que a tela mostra (série, número do mês, motivo mais citado,
// variação, recorde, linha da Comunidade) sai de UMA função do banco, churn_tela, com um único filtro,
// então nenhum número pode divergir de outro (respostaTela em lib/churn.ts monta a resposta). Sem base
// na URL, vale a Carteira atual; sem ref, vale o último mês fechado. O gráfico vem desenhado no
// servidor, o mesmo componente do relatório. Gestor apenas, como /api/gestor/visao-geral.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { parseRecorte, RecorteInvalido, respostaTela } from '@/lib/churn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const recorte = parseRecorte(new URL(req.url).searchParams);
    return NextResponse.json(await respostaTela(supabase, recorte));
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e?.status) return authErrorResponse(e);
    console.error('churn gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar o churn agora.' }, { status: 500 });
  }
}
