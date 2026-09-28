// Renova a sessão (refresh token) a cada requisição e barra quem não tem sessão válida de
// @moaiclubedelideres.com antes mesmo de a rota rodar — replica em código a mesma regra que a
// RLS já aplica no banco (nenhuma linha sai sem is_moai_user()), só que aqui devolve um redirect
// pro /login em vez de uma lista vazia.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ALLOWED_EMAIL_DOMAIN = '@moaiclubedelideres.com';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalida contra o servidor do Supabase Auth (não só decodifica o cookie) — sessão
  // expirada ou revogada cai aqui como user null, mesmo que o cookie ainda exista.
  //
  // BUG FIX (28/09/2026 — endurecimento defensivo, mesma família do travamento da home do
  // gestor investigado em lib/auth.ts/lib/reports.ts): este middleware roda em TODA rota da
  // aplicação (matcher cobre praticamente tudo, inclusive o carregamento inicial da página, não
  // só chamadas de API) e chamava supabase.auth.getUser() sem nenhum timeout — um travamento
  // aqui impediria a página de carregar antes mesmo do primeiro byte de HTML, ponto ainda mais
  // cedo que qualquer coisa já protegida em lib/auth.ts/lib/reports.ts. auth_logs não mostrou
  // erro nesta janela (diferente de postgrest_logs, que mostrou bastante), mas o timeout entra
  // como proteção defensiva mesmo assim: nunca deixa a navegação inteira travar por causa de uma
  // única chamada sem limite de tempo. Timeout curto (3s) porque isto roda no Edge Runtime, antes
  // de qualquer render — sessão não resolvida a tempo trata como não-autenticado (redireciona pro
  // /login) em vez de travar a navegação; o pior caso vira "precisa logar de novo", nunca "página
  // não carrega".
  let userAtual = null;
  try {
    const TIMEOUT_MS = 3000;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout de ${TIMEOUT_MS}ms em middleware auth.getUser()`)), TIMEOUT_MS);
    });
    const { data } = await Promise.race([supabase.auth.getUser(), timeout]);
    userAtual = data.user;
  } catch {
    userAtual = null;
  }
  const user = userAtual;

  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/login' || path.startsWith('/auth/');
  const isAuthorized = !!user?.email && user.email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);

  if (!isPublicPath && !isAuthorized) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (path === '/login' && isAuthorized) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
