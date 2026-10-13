// GET /api/cs/:nome/report?semana=AAAA-MM-DD — reports que o CS enviou no board do Monday: a semana
// pedida, histórico semanal e Health da Base atual. Somente leitura: a plataforma não grava report.
// Gestor lê qualquer CS; CS comum só o próprio.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { listarAdvertenciasCS } from '@/lib/reports';
import { calcularHealthBase, percentualCriticosDecimos, pontuacaoAtiva, segundaFeiraBRT, statusReport } from '@/lib/indicadores-base';

export const dynamic = 'force-dynamic';

const SEMANA_RE = /^\d{4}-\d{2}-\d{2}$/;

function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  const semanaAtual = segundaFeiraBRT();
  const pedida = new URL(req.url).searchParams.get('semana');
  const semana = pedida && SEMANA_RE.test(pedida) ? segundaFeiraBRT(new Date(pedida + 'T15:00:00Z')) : semanaAtual;
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar o próprio report.' }, { status: 403 });
    }
    // Colunas de leitura só: nenhuma coluna de engajamento baixo, médio ou alto é lida aqui.
    const [histRes, repRes, advertencias] = await Promise.all([
      supabase.rpc('reports_historico_cs', { p_cs: nome }),
      supabase.from('reports_individuais')
        .select('semana_inicio, origem, como_foi_semana, nota_semana, risco_se_ignorar, por_que, criticos_total, base_total, enviado_em')
        .eq('cs_nome', nome).eq('origem', 'monday').eq('semana_inicio', semana)
        .order('enviado_em', { ascending: false }).limit(1),
      listarAdvertenciasCS(supabase, nome),
    ]);
    const erro = histRes.error || repRes.error;
    if (erro) throw new Error(erro.message);

    // Pontos ativos em cada semana: advertências aplicadas até o fim da semana e ainda válidas
    // nesse momento (mesma regra de validade de pontuacaoAtiva), para o Health da linha do tempo.
    const registrosAdv = advertencias.registros.map((r) => ({ aplicado_em: r.aplicadoEm, validade_meses: r.validadeMeses, pontos: r.pontos }));
    const pontosNa = (fimSemana: string) => {
      const ref = new Date(fimSemana + 'T23:59:59-03:00');
      return pontuacaoAtiva(registrosAdv.filter((r) => new Date(r.aplicado_em) <= ref), ref);
    };
    const historico = ((histRes.data || []) as any[]).map((r) => {
      const h = calcularHealthBase(r.criticos_total, r.base_total, pontosNa(somarDias(r.semana_inicio, 6)));
      return { ...r, percentualDecimos: percentualCriticosDecimos(r.criticos_total, r.base_total), healthDecimos: h.healthBaseDecimos };
    });
    const ultimo = historico[0] || null;
    const hAtual = calcularHealthBase(ultimo?.criticos_total ?? null, ultimo?.base_total ?? null, advertencias.pontuacaoAtiva);
    const health = {
      ...hAtual,
      statusReport: ultimo ? statusReport(ultimo.data_report || somarDias(ultimo.semana_inicio, 6)) : 'sem_report',
      semanaReport: ultimo?.semana_inicio ?? null,
    };
    const report = (repRes.data || [])[0] ?? null;
    return NextResponse.json({
      cs: nome, semana, semanaAtual,
      report, historico, health, pontosAtivos: advertencias.pontuacaoAtiva,
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
