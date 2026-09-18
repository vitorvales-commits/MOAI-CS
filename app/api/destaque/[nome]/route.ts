// Espelha getVezesDestaquePublico(nome) [GET] e setVezesDestaquePublico(nome, vezes) [POST] do
// Code.gs original. Leitura/escrita leve e independente do relatório pesado, direto no
// cs_config — mesmo padrão do original (não invalida nenhum cache de relatório).
import { NextRequest, NextResponse } from 'next/server';
import { getVezesDestaque, setVezesDestaque } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const vezes = await getVezesDestaque(nome);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const body = await req.json();
    const vezes = await setVezesDestaque(nome, body?.vezes);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
