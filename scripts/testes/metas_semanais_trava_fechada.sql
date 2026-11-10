-- Teste da migração 20261105h (trava de semana fechada). Roda em transação e desfaz no final.
-- Espera: todas as notices 'OK'. Qualquer falha aborta a transação.
begin;

-- Preparação (como postgres): uma semana fechada de propósito, para o primeiro CS do cadastro.
do $t$ declare v_gestor text; v_cs text; begin
  select email into v_gestor from public.gestores order by email limit 1;
  select nome into v_cs from public.cs_config order by nome limit 1;
  insert into public.metas_semanais_fechamento (cs_nome, indicador, mes, semana_inicio, base, deficit_recebido, meta_efetiva, realizado, sem_data, retroativo)
    values (v_cs, 'cases', '2026-10-01', '2026-10-05', 5, 0, 5, 3, 0, false);
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- 1. Semana fechada: salvar é recusado.
  begin
    perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-10-01', date '2026-10-05', 9);
    raise exception 'FALHA: semana fechada aceitou salvar';
  exception when sqlstate '22023' then raise notice 'OK salvar recusado em semana fechada'; end;
  -- 2. Semana fechada: remover é recusado.
  begin
    perform public.remover_meta_semanal(v_cs, 'cases', date '2026-10-01', date '2026-10-05');
    raise exception 'FALHA: semana fechada aceitou remover';
  exception when sqlstate '22023' then raise notice 'OK remover recusado em semana fechada'; end;
  -- 3. Semana aberta do mesmo CS e mês: continua aceitando.
  perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-10-01', date '2026-10-12', 7);
  raise notice 'OK semana aberta aceita salvar';
  perform public.remover_meta_semanal(v_cs, 'cases', date '2026-10-01', date '2026-10-12');
  raise notice 'OK semana aberta aceita remover';
  reset role;
end $t$;

rollback;
