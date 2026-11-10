-- Teste da migração 20261110_ritmo_semanal_fila. Roda em transação e desfaz no final (rollback).
-- Espera: todas as notices 'OK'. Qualquer falha aborta a transação.
-- Usa uma semana fictícia (2030-01-07) para não tocar em dados reais.
begin;

-- Preparação (como postgres): fechamento fictício de três indicadores para o primeiro CS do cadastro.
do $t$ declare v_cs text; begin
  select nome into v_cs from public.cs_config order by nome limit 1;
  -- cases abaixo do limiar (1 < 0,70 x 4); indicacoes no ritmo (2 >= 0,70 x 2); upsell com realizado ausente
  insert into public.metas_semanais_fechamento (cs_nome, indicador, mes, semana_inicio, base, deficit_recebido, meta_efetiva, realizado, sem_data, retroativo)
    values (v_cs, 'cases', '2030-01-01', '2030-01-07', 4, 0, 4, 1, 0, false),
           (v_cs, 'indicacoes', '2030-01-01', '2030-01-07', 2, 0, 2, 2, 0, false),
           (v_cs, 'upsell', '2030-01-01', '2030-01-07', 3, 0, 3, null, 0, false);
end $t$;

-- 1. Primeira geração: um item para o CS, só com cases, deficit 3, upsell (ausente) fora.
do $t$ declare v_n integer; v_it record; begin
  v_n := public.gerar_itens_ritmo_semanal('2030-01-07');
  select * into v_it from public.fila_acao_itens where fonte = 'ritmo_semanal' and semana_inicio = '2030-01-07';
  assert v_n = 1, 'uma geração gravou ' || v_n;
  assert v_it.deficit_total = 3, 'deficit do item ' || v_it.deficit_total;
  assert jsonb_array_length(v_it.indicadores) = 1, 'só cases entra';
  assert v_it.indicadores -> 0 ->> 'indicador' = 'cases', 'indicador do item';
  assert v_it.status = 'aberto' and v_it.responsavel = 'gestao', 'status e responsável iniciais';
  raise notice 'OK 1: geração grava um item com cases (deficit 3), indicacoes no ritmo e upsell ausente fora';
end $t$;

-- 2. Idempotência: gerar de novo não duplica nem muda o total de itens.
do $t$ declare v_total integer; begin
  perform public.gerar_itens_ritmo_semanal('2030-01-07');
  select count(*) into v_total from public.fila_acao_itens where fonte = 'ritmo_semanal' and semana_inicio = '2030-01-07';
  assert v_total = 1, 'itens após segunda geração: ' || v_total;
  raise notice 'OK 2: geração repetida mantém um item por CS e semana';
end $t$;

-- 3. Realizado ausente não vira zero: upsell com realizado null não entra, mesmo com limiar alto.
do $t$ declare v_n integer; begin
  update public.ritmo_semanal_config set valor = 1 where chave = 'limiar';
  v_n := public.gerar_itens_ritmo_semanal('2030-01-07');
  assert not exists (select 1 from public.fila_acao_itens f, jsonb_array_elements(f.indicadores) i
                     where f.semana_inicio = '2030-01-07' and i ->> 'indicador' = 'upsell'), 'upsell ausente entrou';
  raise notice 'OK 3: realizado ausente fica fora da fila mesmo com limiar 1';
end $t$;

-- 4. Limiar configurável: com limiar 0,20 nenhum indicador fica abaixo, e o item existente permanece (não é apagado).
do $t$ declare v_total integer; begin
  update public.ritmo_semanal_config set valor = 0.20 where chave = 'limiar';
  perform public.gerar_itens_ritmo_semanal('2030-01-07');
  select count(*) into v_total from public.fila_acao_itens where fonte = 'ritmo_semanal' and semana_inicio = '2030-01-07';
  assert v_total = 1, 'item apagado ou duplicado com limiar baixo: ' || v_total;
  raise notice 'OK 4: limiar baixo não apaga item aberto';
end $t$;

-- 5. Item tratado não muda com nova geração. Gestor trata como gestor de teste.
do $t$ declare v_id uuid; v_gestor text; begin
  update public.ritmo_semanal_config set valor = 0.70 where chave = 'limiar';
  select email into v_gestor from public.gestores order by email limit 1;
  select id into v_id from public.fila_acao_itens where fonte = 'ritmo_semanal' and semana_inicio = '2030-01-07';
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.tratar_item_ritmo(v_id);
  reset role;
  update public.metas_semanais_fechamento set realizado = 0 where semana_inicio = '2030-01-07' and indicador = 'indicacoes';
  perform public.gerar_itens_ritmo_semanal('2030-01-07');
  assert (select status from public.fila_acao_itens where id = v_id) = 'tratado', 'item tratado voltou a aberto';
  assert (select jsonb_array_length(indicadores) from public.fila_acao_itens where id = v_id) = 1,
         'item tratado foi alterado pela geração';
  raise notice 'OK 5: item tratado não é alterado pela geração seguinte';
end $t$;

-- 6. CS comum (não gestor) não consegue tratar, nem mudar o limiar.
do $t$ declare v_id uuid; v_erro text; begin
  select id into v_id from public.fila_acao_itens where fonte = 'ritmo_semanal' and semana_inicio = '2030-01-07';
  perform set_config('request.jwt.claims', json_build_object('email', 'nao.gestor@teste.invalid', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.salvar_limiar_ritmo(0.5);
    v_erro := 'sem erro';
  exception when sqlstate '42501' then v_erro := '42501';
  end;
  assert v_erro = '42501', 'CS comum mudou o limiar: ' || v_erro;
  begin
    perform public.tratar_item_ritmo(v_id);
    v_erro := 'sem erro';
  exception when sqlstate '42501' then v_erro := '42501';
  end;
  assert v_erro = '42501', 'CS comum tratou item: ' || v_erro;
  reset role;
  raise notice 'OK 6: CS comum recebe 42501 em salvar_limiar_ritmo e tratar_item_ritmo';
end $t$;

-- 7. Função de geração não é chamável por authenticated (só service_role e postgres).
do $t$ declare v_erro text; begin
  perform set_config('request.jwt.claims', json_build_object('email', 'nao.gestor@teste.invalid', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.gerar_itens_ritmo_semanal('2030-01-07');
    v_erro := 'sem erro';
  exception when insufficient_privilege then v_erro := 'negado';
  end;
  assert v_erro = 'negado', 'authenticated executou gerar_itens_ritmo_semanal: ' || v_erro;
  reset role;
  raise notice 'OK 7: authenticated não executa a geração';
end $t$;

-- 8. Semana que não é segunda é recusada.
do $t$ declare v_erro text; begin
  begin
    perform public.gerar_itens_ritmo_semanal('2030-01-08');
    v_erro := 'sem erro';
  exception when sqlstate '22023' then v_erro := '22023';
  end;
  assert v_erro = '22023', 'semana que não é segunda passou';
  raise notice 'OK 8: semana que não é segunda é recusada';
end $t$;

rollback;
