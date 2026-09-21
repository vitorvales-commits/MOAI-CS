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
  const { data: { user } } = await supabase.auth.getUser();

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
