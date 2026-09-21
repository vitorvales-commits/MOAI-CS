// Cliente Supabase do navegador — usado só na página de login para disparar o OAuth do Google.
// createBrowserClient (do @supabase/ssr) guarda o code_verifier do fluxo PKCE em cookie, pra
// interoperar com o exchangeCodeForSession feito no servidor em app/auth/callback/route.ts.
import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );
}
