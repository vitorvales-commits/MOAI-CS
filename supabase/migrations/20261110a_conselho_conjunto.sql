-- Conselho conjunto (10/11/2026). Um nome da agenda pode ter mais de um conselheiro vinculado (ex.: "Rafael e
-- Rodrigo Gianesini"), e um encontro pode pertencer a mais de um grupo de Executivo (um por CS responsável).
-- Idempotente: pode ser reaplicada sem efeito extra.

-- 1. Vínculo agenda -> conselheiros: a chave passa a ser (nome_agenda, conselheiro_monday_item_id).
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.agenda_conselheiro_vinculo'::regclass
                    and conname = 'agenda_conselheiro_vinculo_pkey' and array_length(conkey, 1) = 2) then
    alter table public.agenda_conselheiro_vinculo drop constraint if exists agenda_conselheiro_vinculo_pkey;
    alter table public.agenda_conselheiro_vinculo add constraint agenda_conselheiro_vinculo_pkey primary key (nome_agenda, conselheiro_monday_item_id);
  end if;
end $$;

-- Os gatilhos de lixeira e de versão identificavam a linha só por nome_agenda; com mais de um conselheiro por
-- nome a chave precisa dos dois campos.
drop trigger if exists zz_seguranca_lixeira on public.agenda_conselheiro_vinculo;
create trigger zz_seguranca_lixeira before delete on public.agenda_conselheiro_vinculo
  for each row execute function seguranca.gatilho_lixeira('nome_agenda', 'conselheiro_monday_item_id');
drop trigger if exists zz_seguranca_versao on public.agenda_conselheiro_vinculo;
create trigger zz_seguranca_versao after update on public.agenda_conselheiro_vinculo
  for each row execute function seguranca.gatilho_versao('nome_agenda', 'conselheiro_monday_item_id');

-- Vínculos do conselho conjunto (cadastros de Rafael e Rodrigo Gianesini).
insert into public.agenda_conselheiro_vinculo (nome_agenda, conselheiro_monday_item_id, origem, atualizado_em)
values ('Rafael e Rodrigo Gianesini', 10866398560, 'manual', now()),
       ('Rafael e Rodrigo Gianesini', 10866387336, 'manual', now())
on conflict do nothing;

-- Vínculo manual de um nome: troca o conjunto inteiro de conselheiros daquele nome pelo informado (null = sem vínculo).
create or replace function public.definir_vinculo_conselheiro(p_nome_agenda text, p_monday_item_id bigint)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_gestor() then
    raise exception 'Somente gestor pode definir vínculo.' using errcode = '42501';
  end if;
  if p_nome_agenda is null or p_nome_agenda = '' then
    raise exception 'Nome da agenda obrigatório.';
  end if;
  delete from public.agenda_conselheiro_vinculo where nome_agenda = p_nome_agenda;
  if p_monday_item_id is not null then
    insert into public.agenda_conselheiro_vinculo (nome_agenda, conselheiro_monday_item_id, origem, atualizado_em)
    values (p_nome_agenda, p_monday_item_id, 'manual', now());
  end if;
end;
$$;

-- Preenchimento automático: só nomes sem nenhum vínculo, e só quando há um único cadastro que casa.
create or replace function public.vincular_conselheiros_agenda()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_inseridos integer;
begin
  if auth.uid() is not null and not public.is_gestor() then
    raise exception 'Somente gestor pode vincular conselheiros.' using errcode = '42501';
  end if;

  with nomes as (
    select distinct conselheiro_nome as nome_agenda
    from public.agenda_conselhos_items
    where conselheiro_nome is not null and conselheiro_nome <> ''
  ),
  pendentes as (
    select n.nome_agenda
    from nomes n
    where not exists (select 1 from public.agenda_conselheiro_vinculo v where v.nome_agenda = n.nome_agenda)
  ),
  exato as (
    select p.nome_agenda, min(c.monday_item_id) as item_id, count(*) as qtd
    from pendentes p
    join public.conselheiros c on public.agenda_nome_normalizado(c.nome) = public.agenda_nome_normalizado(p.nome_agenda)
    group by p.nome_agenda
  ),
  prefixo as (
    select p.nome_agenda, min(c.monday_item_id) as item_id, count(*) as qtd
    from pendentes p
    join public.conselheiros c
      on public.agenda_nome_normalizado(c.nome) like public.agenda_nome_normalizado(p.nome_agenda) || ' %'
    where not exists (select 1 from exato e where e.nome_agenda = p.nome_agenda)
    group by p.nome_agenda
  ),
  escolhido as (
    select nome_agenda, item_id from exato where qtd = 1
    union all
    select nome_agenda, item_id from prefixo where qtd = 1
  )
  insert into public.agenda_conselheiro_vinculo (nome_agenda, conselheiro_monday_item_id, origem, atualizado_em)
  select nome_agenda, item_id, 'automatico', now() from escolhido
  on conflict (nome_agenda, conselheiro_monday_item_id) do nothing;

  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end;
$$;

-- 2. Encontros: um encontro da agenda pode gerar uma linha por grupo (chave = agenda_item_id + group_id).
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.encontros_conselho'::regclass
                    and conname = 'encontros_conselho_pkey' and array_length(conkey, 1) = 2) then
    alter table public.encontros_conselho drop constraint if exists encontros_conselho_pkey;
    alter table public.encontros_conselho add constraint encontros_conselho_pkey primary key (agenda_item_id, group_id);
  end if;
end $$;

create or replace function public.sincronizar_encontros_conselho(p_itens jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v integer;
begin
  if not (public.is_gestor() or auth.role() = 'service_role') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'itens inválidos' using errcode = '22023';
  end if;
  create temporary table _enc_novos on commit drop as
    select distinct a.id as agenda_item_id, x.group_id, a.data_iso, a.status
      from jsonb_to_recordset(p_itens) as x(agenda_item_id bigint, group_id text)
      join public.agenda_conselhos_items a on a.id = x.agenda_item_id
      join public.conselhos_grupos g on g.group_id = x.group_id
     where a.data_iso is not null;
  insert into public.encontros_conselho as e (agenda_item_id, group_id, data_iso, status_agenda)
    select n.agenda_item_id, n.group_id, n.data_iso, n.status from _enc_novos n
  on conflict (agenda_item_id, group_id) do update
    set data_iso = excluded.data_iso, status_agenda = excluded.status_agenda, atualizado_em = now()
    where (e.data_iso, e.status_agenda) is distinct from (excluded.data_iso, excluded.status_agenda);
  if exists (select 1 from _enc_novos) then
    delete from public.encontros_conselho e
     where not exists (select 1 from _enc_novos n where n.agenda_item_id = e.agenda_item_id and n.group_id = e.group_id);
  end if;
  select count(*) into v from public.encontros_conselho;
  drop table if exists _enc_novos;
  return v;
end;
$$;
