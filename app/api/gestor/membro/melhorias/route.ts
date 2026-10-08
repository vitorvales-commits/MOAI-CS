// GET  /api/gestor/membro/melhorias       lista de melhorias (ativas e excluídas separadas)
// POST /api/gestor/membro/melhorias       { acao: salvar | excluir | restaurar, ... }
// Fila de melhorias da experiência do membro, criada à mão pelo gestor a partir de um tema da voz do
// membro ou de um aprendizado de visita. Escrita só por funções SECURITY DEFINER do banco, que checam
// is_gestor e gravam a auditoria. Gestor apenas.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = ['backlog', 'em_andamento', 'realizado', 'rejeitado'];

export async function GET() {
  noStore();
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const { data, error } = await supabase.from('membro_melhorias')
      .select('id, titulo, origem, tema_chave, etapa_origem, responsavel, prazo, status, observacao, criado_por, criado_em, atualizado_em, excluido_em, excluido_por')
      .order('criado_em', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const linhas = data || [];
    return NextResponse.json({
      ativas: linhas.filter((l: any) => !l.excluido_em),
      excluidas: linhas.filter((l: any) => !!l.excluido_em),
      status: STATUS,
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('melhorias gestor falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar a fila de melhorias agora.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    const body = await req.json();
    const acao = body?.acao;
    if (acao === 'excluir' || acao === 'restaurar') {
      const id = String(body?.id || '').trim();
      if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador de melhoria inválido.' }, { status: 400 });
      const fn = acao === 'excluir' ? 'membro_melhoria_excluir' : 'membro_melhoria_restaurar';
      const { error } = await supabase.rpc(fn, { p_id: id });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ id, acao });
    }
    if (acao !== 'salvar') {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }
    const id = body?.id ? String(body.id).trim() : null;
    if (id && !UUID.test(id)) return NextResponse.json({ error: 'Identificador de melhoria inválido.' }, { status: 400 });
    const status = String(body?.status || 'backlog');
    if (!STATUS.includes(status)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    const { data, error } = await supabase.rpc('membro_melhoria_salvar', {
      p_id: id,
      p_titulo: String(body?.titulo || ''),
      p_origem: String(body?.origem || ''),
      p_tema_chave: body?.tema_chave ? String(body.tema_chave) : null,
      p_etapa_origem: body?.etapa_origem ? String(body.etapa_origem) : null,
      p_responsavel: body?.responsavel ? String(body.responsavel).slice(0, 80) : null,
      p_prazo: body?.prazo ? String(body.prazo) : null,
      p_status: status,
      p_observacao: body?.observacao ? String(body.observacao).slice(0, 600) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data, acao: 'salvar' });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    console.error('melhorias gestor POST falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar a melhoria.' }, { status: 500 });
  }
}
