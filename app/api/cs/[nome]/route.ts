// Espelha getReportPublico(nome, mes, ano) do Code.gs original.
// GET /api/cs/:nome?mes=Setembro&ano=2026
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateCSReport, periodoDatas } from '@/lib/reports';
import { buscarPulsoIndividual, modoFeedbackDoPeriodo } from '@/lib/pulso';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  const nome = decodeURIComponent(params.nome);
  if (!mes || !ano) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  }
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    // Parte A (pedido do Vitor 25/09/2026): gestor continua vendo qualquer perfil, sem restrição
    // nenhuma; um CS comum só pode consultar o PRÓPRIO relatório (o vínculo em cs_usuarios).
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar o próprio relatório.' }, { status: 403 });
    }
    const data = await generateCSReport(supabase, nome, mes, ano);
    // Selo de recorde individual (Parte G, 29/09/2026) — só faz sentido pra um mês concreto,
    // nunca "Visão Geral". Função dedicada (metas_cs_mensal_completo) pra não multiplicar
    // chamadas por CS quando generateEquipeReport gera este mesmo relatório em lote pro time.
    let recordesIndividuais: any[] | null = null;
    const { geral, mesInicio } = periodoDatas(mes, ano);
    if (!geral) {
      const { data: linhas, error: errRecordes } = await supabase.rpc('metas_cs_mensal_completo', { p_cs: nome, p_mes: mesInicio });
      if (errRecordes) throw new Error(errRecordes.message);
      recordesIndividuais = linhas;
    }
    // Pulso de CS (05/10/2026): de outubro de 2026 em diante a aba Feedbacks lê o pulso, não mais a
    // avaliação entre pares. Fica fora de generateCSReport de propósito, que também roda em lote
    // para o time inteiro. A função do banco devolve só o que foi dito sobre este CS.
    // Uma falha aqui derruba só a aba Feedbacks (mensagem real nela), nunca o perfil inteiro.
    let pulso: Awaited<ReturnType<typeof buscarPulsoIndividual>> & { erro?: string };
    try {
      pulso = await buscarPulsoIndividual(supabase, nome, mes, ano);
    } catch (errPulso: any) {
      pulso = { modo: modoFeedbackDoPeriodo(mes, ano), respostas: 0, avaliadores: 0, destaques: 0, falas: [], erro: errPulso?.message || String(errPulso) };
    }
    return NextResponse.json({ ...data, recordesIndividuais, pulso });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
