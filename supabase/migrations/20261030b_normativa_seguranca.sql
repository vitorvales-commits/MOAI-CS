-- ============================================================================
-- Normativa de dados, etapa 1: rede de segurança contra perda (30/10/2026)
--
-- Causa raiz que esta migração ataca: a sincronização (sync-monday) apaga do Supabase toda linha
-- que some do Monday (pruneOrfaos, prunarMembrosRemovidos) e várias chaves estrangeiras propagam a
-- exclusão em cascata (churn_items apaga churn_detalhes e reconquista_ex_membros; conselhos_membros
-- apaga conselhos_status_mensal e conselhos_status_historico). Um item apagado no Monday levava junto
-- dado nativo e histórico que só existem aqui.
--
-- O que muda:
--   seguranca.catalogo_tabelas   classifica cada tabela pela origem do dado (a matriz de dono do dado)
--   seguranca.lixeira            cópia integral de toda linha excluída, de qualquer origem, para sempre
--   seguranca.versoes            versão anterior de toda linha alterada em tabela de origem nativa
--   bloqueio de TRUNCATE         em toda tabela protegida, salvo liberação explícita na sessão
--   seguranca.restaurar(id)      devolve uma linha da lixeira para a tabela de origem
--
-- Nada é removido nem alterado nas tabelas existentes; só ganham gatilhos. Idempotente.
-- Regra para migrações futuras: toda tabela nova entra em seguranca.catalogo_tabelas e a migração
-- termina com select seguranca.aplicar_protecoes(); a view seguranca.v_tabelas_sem_classificacao
-- precisa estar vazia.
-- ============================================================================

