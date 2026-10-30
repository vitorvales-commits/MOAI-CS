-- Vitorio (30/10/2026): mascote com busca determinística nos processos, registro de dúvidas sem resposta e tour por perfil.
-- Três tabelas, todas com RLS. Nenhuma escrita direta pela chave anon nem por authenticated: as escritas passam
-- por funções SECURITY DEFINER com search_path fixo. O registro de consultas guarda o perfil (cs ou gestor), não a
-- pessoa; o e-mail só é gravado se o app pedir (constante VITORIO_REGISTRAR_PESSOA em lib/constants.ts).
-- Rollback: drop das funções vitorio_*, das tabelas vitorio_consultas, vitorio_limite, vitorio_perguntas_extras e vitorio_tour_visto.

create table if not exists public.vitorio_consultas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  perfil text not null check (perfil in ('cs', 'gestor')),
  email text,
  consulta_normalizada text not null check (length(consulta_normalizada) between 1 and 200),
  resultado text not null check (resultado in ('resposta', 'ambigua', 'nada')),
  chave_escolhida text,
  util boolean,
  tratada_em timestamptz
);
create index if not exists vitorio_consultas_criado_idx on public.vitorio_consultas (criado_em desc);

create table if not exists public.vitorio_perguntas_extras (
  chave text primary key check (length(chave) between 1 and 200),
  frases text[] not null default '{}',
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.vitorio_tour_visto (
  email text not null,
  tour_id text not null,
  versao integer not null,
  visto_em timestamptz not null default now(),
  primary key (email, tour_id)
);

-- Limite de uso sem identificar a pessoa: a chave é um hash do e-mail somado à hora, então não liga horas diferentes.
create table if not exists public.vitorio_limite (
  chave text primary key,
  hora timestamptz not null,
  n integer not null default 0
);

alter table public.vitorio_consultas enable row level security;
alter table public.vitorio_perguntas_extras enable row level security;
alter table public.vitorio_tour_visto enable row level security;
alter table public.vitorio_limite enable row level security;

revoke all on public.vitorio_consultas, public.vitorio_perguntas_extras, public.vitorio_tour_visto, public.vitorio_limite from public, anon, authenticated;
grant select on public.vitorio_consultas, public.vitorio_perguntas_extras, public.vitorio_tour_visto to authenticated;

drop policy if exists vitorio_consultas_ler on public.vitorio_consultas;
create policy vitorio_consultas_ler on public.vitorio_consultas for select to authenticated using ((select public.is_gestor()));

drop policy if exists vitorio_extras_ler on public.vitorio_perguntas_extras;
create policy vitorio_extras_ler on public.vitorio_perguntas_extras for select to authenticated using ((select public.is_moai_user()));

drop policy if exists vitorio_tour_ler on public.vitorio_tour_visto;
create policy vitorio_tour_ler on public.vitorio_tour_visto for select to authenticated
  using (email = lower(coalesce((select auth.jwt() ->> 'email'), '')));

create or replace function public.vitorio_registrar_consulta(
  p_perfil text, p_consulta text, p_resultado text, p_chave text, p_gravar_email boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hora timestamptz := date_trunc('hour', now());
  v_chave text := md5(v_email || v_hora::text);
  v_n integer;
  v_id uuid;
begin
  if not coalesce(public.is_moai_user(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_perfil not in ('cs', 'gestor') or p_resultado not in ('resposta', 'ambigua', 'nada')
     or coalesce(trim(p_consulta), '') = '' or length(p_consulta) > 200 then
    raise exception 'consulta inválida' using errcode = '22023';
  end if;
  delete from public.vitorio_limite where hora < v_hora - interval '2 hours';
  insert into public.vitorio_limite as l (chave, hora, n) values (v_chave, v_hora, 1)
    on conflict (chave) do update set n = l.n + 1 returning l.n into v_n;
  if v_n > 30 then
    raise exception 'limite de consultas por hora atingido' using errcode = '54000';
  end if;
  insert into public.vitorio_consultas (perfil, email, consulta_normalizada, resultado, chave_escolhida)
  values (p_perfil, case when p_gravar_email then v_email else null end, trim(p_consulta), p_resultado, left(p_chave, 200))
  returning id into v_id;
  return v_id;
end
$$;

-- Só aceita marcar consultas recentes: o id é aleatório e a tabela não guarda quem consultou.
create or replace function public.vitorio_marcar_util(p_id uuid, p_util boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_moai_user(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update public.vitorio_consultas set util = p_util
   where id = p_id and criado_em > now() - interval '1 day';
end
$$;

-- p_tratar traz as consultas normalizadas que a nova frase resolve: elas saem da fila de dúvidas.
create or replace function public.vitorio_salvar_perguntas_extras(p_chave text, p_frases text[], p_tratar text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_frases text[];
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if coalesce(trim(p_chave), '') = '' or length(p_chave) > 200 then
    raise exception 'chave inválida' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct left(trim(f), 200)) filter (where trim(f) <> ''), '{}') into v_frases from unnest(coalesce(p_frases, '{}')) f;
  if cardinality(v_frases) > 50 then
    raise exception 'frases demais para um item' using errcode = '22023';
  end if;
  insert into public.vitorio_perguntas_extras (chave, frases, atualizado_em, atualizado_por)
  values (trim(p_chave), v_frases, now(), v_email)
  on conflict (chave) do update set frases = excluded.frases, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  if p_tratar is not null then
    update public.vitorio_consultas set tratada_em = now()
     where tratada_em is null and consulta_normalizada = any (p_tratar);
  end if;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
  values (v_email, 'vitorio_salvar_perguntas_extras', left(trim(p_chave), 200), 'success', jsonb_build_object('frases', cardinality(v_frases)));
end
$$;

create or replace function public.vitorio_marcar_tour(p_tour_id text, p_versao integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not coalesce(public.is_moai_user(), false) or v_email = '' then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if coalesce(trim(p_tour_id), '') = '' or length(p_tour_id) > 100 or p_versao is null or p_versao < 1 then
    raise exception 'tour inválido' using errcode = '22023';
  end if;
  insert into public.vitorio_tour_visto (email, tour_id, versao, visto_em) values (v_email, trim(p_tour_id), p_versao, now())
  on conflict (email, tour_id) do update set versao = greatest(public.vitorio_tour_visto.versao, excluded.versao), visto_em = now();
end
$$;

revoke execute on function public.vitorio_registrar_consulta(text, text, text, text, boolean), public.vitorio_marcar_util(uuid, boolean),
  public.vitorio_salvar_perguntas_extras(text, text[], text[]), public.vitorio_marcar_tour(text, integer) from public, anon;
grant execute on function public.vitorio_registrar_consulta(text, text, text, text, boolean), public.vitorio_marcar_util(uuid, boolean),
  public.vitorio_salvar_perguntas_extras(text, text[], text[]), public.vitorio_marcar_tour(text, integer) to authenticated;
