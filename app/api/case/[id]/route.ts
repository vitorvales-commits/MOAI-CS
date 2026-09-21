// Espelha getCaseDetalhePublico(itemId) do Code.gs original. Na versão Apps Script isso ia
// buscar sob demanda no Monday pra não pesar a listagem principal; aqui as colunas de detalhe
// (segmento, desafio, sugestao, decisao, resultado, impacto, onde_aconteceu) já vêm espelhadas
// no Postgres pela Edge Function sync-monday, então é uma leitura direta por id.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  try {
    const { supabase } = await requireMoaiUser();
    const { data, error } = await supabase
      .from('cases_items')
      .select('id, nome, segmento, desafio, sugestao, decisao, resultado, impacto, onde_aconteceu')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json(null);
    return NextResponse.json({
      nome: data.nome,
      segmento: data.segmento || '',
      desafio: data.desafio || '',
      sugestao: data.sugestao || '',
      decisao: data.decisao || '',
      resultado: data.resultado || '',
      impacto: data.impacto,
      ondeAconteceu: data.onde_aconteceu || '',
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