create schema if not exists seguranca;
revoke all on schema seguranca from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catálogo: quem é dono de cada dado
-- ---------------------------------------------------------------------------
create table if not exists seguranca.catalogo_tabelas (
  tabela            text primary key,
  origem            text not null check (origem in ('monday', 'nativa', 'derivada', 'externa', 'log')),
  board_monday      text,
  proteger_exclusao boolean not null default true,
  versionar         boolean not null default false,
  descricao         text,
  atualizado_em     timestamptz not null default now()
);
comment on table seguranca.catalogo_tabelas is
  'Matriz de dono do dado. monday: origem no Monday, o dash só lê (edição vai pela fila sincronia.comandos). nativa: origem no dash, espelhada no Monday quando houver board. derivada: recalculável a partir das demais. externa: origem fora do Monday (Granola). log: registro operacional.';

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('churn_items',                'monday',   '10008640053', true,  false, 'Formulário de saída, parte categórica'),
  ('churn_detalhes',             'monday',   '10008640053', true,  false, 'Formulário de saída, parte identificável'),
  ('upsell_downsell_items',      'monday',   '9974267506',  true,  false, null),
  ('reports_semanais_items',     'monday',   '18394181332', true,  false, null),
  ('reports_individuais',        'monday',   '18394181332', true,  false, 'Report semanal interpretado'),
  ('metas_subitens',             'monday',   '18408969048', true,  false, null),
  ('rounds_items',               'monday',   '18415251314', true,  false, null),
  ('feedback_items',             'monday',   '18412032453', true,  false, null),
  ('pulso_cs_items',             'monday',   '18412032453', true,  false, null),
  ('cases_items',                'monday',   '9820032997',  true,  false, null),
  ('matchmakings_items',         'monday',   '18409198202', true,  false, null),
  ('conselhos_grupos',           'monday',   '18393363935', true,  false, null),
  ('conselhos_membros',          'monday',   '18393363935', true,  false, null),
  ('conselhos_status_mensal',    'monday',   '18393363935', true,  false, null),
  ('agenda_conselhos_items',     'monday',   '18395814635', true,  false, null),
  ('historico_conselhos_items',  'monday',   '18430666375', true,  false, null),
  ('conselheiros',               'monday',   '18393359980', true,  false, null),
  ('conselheiros_fotos',         'monday',   '18393359980', true,  false, null),
  ('nps_conselhos_items',        'monday',   '18393367198', true,  false, null),
  ('visitas_churn',              'monday',   '18432210313', true,  false, null),
  ('conselhos_status_historico', 'derivada', null,          true,  false, 'Transições de status capturadas pelo sync; não existe no Monday'),
  ('encontros_conselho',         'derivada', null,          true,  false, null),
  ('atas_conselho_extraido',     'derivada', null,          true,  false, null),
  ('atas_conselho_bigdeal',      'derivada', null,          true,  false, null),
  ('alertas_nps',                'derivada', null,          true,  false, null),
  ('voz_liderado_itens',         'derivada', null,          true,  false, null),
  ('granola_notas',              'externa',  null,          true,  false, 'Transcrições do Granola'),
  ('cs_config',                  'nativa',   null,          true,  true,  null),
  ('cs_periodos',                'nativa',   null,          true,  true,  null),
  ('cs_usuarios',                'nativa',   null,          true,  true,  null),
  ('cs_fotos',                   'nativa',   null,          true,  false, 'Imagem; versionar dobraria o volume sem ganho'),
  ('cs_fechamento_mensal',       'nativa',   null,          true,  true,  'Fotografia mensal fechada'),
  ('gestores',                   'nativa',   null,          true,  true,  null),
  ('configuracoes_globais',      'nativa',   null,          true,  true,  null),
  ('metas_definidas',            'nativa',   null,          true,  true,  null),
  ('indicadores_catalogo',       'nativa',   null,          true,  true,  null),
  ('config_home_indicadores',    'nativa',   null,          true,  true,  null),
  ('recordes_manuais',           'nativa',   null,          true,  true,  null),
  ('advertencia_tipos',          'nativa',   null,          true,  true,  null),
  ('advertencias_aplicadas',     'nativa',   null,          true,  true,  null),
  ('relatorios_conselho',        'nativa',   null,          true,  true,  'Relatório pós conselho'),
  ('relatorio_conselho_faltas',  'nativa',   null,          true,  true,  null),
  ('um_a_um_registros',          'nativa',   null,          true,  true,  null),
  ('um_a_um_itens',              'nativa',   null,          true,  true,  null),
  ('um_a_um_privado',            'nativa',   null,          true,  true,  'Sigiloso: nunca espelhar no Monday'),
  ('nps_conselho_aliases',       'nativa',   null,          true,  true,  null),
  ('nps_destaque_aliases',       'nativa',   null,          true,  true,  null),
  ('atas_membro_aliases',        'nativa',   null,          true,  true,  null),
  ('agenda_conselheiro_vinculo', 'nativa',   null,          true,  true,  null),
  ('churn_cs_classificacao',     'nativa',   null,          true,  true,  null),
  ('risco_churn_config',         'nativa',   null,          true,  true,  null),
  ('alerta_nps_config',          'nativa',   null,          true,  true,  null),
  ('processos_documento',        'nativa',   null,          true,  true,  null),
  ('processos_versoes',          'nativa',   null,          true,  false, 'Já é histórico de versões'),
  ('reconquista_ex_membros',     'nativa',   null,          true,  true,  null),
  ('membro_melhorias',           'nativa',   null,          true,  true,  null),
  ('vitorio_perguntas_extras',   'nativa',   null,          true,  true,  null),
  ('vitorio_consultas',          'log',      null,          false, false, null),
  ('vitorio_tour_visto',         'log',      null,          false, false, null),
  ('vitorio_limite',             'log',      null,          false, false, null),
  ('access_audit_log',           'log',      null,          true,  false, null),
  ('sync_log',                   'log',      null,          false, false, 'Volume alto; arquivado por sync_log_arquivar'),
  ('sync_log_resumo_diario',     'log',      null,          false, false, null)
on conflict (tabela) do update set
  origem = excluded.origem, board_monday = excluded.board_monday,
  proteger_exclusao = excluded.proteger_exclusao, versionar = excluded.versionar,
  descricao = coalesce(excluded.descricao, seguranca.catalogo_tabelas.descricao), atualizado_em = now();

