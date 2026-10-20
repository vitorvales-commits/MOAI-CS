// GET /api/gestor/visao-geral?mes=X&ano=Y — visão não mascarada da área (valor calculado puro,
// divergência com o manual, score real, radar), restrita a quem tem is_gestor()=true no banco.
// requireMoaiUser() já garante domínio @moaiclubedelideres.com; aqui checamos isGestor ANTES de
// tocar em qualquer dado — nunca monta a resposta pra depois filtrar quem pode ver.
import { NextRequest, NextResponse } from 'next/server';
import { generateVisaoGestor, generateVisaoGeralRede } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { variacaoDoRanking, serieScoreArea } from '@/lib/evolucao-dados';
import { EVOLUCAO_JANELA_PADRAO } from '@/lib/constants';
import { hojeSP } from '@/lib/gtd-prazos';
import { percentualCriticosDecimos } from '@/lib/indicadores-base';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  // Ponto 4 (correção 25/09/2026): toggle "mostrar ex-membros" na tela, desligado por padrão —
  // ver comentário em generateVisaoGestor.
  const incluirExMembros = searchParams.get('incluirExMembros') === 'true';
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    // visaoGeralRede (Parte B, 25-26/09/2026): mesmo seletor de período, bloco separado do
    // ranking/radar por CS — olha a rede inteira de conselhos ativos, não um CS específico. Nunca
    // usa ex-membros (não faz sentido pra membros da rede), então não recebe o toggle.
    const [data, visaoGeralRede] = await Promise.all([
      generateVisaoGestor(supabase, mes, ano, incluirExMembros),
      generateVisaoGeralRede(supabase, mes, ano),
    ]);
    // Variação do ranking contra o mês anterior (08/10/2026). Se o cálculo falhar, variacao fica nula e o resto segue.
    const variacoes = await variacaoDoRanking(supabase, mes, ano, data.ranking, hojeSP()).catch((e) => {
      console.error('visao-geral variacao', e);
      return null;
    });
    const ranking = data.ranking.map((r) => ({ ...r, variacao: variacoes ? variacoes.get(r.nome) ?? null : null }));
    // Série do score da área (redesenho v3): média e mediana por mês, para o KPI e a mediana do Mapa do time.
    // Campo aditivo; se falhar, vira nulo com a mensagem real e o resto da resposta segue.
    const serieArea = await serieScoreArea(supabase, mes, ano, hojeSP(), EVOLUCAO_JANELA_PADRAO)
      .then((pontos) => ({ pontos, erro: null as string | null }))
      .catch((e) => { console.error('visao-geral serie', e); return { pontos: null, erro: (e && e.message) || String(e) }; });

    // Membros críticos da área: soma dos críticos e da base de cada CS (health_base_cs) e o percentual pela
    // mesma função do Health da Base (percentualCriticosDecimos). Campo aditivo, isolado como a série.
    const criticosArea = await Promise.resolve(supabase.rpc('health_base_cs', { p_cs: null })).then(({ data: linhas, error }) => {
      if (error) throw new Error(error.message);
      const validas = (linhas || []).filter((r: any) => typeof r.criticos === 'number' && typeof r.carteira === 'number' && r.carteira > 0);
      const criticos = validas.reduce((s: number, r: any) => s + r.criticos, 0);
      const base = validas.reduce((s: number, r: any) => s + r.carteira, 0);
      return { criticos, base, percentualDecimos: percentualCriticosDecimos(criticos, base), erro: null as string | null };
    }).catch((e: any) => { console.error('visao-geral criticos', e); return { criticos: null, base: null, percentualDecimos: null, erro: (e && e.message) || String(e) }; });
    return NextResponse.json({ ...data, ranking, visaoGeralRede, serieArea, criticosArea });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
