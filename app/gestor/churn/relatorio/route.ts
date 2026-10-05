// GET /gestor/churn/relatorio?granularidade=&ref=&cs=&produtos=&comunidade=&categoria=&identificado=1:
// relatório de churn imprimível (onda 1, 30/09/2026), rota própria da visão de gestor. Mesma
// barreira de app/gestor/page.tsx: sem sessão vai pro /login, sessão sem is_gestor vai pra home,
// antes de qualquer dado ser consultado. Anonimizado por padrão; identificado=1 é o interruptor
// da versão identificada, e cada emissão fica registrada em access_audit_log com o modo usado.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import {
  parseRecorte, RecorteInvalido, buscarSerie, buscarItens, buscarTermosIdentificaveis, buscarAnalise, buscarHashRecorte,
  buscarComunidade, buscarRecordeChurn, validarCsAtivo,
} from '@/lib/churn';
import { gerarRelatorioChurnHtml } from '@/lib/churn-relatorio-html';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let ctx: Awaited<ReturnType<typeof requireMoaiUser>>;
  try {
    ctx = await requireMoaiUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.redirect(new URL('/login', url));
    throw e;
  }
  if (!ctx.isGestor) return NextResponse.redirect(new URL('/?erro=acesso_restrito', url));
  const { supabase, email } = ctx;

  try {
    const recorte = parseRecorte(url.searchParams);
    const identificado = url.searchParams.get('identificado') === '1';
    await validarCsAtivo(supabase, recorte);
    const [serieMensal, serieSemanal, itens, termos, analise, hashAtual, comunidade, recordeChurn] = await Promise.all([
      buscarSerie(supabase, recorte, 'mes'),
      buscarSerie(supabase, recorte, 'semana'),
      buscarItens(supabase, recorte),
      buscarTermosIdentificaveis(supabase),
      buscarAnalise(supabase, recorte),
      buscarHashRecorte(supabase, recorte),
      buscarComunidade(supabase, recorte),
      buscarRecordeChurn(supabase, recorte),
    ]);
    await supabase.rpc('log_access', {
      p_action: identificado ? 'relatorio_churn_identificado' : 'relatorio_churn',
      p_result: 'success',
      p_resource: `${recorte.granularidade}|${recorte.inicio}|${recorte.fim}`,
    });
    const html = gerarRelatorioChurnHtml({
      recorte, serieMensal, serieSemanal, itens, termos, analise, comunidade, recordeChurn,
      analiseDesatualizada: !!analise?.baseHash && analise.baseHash !== hashAtual,
      identificado, emitidoPor: email,
    });
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('relatório de churn falhou', e);
    return NextResponse.json({ error: 'Não foi possível emitir o relatório agora.' }, { status: 500 });
  }
}
