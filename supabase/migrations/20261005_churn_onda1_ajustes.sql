-- Ajustes da onda 1 do churn (pedido do Vitor, 30/09/2026, segundo prompt):
--   1. Filtro de produto em seleção múltipla, com a Comunidade fora da conta por padrão.
--   2. Bloco da Comunidade sempre visível, calculado à parte.
--   3. Recordes de todos os indicadores calculados do histórico inteiro do Monday, por um único
--      mecanismo (indicador_recordes). Nenhuma tabela, coluna ou constante guarda recorde digitado.
--   4. Ex CS entram só nos agregados (cada linha contada uma vez), nunca por pessoa.
--
-- Tudo é aditivo: colunas novas, trigger ampliado e funções novas. As funções antigas
-- (churn_serie de 6 argumentos, churn_filtrados, churn_recorte_hash, churn_itens_recorte) continuam
-- existindo para quem as chama hoje. recordes_manuais e recorde_efetivo NÃO foram tocadas: a remoção
-- do campo manual depende de confirmação do Vitor (regra zero_manual).
--
-- Definições adotadas (registrar no PR):
--   Comunidade = produto Comunidade OU campo "Quem é o seu CS?" igual a Comunidade (decisão 3).
--   Produto vazio, nulo, N/D ou "Não sei informar" vira sem_produto_informado.
--   High End, Comercial e N/D em "Quem é o seu CS?" continuam na conta e nunca viram pessoa.

-- ============ 1. colunas derivadas em churn_items ============
alter table public.churn_items
  add column if not exists produto_normalizado text,
  add column if not exists eh_comunidade boolean;

create or replace function public.churn_normalizar_produto(p_produto text)
returns text
language sql immutable
set search_path = ''
as $function$
  select case
    when nullif(trim(coalesce(p_produto, '')), '') is null then 'sem_produto_informado'
    when lower(trim(p_produto)) in ('n/d', 'nd', 'não sei informar', 'nao sei informar') then 'sem_produto_informado'
    else regexp_replace(trim(p_produto), '\s+', ' ', 'g')
  end;
$function$;

-- Mesmo trigger da onda 1, agora derivando também produto_normalizado e eh_comunidade. Como o sync
-- faz upsert de todas as linhas a cada 5 minutos, qualquer mudança no Monday reclassifica sozinha.
create or replace function public.churn_items_derivar()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.cs_categoria := public.churn_classificar_cs(new.quem_e_seu_cs);
  new.motivo_principal := coalesce(nullif(trim(coalesce(new.motivo_principal, '')), ''), 'nao_informado');
  new.produto_normalizado := public.churn_normalizar_produto(new.produto);
  new.eh_comunidade := lower(trim(coalesce(new.produto, ''))) = 'comunidade'
                    or lower(trim(coalesce(new.quem_e_seu_cs, ''))) = 'comunidade';
  return new;
end;
$function$;

-- backfill: o update dispara o trigger em todas as linhas
update public.churn_items set quem_e_seu_cs = quem_e_seu_cs;

alter table public.churn_items
  alter column produto_normalizado set default 'sem_produto_informado',
  alter column produto_normalizado set not null,
  alter column eh_comunidade set default false,
  alter column eh_comunidade set not null;

create index if not exists churn_items_eh_comunidade_idx on public.churn_items (eh_comunidade);

-- ============ 2. filtro único com seleção múltipla ============
-- Linhas da Comunidade obedecem só a p_incluir_comunidade (a Comunidade não tem CS nem produto
-- "de verdade"); as demais obedecem à lista de produtos. p_produtos nulo significa todos.
create or replace function public.churn_filtrados_multi(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[], p_incluir_comunidade boolean)
returns setof public.churn_items
language sql stable
set search_path = public
as $function$
  select c.* from public.churn_items c
  where c.data_referencia between p_inicio and p_fim
    and (p_cs is null or lower(c.quem_e_seu_cs) = lower(p_cs))
    and (p_cs_categoria is null or c.cs_categoria = p_cs_categoria)
    and (case when c.eh_comunidade then coalesce(p_incluir_comunidade, false)
              else (p_produtos is null or c.produto_normalizado = any(p_produtos)) end);
