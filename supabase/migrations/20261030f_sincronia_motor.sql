-- ============================================================================
-- Normativa de dados, etapa 4a: fila de escrita do dash para o Monday (01/11/2026)
--
-- O dash edita um item do Monday só por esta fila. A Edge Function sync-monday é a única peça que
-- conversa com o Monday; este schema só guarda a intenção e o estado de cada escrita.
--
-- O que muda (aditivo):
--   sincronia.configuracao          chave de liga/desliga da fila (fila_escrita_ativa, começa desligada)
--   sincronia.campos_editaveis      lista explícita do que o dash pode editar no Monday (piloto: Visita Churns)
--   sincronia.comandos              cada escrita pedida, com estado; não existe operação de exclusão
--   public.enfileirar_edicao_monday chamada do app: valida papel e carteira e grava o comando
--   sincronia.disparar_fila()       chama a sync-monday (tarefa fila_escrita) via pg_net, com o segredo do Vault
--   public.sincronia_*              funções para a Edge Function (service role) e para o gestor
--
-- O segredo da função sync-monday é lido do próprio cron e gravado no Vault, sem ser exibido.
-- Nada disso processa coisa alguma enquanto a chave estiver desligada.
-- ============================================================================

create schema if not exists sincronia;
revoke all on schema sincronia from public, anon, authenticated;

create table if not exists sincronia.configuracao (
  chave          text primary key,
  valor          boolean not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por text not null
);
insert into sincronia.configuracao (chave, valor, atualizado_por)
values ('fila_escrita_ativa', false, 'migracao 20261030f')
on conflict (chave) do nothing;

create table if not exists sincronia.campos_editaveis (
  board_id     text not null,
  coluna_id    text not null,
  tipo_coluna  text not null,
  rotulo       text not null,
  papel        text not null check (papel in ('gestor', 'cs')),
  ativo        boolean not null default true,
  primary key (board_id, coluna_id)
);
insert into sincronia.campos_editaveis (board_id, coluna_id, tipo_coluna, rotulo, papel, ativo) values
  ('18432210313', 'date_mm7eccg9', 'date', 'Próximo acompanhamento', 'cs', true),
  ('18432210313', 'text_mm7eya7z', 'text', 'Observações da visita', 'cs', true)
on conflict (board_id, coluna_id) do nothing;

create table if not exists sincronia.comandos (
  id                    bigint generated always as identity primary key,
  chave_idempotencia    text not null unique,
  operacao              text not null check (operacao in ('atualizar_colunas', 'criar_item', 'criar_atualizacao')),
  board_id              text not null,
  item_id               text,
  grupo_id              text,
  nome_item             text,
  valores               jsonb not null,
  valores_anteriores    jsonb,
  lido_em               timestamptz,
  estado                text not null default 'pendente'
                          check (estado in ('pendente', 'executando', 'concluido', 'conflito', 'erro', 'cancelado')),
  tentativas            integer not null default 0,
  proxima_tentativa_em  timestamptz not null default now(),
  erro                  text,
  resultado             jsonb,
  origem_tabela         text,
  origem_chave          text,
  criado_por            text not null,
  criado_em             timestamptz not null default now(),
  executado_em          timestamptz
);
create index if not exists comandos_pendentes_idx on sincronia.comandos (proxima_tentativa_em) where estado = 'pendente';

alter table sincronia.configuracao enable row level security;
alter table sincronia.campos_editaveis enable row level security;
alter table sincronia.comandos enable row level security;
revoke all on all tables in schema sincronia from anon, authenticated;

-- Segredos da Edge Function, lidos do próprio cron e gravados no Vault sem exibir o valor.
do $$
declare
  v_cmd text;
  v_secret text;
  v_auth text;
begin
  select command into v_cmd from cron.job where jobname = 'sync-monday-5min';
  v_secret := (regexp_match(v_cmd, '"X-Sync-Secret": "([^"]+)"'))[1];
  v_auth := (regexp_match(v_cmd, '"Authorization": "([^"]+)"'))[1];
  if v_secret is null or v_auth is null then
    -- Sem o valor no cron (cópia restaurada ou ambiente novo): avisa e segue. O gatilho trata a ausência do
    -- segredo, e o ciclo de 5 minutos processa a fila quando ele existir.
    raise notice 'segredo da sync-monday não encontrado no cron; o Vault não foi preenchido';
  end if;
  if v_secret is not null and not exists (select 1 from vault.secrets where name = 'sync_function_secret') then
    perform vault.create_secret(v_secret, 'sync_function_secret', 'Segredo X-Sync-Secret da sync-monday, lido do cron');
  end if;
  if v_auth is not null and not exists (select 1 from vault.secrets where name = 'sync_function_authorization') then
    perform vault.create_secret(v_auth, 'sync_function_authorization', 'Authorization da sync-monday, lido do cron');
  end if;
end $$;

-- Quem pode chamar: o serviço (service role ou postgres) ou o time MOAI, conforme a função.
create or replace function sincronia.chamador_privilegiado() returns boolean
language sql stable set search_path = '' as $fn$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'postgres')
         in ('service_role', 'postgres');
