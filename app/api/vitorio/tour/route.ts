// GET  /api/vitorio/tour?perfil=&path=&aba=  tour da página para o perfil, o que a pessoa já viu e o convite a oferecer.
// POST /api/vitorio/tour { tourId, versao }  registra que a pessoa viu (ou dispensou) o tour naquela versão.
// Os roteiros ficam em lib/vitorio/roteiros.ts; o estado de visto em vitorio_tour_visto, por pessoa.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { perfilPermitido } from '@/lib/vitorio/servidor';
import { chavePagina, decidirConvite, roteiroDaPagina } from '@/lib/vitorio/tour';
import { ROTEIROS } from '@/lib/vitorio/roteiros';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, email, isGestor, csNome } = await requireMoaiUser();
    const q = req.nextUrl.searchParams;
    const perfil = perfilPermitido(q.get('perfil'), isGestor, csNome);
    const roteiro = roteiroDaPagina(perfil, chavePagina(perfil, q.get('path') || '', q.get('aba')));
    if (!roteiro) return NextResponse.json({ roteiro: null, convite: { tipo: 'nenhum', passos: [] }, versaoVista: null });
    // Tabela ausente (migração não aplicada) vale como "nunca viu": o convite aparece, o registro falha em silêncio.
    const { data } = await supabase.from('vitorio_tour_visto').select('versao').eq('email', email.toLowerCase()).eq('tour_id', roteiro.id).maybeSingle();
    const versaoVista = typeof data?.versao === 'number' ? data.versao : null;
    return NextResponse.json({ roteiro, convite: decidirConvite(roteiro, versaoVista), versaoVista });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/tour GET]', e);
    return NextResponse.json({ error: 'Não foi possível carregar o tour.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMoaiUser();
    let b: any;
    try { b = await req.json(); } catch { return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 }); }
    const r = ROTEIROS.find((x) => x.id === b?.tourId);
    if (!r) return NextResponse.json({ error: 'Tour inexistente.' }, { status: 400 });
    const { error } = await supabase.rpc('vitorio_marcar_tour', { p_tour_id: r.id, p_versao: Math.min(Number(b?.versao) || r.versao, r.versao) });
    if (error) console.error('[api/vitorio/tour POST]', error.message);
    return NextResponse.json({ ok: !error });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('[api/vitorio/tour POST]', e);
    return NextResponse.json({ ok: false });
  }
}
