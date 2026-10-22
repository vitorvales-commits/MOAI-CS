// GET /api/conselhos-grade?mes=Outubro&ano=2026
// Grade de cartões dos conselhos (aba Conselhos do gestor e Meus conselhos do CS). O recorte por CS é
// decidido aqui, no servidor: gestor recebe a rede toda e o impacto; CS comum recebe só os conselhos
// cujo título de grupo traz o apelido dele, nunca os de outro CS.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getDadosBrutos, montarAbaConselhos } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const ano = Number(searchParams.get('ano'));
  if (!mes || !ano) return NextResponse.json({ error: 'Parâmetros obrigatórios: mes, ano' }, { status: 400 });
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    // meus=1: página Meus conselhos, que mostra só a carteira de quem está logado, mesmo sendo gestor.
    const soMeus = !isGestor || searchParams.get('meus') === '1';
    let apelido: string | null | undefined; // undefined = sem filtro (gestor na aba Conselhos)
    if (soMeus) {
      const { data, error } = csNome
        ? await supabase.from('cs_config').select('apelido_conselho').eq('nome', csNome).maybeSingle()
        : { data: null, error: null };
      if (error) throw new Error('Erro ao buscar cs_config: ' + error.message);
      apelido = data?.apelido_conselho ?? null;
    }
    const dados = await getDadosBrutos(supabase);
    return NextResponse.json(montarAbaConselhos(dados, mes, ano, apelido, !soMeus));
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
