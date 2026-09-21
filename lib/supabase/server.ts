// Cliente Supabase por requisição, vinculado aos cookies HttpOnly da sessão via @supabase/ssr.
// Diferente de um client anônimo estático, este carrega o access token do usuário logado em
// cada chamada — é isso que faz a policy RLS "moai_select" (baseada em is_moai_user()) liberar
// os dados: sem essa amarração ao cookie, toda query chega no Postgres como role "anon" e a RLS
// devolve zero linhas.
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de dentro de um contexto que não pode setar cookie (ex: Server Component) —
          // sem problema, o middleware já renova a sessão em toda navegação.
        }
      },
    },
  });
}
