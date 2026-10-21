// Espelha getEquipeReportPublico(mes, ano) do Code.gs original.
// GET /api/equipe?mes=Setembro&ano=2026  (mes pode ser "Visão Geral")
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateEquipeReport } from '@/lib/reports';
import { variacaoDoRanking } from '@/lib/evolucao-dados';
import { hojeSP } from '@/lib/gtd-prazos';
import { montarHomeGestor } from '@/lib/home-gestor';
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
    // Parte A (pedido do Vitor 25/09/2026): relatório da equipe inteira (ranking nomeado, grade
    // de conselhos de todo mundo etc.) é exclusivo da visão de gestor — um CS comum usa
    // /api/home-resumo (indicadores agregados sem nome + as duas exceções) e o próprio
    // /api/cs/[nome] pros dados individuais.
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const data = await generateEquipeReport(supabase, mes, ano);
    // Campo aditivo da home do gestor (redesenho de 20/10/2026): frase do mês, pódio, time e blocos prontos. Isolado
    // para que um erro nele não derrube o restante da resposta, que as outras seções ainda usam.
    const homeGestor = await (async () => {
      try {
        const variacoes = await variacaoDoRanking(supabase, mes, ano, data.rankingGeralPorScore.map((r) => ({ nome: r.nome, posicao: r.posicao, scoreReal: r.score })), hojeSP())
          .catch(() => null);
        return montarHomeGestor({
          mes, ano, geral: data.periodo.geral,
          indicadores: data.indicadores as any, rankingGeral: data.rankingGeralPorScore as any,
          membrosIncluidos: data.membrosIncluidos, variacoes: variacoes ?? new Map(), conselhos: data.conselhos as any,
          recordes: data.recordes, casesDoTime: data.casesDoTime, casesPorCS: data.casesPorCS,
        });
      } catch (err: any) {
        console.error('equipe homeGestor', err);
        return { erro: (err && err.message) || String(err) };
      }
    })();
    return NextResponse.json({ ...data, homeGestor });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
