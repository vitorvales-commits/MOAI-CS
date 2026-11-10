-- ============================================================================
-- Vitorio 2, PR A (10/11/2026): registro de consultas com intenção, entidades e resultado social.
--
-- O que muda (aditivo, nada renomeado nem removido):
--   public.vitorio_consultas           ganha intencao (text) e entidades (jsonb); o check de resultado aceita 'social'.
--   public.vitorio_registrar_consulta_v2(...)  nova função com os dois campos novos. A função antiga
--                                      (vitorio_registrar_consulta, usada pela rota atual) continua como está.
--   seguranca.catalogo_tabelas         vitorio_consultas já consta como origem 'log' (20261030b); nada a mudar.
--
-- Sem IA: intencao é o id de uma intenção determinística; entidades é um objeto pequeno com as entidades
-- reconhecidas (ids e rótulos). Nada de texto livre além do que já era gravado.
-- Rollback: drop function public.vitorio_registrar_consulta_v2(text, text, text, text, boolean, text, jsonb);
--           alter table public.vitorio_consultas drop column intencao, drop column entidades;
--           e recriar o check de resultado sem 'social' (se houver linhas 'social', apagá-las antes).
-- ============================================================================

alter table public.vitorio_consultas add column if not exists intencao text;
alter table public.vitorio_consultas add column if not exists entidades jsonb;

alter table public.vitorio_consultas drop constraint if exists vitorio_consultas_intencao_check;
alter table public.vitorio_consultas add constraint vitorio_consultas_intencao_check
  check (intencao is null or length(intencao) between 1 and 60);

alter table public.vitorio_consultas drop constraint if exists vitorio_consultas_entidades_check;
alter table public.vitorio_consultas add constraint vitorio_consultas_entidades_check
  check (entidades is null or (jsonb_typeof(entidades) = 'object' and length(entidades::text) <= 2000));

alter table public.vitorio_consultas drop constraint if exists vitorio_consultas_resultado_check;
alter table public.vitorio_consultas add constraint vitorio_consultas_resultado_check
  check (resultado in ('resposta', 'ambigua', 'nada', 'social'));

-- Mesmas regras de vitorio_registrar_consulta (acesso, limite por hora sem identificar a pessoa), com os campos novos.
create or replace function public.vitorio_registrar_consulta_v2(
  p_perfil text, p_consulta text, p_resultado text, p_chave text, p_gravar_email boolean,
  p_intencao text, p_entidades jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hora timestamptz := date_trunc('hour', now());
  v_chave text := md5(v_email || v_hora::text);
  v_n integer;
  v_id uuid;
begin
  if not coalesce(public.is_moai_user(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_perfil not in ('cs', 'gestor') or p_resultado not in ('resposta', 'ambigua', 'nada', 'social')
     or coalesce(trim(p_consulta), '') = '' or length(p_consulta) > 200
     or (p_entidades is not null and jsonb_typeof(p_entidades) <> 'object') then
    raise exception 'consulta inválida' using errcode = '22023';
  end if;
  delete from public.vitorio_limite where hora < v_hora - interval '2 hours';
  insert into public.vitorio_limite as l (chave, hora, n) values (v_chave, v_hora, 1)
    on conflict (chave) do update set n = l.n + 1 returning l.n into v_n;
  if v_n > 30 then
    raise exception 'limite de consultas por hora atingido' using errcode = '54000';
  end if;
  insert into public.vitorio_consultas (perfil, email, consulta_normalizada, resultado, chave_escolhida, intencao, entidades)
  values (p_perfil, case when p_gravar_email then v_email else null end, trim(p_consulta), p_resultado,
          left(p_chave, 200), left(p_intencao, 60), p_entidades)
  returning id into v_id;
  return v_id;
end
$$;

revoke execute on function public.vitorio_registrar_consulta_v2(text, text, text, text, boolean, text, jsonb) from public, anon;
grant execute on function public.vitorio_registrar_consulta_v2(text, text, text, text, boolean, text, jsonb) to authenticated;

select seguranca.aplicar_protecoes();
