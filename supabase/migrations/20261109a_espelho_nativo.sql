-- ============================================================================
-- Normativa de dados, etapa 5 (PR A): espelho nativo do dash no Monday (09/11/2026)
--
-- O dash é a origem destes dados; o Monday guarda o histórico. Cada linha das tabelas abaixo vira um item
-- nos boards privados "Registro: ..." (pasta "Registro do dash de CS"). Exclusão no dash não apaga o item:
-- a situação vira "Excluído no dash".
--
-- Tabelas espelhadas: relatorios_conselho, advertencias_aplicadas, metas_definidas, cs_periodos.
-- Faltas (relatorio_conselho_faltas) não têm board: entram como texto no relatório pai.
--
-- O que muda (aditivo, nada renomeado nem removido):
--   sincronia.espelhos          mapa de cada tabela para o board, o grupo, a coluna "Chave do dash" e as colunas
--                               (campo lógico -> coluna_id e tipo). Começa com ativo = false em todas.
--   sincronia.vinculo_nativo    chave da linha de origem -> id do item no Monday (âncora contra duplicata).
--   sincronia.comandos          operação nova 'espelhar' e índice que coalesce comandos pendentes da mesma linha.
--   sincronia.montar_espelho    monta nome do item e valores a partir da linha (jsonb).
--   sincronia.enfileirar_espelho  insere ou coalesce um comando 'espelhar'. Sem espelho ativo ou fila desligada,
--                               não faz nada e não falha: a escrita no dash nunca é bloqueada pelo espelho.
--   gatilhos AFTER em quatro tabelas e em relatorio_conselho_faltas (esta reespelha o relatório pai).
--   public.sincronia_carga_inicial_espelho, public.sincronia_definir_espelho_ativo, auditadas.
--   public.sincronia_vincular_espelho, usada pelo serviço.
--
-- Nada disso enfileira coisa alguma enquanto a chave fila_escrita_ativa estiver desligada, nem enquanto o
-- espelho da tabela estiver inativo.
-- ============================================================================

-- 1. Tabelas novas ------------------------------------------------------------

create table if not exists sincronia.espelhos (
  tabela          text primary key,
  board_id        text not null,
  grupo_id        text not null,
  coluna_chave    text not null,
  mapa            jsonb not null,
  ativo           boolean not null default false,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  text not null default 'migracao 20261109a'
);

create table if not exists sincronia.vinculo_nativo (
  tabela          text not null,
  chave           text not null,
  monday_item_id  text not null,
  criado_em       timestamptz not null default now(),
  primary key (tabela, chave)
);

alter table sincronia.espelhos enable row level security;
alter table sincronia.vinculo_nativo enable row level security;
revoke all on sincronia.espelhos, sincronia.vinculo_nativo from anon, authenticated;

-- 2. Operação 'espelhar' no check, sem afetar as linhas existentes ------------

alter table sincronia.comandos drop constraint if exists comandos_operacao_check;
alter table sincronia.comandos add constraint comandos_operacao_check
  check (operacao in ('atualizar_colunas', 'criar_item', 'criar_atualizacao', 'espelhar'));

-- Coalescência: no máximo um comando pendente de espelho por linha de origem.
create unique index if not exists comandos_espelho_pendente_uidx
  on sincronia.comandos (origem_tabela, origem_chave)
  where operacao = 'espelhar' and estado = 'pendente';

-- 3. Mapas reais (boards criados em 09/11/2026 na pasta "Registro do dash de CS") ---

