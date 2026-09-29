-- Já aplicada em produção (moai-cs-dashboard) em 29/09/2026 via MCP. Versionar no repositório.
-- Consulta rápida precisa logar action=consulta_metas com resource preenchido (CS + mês), para
-- cair no limite de taxa de "escritas de negócio" (60/min, 600/h) em vez do limite mais restrito
-- de "logs de acesso" (30/min, 300/h) que se aplica quando resource é nulo — ver
-- enforce_write_rate_limit. log_access não tinha como receber resource (sempre gravava null).
-- Assinatura antiga tinha 3 args; troca por uma versão com p_resource opcional (default null),
-- então login/logout (que não passam esse parâmetro) continuam com resource nulo, sem mudança de
-- comportamento pra eles.
drop function if exists public.log_access(text, text, jsonb);

create function public.log_access(p_action text, p_result text, p_metadata jsonb default '{}'::jsonb, p_resource text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(auth.jwt() ->> 'email', '') = '' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
  values (
    auth.jwt() ->> 'email',
    left(coalesce(p_action, ''), 100),
    left(p_resource, 200),
    left(coalesce(p_result, ''), 100),
    case when octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 4000
         then jsonb_build_object('truncado', true)
         else coalesce(p_metadata, '{}'::jsonb) end
  );
end;
$function$;

revoke all on function public.log_access(text, text, jsonb, text) from public, anon;
grant execute on function public.log_access(text, text, jsonb, text) to authenticated;
