// POST /api/gestor/churn/analise/gerar — gera o rascunho da análise de churn com a API da
// Anthropic (onda 1, 30/09/2026). Corpo: { granularidade, ref, cs?, produto?, categoria? }.
//
// Ordem, de propósito:
//   1. sessão de gestor (requireMoaiUser + isGestor), 403 para qualquer outro;
//   2. chave e modelo configurados no ambiente (ANTHROPIC_API_KEY, ANTHROPIC_MODEL), senão 503
//      com mensagem clara, e a edição manual continua funcionando na tela;
//   3. reservar_geracao_churn_ia: limite de uma geração a cada 10 segundos por gestor, contado e
//      registrado em access_audit_log ANTES de gastar uma chamada paga;
//   4. contexto montado só com dados anonimizados (nenhum nome de membro ou empresa sai do
//      servidor rumo à API), chamada à IA e gravação em churn_analises.texto_ia via
//      registrar_rascunho_churn_ia. texto_gestor não é tocado: publicar exige o gestor salvar.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse, AuthError } from '@/lib/auth';
import {
  parseRecorte, RecorteInvalido, iaDisponivel, buscarSerie, buscarItens, buscarTermosIdentificaveis,
  montarContextoIA, gerarRascunhoIA, IaRecusou, argsRecorteEscrita,
} from '@/lib/churn';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) {
      return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    }
    if (!iaDisponivel()) {
      return NextResponse.json({ error: 'A geração por IA não está configurada neste ambiente. Escreva a análise manualmente.' }, { status: 503 });
    }
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    }
    const recorte = parseRecorte(body || {});
    const resource = `${recorte.granularidade}|${recorte.inicio}|${recorte.fim}`;

    const { error: limiteErro } = await supabase.rpc('reservar_geracao_churn_ia', { p_resource: resource });
    if (limiteErro) {
      if (limiteErro.message?.includes('rate_limited')) {
        return NextResponse.json({ error: 'Aguarde alguns segundos antes de gerar outro rascunho.' }, { status: 429 });
      }
      throw new Error('reservar_geracao_churn_ia: ' + limiteErro.message);
    }

    const [serie, itens, termos] = await Promise.all([
      buscarSerie(supabase, recorte),
      buscarItens(supabase, recorte),
      buscarTermosIdentificaveis(supabase),
    ]);
    if (!serie.total) {
      return NextResponse.json({ error: 'Não há churn neste recorte para analisar.' }, { status: 400 });
    }

    const { texto, modelo } = await gerarRascunhoIA(montarContextoIA(recorte, serie, itens, termos));
    const { error: gravarErro } = await supabase.rpc('registrar_rascunho_churn_ia', {
      ...argsRecorteEscrita(recorte), p_texto_ia: texto, p_modelo_ia: modelo,
    });
    if (gravarErro) throw new Error('registrar_rascunho_churn_ia: ' + gravarErro.message);

    return NextResponse.json({ textoIa: texto, modelo });
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof IaRecusou) return NextResponse.json({ error: e.message }, { status: 422 });
    if (e instanceof AuthError) return authErrorResponse(e);
    console.error('rascunho de churn por IA falhou', e?.message || e);
    return NextResponse.json({ error: 'Não foi possível gerar o rascunho agora. A edição manual continua disponível.' }, { status: 502 });
  }
}
