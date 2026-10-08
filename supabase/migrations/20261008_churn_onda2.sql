-- Churn onda 2: visitas de reversão, melhorias do membro e exclusão na Voz do liderado.
-- Escrita só pela Edge Function (service role) ou por funções SECURITY DEFINER com checagem is_gestor().

-- ---------------------------------------------------------------------------
-- 1. Auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.mes_idx(p text)
returns integer
language sql
immutable
as $fn$
  select case lower(translate(trim(p), 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc'))
    when 'janeiro' then 1
    when 'fevereiro' then 2
    when 'marco' then 3
    when 'abril' then 4
    when 'maio' then 5
    when 'junho' then 6
    when 'julho' then 7
    when 'agosto' then 8
    when 'setembro' then 9
    when 'outubro' then 10
    when 'novembro' then 11
    when 'dezembro' then 12
  end
$fn$;

-- ---------------------------------------------------------------------------
-- 2. Voz do liderado: exclusão lógica
-- ---------------------------------------------------------------------------
alter table public.voz_liderado_itens
  add column if not exists excluido_em timestamptz,
  add column if not exists excluido_por text;

-- ---------------------------------------------------------------------------
-- 3. Tabela de visitas de reversão
-- ---------------------------------------------------------------------------
create table if not exists public.visitas_churn (
  id bigint primary key,
  membro_nome text,
  membro_id bigint,
  group_id text,
  churn_item_id bigint,
  cs_responsavel text,
  visitantes text,
  etapa text not null check (etapa in ('pedido', 'visita', 'acompanhamento', 'revertido', 'perdido', 'outro')),
  produto text,
  "local" text,
  acao_principal text,
  termometro text,
  causa_raiz text,
  etapa_origem text,
  duracao text,
  expansao text,
  algo_novo boolean,
  causa_encontrada boolean,
  evitavel boolean,
  identificavel_antes boolean,
  mrr_em_risco numeric check (mrr_em_risco is null or mrr_em_risco >= 0),
  data_pedido date,
  data_pedido_aproximada boolean not null default false,
  data_visita date,
  data_desfecho date,
  fim_fidelidade date,
  proximo_acompanhamento date,
  observacoes text,
  board_group_id text,
  created_at_monday timestamptz,
  synced_at timestamptz not null default now()
);

create or replace function public.visitas_churn_manter_grupo()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if new.group_id is null then
    new.group_id := old.group_id;
  end if;
  return new;
end
$fn$;

drop trigger if exists visitas_churn_manter_grupo on public.visitas_churn;
create trigger visitas_churn_manter_grupo
  before update on public.visitas_churn
  for each row execute function public.visitas_churn_manter_grupo();

alter table public.visitas_churn enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visitas_churn' and policyname = 'gestor_select') then
    create policy gestor_select on public.visitas_churn for select to authenticated using (public.is_gestor());
  end if;
end
$$;

revoke all on public.visitas_churn from anon, authenticated;
grant select on public.visitas_churn to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Situação do membro (ativo, saiu ou desconhecido)
-- ---------------------------------------------------------------------------
create or replace function public.membro_situacao(p_membro_id bigint)
returns text
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_status text;
begin
  if p_membro_id is null then
    return 'desconhecido';
  end if;
  if not exists (select 1 from conselhos_membros m where m.id = p_membro_id) then
    return 'saiu';
  end if;
  select s.status into v_status
  from conselhos_status_mensal s
  where s.membro_id = p_membro_id
  order by public.mes_idx(s.mes) desc nulls last
  limit 1;
  if v_status in ('Churn', 'Retirado') then
    return 'saiu';
  end if;
  return 'ativo';
end
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Resultado das visitas (uma linha por visita)
-- ---------------------------------------------------------------------------
create or replace function public.visitas_resultado()
returns table (
  id bigint,
  membro_nome text,
  membro_id bigint,
  group_id text,
  churn_item_id bigint,
  cs_responsavel text,
  visitantes text,
  etapa text,
  produto text,
  "local" text,
  acao_principal text,
  termometro text,
  causa_raiz text,
  etapa_origem text,
  duracao text,
  expansao text,
  algo_novo boolean,
  causa_encontrada boolean,
  evitavel boolean,
  identificavel_antes boolean,
  mrr_em_risco numeric,
  data_pedido date,
  data_pedido_aproximada boolean,
  data_visita date,
  data_desfecho date,
  fim_fidelidade date,
  proximo_acompanhamento date,
  observacoes text,
  board_group_id text,
  created_at_monday timestamptz,
  synced_at timestamptz,
  encerrada boolean,
  retencao_imediata boolean,
  situacao_hoje text,
  dentro_fidelidade boolean,
  dias_ate_visita integer,
  novo_risco_em date,
  dias_ate_novo_risco integer,
  retido_30 text,
  retido_90 text,
  retido_180 text,
  iev integer
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  base as (
    select
      v.*,
      h.d as hoje_d,
      (v.etapa in ('revertido', 'perdido')) as enc,
      case when v.etapa = 'revertido' then true when v.etapa = 'perdido' then false end as ret,
      public.membro_situacao(v.membro_id) as sit,
      case when v.fim_fidelidade is null then null else v.data_pedido < v.fim_fidelidade end as dent,
      (v.data_visita - v.data_pedido) as dias_v,
      (
        select min(o.data_pedido)
        from visitas_churn o
        where o.membro_id = v.membro_id
          and o.id <> v.id
          and o.data_pedido > coalesce(v.data_desfecho, v.data_visita, v.data_pedido)
      ) as novo
    from visitas_churn v
    cross join hoje h
  ),
  r as (
    select
      b.*,
      case
        when b.data_visita + 30 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x30,
      case
        when b.data_visita + 90 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x90,
      case
        when b.data_visita + 180 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x180
    from base b
  )
  select
    r.id, r.membro_nome, r.membro_id, r.group_id, r.churn_item_id, r.cs_responsavel, r.visitantes,
    r.etapa, r.produto, r."local", r.acao_principal, r.termometro, r.causa_raiz, r.etapa_origem,
    r.duracao, r.expansao, r.algo_novo, r.causa_encontrada, r.evitavel, r.identificavel_antes,
    r.mrr_em_risco, r.data_pedido, r.data_pedido_aproximada, r.data_visita, r.data_desfecho,
    r.fim_fidelidade, r.proximo_acompanhamento, r.observacoes, r.board_group_id,
    r.created_at_monday, r.synced_at,
    r.enc,
    r.ret,
    r.sit,
    r.dent,
    r.dias_v::integer,
    r.novo,
    (r.novo - r.data_visita)::integer,
    r.x30,
    r.x90,
    r.x180,
    case
      when r.etapa = 'perdido' then 0
      when r.data_visita is null or r.x180 = 'em_maturacao' then null
      else
        (case when r.x90 = 'retido' then 1 else 0 end)
        + (case when r.x180 = 'retido' then 1 else 0 end)
        + (case when r.fim_fidelidade < r.hoje_d and r.sit = 'ativo' then 2 else 0 end)
        + (case when r.expansao is not null and r.expansao <> 'Nenhuma' then 1 else 0 end)
        + (case when r.novo is null or r.novo > r.data_visita + 180 then 1 else 0 end)
    end
  from r
  order by r.data_pedido desc nulls last, r.id;
end
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Voz do liderado: excluir e restaurar
-- ---------------------------------------------------------------------------
create or replace function public.voz_excluir(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update voz_liderado_itens
  set excluido_em = now(), excluido_por = coalesce(auth.jwt() ->> 'email', '')
  where id = p_id;
  if not found then
    raise exception 'sugestão não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access('voz_excluir', 'ok', jsonb_build_object('id', p_id), 'voz_liderado_itens');
end
$fn$;

create or replace function public.voz_restaurar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update voz_liderado_itens
  set excluido_em = null, excluido_por = null
  where id = p_id;
  if not found then
    raise exception 'sugestão não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access('voz_restaurar', 'ok', jsonb_build_object('id', p_id), 'voz_liderado_itens');
end
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Melhorias da experiência do membro
-- ---------------------------------------------------------------------------
create table if not exists public.membro_melhorias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 3 and 160),
  origem text not null check (origem in ('tema', 'visita')),
  tema_chave text,
  etapa_origem text,
  responsavel text check (responsavel is null or char_length(responsavel) <= 80),
  prazo date,
  status text not null default 'backlog' check (status in ('backlog', 'em_andamento', 'realizado', 'rejeitado')),
  observacao text check (observacao is null or char_length(observacao) <= 600),
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  excluido_por text
);

alter table public.membro_melhorias enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'membro_melhorias' and policyname = 'gestor_select') then
    create policy gestor_select on public.membro_melhorias for select to authenticated using (public.is_gestor());
  end if;
end
$$;

revoke all on public.membro_melhorias from anon, authenticated;
grant select on public.membro_melhorias to authenticated;

create or replace function public.membro_melhoria_salvar(
  p_id uuid,
  p_titulo text,
  p_origem text,
  p_tema_chave text,
  p_etapa_origem text,
  p_responsavel text,
  p_prazo date,
  p_status text,
  p_observacao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_origem not in ('tema', 'visita') then
    raise exception 'origem inválida' using errcode = '22023';
  end if;
  if p_status not in ('backlog', 'em_andamento', 'realizado', 'rejeitado') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_titulo, ''))) not between 3 and 160 then
    raise exception 'título deve ter de 3 a 160 caracteres' using errcode = '22023';
  end if;
  if char_length(coalesce(p_responsavel, '')) > 80 then
    raise exception 'responsável deve ter até 80 caracteres' using errcode = '22023';
  end if;
  if char_length(coalesce(p_observacao, '')) > 600 then
    raise exception 'observação deve ter até 600 caracteres' using errcode = '22023';
  end if;

  if p_id is null then
    insert into membro_melhorias (titulo, origem, tema_chave, etapa_origem, responsavel, prazo, status, observacao, criado_por)
    values (trim(p_titulo), p_origem, p_tema_chave, p_etapa_origem, nullif(trim(p_responsavel), ''), p_prazo, p_status, nullif(trim(p_observacao), ''), v_email)
    returning id into v_id;
  else
    update membro_melhorias
    set titulo = trim(p_titulo),
        origem = p_origem,
        tema_chave = p_tema_chave,
        etapa_origem = p_etapa_origem,
        responsavel = nullif(trim(p_responsavel), ''),
        prazo = p_prazo,
        status = p_status,
        observacao = nullif(trim(p_observacao), ''),
        atualizado_em = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'melhoria não encontrada' using errcode = 'P0002';
    end if;
  end if;

  perform public.log_access('membro_melhoria_salvar', 'ok', jsonb_build_object('id', v_id, 'origem', p_origem, 'status', p_status), 'membro_melhorias');
  return v_id;
