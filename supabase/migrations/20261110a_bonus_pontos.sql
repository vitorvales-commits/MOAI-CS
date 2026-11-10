-- ============================================================================
-- Normativa de dados, etapa 5 (PR A): bônus de pontuação concedido pelo gestor (10/11/2026)
--
-- Só o gestor concede pontos positivos a um CS (ex.: vencedores de uma dinâmica). Cada bônus tem um mês de
-- vigência (mes_referencia, sempre dia 1): o bônus soma só à pontuação daquele mês. Um bônus anulado não soma,
-- mas fica no histórico (anulação preenche anulado_em, anulado_por e motivo_anulacao; nada é apagado).
-- O bônus não altera o Health da Base nem torna elegível quem está em "Sem dados suficientes". A soma entra
-- em lib/pontuacao.ts no PR B.
--
-- O que muda (aditivo; nada existente é alterado, exceto a redefinição de sincronia.montar_espelho, que
-- preserva os ramos atuais e acrescenta o de bonus_aplicados):
--   public.bonus_aplicados         tabela; RLS: gestor lê tudo, CS lê só as próprias linhas, ninguém escreve direto
--   public.conceder_bonus          gestor; recebe lista de {cs_nome, pontos} e grava tudo numa transação
--   public.editar_bonus            gestor; não edita bônus anulado
--   public.anular_bonus            gestor; motivo obrigatório; não apaga
--   public.bonus_total_por_cs      total vigente por CS no intervalo de meses, para a pontuação do ranking
--   catálogo de segurança          bonus_aplicados como origem nativa, versionada
--   espelho nativo                 board "Registro: bônus" (18439229782, pasta "Registro do dash de CS"), linha em
--                                  sincronia.espelhos com ativo = false e gatilho de espelho na tabela
-- Auditoria: as quatro funções gravam em access_audit_log.
-- ============================================================================

-- 1. Tabela -------------------------------------------------------------------

create table if not exists public.bonus_aplicados (
  id               uuid primary key default gen_random_uuid(),
  cs_nome          text not null check (btrim(cs_nome) <> ''),
  dinamica         text not null check (btrim(dinamica) <> ''),
  pontos           integer not null check (pontos > 0),
  mes_referencia   date not null check (extract(day from mes_referencia) = 1),
  observacao       text,
  aplicado_por     text not null,
  aplicado_em      timestamptz not null default now(),
  anulado_em       timestamptz,
  anulado_por      text,
  motivo_anulacao  text,
  constraint bonus_anulacao_completa check (
    anulado_em is null
    or (anulado_por is not null and btrim(coalesce(motivo_anulacao, '')) <> ''))
);

create index if not exists bonus_aplicados_cs_mes_idx on public.bonus_aplicados (cs_nome, mes_referencia);

alter table public.bonus_aplicados enable row level security;
revoke all on public.bonus_aplicados from anon, authenticated;
grant select on public.bonus_aplicados to authenticated;

drop policy if exists bonus_le_gestor on public.bonus_aplicados;
create policy bonus_le_gestor on public.bonus_aplicados as permissive for select to authenticated
  using (public.is_gestor());

drop policy if exists bonus_le_proprio_cs on public.bonus_aplicados;
create policy bonus_le_proprio_cs on public.bonus_aplicados as permissive for select to authenticated
  using (cs_nome = public.meu_cs());

drop policy if exists negar_escrita_direta on public.bonus_aplicados;
create policy negar_escrita_direta on public.bonus_aplicados as permissive for all to anon, authenticated
  using (false) with check (false);

comment on table public.bonus_aplicados is
  'Bônus de pontuação concedido pelo gestor, com mês de vigência. Escrita só pelas funções conceder_bonus, editar_bonus e anular_bonus.';

-- 2. Catálogo de segurança ----------------------------------------------------

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('bonus_aplicados', 'nativa', null, true, true, 'Bônus de pontuação concedido pelo gestor, com mês de vigência')
on conflict (tabela) do update set
  origem = excluded.origem, proteger_exclusao = excluded.proteger_exclusao,
  versionar = excluded.versionar, descricao = excluded.descricao, atualizado_em = now();

-- 3. Espelho nativo -----------------------------------------------------------

insert into sincronia.espelhos (tabela, board_id, grupo_id, coluna_chave, mapa, ativo) values
(
  'bonus_aplicados', '18439229782', 'topics', 'text_mm8zprf5',
  '{
    "chave":           {"coluna_id": "text_mm8zprf5",       "tipo": "text"},
    "cs":              {"coluna_id": "text_mm8zwzag",       "tipo": "text"},
    "dinamica":        {"coluna_id": "text_mm8ztga0",       "tipo": "text"},
    "pontos":          {"coluna_id": "numeric_mm8zmh9r",    "tipo": "numbers"},
    "mes":             {"coluna_id": "date_mm8zvnd6",       "tipo": "date"},
    "observacao":      {"coluna_id": "long_text_mm8z8t7w",  "tipo": "long_text"},
    "concedido_por":   {"coluna_id": "text_mm8z4pz4",       "tipo": "text"},
    "concedido_em":    {"coluna_id": "date_mm8zvbyc",       "tipo": "date"},
    "anulado_em":      {"coluna_id": "date_mm8zm1na",       "tipo": "date"},
    "anulado_por":     {"coluna_id": "text_mm8zbf9x",       "tipo": "text"},
    "motivo_anulacao": {"coluna_id": "long_text_mm8zvgph",  "tipo": "long_text"},
    "situacao":        {"coluna_id": "color_mm8zb9s8",      "tipo": "status"}
  }'::jsonb,
  false
)
on conflict (tabela) do nothing;

