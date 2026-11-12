-- ============================================================================
-- Vitorio registro, PR 66b (12/11/2026): funções que atribuíam matchmaking por creator_id passam a usar o CS
-- da coluna "CS do dash" (cs_monday_user_id, resolvido no banco pela 20261111a).
--
-- Quando o Vitorio gravar, o item sai com a conta de quem criou e o CS na coluna. Estas funções creditavam a
-- pessoa errada; por isso trocam a comparação de matchmakings_items.creator_id por cs_monday_user_id.
-- Sem coluna preenchida, cs_monday_user_id = creator_id: o resultado é o mesmo de antes.
--
-- Não muda: os trechos de reports_semanais_items, que continuam por creator_id.
-- Assinaturas, tipos de retorno, search_path e permissões são os mesmos (create or replace).
-- ============================================================================

-- metas_cs_base: contagem de matchmakings do mês por CS.
create or replace function public.metas_cs_base(p_cs text default null::text, p_mes date default null::date)
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
        when 'matchmakings' then (select count(*) from public.matchmakings_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.cs_monday_user_id=f.monday_user_id)
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

-- indicador_pontos: pontuação por indicador; matchmakings creditados pelo CS da coluna.
create or replace function public.indicador_pontos(p_indicador text, p_cs text default null::text, p_motivo text default null::text, p_produtos text[] default null::text[], p_incluir_comunidade boolean default true, p_cs_categoria text default null::text)
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
        and (p_cs is null or m.cs_monday_user_id = v_monday_user_id);

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

-- historico_indicador: série mensal; matchmakings e matchmakings_resultado creditados pelo CS da coluna.
create or replace function public.historico_indicador(p_indicador text, p_escopo text, p_cs_nome text)
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
        and (p_escopo = 'time' or m.cs_monday_user_id = v_monday_user_id)
      group by 1;
  elsif p_indicador = 'matchmakings_resultado' then
    -- D7: mês do registro do resultado, em horário de Brasília. Sem filtro de grupo.
    return query
      select date_trunc('month', (m.resultado_registrado_em at time zone 'America/Sao_Paulo'))::date, count(*)::numeric
      from public.matchmakings_items m
      where m.resultado_registrado_em is not null
        and nullif(btrim(m.resultado), '') is not null
        and (p_escopo = 'time' or m.cs_monday_user_id = v_monday_user_id)
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

-- atualizar_pendencias: a pendência de matchmaking vem de canonico.v_matchmakings (classe 'pendente'). Cobre o
-- creator_id não reconhecido e também o texto da coluna "CS do dash" que não resolve para nenhum CS.
-- DECISÃO (12/11/2026, mantida): esta mudança é intencional, não é só a troca de creator_id. Antes, a origem de
-- matchmaking era só matchmakings_items.creator_id. Agora a pendência sai de canonico.v_matchmakings: o texto da
-- "CS do dash" que não resolve aparece em vinculos_pendentes, e a regra de atribuição fica num lugar só.
-- Efeito no teste de equivalência (teste_vitorio_banco_66b_reversivel.sql): com a coluna "CS do dash" vazia, o
-- resultado é igual ao da função antiga. Com texto que não resolve, aparece uma linha a mais, fonte
-- matchmakings_items.cs_dash_texto; o passo 3b do teste confere que essa linha aparece.
create or replace function canonico.atualizar_pendencias()
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
    select case when nullif(btrim(m.cs_dash_texto), '') is not null then 'texto' else 'monday_user_id' end,
           case when nullif(btrim(m.cs_dash_texto), '') is not null then 'matchmakings_items.cs_dash_texto' else 'matchmakings_items.creator_id' end,
           v.cs_texto_original, m.synced_at::date
    from canonico.v_matchmakings v
    join public.matchmakings_items m on m.id = v.chave
    where v.classe = 'pendente'
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

select seguranca.aplicar_protecoes();