create or replace view seguranca.v_tabelas_sem_classificacao as
  select c.relname::text as tabela
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not exists (select 1 from seguranca.catalogo_tabelas t where t.tabela = c.relname);

-- ---------------------------------------------------------------------------
-- Lixeira e versões
-- ---------------------------------------------------------------------------
create table if not exists seguranca.lixeira (
  id            bigserial primary key,
  tabela        text not null,
  chave         jsonb not null,
  linha         jsonb not null,
  removido_em   timestamptz not null default now(),
  removido_por  text not null,
  restaurado_em timestamptz,
  restaurado_por text
);
create index if not exists lixeira_tabela_removido_idx on seguranca.lixeira (tabela, removido_em desc);
create index if not exists lixeira_chave_idx on seguranca.lixeira using gin (chave);

create table if not exists seguranca.versoes (
  id              bigserial primary key,
  tabela          text not null,
  chave           jsonb not null,
  linha_anterior  jsonb not null,
  alterado_em     timestamptz not null default now(),
  alterado_por    text not null
);
create index if not exists versoes_tabela_chave_idx on seguranca.versoes (tabela, alterado_em desc);
create index if not exists versoes_chave_idx on seguranca.versoes using gin (chave);

alter table seguranca.catalogo_tabelas enable row level security;
alter table seguranca.lixeira enable row level security;
alter table seguranca.versoes enable row level security;
-- sem policy: anon e authenticated não leem nem escrevem; o acesso é por service role e pelas funções abaixo

-- quem executou: e-mail do JWT quando a chamada vem do app, papel do banco nos demais casos
create or replace function seguranca.autor_atual() returns text
language sql stable set search_path = '' as $fn$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    current_user::text
  );
$fn$;

-- TG_ARGV: nomes das colunas da chave primária
create or replace function seguranca.chave_da_linha(linha jsonb, colunas text[]) returns jsonb
language sql immutable set search_path = '' as $fn$
  select coalesce(jsonb_object_agg(c, linha -> c), '{}'::jsonb) from unnest(colunas) as c;
$fn$;

create or replace function seguranca.gatilho_lixeira() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  v_linha jsonb := to_jsonb(old);
begin
  insert into seguranca.lixeira (tabela, chave, linha, removido_por)
  values (tg_table_name, seguranca.chave_da_linha(v_linha, tg_argv::text[]), v_linha, seguranca.autor_atual());
  return old;
end;
$fn$;

-- grava a versão anterior só quando algum valor mudou de fato, ignorando colunas de carimbo de tempo
create or replace function seguranca.gatilho_versao() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  v_antes  jsonb := to_jsonb(old);
  v_depois jsonb := to_jsonb(new);
  v_carimbos text[] := array['atualizado_em', 'updated_at', 'synced_at'];
begin
  if (v_antes - v_carimbos) is distinct from (v_depois - v_carimbos) then
    insert into seguranca.versoes (tabela, chave, linha_anterior, alterado_por)
    values (tg_table_name, seguranca.chave_da_linha(v_antes, tg_argv::text[]), v_antes, seguranca.autor_atual());
  end if;
  return new;
end;
$fn$;

create or replace function seguranca.gatilho_bloquear_truncate() returns trigger
language plpgsql set search_path = '' as $fn$
begin
  if coalesce(current_setting('seguranca.permitir_truncate', true), '') <> 'on' then
    raise exception 'TRUNCATE bloqueado em public.% pela normativa de dados. Use DELETE (que passa pela lixeira) ou libere com set local seguranca.permitir_truncate = ''on''.', tg_table_name;
  end if;
  return null;
end;
$fn$;

-- instala ou reinstala os gatilhos conforme o catálogo; seguro de rodar quantas vezes for preciso
create or replace function seguranca.aplicar_protecoes() returns table (tabela text, lixeira boolean, versoes boolean)
language plpgsql security definer set search_path = '' as $fn$
declare
  r record;
  v_pk text[];
  v_args text;