insert into sincronia.espelhos (tabela, board_id, grupo_id, coluna_chave, mapa, ativo) values
(
  'relatorios_conselho', '18439110272', 'topics', 'text_mm8ygmtw',
  '{
    "chave":          {"coluna_id": "text_mm8ygmtw",       "tipo": "text"},
    "conselho":       {"coluna_id": "text_mm8yhnzw",       "tipo": "text"},
    "data_encontro":  {"coluna_id": "date_mm8ybvp5",       "tipo": "date"},
    "cs":             {"coluna_id": "text_mm8ywgkv",       "tipo": "text"},
    "avaliacao":      {"coluna_id": "long_text_mm8yzwe9",  "tipo": "long_text"},
    "avanco":         {"coluna_id": "long_text_mm8ydwk7",  "tipo": "long_text"},
    "membro_atencao": {"coluna_id": "text_mm8yessv",       "tipo": "text"},
    "motivo_atencao": {"coluna_id": "long_text_mm8yhqxx",  "tipo": "long_text"},
    "combinado":      {"coluna_id": "long_text_mm8yew4m",  "tipo": "long_text"},
    "faltas":         {"coluna_id": "long_text_mm8ygz0s",  "tipo": "long_text"},
    "qtd_faltas":     {"coluna_id": "numeric_mm8yscn3",    "tipo": "numbers"},
    "enviado_em":     {"coluna_id": "date_mm8ycg05",       "tipo": "date"},
    "enviado_por":    {"coluna_id": "text_mm8y36y9",       "tipo": "text"},
    "situacao":       {"coluna_id": "color_mm8yg9nh",      "tipo": "status"}
  }'::jsonb,
  false
),
(
  'advertencias_aplicadas', '18439110274', 'topics', 'text_mm8yznzq',
  '{
    "chave":           {"coluna_id": "text_mm8yznzq",       "tipo": "text"},
    "cs":              {"coluna_id": "text_mm8yk92n",       "tipo": "text"},
    "tipo":            {"coluna_id": "text_mm8yykcg",       "tipo": "text"},
    "pontos":          {"coluna_id": "numeric_mm8yx86p",    "tipo": "numbers"},
    "validade_meses":  {"coluna_id": "numeric_mm8yg14j",    "tipo": "numbers"},
    "aplicada_em":     {"coluna_id": "date_mm8y4f4t",       "tipo": "date"},
    "valida_ate":      {"coluna_id": "date_mm8yk1nq",       "tipo": "date"},
    "aplicada_por":    {"coluna_id": "text_mm8ymx8p",       "tipo": "text"},
    "observacao":      {"coluna_id": "long_text_mm8ytv9y",  "tipo": "long_text"},
    "origem":          {"coluna_id": "text_mm8yb89s",       "tipo": "text"},
    "anulada_em":      {"coluna_id": "date_mm8yf620",       "tipo": "date"},
    "anulada_por":     {"coluna_id": "text_mm8ye258",       "tipo": "text"},
    "motivo_anulacao": {"coluna_id": "long_text_mm8yg69s",  "tipo": "long_text"},
    "situacao":        {"coluna_id": "color_mm8yy8eb",      "tipo": "status"}
  }'::jsonb,
  false
),
(
  'metas_definidas', '18439110276', 'topics', 'text_mm8yprdd',
  '{
    "chave":          {"coluna_id": "text_mm8yprdd",       "tipo": "text"},
    "indicador":      {"coluna_id": "text_mm8yjqc1",       "tipo": "text"},
    "mes":            {"coluna_id": "date_mm8yqd6w",       "tipo": "date"},
    "escopo":         {"coluna_id": "text_mm8yy0st",       "tipo": "text"},
    "cs":             {"coluna_id": "text_mm8yq2h3",       "tipo": "text"},
    "valor":          {"coluna_id": "numeric_mm8yz7et",    "tipo": "numbers"},
    "atualizado_por": {"coluna_id": "text_mm8ygtj7",       "tipo": "text"},
    "atualizado_em":  {"coluna_id": "date_mm8ypswk",       "tipo": "date"},
    "situacao":       {"coluna_id": "color_mm8yk4a2",      "tipo": "status"}
  }'::jsonb,
  false
),
(
  'cs_periodos', '18439110277', 'topics', 'text_mm8y17wb',
  '{
    "chave":          {"coluna_id": "text_mm8y17wb",       "tipo": "text"},
    "nome_completo":  {"coluna_id": "text_mm8yhrbx",       "tipo": "text"},
    "primeiro_mes":   {"coluna_id": "date_mm8yapkq",       "tipo": "date"},
    "ultimo_mes":     {"coluna_id": "date_mm8ysjp1",       "tipo": "date"},
    "origem":         {"coluna_id": "text_mm8y3166",       "tipo": "text"},
    "confirmado":     {"coluna_id": "text_mm8y8neq",       "tipo": "text"},
    "aliases":        {"coluna_id": "text_mm8y1j6",        "tipo": "text"},
    "atualizado_em":  {"coluna_id": "date_mm8y38nr",       "tipo": "date"},
    "situacao":       {"coluna_id": "color_mm8y9g4c",      "tipo": "status"}
  }'::jsonb,
  false
)
on conflict (tabela) do nothing;

