-- Corrige as 4 RPCs de escrita do gestor (definir_metas_lote, copiar_metas_mes,
-- configurar_home_indicadores, definir_recorde_manual), que foram criadas em
-- 20260929_metas_gestor_indicadores_home_recordes.sql sem "security definer". Sem isso, a
-- function roda com o privilégio de quem chama (authenticated), que não tem nenhum GRANT de
-- INSERT/UPDATE nas tabelas metas_definidas/config_home_indicadores/recordes_manuais (só existe
-- policy de SELECT) — confirmado ao vivo: "permission denied for table metas_definidas" mesmo
-- simulando um gestor real via request.jwt.claims + set role authenticated. A checagem
-- coalesce(is_gestor(), false) dentro de cada function continua sendo a única barreira de
-- autorização (as tabelas não ganham policy de escrita), exatamente como as demais RPCs de
-- escrita do projeto (aplicar_advertencia, criar_advertencia_tipo etc.).

create or replace function public.definir_metas_lote(p_mes date, p_itens jsonb)
returns integer
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_mes date := date_trunc('month', p_mes)::date;
  v_item jsonb;
  v_indicador text; v_escopo text; v_cs_nome text; v_valor numeric;
  v_total integer := 0;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'p_itens precisa ser um array jsonb' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_indicador := v_item ->> 'indicador';
    v_escopo := v_item ->> 'escopo';
    v_cs_nome := nullif(trim(coalesce(v_item ->> 'cs_nome', '')), '');
    if not (v_item ? 'valor') or jsonb_typeof(v_item -> 'valor') not in ('number') then
      raise exception 'valor precisa ser numérico (indicador %, escopo %)', v_indicador, v_escopo using errcode = '22023';
    end if;
    v_valor := (v_item ->> 'valor')::numeric;

    if not exists (select 1 from public.indicadores_catalogo where chave = v_indicador) then
      raise exception 'indicador "%" não existe no catálogo', v_indicador using errcode = '22023';
    end if;
    if v_escopo not in ('time', 'cs') then
      raise exception 'escopo precisa ser "time" ou "cs" (recebido "%")', v_escopo using errcode = '22023';
    end if;
    if v_valor < 0 then
      raise exception 'valor não pode ser negativo (indicador %)', v_indicador using errcode = '22023';
    end if;
    if v_escopo = 'time' and v_cs_nome is not null then
      raise exception 'escopo time não leva cs_nome' using errcode = '22023';
    end if;
    if v_escopo = 'cs' then
      if v_cs_nome is null then
        raise exception 'escopo cs exige cs_nome' using errcode = '22023';
      end if;
      if not exists (select 1 from public.cs_config where lower(nome) = lower(v_cs_nome)) then
        raise exception 'CS "%" não encontrado', v_cs_nome using errcode = '22023';
      end if;
    end if;

    insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
      values (v_indicador, v_mes, v_escopo, v_cs_nome, v_valor, v_actor)
    on conflict (indicador, mes, escopo, coalesce(cs_nome, ''))
      do update set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = now();
    v_total := v_total + 1;
  end loop;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_metas_lote', to_char(v_mes, 'YYYY-MM'), 'success', jsonb_build_object('itens', v_total));

  return v_total;
end;
$function$;

create or replace function public.copiar_metas_mes(p_de date, p_para date)
returns integer
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_de date := date_trunc('month', p_de)::date;
  v_para date := date_trunc('month', p_para)::date;
  v_total integer;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_de = v_para then
    raise exception 'mês de origem e destino não podem ser o mesmo' using errcode = '22023';
  end if;

  with inseridos as (
    insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
    select indicador, v_para, escopo, cs_nome, valor, v_actor
    from public.metas_definidas
    where mes = v_de
    on conflict (indicador, mes, escopo, coalesce(cs_nome, '')) do nothing
    returning 1
  )
  select count(*) into v_total from inseridos;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'copiar_metas_mes', to_char(v_de,'YYYY-MM') || '->' || to_char(v_para,'YYYY-MM'), 'success', jsonb_build_object('copiadas', v_total));

  return v_total;
end;
$function$;

