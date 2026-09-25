// POST /api/sync-agora — "Sincronizar agora" (pendência do diagnóstico de 25/09/2026): expõe pro
// gestor, autenticado, a mesma chamada manual que a Edge Function sync-monday já aceitava
// (?board=<nome>, com o segredo compartilhado) — antes só dava pra disparar via curl/terminal.
// Restrito a gestor (não qualquer moai user): dispara chamadas reais à API do Monday pra todos os
// boards de uma vez quando sem ?board=, e escreve no banco compartilhado — mesmo padrão de
// permissão de setCSAtivo (ações com efeito amplo/custo de API externa ficam com o gestor).
import { NextRequest, NextResponse } from 'next/server';
import { requireMoaiUser, authErrorResponse, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SYNC_FUNCTION_SECRET = process.env.SYNC_FUNCTION_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const { isGestor } = await requireMoaiUser();
    if (!isGestor) throw new AuthError(403, 'Restrito a gestor.');
    if (!SYNC_FUNCTION_SECRET) {
      return NextResponse.json({ error: 'SYNC_FUNCTION_SECRET não configurado no Vercel.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const board = searchParams.get('board');
    const url = `${SUPABASE_URL}/functions/v1/sync-monday${board ? `?board=${encodeURIComponent(board)}` : ''}`;

    // Mesma chave anon usada pelo cliente Supabase do próprio app (nunca secreta por natureza —
    // já vai embutida no bundle) + X-Sync-Secret (esse sim nunca sai do servidor), exatamente como
    // o pg_cron chama esta mesma função.
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'X-Sync-Secret': SYNC_FUNCTION_SECRET,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || `Edge Function respondeu ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
