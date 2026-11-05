-- Fundação de datas para metas semanais (05/11/2026), fase 1 do pedido de metas semanais, bônus e visões.
--
-- O que muda:
--   feriados                          tabela editável de feriados usada no cálculo de dias úteis. RLS: leitura para
--                                     usuários MOAI, escrita só por função de gestor (salvar_feriado, remover_feriado).
--   cases_items.created_at_monday     data de criação do item no Monday (atribuição de cases por semana).
--   rounds_items.created_at_monday    fallback de rounds quando o início não existe.
--   matchmakings_items.created_at_monday          fallback de matchmakings quando a data não existe.
--   matchmakings_items.resultado_alterado_em_monday  changed_at da coluna Resultado no Monday (só leitura, sync).
--   matchmakings_items.resultado_registrado_em       data em que o resultado foi registrado (P5): gravada uma única
--                                     vez, na primeira vez que o resultado aparece preenchido, e nunca sobrescrita.
--
-- Regra P5 implementada por gatilho: só grava quando resultado_registrado_em é nulo e o resultado está preenchido.
-- A carga inicial acontece no próprio sync seguinte, sem script à parte.
-- Idempotente.

-- ---------------------------------------------------------------------------
-- Feriados
-- ---------------------------------------------------------------------------
create table if not exists public.feriados (
  data        date primary key,
  nome        text not null,
  abrangencia text not null default 'nacional',
  criado_por  text,
  criado_em   timestamptz not null default now()
);
comment on table public.feriados is 'Feriados que não contam como dia útil no cálculo de semanas e metas. Escrita só por gestor.';

alter table public.feriados enable row level security;
drop policy if exists moai_select on public.feriados;
create policy moai_select on public.feriados for select using (public.is_moai_user());

create or replace function public.salvar_feriado(p_data date, p_nome text, p_abrangencia text default 'nacional')
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_data is null then
    raise exception 'data é obrigatória' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_nome, '')), '') is null then
    raise exception 'nome é obrigatório' using errcode = '22023';
  end if;
  insert into public.feriados (data, nome, abrangencia, criado_por)
    values (p_data, trim(p_nome), coalesce(nullif(trim(p_abrangencia), ''), 'nacional'), v_actor)
  on conflict (data) do update set nome = excluded.nome, abrangencia = excluded.abrangencia;
end $function$;

create or replace function public.remover_feriado(p_data date)
returns void
language plpgsql security definer set search_path = public as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.feriados where data = p_data;
end $function$;

revoke all on function public.salvar_feriado(date, text, text) from public, anon;
revoke all on function public.remover_feriado(date) from public, anon;
grant execute on function public.salvar_feriado(date, text, text) to authenticated;
grant execute on function public.remover_feriado(date) to authenticated;

-- Seed nacional 2026 e 2027. Carnaval e Corpus Christi ficam para o gestor decidir na tela.
insert into public.feriados (data, nome) values
  ('2026-01-01', 'Confraternização universal'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do trabalho'),
  ('2026-09-07', 'Independência'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Consciência Negra'),
  ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternização universal'),
  ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do trabalho'),
  ('2027-09-07', 'Independência'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Consciência Negra'),
  ('2027-12-25', 'Natal')
on conflict (data) do nothing;

-- ---------------------------------------------------------------------------
-- Datas de criação no Monday (somente leitura do sync)
-- ---------------------------------------------------------------------------
alter table public.cases_items     add column if not exists created_at_monday timestamptz;
alter table public.rounds_items    add column if not exists created_at_monday timestamptz;
alter table public.matchmakings_items add column if not exists created_at_monday timestamptz;

-- ---------------------------------------------------------------------------
-- Resultado de matchmaking: data de registro (P5)
-- ---------------------------------------------------------------------------
alter table public.matchmakings_items add column if not exists resultado_alterado_em_monday timestamptz;
alter table public.matchmakings_items add column if not exists resultado_registrado_em timestamptz;

create or replace function public.matchmakings_marcar_resultado_registrado()
returns trigger
language plpgsql set search_path = public as $function$
begin
  if new.resultado_registrado_em is null and nullif(trim(coalesce(new.resultado, '')), '') is not null then
    new.resultado_registrado_em := coalesce(new.resultado_alterado_em_monday, now());
  end if;
  return new;
end $function$;

drop trigger if exists matchmakings_resultado_registrado on public.matchmakings_items;
create trigger matchmakings_resultado_registrado
  before insert or update on public.matchmakings_items
  for each row execute function public.matchmakings_marcar_resultado_registrado();

-- Carga inicial dos que já têm resultado: não é feita aqui. O sync seguinte envia resultado e
-- resultado_alterado_em_monday na mesma escrita, e o gatilho grava o changed_at real do Monday. Fazer um
-- update agora usaria now() como data, o que contraria P5.

-- ---------------------------------------------------------------------------
-- Classificação de dono do dado (regra da normativa de segurança)
-- ---------------------------------------------------------------------------
insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('feriados', 'nativa', null, true, true, 'Feriados do cálculo de dias úteis; escrita só por gestor')
on conflict (tabela) do update set origem = excluded.origem, versionar = excluded.versionar, atualizado_em = now();

select seguranca.aplicar_protecoes();
