// Segunda barreira de autenticação/autorização — independente da RLS no banco (que já bloqueia
// tudo via is_moai_user()) e independente do middleware (que já redireciona quem não tem sessão
// válida antes de a rota rodar). Toda API route chama requireMoaiUser() antes de tocar em
// qualquer dado, então mesmo que o middleware tivesse algum furo, nenhuma rota devolve nada sem
// essa checagem repetida aqui.
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServer } from './supabase/server';
import { nomeBateColunaPessoa, tituloContemApelido } from './reports';

const ALLOWED_EMAIL_DOMAIN = '@moaiclubedelideres.com';

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// BUG FIX (28/09/2026 — terceira rodada do travamento da home do gestor, depois de timeout+retry
// em fetchAll e concorrência limitada em getDadosBrutos, nenhum dos dois resolveu de vez):
// requireMoaiUser roda ANTES de qualquer lógica de página em TODA rota de API — inclusive antes
// de getDadosBrutos — e fazia três chamadas ao Supabase (auth.getUser(), rpc is_gestor(), rpc
// meu_cs()) sem nenhum timeout, nunca tocadas nas duas correções anteriores. is_gestor()/meu_cs()
// são RPCs que passam pelo MESMO PostgREST que os logs do projeto mostram derrubando threads
// ("Warp server error: Thread killed by timeout manager") durante os ciclos do sync-monday — se
// qualquer uma travar aqui, a requisição trava na entrada, antes mesmo de chegar no código já
// protegido em lib/reports.ts. Mesma proteção agora nesta camada: timeout de 5s + até 3 tentativas
// por chamada (comTimeoutERetry). is_gestor()/meu_cs() não dependem uma da outra — rodam em
// paralelo depois de confirmado o usuário, em vez de sequenciais, reduzindo a latência total além
// de ficarem protegidas.
async function comTimeoutERetry<T>(chamar: () => PromiseLike<{ data: T; error: any }>, label: string): Promise<{ data: T; error: any }> {
  const TIMEOUT_MS = 5000;
  const TENTATIVAS = 3;
  const ESPERAS_MS = [400, 1200];
  let resultado: { data: T; error: any } = { data: null as any, error: new Error(`${label}: nenhuma tentativa executou`) };
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<{ data: T; error: any }>((resolve) => {
      timeoutId = setTimeout(() => resolve({ data: null as any, error: new Error(`Timeout de ${TIMEOUT_MS}ms em ${label} — consulta não respondeu a tempo`) }), TIMEOUT_MS);
    });
    try {
      resultado = await Promise.race([chamar(), timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
    if (!resultado.error) return resultado;
    if (tentativa < TENTATIVAS) await new Promise((r) => setTimeout(r, ESPERAS_MS[tentativa - 1]));
  }
  return resultado;
}

export async function requireMoaiUser(): Promise<{ supabase: SupabaseClient; email: string; isGestor: boolean; csNome: string | null }> {
  const supabase = getSupabaseServer();
  const { data: userData, error } = await comTimeoutERetry(() => supabase.auth.getUser(), 'auth.getUser()');
  const user = userData?.user;
  if (error || !user || !user.email) {
    throw new AuthError(401, 'Não autenticado.');
  }
  if (!user.email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new AuthError(403, 'Domínio de e-mail não autorizado.');
  }
  // is_gestor() é a fonte de verdade (tabela gestores no banco) — nunca decida isGestor só pelo
  // formato do e-mail aqui no código; camada adicional sobre a checagem de domínio acima, não
  // substitui ela. meu_cs() (Parte A, 25/09/2026): qual perfil de cs_config está vinculado a este
  // e-mail — null quando o gestor ainda não fez esse vínculo em Controle de Perfis (ver
  // cs_usuarios). Nenhuma depende da outra — rodam em paralelo.
  const [{ data: isGestor, error: gestorError }, { data: csNome, error: csNomeError }] = await Promise.all([
    comTimeoutERetry(() => supabase.rpc('is_gestor'), 'rpc is_gestor()'),
    comTimeoutERetry(() => supabase.rpc('meu_cs'), 'rpc meu_cs()'),
  ]);
  if (gestorError) throw new Error('Erro ao checar papel de gestor: ' + gestorError.message);
  if (csNomeError) throw new Error('Erro ao checar vínculo de CS: ' + csNomeError.message);
  return { supabase, email: user.email, isGestor: !!isGestor, csNome: csNome || null };
}

// Mesma regra de dono já aplicada em /api/cs/[nome] e /api/destaque/[nome] (Parte A, 25/09/2026:
// isGestor/csNome de requireMoaiUser), só que pra casos e conselhos, onde não dá pra comparar
// csNome direto — precisa casar cs_raw/título de grupo contra nome_completo/apelidoConselho do
// dono, igual generateCSReport já faz internamente (nomeBateColunaPessoa/tituloContemApelido).
async function getMeuCsConfig(supabase: SupabaseClient, csNome: string | null) {
  if (!csNome) return null;
  const { data, error } = await supabase
    .from('cs_config')
    .select('nome_completo, apelido_conselho')
    .eq('nome', csNome)
    .maybeSingle();
  if (error) throw new Error('Erro ao buscar cs_config: ' + error.message);
  return data;
}

export async function requireOwnCaseOrGestor(
  supabase: SupabaseClient, isGestor: boolean, csNome: string | null, csRaw: string | null,
): Promise<void> {
  if (isGestor) return;
  const cfg = await getMeuCsConfig(supabase, csNome);
  if (!cfg || !nomeBateColunaPessoa(csRaw, cfg.nome_completo)) {
    throw new AuthError(403, 'Você só pode acessar casos do seu próprio CS.');
  }
}

export async function requireOwnConselhoOrGestor(
  supabase: SupabaseClient, isGestor: boolean, csNome: string | null, tituloGrupo: string,
): Promise<void> {
  if (isGestor) return;
  const cfg = await getMeuCsConfig(supabase, csNome);
  if (!cfg || !tituloContemApelido(tituloGrupo, cfg.apelido_conselho)) {
    throw new AuthError(403, 'Você só pode acessar o(s) conselho(s) do seu próprio CS.');
  }
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: 'Erro de autenticação.' }, { status: 401 });
}
