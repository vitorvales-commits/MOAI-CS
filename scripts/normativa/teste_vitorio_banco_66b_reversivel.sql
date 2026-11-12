-- Teste reversível do PR 66b (12/11/2026): equivalência das funções com "CS do dash" vazia, e crédito
-- pela coluna quando preenchida. Roda na cópia descartável, depois de supabase/migrations/20261112b_matchmakings_cs_funcoes.sql
-- aplicada (o workflow testar-migracao aplica a migração antes do teste). Termina com erro proposital: a mensagem
-- TESTE_VITORIO_BANCO_66B_OK significa que as verificações passaram e que nada ficou aplicado (a transação inteira é desfeita).
--
-- Como a migração já está aplicada quando o teste roda, a saída de ANTES vem das cópias legado_* deste arquivo: são o
-- corpo das funções antes da 20261112b, com o mesmo texto de produção (o único trecho trocado é creator_id por
-- cs_monday_user_id nas linhas de matchmakings_items; em atualizar_pendencias, o bloco de matchmakings de origem).
-- Cada cópia foi conferida contra o hash de produção (md5 do corpo normalizado) antes de entrar aqui.
-- Os corpos abaixo também são a prova de que nada além disso mudou: o gerador compara o hash de cada um.


create or replace function public.legado_metas_cs_base(p_cs text default null::text, p_mes date default null::date)
returns table(cs text, mes date, metrica text, direcao text, meta numeric, alcancado_manual numeric, realizado_calculado numeric, realizado numeric, fonte text, status text, percentual numeric, divergencia boolean)
language plpgsql stable set search_path to 'public' as $function$
declare
  v_mes date := date_trunc('month', coalesce(p_mes, current_date))::date;