drop trigger if exists espelho_bonus_aplicados on public.bonus_aplicados;
create trigger espelho_bonus_aplicados after insert or update or delete on public.bonus_aplicados
  for each row execute function sincronia.gatilho_espelho();

-- Mesma montagem de 20261109a, com o ramo de bonus_aplicados. Os demais ramos não mudam.
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

  elsif p_tabela = 'bonus_aplicados' then
    v_nome := coalesce(nullif(btrim(p_linha->>'cs_nome'), ''), 'sem CS')
              || ' | ' || coalesce(nullif(btrim(p_linha->>'dinamica'), ''), 'sem dinâmica')
              || ' | ' || coalesce(to_char((p_linha->>'mes_referencia')::date, 'YYYY-MM'), 'sem mês');
    if p_linha->>'anulado_em' is not null then v_situacao := 'Anulada'; end if;
    v_campos := jsonb_build_object(
      'chave', v_chave,
      'cs', p_linha->>'cs_nome',
      'dinamica', p_linha->>'dinamica',
      'pontos', p_linha->>'pontos',
      'mes', to_char((p_linha->>'mes_referencia')::date, 'YYYY-MM-DD'),
      'observacao', p_linha->>'observacao',
      'concedido_por', p_linha->>'aplicado_por',
      'concedido_em', sincronia.data_local((p_linha->>'aplicado_em')::timestamptz),
      'anulado_em', sincronia.data_local((p_linha->>'anulado_em')::timestamptz),
      'anulado_por', p_linha->>'anulado_por',
      'motivo_anulacao', p_linha->>'motivo_anulacao');

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

-- 4. Funções de escrita (só gestor; auditadas) ---------------------------------

-- Nome canônico do CS (canonico.cs ou cs_periodos). Recusa nome desconhecido.
create or replace function public.bonus_cs_canonico(p_cs text) returns text
language plpgsql stable set search_path = '' as $fn$
declare
  v_nome text;
begin
  select c.nome_curto into v_nome from canonico.cs c
    where canonico.normalizar(c.nome_curto) = canonico.normalizar(p_cs)
    limit 1;
  if v_nome is null then
    select p.nome_curto into v_nome from public.cs_periodos p
      where canonico.normalizar(p.nome_curto) = canonico.normalizar(p_cs)
      limit 1;
  end if;
  if v_nome is null then
    raise exception 'CS não cadastrado: %', p_cs using errcode = 'P0002';
  end if;
  return v_nome;
end;
$fn$;

-- Mês que conta: sempre dia 1, nunca futuro (o mês corrente é o padrão na tela).
create or replace function public.bonus_validar_mes(p_mes date) returns void
language plpgsql stable set search_path = '' as $fn$
begin
  if p_mes is null or extract(day from p_mes) <> 1 then
    raise exception 'Mês que conta deve ser o primeiro dia do mês' using errcode = '22023';
  end if;
  if p_mes > (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date then
    raise exception 'Mês que conta não pode ser futuro' using errcode = '22023';
  end if;
end;
$fn$;

-- Concede um bônus a cada CS da lista, numa única transação. Qualquer item inválido desfaz o lote inteiro.
create or replace function public.conceder_bonus(p_itens jsonb, p_dinamica text, p_mes date, p_observacao text)
returns uuid[]
language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor text := coalesce(seguranca.autor_atual(), 'sistema');
  v_dinamica text := nullif(btrim(coalesce(p_dinamica, '')), '');
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_ids uuid[] := '{}';
  v_vistos text[] := '{}';
  v_item jsonb;
  v_cs text;
  v_pontos integer;
  v_id uuid;
begin
  if not public.is_gestor() then
    raise exception 'Apenas gestor concede bônus.' using errcode = '42501';
  end if;
  if v_dinamica is null then
    raise exception 'Dinâmica obrigatória' using errcode = '22023';
  end if;
  perform public.bonus_validar_mes(p_mes);
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um CS' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_cs := public.bonus_cs_canonico(v_item->>'cs_nome');
    if v_cs = any(v_vistos) then
      raise exception 'CS repetido no lote: %', v_cs using errcode = '22023';
    end if;
    v_vistos := v_vistos || v_cs;
    v_pontos := (v_item->>'pontos')::integer;
    if v_pontos is null or v_pontos <= 0 then
      raise exception 'Pontos devem ser maior que zero (%)', v_cs using errcode = '22023';
    end if;

    insert into public.bonus_aplicados (cs_nome, dinamica, pontos, mes_referencia, observacao, aplicado_por)
      values (v_cs, v_dinamica, v_pontos, p_mes, v_obs, v_actor)
      returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'conceder_bonus', 'bonus_aplicados', 'success',
            jsonb_build_object('dinamica', v_dinamica, 'mes', p_mes, 'ids', to_jsonb(v_ids)));
  return v_ids;
