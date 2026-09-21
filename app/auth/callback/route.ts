// Troca o code do OAuth (PKCE) pela sessão, com criação do cookie HttpOnly da sessão. Se o
// e-mail não for do domínio autorizado, o próprio banco já bloqueou a criação do usuário (trigger
// trg_enforce_email_domain_on_signup em auth.users) — aqui só cobrimos o caso defensivo de uma
// sessão que, por algum outro caminho, tenha passado com e-mail fora do domínio.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_EMAIL_DOMAIN = '@moaiclubedelideres.com';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=sem_code`);
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=falha_login`);
  }

  const email = data.session.user.email || '';
  if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=dominio_nao_autorizado`);
  }

  await supabase.rpc('log_access', { p_action: 'login', p_result: 'success', p_metadata: {} });

  return NextResponse.redirect(`${origin}/`);
}
