// Cliente Supabase com service role. Uso restrito: só a rota de fechamento de metas semanais
// (app/api/interno/metas-semanais/fechar/route.ts) pode importar este arquivo. O teste
// tests/admin-isolamento.test.ts falha se outro arquivo importar. 'server-only' impede que o módulo
// entre em bundle de cliente.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

// Falha fechada: sem a variável, a rota responde erro em vez de cair para outra chave.
export function clienteAdmin(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !chave) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados no servidor.');
  cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}
