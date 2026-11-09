-- Teste reversível do espelho nativo (etapa 5). Concatenar após supabase/migrations/20261109a_espelho_nativo.sql
-- numa única chamada. Termina com erro proposital: a mensagem TESTE_ESPELHO_OK significa que todas as
-- verificações passaram e que nada ficou aplicado (a transação inteira é desfeita).
-- O gatilho comandos_disparar é desligado só dentro da transação, para o teste nunca chamar a sync-monday.
-- Regras do teste: toda comparação é nula-segura (is distinct from), e cada leitura de comando confere
-- "not found", para que um comando ausente nunca faça a verificação passar sem testar nada.
-- Ao fim de cada etapa, pg_temp.checar confere que nenhuma falha de espelho foi registrada em access_audit_log.

do $teste$
declare
  v_res jsonb := '{}'::jsonb;
  v_meta uuid := gen_random_uuid();
  v_meta2 uuid := gen_random_uuid();
  v_adv uuid := gen_random_uuid();
  v_rel uuid := gen_random_uuid();
  v_grupo text;
  v_ind text;
  v_membro bigint;
  v_n integer;
  v_nome text;
  v_val jsonb;
  v_m jsonb;
  v_linha jsonb;
  v_estado text;
  v_id bigint;
  v_id2 bigint;
  v_id3 bigint;
