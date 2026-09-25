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

export async function requireMoaiUser(): Promise<{ supabase: SupabaseClient; email: string; isGestor: boolean; csNome: string | null }> {
  const supabase = getSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email) {
    throw new AuthError(401, 'Não autenticado.');
  }
  if (!user.email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new AuthError(403, 'Domínio de e-mail não autorizado.');
  }
  // is_gestor() é a fonte de verdade (tabela gestores no banco) — nunca decida isGestor só pelo
  // formato do e-mail aqui no código; camada adicional sobre a checagem de domínio acima, não
  // substitui ela.
  const { data: isGestor, error: gestorError } = await supabase.rpc('is_gestor');
  if (gestorError) throw new Error('Erro ao checar papel de gestor: ' + gestorError.message);
  // meu_cs() (Parte A, 25/09/2026): qual perfil de cs_config está vinculado a este e-mail —
  // null quando o gestor ainda não fez esse vínculo em Controle de Perfis (ver cs_usuarios).
  const { data: csNome, error: csNomeError } = await supabase.rpc('meu_cs');
  if (csNomeError) throw new Error('Erro ao checar vínculo de CS: ' + csNomeError.message);
  return { supabase, email: user.email, isGestor: !!isGestor, csNome: csNome || null };
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: 'Erro de autenticação.' }, { status: 401 });
}