-- 4. Catálogo de segurança ----------------------------------------------------

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('sincronia.espelhos',       'nativa', null, true, true, 'Mapa do espelho nativo do dash no Monday (boards Registro)'),
  ('sincronia.vinculo_nativo', 'log',    null, true, true, 'Vínculo entre a linha do dash e o item do Monday; nunca apagado')
on conflict (tabela) do update set
  origem = excluded.origem, proteger_exclusao = excluded.proteger_exclusao,
  versionar = excluded.versionar, descricao = excluded.descricao, atualizado_em = now();

-- 5. Funções ------------------------------------------------------------------

-- Data no fuso de São Paulo, AAAA-MM-DD. Nula quando a entrada é nula.
create or replace function sincronia.data_local(p_ts timestamptz) returns text
language sql stable strict set search_path = '' as $fn$
  select to_char(p_ts at time zone 'America/Sao_Paulo', 'YYYY-MM-DD');
$fn$;

-- Chave do dash: a chave primária da linha de origem. É a âncora contra duplicata no Monday.
create or replace function sincronia.chave_linha(p_tabela text, p_linha jsonb) returns text
language sql immutable set search_path = '' as $fn$
  select case when p_tabela = 'cs_periodos' then p_linha->>'nome_curto' else p_linha->>'id' end;
$fn$;

-- Monta { chave, nome_item, valores } a partir da linha. valores = { coluna_id: { tipo, valor } }.
-- Com p_excluido, a situação é "Excluído no dash" e os demais valores são os da última versão da linha.
create or replace function sincronia.montar_espelho(p_tabela text, p_linha jsonb, p_excluido boolean)
returns jsonb
language plpgsql stable set search_path = '' as $fn$
declare
  v_mapa jsonb;
  v_chave text := sincronia.chave_linha(p_tabela, p_linha);
  v_campos jsonb;
  v_nome text;
  v_situacao text := 'Ativo';
  v_valores jsonb := '{}'::jsonb;
  v_titulo text;
  v_data date;
  v_faltas text;
  v_qtd integer := 0;
  v_membro text;
  r record;