end;
$fn$;

-- Edita dinâmica, pontos, mês e observação. Bônus anulado não é editado. O CS não muda.
create or replace function public.editar_bonus(p_id uuid, p_dinamica text, p_pontos integer, p_mes date, p_observacao text)
returns void
language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor text := coalesce(seguranca.autor_atual(), 'sistema');
  v_antes public.bonus_aplicados%rowtype;
  v_dinamica text := nullif(btrim(coalesce(p_dinamica, '')), '');
begin
  if not public.is_gestor() then
    raise exception 'Apenas gestor edita bônus.' using errcode = '42501';
  end if;
  select * into v_antes from public.bonus_aplicados b where b.id = p_id for update;
  if not found then
    raise exception 'Bônus não encontrado' using errcode = 'P0002';
  end if;
  if v_antes.anulado_em is not null then
    raise exception 'Bônus anulado não pode ser editado' using errcode = '22023';
  end if;
  if v_dinamica is null then
    raise exception 'Dinâmica obrigatória' using errcode = '22023';
  end if;
  if p_pontos is null or p_pontos <= 0 then
    raise exception 'Pontos devem ser maior que zero' using errcode = '22023';
  end if;
  perform public.bonus_validar_mes(p_mes);

  update public.bonus_aplicados set
    dinamica = v_dinamica, pontos = p_pontos, mes_referencia = p_mes,
    observacao = nullif(btrim(coalesce(p_observacao, '')), '')
  where id = p_id;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'editar_bonus', p_id::text, 'success',
            jsonb_build_object(
              'antes', jsonb_build_object('dinamica', v_antes.dinamica, 'pontos', v_antes.pontos, 'mes', v_antes.mes_referencia),
              'depois', jsonb_build_object('dinamica', v_dinamica, 'pontos', p_pontos, 'mes', p_mes)));
end;
$fn$;

-- Anula sem apagar. Motivo obrigatório. Bônus anulado deixa de somar na pontuação do mês.
create or replace function public.anular_bonus(p_id uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $fn$
declare
  v_actor text := coalesce(seguranca.autor_atual(), 'sistema');
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_antes public.bonus_aplicados%rowtype;
begin
  if not public.is_gestor() then
    raise exception 'Apenas gestor anula bônus.' using errcode = '42501';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo da anulação' using errcode = '22023';
  end if;
  select * into v_antes from public.bonus_aplicados b where b.id = p_id for update;
  if not found then
    raise exception 'Bônus não encontrado' using errcode = 'P0002';
  end if;
  if v_antes.anulado_em is not null then
    raise exception 'Bônus já anulado' using errcode = '22023';
  end if;

  update public.bonus_aplicados set anulado_em = now(), anulado_por = v_actor, motivo_anulacao = v_motivo
    where id = p_id;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'anular_bonus', p_id::text, 'success',
            jsonb_build_object('cs_nome', v_antes.cs_nome, 'pontos', v_antes.pontos, 'mes', v_antes.mes_referencia, 'motivo', v_motivo));
end;
$fn$;

-- Total de bônus vigentes (não anulados) por CS, num intervalo de meses. Usada pela pontuação do ranking, que é
-- global: quem vê o ranking já vê a pontuação de cada CS, então só o total sai, nunca quem concedeu nem o motivo.
-- Lida com a sessão de quem pergunta (authenticated); anon não tem acesso. A RLS de bonus_aplicados continua
-- valendo para a lista detalhada.
create or replace function public.bonus_total_por_cs(p_mes_inicio date, p_mes_fim date)
returns table (cs_nome text, pontos bigint)
language sql stable security definer set search_path = '' as $fn$
  select b.cs_nome, sum(b.pontos)::bigint
  from public.bonus_aplicados b
  where b.anulado_em is null
    and b.mes_referencia between p_mes_inicio and p_mes_fim
  group by b.cs_nome;
$fn$;

-- 5. Permissões ----------------------------------------------------------------

revoke all on function public.bonus_cs_canonico(text) from public, anon, authenticated;
revoke all on function public.bonus_validar_mes(date) from public, anon, authenticated;
revoke all on function public.bonus_total_por_cs(date, date) from public, anon;
grant execute on function public.bonus_total_por_cs(date, date) to authenticated;
revoke all on function public.conceder_bonus(jsonb, text, date, text) from public, anon;
revoke all on function public.editar_bonus(uuid, text, integer, date, text) from public, anon;
revoke all on function public.anular_bonus(uuid, text) from public, anon;
grant execute on function public.conceder_bonus(jsonb, text, date, text) to authenticated;
grant execute on function public.editar_bonus(uuid, text, integer, date, text) to authenticated;
grant execute on function public.anular_bonus(uuid, text) to authenticated;

select seguranca.aplicar_protecoes();
