-- Vínculo entre o nome digitado na agenda (agenda_conselhos_items.conselheiro_nome) e o cadastro
-- de conselheiros (conselheiros.monday_item_id). Usado pelo componente de agenda para mostrar nome
-- completo e foto. Sem dicionário de apelidos no código: o vínculo fica nesta tabela.
-- 13/10/2026. Aditiva: não altera tabelas existentes nem policies.

-- Normalização de nome para casamento: sem conteúdo entre colchetes ou parênteses, sem acento,
-- minúsculo, espaços colapsados. Não depende da extensão unaccent (não instalada).
create or replace function public.agenda_nome_normalizado(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
           lower(translate(
             regexp_replace(coalesce(p, ''), '\s*[\[(][^\])]*[\])]', '', 'g'),
             'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
             'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
           '\s+', ' ', 'g'))
$$;

create table if not exists public.agenda_conselheiro_vinculo (
  nome_agenda text primary key,
  conselheiro_monday_item_id bigint references public.conselheiros(monday_item_id) on delete set null,
  origem text not null check (origem in ('automatico', 'manual')),
  atualizado_em timestamptz not null default now()
);

alter table public.agenda_conselheiro_vinculo enable row level security;

drop policy if exists moai_select on public.agenda_conselheiro_vinculo;
create policy moai_select on public.agenda_conselheiro_vinculo
  for select to authenticated using (is_moai_user());

revoke all on public.agenda_conselheiro_vinculo from anon, public;
grant select on public.agenda_conselheiro_vinculo to authenticated;

-- Preenchimento automático. Idempotente: só cria linha para nome da agenda que ainda não tem
-- vínculo, e nunca sobrescreve origem manual. Regra: (1) nome normalizado igual ao de um
-- conselheiro; (2) senão, prefixo único de nome (ex. "Kadydja" casa com "Kadydja Albuquerque"
-- só se houver exatamente um conselheiro com esse prefixo). Sem casamento, não cria linha.
-- Chamada no backfill (sem sessão) ou por gestor logado. Nunca por leitura da agenda.
create or replace function public.vincular_conselheiros_agenda()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
  on conflict (nome_agenda) do nothing;

  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end;
$$;

-- Vínculo manual pelo gestor, para os nomes que não casam automaticamente.
create or replace function public.definir_vinculo_conselheiro(p_nome_agenda text, p_monday_item_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_gestor() then
    raise exception 'Somente gestor pode definir vínculo.' using errcode = '42501';
  end if;
  if p_nome_agenda is null or p_nome_agenda = '' then
    raise exception 'Nome da agenda obrigatório.';
  end if;
  insert into public.agenda_conselheiro_vinculo (nome_agenda, conselheiro_monday_item_id, origem, atualizado_em)
  values (p_nome_agenda, p_monday_item_id, 'manual', now())
  on conflict (nome_agenda) do update
    set conselheiro_monday_item_id = excluded.conselheiro_monday_item_id,
        origem = 'manual',
        atualizado_em = now();
end;
$$;

revoke all on function public.vincular_conselheiros_agenda() from public, anon;
revoke all on function public.definir_vinculo_conselheiro(text, bigint) from public, anon;
grant execute on function public.vincular_conselheiros_agenda() to authenticated, service_role;
grant execute on function public.definir_vinculo_conselheiro(text, bigint) to authenticated, service_role;
revoke all on function public.agenda_nome_normalizado(text) from public, anon;
grant execute on function public.agenda_nome_normalizado(text) to authenticated, service_role;
