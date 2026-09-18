// Cliente Supabase usado só no servidor (route handlers) — nunca importado em código client.
// Usa a mesma chave anon/publishable já configurada nas env vars do Vercel (SUPABASE_URL,
// SUPABASE_ANON_KEY), igual ao stack original. Ver claude/migracao_vercel_supabase.md no
// projeto MOAI para o contexto completo (inclusive a pendência de habilitar RLS).
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  // Não lança na importação (quebraria o build) — as rotas que usam isso reportam o erro
  // de forma legível quando chamadas sem as env vars configuradas.
  console.warn('SUPABASE_URL / SUPABASE_ANON_KEY não configuradas.');
}

export const supabase = createClient(url || '', key || '', {
  auth: { persistSession: false },
});
