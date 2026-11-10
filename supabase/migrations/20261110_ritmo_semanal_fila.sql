-- Fila de ação, fonte ritmo_semanal (PR 3, 10/11/2026). Idempotente: pode rodar de novo sem efeito colateral.
--
-- Um item por CS e semana quando algum indicador de crescimento de metas semanais fica abaixo do limiar
-- (padrão 0,70 da meta efetiva). Lê metas_semanais_fechamento, a mesma fonte da tela: nenhum recálculo aqui.
-- Gerado no fechamento de segunda (lib/metas-semanais-fechamento.ts) pela função gerar_itens_ritmo_semanal.
-- Idempotente por (fonte, cs_nome, semana_inicio). Item já tratado não é alterado.
--
-- Regras:
--   realizado ausente (null) não entra: ausência não vira zero. Realizado zero entra.
--   Limiar em ritmo_semanal_config (chave 'limiar'), editável pelo gestor com salvar_limiar_ritmo.
--   Item aberto que deixa de estar abaixo do limiar continua aberto até o gestor tratar: não é apagado.
--
-- Retroativo: a semana de 02/11 a 08/11 é gerada no fim desta migração, a partir do fechamento já gravado.

-- ---------------------------------------------------------------------------
-- Configuração: limiar do ritmo semanal
-- ---------------------------------------------------------------------------
create table if not exists public.ritmo_semanal_config (
  chave           text primary key,
  valor           numeric not null,
  atualizado_por  text,
  atualizado_em   timestamptz not null default now(),
  constraint ritmo_semanal_config_limiar check (chave <> 'limiar' or (valor > 0 and valor <= 1))
);
insert into public.ritmo_semanal_config (chave, valor) values ('limiar', 0.70) on conflict (chave) do nothing;
alter table public.ritmo_semanal_config enable row level security;
drop policy if exists moai_select on public.ritmo_semanal_config;
create policy moai_select on public.ritmo_semanal_config for select using (public.is_moai_user());

-- ---------------------------------------------------------------------------
-- Fila de ação (itens persistidos)
-- ---------------------------------------------------------------------------
create table if not exists public.fila_acao_itens (
  id              uuid primary key default gen_random_uuid(),
  fonte           text not null,
  cs_nome         text not null,
  semana_inicio   date not null,
  semana_fim      date not null,
  indicadores     jsonb not null default '[]'::jsonb,
  deficit_total   numeric not null default 0,
  responsavel     text not null default 'gestao',
  proximo_passo   text not null default 'Tratar na 1:1 da semana',
  status          text not null default 'aberto',
  tratado_em      timestamptz,
  tratado_por     text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint fila_acao_itens_fonte check (fonte in ('ritmo_semanal')),
  constraint fila_acao_itens_status check (status in ('aberto', 'tratado')),
  constraint fila_acao_itens_segunda check (extract(isodow from semana_inicio) = 1),
  constraint fila_acao_itens_unica unique (fonte, cs_nome, semana_inicio)
);
alter table public.fila_acao_itens enable row level security;
drop policy if exists gestor_select on public.fila_acao_itens;
create policy gestor_select on public.fila_acao_itens for select using (public.is_gestor());

-- ---------------------------------------------------------------------------
-- Geração: chamada pelo fechamento de segunda (service role) e pelo retroativo desta migração.
-- Devolve quantos itens foram gravados ou atualizados.
-- ---------------------------------------------------------------------------
create or replace function public.gerar_itens_ritmo_semanal(p_semana_inicio date)
returns integer
language plpgsql security definer set search_path = public as $function$
declare
  v_limiar numeric;
  v_gravadas integer;
begin
  if p_semana_inicio is null or extract(isodow from p_semana_inicio) <> 1 then
    raise exception 'semana_inicio precisa ser uma segunda-feira' using errcode = '22023';
  end if;
  select valor into v_limiar from public.ritmo_semanal_config where chave = 'limiar';
  if v_limiar is null then
    raise exception 'limiar do ritmo semanal não configurado' using errcode = '22023';
  end if;

  with abaixo as (
    select f.cs_nome, f.indicador, f.base, f.meta_efetiva, f.realizado, (f.meta_efetiva - f.realizado) as deficit
      from public.metas_semanais_fechamento f
     where f.semana_inicio = p_semana_inicio
       and f.indicador in ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds')
       and f.meta_efetiva > 0
       and f.realizado is not null
       and f.realizado < v_limiar * f.meta_efetiva
  ),
  por_cs as (
    select cs_nome,
           jsonb_agg(jsonb_build_object('indicador', indicador, 'base', base, 'meta_efetiva', meta_efetiva,
                                        'realizado', realizado, 'deficit', deficit) order by indicador) as indicadores,
           sum(deficit) as deficit_total
      from abaixo
     group by cs_nome
  )
  insert into public.fila_acao_itens (fonte, cs_nome, semana_inicio, semana_fim, indicadores, deficit_total)
  select 'ritmo_semanal', cs_nome, p_semana_inicio, p_semana_inicio + 6, indicadores, deficit_total from por_cs
  on conflict (fonte, cs_nome, semana_inicio) do update
    set indicadores = excluded.indicadores, deficit_total = excluded.deficit_total, atualizado_em = now()
    where public.fila_acao_itens.status = 'aberto';
  get diagnostics v_gravadas = row_count;
  return v_gravadas;
end $function$;
revoke all on function public.gerar_itens_ritmo_semanal(date) from public, anon, authenticated;
grant execute on function public.gerar_itens_ritmo_semanal(date) to service_role;

-- ---------------------------------------------------------------------------
-- Funções do gestor: limiar e tratamento de item. Checam is_gestor dentro do banco.
-- ---------------------------------------------------------------------------
create or replace function public.salvar_limiar_ritmo(p_valor numeric)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 1 then
    raise exception 'limiar precisa estar entre 0 e 1' using errcode = '22023';
  end if;
  update public.ritmo_semanal_config
     set valor = p_valor, atualizado_por = v_actor, atualizado_em = now()
   where chave = 'limiar';
end $function$;
revoke all on function public.salvar_limiar_ritmo(numeric) from public, anon;
grant execute on function public.salvar_limiar_ritmo(numeric) to authenticated;

create or replace function public.tratar_item_ritmo(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.fila_acao_itens
     set status = 'tratado', tratado_em = now(), tratado_por = v_actor, atualizado_em = now()
   where id = p_id and fonte = 'ritmo_semanal' and status = 'aberto';
  if not found then
    raise exception 'item não encontrado ou já tratado' using errcode = '22023';
  end if;
end $function$;
revoke all on function public.tratar_item_ritmo(uuid) from public, anon;
grant execute on function public.tratar_item_ritmo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Normativa: classificação das tabelas novas e proteções (regra da 20261030b)
-- ---------------------------------------------------------------------------
insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('ritmo_semanal_config', 'nativa', null, true, true, 'Limiar do ritmo semanal, editável pelo gestor'),
  ('fila_acao_itens',      'nativa', null, true, true, 'Fila de ação, fonte ritmo_semanal: um item por CS e semana')
on conflict (tabela) do update set origem = excluded.origem, versionar = excluded.versionar,
  descricao = excluded.descricao, atualizado_em = now();

select seguranca.aplicar_protecoes();

-- Retroativo: semana de 02/11 a 08/11, já fechada em 09/11. Idempotente.
select public.gerar_itens_ritmo_semanal('2026-11-02');
