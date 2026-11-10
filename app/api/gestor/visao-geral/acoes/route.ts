// GET /api/gestor/visao-geral/acoes — Urgências (report semanal e GTD) e Insights da Visão geral do
// gestor, numa única chamada agregada. Só gestor: a checagem vem ANTES de tocar em qualquer dado
// (403 para CS comum e para quem não tem vínculo). Cada seção é isolada e devolve a mensagem real do
// erro só dela.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { acoesVisaoGeralGestor } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const base = await acoesVisaoGeralGestor(supabase);
    // Fila de ação, fonte ritmo_semanal (PR 3): itens abertos. Isolado, um erro aqui não derruba as outras seções.
    const { data, error } = await supabase.from('fila_acao_itens')
      .select('id, cs_nome, semana_inicio, semana_fim, indicadores, deficit_total')
      .eq('fonte', 'ritmo_semanal').eq('status', 'aberto')
      .order('deficit_total', { ascending: false }).order('cs_nome');
    const { data: cfg } = await supabase.from('ritmo_semanal_config').select('valor').eq('chave', 'limiar').maybeSingle();
    const ritmoSemanal = error ? { dado: null, erro: 'Não foi possível ler o ritmo semanal agora.', limiar: null } : { dado: data || [], erro: null, limiar: cfg ? Number(cfg.valor) : null };
    if (error) console.error('acoes ritmo_semanal', error);
    return NextResponse.json({ ...base, ritmoSemanal });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