create or replace function public.configurar_home_indicadores(p_itens jsonb)
returns integer
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_item jsonb;
  v_indicador text;
  v_total integer := 0;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'p_itens precisa ser um array jsonb' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_indicador := v_item ->> 'indicador';
    if not exists (select 1 from public.indicadores_catalogo where chave = v_indicador) then
      raise exception 'indicador "%" não existe no catálogo', v_indicador using errcode = '22023';
    end if;
    if jsonb_typeof(v_item -> 'visivel') <> 'boolean' or jsonb_typeof(v_item -> 'exibirRecorde') <> 'boolean' then
      raise exception 'visivel e exibirRecorde precisam ser booleanos (indicador %)', v_indicador using errcode = '22023';
    end if;
    if jsonb_typeof(v_item -> 'ordem') <> 'number' then
      raise exception 'ordem precisa ser numérica (indicador %)', v_indicador using errcode = '22023';
    end if;

    insert into public.config_home_indicadores (indicador, visivel, ordem, exibir_recorde, atualizado_por)
      values (v_indicador, (v_item ->> 'visivel')::boolean, (v_item ->> 'ordem')::integer, (v_item ->> 'exibirRecorde')::boolean, v_actor)
    on conflict (indicador) do update set
      visivel = excluded.visivel, ordem = excluded.ordem, exibir_recorde = excluded.exibir_recorde,
      atualizado_por = excluded.atualizado_por, atualizado_em = now();
    v_total := v_total + 1;
  end loop;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'configurar_home_indicadores', 'config_home_indicadores', 'success', jsonb_build_object('itens', v_total));

  return v_total;
end;
$function$;

create or replace function public.definir_recorde_manual(
  p_indicador text, p_escopo text, p_cs text, p_valor numeric, p_mes date, p_obs text
)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_cs_nome text := nullif(trim(coalesce(p_cs, '')), '');
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.indicadores_catalogo where chave = p_indicador) then
    raise exception 'indicador "%" não existe no catálogo', p_indicador using errcode = '22023';
  end if;
  if p_escopo not in ('time', 'cs') then
    raise exception 'escopo precisa ser "time" ou "cs"' using errcode = '22023';
  end if;
  if p_escopo = 'cs' and v_cs_nome is null then
    raise exception 'escopo cs exige cs' using errcode = '22023';
  end if;
  if p_escopo = 'time' and v_cs_nome is not null then
    raise exception 'escopo time não leva cs' using errcode = '22023';
  end if;
  if p_escopo = 'cs' and not exists (select 1 from public.cs_config where lower(nome) = lower(v_cs_nome)) then
    raise exception 'CS "%" não encontrado', v_cs_nome using errcode = '22023';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor precisa ser numérico e não negativo' using errcode = '22023';
  end if;
  if p_mes is null then
    raise exception 'mes_referencia é obrigatório' using errcode = '22023';
  end if;

  insert into public.recordes_manuais (indicador, escopo, cs_nome, valor, mes_referencia, observacao, atualizado_por)
    values (p_indicador, p_escopo, v_cs_nome, p_valor, date_trunc('month', p_mes)::date, p_obs, v_actor)
  on conflict (indicador, escopo, coalesce(cs_nome, ''))
    do update set valor = excluded.valor, mes_referencia = excluded.mes_referencia,
      observacao = excluded.observacao, atualizado_por = excluded.atualizado_por, atualizado_em = now();

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_recorde_manual', p_indicador || '|' || p_escopo || coalesce('|'||v_cs_nome,''), 'success', jsonb_build_object('valor', p_valor, 'mes_referencia', p_mes));
end;
$function$;

revoke all on function public.definir_metas_lote(date, jsonb) from public, anon;
grant execute on function public.definir_metas_lote(date, jsonb) to authenticated, service_role;
revoke all on function public.copiar_metas_mes(date, date) from public, anon;
grant execute on function public.copiar_metas_mes(date, date) to authenticated, service_role;
revoke all on function public.configurar_home_indicadores(jsonb) from public, anon;
grant execute on function public.configurar_home_indicadores(jsonb) to authenticated, service_role;
revoke all on function public.definir_recorde_manual(text, text, text, numeric, date, text) from public, anon;
grant execute on function public.definir_recorde_manual(text, text, text, numeric, date, text) to authenticated, service_role;
