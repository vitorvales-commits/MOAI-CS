// POST /api/gestor/churn/analise — salva ou publica a análise de churn de um recorte (onda 1,
// 30/09/2026). Corpo: { acao: 'salvar', granularidade, ref, cs?, produtos?, comunidade?, categoria?, texto }
// ou { acao: 'publicar', granularidade, ref, ..., id }. Toda a escrita passa pelas RPCs
// salvar_churn_analise / publicar_churn_analise (SECURITY DEFINER, checam is_gestor no corpo e
// registram em access_audit_log via log_access). Salvar sempre devolve a análise a rascunho; só
// o texto salvo pelo gestor (texto_gestor) chega ao relatório, nunca o texto da IA direto.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { parseRecorte, RecorteInvalido, argsRecorteEscrita, buscarAnalise, buscarHashRecorte, validarCsAtivo } from '@/lib/churn';

export const dynamic = 'force-dynamic';

const TEXTO_MAX = 30000;

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }
    const recorte = parseRecorte(body || {});
    await validarCsAtivo(supabase, recorte);

    if (body?.acao === 'salvar') {
      const texto = typeof body.texto === 'string' ? body.texto.trim() : '';
      if (!texto || texto.length > TEXTO_MAX) {
        return NextResponse.json({ error: 'Escreva a análise antes de salvar (até 30 mil caracteres).' }, { status: 400 });
      }
      const baseHash = await buscarHashRecorte(supabase, recorte);
      const { error } = await supabase.rpc('salvar_churn_analise', { ...argsRecorteEscrita(recorte), p_texto_gestor: texto, p_base_hash: baseHash });
      if (error) throw new Error('salvar_churn_analise: ' + error.message);
    } else if (body?.acao === 'publicar') {
      const atual = await buscarAnalise(supabase, recorte);
      if (!atual || !atual.textoGestor) {
        return NextResponse.json({ error: 'Salve a análise antes de publicar.' }, { status: 400 });
      }
      const { error } = await supabase.rpc('publicar_churn_analise', { p_id: atual.id });
      if (error) throw new Error('publicar_churn_analise: ' + error.message);
    } else {
      return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }

    const [analise, hashAtual] = await Promise.all([buscarAnalise(supabase, recorte), buscarHashRecorte(supabase, recorte)]);
    return NextResponse.json({
      analise: analise ? { ...analise, desatualizada: !!analise.baseHash && analise.baseHash !== hashAtual } : null,
    });
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e?.status) return authErrorResponse(e);
    console.error('análise de churn falhou', e);
    return NextResponse.json({ error: 'Não foi possível salvar a análise agora.' }, { status: 500 });
  }
}