$fn$;

create or replace function sincronia.fila_ativa() returns boolean
language sql stable set search_path = '' as $fn$
  select coalesce((select c.valor from sincronia.configuracao c where c.chave = 'fila_escrita_ativa'), false);
$fn$;

-- Leitura e alteração da chave: gestor ou serviço. A alteração é auditada.
create or replace function public.sincronia_fila_ativa() returns boolean
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor lê a configuração da fila de escrita.';
  end if;
  return sincronia.fila_ativa();
end;
$fn$;

create or replace function public.sincronia_definir_fila_ativa(p_ativa boolean) returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare
  v_autor text := seguranca.autor_atual();
  v_antes boolean := sincronia.fila_ativa();
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor altera a fila de escrita.';
  end if;
  update sincronia.configuracao
    set valor = p_ativa, atualizado_em = now(), atualizado_por = v_autor
    where chave = 'fila_escrita_ativa';
  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (v_autor, 'sincronia_fila_ativa', 'sincronia.configuracao', 'ok',
          jsonb_build_object('antes', v_antes, 'depois', p_ativa));
  return p_ativa;
end;
$fn$;

-- Dispara a tarefa fila_escrita da sync-monday por pg_net. Sem segredo no Vault ou com a chave desligada,
-- não faz nada: o ciclo de 5 minutos processa a fila.
create or replace function sincronia.disparar_fila() returns integer
language plpgsql security definer set search_path = '' as $fn$
declare
  v_secret text;
  v_auth text;
  v_pendentes integer;
begin
  if not sincronia.fila_ativa() then return 0; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'sync_function_secret';
  select decrypted_secret into v_auth from vault.decrypted_secrets where name = 'sync_function_authorization';
  if v_secret is null or v_auth is null then return 0; end if;
  select count(*) into v_pendentes from sincronia.comandos
    where estado = 'pendente' and proxima_tentativa_em <= now();
  if v_pendentes = 0 then return 0; end if;
  perform net.http_post(
    url := 'https://evwdfeumlnxeqnnakdvq.supabase.co/functions/v1/sync-monday?board=fila_escrita',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', v_auth, 'X-Sync-Secret', v_secret),
    body := '{}'::jsonb
  );
  return v_pendentes;
end;
$fn$;

create or replace function sincronia.gatilho_comandos() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  if new.estado = 'pendente' and new.proxima_tentativa_em <= now() then
    perform sincronia.disparar_fila();
  end if;
  return null;
end;
$fn$;

drop trigger if exists comandos_disparar on sincronia.comandos;
create trigger comandos_disparar after insert on sincronia.comandos
  for each row execute function sincronia.gatilho_comandos();

-- Chamada do app. Valida o time, a chave, as colunas, o papel e a carteira; depois grava o comando.
-- p_adiar_segundos adia o disparo (usado no teste de conflito); o padrão dispara já.
create or replace function public.enfileirar_edicao_monday(
  p_board_id text,
  p_item_id text,
  p_valores jsonb,
  p_lido_em timestamptz,
  p_chave text,
  p_adiar_segundos integer default 0
) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare
  v_autor text := seguranca.autor_atual();
  v_coluna text;
  v_campo sincronia.campos_editaveis%rowtype;
  v_grupo text;
  v_cs_id bigint;
  v_id bigint;
begin
  if not (sincronia.chamador_privilegiado() or public.is_moai_user()) then
    raise exception 'Acesso restrito ao time MOAI.';
  end if;
  if not sincronia.fila_ativa() then
    raise exception 'Fila de escrita desligada: a edição não foi enviada ao Monday. O gestor precisa ligar a chave fila_escrita_ativa.';
  end if;
  if coalesce(p_chave, '') = '' then raise exception 'Chave de idempotência obrigatória.'; end if;
  if p_valores is null or jsonb_typeof(p_valores) <> 'object' or p_valores = '{}'::jsonb then
    raise exception 'Nenhum valor para enviar.';
  end if;

  for v_coluna in select jsonb_object_keys(p_valores) loop
    select * into v_campo from sincronia.campos_editaveis
      where board_id = p_board_id and coluna_id = v_coluna and ativo;
    if not found then
      raise exception 'Coluna % não é editável pelo dash neste board.', v_coluna;
    end if;
    if v_campo.papel = 'gestor' and not (sincronia.chamador_privilegiado() or public.is_gestor()) then
      raise exception 'A coluna % é restrita a gestor.', v_campo.rotulo;
    end if;
  end loop;

  -- CS: só edita item de conselho da própria carteira (vigência aberta, cs_id = o CS logado).
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    select v.group_id into v_grupo from public.visitas_churn v where v.id::text = p_item_id;
    if v_grupo is null then raise exception 'Item inexistente neste board.'; end if;
    select c.id into v_cs_id from canonico.cs c
      where canonico.normalizar(c.nome_curto) = canonico.normalizar(public.meu_cs());
    if not exists (
      select 1 from canonico.conselho_cs_vigencia x
      where x.group_id = v_grupo and x.cs_id = v_cs_id and upper(x.vigencia) is null
    ) then
      raise exception 'Item fora da sua carteira.';
    end if;
  end if;

  insert into sincronia.comandos
    (chave_idempotencia, operacao, board_id, item_id, valores, lido_em, origem_tabela, origem_chave, criado_por, proxima_tentativa_em)
  values
    (p_chave, 'atualizar_colunas', p_board_id, p_item_id, p_valores, p_lido_em, 'visitas_churn', p_item_id, v_autor,
     now() + make_interval(secs => greatest(coalesce(p_adiar_segundos, 0), 0)))
  on conflict (chave_idempotencia) do nothing
  returning id into v_id;
  if v_id is null then
    select c.id into v_id from sincronia.comandos c where c.chave_idempotencia = p_chave;
  end if;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (v_autor, 'sincronia_enfileirar', 'sincronia.comandos', 'ok',
          jsonb_build_object('id', v_id, 'board', p_board_id, 'item', p_item_id,
                             'colunas', (select jsonb_agg(k) from jsonb_object_keys(p_valores) as k)));
  return v_id;