begin
  select e.mapa into v_mapa from sincronia.espelhos e where e.tabela = p_tabela;
  if v_mapa is null then raise exception 'Sem espelho cadastrado para %', p_tabela; end if;

  if p_tabela = 'relatorios_conselho' then
    select g.titulo into v_titulo from public.conselhos_grupos g where g.group_id = p_linha->>'group_id';
    v_data := ((p_linha->>'data_encontro')::timestamptz at time zone 'America/Sao_Paulo')::date;
    select string_agg(
             f.membro_nome || ': ' || f.tipo || coalesce(', ' || f.categoria, '') || coalesce('. ' || f.justificativa, ''),
             E'\n' order by f.membro_nome, f.tipo),
           count(*)::integer
      into v_faltas, v_qtd
      from public.relatorio_conselho_faltas f
      where f.relatorio_id = (p_linha->>'id')::uuid;
    select m.nome into v_membro from public.conselhos_membros m where m.id = (p_linha->>'membro_atencao_id')::bigint;
    v_nome := coalesce((coalesce(v_titulo, p_linha->>'group_id', 'sem conselho')), 'sem conselho')
              || ' | ' || coalesce(to_char(v_data, 'DD/MM/YYYY'), 'sem data');
    v_campos := jsonb_build_object(
      'chave', v_chave,
      'conselho', coalesce(v_titulo, p_linha->>'group_id'),
      'data_encontro', to_char(v_data, 'YYYY-MM-DD'),
      'cs', p_linha->>'cs_nome',
      'avaliacao', p_linha->>'avaliacao',
      'avanco', p_linha->>'avanco',
      'membro_atencao', v_membro,
      'motivo_atencao', p_linha->>'membro_atencao_motivo',
      'combinado', p_linha->>'combinado',
      'faltas', v_faltas,
      'qtd_faltas', v_qtd::text,
      'enviado_em', sincronia.data_local((p_linha->>'enviado_em')::timestamptz),
      'enviado_por', p_linha->>'enviado_por');

  elsif p_tabela = 'advertencias_aplicadas' then
    v_data := ((p_linha->>'aplicado_em')::timestamptz at time zone 'America/Sao_Paulo')::date;
    v_nome := coalesce((p_linha->>'cs_nome'), 'sem CS')
              || ' | ' || coalesce((p_linha->>'tipo_nome'), 'sem tipo')
              || ' | ' || coalesce(to_char(v_data, 'DD/MM/YYYY'), 'sem data');
    if p_linha->>'anulada_em' is not null then v_situacao := 'Anulada'; end if;
    v_campos := jsonb_build_object(
      'chave', v_chave,
      'cs', p_linha->>'cs_nome',
      'tipo', p_linha->>'tipo_nome',
      'pontos', p_linha->>'pontos',
      'validade_meses', p_linha->>'validade_meses',
      'aplicada_em', sincronia.data_local((p_linha->>'aplicado_em')::timestamptz),
      'valida_ate', sincronia.data_local((p_linha->>'valido_ate')::timestamptz),
      'aplicada_por', p_linha->>'aplicado_por',
      'observacao', p_linha->>'observacao',
      'origem', p_linha->>'origem',
      'anulada_em', sincronia.data_local((p_linha->>'anulada_em')::timestamptz),
      'anulada_por', p_linha->>'anulada_por',
      'motivo_anulacao', p_linha->>'motivo_anulacao');

  elsif p_tabela = 'metas_definidas' then
    v_nome := coalesce((p_linha->>'indicador'), 'sem indicador')
              || ' | ' || coalesce((p_linha->>'cs_nome'), (p_linha->>'escopo'), 'sem CS')
              || ' | ' || coalesce(to_char((p_linha->>'mes')::date, 'YYYY-MM'), 'sem mês');
    v_campos := jsonb_build_object(
      'chave', v_chave,
      'indicador', p_linha->>'indicador',
      'mes', to_char((p_linha->>'mes')::date, 'YYYY-MM-DD'),
      'escopo', p_linha->>'escopo',
      'cs', p_linha->>'cs_nome',
      'valor', p_linha->>'valor',
      'atualizado_por', p_linha->>'atualizado_por',
      'atualizado_em', sincronia.data_local((p_linha->>'atualizado_em')::timestamptz));

  elsif p_tabela = 'cs_periodos' then
    v_nome := (p_linha->>'nome_curto');
    v_campos := jsonb_build_object(
      'chave', v_chave,
      'nome_completo', p_linha->>'nome_completo',
      'primeiro_mes', p_linha->>'primeiro_mes',
      'ultimo_mes', p_linha->>'ultimo_mes',
      'origem', p_linha->>'origem',
      'confirmado', case when (p_linha->>'confirmado')::boolean then 'Sim' else 'Não' end,
      'aliases', (select string_agg(a, ', ') from jsonb_array_elements_text(coalesce(p_linha->'aliases', '[]'::jsonb)) a),
      'atualizado_em', sincronia.data_local((p_linha->>'atualizado_em')::timestamptz));

  else
    raise exception 'Tabela sem montagem de espelho: %', p_tabela;
  end if;

  -- O nome nunca fica nulo nem vazio: sem nome útil, o item usa a chave da linha.
  v_nome := left(coalesce(nullif(btrim(v_nome), ''), v_chave), 255);

  if p_excluido then v_situacao := 'Excluído no dash'; end if;
  v_campos := v_campos || jsonb_build_object('situacao', v_situacao);

  for r in select key, value from jsonb_each(v_mapa) loop
    v_valores := v_valores || jsonb_build_object(
      r.value->>'coluna_id',
      jsonb_build_object('tipo', r.value->>'tipo', 'valor', v_campos->>r.key));
  end loop;

  return jsonb_build_object('chave', v_chave, 'nome_item', v_nome, 'valores', v_valores);
