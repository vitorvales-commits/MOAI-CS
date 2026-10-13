// Espelha getVezesDestaquePublico(nome) [GET] e setVezesDestaquePublico(nome, vezes) [POST] do
// Code.gs original. Leitura/escrita leve e independente do relatório pesado, direto no
// cs_config — mesmo padrão do original (não invalida nenhum cache de relatório).
// A escrita passa pela função set_destaque (RPC), única forma permitida de alterar cs_config —
// ver comentário em lib/reports.ts.
import { NextRequest, NextResponse } from 'next/server';
import { getVezesDestaque, setVezesDestaque } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor, csNome } = await requireMoaiUser();
    // Parte A (pedido do Vitor 25/09/2026): mesma regra de /api/cs/[nome] — CS comum só consulta
    // o próprio emblema, gestor consulta qualquer um.
    if (!isGestor && nome !== csNome) {
      return NextResponse.json({ error: 'Você só pode consultar o próprio perfil.' }, { status: 403 });
    }
    const vezes = await getVezesDestaque(supabase, nome);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    // Correção 13/10/2026: antes o próprio CS podia gravar quantas vezes foi CS Destaque, porque a
    // regra copiava a da leitura. Reconhecimento é atribuído pela liderança, então a escrita é só de gestor.
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode alterar o CS Destaque.' }, { status: 403 });
    }
    const body = await req.json();
    const vezes = await setVezesDestaque(supabase, nome, body?.vezes);
    return NextResponse.json({ vezes });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
