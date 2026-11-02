// POST /api/monday/comando/[id]/resolver { acao, chave }: resolve um conflito de uma edição enfileirada.
// 'usar_monday' mantém o valor do Monday; 'reaplicar' enfileira a alteração de novo sobre o valor atual.
// Quem confere autoria, estado, fila ativa, colunas, papel e carteira é o banco (sincronia_resolver_conflito).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { validarResolucao } from '@/lib/sincronia';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Comando inválido.' }, { status: 400 });

    const corpo = await req.json().catch(() => null);
    const v = validarResolucao(corpo);
    if (v.ok === false) return NextResponse.json({ error: v.erro }, { status: 400 });

    const { data, error } = await supabase.rpc('sincronia_resolver_conflito', {
      p_id: id,
      p_acao: v.acao,
      p_chave: v.chave,
    });
    if (error) {
      const msg = error.message || '';
      if (/Só é possível resolver/.test(msg)) {
        return NextResponse.json({ error: 'Esta edição não está mais em conflito. Atualize a tela.', codigo: 'nao_esta_em_conflito' }, { status: 409 });
      }
      if (/Fila de escrita desligada/.test(msg)) {
        return NextResponse.json(
          { error: 'A escrita no Monday está desligada no momento. A edição não foi reenviada; avise o gestor.', codigo: 'fila_desligada' },
          { status: 503 },
        );
      }
      if (/Comando não encontrado/.test(msg)) return NextResponse.json({ error: 'Comando não encontrado.' }, { status: 404 });
      if (/Só o autor|fora da sua carteira|restrita a gestor|Item inexistente/.test(msg)) {
        return NextResponse.json({ error: msg.replace(/^.*?ERROR:\s*/, '') }, { status: 403 });
      }
      return NextResponse.json({ error: 'Não foi possível resolver o conflito.' }, { status: 400 });
    }
    return NextResponse.json({ comandoId: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Erro ao resolver o conflito.' }, { status: 500 });
  }
}