$function$;

-- Períodos do gráfico (mesma regra de churn_serie): um por mês ou um por semana do mês.
create or replace function public.churn_periodos(p_granularidade text, p_inicio date, p_fim date)
returns table (ini date, fim date, sem integer)
language sql immutable
set search_path = public
as $function$
  with meses as (
    select m::date as mes
    from generate_series(date_trunc('month', p_inicio), date_trunc('month', p_fim), interval '1 month') m
  )
  select mes, (mes + interval '1 month' - interval '1 day')::date, null::integer
  from meses where p_granularidade = 'mes'
  union all
  select (mes + (s - 1) * 7),
         least(mes + (s - 1) * 7 + 6, (mes + interval '1 month' - interval '1 day')::date),
         s
  from meses cross join generate_series(1, 5) s
  where p_granularidade = 'semana'
    and mes + (s - 1) * 7 <= (mes + interval '1 month' - interval '1 day')::date;
$function$;

-- Série por mês ou semana, quebrada por motivo, com lista de produtos e chave da Comunidade.
-- Sobrecarga nova (sete argumentos). A de seis argumentos segue intacta para quem a chama hoje.
create or replace function public.churn_serie(
  p_granularidade text, p_inicio date, p_fim date,
  p_cs text, p_cs_categoria text,
  p_produtos text[] default null, p_incluir_comunidade boolean default false)
returns table (periodo_inicio date, periodo_fim date, semana integer, motivo text, qtd integer)
language plpgsql stable
set search_path = public
as $function$
declare
  v_cs text := p_cs;
  v_meu_cs text;
begin
  if not coalesce(public.is_gestor(), false) then
    v_meu_cs := public.meu_cs();
    if v_meu_cs is null then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    v_cs := v_meu_cs;
  end if;
  if p_granularidade is null or p_granularidade not in ('mes', 'semana') then
    raise exception 'granularidade precisa ser mes ou semana' using errcode = '22023';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 1100 then
    raise exception 'período inválido' using errcode = '22023';
  end if;

  return query
  with periodos as (
    select * from public.churn_periodos(p_granularidade, p_inicio, p_fim)
  ), base as (
    select f.data_referencia, f.motivo_principal
    from public.churn_filtrados_multi(p_inicio, p_fim, v_cs, p_cs_categoria, p_produtos, p_incluir_comunidade) f
  ), contagem as (
    select p.ini, p.sem, b.motivo_principal as mot, count(*)::integer as n
    from periodos p
    join base b on date_trunc('month', b.data_referencia) = date_trunc('month', p.ini)
               and (p.sem is null or public.semana_do_mes(b.data_referencia) = p.sem)
    group by p.ini, p.sem, b.motivo_principal
  )
  select p.ini, p.fim, p.sem, c.mot, coalesce(c.n, 0)
  from periodos p
  left join contagem c on c.ini = p.ini and c.sem is not distinct from p.sem
  order by p.ini, c.mot;
end;
$function$;

