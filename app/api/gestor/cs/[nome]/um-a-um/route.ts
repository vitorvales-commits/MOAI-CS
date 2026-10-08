// GET  /api/gestor/cs/:nome/um-a-um — tudo da 1:1 daquele CS para o gestor: registros com notas
//      privadas, todos os itens (inclusive privados e excluídos, separados) e gravações do Granola.
// POST /api/gestor/cs/:nome/um-a-um — ações de escrita, cada uma chamando uma RPC SECURITY DEFINER
//      que checa is_gestor() de novo dentro do banco.
// Restrita a gestor: a checagem vem ANTES de tocar em qualquer dado.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { carregarUmAUmGestor, resumoAbertos, ordenarItensAbertos, itemVencido, diasEntre, type ItemUmAUm } from '@/lib/um-a-um';
import { STATUS_VOZ } from '@/lib/voz';
import { notasDoCS } from '@/lib/granola-lideranca';
import { hojeSP } from '@/lib/gtd-prazos';

export const dynamic = 'force-dynamic';

const STATUS = ['backlog', 'em_andamento', 'realizado', 'rejeitado'];
const TIPOS = ['passo_lideranca', 'passo_liderado', 'ponto_atencao'];
const PRIORIDADES = ['alta', 'media', 'baixa'];

export async function GET(_req: NextRequest, { params }: { params: { nome: string } }) {
  noStore();
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const hoje = hojeSP();
    const { registros, itens } = await carregarUmAUmGestor(supabase, nome);
    const datas = new Map(registros.map((r) => [r.id, r.data]));
    const vivos: ItemUmAUm[] = itens.filter((i) => !i.excluidoEm).map((i) => ({ ...i, dataOrigem: i.registroId ? datas.get(i.registroId) ?? null : null }));
    const excluidos = itens.filter((i) => i.excluidoEm).map((i) => ({ ...i, dataOrigem: i.registroId ? datas.get(i.registroId) ?? null : null }));
    // Itens abertos já vêm na ordem da tela (vencidos, prioridade, prazo).
    const ordenados = ordenarItensAbertos(vivos, hoje).map((i) => {
      const venc = itemVencido(i, hoje);
      return { ...i, vencido: venc, diasVencido: venc && i.prazo ? diasEntre(i.prazo, hoje) : null };
    });
    const granola = await notasDoCS(supabase, nome);
    return NextResponse.json({
      hoje,
      registros,
      itens: ordenados,
      excluidos,
      resumo: resumoAbertos(vivos, hoje),
      granola,
      statusOpcoes: STATUS_VOZ,
    });
  } catch (e: any) {
    console.error('gestor um-a-um GET', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { nome: string } }) {
  const nome = decodeURIComponent(params.nome);
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Só gestor pode registrar a 1:1.' }, { status: 403 });
    }
    const body = await req.json();
    const acao = String(body?.acao || '');

    if (acao === 'salvar_registro') {
      const data = String(body?.data || '').trim();
      if (!data) return NextResponse.json({ error: 'Parâmetro obrigatório: data' }, { status: 400 });
      const { data: id, error } = await supabase.rpc('salvar_um_a_um', {
        p_id: body?.id || null,
        p_cs_nome: nome,
        p_data: data,
        p_resumo: body?.resumo ? String(body.resumo) : null,
        p_notas_privadas: body?.notasPrivadas ? String(body.notasPrivadas) : null,
        p_granola_note_id: body?.granolaNoteId ? String(body.granolaNoteId) : null,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ id });
    }

    if (acao === 'excluir_registro') {
      if (!body?.id) return NextResponse.json({ error: 'Parâmetro obrigatório: id' }, { status: 400 });
      const { error } = await supabase.rpc('excluir_um_a_um', { p_id: body.id });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'salvar_item') {
      const tipo = String(body?.tipo || '');
      const prioridade = String(body?.prioridade || 'media');
      if (!body?.id && !TIPOS.includes(tipo)) return NextResponse.json({ error: 'Tipo de item inválido.' }, { status: 400 });
      if (!PRIORIDADES.includes(prioridade)) return NextResponse.json({ error: 'Prioridade inválida.' }, { status: 400 });
      const { data: id, error } = await supabase.rpc('salvar_um_a_um_item', {
        p_id: body?.id || null,
        p_cs_nome: nome,
        p_registro_id: body?.registroId || null,
        p_tipo: tipo,
        p_texto: String(body?.texto || ''),
        p_privado: !!body?.privado,
        p_prioridade: prioridade,
        p_prazo: body?.prazo || null,
        p_observacao: body?.observacao ? String(body.observacao) : null,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ id });
    }

    if (acao === 'status_item') {
      const status = String(body?.status || '');
      if (!body?.id || !STATUS.includes(status)) return NextResponse.json({ error: 'Item ou status inválido.' }, { status: 400 });
      const { error } = await supabase.rpc('definir_status_um_a_um_item', { p_id: body.id, p_status: status });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'excluir_item' || acao === 'restaurar_item') {
      if (!body?.id) return NextResponse.json({ error: 'Parâmetro obrigatório: id' }, { status: 400 });
      const fn = acao === 'excluir_item' ? 'excluir_um_a_um_item' : 'restaurar_um_a_um_item';
      const { error } = await supabase.rpc(fn, { p_id: body.id });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (e: any) {
    console.error('gestor um-a-um POST', e);
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
