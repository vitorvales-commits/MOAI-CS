-- Eventos da MOAI na agenda, com escala, meta e ingressos do Sympla (11/11/2026).
--
-- eventos_items: espelho do board "Escala de Eventos" (18396183284, workspace Conselhos Estratégicos),
--   gravado pela sync-monday (tarefa eventos). O link dos convites não é guardado: só o id numérico do
--   evento no Sympla, extraído dele, porque o link de evento privado carrega token de acesso.
-- sympla_eventos: eventos do organizador no Sympla com contagens (ingressos, check-ins, vendas em 7 dias),
--   gravado pela Edge Function sync-sympla. Nenhum dado de participante (nome, email, documento) é gravado.
-- As duas tabelas só aceitam leitura de usuário MOAI; escrita só pela service role.
-- Agendamento: sync-sympla a cada 15 minutos, com os segredos lidos do Vault na hora (nada no repositório).

create table if not exists public.eventos_items (
  id                bigint primary key,
  board_group_id    text,
  mes_grupo_titulo  text,
  nome              text not null,
  nome_limpo        text,
  data_inicio       date,
  data_fim          date,
  horario_raw       text,
  turno_raw         text,
  inicio            timestamptz,
  local             text,
  label             text,
  produto           text,
  escala_status     text,
  status_evento     text,
  meta_raw          text,
  escalados_raw     text,
  escalados_fonte   text check (escalados_fonte in ('coluna', 'subitens')),
  sympla_event_id   bigint,
  created_at_monday timestamptz,
  synced_at         timestamptz not null default now()
);
create index if not exists eventos_items_data_inicio_idx on public.eventos_items (data_inicio);
create index if not exists eventos_items_sympla_idx on public.eventos_items (sympla_event_id);
comment on table public.eventos_items is 'Espelho do board Escala de Eventos (18396183284). Origem Monday; o dash só lê.';

create table if not exists public.sympla_eventos (
  id            bigint primary key,
  nome          text not null,
  inicio        timestamptz,
  fim           timestamptz,
  url           text,
  publicado     boolean,
  cancelado     boolean,
  vendidos      integer,
  checkins      integer,
  vendidos_7d   integer,
  ultima_venda  timestamptz,
  contagem_em   timestamptz,
  synced_at     timestamptz not null default now()
);
create index if not exists sympla_eventos_inicio_idx on public.sympla_eventos (inicio);
comment on table public.sympla_eventos is 'Eventos do Sympla com contagens agregadas. Sem dado pessoal de participante.';

alter table public.eventos_items enable row level security;
alter table public.sympla_eventos enable row level security;
drop policy if exists moai_select on public.eventos_items;
create policy moai_select on public.eventos_items for select to authenticated using (public.is_moai_user());
drop policy if exists moai_select on public.sympla_eventos;
create policy moai_select on public.sympla_eventos for select to authenticated using (public.is_moai_user());
revoke insert, update, delete, truncate on public.eventos_items from anon, authenticated;
revoke insert, update, delete, truncate on public.sympla_eventos from anon, authenticated;
revoke all on public.eventos_items from anon;
revoke all on public.sympla_eventos from anon;
grant select on public.eventos_items to authenticated;
grant select on public.sympla_eventos to authenticated;

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('eventos_items',  'monday',  '18396183284', true, false, 'Escala de Eventos: data, horário, meta e escalados'),
  ('sympla_eventos', 'externa', null,          true, false, 'Eventos e contagens de ingressos do Sympla, sem dado pessoal')
on conflict (tabela) do update set origem = excluded.origem, board_monday = excluded.board_monday, descricao = excluded.descricao, atualizado_em = now();

-- Disparo da sync-sympla pelo cron. Sem os segredos no Vault, não faz nada.
create or replace function public.sympla_disparar() returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare
  v_secret text;
  v_auth text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'sync_function_secret';
  select decrypted_secret into v_auth from vault.decrypted_secrets where name = 'sync_function_authorization';
  if v_secret is null or v_auth is null then return false; end if;
  perform net.http_post(
    url := 'https://evwdfeumlnxeqnnakdvq.supabase.co/functions/v1/sync-sympla',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', v_auth, 'X-Sync-Secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$fn$;
revoke all on function public.sympla_disparar() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-sympla-15min') then
    perform cron.unschedule('sync-sympla-15min');
  end if;
  perform cron.schedule('sync-sympla-15min', '*/15 * * * *', 'select public.sympla_disparar()');
end $$;
