-- is_moai_user aceita o service role (05/11/2026). Idempotente.
--
-- Causa: o fechamento de metas semanais (rota com service role, sem e-mail) chama reports_resumo_cs, que começa com
-- "if not public.is_moai_user() then raise exception 'not authorized'". A função exigia auth.role() = 'authenticated'
-- com e-mail @moaiclubedelideres.com, então o service role era barrado. Retroativo de outubro falhou com
-- "Erro ao buscar reports_resumo_cs: not authorized".
--
-- Efeito limitado: o service role já ignora RLS e tem acesso total às tabelas. Esta função só passa a dizer isso às
-- funções que checam is_moai_user. Não muda nada para anon nem para authenticated sem e-mail MOAI.
--   - is_gestor continua falso para o service role (o JWT não tem e-mail), então funções só de gestor seguem negando
--     e campos mascarados por is_gestor ou meu_cs seguem mascarados (ex.: criticos_total e base_total em reports_resumo_cs).
--   - O fechamento de metas não usa esses campos (data_efetiva, indicacoes e cs_nome são os únicos lidos de reports_resumo_cs).

create or replace function public.is_moai_user()
returns boolean
language sql
stable security definer
set search_path = public
as $function$
  select coalesce(
    auth.role() = 'service_role'
    or (
      auth.role() = 'authenticated'
      and (auth.jwt() ->> 'email') ilike '%@moaiclubedelideres.com'
    ),
    false
  );
$function$;
