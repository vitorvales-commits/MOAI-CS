-- Períodos de quem foi CS (revisão out/2026, rodada 2, Fase 4).
-- ESCRITA COMO ARQUIVO. NÃO APLICADA: o gestor aplica no Supabase e depois roda supabase/seed/cs_periodos.sql.
-- Cada linha diz em que mês a pessoa entrou e saiu da função de CS. O histórico da fotografia
-- (cs_fechamento_mensal) usa esta tabela para ranquear só quem era CS naquele mês.

create table if not exists public.cs_periodos (
  nome_curto text primary key,
  nome_completo text not null,
  primeiro_mes date not null,
  ultimo_mes date,
  origem text not null,
  confirmado boolean not null default false,
  constraint cs_periodos_primeiro_dia check (extract(day from primeiro_mes) = 1),
  constraint cs_periodos_ultimo_dia check (ultimo_mes is null or extract(day from ultimo_mes) = 1),
  constraint cs_periodos_ordem check (ultimo_mes is null or ultimo_mes >= primeiro_mes)
);

alter table public.cs_periodos enable row level security;

drop policy if exists moai_select on public.cs_periodos;
create policy moai_select on public.cs_periodos
  for select to authenticated
  using (public.is_moai_user());

comment on table public.cs_periodos is 'Período em que cada pessoa foi CS (primeiro e último mês com meta). Ver lib/cs-periodos.ts.';
