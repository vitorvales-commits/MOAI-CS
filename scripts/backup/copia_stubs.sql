-- Stubs para a cópia restaurada usada no teste de migrações. O dump não traz cron, vault, pg_net, o registro
-- de migrações do Supabase nem as extensões; estes objetos só existem na cópia e nunca rodam na produção.

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  name       text,
  statements text[]
);

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists cron;
create table if not exists cron.job (
  jobid    bigserial primary key,
  jobname  text,
  command  text,
  schedule text
);
create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint language sql as $$ select 1::bigint $$;

create schema if not exists vault;
create table if not exists vault.secrets (
  id          uuid primary key default gen_random_uuid(),
  name        text unique,
  secret      text,
  description text
);
create or replace view vault.decrypted_secrets as
  select id, name, secret as decrypted_secret, description from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text, new_description text)
returns uuid language sql as $$
  insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id
$$;

create schema if not exists net;
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb)
returns bigint language sql as $$ select 1::bigint $$;
