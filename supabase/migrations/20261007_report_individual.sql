-- Report individual nativo e Health da Base como percentual de críticos (07/10/2026,
-- branch feat/report_individual_health_base). Substitui, a partir da data de corte, o board
-- 18394181332 (Reports Individuais CS) do Monday como fonte dos reports semanais.
--
-- Escrita só por função SECURITY DEFINER (nenhuma policy de insert/update/delete). A Edge
-- Function sync-monday grava as linhas de origem monday com a service role. Sem drop policy.
-- Nenhum nome de membro crítico vai para access_audit_log.

-- ============ configuração ============
alter table public.configuracoes_globais add column if not exists data_corte_reports_nativos date;

-- ============ tabelas ============
create table if not exists public.reports_individuais (
  id uuid primary key default gen_random_uuid(),
  cs_nome text,
  cs_nome_original text,
  cs_categoria text not null default 'nao_mapeado' check (cs_categoria in ('cs_ativo', 'cs_ex', 'nao_mapeado')),
  semana_inicio date not null check (extract(isodow from semana_inicio) = 1),
  data_report date,
  data_aproximada boolean not null default false,
  como_foi_semana text check (como_foi_semana in ('fluindo', 'atencao', 'critica')),
  nota_semana smallint check (nota_semana between 0 and 10),
  risco_se_ignorar text,
  por_que text,
  baixo_engajamento integer check (baixo_engajamento >= 0),
  medio_engajamento integer check (medio_engajamento >= 0),
  alto_engajamento integer check (alto_engajamento >= 0),
  indicacoes integer check (indicacoes >= 0),
  matchmakings integer check (matchmakings >= 0),
  churns_revertidos integer check (churns_revertidos >= 0),
  pedidos_churn integer check (pedidos_churn >= 0),
  check_atas_crm text check (check_atas_crm in ('em_andamento', 'feito', 'parado')),
  check_confirmacoes text check (check_confirmacoes in ('em_andamento', 'feito', 'parado')),
  check_gtd text check (check_gtd in ('em_andamento', 'feito', 'parado')),
  check_kpis text check (check_kpis in ('em_andamento', 'feito', 'parado')),
  -- base_total: snapshot dos membros elegíveis no envio (nativo) ou soma declarada no Monday
  -- (críticos + baixo + médio + alto) no importado, ver base_origem.
  base_total integer check (base_total >= 0),
  base_origem text not null default 'snapshot_carteira' check (base_origem in ('snapshot_carteira', 'declarada_monday')),
  criticos_total integer check (criticos_total >= 0),
  criticos_origem text not null default 'nomeados' check (criticos_origem in ('nomeados', 'contagem_monday')),
  origem text not null check (origem in ('nativo', 'monday')),
  monday_item_id bigint unique,
  criado_por text,
  atualizado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint reports_individuais_nativo_tem_cs check (origem = 'monday' or (cs_nome is not null and cs_categoria = 'cs_ativo')),
  constraint reports_individuais_criticos_na_base check (origem = 'monday' or criticos_total is null or base_total is null or criticos_total <= base_total)
);
create unique index if not exists reports_individuais_nativo_semana
  on public.reports_individuais (cs_nome, semana_inicio) where origem = 'nativo';
create index if not exists reports_individuais_cs_semana on public.reports_individuais (cs_nome, semana_inicio desc);

create table if not exists public.reports_individuais_criticos (
  report_id uuid not null references public.reports_individuais(id) on delete cascade,
  membro_id bigint not null,
  group_id text,
  nome_snapshot text not null,
  primary key (report_id, membro_id)
);

-- Mapa do nome digitado no board para o CS. aplicado = usado pela sync; confirmado = conferido
-- pelo Vitor. Proposta inequívoca já nasce aplicada; o resto espera confirmação.
create table if not exists public.reports_cs_aliases (
  nome_digitado_normalizado text primary key,
  exemplo_digitado text,
  cs_nome text,
  cs_nome_proposto text,
  cs_categoria text not null default 'nao_mapeado' check (cs_categoria in ('cs_ativo', 'cs_ex', 'nao_mapeado')),
  aplicado boolean not null default false,
  confirmado boolean not null default false,
  confirmado_por text,
  observacao text
);

