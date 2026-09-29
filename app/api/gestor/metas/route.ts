// GET /api/gestor/metas?mes=2026-09-01 — dados da matriz de metas: catálogo completo, roster de
// CS ativos e o valor resolvido (com herança) de cada indicador × (cada CS + time) pro mês pedido,
// junto do mês de origem (pra front-end distinguir meta herdada de meta explicitamente definida
// naquele mês — mesmo mes_origem === mes pedido). Restrito a gestor.
// POST /api/gestor/metas — { mes, itens: [{indicador, escopo, csNome, valor}] } — grava em lote via
// definir_metas_lote (checa is_gestor de novo dentro do banco, audita uma linha só).
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function mesValido(mes: string | null): mes is string {
  return !!mes && /^\d{4}-\d{2}-01$/.test(mes);
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get('mes');
    if (!mesValido(mes)) return NextResponse.json({ error: 'Parâmetro mes inválido (esperado AAAA-MM-01).' }, { status: 400 });

    const [{ data: catalogo, error: e1 }, { data: csRoster, error: e2 }, { data: resolvidas, error: e3 }, { data: configHome, error: e4 }] = await Promise.all([
      supabase.from('indicadores_catalogo').select('chave, rotulo, unidade, direcao, fonte, agregacao_time').order('chave'),
      supabase.from('cs_config').select('nome, nome_completo').eq('ativo', true).order('nome'),
      supabase.rpc('metas_resolvidas_periodo', { p_mes_inicio: mes, p_mes_fim: mes }),
      supabase.from('config_home_indicadores').select('indicador, visivel'),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);
    if (e4) throw new Error(e4.message);

    const visivelPorIndicador = new Map((configHome ?? []).map((c: any) => [c.indicador, c.visivel]));
    const catalogoComVisivel = (catalogo ?? []).map((c: any) => ({ ...c, visivel: visivelPorIndicador.get(c.chave) ?? false }));

    return NextResponse.json({ mes, catalogo: catalogoComVisivel, csAtivos: csRoster ?? [], resolvidas: resolvidas ?? [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/metas falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar as metas agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const body = await req.json();
    const mes = body?.mes;
    const itensBrutos = body?.itens;
    if (!mesValido(mes)) return NextResponse.json({ error: 'Parâmetro mes inválido.' }, { status: 400 });
    if (!Array.isArray(itensBrutos) || itensBrutos.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um item.' }, { status: 400 });
    }
    if (itensBrutos.length > 500) return NextResponse.json({ error: 'Lote grande demais.' }, { status: 400 });

    const itens = itensBrutos.map((it: any) => ({
      indicador: typeof it?.indicador === 'string' ? it.indicador : null,
      escopo: typeof it?.escopo === 'string' ? it.escopo : null,
      cs_nome: typeof it?.csNome === 'string' ? it.csNome : null,
      valor: typeof it?.valor === 'number' ? it.valor : Number(it?.valor),
    }));
    if (itens.some((it: any) => !it.indicador || !it.escopo || !Number.isFinite(it.valor))) {
      return NextResponse.json({ error: 'Item inválido no lote.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('definir_metas_lote', { p_mes: mes, p_itens: itens });
    if (error) throw new Error(error.message);
    return NextResponse.json({ salvos: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/metas falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar as metas agora.' }, { status: 500 });
  }
}
