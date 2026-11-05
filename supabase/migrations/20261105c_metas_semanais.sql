-- Metas semanais, fase 2 (05/11/2026). Idempotente.
--
--   metas_semanais_override     só as exceções manuais de meta semanal (D1, D4). Escrita só pelas funções
--                               salvar_meta_semanal e remover_meta_semanal (gestor).
--   metas_semanais_fechamento   fotografia semanal fechada (P3): base, déficit recebido, meta efetiva e realizado
--                               congelados. Escrita só pelo service role (rota de fechamento).
--   Indicadores de P4 apenas. Dado ausente fica nulo, nunca zero.
--
-- Aplicação: colar no SQL Editor do Supabase. Não entra em supabase_migrations.schema_migrations.

-- ---------------------------------------------------------------------------
-- Overrides manuais
-- ---------------------------------------------------------------------------
create table if not exists public.metas_semanais_override (
  id              uuid primary key default gen_random_uuid(),
  cs_nome         text not null,
  indicador       text not null,
  mes             date not null,
  semana_inicio   date not null,
  valor           numeric not null,
  atualizado_por  text,
  atualizado_em   timestamptz not null default now(),
  constraint metas_semanais_override_unica unique (cs_nome, indicador, mes, semana_inicio),
  constraint metas_semanais_override_valor check (valor >= 0),
  constraint metas_semanais_override_mes_dia1 check (mes = date_trunc('month', mes)::date),
  constraint metas_semanais_override_segunda check (extract(isodow from semana_inicio) = 1),
  constraint metas_semanais_override_indicador check (indicador in
    ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds'))
);
comment on table public.metas_semanais_override is 'Meta semanal editada à mão pelo gestor (D1, D4). Só exceções: o automático é sempre calculado.';

alter table public.metas_semanais_override enable row level security;
drop policy if exists moai_select on public.metas_semanais_override;
create policy moai_select on public.metas_semanais_override for select using (public.is_moai_user());

-- Escrita só pelas funções abaixo. Sem policy de insert, update ou delete para authenticated.
create or replace function public.salvar_meta_semanal(
  p_cs_nome text, p_indicador text, p_mes date, p_semana_inicio date, p_valor numeric)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_mes date := date_trunc('month', p_mes)::date;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_cs_nome, '')), '') is null then
    raise exception 'cs_nome é obrigatório' using errcode = '22023';
  end if;
  if p_indicador not in ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds') then
    raise exception 'indicador "%" não tem meta semanal (P4)', p_indicador using errcode = '22023';
  end if;
  if p_semana_inicio is null or extract(isodow from p_semana_inicio) <> 1 then
    raise exception 'semana_inicio precisa ser uma segunda-feira' using errcode = '22023';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor precisa ser zero ou positivo' using errcode = '22023';
  end if;
  if not exists (select 1 from public.cs_config where lower(nome) = lower(trim(p_cs_nome))) then
    raise exception 'CS "%" não encontrado', p_cs_nome using errcode = '22023';
  end if;

  insert into public.metas_semanais_override (cs_nome, indicador, mes, semana_inicio, valor, atualizado_por, atualizado_em)
    values (trim(p_cs_nome), p_indicador, v_mes, p_semana_inicio, p_valor, v_actor, now())
  on conflict (cs_nome, indicador, mes, semana_inicio)
    do update set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = now();
end $function$;

create or replace function public.remover_meta_semanal(
  p_cs_nome text, p_indicador text, p_mes date, p_semana_inicio date)
returns void
language plpgsql security definer set search_path = public as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.metas_semanais_override
   where lower(cs_nome) = lower(trim(p_cs_nome))
     and indicador = p_indicador
     and mes = date_trunc('month', p_mes)::date
     and semana_inicio = p_semana_inicio;
end $function$;

revoke all on function public.salvar_meta_semanal(text, text, date, date, numeric) from public, anon;
revoke all on function public.remover_meta_semanal(text, text, date, date) from public, anon;
grant execute on function public.salvar_meta_semanal(text, text, date, date, numeric) to authenticated;
grant execute on function public.remover_meta_semanal(text, text, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Fechamento semanal (P3)
-- ---------------------------------------------------------------------------
create table if not exists public.metas_semanais_fechamento (
  cs_nome         text not null,
  indicador       text not null,
  mes             date not null,
  semana_inicio   date not null,
  base            numeric,
  deficit_recebido numeric,
  meta_efetiva    numeric,
  realizado       numeric,
  sem_data        integer not null default 0,
  retroativo      boolean not null default false,
  fechado_em      timestamptz not null default now(),
  primary key (cs_nome, indicador, mes, semana_inicio),
  constraint metas_semanais_fechamento_segunda check (extract(isodow from semana_inicio) = 1),
  constraint metas_semanais_fechamento_indicador check (indicador in
    ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds'))
);
comment on table public.metas_semanais_fechamento is 'Semana fechada: base, déficit recebido, meta efetiva e realizado congelados (P3). Escrita só pelo service role.';

alter table public.metas_semanais_fechamento enable row level security;
drop policy if exists moai_select on public.metas_semanais_fechamento;
create policy moai_select on public.metas_semanais_fechamento for select using (public.is_moai_user());

-- ---------------------------------------------------------------------------
-- Classificação na normativa de dados
-- ---------------------------------------------------------------------------
insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('metas_semanais_override',   'nativa',   null, true, true,  'Meta semanal manual do gestor (exceções)'),
  ('metas_semanais_fechamento', 'derivada', null, true, false, 'Semana fechada, recalculável pela regra de metas semanais')
on conflict (tabela) do update set origem = excluded.origem, versionar = excluded.versionar,
  descricao = excluded.descricao, atualizado_em = now();

select seguranca.aplicar_protecoes();
