// GET  /api/gestor/lideranca — compromissos da liderança de todos os CS para a Fila da liderança:
//      abertos, mais os realizados e rejeitados dos últimos 30 dias. Inclui gravações do Granola
//      sem CS identificado. Só gestor.
// POST /api/gestor/lideranca — { acao: 'status', id, status } e { acao: 'vincular_granola', noteId, cs }
//      (cs nulo ignora a gravação). Cada ação chama uma RPC que checa is_gestor() no banco.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { mapItemUmAUmRow, ordenarItensAbertos, itemVencido, diasEntre, resumoAbertos, type ItemUmAUm } from '@/lib/um-a-um';
import { notasPendentes } from '@/lib/granola-lideranca';
import { hojeSP } from '@/lib/gtd-prazos';
import { STATUS_VOZ } from '@/lib/voz';

export const dynamic = 'force-dynamic';

const STATUS = STATUS_VOZ.map((s) => s.chave);

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const hoje = hojeSP();
    const trintaDias = new Date(Date.now() - 30 * 86400000).toISOString();
    const base = () => supabase.from('um_a_um_itens').select('*').eq('tipo', 'passo_lideranca').is('excluido_em', null);
    const [{ data: dAbertos, error: errA }, { data: dFechados, error: errF }] = await Promise.all([
      base().in('status', ['backlog', 'em_andamento']),
      base().in('status', ['realizado', 'rejeitado']).gte('status_alterado_em', trintaDias),
    ]);
    if (errA || errF) throw new Error('Erro ao buscar compromissos: ' + (errA || errF)!.message);

    const todos: ItemUmAUm[] = [...(dAbertos || []), ...(dFechados || [])].map(mapItemUmAUmRow);
    const abertos = ordenarItensAbertos(todos, hoje).map((i) => {
      const venc = itemVencido(i, hoje);
      return { ...i, vencido: venc, diasVencido: venc && i.prazo ? diasEntre(i.prazo, hoje) : null };
    });
    const fechados = todos.filter((i) => i.status === 'realizado' || i.status === 'rejeitado').map((i) => ({ ...i, vencido: false, diasVencido: null }));
    const granolaPendentes = await notasPendentes(supabase);
    const { data: csRows, error: errCs } = await supabase.from('cs_config').select('nome').eq('ativo', true).order('nome');
    if (errCs) throw new Error('Erro ao buscar CS: ' + errCs.message);

    return NextResponse.json({
      hoje,
      itens: [...abertos, ...fechados],
      resumo: { ...resumoAbertos(todos, hoje), prioridadeAlta: abertos.filter((i) => i.prioridade === 'alta').length },
      granolaPendentes,
      csOpcoes: (csRows || []).map((r: any) => r.nome),
      statusOpcoes: STATUS_VOZ,
    });
  } catch (e: any) {
    console.error('gestor lideranca GET', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const body = await req.json();
    const acao = String(body?.acao || '');

    if (acao === 'status') {
      const status = String(body?.status || '');
      if (!body?.id || !STATUS.includes(status as any)) return NextResponse.json({ error: 'Item ou status inválido.' }, { status: 400 });
      const { error } = await supabase.rpc('definir_status_um_a_um_item', { p_id: body.id, p_status: status });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'vincular_granola') {
      if (!body?.noteId) return NextResponse.json({ error: 'Parâmetro obrigatório: noteId' }, { status: 400 });
      const cs = body?.cs ? String(body.cs) : null;
      const { error } = await supabase.rpc('vincular_granola_nota', { p_note_id: String(body.noteId), p_cs_nome: cs });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (e: any) {
    console.error('gestor lideranca POST', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
