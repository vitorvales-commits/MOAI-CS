-- Processos da área de CS (13/10/2026).
-- O documento de processos é uma aplicação HTML movida a dados. Fica guardado em duas partes:
-- moldura (o HTML inteiro com o bloco de constantes de dados trocado por /*PROC_DADOS*/) e dados (lista
-- ordenada de constantes: {nome, tipo:'valor', valor} ou {nome, tipo:'fonte', fonte}). Arquivo sem bloco
-- de dados fica inteiro na moldura, com dados vazios.
-- Leitura: qualquer usuário do domínio (is_moai_user). Escrita: só gestor, por funções SECURITY DEFINER.
-- Cada publicação grava a versão completa para comparar e restaurar. Concorrência otimista pela versão.

create table if not exists public.processos_documento (
  id smallint primary key default 1 check (id = 1),
  titulo text not null default 'Processos de CS',
  moldura text not null default '',
  dados jsonb not null default '[]'::jsonb,
  versao integer not null default 0,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.processos_versoes (
  id bigserial primary key,
  versao integer not null unique,
  criado_em timestamptz not null default now(),
  criado_por text,
  descricao text not null,
  tamanho_bytes integer not null,
  snapshot jsonb not null
);

alter table public.processos_documento enable row level security;
alter table public.processos_versoes enable row level security;
revoke all on public.processos_documento, public.processos_versoes from anon, authenticated;
grant select on public.processos_documento, public.processos_versoes to authenticated;

do $pol$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processos_documento' and policyname='processos_documento_select') then
    create policy processos_documento_select on public.processos_documento for select to authenticated using (public.is_moai_user());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='processos_versoes' and policyname='processos_versoes_select') then
    create policy processos_versoes_select on public.processos_versoes for select to authenticated using (coalesce(public.is_gestor(), false));
  end if;
end
$pol$;

insert into public.processos_documento (id) values (1) on conflict (id) do nothing;

-- Quantas versões ficam guardadas. As mais antigas são apagadas a cada publicação.
create or replace function public.processos_max_versoes() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;

create or replace function public.processos_publicar(
  p_titulo text, p_moldura text, p_dados jsonb, p_descricao text, p_versao_base integer
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_atual integer;
  v_nova integer;
  v_snapshot jsonb;
  v_marcadores integer;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if coalesce(trim(p_moldura), '') = '' then
    raise exception 'documento vazio' using errcode = '22023';
  end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'array' then
    raise exception 'dados em formato inválido' using errcode = '22023';
  end if;
  v_marcadores := (length(p_moldura) - length(replace(p_moldura, '/*PROC_DADOS*/', ''))) / length('/*PROC_DADOS*/');
  if (jsonb_array_length(p_dados) > 0 and v_marcadores <> 1) or (jsonb_array_length(p_dados) = 0 and v_marcadores <> 0) then
    raise exception 'moldura e dados não combinam' using errcode = '22023';
  end if;
  if coalesce(trim(p_descricao), '') = '' then
    raise exception 'descreva a alteração' using errcode = '22023';
  end if;

  select versao into v_atual from public.processos_documento where id = 1 for update;
  if p_versao_base is distinct from v_atual then
    raise exception 'conflito: o documento foi publicado por outra pessoa (versão %). Recarregue antes de publicar.', v_atual using errcode = '40001';
  end if;
  v_nova := v_atual + 1;

  update public.processos_documento
     set titulo = coalesce(nullif(trim(p_titulo), ''), 'Processos de CS'), moldura = p_moldura, dados = p_dados,
         versao = v_nova, atualizado_em = now(), atualizado_por = v_email
   where id = 1;

  v_snapshot := jsonb_build_object('titulo', coalesce(nullif(trim(p_titulo), ''), 'Processos de CS'), 'moldura', p_moldura, 'dados', p_dados);
  insert into public.processos_versoes (versao, criado_por, descricao, tamanho_bytes, snapshot)
  values (v_nova, v_email, trim(p_descricao), octet_length(v_snapshot::text), v_snapshot);

  delete from public.processos_versoes where versao <= v_nova - public.processos_max_versoes();

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
  values (v_email, 'processos_publicar', 'processos', 'ok', jsonb_build_object('versao', v_nova, 'descricao', trim(p_descricao)));
  return v_nova;
end
$$;

-- Restaura uma versão antiga publicando-a como nova versão (o histórico nunca é reescrito).
create or replace function public.processos_restaurar(p_versao integer, p_versao_base integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_snap jsonb;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  select snapshot into v_snap from public.processos_versoes where versao = p_versao;
  if v_snap is null then
    raise exception 'versão % não encontrada', p_versao using errcode = '22023';
  end if;
  return public.processos_publicar(v_snap ->> 'titulo', v_snap ->> 'moldura', v_snap -> 'dados',
    'Restauração da versão ' || p_versao, p_versao_base);
end
$$;

revoke all on function public.processos_publicar(text, text, jsonb, text, integer) from public, anon;
revoke all on function public.processos_restaurar(integer, integer) from public, anon;
grant execute on function public.processos_publicar(text, text, jsonb, text, integer) to authenticated;
grant execute on function public.processos_restaurar(integer, integer) to authenticated;
