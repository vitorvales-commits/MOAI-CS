// GET /api/gestor/recordes[?cs=Nome]: painel de recordes calculados (30/09/2026, ajustes da onda 1).
// Um painel só, vindo do banco (recordes_painel, que usa indicador_recordes): para cada indicador, o valor
// do mês corrente, a meta do mês, o recorde mensal (e semanal quando o indicador tem data por semana),
// a diferença para o recorde e o selo "em andamento". Todo recorde é calculado sobre o histórico
// inteiro do Monday; esta rota não lê nem grava nenhum recorde digitado. Com ?cs=Nome, o mesmo
// painel para um CS ativo (ex CS nunca aparecem por pessoa). Restrito a gestor.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { buscarPainelRecordes } from '@/lib/churn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });

    const csPedido = new URL(req.url).searchParams.get('cs')?.trim() || null;
    if (csPedido && csPedido.length > 80) return NextResponse.json({ error: 'Parâmetro inválido.' }, { status: 400 });

    const { data: ativos, error: erroAtivos } = await supabase.from('cs_config').select('nome').eq('ativo', true).order('nome');
    if (erroAtivos) throw new Error('cs ativos: ' + erroAtivos.message);
    const nomes = ((ativos || []) as { nome: string }[]).map((c) => c.nome);
    let cs: string | null = null;
    if (csPedido) {
      cs = nomes.find((n) => n.toLowerCase() === csPedido.toLowerCase()) || null;
      if (!cs) return NextResponse.json({ error: 'Escolha um CS ativo.' }, { status: 400 });
    }

    const indicadores = await buscarPainelRecordes(supabase, cs);
    return NextResponse.json({ cs, csAtivos: nomes, indicadores });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('GET /api/gestor/recordes falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar os recordes agora.' }, { status: 500 });
  }
}
