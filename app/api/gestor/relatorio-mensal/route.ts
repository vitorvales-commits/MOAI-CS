// GET /api/gestor/relatorio-mensal?mes=X&ano=Y — Parte G (pedido do Vitor, 28/09/2026): gera o
// relatório mensal de Conselhos Estratégicos como página HTML AUTÔNOMA (todo dado já embutido no
// arquivo — ver gerarRelatorioMensalHtml em lib/relatorio-mensal-html.ts) e devolve pra download,
// no mesmo espírito visual de moai_talks_relatorio_1.html (referência enviada pelo Vitor).
// gestor-only, mesmo padrão de /api/gestor/nps.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateRelatorioMensal } from '@/lib/reports';
import { gerarRelatorioMensalHtml } from '@/lib/relatorio-mensal-html';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const dados = await generateRelatorioMensal(supabase, mes, ano);
    const html = gerarRelatorioMensalHtml(dados);
    const preview = searchParams.get('preview') === '1';
    const slugMes = mes.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...(preview ? {} : { 'Content-Disposition': `attachment; filename="relatorio-conselhos-${slugMes}-${ano}.html"` }),
      },
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
