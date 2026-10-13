// GET /api/gestor/report-semana?semana=AAAA-MM-DD — estado do report de cada CS na semana (no prazo,
// com atraso, pendente ou atrasado) lido de status_report_semana, a única função de estado do report.
// Gestor vê todos os CS com obrigado_report; CS comum vê só a própria linha (o banco confere).
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SEMANA_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    const pedida = new URL(req.url).searchParams.get('semana');
    const semana = pedida && SEMANA_RE.test(pedida) ? pedida : null;
    const { data, error } = await supabase.rpc('status_report_semana', { p_semana: semana });
    if (error) throw new Error(error.message);
    return NextResponse.json({ semana, cs: data || [] });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
