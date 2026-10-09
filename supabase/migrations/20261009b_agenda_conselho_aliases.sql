-- Aliases entre o nome do conselheiro na agenda e o grupo do NPS (revisão out/2026, rodada 2, Parte B).
-- ESCRITA COMO ARQUIVO. NÃO APLICADA. Leitura para usuários autenticados; escrita só pela service role.
create table if not exists public.agenda_conselho_aliases (
  conselheiro_nome text not null,
  group_id text not null,
  confirmado boolean not null default false,
  confirmado_por text,
  confirmado_em timestamptz,
  criado_em timestamptz not null default now(),
  primary key (conselheiro_nome, group_id)
);

alter table public.agenda_conselho_aliases enable row level security;

drop policy if exists agenda_alias_select on public.agenda_conselho_aliases;
create policy agenda_alias_select on public.agenda_conselho_aliases
  for select to authenticated
  using (true);

comment on table public.agenda_conselho_aliases is 'Liga o nome do conselheiro da agenda ao group_id do NPS quando o casamento automático não resolve. Ver lib/nps-agenda.ts.';
