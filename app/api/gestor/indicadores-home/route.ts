// GET /api/gestor/indicadores-home — catálogo completo + config_home_indicadores (visível, ordem,
// exibir recorde) de cada um, pra tela "Indicadores da home". POST — { itens: [{indicador,
// visivel, ordem, exibirRecorde}] } — grava tudo de uma vez via configurar_home_indicadores.
// Restrito a gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const [{ data: catalogo, error: e1 }, { data: config, error: e2 }] = await Promise.all([
      supabase.from('indicadores_catalogo').select('chave, rotulo, unidade, direcao').order('chave'),
      supabase.from('config_home_indicadores').select('indicador, visivel, ordem, exibir_recorde').order('ordem'),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const configPorIndicador = new Map((config ?? []).map((c: any) => [c.indicador, c]));
    const itens = (catalogo ?? []).map((c: any) => {
      const cfg = configPorIndicador.get(c.chave);
      return {
        indicador: c.chave, rotulo: c.rotulo, direcao: c.direcao,
        visivel: cfg?.visivel ?? false, ordem: cfg?.ordem ?? 999, exibirRecorde: cfg?.exibir_recorde ?? true,
      };
    }).sort((a: any, b: any) => a.ordem - b.ordem);

    return NextResponse.json({ itens });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/indicadores-home falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar os indicadores agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const body = await req.json();
    const itensBrutos = body?.itens;
    if (!Array.isArray(itensBrutos) || itensBrutos.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um item.' }, { status: 400 });
    }
    const itens = itensBrutos.map((it: any) => ({
      indicador: typeof it?.indicador === 'string' ? it.indicador : null,
      visivel: !!it?.visivel,
      ordem: Number(it?.ordem),
      exibirRecorde: !!it?.exibirRecorde,
    }));
    if (itens.some((it: any) => !it.indicador || !Number.isFinite(it.ordem))) {
      return NextResponse.json({ error: 'Item inválido.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('configurar_home_indicadores', { p_itens: itens });
    if (error) throw new Error(error.message);
    return NextResponse.json({ salvos: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('POST /api/gestor/indicadores-home falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar agora.' }, { status: 500 });
  }
}
