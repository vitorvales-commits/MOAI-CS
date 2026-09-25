// GET /api/config — configurações globais legíveis por qualquer usuário moai (Parte B, pedido do
// Vitor 25/09/2026): hoje só revelarIndicadoresEquipe, o switch do gestor que borra/revela a
// parte numérica dos indicadores agregados do time na home do CS comum. Escrita fica em
// /api/gestor/config (restrita a gestor) — esta rota é só leitura.
import { NextResponse } from 'next/server';
import { getConfiguracoesGlobais } from '@/lib/reports';
import { requireMoaiUser, authErrorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase } = await requireMoaiUser();
    const config = await getConfiguracoesGlobais(supabase);
    return NextResponse.json(config);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