begin
  return query
  with alvo_cs as (
    select s.nome as cs, s.nome_completo, s.monday_user_id
    from public.cs_config s
    where (p_cs is null or lower(s.nome) = lower(trim(p_cs)) or lower(s.nome_completo) like '%'||lower(trim(p_cs))||'%')
  ),
  manual as (
    select s.nome as cs, public.metrica_canonica(ms.item_metrica) as metrica, max(ms.alcancado) as alcancado_manual
    from public.metas_subitens ms
    join public.cs_config s on lower(trim(s.nome)) = lower(trim(ms.cs_nome))
    where public.mes_grupo_para_data(ms.mes_grupo_titulo) = v_mes and ms.alcancado is not null
      and (p_cs is null or lower(s.nome) = lower(trim(p_cs)) or lower(s.nome_completo) like '%'||lower(trim(p_cs))||'%')
    group by 1, 2
  ),
  chaves as (
    select ac.cs, ac.nome_completo, ac.monday_user_id, ic.chave as metrica, ic.direcao
    from alvo_cs ac
    cross join public.indicadores_catalogo ic
    where ic.chave <> 'carteira'
      and (
        exists (select 1 from public.resolver_meta(ic.chave, 'cs', ac.cs, v_mes))
        or exists (select 1 from manual mn where mn.cs = ac.cs and mn.metrica = ic.chave)
      )
  ),
  f as (
    select k.cs, k.nome_completo, k.monday_user_id, v_mes as mes, k.metrica, k.direcao,
      (select rm.valor from public.resolver_meta(k.metrica, 'cs', k.cs, v_mes) rm) as meta,
      (select mn.alcancado_manual from manual mn where mn.cs = k.cs and mn.metrica = k.metrica) as alcancado_manual
    from chaves k
  ),
  c as (
    select f.*,
      case f.metrica
        when 'cases' then (select count(*) from public.cases_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        when 'matchmakings' then (select count(*) from public.matchmakings_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.creator_id=f.monday_user_id)
        when 'rounds' then (select count(*) from public.rounds_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.status='Realizado' and lower(x.cs_responsavel_raw) like '%'||lower(f.nome_completo)||'%')
        when 'churn' then (select count(*) from public.churn_items x where date_trunc('month',x.data)=f.mes and lower(trim(x.quem_e_seu_cs)) like lower(f.cs)||'%')
        when 'indicacoes' then (select coalesce(sum(x.indicacoes),0) from public.reports_semanais_items x where x.creator_id=f.monday_user_id and date_trunc('month',coalesce(x.data,x.created_at_monday::date))=f.mes)
        when 'upsell' then (select count(*) from public.upsell_downsell_items x where lower(x.tipo_troca) like 'upsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        when 'downsell' then (select count(*) from public.upsell_downsell_items x where lower(x.tipo_troca) like 'downsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        else null end as calc
    from f
  )
  select c.cs, c.mes, c.metrica, c.direcao, c.meta, c.alcancado_manual, c.calc::numeric,
    coalesce(c.calc::numeric, c.alcancado_manual, 0) as realizado,
    case when c.calc is not null then 'calculado' when c.alcancado_manual is not null then 'manual' else 'sem_dado' end as fonte,
    case
      when c.meta is null then 'sem_meta'
      when c.direcao='min' and coalesce(c.calc::numeric, c.alcancado_manual, 0) >= c.meta then 'bateu'
      when c.direcao='max' and coalesce(c.calc::numeric, c.alcancado_manual, 0) <= c.meta then 'bateu'
      else 'nao_bateu' end as status,
    case when c.meta is null or c.meta = 0 then null
      else round(100 * coalesce(c.calc::numeric, c.alcancado_manual, 0) / c.meta, 0) end as percentual,
    (c.calc is not null and c.alcancado_manual is not null and c.calc::numeric <> c.alcancado_manual) as divergencia
  from c
  order by c.cs, c.metrica;
end;
$function$;


create or replace function public.legado_indicador_pontos(p_indicador text, p_cs text default null::text, p_motivo text default null::text, p_produtos text[] default null::text[], p_incluir_comunidade boolean default true, p_cs_categoria text default null::text)
returns table(mes date, dia date, valor numeric)
language plpgsql stable set search_path to 'public' as $function$
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


create or replace function public.legado_historico_indicador(p_indicador text, p_escopo text, p_cs_nome text)
returns table(mes date, realizado numeric)
language plpgsql stable set search_path to 'public' as $function$
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
    -- D7: mês do registro do resultado, em horário de Brasília. Sem filtro de grupo.
    return query
      select date_trunc('month', (m.resultado_registrado_em at time zone 'America/Sao_Paulo'))::date, count(*)::numeric
      from public.matchmakings_items m
      where m.resultado_registrado_em is not null
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


create or replace function canonico.legado_atualizar_pendencias()
returns integer
language sql set search_path to '' as $function$
  with origem as (
    select 'texto'::text as tipo, 'churn_items.quem_e_seu_cs'::text as fonte, c.quem_e_seu_cs as bruto, c.synced_at::date as dia
    from public.churn_items c
    union all
    select 'texto', 'metas_subitens.cs_nome', m.cs_nome, m.synced_at::date from public.metas_subitens m
    union all
    select 'texto', 'cases_items.cs_raw', x.v, c.synced_at::date
    from public.cases_items c cross join lateral regexp_split_to_table(coalesce(c.cs_raw, ''), ',') as x(v)
    union all
    select 'texto', 'upsell_downsell_items.cs_raw', x.v, u.synced_at::date
    from public.upsell_downsell_items u cross join lateral regexp_split_to_table(coalesce(u.cs_raw, ''), ',') as x(v)
    union all
    select 'texto', 'rounds_items.cs_responsavel_raw', x.v, r.synced_at::date
    from public.rounds_items r cross join lateral regexp_split_to_table(coalesce(r.cs_responsavel_raw, ''), ',') as x(v)
    union all
    select 'monday_user_id', 'reports_semanais_items.creator_id', r.creator_id::text, r.synced_at::date
    from public.reports_semanais_items r where r.creator_id is not null
    union all
    select 'monday_user_id', 'matchmakings_items.creator_id', m.creator_id::text, m.synced_at::date
    from public.matchmakings_items m where m.creator_id is not null
  ),
  pendentes as (
    select o.tipo, o.fonte, o.bruto as texto_original, canonico.normalizar(o.bruto) as texto_normalizado, o.dia
    from origem o
    where coalesce(canonico.normalizar(o.bruto), '') <> ''
      and not exists (select 1 from canonico.cs_apelidos a where a.texto_normalizado = canonico.normalizar(o.bruto))
      and case when o.tipo = 'monday_user_id'
            then not exists (select 1 from canonico.cs c where c.monday_user_id::text = o.bruto)
            else true end
  ),
  ins as (
    insert into canonico.vinculos_pendentes as v
      (tipo, texto_original, texto_normalizado, fontes, ocorrencias, primeira_vez, ultima_vez, sugestao_cs_id)
    select p.tipo, min(p.texto_original), p.texto_normalizado, array_agg(distinct p.fonte order by p.fonte),
           count(*), min(p.dia), max(p.dia),
           case when p.tipo = 'texto' then
             (select case when count(*) = 1 then min(c.id) end from canonico.cs c
              where canonico.normalizar(c.nome_curto) = split_part(p.texto_normalizado, ' ', 1))
           end
    from pendentes p
    group by p.tipo, p.texto_normalizado
    on conflict (tipo, texto_normalizado) do update set
      texto_original = excluded.texto_original,
      fontes = excluded.fontes,
      ocorrencias = excluded.ocorrencias,
      ultima_vez = excluded.ultima_vez,
      sugestao_cs_id = excluded.sugestao_cs_id
    returning 1
  ),
  removidas as (
    delete from canonico.vinculos_pendentes v
    where not exists (select 1 from pendentes p where p.tipo = v.tipo and p.texto_normalizado = v.texto_normalizado)
    returning 1
  )
  select ((select count(*) from ins) + (select count(*) from removidas))::integer;
$function$;


do $teste$
declare
  v_vitor bigint;
  v_luana bigint;
  v_ind text;
  v_n bigint;
  v_linha text;
  v_mes_atual date := date_trunc('month', current_date)::date;
  v_mes_ant date := (date_trunc('month', current_date) - interval '1 month')::date;
  r record;
  l_antes_luana numeric; l_antes_vitor numeric;
  l_depois_luana numeric; l_depois_vitor numeric;
  ip_antes_luana bigint; ip_antes_vitor bigint; ip_depois_luana bigint; ip_depois_vitor bigint;
  hi_antes_luana numeric; hi_antes_vitor numeric; hi_depois_luana numeric; hi_depois_vitor numeric;
  mc_antes_luana numeric; mc_antes_vitor numeric; mc_depois_luana numeric; mc_depois_vitor numeric;
  v_cs_monday bigint;
begin
  select c.monday_user_id into v_vitor from public.cs_config c where c.nome = 'Vitor';
  select c.monday_user_id into v_luana from public.cs_config c where c.nome = 'Luana';
  if v_vitor is null or v_luana is null then raise exception 'FALHA preparo: Vitor ou Luana sem monday_user_id'; end if;

  -- 1. Coluna "CS do dash" vazia em todos os matchmakings (a equivalência vale com a coluna vazia).
  update public.matchmakings_items set cs_dash_texto = null where cs_dash_texto is not null;

  -- 1a. Antes: saída das funções antigas (cópias legado_* gravadas neste arquivo, conferidas com o hash de produção).
  create temp table r_metas_antes on commit drop as
    select v_mes_atual as ref, x.* from public.legado_metas_cs_base(null, v_mes_atual) x
    union all
    select v_mes_ant, x.* from public.legado_metas_cs_base(null, v_mes_ant) x;

  create temp table r_ip_antes (ind text, cs text, mes date, dia date, valor numeric) on commit drop;
  create temp table r_hi_antes (ind text, cs text, mes date, realizado numeric) on commit drop;
  foreach v_ind in array array['matchmakings', 'matchmakings_reports', 'indicacoes'] loop
    for r in select c.nome as cs from public.cs_config c loop
      insert into r_ip_antes select v_ind, r.cs, p.mes, p.dia, p.valor from public.legado_indicador_pontos(v_ind, r.cs) p;
    end loop;
  end loop;
  foreach v_ind in array array['matchmakings', 'matchmakings_resultado', 'indicacoes'] loop
    for r in select c.nome as cs from public.cs_config c loop
      insert into r_hi_antes select v_ind, r.cs, h.mes, h.realizado from public.legado_historico_indicador(v_ind, 'cs', r.cs) h;
    end loop;
    insert into r_hi_antes select v_ind, 'TIME', h.mes, h.realizado from public.legado_historico_indicador(v_ind, 'time', null) h;
  end loop;

  create temp table r_vp_antes on commit drop as select * from canonico.vinculos_pendentes;
  perform canonico.legado_atualizar_pendencias();
  create temp table r_vp_antigo on commit drop as select * from canonico.vinculos_pendentes;

  -- 2. Depois: funções novas (a migração já está aplicada). Compara linha a linha.
  create temp table r_metas_depois on commit drop as
    select v_mes_atual as ref, x.* from public.metas_cs_base(null, v_mes_atual) x
    union all
    select v_mes_ant, x.* from public.metas_cs_base(null, v_mes_ant) x;

  create temp table r_ip_depois (ind text, cs text, mes date, dia date, valor numeric) on commit drop;
  create temp table r_hi_depois (ind text, cs text, mes date, realizado numeric) on commit drop;
  foreach v_ind in array array['matchmakings', 'matchmakings_reports', 'indicacoes'] loop
    for r in select c.nome as cs from public.cs_config c loop
      insert into r_ip_depois select v_ind, r.cs, p.mes, p.dia, p.valor from public.indicador_pontos(v_ind, r.cs) p;
    end loop;
  end loop;
  foreach v_ind in array array['matchmakings', 'matchmakings_resultado', 'indicacoes'] loop
    for r in select c.nome as cs from public.cs_config c loop
      insert into r_hi_depois select v_ind, r.cs, h.mes, h.realizado from public.historico_indicador(v_ind, 'cs', r.cs) h;
    end loop;
    insert into r_hi_depois select v_ind, 'TIME', h.mes, h.realizado from public.historico_indicador(v_ind, 'time', null) h;
  end loop;

  select count(*) into v_n from r_metas_antes;
  if v_n = 0 then raise exception 'FALHA preparo: metas_cs_base sem linhas'; end if;
  select count(*) into v_n from r_ip_antes;
  if v_n = 0 then raise exception 'FALHA preparo: indicador_pontos sem linhas'; end if;
  select count(*) into v_n from r_hi_antes;
  if v_n = 0 then raise exception 'FALHA preparo: historico_indicador sem linhas'; end if;

  select x::text into v_linha from (select * from r_metas_antes except select * from r_metas_depois) x limit 1;
  if v_linha is not null then raise exception 'FALHA 1 metas_cs_base: antes sem depois: %', v_linha; end if;
  select x::text into v_linha from (select * from r_metas_depois except select * from r_metas_antes) x limit 1;
  if v_linha is not null then raise exception 'FALHA 1 metas_cs_base: depois sem antes: %', v_linha; end if;

  select x::text into v_linha from (select * from r_ip_antes except select * from r_ip_depois) x limit 1;
  if v_linha is not null then raise exception 'FALHA 2 indicador_pontos: antes sem depois: %', v_linha; end if;
  select x::text into v_linha from (select * from r_ip_depois except select * from r_ip_antes) x limit 1;
  if v_linha is not null then raise exception 'FALHA 2 indicador_pontos: depois sem antes: %', v_linha; end if;

  select x::text into v_linha from (select * from r_hi_antes except select * from r_hi_depois) x limit 1;
  if v_linha is not null then raise exception 'FALHA 3 historico_indicador: antes sem depois: %', v_linha; end if;
  select x::text into v_linha from (select * from r_hi_depois except select * from r_hi_antes) x limit 1;
  if v_linha is not null then raise exception 'FALHA 3 historico_indicador: depois sem antes: %', v_linha; end if;

  -- 2b. canonico.atualizar_pendencias: vinculos_pendentes depois da função antiga e da nova (mesma origem).
  perform canonico.atualizar_pendencias();
  create temp table r_vp_novo on commit drop as select * from canonico.vinculos_pendentes;
  select x::text into v_linha from (select * from r_vp_antigo except select * from r_vp_novo) x limit 1;
  if v_linha is not null then raise exception 'FALHA 4 vinculos_pendentes: antigo sem novo: %', v_linha; end if;
  select x::text into v_linha from (select * from r_vp_novo except select * from r_vp_antigo) x limit 1;
  if v_linha is not null then raise exception 'FALHA 4 vinculos_pendentes: novo sem antigo: %', v_linha; end if;

  -- 3. Matchmaking de teste: conta do Vitor, CS do dash vazia. Depois, "CS do dash" = Luana: o crédito muda.
  insert into public.matchmakings_items (id, board_group_id, mes_grupo_titulo, nome, creator_id, data, cs_dash_texto, resultado, resultado_registrado_em)
  values (9999000002, 'teste', 'Novembro 2026', 'teste banco 66b', v_vitor, date '2026-11-05', null, 'teste', timestamptz '2026-11-06 12:00:00+00');

  select count(*) into ip_antes_luana from public.indicador_pontos('matchmakings', 'Luana');
  select count(*) into ip_antes_vitor from public.indicador_pontos('matchmakings', 'Vitor');
  select coalesce(sum(realizado), 0) into hi_antes_luana from public.historico_indicador('matchmakings_resultado', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hi_antes_vitor from public.historico_indicador('matchmakings_resultado', 'cs', 'Vitor');
  select coalesce(sum(realizado_calculado), 0) into mc_antes_luana from public.metas_cs_base('Luana', date '2026-11-01') where metrica = 'matchmakings';
  select coalesce(sum(realizado_calculado), 0) into mc_antes_vitor from public.metas_cs_base('Vitor', date '2026-11-01') where metrica = 'matchmakings';

  update public.matchmakings_items set cs_dash_texto = 'Luana' where id = 9999000002;
  select cs_monday_user_id into v_cs_monday from public.matchmakings_items where id = 9999000002;
  if v_cs_monday is distinct from v_luana then raise exception 'FALHA 5a: cs_monday_user_id deveria ser o da Luana (%), foi %', v_luana, v_cs_monday; end if;

  select count(*) into ip_depois_luana from public.indicador_pontos('matchmakings', 'Luana');
  select count(*) into ip_depois_vitor from public.indicador_pontos('matchmakings', 'Vitor');
  select coalesce(sum(realizado), 0) into hi_depois_luana from public.historico_indicador('matchmakings_resultado', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hi_depois_vitor from public.historico_indicador('matchmakings_resultado', 'cs', 'Vitor');
  select coalesce(sum(realizado_calculado), 0) into mc_depois_luana from public.metas_cs_base('Luana', date '2026-11-01') where metrica = 'matchmakings';
  select coalesce(sum(realizado_calculado), 0) into mc_depois_vitor from public.metas_cs_base('Vitor', date '2026-11-01') where metrica = 'matchmakings';

  if ip_depois_luana - ip_antes_luana <> 1 or ip_depois_vitor - ip_antes_vitor <> -1 then
    raise exception 'FALHA 5b indicador_pontos: Luana +1 e Vitor -1 esperados, veio Luana %, Vitor %', ip_depois_luana - ip_antes_luana, ip_depois_vitor - ip_antes_vitor;
  end if;
  if hi_depois_luana - hi_antes_luana <> 1 or hi_depois_vitor - hi_antes_vitor <> -1 then
    raise exception 'FALHA 5c historico_indicador(resultado): Luana +1 e Vitor -1 esperados, veio Luana %, Vitor %', hi_depois_luana - hi_antes_luana, hi_depois_vitor - hi_antes_vitor;
  end if;
  if mc_depois_luana - mc_antes_luana <> 1 or mc_depois_vitor - mc_antes_vitor <> -1 then
    raise exception 'FALHA 5d metas_cs_base: Luana +1 e Vitor -1 esperados, veio Luana %, Vitor %', mc_depois_luana - mc_antes_luana, mc_depois_vitor - mc_antes_vitor;
  end if;

  -- 3b. Texto que não resolve para nenhum CS: aparece em vinculos_pendentes com esse texto.
  update public.matchmakings_items set cs_dash_texto = 'texto sem cs xyz' where id = 9999000002;
  perform canonico.atualizar_pendencias();
  select count(*) into v_n from canonico.vinculos_pendentes
   where tipo = 'texto' and texto_normalizado = canonico.normalizar('texto sem cs xyz') and texto_original = 'texto sem cs xyz';
  if v_n <> 1 then raise exception 'FALHA 6 vinculos_pendentes: texto sem CS deveria aparecer 1 vez, apareceu % vez(es)', v_n; end if;

  -- 4. Chamadas como service_role. Os grants espelham produção (verificados por leitura: service_role tem select nas
  -- tabelas de public, execute nas funções, bypassrls, e NÃO tem usage em canonico). Por isso atualizar_pendencias não
  -- é chamada direto aqui: em produção ela roda pelas funções security definer (canonico_confirmar_apelido, cron).
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  alter role service_role bypassrls;
  grant usage on schema public to service_role;
  grant select on all tables in schema public to service_role;
  grant execute on all functions in schema public to service_role;
  execute 'set local role service_role';
  select count(*) into v_n from public.metas_cs_base(null, v_mes_atual);
  if v_n = 0 then raise exception 'FALHA 7a: metas_cs_base como service_role sem linhas'; end if;
  select count(*) into v_n from public.indicador_pontos('matchmakings', 'Luana');
  select count(*) into v_n from public.historico_indicador('matchmakings', 'cs', 'Luana');
  -- consultar_metas_cs exige usuário logado (is_moai_user): como service_role, sem sessão, tem de negar o acesso.
  begin
    perform public.consultar_metas_cs('Luana', v_mes_atual);
    raise exception 'FALHA 7b: consultar_metas_cs deveria negar acesso a service_role sem usuário logado';
  exception when others then
    if sqlerrm <> 'acesso negado' then raise; end if;
  end;
  execute 'reset role';

  raise exception 'TESTE_VITORIO_BANCO_66B_OK';
end
$teste$;
