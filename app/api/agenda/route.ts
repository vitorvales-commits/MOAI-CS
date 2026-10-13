// GET /api/agenda?inicio=YYYY-MM-DD&fim=YYYY-MM-DD — agenda de conselhos e Rounds (13/10/2026).
// Dados abertos a qualquer usuário autenticado e vinculado (is_moai_user()): todos os CS veem todos
// os conselhos e rounds, inclusive nomes de membros e presença. Sem filtro por perfil aqui; o filtro
// "Meus" é feito no cliente. Sem sessão, 401; sem vínculo, 403.
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { generateAgendaVisual } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  noStore();
  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  if (!inicio || !fim || !DATA_ISO.test(inicio) || !DATA_ISO.test(fim)) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: inicio, fim (YYYY-MM-DD)' }, { status: 400 });
  }
  try {
    const { supabase } = await requireMoaiUser();
    const { data: vinculado, error } = await supabase.rpc('is_moai_user');
    if (error) throw new Error('Erro ao checar vínculo: ' + error.message);
    if (!vinculado) {
      return NextResponse.json({ error: 'Acesso restrito a usuários vinculados à MOAI.' }, { status: 403 });
    }
    const data = await generateAgendaVisual(supabase, inicio, fim);
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
