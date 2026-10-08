// GET /gestor/churn/relatorio?granularidade=&ref=&cs=&produtos=&comunidade=&categoria=:
// relatório imprimível de churn (onda 2, 08/10/2026; só formulário de saída e visitas desde a separação do NPS). Sem IA e sem análise salva:
// os números vêm das mesmas funções que a aba usa (voz do membro e visitas), e o relatório é sempre
// anonimizado. A barreira de acesso é a mesma de app/gestor/page.tsx: sem sessão vai para /login,
// sessão sem is_gestor vai para a home, antes de qualquer dado ser consultado. Cada emissão fica
// registrada em access_audit_log.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, AuthError } from '@/lib/auth';
import { parseRecorte, RecorteInvalido, buscarTela, validarCsAtivo } from '@/lib/churn';
import { carregarSaidaMembro } from '@/lib/voz-membro-dados';
import { carregarReconquista } from '@/lib/reconquista';
import { carregarVisitas } from '@/lib/visitas-dados';
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
    await validarCsAtivo(supabase, recorte);
    const telaMensal = await buscarTela(supabase, recorte, 'mes');
    const ref = telaMensal.referencia;
    const [voz, visitas, reconquista] = await Promise.all([
      carregarSaidaMembro(supabase, ref, recorte.cs || ''),
      carregarVisitas(supabase, ref),
      carregarReconquista(supabase, false),
    ]);
    await supabase.rpc('log_access', {
      p_action: 'relatorio_churn',
      p_result: 'success',
      p_metadata: { ref, cs: recorte.cs || null },
      p_resource: `${recorte.granularidade}|${recorte.inicio}|${recorte.fim}`,
    });
    const html = gerarRelatorioChurnHtml({
      recorte,
      telaMensal,
      voz,
      visitas: visitas.payload,
      reconquista: reconquista.resumo,
      emitidoPor: email,
      emitidoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
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
