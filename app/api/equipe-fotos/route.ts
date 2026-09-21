// Espelha getEquipeComFotos() do Code.gs original — usado pro grid de cards da home.
// fotoUrl vem de FOTOS_CS (lib/constants.ts), arquivos estáticos em public/fotos-cs/. Quando um
// CS ainda não tem foto cadastrada ali, fica null e o front-end cai no fallback de iniciais
// coloridas normalmente.
import { NextResponse } from 'next/server';
import { getCSListCompleto } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase } = await requireMoaiUser();
    const lista = await getCSListCompleto(supabase);
    const data = lista.map((c) => ({
      nome: c.nome,
      nomeCompleto: c.nomeCompleto,
      userId: c.userId,
      apelidoConselho: c.apelidoConselho,
      fotoUrl: c.fotoUrl,
    }));
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
