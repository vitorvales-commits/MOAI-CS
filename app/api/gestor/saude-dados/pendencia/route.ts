// POST /api/gestor/saude-dados/pendencia — confirma um nome de CS não reconhecido: "Este é o CS" (classe cs, com o
// id sugerido pelo banco) ou "Não é um CS" (classe ignorar). Só gestor: a função do banco também confere e audita.
import { NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const corpo = (await req.json().catch(() => null)) as { texto?: unknown; acao?: unknown; cs_id?: unknown } | null;
    const texto = typeof corpo?.texto === 'string' ? corpo.texto.trim() : '';
    if (!texto || texto.length > 200) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    if (corpo?.acao === 'ignorar') {
      const { error } = await supabase.rpc('canonico_confirmar_apelido', { p_texto: texto, p_cs_id: null, p_classe: 'ignorar' });
      if (error) return NextResponse.json({ error: error.message }, { status: 422 });
      return NextResponse.json({ ok: true });
    }
    if (corpo?.acao === 'confirmar_cs') {
      const csId = Number(corpo.cs_id);
      if (!Number.isInteger(csId) || csId <= 0) return NextResponse.json({ error: 'CS inválido.' }, { status: 400 });
      const { error } = await supabase.rpc('canonico_confirmar_apelido', { p_texto: texto, p_cs_id: csId, p_classe: 'cs' });
      if (error) return NextResponse.json({ error: error.message }, { status: 422 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