end;
$fn$;

-- Enfileira (ou coalesce) o espelho de uma linha. Não faz nada sem espelho ativo ou com a fila desligada.
create or replace function sincronia.enfileirar_espelho(p_tabela text, p_chave text, p_linha jsonb, p_excluido boolean)
returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare
  v_esp sincronia.espelhos%rowtype;
  v_m jsonb;
  v_id bigint;
  v_autor text := coalesce(seguranca.autor_atual(), 'sistema');
begin
  select * into v_esp from sincronia.espelhos e where e.tabela = p_tabela and e.ativo;
  if not found or not sincronia.fila_ativa() then return null; end if;

  v_m := sincronia.montar_espelho(p_tabela, p_linha, p_excluido);

  -- Coalescência: se a linha já tem comando pendente, ele passa a carregar o estado mais recente.
  update sincronia.comandos c set
    nome_item = v_m->>'nome_item',
    valores = v_m->'valores',
    criado_por = v_autor
  where c.operacao = 'espelhar' and c.estado = 'pendente'
    and c.origem_tabela = p_tabela and c.origem_chave = p_chave
  returning c.id into v_id;
  if v_id is not null then return v_id; end if;

  -- Sem pendente: insere. Se a mesma chave já existe (mesmos valores, comando anterior), reabre o comando, a
  -- não ser que ele esteja executando agora; nesse caso o valor atual já é o que está sendo escrito.
  -- Sem pendente, cada envio é um comando novo. A chave inclui o instante: o histórico de comandos concluídos
  -- fica completo, mesmo quando a linha volta a um valor anterior (A, B, A).
  insert into sincronia.comandos
    (chave_idempotencia, operacao, board_id, grupo_id, nome_item, valores, origem_tabela, origem_chave, criado_por, proxima_tentativa_em)
  values
    ('espelhar:' || p_tabela || ':' || p_chave || ':' || md5(v_m::text || clock_timestamp()::text), 'espelhar',
     v_esp.board_id, v_esp.grupo_id, v_m->>'nome_item', v_m->'valores', p_tabela, p_chave, v_autor, now())
  returning id into v_id;
  return v_id;
end;
$fn$;

-- Gatilho das tabelas espelhadas. Erro aqui não bloqueia a escrita no dash: vai para access_audit_log.
create or replace function sincronia.gatilho_espelho() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  v_tabela text := tg_table_name;
  v_antes jsonb;
  v_depois jsonb;
begin
  if not exists (select 1 from sincronia.espelhos e where e.tabela = v_tabela and e.ativo) then return null; end if;
  if not sincronia.fila_ativa() then return null; end if;
  begin
    if tg_op = 'INSERT' then
      v_depois := to_jsonb(new);
      perform sincronia.enfileirar_espelho(v_tabela, sincronia.chave_linha(v_tabela, v_depois), v_depois, false);
    elsif tg_op = 'DELETE' then
      v_antes := to_jsonb(old);
      perform sincronia.enfileirar_espelho(v_tabela, sincronia.chave_linha(v_tabela, v_antes), v_antes, true);
    elsif sincronia.montar_espelho(v_tabela, to_jsonb(old), false) is distinct from sincronia.montar_espelho(v_tabela, to_jsonb(new), false) then
      -- Atualização que não muda nenhum campo mapeado não enfileira nada.
      v_depois := to_jsonb(new);
      perform sincronia.enfileirar_espelho(v_tabela, sincronia.chave_linha(v_tabela, v_depois), v_depois, false);
    end if;
  exception when others then
    insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values ('sistema', 'sincronia_espelho_falhou', 'sincronia.espelhos', 'erro',
            jsonb_build_object('tabela', v_tabela, 'erro', sqlerrm));
  end;
  return null;
end;
$fn$;

-- Gatilho de relatorio_conselho_faltas: reespelha o relatório pai, lendo a linha atual dele.
create or replace function sincronia.gatilho_faltas() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare
  v_pais uuid[];
  v_pai uuid;
  v_linha jsonb;
