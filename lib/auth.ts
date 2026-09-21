// Segunda barreira de autenticação/autorização — independente da RLS no banco (que já bloqueia
// tudo via is_moai_user()) e independente do middleware (que já redireciona quem não tem sessão
// válida antes de a rota rodar). Toda API route chama requireMoaiUser() antes de tocar em
// qualquer dado, então mesmo que o middleware tivesse algum furo, nenhuma rota devolve nada sem
// essa checagem repetida aqui.
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServer } from './supabase/server';

const ALLOWED_EMAIL_DOMAIN = '@moaiclubedelideres.com';

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireMoaiUser(): Promise<{ supabase: SupabaseClient; email: string }> {
  const supabase = getSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email) {
    throw new AuthError(401, 'Não autenticado.');
  }
  if (!user.email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new AuthError(403, 'Domínio de e-mail não autorizado.');
  }
  return { supabase, email: user.email };
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: 'Erro de autenticação.' }, { status: 401 });
}
