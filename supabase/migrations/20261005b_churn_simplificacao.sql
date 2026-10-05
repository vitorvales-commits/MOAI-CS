-- Simplificação da tela de churn (terceiro prompt da onda 1, 05/10/2026).
--
-- Churn oficial em dois níveis explícitos:
--   carteira_atual: churns de CS ativos hoje, sem a Comunidade (a Comunidade não tem CS, mesmo
--                   quando o membro está sob um CS ativo). É o número que se compara com a meta.
--   toda_a_rede:    todos os churns, incluindo ex CS, sem CS e, se o filtro permitir, a Comunidade.
--
-- Uma única base (churn_base) alimenta a tela inteira: gráfico, números, nota de recorde, rodapé
-- da Comunidade e lista de auditoria. historico_indicador (metas, consulta rápida, recordes dos
-- cards) passa a usar a definição de carteira atual, igual ao card Churn dos Indicadores.

-- ============ 1. base única com as duas definições ============
create or replace function public.churn_base(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[],
  p_incluir_comunidade boolean, p_base text)
returns setof public.churn_items
language sql stable
set search_path = public
as $function$
  select f.* from public.churn_filtrados_multi(
    p_inicio, p_fim, p_cs, p_cs_categoria, p_produtos,
    case when p_base = 'carteira_atual' then false else coalesce(p_incluir_comunidade, false) end) f
  where p_base is distinct from 'carteira_atual'
     or (f.cs_categoria = 'cs_ativo' and not f.eh_comunidade);
$function$;

-- Total da carteira atual num intervalo (card Churn dos Indicadores gerais da área).
create or replace function public.churn_total_carteira(p_inicio date, p_fim date)
returns integer
language sql stable
set search_path = public
as $function$
  select count(*)::integer from public.churn_base(p_inicio, p_fim, null, null, null, false, 'carteira_atual');
$function$;

-- ============ 2. consulta única da tela ============
-- Devolve, para um filtro e um mês de referência: a série por motivo (12 meses terminando no mês de
-- referência, ou as semanas do mês), o total do mês de referência e do mês anterior, o motivo mais
-- citado, o recorde histórico no MESMO filtro e o resumo da Comunidade. Tudo sai de um único
-- conjunto materializado, então nenhum número pode divergir de outro. Só gestor.
create or replace function public.churn_tela(
  p_granularidade text, p_ref date, p_cs text, p_cs_categoria text, p_produtos text[],
  p_incluir_comunidade boolean, p_base text)
