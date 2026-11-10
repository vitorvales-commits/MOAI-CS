// GET /api/gestor/saude-dados — saúde dos dados para a faixa da visão de gestor: frescura das rotinas (saude_dados),
// nomes de CS não reconhecidos (canonico_pendencias) e exclusões de dado nativo no dash (lixeira_nativa_recente).
// Só gestor. Cada leitura é isolada: se uma falhar, as outras continuam e a falha vira um aviso no painel.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import {
  classificarSaude, classificarExcecoesDados, combinarEstadoFaixa, minutosTexto, resumoExcecoes,
  type LinhaSaude, type PendenciaVinculo, type ExclusaoDado,
} from '@/lib/saude-dados';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const agora = new Date();
    const avisos: string[] = [];

    const rotinas = await (async () => {
      const { data, error } = await supabase.rpc('saude_dados');
      if (error) throw new Error(error.message);
      return classificarSaude((data || []) as LinhaSaude[], agora);
    })();

    const pendencias = await (async () => {
      try {
        const { data, error } = await supabase.rpc('canonico_pendencias');
        if (error) throw new Error(error.message);
        return (data || []) as PendenciaVinculo[];
      } catch (e: any) {
        avisos.push('Nomes de CS não reconhecidos indisponíveis: ' + (e?.message || e));
        return [] as PendenciaVinculo[];
      }
    })();

    const exclusoes = await (async () => {
      try {
        const { data, error } = await supabase.rpc('lixeira_nativa_recente', { p_dias: 30 });
        if (error) throw new Error(error.message);
        return (data || []) as ExclusaoDado[];
      } catch (e: any) {
        avisos.push('Exclusões de dados indisponíveis: ' + (e?.message || e));
        return [] as ExclusaoDado[];
      }
    })();

    const excecoes = classificarExcecoesDados(pendencias, exclusoes, agora);
    const faixa = combinarEstadoFaixa(rotinas, resumoExcecoes(excecoes));
    return NextResponse.json({
      estado: faixa.estado,
      texto: faixa.texto,
      itens: rotinas.itens.map((i) => ({ ...i, paradoTexto: i.minutosParado === null ? null : minutosTexto(i.minutosParado) })),
      excecoes,
      avisos,
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
