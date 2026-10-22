-- Alerta de NPS para a Luana, por email e na fila de ação do gestor (22/10/2026).
-- Quatro critérios: resposta individual detratora, NPS do conselheiro no encontro abaixo de 70, nota do CS
-- baixa e média do encontro abaixo de 8,5. Encontro de NPS = group_id mais mes_grupo_titulo. Regra
-- espelhada em lib/alertas-nps.ts (avaliarAlertasNps); constantes em lib/constants.ts e em alerta_nps_config.

-- 1. Destinatário vem de dado, nunca de nome fixo ---------------------------------------------------------
alter table public.cs_config
  add column if not exists email text,
  add column if not exists recebe_alerta_nps boolean not null default false;
update public.cs_config c
   set email = (select g.email from public.gestores g where lower(g.email) like 'luanasampaio@%' limit 1),
       recebe_alerta_nps = true
 where c.nome = 'Luana' and c.email is null;

-- 2. "Nome do mês" do NPS (ex. "Outubro 2026") para data ---------------------------------------------------
create or replace function public.nps_mes_data(p_titulo text)
returns date language sql immutable set search_path to 'public' as $$
  select make_date(
    split_part(trim(p_titulo), ' ', 2)::int,
    array_position(array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
                   lower(split_part(trim(p_titulo), ' ', 1))),
    1);
$$;

-- 3. Configuração de uma linha, editável só por gestor ---------------------------------------------------------
create table if not exists public.alerta_nps_config (
  id boolean primary key default true check (id),
  limiar_detrator numeric not null default 6,
  limiar_nota_cs numeric not null default 6,
  nps_minimo numeric not null default 70,
  media_minima numeric not null default 8.5,
  amostra_minima integer not null default 5,
  avaliar_desde_mes date not null default date '2026-10-01',
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
insert into public.alerta_nps_config (id) values (true) on conflict (id) do nothing;
alter table public.alerta_nps_config enable row level security;
drop policy if exists moai_select on public.alerta_nps_config;
create policy moai_select on public.alerta_nps_config for select to authenticated using (public.is_moai_user());
revoke all on public.alerta_nps_config from anon, public;
grant select on public.alerta_nps_config to authenticated;

create or replace function public.definir_alerta_nps_config(p_limiar_detrator numeric, p_limiar_nota_cs numeric, p_nps_minimo numeric, p_media_minima numeric, p_amostra_minima integer)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_amostra_minima is null or p_amostra_minima < 1 or p_limiar_detrator is null or p_limiar_nota_cs is null or p_nps_minimo is null or p_media_minima is null then
    raise exception 'valores inválidos' using errcode = '22023';
  end if;
  update public.alerta_nps_config
     set limiar_detrator = p_limiar_detrator, limiar_nota_cs = p_limiar_nota_cs, nps_minimo = p_nps_minimo,
         media_minima = p_media_minima, amostra_minima = p_amostra_minima, atualizado_em = now(), atualizado_por = v_actor
   where id;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_alerta_nps_config', 'alerta_nps_config', 'success',
            jsonb_build_object('limiar_detrator', p_limiar_detrator, 'limiar_nota_cs', p_limiar_nota_cs, 'nps_minimo', p_nps_minimo, 'media_minima', p_media_minima, 'amostra_minima', p_amostra_minima));
end;
$$;
revoke all on function public.definir_alerta_nps_config(numeric, numeric, numeric, numeric, integer) from public, anon;
grant execute on function public.definir_alerta_nps_config(numeric, numeric, numeric, numeric, integer) to authenticated;

-- 4. Alertas ------------------------------------------------------------------------------------------------------
create table if not exists public.alertas_nps (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  mes text not null,
  criterio text not null check (criterio in ('detrator', 'nota_cs_baixa', 'nps_encontro', 'media_encontro')),
  respondente_nome text,
  valor numeric not null,
  referencia numeric not null,
  amostra integer,
  detalhe jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  notificado_em timestamptz,
  tratado_em timestamptz,
  tratado_por text,
  nota_tratamento text
);
-- Nunca alertar duas vezes o mesmo fato: um por encontro, critério e respondente.
create unique index if not exists alertas_nps_fato_key on public.alertas_nps (group_id, mes, criterio, (coalesce(respondente_nome, '')));
create index if not exists alertas_nps_abertos_idx on public.alertas_nps (criado_em) where tratado_em is null;
alter table public.alertas_nps enable row level security;
-- Traz nome de detrator e comentário: só gestor lê.
drop policy if exists gestor_select on public.alertas_nps;
create policy gestor_select on public.alertas_nps for select to authenticated using (public.is_gestor());
revoke all on public.alertas_nps from anon, public;
grant select on public.alertas_nps to authenticated;

