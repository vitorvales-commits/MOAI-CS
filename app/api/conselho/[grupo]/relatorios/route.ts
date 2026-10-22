// GET /api/conselho/:grupo/relatorios — encontros com relatório exigido, relatórios enviados (com o conteúdo),
// faltas por membro e os presentes de cada encontro, para a aba Relatórios da página do conselho e para o
// painel de preenchimento. Gestor lê qualquer conselho; CS só os do próprio perfil.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { dadosRelatoriosDoConselho, presentesDoEncontro } from '@/lib/relatorio-conselho-dados';
import { requireMoaiUser, requireOwnConselhoOrGestor, authErrorResponse } from '@/lib/auth';
import { MESES_ORDEM } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { grupo: string } }) {
  noStore();
  const grupo = decodeURIComponent(params.grupo);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    const { data: g, error } = await supabase.from('conselhos_grupos').select('titulo').eq('group_id', grupo).maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) return NextResponse.json({ error: 'Conselho "' + grupo + '" não encontrado' }, { status: 404 });
    await requireOwnConselhoOrGestor(supabase, isGestor, csNome, g.titulo);
    const dados = await dadosRelatoriosDoConselho(supabase, grupo);
    // Presentes só dos encontros ainda editáveis ou sem relatório: os demais já têm o membro gravado.
    const abertos = dados.encontros.filter((e) => !e.relatorioId || e.estado === 'a_preencher' || e.estado === 'vence_hoje');
    const mesDe = (iso: string) => MESES_ORDEM[new Date(new Date(iso).getTime() - 3 * 3600_000).getUTCMonth()];
    const presentes: Record<string, { id: number; nome: string }[]> = {};
    for (const e of abertos) presentes[e.dataEncontro] = await presentesDoEncontro(supabase, grupo, mesDe(e.dataEncontro));
    return NextResponse.json({ conselho: g.titulo, ...dados, presentes, souGestor: isGestor, souResponsavel: !isGestor });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
