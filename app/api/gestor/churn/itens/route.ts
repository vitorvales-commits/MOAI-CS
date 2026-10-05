// GET /api/gestor/churn/itens?<mesmo recorte da tela>[&formato=csv]: lista de auditoria dos churns do
// mês de referência. Mostra, com o mesmo filtro da tela, os N churns que compõem o número grande
// (dentro = true) e, separados, quem ficou de fora com a etiqueta do motivo (Comunidade, Ex CS, Sem
// CS ou Fora do filtro), para que nenhum churn suma sem explicação. Traz nome e empresa do membro:
// só gestor, e cada consulta e cada exportação ficam registradas em access_audit_log.
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { parseRecorte, RecorteInvalido, listaAuditoria } from '@/lib/churn';

export const dynamic = 'force-dynamic';

// Células que começam com = + - @ viram texto na planilha, em vez de fórmula.
function celulaCsv(v: unknown): string {
  let t = String(v ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}
export async function GET(req: NextRequest) {
  try {
    const { supabase, isGestor } = await requireMoaiUser();
    if (!isGestor) return NextResponse.json({ error: 'Esta área é restrita a gestores.' }, { status: 403 });
    const url = new URL(req.url);
    const recorte = parseRecorte(url.searchParams);
    const lista = await listaAuditoria(supabase, recorte);
    const csv = url.searchParams.get('formato') === 'csv';
    await supabase.rpc('log_access', {
      p_action: csv ? 'churn_lista_exportada' : 'churn_lista_auditoria', p_result: 'success',
      p_resource: `${recorte.base}|${recorte.referencia}`,
    });

    const linhas = lista.linhas;

    if (csv) {
      const cab = ['Data', 'Membro', 'Empresa', 'Produto', 'CS', 'Motivo', 'Nota de retorno', 'Situação'];
      const corpo = linhas.map((l) => [l.data, l.membro, l.empresa, l.produto, l.cs, l.motivo, l.nota ?? '', l.dentro ? 'Na base' : `Fora: ${l.etiqueta}`].map(celulaCsv).join(';'));
      const arquivo = `churn-${recorte.referencia}-${recorte.base === 'carteira_atual' ? 'carteira' : 'rede'}.csv`;
      return new NextResponse('\uFEFF' + [cab.map(celulaCsv).join(';'), ...corpo].join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${arquivo}"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({
      referencia: lista.referencia, rotuloMes: lista.rotuloMes,
      dentro: linhas.filter((l) => l.dentro), fora: linhas.filter((l) => !l.dentro),
    });
  } catch (e: any) {
    if (e instanceof RecorteInvalido) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e?.status) return authErrorResponse(e);
    console.error('lista de churn falhou', e);
    return NextResponse.json({ error: 'Não foi possível carregar a lista agora.' }, { status: 500 });
  }
}