create or replace function public.tratar_alerta_nps(p_id uuid, p_nota text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.alertas_nps
     set tratado_em = now(), tratado_por = v_actor, nota_tratamento = nullif(trim(coalesce(p_nota, '')), '')
   where id = p_id and tratado_em is null;
  if not found then raise exception 'alerta não encontrado ou já tratado' using errcode = 'P0002'; end if;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'tratar_alerta_nps', p_id::text, 'success', jsonb_build_object('id', p_id));
end;
$$;
revoke all on function public.tratar_alerta_nps(uuid, text) from public, anon;
grant execute on function public.tratar_alerta_nps(uuid, text) to authenticated;

-- 5. Avaliação ------------------------------------------------------------------------------------------------------
-- Respostas sem group_id (alias não confirmado) e grupos que não existem em conselhos_grupos ficam de fora e
-- seguem na contagem de aliases pendentes.
create or replace function public.alertas_nps_candidatos()
returns table(group_id text, mes text, criterio text, respondente_nome text, valor numeric, referencia numeric, amostra integer, detalhe jsonb)
language sql stable security definer set search_path to 'public' as $$
  with cfg as (select * from public.alerta_nps_config where id),
  base as (
    select i.group_id, i.mes_grupo_titulo as mes, coalesce(nullif(trim(i.respondente_nome), ''), '(sem nome)') as resp,
           i.nota_conselheiro, i.nota_cs_hoje, i.sugestao_texto, i.avalia_cs_texto
      from public.nps_conselhos_items i
      join public.conselhos_grupos g on g.group_id = i.group_id
      cross join cfg
     where i.group_id is not null and public.nps_mes_data(i.mes_grupo_titulo) >= cfg.avaliar_desde_mes
  ),
  individuais as (
    select b.group_id, b.mes, 'detrator'::text as criterio, b.resp as respondente_nome, b.nota_conselheiro as valor,
           cfg.limiar_detrator as referencia, null::int as amostra,
           jsonb_build_object('nota', b.nota_conselheiro, 'comentario', nullif(trim(coalesce(b.sugestao_texto, '')), '')) as detalhe
      from base b cross join cfg where b.nota_conselheiro is not null and b.nota_conselheiro <= cfg.limiar_detrator
    union all
    select b.group_id, b.mes, 'nota_cs_baixa', b.resp, b.nota_cs_hoje, cfg.limiar_nota_cs, null::int,
           jsonb_build_object('nota', b.nota_cs_hoje, 'comentario', nullif(trim(coalesce(b.avalia_cs_texto, '')), ''))
      from base b cross join cfg where b.nota_cs_hoje is not null and b.nota_cs_hoje <= cfg.limiar_nota_cs
  ),
  encontros as (
    select b.group_id, b.mes, count(b.nota_conselheiro)::int as n,
           100.0 * (count(*) filter (where b.nota_conselheiro >= 9) - count(*) filter (where b.nota_conselheiro <= cfg.limiar_detrator)) / nullif(count(b.nota_conselheiro), 0) as nps,
           avg(b.nota_conselheiro) as media
      from base b cross join cfg group by b.group_id, b.mes, cfg.limiar_detrator, cfg.amostra_minima
    having count(b.nota_conselheiro) >= cfg.amostra_minima
  ),
  agregados as (
    select e.group_id, e.mes, 'nps_encontro'::text as criterio, null::text as respondente_nome, round(e.nps, 1) as valor,
           cfg.nps_minimo as referencia, e.n as amostra, '{}'::jsonb as detalhe
      from encontros e cross join cfg where e.nps < cfg.nps_minimo
    union all
    select e.group_id, e.mes, 'media_encontro', null::text, round(e.media, 2), cfg.media_minima, e.n, '{}'::jsonb
      from encontros e cross join cfg where e.media < cfg.media_minima
  )
  select distinct on (x.group_id, x.mes, x.criterio, coalesce(x.respondente_nome, '')) x.*
    from (select * from individuais union all select * from agregados) x
   order by x.group_id, x.mes, x.criterio, coalesce(x.respondente_nome, ''), x.valor;
