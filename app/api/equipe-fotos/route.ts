// Espelha getEquipeComFotos() do Code.gs original — usado pro grid de cards da home.
// fotoUrl fica null por enquanto: a migração das fotos (Monday users.photo_url) pro Postgres
// ainda é uma pendência (ver claude/migracao_vercel_supabase.md). O front-end já trata fotoUrl
// null caindo pro fallback de iniciais coloridas, então isso não quebra nada.
import { NextResponse } from 'next/server';
import { getCSListCompleto } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lista = await getCSListCompleto();
    const data = lista.map((c) => ({
      nome: c.nome,
      nomeCompleto: c.nomeCompleto,
      userId: c.userId,
      apelidoConselho: c.apelidoConselho,
      fotoUrl: null as string | null,
    }));
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