alter table public.reports_individuais enable row level security;
alter table public.reports_individuais_criticos enable row level security;
alter table public.reports_cs_aliases enable row level security;

-- Leitura: gestor tudo; CS comum só as próprias linhas (coalesce por causa de rpc_nulo_if).
create policy reports_individuais_select on public.reports_individuais for select to authenticated
  using (public.is_gestor() or coalesce(cs_nome = public.meu_cs(), false));
create policy reports_individuais_criticos_select on public.reports_individuais_criticos for select to authenticated
  using (exists (select 1 from public.reports_individuais r where r.id = report_id
                 and (public.is_gestor() or coalesce(r.cs_nome = public.meu_cs(), false))));
create policy reports_cs_aliases_select on public.reports_cs_aliases for select to authenticated
  using (public.is_gestor());

-- ============ membros elegíveis (fonte única) ============
-- Titulares de grupos ativos (não repo, título "Nível | Conselheiro (CS)"), sem Conselheiro,
-- Sócio de Conselheiro, Mentor Alavanca e status nulo (os dois últimos fora até decisão do Vitor).
-- cs_nomes = CS ativos cujo "(Apelido)" aparece no título, o mesmo vínculo de gruposDaCarteira em
-- lib/reports.ts. Alimenta o kanban da Visão da rede, o menu do report, o denominador do Health
-- e o total da rede. Expõe só o que conselhos_membros já expõe a qualquer usuário MOAI.
create or replace function public.membros_elegiveis_rede()
returns table(membro_id bigint, nome text, group_id text, conselho text, cs_nomes text[])
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select m.id, m.nome, g.group_id,
    trim(regexp_replace(g.titulo, '\[?congelado\]?', '', 'i')),
    coalesce((select array_agg(c.nome order by c.nome) from public.cs_config c
              where c.ativo and coalesce(c.apelido_conselho, '') <> ''
                and position('(' || public.normalizar_nome_sql(c.apelido_conselho) || ')' in public.normalizar_nome_sql(g.titulo)) > 0),
             '{}'::text[])
  from public.conselhos_membros m
  join public.conselhos_grupos g on g.group_id = m.group_id
  where not g.is_repo
    and g.titulo !~* '^reposi'
    and regexp_replace(g.titulo, '\[?congelado\]?', '', 'i') ~ '\|\s*[^|()]*[^|()\s][^|()]*\s*\('
    and m.status_pagamento is not null
    and m.status_pagamento not in ('Conselheiro', 'Sócio de Conselheiro', 'Mentor Alavanca');
end; $$;

-- Resolve o CS alvo: gestor pode pedir qualquer CS (ou o próprio, se nulo); CS comum só o
-- próprio; sem vínculo recebe 42501.
create or replace function public.report_resolver_cs(p_cs text)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare v_meu text := public.meu_cs(); v_cs text;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  if public.is_gestor() then
    v_cs := coalesce(nullif(trim(p_cs), ''), v_meu);
  else
    if v_meu is null then raise exception 'not authorized' using errcode = '42501'; end if;
    if nullif(trim(p_cs), '') is not null and not coalesce(lower(trim(p_cs)) = lower(v_meu), false) then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    v_cs := v_meu;
  end if;
  select c.nome into v_cs from public.cs_config c where lower(c.nome) = lower(v_cs);
  if v_cs is null then raise exception 'CS não encontrado' using errcode = 'P0002'; end if;
  return v_cs;
end; $$;