begin
  alter table sincronia.comandos disable trigger comandos_disparar;
  update sincronia.configuracao set valor = true where chave = 'fila_escrita_ativa';

  perform set_config('teste.falhas0',
    (select count(*) from public.access_audit_log where action = 'sincronia_espelho_falhou')::text, true);

  create function pg_temp.checar(p_etapa text) returns void language plpgsql as $f$
  declare
    n integer;
  begin
    select count(*) into n from public.access_audit_log where action = 'sincronia_espelho_falhou';
    if n is distinct from current_setting('teste.falhas0')::integer then
      raise exception 'FALHA silenciosa na etapa %: % falha(s) de espelho registrada(s)', p_etapa, n;
    end if;
  end
  $f$;

  select g.group_id into v_grupo from public.conselhos_grupos g limit 1;
  select m.id into v_membro from public.conselhos_membros m limit 1;
  select i.chave into v_ind from public.indicadores_catalogo i limit 1;
  if v_grupo is null or v_membro is null or v_ind is null then
    raise exception 'FALHA preparo: sem grupo, membro ou indicador de exemplo';
  end if;

  -- 1. Espelho inativo: a escrita acontece no dash, nada é enfileirado.
  insert into public.metas_definidas (id, indicador, mes, escopo, cs_nome, valor, atualizado_por)
    values (v_meta, v_ind, '2026-10-01', 'cs', 'CS Teste', 10, 'teste');
  select count(*) into v_n from sincronia.comandos
    where origem_tabela = 'metas_definidas' and origem_chave = v_meta::text;
  if v_n is distinct from 0 then raise exception 'FALHA 1: espelho inativo enfileirou (%)', v_n; end if;
  perform pg_temp.checar('1');
  v_res := v_res || jsonb_build_object('1_espelho_inativo_nao_enfileira', true);

  -- 2. Coalescência: três alterações seguidas viram um só comando pendente, com o estado mais recente.
  update sincronia.espelhos set ativo = true where tabela = 'metas_definidas';
  update public.metas_definidas set valor = 20 where id = v_meta;
  update public.metas_definidas set valor = 30 where id = v_meta;
  select count(*) into v_n from sincronia.comandos
    where operacao = 'espelhar' and estado = 'pendente'
      and origem_tabela = 'metas_definidas' and origem_chave = v_meta::text;
  if v_n is distinct from 1 then raise exception 'FALHA 2: coalescência deixou % pendentes', v_n; end if;
  select c.valores, c.nome_item into v_val, v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'metas_definidas' and c.origem_chave = v_meta::text;
  if not found then raise exception 'FALHA 2: comando pendente não encontrado'; end if;
  if (v_val->'numeric_mm8yz7et'->>'valor')::numeric is distinct from 30 then
    raise exception 'FALHA 2b: valor não é o mais recente: %', v_val;
  end if;
  if v_nome is distinct from v_ind || ' | CS Teste | 2026-10' then raise exception 'FALHA 2c: nome %', v_nome; end if;
  if v_val->'color_mm8yk4a2'->>'valor' is distinct from 'Ativo' then raise exception 'FALHA 2d: situação %', v_val; end if;
  if v_val->'date_mm8yqd6w'->>'valor' is distinct from '2026-10-01' then raise exception 'FALHA 2e: mês %', v_val; end if;
  perform pg_temp.checar('2');
  v_res := v_res || jsonb_build_object('2_coalescencia_e_valores', true);

  -- 3. Exclusão no dash: a montagem a partir da última versão marca "Excluído no dash".
  select to_jsonb(m) into v_linha from public.metas_definidas m where m.id = v_meta;
  if not found then raise exception 'FALHA 3: meta de teste não encontrada'; end if;
  v_m := sincronia.montar_espelho('metas_definidas', v_linha, true);
  if v_m->'valores'->'color_mm8yk4a2'->>'valor' is distinct from 'Excluído no dash' then
    raise exception 'FALHA 3: situação de exclusão %', v_m;
  end if;
  if v_m->'valores'->'numeric_mm8yz7et'->>'valor' is distinct from '30' then
    raise exception 'FALHA 3b: exclusão perdeu a última versão %', v_m;
  end if;
  perform pg_temp.checar('3');
  v_res := v_res || jsonb_build_object('3_montagem_excluido', true);

  -- 4. Exclusão real: coalesce no comando pendente, marcado como excluído.
  delete from public.metas_definidas where id = v_meta;
  select c.valores into v_val from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'metas_definidas' and c.origem_chave = v_meta::text;
  if not found then raise exception 'FALHA 4: comando pendente da exclusão não encontrado'; end if;
  if v_val->'color_mm8yk4a2'->>'valor' is distinct from 'Excluído no dash' then
    raise exception 'FALHA 4: exclusão não marcou o item %', v_val;
  end if;
  perform pg_temp.checar('4');
  v_res := v_res || jsonb_build_object('4_exclusao_marca_excluido', true);

  -- 5. Advertência anulada vira "Anulada"; alteração de coluna não mapeada não enfileira nada.
  update sincronia.espelhos set ativo = true where tabela = 'advertencias_aplicadas';
  insert into public.advertencias_aplicadas (id, cs_nome, tipo_nome, pontos, validade_meses, aplicado_por, valido_ate)
    values (v_adv, 'CS Teste', 'Atraso', 2, 6, 'gestor', now() + interval '6 months');
  update public.advertencias_aplicadas
    set anulada_em = now(), anulada_por = 'gestor', motivo_anulacao = 'teste' where id = v_adv;
  select c.valores, c.nome_item into v_val, v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'advertencias_aplicadas' and c.origem_chave = v_adv::text;
  if not found then raise exception 'FALHA 5: comando pendente da advertência não encontrado'; end if;
  if v_val->'color_mm8yy8eb'->>'valor' is distinct from 'Anulada' then
    raise exception 'FALHA 5: situação %', v_val;
  end if;
  if v_nome is null or v_nome not like 'CS Teste | Atraso | %' then raise exception 'FALHA 5b: nome %', v_nome; end if;
  update sincronia.comandos set nome_item = 'SENTINELA'
    where operacao = 'espelhar' and estado = 'pendente'
      and origem_tabela = 'advertencias_aplicadas' and origem_chave = v_adv::text;
  update public.advertencias_aplicadas set chave_origem = 'sem-efeito' where id = v_adv;
  select c.nome_item into v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'advertencias_aplicadas' and c.origem_chave = v_adv::text;
  if not found then raise exception 'FALHA 5c: comando pendente sumiu após coluna não mapeada'; end if;
  if v_nome is distinct from 'SENTINELA' then raise exception 'FALHA 5c: coluna não mapeada enfileirou'; end if;
  perform pg_temp.checar('5');
  v_res := v_res || jsonb_build_object('5_anulada_e_coluna_nao_mapeada', true);

  -- 5b. Nome nunca nulo: advertência sem tipo e sem data, montada direto da linha.
  v_m := sincronia.montar_espelho('advertencias_aplicadas', jsonb_build_object(
           'id', gen_random_uuid()::text, 'cs_nome', 'CS X', 'tipo_nome', null,
           'aplicado_em', null, 'valido_ate', null, 'pontos', 1, 'validade_meses', 6,
           'aplicado_por', 'gestor', 'origem', 'manual'), false);
  if v_m->>'nome_item' is distinct from 'CS X | sem tipo | sem data' then
    raise exception 'FALHA 5b: nome sem tipo nulo %', v_m;
  end if;
  v_m := sincronia.montar_espelho('advertencias_aplicadas', jsonb_build_object(
           'id', gen_random_uuid()::text, 'cs_nome', null, 'tipo_nome', null,
           'aplicado_em', null, 'valido_ate', null, 'pontos', 1, 'validade_meses', 6,
           'aplicado_por', 'gestor', 'origem', 'manual'), false);
  if v_m->>'nome_item' is null or v_m->>'nome_item' = '' then
    raise exception 'FALHA 5b: nome nulo com tudo vazio %', v_m;
  end if;
  perform pg_temp.checar('5b');
  v_res := v_res || jsonb_build_object('5b_nome_nunca_nulo', true);

  -- 6. Relatório: nome, faltas agregadas e quantidade; coluna não mapeada não enfileira.
  update sincronia.espelhos set ativo = true where tabela = 'relatorios_conselho';
  insert into public.relatorios_conselho
    (id, group_id, data_encontro, cs_nome, avaliacao, avanco, membro_atencao_id, membro_atencao_motivo, combinado, enviado_por)
    values (v_rel, v_grupo, '2026-11-05 10:00:00-03', 'CS Teste', 'Bom', 'Bom', v_membro, 'Motivo', 'Combinado X', 'gestor');
  insert into public.relatorio_conselho_faltas (relatorio_id, membro_id, membro_nome, tipo, categoria, justificativa)
    values (v_rel, v_membro, 'Fulano', 'Falta', 'Justificada', 'Viagem');
  select c.valores, c.nome_item into v_val, v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'relatorios_conselho' and c.origem_chave = v_rel::text;
  if not found then raise exception 'FALHA 6: comando pendente do relatório não encontrado'; end if;
  if v_val->'long_text_mm8ygz0s'->>'valor' is distinct from 'Fulano: Falta, Justificada. Viagem' then
    raise exception 'FALHA 6: faltas %', v_val;
  end if;
  if v_val->'numeric_mm8yscn3'->>'valor' is distinct from '1' then raise exception 'FALHA 6b: quantidade %', v_val; end if;
  if v_val->'date_mm8ybvp5'->>'valor' is distinct from '2026-11-05' then raise exception 'FALHA 6c: data %', v_val; end if;
  if v_nome is null or v_nome not like '% | 05/11/2026' then raise exception 'FALHA 6d: nome %', v_nome; end if;
  update sincronia.comandos set nome_item = 'SENTINELA'
    where operacao = 'espelhar' and estado = 'pendente'
      and origem_tabela = 'relatorios_conselho' and origem_chave = v_rel::text;
  update public.relatorios_conselho set atualizado_por = 'outro' where id = v_rel;
  select c.nome_item into v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'relatorios_conselho' and c.origem_chave = v_rel::text;
  if not found then raise exception 'FALHA 6e: comando pendente sumiu após coluna não mapeada'; end if;
  if v_nome is distinct from 'SENTINELA' then raise exception 'FALHA 6e: coluna não mapeada do relatório enfileirou'; end if;
  perform pg_temp.checar('6');
  v_res := v_res || jsonb_build_object('6_relatorio_faltas_e_nao_mapeado', true);

  -- 7. Alterar uma falta reespelha o relatório pai.
  update public.relatorio_conselho_faltas set justificativa = 'Doença' where relatorio_id = v_rel;
  select c.valores into v_val from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'relatorios_conselho' and c.origem_chave = v_rel::text;
  if not found then raise exception 'FALHA 7: comando pendente do relatório não encontrado'; end if;
  if v_val->'long_text_mm8ygz0s'->>'valor' is distinct from 'Fulano: Falta, Justificada. Doença' then
    raise exception 'FALHA 7: falta não reespelhou o pai %', v_val;
  end if;
  perform pg_temp.checar('7');
  v_res := v_res || jsonb_build_object('7_falta_reespelha_pai', true);

  -- 8. Exclusão: faltas primeiro (reespelha o pai), depois o relatório (marca excluído, sem duplicar comando).
  delete from public.relatorio_conselho_faltas where relatorio_id = v_rel;
  delete from public.relatorios_conselho where id = v_rel;
  select count(*) into v_n from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'relatorios_conselho' and c.origem_chave = v_rel::text;
  if v_n is distinct from 1 then raise exception 'FALHA 8: exclusão deixou % pendentes', v_n; end if;
  select c.valores into v_val from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'relatorios_conselho' and c.origem_chave = v_rel::text;
  if not found then raise exception 'FALHA 8: comando pendente da exclusão não encontrado'; end if;
  if v_val->'color_mm8yg9nh'->>'valor' is distinct from 'Excluído no dash' then
    raise exception 'FALHA 8b: %', v_val;
  end if;
  perform pg_temp.checar('8');
  v_res := v_res || jsonb_build_object('8_exclusao_relatorio', true);

  -- 9. Períodos de CS: "Sim"/"Não", apelidos separados por vírgula.
  update sincronia.espelhos set ativo = true where tabela = 'cs_periodos';
  insert into public.cs_periodos (nome_curto, nome_completo, primeiro_mes, origem, aliases)
    values ('TESTE_ESP', 'Teste Esp Completo', '2026-01-01', 'teste', array['Ap', 'Teste Ap']);
  select c.valores, c.nome_item into v_val, v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'cs_periodos' and c.origem_chave = 'TESTE_ESP';
  if not found then raise exception 'FALHA 9: comando pendente do período não encontrado'; end if;
  if v_nome is distinct from 'TESTE_ESP' then raise exception 'FALHA 9: nome %', v_nome; end if;
  if v_val->'text_mm8y8neq'->>'valor' is distinct from 'Não' then raise exception 'FALHA 9b: confirmado %', v_val; end if;
  if v_val->'text_mm8y1j6'->>'valor' is distinct from 'Ap, Teste Ap' then raise exception 'FALHA 9c: apelidos %', v_val; end if;
  perform pg_temp.checar('9');
  v_res := v_res || jsonb_build_object('9_periodos', true);

  -- 10. Histórico: a meta vai de A para B e de volta para A. Cada envio é comando novo; o anterior não é reaberto.
  insert into public.metas_definidas (id, indicador, mes, escopo, cs_nome, valor, atualizado_por)
    values (v_meta2, v_ind, '2026-09-01', 'cs', 'CS Hist', 10, 'teste');
  select c.id into v_id from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'metas_definidas' and c.origem_chave = v_meta2::text;
  if not found then raise exception 'FALHA 10: comando A não encontrado'; end if;
  update sincronia.comandos set estado = 'concluido' where id = v_id;

  update public.metas_definidas set valor = 20 where id = v_meta2;
  select c.id into v_id2 from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'metas_definidas' and c.origem_chave = v_meta2::text;
  if not found then raise exception 'FALHA 10: comando B não encontrado'; end if;
  if v_id2 is not distinct from v_id then raise exception 'FALHA 10: B reaproveitou o comando A'; end if;
  update sincronia.comandos set estado = 'concluido' where id = v_id2;

  update public.metas_definidas set valor = 10 where id = v_meta2;
  select c.id into v_id3 from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'metas_definidas' and c.origem_chave = v_meta2::text;
  if not found then raise exception 'FALHA 10: comando A de volta não encontrado'; end if;
  if v_id3 is not distinct from v_id or v_id3 is not distinct from v_id2 then
    raise exception 'FALHA 10: A de volta reabriu um comando anterior';
  end if;

  select count(*) into v_n from sincronia.comandos
    where origem_tabela = 'metas_definidas' and origem_chave = v_meta2::text;
  if v_n is distinct from 3 then raise exception 'FALHA 10: histórico tem % comandos, esperado 3', v_n; end if;

  select c.estado into v_estado from sincronia.comandos c where c.id = v_id;
  if v_estado is distinct from 'concluido' then raise exception 'FALHA 10: comando A foi reaberto (estado %)', v_estado; end if;
  select c.valores into v_val from sincronia.comandos c where c.id = v_id;
  if (v_val->'numeric_mm8yz7et'->>'valor')::numeric is distinct from 10 then
    raise exception 'FALHA 10: comando A alterado %', v_val;
  end if;
  perform pg_temp.checar('10');
  v_res := v_res || jsonb_build_object('10_historico_a_b_a', true);

  -- 11. Vínculo: uma linha por origem; registrar de novo substitui o item.
  perform public.sincronia_vincular_espelho('metas_definidas', 'k-teste', '111');
  perform public.sincronia_vincular_espelho('metas_definidas', 'k-teste', '222');
  select count(*) into v_n from sincronia.vinculo_nativo where tabela = 'metas_definidas' and chave = 'k-teste';
  select v.monday_item_id into v_nome from sincronia.vinculo_nativo v where v.tabela = 'metas_definidas' and v.chave = 'k-teste';
  if v_n is distinct from 1 or v_nome is distinct from '222' then
    raise exception 'FALHA 11: vínculo % %', v_n, v_nome;
  end if;
  perform pg_temp.checar('11');
  v_res := v_res || jsonb_build_object('11_vinculo_substitui', true);

  -- 12. Espelho inativo bloqueia a carga inicial com mensagem clara.
  update sincronia.espelhos set ativo = false where tabela = 'cs_periodos';
  begin
    perform public.sincronia_carga_inicial_espelho('cs_periodos');
    raise exception 'FALHA 12: carga aceitou espelho inativo';
  exception when others then
    if sqlerrm is distinct from 'O espelho de cs_periodos precisa estar ativo antes da carga inicial.' then
      raise exception 'FALHA 12b: mensagem inesperada: %', sqlerrm;
    end if;
  end;
  perform pg_temp.checar('12');
  v_res := v_res || jsonb_build_object('12_carga_exige_espelho_ativo', true);

  -- Função de leitura das falhas responde para o gestor (chamada como serviço neste teste).
  perform 1 from public.sincronia_falhas_espelho();
  v_res := v_res || jsonb_build_object('13_falhas_espelho_legivel', true);

  raise exception 'TESTE_ESPELHO_OK %', v_res::text;
end;
$teste$;