begin
  if not exists (select 1 from sincronia.espelhos e where e.tabela = 'relatorios_conselho' and e.ativo) then return null; end if;
  if not sincronia.fila_ativa() then return null; end if;
  if tg_op = 'UPDATE' and old.relatorio_id = new.relatorio_id
     and old.membro_nome is not distinct from new.membro_nome
     and old.tipo is not distinct from new.tipo
     and old.categoria is not distinct from new.categoria
     and old.justificativa is not distinct from new.justificativa then
    return null;
  end if;
  if tg_op = 'DELETE' then
    v_pais := array[old.relatorio_id];
  elsif tg_op = 'INSERT' then
    v_pais := array[new.relatorio_id];
  elsif old.relatorio_id = new.relatorio_id then
    v_pais := array[new.relatorio_id];
  else
    v_pais := array[old.relatorio_id, new.relatorio_id];
  end if;
  begin
    foreach v_pai in array v_pais loop
      -- Se o pai já foi apagado (cascata), não há linha para ler: a exclusão do pai cuida do item.
      select to_jsonb(r) into v_linha from public.relatorios_conselho r where r.id = v_pai;
      if found then
        perform sincronia.enfileirar_espelho('relatorios_conselho', v_pai::text, v_linha, false);
      end if;
    end loop;
  exception when others then
    insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values ('sistema', 'sincronia_espelho_falhou', 'sincronia.espelhos', 'erro',
            jsonb_build_object('tabela', 'relatorio_conselho_faltas', 'erro', sqlerrm));
  end;
  return null;
end;
$fn$;

-- A carga inicial enfileira muitas linhas: o disparo da fila sai uma vez no fim, não a cada inserção.
create or replace function sincronia.gatilho_comandos() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  if coalesce(current_setting('sincronia.carga_em_andamento', true), '') = 'on' then return null; end if;
  if new.estado = 'pendente' and new.proxima_tentativa_em <= now() then
    perform sincronia.disparar_fila();
  end if;
  return null;
end;
$fn$;

-- 6. Gatilhos -----------------------------------------------------------------

drop trigger if exists espelho_relatorios_conselho on public.relatorios_conselho;
create trigger espelho_relatorios_conselho after insert or update or delete on public.relatorios_conselho
  for each row execute function sincronia.gatilho_espelho();

drop trigger if exists espelho_advertencias_aplicadas on public.advertencias_aplicadas;
create trigger espelho_advertencias_aplicadas after insert or update or delete on public.advertencias_aplicadas
  for each row execute function sincronia.gatilho_espelho();

drop trigger if exists espelho_metas_definidas on public.metas_definidas;
create trigger espelho_metas_definidas after insert or update or delete on public.metas_definidas
  for each row execute function sincronia.gatilho_espelho();

drop trigger if exists espelho_cs_periodos on public.cs_periodos;
create trigger espelho_cs_periodos after insert or update or delete on public.cs_periodos
  for each row execute function sincronia.gatilho_espelho();

drop trigger if exists espelho_relatorio_conselho_faltas on public.relatorio_conselho_faltas;
create trigger espelho_relatorio_conselho_faltas after insert or update or delete on public.relatorio_conselho_faltas
  for each row execute function sincronia.gatilho_faltas();

-- 7. Funções públicas (gestor ou serviço; auditadas) --------------------------

-- Liga ou desliga o espelho de uma tabela. Com ativo = false, as alterações deixam de ser enfileiradas.
create or replace function public.sincronia_definir_espelho_ativo(p_tabela text, p_ativo boolean) returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare
  v_autor text := coalesce(seguranca.autor_atual(), 'sistema');
  v_antes boolean;
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor altera o espelho.';
  end if;
  select e.ativo into v_antes from sincronia.espelhos e where e.tabela = p_tabela;
  if not found then raise exception 'Tabela % sem espelho cadastrado.', p_tabela; end if;
  update sincronia.espelhos set ativo = p_ativo, atualizado_em = now(), atualizado_por = v_autor
    where tabela = p_tabela;
  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (v_autor, 'sincronia_espelho_ativo', 'sincronia.espelhos', 'ok',
          jsonb_build_object('tabela', p_tabela, 'antes', v_antes, 'depois', p_ativo));
  return p_ativo;
