// POST /api/monday/editar { itemId, valores, lidoEm }: enfileira a edição de um cartão de visita no Monday.
// Quem confere time, chave, colunas, papel e carteira é a função enfileirar_edicao_monday, no banco. Esta rota só
// valida o corpo e devolve o id do comando, que o cliente acompanha em /api/monday/comando/[id].
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { BOARD_VISITAS, validarEdicao } from '@/lib/sincronia';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const corpo = await req.json().catch(() => null);
    const v = validarEdicao(corpo);
    if (v.ok === false) return NextResponse.json({ error: v.erro }, { status: 400 });

    const { data, error } = await supabase.rpc('enfileirar_edicao_monday', {
      p_board_id: BOARD_VISITAS,
      p_item_id: v.edicao.itemId,
      p_valores: v.edicao.valores,
      p_lido_em: v.edicao.lidoEm,
      p_chave: crypto.randomUUID(),
    });
    if (error) {
      const msg = error.message || '';
      if (/Fila de escrita desligada/.test(msg)) {
        return NextResponse.json(
          { error: 'A escrita no Monday está desligada no momento. A edição não foi enviada; avise o gestor.', codigo: 'fila_desligada' },
          { status: 503 },
        );
      }
      if (/fora da sua carteira|restrita a gestor|Item inexistente/.test(msg)) {
        return NextResponse.json({ error: msg.replace(/^.*?ERROR:\s*/, '') }, { status: 403 });
      }
      return NextResponse.json({ error: 'Não foi possível enviar a edição.' }, { status: 400 });
    }
    return NextResponse.json({ comandoId: data });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Erro ao enviar a edição.' }, { status: 500 });
  }
}