create or replace function public.membros_da_base_cs(p_cs text default null)
returns table(membro_id bigint, nome text, group_id text, conselho text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_cs text := public.report_resolver_cs(p_cs);
begin
  return query select e.membro_id, e.nome, e.group_id, e.conselho
    from public.membros_elegiveis_rede() e where v_cs = any(e.cs_nomes)
    order by e.conselho, e.nome;
end; $$;

-- ============ reports vigentes ============
-- Nativo vale sempre. Importado do Monday vale antes da data de corte (ou sempre, se nula) e só
-- quando não há nativo do mesmo CS na mesma semana; com dois importados na mesma semana vale o
-- mais recente. SECURITY INVOKER: chamado direto, a RLS filtra; dentro das funções DEFINER abaixo,
-- vê tudo e cada função aplica sua própria regra de permissão.
create or replace function public.reports_vigentes()
returns setof public.reports_individuais language sql stable set search_path to 'public' as $$
  with corte as (select (select cg.data_corte_reports_nativos from public.configuracoes_globais cg where cg.id = true) as d),
  importados as (
    select r.id, row_number() over (partition by coalesce(r.cs_nome, r.cs_nome_original), r.semana_inicio
                                    order by r.criado_em desc, r.monday_item_id desc) as rn
    from public.reports_individuais r, corte
    where r.origem = 'monday' and (corte.d is null or r.semana_inicio < corte.d)
      and not exists (select 1 from public.reports_individuais n
                      where n.origem = 'nativo' and n.cs_nome = r.cs_nome and n.semana_inicio = r.semana_inicio)
  )
  select r.* from public.reports_individuais r
  where r.origem = 'nativo' or r.id in (select i.id from importados i where i.rn = 1);
$$;

-- Resumo numérico por report vigente, para indicadores (sem nomes de membros). Indicações,
-- matchmakings e nota saem para qualquer usuário MOAI, como já saíam de reports_semanais_items;
-- críticos e base só para gestor ou para o próprio CS (CS comum nunca vê o Health de outro CS).
create or replace function public.reports_resumo_cs()
returns table(cs_nome text, cs_categoria text, semana_inicio date, data_report date, data_aproximada boolean,
              origem text, nota_semana smallint, indicacoes integer, matchmakings integer,
              criticos_total integer, base_total integer, base_origem text, criticos_origem text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_gestor boolean := public.is_gestor(); v_meu text := public.meu_cs();
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select r.cs_nome, r.cs_categoria, r.semana_inicio, r.data_report, r.data_aproximada, r.origem,
      r.nota_semana, r.indicacoes, r.matchmakings,
      case when v_gestor or coalesce(r.cs_nome = v_meu, false) then r.criticos_total end,
      case when v_gestor or coalesce(r.cs_nome = v_meu, false) then r.base_total end,
      r.base_origem, r.criticos_origem
    from public.reports_vigentes() r
    order by r.cs_nome, r.semana_inicio;
end; $$;

-- Report (vigente) de uma semana, com os críticos nominais, mais o report nativo anterior (para o
-- botão Copiar da semana anterior). Mesmas regras de permissão de report_resolver_cs.
create or replace function public.report_individual_semana(p_cs text, p_semana date)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_cs text := public.report_resolver_cs(p_cs); v_atual jsonb; v_anterior jsonb;
begin
  select to_jsonb(r) || jsonb_build_object('criticos', coalesce((
      select jsonb_agg(jsonb_build_object('membro_id', c.membro_id, 'nome', c.nome_snapshot, 'group_id', c.group_id) order by c.nome_snapshot)
      from public.reports_individuais_criticos c where c.report_id = r.id), '[]'::jsonb))
    into v_atual
    from public.reports_vigentes() r where r.cs_nome = v_cs and r.semana_inicio = p_semana
    order by (r.origem = 'nativo') desc limit 1;
  select to_jsonb(r) || jsonb_build_object('criticos', coalesce((
      select jsonb_agg(jsonb_build_object('membro_id', c.membro_id, 'nome', c.nome_snapshot, 'group_id', c.group_id) order by c.nome_snapshot)
      from public.reports_individuais_criticos c where c.report_id = r.id), '[]'::jsonb))
    into v_anterior
    from public.reports_individuais r where r.cs_nome = v_cs and r.origem = 'nativo' and r.semana_inicio < p_semana
    order by r.semana_inicio desc limit 1;
  return jsonb_build_object('cs', v_cs, 'semana', p_semana, 'report', v_atual, 'anterior', v_anterior);
end; $$;

-- Série semanal do CS (vigentes), sem nomes de membros.
create or replace function public.reports_historico_cs(p_cs text default null)
returns table(report_id uuid, semana_inicio date, origem text, data_report date, data_aproximada boolean,
              como_foi_semana text, nota_semana smallint, criticos_total integer, base_total integer,
              base_origem text, check_atas_crm text, check_confirmacoes text, check_gtd text, check_kpis text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_cs text := public.report_resolver_cs(p_cs);
begin
  return query select r.id, r.semana_inicio, r.origem, r.data_report, r.data_aproximada, r.como_foi_semana,
      r.nota_semana, r.criticos_total, r.base_total, r.base_origem,
      r.check_atas_crm, r.check_confirmacoes, r.check_gtd, r.check_kpis
    from public.reports_vigentes() r where r.cs_nome = v_cs
    order by r.semana_inicio desc;
end; $$;

-- Críticos do report vigente mais recente do CS, com há quantos reports nativos consecutivos
-- cada membro aparece como crítico e desde qual semana. Derivado das tabelas, sem coluna extra.
create or replace function public.criticos_atuais_cs(p_cs text default null)
returns table(membro_id bigint, nome text, group_id text, semanas_consecutivas integer, critico_desde date)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_cs text := public.report_resolver_cs(p_cs); v_ultimo uuid;
begin
  select r.id into v_ultimo from public.reports_vigentes() r
    where r.cs_nome = v_cs order by r.semana_inicio desc, (r.origem = 'nativo') desc limit 1;
  if v_ultimo is null then return; end if;
  return query
  with nativos as (
    select r.id, r.semana_inicio, row_number() over (order by r.semana_inicio desc) as pos
    from public.reports_individuais r
    where r.cs_nome = v_cs and r.origem = 'nativo'
      and r.semana_inicio <= (select ri.semana_inicio from public.reports_individuais ri where ri.id = v_ultimo)
  ),
  marcas as (
    select c.membro_id, n.pos, n.semana_inicio from public.reports_individuais_criticos c join nativos n on n.id = c.report_id
  )
  select c.membro_id, c.nome_snapshot, c.group_id,
    (select coalesce(min(n.pos) - 1, (select max(n2.pos) from nativos n2))::int from nativos n
       where not exists (select 1 from marcas m where m.membro_id = c.membro_id and m.pos = n.pos)),
    (select min(m.semana_inicio) from marcas m where m.membro_id = c.membro_id
       and m.pos <= coalesce((select min(n.pos) - 1 from nativos n
                              where not exists (select 1 from marcas m2 where m2.membro_id = c.membro_id and m2.pos = n.pos)),
                             (select max(n3.pos) from nativos n3)))
  from public.reports_individuais_criticos c
  where c.report_id = v_ultimo
  order by c.nome_snapshot;
end; $$;

-- Valor da área: críticos únicos (nominais dos reports nativos mais recentes de cada CS ativo,
-- mais a contagem dos que ainda só têm report importado) sobre a união dos membros elegíveis das
-- carteiras dos CS ativos, cada membro contado uma vez. Só contagens no retorno.
create or replace function public.health_base_area(p_ate date default null)
returns table(criticos integer, base integer, cs_com_report integer, cs_so_importado integer)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with ultimos as (
    select distinct on (r.cs_nome) r.* from public.reports_vigentes() r
    join public.cs_config c on c.nome = r.cs_nome and c.ativo
    where p_ate is null or r.semana_inicio <= p_ate
    order by r.cs_nome, r.semana_inicio desc, (r.origem = 'nativo') desc
  ),
  base as (select distinct e.membro_id from public.membros_elegiveis_rede() e where cardinality(e.cs_nomes) > 0)
  select
    ((select count(distinct c.membro_id) from public.reports_individuais_criticos c
       join ultimos u on u.id = c.report_id and u.origem = 'nativo'
       where c.membro_id in (select b.membro_id from base b))
     + coalesce((select sum(u.criticos_total) from ultimos u where u.origem = 'monday'), 0))::int,
    (select count(*) from base)::int,
    (select count(*) from ultimos)::int,
    (select count(*) from ultimos u where u.origem = 'monday')::int;
end; $$;

-- ============ escrita ============
-- Grava (ou atualiza) o report nativo do CS na semana. Críticos são a lista de membro_id; o
-- total é contado aqui, nunca digitado. Todos precisam estar na base do CS. Auditoria sem nomes.
create or replace function public.salvar_report_individual(p_cs text, p_semana date, p_dados jsonb, p_criticos bigint[])
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_gestor boolean := public.is_gestor();
  v_cs text := public.report_resolver_cs(p_cs);
  v_semana_atual date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  v_ids bigint[] := coalesce((select array_agg(distinct x) from unnest(coalesce(p_criticos, '{}'::bigint[])) x where x is not null), '{}');
  v_base integer; v_validos integer; v_id uuid;
  v_baixo integer; v_medio integer; v_alto integer; v_nota integer;
  v_check text; v_como text;
begin
  if p_semana is null or extract(isodow from p_semana) <> 1 then
    raise exception 'semana_inicio precisa ser uma segunda feira' using errcode = '22023';
  end if;
  if p_semana > v_semana_atual then
    raise exception 'não é possível enviar report de semana futura' using errcode = '22023';
  end if;
  if not v_gestor and p_semana < v_semana_atual - 7 then
    raise exception 'fora da janela de edição: o CS edita só a semana atual e a anterior' using errcode = '22023';
  end if;

  v_como := nullif(p_dados ->> 'como_foi_semana', '');
  if v_como is not null and v_como not in ('fluindo', 'atencao', 'critica') then
    raise exception 'como_foi_semana inválido' using errcode = '22023';
  end if;
  if nullif(p_dados ->> 'nota_semana', '') is not null and (p_dados ->> 'nota_semana') !~ '^\d+$' then
    raise exception 'nota_semana precisa ser um inteiro entre 0 e 10' using errcode = '22023';
  end if;
  v_nota := nullif(p_dados ->> 'nota_semana', '')::int;
  if v_nota is not null and (v_nota < 0 or v_nota > 10) then
    raise exception 'nota_semana precisa estar entre 0 e 10' using errcode = '22023';
  end if;
  foreach v_check in array array['check_atas_crm', 'check_confirmacoes', 'check_gtd', 'check_kpis'] loop
    if nullif(p_dados ->> v_check, '') is not null and (p_dados ->> v_check) not in ('em_andamento', 'feito', 'parado') then
      raise exception '% inválido', v_check using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_each_text(p_dados) j
             where j.key in ('baixo_engajamento', 'medio_engajamento', 'alto_engajamento', 'indicacoes', 'matchmakings', 'churns_revertidos', 'pedidos_churn')
               and nullif(j.value, '') is not null and (j.value !~ '^\d+$')) then
    raise exception 'contagens precisam ser inteiros não negativos' using errcode = '22023';
  end if;
  v_baixo := nullif(p_dados ->> 'baixo_engajamento', '')::int;
  v_medio := nullif(p_dados ->> 'medio_engajamento', '')::int;
  v_alto := nullif(p_dados ->> 'alto_engajamento', '')::int;

  select count(*) into v_base from public.membros_elegiveis_rede() e where v_cs = any(e.cs_nomes);
  select count(*) into v_validos from public.membros_elegiveis_rede() e where v_cs = any(e.cs_nomes) and e.membro_id = any(v_ids);
  if v_validos <> cardinality(v_ids) then
    raise exception '% membro(s) selecionado(s) não pertencem à base de %', cardinality(v_ids) - v_validos, v_cs using errcode = '22023';
  end if;
  if cardinality(v_ids) + coalesce(v_baixo, 0) + coalesce(v_medio, 0) + coalesce(v_alto, 0) > v_base then
    raise exception 'críticos mais baixo, médio e alto engajamento (%) passam da base de % membros',
      cardinality(v_ids) + coalesce(v_baixo, 0) + coalesce(v_medio, 0) + coalesce(v_alto, 0), v_base using errcode = '22023';
  end if;

  insert into public.reports_individuais as r (
    cs_nome, cs_nome_original, cs_categoria, semana_inicio, data_report, data_aproximada, como_foi_semana, nota_semana,
    risco_se_ignorar, por_que, baixo_engajamento, medio_engajamento, alto_engajamento, indicacoes, matchmakings,
    churns_revertidos, pedidos_churn, check_atas_crm, check_confirmacoes, check_gtd, check_kpis,
    base_total, base_origem, criticos_total, criticos_origem, origem, criado_por, atualizado_por)
  values (
    v_cs, v_cs, 'cs_ativo', p_semana, (now() at time zone 'America/Sao_Paulo')::date, false, v_como, v_nota,
    nullif(trim(p_dados ->> 'risco_se_ignorar'), ''), nullif(trim(p_dados ->> 'por_que'), ''), v_baixo, v_medio, v_alto,
    nullif(p_dados ->> 'indicacoes', '')::int, nullif(p_dados ->> 'matchmakings', '')::int,
    nullif(p_dados ->> 'churns_revertidos', '')::int, nullif(p_dados ->> 'pedidos_churn', '')::int,
    nullif(p_dados ->> 'check_atas_crm', ''), nullif(p_dados ->> 'check_confirmacoes', ''),
    nullif(p_dados ->> 'check_gtd', ''), nullif(p_dados ->> 'check_kpis', ''),
    v_base, 'snapshot_carteira', cardinality(v_ids), 'nomeados', 'nativo', v_actor, v_actor)
  on conflict (cs_nome, semana_inicio) where origem = 'nativo' do update set
    data_report = excluded.data_report, como_foi_semana = excluded.como_foi_semana, nota_semana = excluded.nota_semana,
    risco_se_ignorar = excluded.risco_se_ignorar, por_que = excluded.por_que,
    baixo_engajamento = excluded.baixo_engajamento, medio_engajamento = excluded.medio_engajamento,
    alto_engajamento = excluded.alto_engajamento, indicacoes = excluded.indicacoes, matchmakings = excluded.matchmakings,
    churns_revertidos = excluded.churns_revertidos, pedidos_churn = excluded.pedidos_churn,
    check_atas_crm = excluded.check_atas_crm, check_confirmacoes = excluded.check_confirmacoes,
    check_gtd = excluded.check_gtd, check_kpis = excluded.check_kpis,
    base_total = excluded.base_total, criticos_total = excluded.criticos_total,
    atualizado_por = v_actor, atualizado_em = now()
  returning r.id into v_id;

  delete from public.reports_individuais_criticos where report_id = v_id;
  insert into public.reports_individuais_criticos (report_id, membro_id, group_id, nome_snapshot)
    select v_id, e.membro_id, e.group_id, e.nome from public.membros_elegiveis_rede() e
    where v_cs = any(e.cs_nomes) and e.membro_id = any(v_ids);

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'salvar_report_individual', v_id::text, 'success',
      jsonb_build_object('cs_nome', v_cs, 'semana', p_semana, 'criticos_total', cardinality(v_ids), 'base_total', v_base,
                         'editado_por_gestor', v_gestor and not coalesce(lower(v_cs) = lower(public.meu_cs()), false)));
  return v_id;
end; $$;

-- Data de corte (só gestor). Nula = vale o histórico importado do Monday.
create or replace function public.definir_data_corte_reports(p_data date)
returns date language plpgsql security definer set search_path to 'public' as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.configuracoes_globais set data_corte_reports_nativos = p_data, atualizado_em = now(), atualizado_por = v_actor where id = true;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_data_corte_reports', 'configuracoes_globais', 'success', jsonb_build_object('data', p_data));
  return p_data;
end; $$;

-- ============ permissões de execução ============
revoke all on function public.membros_elegiveis_rede(), public.report_resolver_cs(text), public.membros_da_base_cs(text),
  public.reports_vigentes(), public.reports_resumo_cs(), public.report_individual_semana(text, date),
  public.reports_historico_cs(text), public.criticos_atuais_cs(text), public.health_base_area(date),
  public.salvar_report_individual(text, date, jsonb, bigint[]), public.definir_data_corte_reports(date)
  from public, anon;
grant execute on function public.membros_elegiveis_rede(), public.report_resolver_cs(text), public.membros_da_base_cs(text),
  public.reports_vigentes(), public.reports_resumo_cs(), public.report_individual_semana(text, date),
  public.reports_historico_cs(text), public.criticos_atuais_cs(text), public.health_base_area(date),
  public.salvar_report_individual(text, date, jsonb, bigint[]), public.definir_data_corte_reports(date)
  to authenticated;

-- ============ catálogo ============
-- critico passa a calculado (nomeados do último report); health_base passa a percentual e a
-- agregação do time passa a razão ponderada (união dos críticos sobre união da base).
alter table public.indicadores_catalogo drop constraint if exists indicadores_catalogo_unidade_check;
alter table public.indicadores_catalogo add constraint indicadores_catalogo_unidade_check
  check (unidade in ('contagem', 'reais', 'pontos', 'percentual'));
alter table public.indicadores_catalogo drop constraint if exists indicadores_catalogo_agregacao_time_check;
alter table public.indicadores_catalogo add constraint indicadores_catalogo_agregacao_time_check
  check (agregacao_time in ('linha_unica', 'soma', 'razao_ponderada'));
update public.indicadores_catalogo set fonte = 'calculado' where chave = 'critico';
update public.indicadores_catalogo set unidade = 'percentual', agregacao_time = 'razao_ponderada' where chave = 'health_base';

-- ============ aliases do board (proposta de 07/10/2026) ============
-- Aplicados: nomes que batem com o CS de cs_config sem ambiguidade. Pendentes: aguardam o Vitor.
insert into public.reports_cs_aliases (nome_digitado_normalizado, exemplo_digitado, cs_nome, cs_nome_proposto, cs_categoria, aplicado, observacao) values
  ('george washington', 'George Washington', 'George', 'George', 'cs_ativo', true, 'nome completo igual ao de cs_config'),
  ('george', 'George', 'George', 'George', 'cs_ativo', true, 'primeiro nome e mesma conta Monday'),
  ('marcos', 'marcos', 'Marcos', 'Marcos', 'cs_ativo', true, 'primeiro nome e mesma conta Monday'),
  ('marcos vinicius', 'Marcos Vinicius', 'Marcos', 'Marcos', 'cs_ativo', true, 'início do nome completo'),
  ('vitor lacerda', 'Vitor Lacerda', 'Vitor', 'Vitor', 'cs_ativo', true, 'nome e sobrenome do cadastro, mesma conta Monday'),
  ('vilker', 'Vilker', 'Vilker', 'Vilker', 'cs_ativo', true, 'primeiro nome'),
  ('vilker pimentel', 'Vilker Pimentel', 'Vilker', 'Vilker', 'cs_ativo', true, 'mesma conta Monday; sobrenome difere de cs_config (Ferreira)'),
  ('mateus', 'Mateus', 'Mateus', 'Mateus', 'cs_ativo', true, 'primeiro nome e mesma conta Monday'),
  ('rodrigo nathan', 'Rodrigo Nathan', null, 'Rodrigo', 'nao_mapeado', false, 'mesma conta Monday de Rodrigo, mas cs_config diz Rodrigo Queiroz Campos; confirmar'),
  ('rodrigo nathan de matos', 'Rodrigo Nathan de Matos', null, 'Rodrigo', 'nao_mapeado', false, 'idem'),
  ('rodrigo', 'Rodrigo', null, 'Rodrigo', 'nao_mapeado', false, 'idem'),
  ('amanda leite', 'Amanda Leite', null, null, 'nao_mapeado', false, 'não está em cs_config'),
  ('alejandro', 'Alejandro', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('alejandro colina', 'Alejandro Colina', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('ale', 'Ale', null, null, 'nao_mapeado', false, 'proposta: ex CS (Alejandro)'),
  ('lucas', 'Lucas', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('lucas nicoli', 'Lucas Nicoli', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('lorena', 'Lorena', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('luma', 'Luma', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('yasmim', 'Yasmim', null, null, 'nao_mapeado', false, 'proposta: ex CS'),
  ('yas', 'Yas', null, null, 'nao_mapeado', false, 'proposta: ex CS (Yasmim)'),
  ('vinicius walviesse', 'Vinicius Walviesse', null, null, 'nao_mapeado', false, 'proposta: ex CS')
on conflict (nome_digitado_normalizado) do nothing;