begin
  for r in
    select t.tabela, t.proteger_exclusao, t.versionar
    from seguranca.catalogo_tabelas t
    join pg_class c on c.relname = t.tabela and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  loop
    select array_agg(a.attname::text order by a.attnum) into v_pk
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = format('public.%I', r.tabela)::regclass and i.indisprimary;
    if v_pk is null then
      raise exception 'Tabela public.% sem chave primária; a normativa exige chave primária.', r.tabela;
    end if;
    select string_agg(quote_literal(x), ', ') into v_args from unnest(v_pk) as x;

    execute format('drop trigger if exists zz_seguranca_lixeira on public.%I', r.tabela);
    execute format('drop trigger if exists zz_seguranca_versao on public.%I', r.tabela);
    execute format('drop trigger if exists zz_seguranca_truncate on public.%I', r.tabela);

    if r.proteger_exclusao then
      execute format('create trigger zz_seguranca_lixeira before delete on public.%I for each row execute function seguranca.gatilho_lixeira(%s)', r.tabela, v_args);
      execute format('create trigger zz_seguranca_truncate before truncate on public.%I for each statement execute function seguranca.gatilho_bloquear_truncate()', r.tabela);
    end if;
    if r.versionar then
      execute format('create trigger zz_seguranca_versao after update on public.%I for each row execute function seguranca.gatilho_versao(%s)', r.tabela, v_args);
    end if;

    tabela := r.tabela; lixeira := r.proteger_exclusao; versoes := r.versionar;
    return next;
  end loop;
end;
$fn$;

-- devolve uma linha da lixeira; se a chave já existir na tabela, não sobrescreve e avisa
create or replace function seguranca.restaurar(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $fn$
declare
  v record;
  v_inseridas int;
begin
  if not (coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'postgres') in ('service_role', 'postgres')
          or public.is_gestor()) then
    raise exception 'Apenas gestor ou service role restaura dados.';
  end if;
  select * into v from seguranca.lixeira where id = p_id for update;
  if not found then raise exception 'Item % não está na lixeira.', p_id; end if;
  if v.restaurado_em is not null then return 'já restaurado em ' || v.restaurado_em::text; end if;
  execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, $1)).* on conflict do nothing', v.tabela, v.tabela)
    using v.linha;
  get diagnostics v_inseridas = row_count;
  if v_inseridas = 0 then
    return 'não restaurado: já existe linha com a mesma chave em ' || v.tabela;
  end if;
  update seguranca.lixeira set restaurado_em = now(), restaurado_por = seguranca.autor_atual() where id = p_id;
  return 'restaurado em ' || v.tabela;
end;
$fn$;

-- leitura para a tela de saúde dos dados (gestor)
create or replace function public.lixeira_recente(p_limite int default 100)
returns table (id bigint, tabela text, chave jsonb, removido_em timestamptz, removido_por text, restaurado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_gestor() then raise exception 'Apenas gestor.'; end if;
  return query
    select l.id, l.tabela, l.chave, l.removido_em, l.removido_por, l.restaurado_em
    from seguranca.lixeira l order by l.removido_em desc limit greatest(1, least(p_limite, 500));
end;
$fn$;

create or replace function public.restaurar_da_lixeira(p_id bigint) returns text
language sql security definer set search_path = '' as $fn$
  select seguranca.restaurar(p_id);
$fn$;

revoke all on function seguranca.restaurar(bigint) from public, anon, authenticated;
revoke all on function seguranca.aplicar_protecoes() from public, anon, authenticated;
revoke all on function public.lixeira_recente(int) from public, anon;
revoke all on function public.restaurar_da_lixeira(bigint) from public, anon;
grant execute on function public.lixeira_recente(int) to authenticated;
grant execute on function public.restaurar_da_lixeira(bigint) to authenticated;

select * from seguranca.aplicar_protecoes();