end;
$fn$;

-- Enfileira todas as linhas da tabela, em ordem, e devolve a quantidade. Exige espelho e fila ligados.
create or replace function public.sincronia_carga_inicial_espelho(p_tabela text) returns integer
language plpgsql security definer set search_path = '' as $fn$
declare
  v_autor text := coalesce(seguranca.autor_atual(), 'sistema');
  v_ordem text := case when p_tabela = 'cs_periodos' then 'nome_curto' else 'id' end;
  v_n integer := 0;
  r record;
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor faz a carga inicial do espelho.';
  end if;
  if not exists (select 1 from sincronia.espelhos e where e.tabela = p_tabela and e.ativo) then
    raise exception 'O espelho de % precisa estar ativo antes da carga inicial.', p_tabela;
  end if;
  if not sincronia.fila_ativa() then
    raise exception 'A fila de escrita precisa estar ligada antes da carga inicial.';
  end if;

  perform set_config('sincronia.carga_em_andamento', 'on', true);
  for r in execute format('select to_jsonb(t) as j from public.%I t order by %I', p_tabela, v_ordem) loop
    perform sincronia.enfileirar_espelho(p_tabela, sincronia.chave_linha(p_tabela, r.j), r.j, false);
    v_n := v_n + 1;
  end loop;
  perform set_config('sincronia.carga_em_andamento', 'off', true);

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (v_autor, 'sincronia_carga_espelho', 'sincronia.espelhos', 'ok',
          jsonb_build_object('tabela', p_tabela, 'linhas', v_n));
  perform sincronia.disparar_fila();
  return v_n;
end;
$fn$;

-- Serviço registra o vínculo entre a linha do dash e o item do Monday. Se o item mudou, o vínculo é substituído.
create or replace function public.sincronia_vincular_espelho(p_tabela text, p_chave text, p_monday_item_id text)
returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  if not sincronia.chamador_privilegiado() then
    raise exception 'Apenas o serviço registra vínculos com o Monday.';
  end if;
  insert into sincronia.vinculo_nativo as v (tabela, chave, monday_item_id)
  values (p_tabela, p_chave, p_monday_item_id)
  on conflict (tabela, chave) do update set monday_item_id = excluded.monday_item_id;
end;
$fn$;

-- Falhas do espelho nos últimos 7 dias, lidas de access_audit_log. O gatilho não bloqueia a escrita no dash,
-- então é aqui que o gestor vê que um espelho falhou (fila de ação, PR B).
create or replace function public.sincronia_falhas_espelho()
returns table (tabela_origem text, erro_mensagem text, ocorrido_em timestamptz)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor lê as falhas do espelho.';
  end if;
  return query
    select a.metadata->>'tabela', a.metadata->>'erro', a.created_at
    from public.access_audit_log a
    where a.action = 'sincronia_espelho_falhou'
      and a.created_at >= now() - interval '7 days'
    order by a.created_at desc;
end;
$fn$;

-- 8. Permissões ---------------------------------------------------------------

revoke all on function sincronia.data_local(timestamptz) from public, anon, authenticated;
revoke all on function sincronia.chave_linha(text, jsonb) from public, anon, authenticated;
revoke all on function sincronia.montar_espelho(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function sincronia.enfileirar_espelho(text, text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.sincronia_vincular_espelho(text, text, text) from public, anon, authenticated;
revoke all on function public.sincronia_definir_espelho_ativo(text, boolean) from public, anon;
revoke all on function public.sincronia_carga_inicial_espelho(text) from public, anon;
grant execute on function public.sincronia_definir_espelho_ativo(text, boolean) to authenticated;
grant execute on function public.sincronia_carga_inicial_espelho(text) to authenticated;
revoke all on function public.sincronia_falhas_espelho() from public, anon;
grant execute on function public.sincronia_falhas_espelho() to authenticated;

select seguranca.aplicar_protecoes();