returns jsonb
language plpgsql stable
set search_path = public
as $function$
declare
  v_ref date := date_trunc('month', p_ref)::date;
  v_mes_atual date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  v_ini date;
  v_fim date;
  v_com boolean := case when p_base = 'carteira_atual' then false else coalesce(p_incluir_comunidade, false) end;
  v_resultado jsonb;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_granularidade is null or p_granularidade not in ('mes', 'semana') then
    raise exception 'granularidade precisa ser mes ou semana' using errcode = '22023';
  end if;
  if p_base is null or p_base not in ('carteira_atual', 'toda_a_rede') then
    raise exception 'base precisa ser carteira_atual ou toda_a_rede' using errcode = '22023';
  end if;
  if p_ref is null or v_ref < date '2020-01-01' or v_ref > date '2100-12-01' then
    raise exception 'mês de referência inválido' using errcode = '22023';
  end if;
  v_ini := case when p_granularidade = 'semana' then v_ref else (v_ref - interval '11 months')::date end;
  v_fim := (v_ref + interval '1 month' - interval '1 day')::date;

  with b as materialized (
    select c.id, c.data_referencia, c.motivo_principal
    from public.churn_base(date '1900-01-01', date '2999-12-31', p_cs, p_cs_categoria, p_produtos, v_com, p_base) c
  ), per as (
    select * from public.churn_periodos(p_granularidade, v_ini, v_fim)
  ), serie as (
    select p.ini, p.fim, p.sem, x.mot, coalesce(x.n, 0) as n
    from per p
    left join lateral (
      select b.motivo_principal as mot, count(*)::integer as n
      from b
      where date_trunc('month', b.data_referencia) = date_trunc('month', p.ini)
        and (p.sem is null or public.semana_do_mes(b.data_referencia) = p.sem)
      group by b.motivo_principal
    ) x on true
  ), mes_ref as (
    select b.motivo_principal as mot, count(*)::integer as n
    from b where date_trunc('month', b.data_referencia) = v_ref
    group by b.motivo_principal
  ), por_mes as (
    select date_trunc('month', b.data_referencia)::date as mes, count(*)::integer as n
    from b group by 1
  ), por_semana as (
    select date_trunc('month', b.data_referencia)::date as mes, public.semana_do_mes(b.data_referencia) as sem, count(*)::integer as n
    from b group by 1, 2
  ), rec_m as (
    select mes, n from por_mes order by n desc, mes asc limit 1
  ), rec_s as (
    select mes, sem, n from por_semana order by n desc, mes asc, sem asc limit 1
  ), com as (
    select c.motivo_principal as mot, count(*)::integer as n
    from public.churn_items c
    where c.eh_comunidade and date_trunc('month', c.data_referencia) = v_ref
    group by c.motivo_principal
  )
  select jsonb_build_object(
    'inicio', v_ini,
    'fim', v_fim,
    'ref', v_ref,
    'em_andamento', v_ref = v_mes_atual,
    'base', p_base,
    'primeiro_mes_carteira', (select date_trunc('month', min(c.data_referencia))::date
                              from public.churn_items c where c.cs_categoria = 'cs_ativo' and not c.eh_comunidade),
    'serie', coalesce((select jsonb_agg(jsonb_build_object(
                'periodo_inicio', s.ini, 'periodo_fim', s.fim, 'semana', s.sem, 'motivo', s.mot, 'qtd', s.n)
                order by s.ini, s.mot) from serie s), '[]'::jsonb),
    'total_mes', coalesce((select sum(n) from mes_ref), 0),
    'total_mes_anterior', coalesce((select n from por_mes where mes = (v_ref - interval '1 month')::date), 0),
    'motivo_top', (select jsonb_build_object('motivo', mot, 'qtd', n) from mes_ref order by n desc, mot asc limit 1),
    'recorde_mensal', (select jsonb_build_object('valor', n, 'mes', mes, 'em_andamento', mes = v_mes_atual) from rec_m),
    'recorde_semanal', (select jsonb_build_object('valor', n, 'mes', mes, 'semana', sem, 'em_andamento', mes = v_mes_atual) from rec_s),
    'comunidade', jsonb_build_object(
      'incluida', v_com,
      'total_mes', coalesce((select sum(n) from com), 0),
      'total_rede_mes', (select count(*) from public.churn_items c where date_trunc('month', c.data_referencia) = v_ref),
      'por_motivo', coalesce((select jsonb_agg(jsonb_build_object('motivo', mot, 'qtd', n) order by n desc, mot) from com), '[]'::jsonb))
  ) into v_resultado;
  return v_resultado;
end;
$function$;

-- ============ 3. lista de auditoria ============
-- Todos os churns do intervalo (a tela passa o mês de referência). dentro = faz parte da base e do
-- filtro da tela, ou seja, é um dos N churns do número grande. Quem está fora recebe a etiqueta do
-- motivo (Comunidade, Ex CS, Sem CS ou Fora do filtro), então nenhum churn some sem explicação.
-- Dados identificáveis: só gestor.
create or replace function public.churn_itens_recorte(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[],
  p_incluir_comunidade boolean, p_base text)
returns table (
  id bigint, data_referencia date, quem_e_seu_cs text, cs_categoria text, produto text,
  motivo_principal text, membro_nome text, empresa text, explicacao text,
  expectativa_nao_atendida text, sugestao_melhoria text, nota_retorno numeric,
  dentro boolean, etiqueta text)
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_base is null or p_base not in ('carteira_atual', 'toda_a_rede') then
    raise exception 'base precisa ser carteira_atual ou toda_a_rede' using errcode = '22023';
  end if;
  return query
  select c.id, c.data_referencia, c.quem_e_seu_cs, c.cs_categoria, c.produto, c.motivo_principal,
         d.membro_nome, d.empresa, d.explicacao, d.expectativa_nao_atendida, d.sugestao_melhoria, d.nota_retorno,
         (b.id is not null) as dentro,
         case
           when b.id is not null then null
           when c.eh_comunidade then 'Comunidade'
           when c.cs_categoria = 'cs_ex' then 'Ex CS'
           when c.cs_categoria in ('nao_cs', 'nao_informado', 'nao_classificado') then 'Sem CS'
           else 'Fora do filtro'
         end as etiqueta
  from public.churn_items c
  left join public.churn_detalhes d on d.churn_id = c.id
  left join public.churn_base(p_inicio, p_fim, p_cs, p_cs_categoria, p_produtos, p_incluir_comunidade, p_base) b on b.id = c.id
  where c.data_referencia between p_inicio and p_fim
  order by (b.id is not null) desc, c.data_referencia, c.id;
end;
$function$;

