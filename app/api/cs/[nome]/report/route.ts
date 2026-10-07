// GET  /api/cs/:nome/report?semana=AAAA-MM-DD — report individual da semana (com os críticos
//      nominais), report nativo anterior, histórico semanal, críticos atuais e Health da Base atual.
//      Uma chamada só para a aba Report (a outra é /report/membros).
// POST /api/cs/:nome/report — grava o report da semana (salvar_report_individual no banco).
// Report individual nativo (07/10/2026): gestor lê e edita qualquer CS; CS comum só o próprio. As
// funções do banco reconferem a mesma regra (report_resolver_cs) e validam tudo de novo.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { listarAdvertenciasCS } from '@/lib/reports';
import { calcularHealthBase, percentualCriticosDecimos, pontuacaoAtiva, segundaFeiraBRT, statusReport } from '@/lib/indicadores-base';
import { REPORT_EDICAO_SEMANAS } from '@/lib/constants';

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
    const [semanaRes, histRes, criticosRes, advertencias] = await Promise.all([
      supabase.rpc('report_individual_semana', { p_cs: nome, p_semana: semana }),
      supabase.rpc('reports_historico_cs', { p_cs: nome }),
      supabase.rpc('criticos_atuais_cs', { p_cs: nome }),
      listarAdvertenciasCS(supabase, nome),
    ]);
    const erro = semanaRes.error || histRes.error || criticosRes.error;
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
    const limiteEdicao = somarDias(semanaAtual, -7 * REPORT_EDICAO_SEMANAS);
    const podeEditar = semana <= semanaAtual && (isGestor || semana >= limiteEdicao);
    return NextResponse.json({
      cs: nome, semana, semanaAtual, podeEditar,
      report: semanaRes.data?.report ?? null, anterior: semanaRes.data?.anterior ?? null,
      historico, criticosAtuais: criticosRes.data || [], health, pontosAtivos: advertencias.pontuacaoAtiva,
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode enviar o próprio report.' }, { status: 403 });
    }
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
    const semana = typeof body?.semana === 'string' && SEMANA_RE.test(body.semana) ? body.semana : null;
    if (!semana) return NextResponse.json({ error: 'Semana inválida.' }, { status: 400 });
    const dados = body?.dados && typeof body.dados === 'object' && !Array.isArray(body.dados) ? body.dados : {};
    // Só ids inteiros vão para o banco; quem decide se pertencem à base é salvar_report_individual.
    const criticos = Array.isArray(body?.criticos) ? body.criticos.map((x: any) => Number(x)).filter((x: number) => Number.isInteger(x) && x > 0) : [];
    // Campos de texto viram string; o banco valida domínio e faixa de cada um.
    const dadosLimpos: Record<string, string> = {};
    Object.keys(dados).forEach((k) => { const v = dados[k]; if (v !== null && v !== undefined) dadosLimpos[k] = String(v).slice(0, 4000); });

    const { data: id, error } = await supabase.rpc('salvar_report_individual', { p_cs: nome, p_semana: semana, p_dados: dadosLimpos, p_criticos: criticos });
    if (error) {
      // 22023 = validação (mensagem explícita do banco, segura para mostrar). 42501 = permissão.
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.code === '42501') return NextResponse.json({ error: 'Sem permissão para este report.' }, { status: 403 });
      throw new Error(error.message);
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
