-- Rastreio de reconquista (08/10/2026). Quem respondeu no formulário de saída (board de churn
-- 10008640053) que voltaria para a MOAI vira um item de acompanhamento do gestor: status do contato,
-- responsável, data do próximo contato e observação. A lista em si sai de churn_items + churn_detalhes
-- (nota_retorno); esta tabela guarda apenas o que o gestor registra. Linha ausente significa status
-- a_contatar. Se o item some do Monday, o rastreio some junto (cascade), como na Voz do liderado.
-- Aditiva: não altera nenhuma tabela existente.

create table if not exists public.reconquista_ex_membros (
  churn_id        bigint primary key references public.churn_items(id) on delete cascade,
  status          text not null default 'a_contatar'
                  check (status in ('a_contatar', 'contatado', 'em_conversa', 'voltou', 'sem_interesse')),
  responsavel     text check (responsavel is null or char_length(responsavel) <= 80),
  proximo_contato date,
  observacao      text check (observacao is null or char_length(observacao) <= 600),
  atualizado_por  text,
  atualizado_em   timestamptz,
  criado_em       timestamptz not null default now()
);

comment on table public.reconquista_ex_membros is
  'Rastreio de reconquista de ex membros que disseram que voltariam (nota_retorno no formulário de saída). Só gestor lê; escrita só por reconquista_definir.';

alter table public.reconquista_ex_membros enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reconquista_ex_membros' and policyname = 'gestor_select') then
    create policy gestor_select on public.reconquista_ex_membros for select to authenticated using (public.is_gestor());
  end if;
end $$;

revoke all on public.reconquista_ex_membros from anon, authenticated;
grant select on public.reconquista_ex_membros to authenticated;

create or replace function public.reconquista_definir(
  p_churn_id bigint,
  p_status text,
  p_responsavel text default null,
  p_proximo_contato date default null,
  p_observacao text default null
)
returns public.reconquista_ex_membros
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor    text := auth.jwt() ->> 'email';
  v_anterior text;
  v_row      public.reconquista_ex_membros;
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('a_contatar', 'contatado', 'em_conversa', 'voltou', 'sem_interesse') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.churn_items where id = p_churn_id) then
    raise exception 'saída não encontrada' using errcode = 'P0002';
  end if;

  select status into v_anterior from public.reconquista_ex_membros where churn_id = p_churn_id;

  insert into public.reconquista_ex_membros as r (churn_id, status, responsavel, proximo_contato, observacao, atualizado_por, atualizado_em)
  values (
    p_churn_id, p_status,
    nullif(btrim(left(coalesce(p_responsavel, ''), 80)), ''),
    p_proximo_contato,
    nullif(btrim(left(coalesce(p_observacao, ''), 600)), ''),
    v_actor, now()
  )
  on conflict (churn_id) do update
    set status = excluded.status,
        responsavel = excluded.responsavel,
        proximo_contato = excluded.proximo_contato,
        observacao = excluded.observacao,
        atualizado_por = excluded.atualizado_por,
        atualizado_em = excluded.atualizado_em
  returning * into v_row;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'reconquista_definir', p_churn_id::text, 'success', jsonb_build_object('de', coalesce(v_anterior, 'a_contatar'), 'para', p_status));

  return v_row;
end;
$function$;

revoke all on function public.reconquista_definir(bigint, text, text, date, text) from public, anon;
grant execute on function public.reconquista_definir(bigint, text, text, date, text) to authenticated;
