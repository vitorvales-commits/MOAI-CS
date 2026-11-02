-- ============================================================================
-- Normativa de dados, etapa 4b (backend): leitura e resolução da fila de escrita (02/11/2026)
--
-- Conteúdo:
--   sincronia.validar_edicao(board, item, valores)   checagens da edição, em um lugar só (interna)
--   public.enfileirar_edicao_monday(...)             passa a usar sincronia.validar_edicao (mesma assinatura)
--   public.sincronia_comando_status(id)              estado de um comando: time MOAI vê o próprio; gestor vê todos
--   public.sincronia_escritas_pendentes()            comandos em erro ou em conflito, com autor e valores
--   public.sincronia_resolver_conflito(id, acao, chave)  resolve um conflito: usar o Monday ou reaplicar a alteração
-- ============================================================================

-- 1. Checagens de uma edição: fila ativa, colunas editáveis, papel e carteira.
--    Interna: sem grant a ninguém. Só as funções security definer do banco chamam.
create or replace function sincronia.validar_edicao(
  p_board_id text,
  p_item_id text,
  p_valores jsonb
) returns void
language plpgsql set search_path = '' as $fn$
declare
  v_coluna text;
  v_campo sincronia.campos_editaveis%rowtype;
  v_grupo text;
  v_cs_id bigint;
begin
  if not sincronia.fila_ativa() then
    raise exception 'Fila de escrita desligada: a edição não foi enviada ao Monday. O gestor precisa ligar a chave fila_escrita_ativa.';
  end if;
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
end;
$fn$;

revoke all on function sincronia.validar_edicao(text, text, jsonb) from public, anon, authenticated;

-- 2. Enfileiramento: mesma assinatura da 20261030f; as checagens agora vêm de sincronia.validar_edicao.
--    p_adiar_segundos adia o disparo (usado no teste de conflito); o padrão dispara já.
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
  v_id bigint;
begin
  if not (sincronia.chamador_privilegiado() or public.is_moai_user()) then
    raise exception 'Acesso restrito ao time MOAI.';
  end if;
  perform sincronia.validar_edicao(p_board_id, p_item_id, p_valores);
  if coalesce(p_chave, '') = '' then raise exception 'Chave de idempotência obrigatória.'; end if;

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

-- 3. Leitura para a interface.
create or replace function public.sincronia_comando_status(p_id bigint)
returns table (
  id bigint,
  estado text,
  erro text,
  resultado jsonb,
  valores_anteriores jsonb,
  lido_em timestamptz,
  executado_em timestamptz,
  criado_por text
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_moai_user()) then
    raise exception 'Acesso restrito ao time MOAI.';
  end if;
  return query
    select c.id, c.estado, c.erro, c.resultado, c.valores_anteriores, c.lido_em, c.executado_em, c.criado_por
    from sincronia.comandos c
    where c.id = p_id
      and (sincronia.chamador_privilegiado() or public.is_gestor() or c.criado_por = seguranca.autor_atual());
end;
$fn$;

create or replace function public.sincronia_escritas_pendentes()
returns table (
  id bigint,
  board_id text,
  item_id text,
  estado text,
  erro text,
  criado_em timestamptz,
  executado_em timestamptz,
  criado_por text,
  valores jsonb
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor vê as escritas pendentes.';
  end if;
  return query
    select c.id, c.board_id, c.item_id, c.estado, c.erro, c.criado_em, c.executado_em, c.criado_por, c.valores
    from sincronia.comandos c
    where c.estado in ('erro', 'conflito')
    order by coalesce(c.executado_em, c.criado_em);
end;
$fn$;

-- 4. Resolução de conflito. Só comando em 'conflito'; permitida ao autor, a gestor ou ao chamador privilegiado.
--    'usar_monday': o comando vira cancelado e o valor do Monday fica. Retorna o próprio id.
--    'reaplicar': o comando vira cancelado e um novo atualizar_colunas, com os mesmos valores, é enfileirado
--    com lido_em = agora e a chave p_chave. As checagens são as mesmas da edição normal.
create or replace function public.sincronia_resolver_conflito(
  p_id bigint,
  p_acao text,
  p_chave text
) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare
  v_autor text := seguranca.autor_atual();
  v_cmd sincronia.comandos%rowtype;
  v_novo bigint;
begin
  if not (sincronia.chamador_privilegiado() or public.is_moai_user()) then
    raise exception 'Acesso restrito ao time MOAI.';
  end if;

  select * into v_cmd from sincronia.comandos c where c.id = p_id for update;
  if not found then raise exception 'Comando não encontrado.'; end if;
  if not (sincronia.chamador_privilegiado() or public.is_gestor() or v_cmd.criado_por = v_autor) then
    raise exception 'Só o autor da edição ou um gestor resolve o conflito.';
  end if;
  if v_cmd.estado <> 'conflito' then
    raise exception 'Só é possível resolver comando em conflito (estado atual: %).', v_cmd.estado;
  end if;

  if p_acao = 'usar_monday' then
    update sincronia.comandos set estado = 'cancelado', erro = 'resolvido: valor do Monday mantido'
    where id = p_id;
    v_novo := p_id;
  elsif p_acao = 'reaplicar' then
    if coalesce(p_chave, '') = '' or length(p_chave) < 8 or length(p_chave) > 100 then
      raise exception 'Chave inválida (de 8 a 100 caracteres).';
    end if;
    if p_chave = v_cmd.chave_idempotencia then
      raise exception 'A chave da reaplicação precisa ser nova.';
    end if;
    perform sincronia.validar_edicao(v_cmd.board_id, v_cmd.item_id, v_cmd.valores);

    insert into sincronia.comandos
      (chave_idempotencia, operacao, board_id, item_id, valores, lido_em, origem_tabela, origem_chave, criado_por, proxima_tentativa_em)
    values
      (p_chave, 'atualizar_colunas', v_cmd.board_id, v_cmd.item_id, v_cmd.valores, now(),
       v_cmd.origem_tabela, v_cmd.origem_chave, v_autor, now())
    on conflict (chave_idempotencia) do nothing
    returning id into v_novo;
    if v_novo is null then
      select c.id into v_novo from sincronia.comandos c where c.chave_idempotencia = p_chave;
    end if;

    update sincronia.comandos set estado = 'cancelado', erro = 'resolvido: reaplicado no comando ' || v_novo
    where id = p_id;
  else
    raise exception 'Ação inválida: use usar_monday ou reaplicar.';
  end if;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (v_autor, 'sincronia_resolver', 'sincronia.comandos', 'ok',
          jsonb_build_object('id', p_id, 'acao', p_acao, 'novo', v_novo));
  return v_novo;
end;
$fn$;

-- 5. Permissões: leitura e resolução só para usuários autenticados.
revoke all on function public.sincronia_comando_status(bigint) from public, anon;
revoke all on function public.sincronia_escritas_pendentes() from public, anon;
revoke all on function public.sincronia_resolver_conflito(bigint, text, text) from public, anon;
grant execute on function public.sincronia_comando_status(bigint) to authenticated;
grant execute on function public.sincronia_escritas_pendentes() to authenticated;
grant execute on function public.sincronia_resolver_conflito(bigint, text, text) to authenticated;