end;
$fn$;

-- Funções do serviço (sync-monday, service role): reservam, finalizam e disparam a fila.
create or replace function public.sincronia_reservar_pendentes(p_limite integer)
returns setof sincronia.comandos
language plpgsql security definer set search_path = '' as $fn$
begin
  if not sincronia.chamador_privilegiado() then raise exception 'Apenas o serviço reserva a fila.'; end if;
  return query
    with escolhidos as (
      select c.id from sincronia.comandos c
      where c.estado = 'pendente' and c.proxima_tentativa_em <= now()
      order by c.proxima_tentativa_em, c.id
      limit greatest(p_limite, 1)
      for update skip locked
    )
    update sincronia.comandos c set estado = 'executando'
    from escolhidos e
    where c.id = e.id
    returning c.*;
end;
$fn$;

create or replace function public.sincronia_finalizar_comando(
  p_id bigint,
  p_estado text,
  p_resultado jsonb,
  p_erro text,
  p_valores_anteriores jsonb,
  p_proxima timestamptz,
  p_tentativas integer
) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  if not sincronia.chamador_privilegiado() then raise exception 'Apenas o serviço finaliza comandos.'; end if;
  update sincronia.comandos set
    estado = p_estado,
    resultado = coalesce(p_resultado, resultado),
    erro = p_erro,
    valores_anteriores = coalesce(p_valores_anteriores, valores_anteriores),
    proxima_tentativa_em = coalesce(p_proxima, proxima_tentativa_em),
    tentativas = coalesce(p_tentativas, tentativas),
    executado_em = case when p_estado in ('concluido', 'conflito', 'erro') then now() else executado_em end
  where id = p_id;
end;
$fn$;

create or replace function public.sincronia_disparar_fila() returns integer
language plpgsql security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor ou serviço dispara a fila.';
  end if;
  return sincronia.disparar_fila();
end;
$fn$;

revoke all on function public.enfileirar_edicao_monday(text, text, jsonb, timestamptz, text, integer) from public, anon;
revoke all on function public.sincronia_fila_ativa() from public, anon;
revoke all on function public.sincronia_definir_fila_ativa(boolean) from public, anon;
revoke all on function public.sincronia_disparar_fila() from public, anon;
revoke all on function public.sincronia_reservar_pendentes(integer) from public, anon, authenticated;
revoke all on function public.sincronia_finalizar_comando(bigint, text, jsonb, text, jsonb, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.enfileirar_edicao_monday(text, text, jsonb, timestamptz, text, integer) to authenticated;
grant execute on function public.sincronia_fila_ativa() to authenticated;
grant execute on function public.sincronia_definir_fila_ativa(boolean) to authenticated;
grant execute on function public.sincronia_disparar_fila() to authenticated;

-- Catálogo de seguranca: configuração e campos são nativos; a fila é log protegido (nunca apagada).
insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('sincronia.configuracao',     'nativa', null, true, true,  'Chave de liga/desliga da fila de escrita'),
  ('sincronia.campos_editaveis', 'nativa', null, true, true,  'Lista explícita do que o dash pode editar no Monday'),
  ('sincronia.comandos',         'log',    null, true, false, 'Fila de escrita para o Monday; sem operação de exclusão')
on conflict (tabela) do update set
  origem = excluded.origem, proteger_exclusao = excluded.proteger_exclusao,
  versionar = excluded.versionar, descricao = excluded.descricao, atualizado_em = now();

create or replace view seguranca.v_tabelas_sem_classificacao as
  select case when n.nspname = 'public' then c.relname::text else n.nspname || '.' || c.relname end as tabela
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'canonico', 'sincronia') and c.relkind = 'r'
    and not exists (
      select 1 from seguranca.catalogo_tabelas t
      where t.tabela = case when n.nspname = 'public' then c.relname::text else n.nspname || '.' || c.relname end
    );

select * from seguranca.aplicar_protecoes();
