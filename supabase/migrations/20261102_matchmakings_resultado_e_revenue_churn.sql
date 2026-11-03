-- 02/11/2026. Três ajustes ligados às metas, aplicáveis numa única vez e idempotentes.
--
-- 1. Indicador novo Matchmakings com resultado: matchmaking cujo follow foi respondido, isto é, com a
--    coluna Resultado (long_texto8zt8o1n) do board Matchmaking preenchida. Entra no catálogo (para ter
--    meta na matriz), na configuração da home (visível) e em historico_indicador (para recorde e
--    metas_time_mensal). A regra é a mesma de matchmakingTemResultado em lib/reports.ts.
-- 2. Correção de dado do Revenue Churn: a matriz usava campo numérico do navegador e "2.794" digitado
--    como dois mil setecentos e noventa e quatro reais foi gravado como 2,794. Todo revenue_churn entre
--    0 e 100 com parte fracionária é multiplicado por mil (nenhuma meta real de receita fica abaixo de
--    R$ 900, o menor produto). A matriz passa a ler reais no formato brasileiro (ver app/gestor-html.ts).
-- 3. Nada muda em políticas: as funções seguem com o mesmo search_path e o mesmo dono.

insert into public.indicadores_catalogo (chave, rotulo, unidade, direcao, fonte, agregacao_time)
values ('matchmakings_resultado', 'Matchmakings com resultado', 'contagem', 'min', 'calculado', 'soma')
on conflict (chave) do update set rotulo = excluded.rotulo, unidade = excluded.unidade,
  direcao = excluded.direcao, fonte = excluded.fonte, agregacao_time = excluded.agregacao_time;

insert into public.config_home_indicadores (indicador, visivel, ordem, exibir_recorde, atualizado_por, atualizado_em)
values ('matchmakings_resultado', true, 14, true, 'migracao_20261102', now())
on conflict (indicador) do nothing;

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
  elsif p_indicador = 'matchmakings_resultado' then
    return query
      select public.mes_grupo_para_data(m.mes_grupo_titulo), count(*)::numeric
      from public.matchmakings_items m
      where public.mes_grupo_para_data(m.mes_grupo_titulo) is not null
        and nullif(btrim(m.resultado), '') is not null
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

update public.metas_definidas
set valor = valor * 1000, atualizado_por = 'migracao_20261102_revenue_reais', atualizado_em = now()
where indicador = 'revenue_churn' and valor > 0 and valor < 100 and valor <> trunc(valor);
