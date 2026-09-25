// GET lista todo o roster de CS (ativos e inativos, pra tela de toggle) / POST alterna
// ativo/inativo de um CS pelo nome. Restrito a is_gestor() — checado aqui e de novo dentro de
// set_cs_ativo (SECURITY DEFINER, ver migração add_gestor_perfis_rpcs), já que inativar um CS o
// tira do roster corrente de toda a equipe (getCSListCompleto), embora ele continue entrando nos
// agregados históricos via getCSListParaAgregados (nunca filtra por ativo, mesmo tratamento já
// dado aos ex-membros sem conta).
import { NextRequest, NextResponse } from 'next/server';
import { getCSRosterAdmin, setCSAtivo, getDadosBrutos, getCSListParaAgregados, detectarCSNaoVinculados } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const roster = await getCSRosterAdmin(supabase);
    // Parte A (25-26/09/2026): detecta CS não vinculados a cada carregamento desta tela — ver
    // detectarCSNaoVinculados em lib/reports.ts.
    const [dados, csConhecidos] = await Promise.all([getDadosBrutos(supabase), getCSListParaAgregados(supabase)]);
    const naoVinculados = detectarCSNaoVinculados(dados, csConhecidos);
    return NextResponse.json({ roster, naoVinculados });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const body = await req.json();
    const nome = String(body?.nome || '').trim();
    const ativo = !!body?.ativo;
    if (!nome) return NextResponse.json({ error: 'Informe o nome do CS.' }, { status: 400 });
    await setCSAtivo(supabase, nome, ativo);
    const roster = await getCSRosterAdmin(supabase);
    return NextResponse.json({ roster });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