$$;
revoke all on function public.alertas_nps_candidatos() from public, anon, authenticated;
grant execute on function public.alertas_nps_candidatos() to service_role;

-- p_simular não grava. Agregados atualizam o valor da linha sem novo email (notificado_em não muda).
create or replace function public.avaliar_alertas_nps(p_simular boolean default false)
returns table(group_id text, mes text, criterio text, respondente_nome text, valor numeric, referencia numeric, amostra integer, acao text)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
begin
  if p_simular then
    return query
    select c.group_id, c.mes, c.criterio, c.respondente_nome, c.valor, c.referencia, c.amostra,
           case when a.id is null then 'novo' when a.valor is distinct from c.valor then 'atualizado' else 'igual' end
      from public.alertas_nps_candidatos() c
      left join public.alertas_nps a on a.group_id = c.group_id and a.mes = c.mes and a.criterio = c.criterio
                                    and coalesce(a.respondente_nome, '') = coalesce(c.respondente_nome, '')
     order by c.mes, c.group_id, c.criterio;
  else
    return query
    with ins as (
      insert into public.alertas_nps as a (group_id, mes, criterio, respondente_nome, valor, referencia, amostra, detalhe)
      select c.group_id, c.mes, c.criterio, c.respondente_nome, c.valor, c.referencia, c.amostra, c.detalhe from public.alertas_nps_candidatos() c
      on conflict (group_id, mes, criterio, (coalesce(respondente_nome, ''))) do update
        set valor = excluded.valor, referencia = excluded.referencia, amostra = excluded.amostra, atualizado_em = now()
        where a.valor is distinct from excluded.valor
      returning a.group_id, a.mes, a.criterio, a.respondente_nome, a.valor, a.referencia, a.amostra, (a.xmax = 0) as novo
    )
    select i.group_id, i.mes, i.criterio, i.respondente_nome, i.valor, i.referencia, i.amostra, case when i.novo then 'novo' else 'atualizado' end from ins i;
  end if;
end;
$$;
revoke all on function public.avaliar_alertas_nps(boolean) from public, anon, authenticated;
grant execute on function public.avaliar_alertas_nps(boolean) to service_role;


-- 6. Envio agrupado ---------------------------------------------------------------------------------------------------
-- Um email por encontro com todos os critérios novos. A janela de 60 minutos conta do primeiro alerta não
-- notificado do encontro, porque as respostas chegam em lote logo depois do conselho. Alertas com mais de
-- p_validade_dias dias não são enviados (evita enxurrada ao ligar o envio); marcar_alertas_notificados os baixa.
create or replace function public.alertas_nps_para_enviar(p_janela_min integer default 60, p_validade_dias integer default 7)
returns table(id uuid, group_id text, mes text, criterio text, respondente_nome text, valor numeric, referencia numeric, amostra integer, detalhe jsonb,
              conselho text, cs_responsavel text, expirado boolean)
language sql stable security definer set search_path to 'public' as $$
  with abertos as (
    select a.* from public.alertas_nps a where a.notificado_em is null
  ),
  prontos as (
    select o.group_id, o.mes from abertos o group by o.group_id, o.mes
    having min(o.criado_em) <= now() - make_interval(mins => p_janela_min)
  )
  select a.id, a.group_id, a.mes, a.criterio, a.respondente_nome, a.valor, a.referencia, a.amostra, a.detalhe,
         g.titulo, substring(g.titulo from '\(([^)]+)\)\s*$'),
         a.criado_em < now() - make_interval(days => p_validade_dias)
    from abertos a
    join prontos p on p.group_id = a.group_id and p.mes = a.mes
    left join public.conselhos_grupos g on g.group_id = a.group_id
   order by a.mes, a.group_id, a.criterio;
$$;
revoke all on function public.alertas_nps_para_enviar(integer, integer) from public, anon, authenticated;
grant execute on function public.alertas_nps_para_enviar(integer, integer) to service_role;

create or replace function public.marcar_alertas_notificados(p_ids uuid[])
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v integer;
begin
  update public.alertas_nps set notificado_em = now() where id = any(p_ids) and notificado_em is null;
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function public.marcar_alertas_notificados(uuid[]) from public, anon, authenticated;
grant execute on function public.marcar_alertas_notificados(uuid[]) to service_role;