-- Bloco da Comunidade: sempre calculado à parte, independente do filtro de produto e de CS. Devolve
-- a Comunidade por período e por motivo, e em total_recorte o total de TODOS os churns do mesmo
-- recorte (denominador do percentual). Só gestor.
create or replace function public.churn_comunidade_resumo(p_granularidade text, p_inicio date, p_fim date)
returns table (periodo_inicio date, periodo_fim date, semana integer, motivo text, qtd integer, total_recorte integer)
language plpgsql stable
set search_path = public
as $function$
declare
  v_total integer;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_granularidade is null or p_granularidade not in ('mes', 'semana') then
    raise exception 'granularidade precisa ser mes ou semana' using errcode = '22023';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 1100 then
    raise exception 'período inválido' using errcode = '22023';
  end if;
  select count(*)::integer into v_total from public.churn_items c where c.data_referencia between p_inicio and p_fim;

  return query
  with periodos as (
    select * from public.churn_periodos(p_granularidade, p_inicio, p_fim)
  ), base as (
    select c.data_referencia, c.motivo_principal
    from public.churn_items c
    where c.eh_comunidade and c.data_referencia between p_inicio and p_fim
  ), contagem as (
    select p.ini, p.sem, b.motivo_principal as mot, count(*)::integer as n
    from periodos p
    join base b on date_trunc('month', b.data_referencia) = date_trunc('month', p.ini)
               and (p.sem is null or public.semana_do_mes(b.data_referencia) = p.sem)
    group by p.ini, p.sem, b.motivo_principal
  )
  select p.ini, p.fim, p.sem, c.mot, coalesce(c.n, 0), v_total
  from periodos p
  left join contagem c on c.ini = p.ini and c.sem is not distinct from p.sem
  order by p.ini, c.mot;
end;
$function$;

-- Hash e itens do recorte com a seleção múltipla (sobrecargas novas, só gestor).
create or replace function public.churn_recorte_hash(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[], p_incluir_comunidade boolean)
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
    from public.churn_filtrados_multi(p_inicio, p_fim, p_cs, p_cs_categoria, p_produtos, p_incluir_comunidade) f
  );
end;
$function$;

create or replace function public.churn_itens_recorte(
  p_inicio date, p_fim date, p_cs text, p_cs_categoria text, p_produtos text[], p_incluir_comunidade boolean)
returns table (
  id bigint, data_referencia date, quem_e_seu_cs text, cs_categoria text, produto text,
  motivo_principal text, membro_nome text, empresa text, explicacao text,
  expectativa_nao_atendida text, sugestao_melhoria text, nota_retorno numeric)
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select f.id, f.data_referencia, f.quem_e_seu_cs, f.cs_categoria, f.produto, f.motivo_principal,
         d.membro_nome, d.empresa, d.explicacao, d.expectativa_nao_atendida, d.sugestao_melhoria, d.nota_retorno
  from public.churn_filtrados_multi(p_inicio, p_fim, p_cs, p_cs_categoria, p_produtos, p_incluir_comunidade) f
  left join public.churn_detalhes d on d.churn_id = f.id
  order by f.data_referencia, f.id;
end;
$function$;

-- ============ 3. recordes calculados (mecanismo único) ============
-- Nada aqui lê recordes_manuais. Todo recorde sai do histórico inteiro que o Monday entrega e é
-- recalculado a cada consulta, portanto a cada sincronização. Para churn, downsell e demais
-- contagens o recorde é o MAIOR valor observado (churn: 37 em março de 2026); para NPS é a maior
-- nota. O mês corrente conta, com o selo em_andamento até o mês fechar.

create or replace function public.indicador_id_canonico(p_indicador text)
returns text
language sql immutable
set search_path = ''
as $function$
  select case lower(trim(coalesce(p_indicador, '')))
    when 'cases' then 'cases_sucesso'
    when 'rounds' then 'rounds_realizados'
    else lower(trim(coalesce(p_indicador, '')))
  end;
$function$;

-- Pontos brutos de um indicador: uma linha por registro de origem, com o mês, o dia (nulo quando o
-- indicador só tem mês) e o valor. Cada linha do Monday entra uma vez. Com p_cs, aplica a mesma
-- atribuição de historico_indicador (cs_raw, creator_id, quem_e_seu_cs).
create or replace function public.indicador_pontos(
  p_indicador text, p_cs text default null, p_motivo text default null,
  p_produtos text[] default null, p_incluir_comunidade boolean default true, p_cs_categoria text default null)
returns table (mes date, dia date, valor numeric)
language plpgsql stable
set search_path = public
as $function$
declare
  v_ind text := public.indicador_id_canonico(p_indicador);
  v_nome_completo text;
  v_monday_user_id bigint;
