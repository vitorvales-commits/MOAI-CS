// GET /api/gestor/carteira-alertas — divergências entre o título dos grupos (fonte da carteira) e o cadastro
// do conselheiro, e grupos cuja CS no título está inativa ou não cadastrada. Só gestor; não grava nada.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { getDadosBrutos } from '@/lib/reports';
import { divergenciasDeCarteira } from '@/lib/carteira-divergencias';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const [dados, { data: cs, error }] = await Promise.all([
      getDadosBrutos(supabase),
      supabase.from('cs_config').select('nome, nome_completo, apelido_conselho, ativo'),
    ]);
    if (error) throw new Error(error.message);
    return NextResponse.json(divergenciasDeCarteira(dados.conselhosGrupos as any[], dados.conselheiros as any[], (cs ?? []) as any[]));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
