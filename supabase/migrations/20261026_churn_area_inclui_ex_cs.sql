-- Churn da área inclui ex CS (26/10/2026).
-- Mesma regra de lib/churn-area.ts: no escopo do time, todo churn com CS identificado (cs_ativo ou
-- cs_ex), sem a Comunidade. Antes o escopo time exigia cs_ativo, e a saída de um CS (Marcos, 22/10)
-- tirava retroativamente os churns dele do mês, do recorde do time e da consulta de metas
-- (metas_time_mensal lê daqui). O escopo cs segue igual. churn_total_carteira e churn_base continuam
-- servindo à visão "Carteira atual" da tela de churn, que é outro recorte.
create or replace function public.historico_indicador(p_indicador text, p_escopo text, p_cs_nome text)
 returns table(mes date, realizado numeric)
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare
  v_nome_completo text;
  v_monday_user_id bigint;
begin
  if p_escopo = 'cs' then
    select nome_completo, monday_user_id into v_nome_completo, v_monday_user_id
    from public.cs_config where lower(trim(nome)) = lower(trim(coalesce(p_cs_nome,'')));
    if v_nome_completo is null then return; end if;
  end if;

  if p_indicador = 'cases' then
    return query
      select public.mes_grupo_para_data(c.mes_grupo_titulo), count(*)::numeric
      from public.cases_items c
      where public.mes_grupo_para_data(c.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(c.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'rounds' then
    return query
      select public.mes_grupo_para_data(r.mes_grupo_titulo), count(*)::numeric
      from public.rounds_items r
      where r.status = 'Realizado' and public.mes_grupo_para_data(r.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(r.cs_responsavel_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'matchmakings' then
    return query
      select public.mes_grupo_para_data(m.mes_grupo_titulo), count(*)::numeric
      from public.matchmakings_items m
      where public.mes_grupo_para_data(m.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or m.creator_id = v_monday_user_id)
      group by 1;
  elsif p_indicador = 'churn' then
    return query
      select date_trunc('month', c.data_referencia)::date, count(*)::numeric
      from public.churn_items c
      where not c.eh_comunidade
        and (
          (p_escopo = 'time' and c.cs_categoria in ('cs_ativo', 'cs_ex'))
          or (p_escopo <> 'time' and c.cs_categoria = 'cs_ativo'
              and lower(trim(c.quem_e_seu_cs)) = lower(trim(coalesce(p_cs_nome,''))))
        )
      group by 1;
  elsif p_indicador = 'upsell' then
    return query
      select date_trunc('month', u.data)::date, count(*)::numeric
      from public.upsell_downsell_items u
      where u.data is not null and u.status = 'Finalizado' and u.tipo_troca ilike 'upsell%'
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(u.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'downsell' then
    return query
      select date_trunc('month', u.data)::date, count(*)::numeric
      from public.upsell_downsell_items u
      where u.data is not null and u.status = 'Finalizado' and u.tipo_troca ilike 'downsell%'
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(u.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'indicacoes' then
    return query
      select date_trunc('month', coalesce(rs.data, rs.created_at_monday::date))::date, sum(coalesce(rs.indicacoes,0))::numeric
      from public.reports_semanais_items rs
      where coalesce(rs.data, rs.created_at_monday::date) is not null
        and (p_escopo = 'time' or rs.creator_id = v_monday_user_id)
      group by 1;
  end if;
  return;
end;
$function$;
