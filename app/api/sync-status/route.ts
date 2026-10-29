// GET /api/sync-status: idade da última sincronização bem sucedida, derivada de sync_log (sem tabela nova).
// Qualquer usuário MOAI pode ler; só devolve horários e o nome do quadro mais atrasado.
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';
import { resumirSync, SYNC_LIMITE_MINUTOS } from '@/lib/sync-saude';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();
  try {
    const { supabase } = await requireMoaiUser();
    // Três horas bastam: são cerca de 36 ciclos de 5 minutos, um por quadro, abaixo do teto de 1000 linhas.
    const desde = new Date(Date.now() - 3 * 3600000).toISOString();
    const { data, error } = await supabase.from('sync_log').select('board, finished_at').eq('status', 'sucesso').gte('finished_at', desde).order('finished_at', { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ...resumirSync(data || [], Date.now()), limiteMinutos: SYNC_LIMITE_MINUTOS });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: 'Não foi possível ler a saúde da sincronização.' }, { status: 500 });
  }
}