-- Hash do recorte com a base (aviso de análise desatualizada).
create or replace function public.churn_recorte_hash(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[],
  p_incluir_comunidade boolean, p_base text)
returns text
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (
    select md5(coalesce(string_agg(f.id::text, ',' order by f.id), ''))
    from public.churn_base(p_inicio, p_fim, p_cs, p_cs_categoria, p_produtos, p_incluir_comunidade, p_base) f
  );
end;
$function$;

-- ============ 4. historico_indicador: churn passa a ser carteira atual ============
-- Time: churns de CS ativos, sem a Comunidade. Por CS: os do próprio CS, sem a Comunidade. Mesma
-- definição do card Churn e da tela, e mesma data de referência (data do Monday, senão a criação).
-- Os demais indicadores ficam exatamente como estavam.
create or replace function public.historico_indicador(p_indicador text, p_escopo text, p_cs_nome text)
returns table(mes date, realizado numeric)
language plpgsql stable
set search_path = public
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
      where c.cs_categoria = 'cs_ativo' and not c.eh_comunidade
        and (p_escopo = 'time' or lower(trim(c.quem_e_seu_cs)) = lower(trim(coalesce(p_cs_nome,''))))
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

-- ============ 5. painel de recordes: churn na carteira atual ============
-- O painel passa o churn pela mesma definição (categoria cs_ativo, sem a Comunidade), de modo que
-- valor, meta e recorde comparam a mesma coisa.
create or replace function public.recordes_painel(p_cs text default null)
returns table (
  indicador text, rotulo text, meta numeric,
  recorde_mensal_valor numeric, recorde_mensal_mes date, recorde_mensal_em_andamento boolean, meses_no_recorde integer,
  recorde_semanal_valor numeric, recorde_semanal_mes date, recorde_semanal_semana integer, recorde_semanal_em_andamento boolean,
  valor_mes_corrente numeric, diferenca_mensal numeric, historico_desde date, calculado_em timestamptz)
language plpgsql stable
set search_path = public
as $function$
declare
  v_mes_atual date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select i.id, i.rotulo, m.valor,
         r.recorde_mensal_valor, r.recorde_mensal_mes, r.recorde_mensal_em_andamento, r.meses_no_recorde,
         r.recorde_semanal_valor, r.recorde_semanal_mes, r.recorde_semanal_semana, r.recorde_semanal_em_andamento,
         r.valor_mes_corrente, r.diferenca_mensal, r.historico_desde, r.calculado_em
  from (values
    (1, 'churn', 'Churn (carteira atual, sem a Comunidade)', 'churn'),
    (2, 'cases_sucesso', 'Cases de sucesso', 'cases'),
    (3, 'matchmakings', 'Matchmakings (itens do board)', 'matchmakings'),
    (4, 'matchmakings_reports', 'Matchmakings (reports semanais, referência)', null),
    (5, 'rounds_realizados', 'Rounds realizados', 'rounds'),
    (6, 'rounds_pessoas', 'Pessoas em rounds realizados', null),
    (7, 'indicacoes', 'Indicações', 'indicacoes'),
    (8, 'upsell', 'Upsell', 'upsell'),
    (9, 'downsell', 'Downsell', 'downsell'),
    (10, 'nps', 'NPS dos conselheiros', null)
  ) i(ordem, id, rotulo, chave_catalogo)
  cross join lateral public.indicador_recordes(
    i.id, p_cs, null, null,
    case when i.id = 'churn' then false else true end,
    case when i.id = 'churn' then 'cs_ativo' else null end) r
  left join lateral (
    select rm.valor from public.resolver_meta(i.chave_catalogo, case when p_cs is null then 'time' else 'cs' end, p_cs, v_mes_atual) rm
    where i.chave_catalogo is not null
  ) m on true
  order by i.ordem;
end;
$function$;

-- ============ 6. permissões ============
revoke execute on function public.churn_base(date, date, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.churn_total_carteira(date, date) from public, anon;
revoke execute on function public.churn_tela(text, date, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.churn_itens_recorte(date, date, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.churn_recorte_hash(date, date, text, text, text[], boolean, text) from public, anon;
grant execute on function public.churn_base(date, date, text, text, text[], boolean, text) to authenticated;
grant execute on function public.churn_total_carteira(date, date) to authenticated;
grant execute on function public.churn_tela(text, date, text, text, text[], boolean, text) to authenticated;
grant execute on function public.churn_itens_recorte(date, date, text, text, text[], boolean, text) to authenticated;
grant execute on function public.churn_recorte_hash(date, date, text, text, text[], boolean, text) to authenticated;
