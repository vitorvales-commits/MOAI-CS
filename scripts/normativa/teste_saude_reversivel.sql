-- Teste reversível da saúde dos dados (etapas 6 e 7). Concatenar após supabase/migrations/20261109c_saude_normativa.sql
-- numa única chamada (na cópia descartável). Termina com erro proposital: a mensagem TESTE_SAUDE_OK significa que
-- todas as verificações passaram e que a transação inteira é desfeita.
-- O gatilho comandos_disparar é desligado só dentro da transação, para o teste nunca chamar a sync-monday.
-- Regras do teste: comparações nulas-seguras (is distinct from) e "if not found" após cada leitura.

do $teste$
declare
  v_res jsonb := '{}'::jsonb;
  v_meta uuid := gen_random_uuid();
  v_ind text;
  v_lix bigint;
  v_mon bigint;
  v_n integer;
  v_rotulo text;
  v_resumo text;
  v_txt text;
  v_msg text;
  v_qualquer bigint;
  v_id bigint;
begin
  alter table sincronia.comandos disable trigger comandos_disparar;

  select i.chave into v_ind from public.indicadores_catalogo i limit 1;
  if not found then raise exception 'FALHA preparo: catálogo de indicadores vazio'; end if;

  -- 1. Exclusão nativa: a linha vai para a lixeira e aparece na lista de saúde, com rótulo e resumo.
  insert into public.metas_definidas (id, indicador, mes, escopo, cs_nome, valor, atualizado_por)
    values (v_meta, v_ind, '2026-10-01', 'cs', 'CS Saúde', 10, 'teste');
  delete from public.metas_definidas where id = v_meta;

  select l.id into v_lix from seguranca.lixeira l
    where l.tabela = 'metas_definidas' and l.chave::text like '%' || v_meta::text || '%'
    order by l.id desc limit 1;
  if not found then raise exception 'FALHA 1: exclusão não foi para a lixeira'; end if;

  select r.rotulo, r.resumo into v_rotulo, v_resumo from public.lixeira_nativa_recente(30) r where r.id = v_lix;
  if not found then raise exception 'FALHA 1b: exclusão nativa não aparece na lista de saúde'; end if;
  if v_rotulo is distinct from 'Metas definidas' then raise exception 'FALHA 1c: rótulo %', v_rotulo; end if;
  if v_resumo is distinct from v_ind || ' | CS Saúde | 10/2026' then raise exception 'FALHA 1d: resumo %', v_resumo; end if;
  v_res := v_res || jsonb_build_object('1_exclusao_nativa_listada', true);

  -- 2. Restauração pela tela: devolve a linha e grava auditoria.
  v_txt := public.restaurar_da_lixeira(v_lix);
  if v_txt is distinct from 'restaurado em metas_definidas' then raise exception 'FALHA 2: resultado %', v_txt; end if;

  select count(*) into v_n from public.metas_definidas where id = v_meta;
  if v_n is distinct from 1 then raise exception 'FALHA 2b: linha não voltou (% linhas)', v_n; end if;

  select count(*) into v_n from public.access_audit_log
    where action = 'restaurar_lixeira' and metadata->>'lixeira_id' = v_lix::text and result = 'ok';
  if v_n is distinct from 1 then raise exception 'FALHA 2c: restauração sem auditoria (% linhas)', v_n; end if;
  v_res := v_res || jsonb_build_object('2_restauracao_com_auditoria', true);

  -- 3. Linha restaurada some da lista.
  select count(*) into v_n from public.lixeira_nativa_recente(30) r where r.id = v_lix;
  if v_n is distinct from 0 then raise exception 'FALHA 3: linha restaurada ainda aparece na lista (% linhas)', v_n; end if;
  v_res := v_res || jsonb_build_object('3_restaurada_some_da_lista', true);

  -- 4. Linha de origem Monday (ou calculada) é recusada com a mensagem clara, sem auditoria.
  select l.id into v_mon from seguranca.lixeira l
    join seguranca.catalogo_tabelas c on c.tabela = l.tabela
    where c.origem is distinct from 'nativa'
    order by l.id limit 1;
  if not found then raise exception 'FALHA preparo: não há linha de origem Monday na lixeira da cópia'; end if;

  v_msg := null;
  begin
    perform public.restaurar_da_lixeira(v_mon);
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'Esta linha vem do Monday ou é calculada; restaurar aqui não teria efeito.' then
    raise exception 'FALHA 4: recusa esperada, obtido %', coalesce(v_msg, '(sem erro)');
  end if;

  select count(*) into v_n from public.access_audit_log
    where action = 'restaurar_lixeira' and metadata->>'lixeira_id' = v_mon::text;
  if v_n is distinct from 0 then raise exception 'FALHA 4b: recusa gravou auditoria (% linhas)', v_n; end if;
  v_res := v_res || jsonb_build_object('4_monday_recusado_sem_auditoria', true);

  -- 5. CS comum (papel authenticated, e-mail que não é gestor): recebe só a mensagem de perfil, para id existente
  -- e para id inexistente. Assim não dá para sondar o conteúdo da lixeira.
  select l.id into v_qualquer from seguranca.lixeira l order by l.id limit 1;
  if not found then raise exception 'FALHA preparo: lixeira vazia na cópia'; end if;

  perform set_config('request.jwt.claims', '{"role":"authenticated","email":"cs.comum@teste.invalid"}', true);
  set local role authenticated;
  for v_id in select unnest(array[v_qualquer, 999999999::bigint]) loop
    v_msg := null;
    begin
      perform public.restaurar_da_lixeira(v_id);
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'Apenas gestor restaura dados.' then
      raise exception 'FALHA 5: CS comum recebeu % para o id %', coalesce(v_msg, '(sem erro)'), v_id;
    end if;
  end loop;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  v_res := v_res || jsonb_build_object('5_cs_comum_so_recebe_mensagem_de_perfil', true);

  raise exception 'TESTE_SAUDE_OK %', v_res::text;
end;
$teste$;