end
$fn$;

create or replace function public.membro_melhoria_excluir(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update membro_melhorias
  set excluido_em = now(), excluido_por = coalesce(auth.jwt() ->> 'email', '')
  where id = p_id;
  if not found then
    raise exception 'melhoria não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access('membro_melhoria_excluir', 'ok', jsonb_build_object('id', p_id), 'membro_melhorias');
end
$fn$;

create or replace function public.membro_melhoria_restaurar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update membro_melhorias
  set excluido_em = null, excluido_por = null, atualizado_em = now()
  where id = p_id;
  if not found then
    raise exception 'melhoria não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access('membro_melhoria_restaurar', 'ok', jsonb_build_object('id', p_id), 'membro_melhorias');
end
$fn$;

-- ---------------------------------------------------------------------------
-- 8. Permissões das funções: nada para público e anônimo; app chama só as de gestor
-- ---------------------------------------------------------------------------
revoke all on function public.mes_idx(text) from public, anon, authenticated;
revoke all on function public.membro_situacao(bigint) from public, anon, authenticated;
revoke all on function public.visitas_resultado() from public, anon;
revoke all on function public.voz_excluir(uuid) from public, anon;
revoke all on function public.voz_restaurar(uuid) from public, anon;
revoke all on function public.membro_melhoria_salvar(uuid, text, text, text, text, text, date, text, text) from public, anon;
revoke all on function public.membro_melhoria_excluir(uuid) from public, anon;
revoke all on function public.membro_melhoria_restaurar(uuid) from public, anon;

grant execute on function public.visitas_resultado() to authenticated;
grant execute on function public.voz_excluir(uuid) to authenticated;
grant execute on function public.voz_restaurar(uuid) to authenticated;
grant execute on function public.membro_melhoria_salvar(uuid, text, text, text, text, text, date, text, text) to authenticated;
grant execute on function public.membro_melhoria_excluir(uuid) to authenticated;
grant execute on function public.membro_melhoria_restaurar(uuid) to authenticated;
