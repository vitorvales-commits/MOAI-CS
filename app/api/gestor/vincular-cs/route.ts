// POST /api/gestor/vincular-cs — Parte A (pedido do Vitor, 25-26/09/2026): cria o vínculo de um CS
// detectado ("naoVinculados", ver /api/gestor/cs-roster) na tela de Controle de perfis. Restrito a
// gestor: passa por vincularCS (lib/reports.ts), que chama a função SECURITY DEFINER vincular_cs —
// cs_config não tem policy de INSERT direto, só SELECT (mesmo padrão de set_destaque/set_cs_ativo).
import { NextRequest, NextResponse } from 'next/server';
import { vincularCS, getCSRosterAdmin, getDadosBrutos, getCSListParaAgregados, detectarCSNaoVinculados } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const body = await req.json();
    const nome = String(body?.nome || '').trim();
    const nomeCompleto = String(body?.nomeCompleto || '').trim();
    const apelidoConselho = body?.apelidoConselho ? String(body.apelidoConselho).trim() : null;
    const mondayUserId = body?.mondayUserId ? Number(body.mondayUserId) : null;
    if (!nome || !nomeCompleto) {
      return NextResponse.json({ error: 'Informe nome e nome completo.' }, { status: 400 });
    }
    await vincularCS(supabase, { nome, nomeCompleto, apelidoConselho, mondayUserId });

    const roster = await getCSRosterAdmin(supabase);
    const [dados, csConhecidos] = await Promise.all([getDadosBrutos(supabase), getCSListParaAgregados(supabase)]);
    const naoVinculados = detectarCSNaoVinculados(dados, csConhecidos);
    return NextResponse.json({ roster, naoVinculados });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