begin
  if p_cs is not null and v_ind not in ('churn', 'churn_por_motivo') then
    select c.nome_completo, c.monday_user_id into v_nome_completo, v_monday_user_id
    from public.cs_config c where lower(trim(c.nome)) = lower(trim(p_cs));
    if v_nome_completo is null then return; end if;
  end if;

  if v_ind in ('churn', 'churn_por_motivo') then
    return query
      select date_trunc('month', f.data_referencia)::date, f.data_referencia, 1::numeric
      from public.churn_filtrados_multi(date '1900-01-01', date '2999-12-31', p_cs, p_cs_categoria, p_produtos, p_incluir_comunidade) f
      where v_ind = 'churn' or f.motivo_principal = p_motivo;

  elsif v_ind in ('rounds_realizados', 'rounds_pessoas') then
    return query
      select coalesce(public.mes_grupo_para_data(r.mes_grupo_titulo), date_trunc('month', (r.inicio at time zone 'America/Sao_Paulo'))::date),
             (r.inicio at time zone 'America/Sao_Paulo')::date,
             case when v_ind = 'rounds_realizados' then 1::numeric else coalesce(r.numero_pessoas, 0) end
      from public.rounds_items r
      where r.status = 'Realizado'
        and (p_cs is null or exists (
          select 1 from unnest(string_to_array(r.cs_responsavel_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)));

  elsif v_ind = 'matchmakings' then
    return query
      select public.mes_grupo_para_data(m.mes_grupo_titulo), m.data, 1::numeric
      from public.matchmakings_items m
      where public.mes_grupo_para_data(m.mes_grupo_titulo) is not null
        and (p_cs is null or m.creator_id = v_monday_user_id);

  elsif v_ind in ('matchmakings_reports', 'indicacoes') then
    return query
      select date_trunc('month', d.dia)::date, d.dia,
             case when v_ind = 'indicacoes' then coalesce(d.indicacoes, 0) else coalesce(d.matchmakings, 0) end::numeric
      from (
        select coalesce(rs.data, (rs.created_at_monday at time zone 'America/Sao_Paulo')::date) as dia,
               rs.indicacoes, rs.matchmakings, rs.creator_id
        from public.reports_semanais_items rs
      ) d
      where d.dia is not null and (p_cs is null or d.creator_id = v_monday_user_id);

  elsif v_ind = 'cases_sucesso' then
    return query
      select public.mes_grupo_para_data(c.mes_grupo_titulo), null::date, 1::numeric
      from public.cases_items c
      where public.mes_grupo_para_data(c.mes_grupo_titulo) is not null
        and (p_cs is null or exists (
          select 1 from unnest(string_to_array(c.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)));

  elsif v_ind in ('upsell', 'downsell') then
    return query
      select date_trunc('month', u.data)::date, u.data, 1::numeric
      from public.upsell_downsell_items u
      where u.data is not null and u.status = 'Finalizado'
        and u.tipo_troca ilike (v_ind || '%')
        and (p_cs is null or exists (
          select 1 from unnest(string_to_array(u.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)));
  end if;
  return;
end;
$function$;

-- Série mensal: valor e volume de linhas por mês. NPS usa a régua padrão (nota 9 a 10 promotor,
-- 0 a 6 detrator, score = promotores menos detratores sobre o total) em nota_conselheiro.
create or replace function public.indicador_serie_mensal(
  p_indicador text, p_cs text default null, p_motivo text default null,
  p_produtos text[] default null, p_incluir_comunidade boolean default true, p_cs_categoria text default null)
returns table (mes date, valor numeric, volume integer)
language plpgsql stable
set search_path = public
as $function$
declare
  v_ind text := public.indicador_id_canonico(p_indicador);
begin
  if v_ind = 'nps' then
    if p_cs is not null then return; end if;
    return query
      select public.mes_grupo_para_data(n.mes_grupo_titulo),
             round(100.0 * (count(*) filter (where n.nota_conselheiro >= 9) - count(*) filter (where n.nota_conselheiro < 7))
                   / nullif(count(n.nota_conselheiro), 0), 0)::numeric,
             count(n.nota_conselheiro)::integer
      from public.nps_conselhos_items n
      where n.nota_conselheiro is not null and public.mes_grupo_para_data(n.mes_grupo_titulo) is not null
      group by 1;
    return;
  end if;
  return query
    select p.mes, sum(p.valor), count(*)::integer
    from public.indicador_pontos(p_indicador, p_cs, p_motivo, p_produtos, p_incluir_comunidade, p_cs_categoria) p
    where p.mes is not null
    group by p.mes;
end;
$function$;

-- Recorde de um indicador (e opcionalmente de um CS, de um motivo ou de um recorte de churn).
create or replace function public.indicador_recordes(
  p_indicador text, p_cs text default null, p_motivo text default null,
  p_produtos text[] default null, p_incluir_comunidade boolean default true, p_cs_categoria text default null)
returns table (
  indicador text,
  recorde_mensal_valor numeric, recorde_mensal_mes date, recorde_mensal_em_andamento boolean, meses_no_recorde integer,
  recorde_semanal_valor numeric, recorde_semanal_mes date, recorde_semanal_semana integer, recorde_semanal_em_andamento boolean,
  valor_mes_corrente numeric, diferenca_mensal numeric, historico_desde date, calculado_em timestamptz)
language plpgsql stable
set search_path = public
as $function$
declare
  v_ind text := public.indicador_id_canonico(p_indicador);
  v_mes_atual date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  v_volume_min integer := case when public.indicador_id_canonico(p_indicador) = 'nps' then 30 else 0 end;
  v_m_valor numeric; v_m_mes date; v_m_n integer; v_atual numeric; v_desde date;
  v_s_valor numeric; v_s_mes date; v_s_sem integer;
begin
  if not coalesce(public.is_moai_user(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_cs is not null and not coalesce(public.is_gestor(), false)
     and lower(coalesce(public.meu_cs(), '')) <> lower(p_cs) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_ind not in ('churn', 'churn_por_motivo', 'rounds_realizados', 'rounds_pessoas', 'matchmakings',
                   'matchmakings_reports', 'cases_sucesso', 'indicacoes', 'upsell', 'downsell', 'nps') then
    raise exception 'indicador desconhecido' using errcode = '22023';
  end if;

  -- NPS só vale com base mínima de respostas no mês (tanto para o recorde quanto para o mês corrente)
  with s as materialized (
    select * from public.indicador_serie_mensal(v_ind, p_cs, p_motivo, p_produtos, p_incluir_comunidade, p_cs_categoria)
  ), ok as (
    select * from s where s.volume >= v_volume_min
  )
  select (select o.valor from ok o order by o.valor desc, o.mes asc limit 1),
         (select o.mes from ok o order by o.valor desc, o.mes asc limit 1),
         (select count(*)::integer from ok o where o.valor = (select max(o2.valor) from ok o2)),
         (select o3.valor from ok o3 where o3.mes = v_mes_atual),
         (select min(s3.mes) from s s3)
    into v_m_valor, v_m_mes, v_m_n, v_atual, v_desde;

  -- semanal só existe para indicador com dia por registro (semana do mês: 1 a 7, 8 a 14, ...)
  select date_trunc('month', p.dia)::date, public.semana_do_mes(p.dia), sum(p.valor)
    into v_s_mes, v_s_sem, v_s_valor
  from public.indicador_pontos(v_ind, p_cs, p_motivo, p_produtos, p_incluir_comunidade, p_cs_categoria) p
  where p.dia is not null
  group by 1, 2
  order by 3 desc, 1 asc, 2 asc
  limit 1;

  indicador := v_ind;
  recorde_mensal_valor := v_m_valor;
  recorde_mensal_mes := v_m_mes;
  recorde_mensal_em_andamento := v_m_mes is not null and v_m_mes = v_mes_atual;
  meses_no_recorde := v_m_n;
  recorde_semanal_valor := v_s_valor;
  recorde_semanal_mes := v_s_mes;
  recorde_semanal_semana := v_s_sem;
  recorde_semanal_em_andamento := v_s_mes is not null and v_s_mes = v_mes_atual;
  valor_mes_corrente := case when v_ind = 'nps' then v_atual else coalesce(v_atual, 0) end;
  diferenca_mensal := case when v_m_valor is null or valor_mes_corrente is null then null else valor_mes_corrente - v_m_valor end;
  historico_desde := v_desde;
  calculado_em := now();
  return next;
end;
$function$;

-- Recorde individual por CS ativo, com a atribuição de indicador_pontos. Nenhuma linha para ex CS.
create or replace function public.recordes_por_cs(p_indicador text)
returns table (
  cs_nome text, recorde_mensal_valor numeric, recorde_mensal_mes date, recorde_mensal_em_andamento boolean,
  valor_mes_corrente numeric, diferenca_mensal numeric)
language plpgsql stable
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select c.nome, r.recorde_mensal_valor, r.recorde_mensal_mes, r.recorde_mensal_em_andamento,
         r.valor_mes_corrente, r.diferenca_mensal
  from public.cs_config c
  cross join lateral public.indicador_recordes(p_indicador, c.nome) r
  where c.ativo
  order by c.nome;
end;
$function$;

-- Painel único de recordes (gestor): todos os indicadores, valor do mês corrente, meta do mês e
-- recorde. Com p_cs, o mesmo painel para um CS ativo.
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
    (1, 'churn', 'Churn', 'churn'),
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
  cross join lateral public.indicador_recordes(i.id, p_cs) r
  left join lateral (
    select rm.valor from public.resolver_meta(i.chave_catalogo, case when p_cs is null then 'time' else 'cs' end, p_cs, v_mes_atual) rm
    where i.chave_catalogo is not null
  ) m on true
  order by i.ordem;
end;
$function$;

-- ============ 4. permissões ============
revoke execute on function public.churn_normalizar_produto(text) from public, anon;
revoke execute on function public.churn_filtrados_multi(date, date, text, text, text[], boolean) from public, anon;
revoke execute on function public.churn_periodos(text, date, date) from public, anon;
revoke execute on function public.churn_serie(text, date, date, text, text, text[], boolean) from public, anon;
revoke execute on function public.churn_comunidade_resumo(text, date, date) from public, anon;
revoke execute on function public.churn_recorte_hash(date, date, text, text, text[], boolean) from public, anon;
revoke execute on function public.churn_itens_recorte(date, date, text, text, text[], boolean) from public, anon;
revoke execute on function public.indicador_id_canonico(text) from public, anon;
revoke execute on function public.indicador_pontos(text, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.indicador_serie_mensal(text, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.indicador_recordes(text, text, text, text[], boolean, text) from public, anon;
revoke execute on function public.recordes_por_cs(text) from public, anon;
revoke execute on function public.recordes_painel(text) from public, anon;

grant execute on function public.churn_normalizar_produto(text) to authenticated;
grant execute on function public.churn_filtrados_multi(date, date, text, text, text[], boolean) to authenticated;
grant execute on function public.churn_periodos(text, date, date) to authenticated;
grant execute on function public.churn_serie(text, date, date, text, text, text[], boolean) to authenticated;
grant execute on function public.churn_comunidade_resumo(text, date, date) to authenticated;
grant execute on function public.churn_recorte_hash(date, date, text, text, text[], boolean) to authenticated;
grant execute on function public.churn_itens_recorte(date, date, text, text, text[], boolean) to authenticated;
grant execute on function public.indicador_id_canonico(text) to authenticated;
grant execute on function public.indicador_pontos(text, text, text, text[], boolean, text) to authenticated;
grant execute on function public.indicador_serie_mensal(text, text, text, text[], boolean, text) to authenticated;
grant execute on function public.indicador_recordes(text, text, text, text[], boolean, text) to authenticated;
grant execute on function public.recordes_por_cs(text) to authenticated;
grant execute on function public.recordes_painel(text) to authenticated;

-- ============ 5. salvar análise e rascunho da IA com o hash do recorte vindo do app ============
-- As versões antigas calculavam base_hash com churn_recorte_hash de cinco argumentos, que não
-- entende a seleção múltipla de produtos nem a Comunidade (o aviso de análise desatualizada
-- dispararia sempre). As sobrecargas abaixo recebem o hash calculado pelo app com o filtro novo.
-- As antigas continuam existindo, sem uso.
create or replace function public.registrar_rascunho_churn_ia(
  p_periodo_tipo text, p_inicio date, p_fim date, p_filtro_cs text, p_filtro_produto text,
  p_filtro_cs_categoria text, p_texto_ia text, p_modelo_ia text, p_base_hash text)
returns uuid
language plpgsql security definer
set search_path = public
as $function$
declare
  v_id uuid;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform public.churn_validar_recorte(p_periodo_tipo, p_inicio, p_fim, p_filtro_cs_categoria);
  if nullif(trim(coalesce(p_texto_ia, '')), '') is null or length(p_texto_ia) > 30000 then
    raise exception 'texto da IA vazio ou longo demais' using errcode = '22023';
  end if;

  insert into public.churn_analises (periodo_tipo, data_inicio, data_fim, filtro_cs, filtro_produto, filtro_cs_categoria,
                                     texto_ia, base_hash, modelo_ia, gerado_em)
  values (p_periodo_tipo, p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria, p_texto_ia,
          left(p_base_hash, 64), left(p_modelo_ia, 100), now())
  on conflict (periodo_tipo, data_inicio, data_fim, coalesce(filtro_cs, ''), coalesce(filtro_produto, ''), coalesce(filtro_cs_categoria, ''))
  do update set texto_ia = excluded.texto_ia, base_hash = excluded.base_hash,
                modelo_ia = excluded.modelo_ia, gerado_em = excluded.gerado_em
  returning id into v_id;

  perform public.log_access('registrar_rascunho_churn_ia', 'success', jsonb_build_object('analise_id', v_id),
                            p_periodo_tipo || '|' || p_inicio || '|' || p_fim);
  return v_id;
end;
$function$;

create or replace function public.salvar_churn_analise(
  p_periodo_tipo text, p_inicio date, p_fim date, p_filtro_cs text, p_filtro_produto text,
  p_filtro_cs_categoria text, p_texto_gestor text, p_base_hash text)
returns uuid
language plpgsql security definer
set search_path = public
as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_id uuid;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform public.churn_validar_recorte(p_periodo_tipo, p_inicio, p_fim, p_filtro_cs_categoria);
  if nullif(trim(coalesce(p_texto_gestor, '')), '') is null or length(p_texto_gestor) > 30000 then
    raise exception 'texto vazio ou longo demais' using errcode = '22023';
  end if;

  insert into public.churn_analises (periodo_tipo, data_inicio, data_fim, filtro_cs, filtro_produto, filtro_cs_categoria,
                                     texto_gestor, status, base_hash, editado_por, editado_em)
  values (p_periodo_tipo, p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria, p_texto_gestor, 'rascunho',
          left(p_base_hash, 64), v_actor, now())
  on conflict (periodo_tipo, data_inicio, data_fim, coalesce(filtro_cs, ''), coalesce(filtro_produto, ''), coalesce(filtro_cs_categoria, ''))
  do update set texto_gestor = excluded.texto_gestor, status = 'rascunho', base_hash = excluded.base_hash,
                editado_por = excluded.editado_por, editado_em = excluded.editado_em
  returning id into v_id;

  perform public.log_access('salvar_churn_analise', 'success', jsonb_build_object('analise_id', v_id),
                            p_periodo_tipo || '|' || p_inicio || '|' || p_fim);
  return v_id;
end;
$function$;

revoke execute on function public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text, text) from public, anon;
revoke execute on function public.salvar_churn_analise(text, date, date, text, text, text, text, text) from public, anon;
grant execute on function public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.salvar_churn_analise(text, date, date, text, text, text, text, text) to authenticated;
