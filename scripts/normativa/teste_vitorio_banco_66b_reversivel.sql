-- Teste reversível do PR 66b (12/11/2026). Roda na cópia descartável, depois de
-- supabase/migrations/20261112b_matchmakings_cs_funcoes.sql aplicada. Termina com erro proposital: a mensagem
-- TESTE_VITORIO_BANCO_66B_OK significa que as verificações passaram e que nada ficou aplicado.
--
-- O que prova: com "CS do dash" = Luana numa linha cuja conta é do Vitor, as três funções creditam a Luana e
-- não o Vitor (metas_cs_base, indicador_pontos, historico_indicador). A igualdade com a saída de antes da
-- migração é conferida em produção, com o snapshot gravado antes da aplicação (não cabe aqui, porque a cópia
-- já recebe a migração).

do $teste$
declare
  v_vitor bigint;
  v_luana bigint;
  v_cs_monday bigint;
  ip_l_antes numeric; ip_v_antes numeric; ip_l_depois numeric; ip_v_depois numeric;
  hi_l_antes numeric; hi_v_antes numeric; hi_l_depois numeric; hi_v_depois numeric;
  hr_l_antes numeric; hr_v_antes numeric; hr_l_depois numeric; hr_v_depois numeric;
  mc_l_antes numeric; mc_v_antes numeric; mc_l_depois numeric; mc_v_depois numeric;
  n_linhas_metas int;
begin
  select c.monday_user_id into v_vitor from public.cs_config c where c.nome = 'Vitor';
  select c.monday_user_id into v_luana from public.cs_config c where c.nome = 'Luana';
  if v_vitor is null or v_luana is null then raise exception 'FALHA preparo: Vitor ou Luana sem monday_user_id'; end if;

  select count(*) into n_linhas_metas from public.metas_cs_base('Luana', date '2026-11-01') where metrica = 'matchmakings';
  if n_linhas_metas = 0 then raise exception 'FALHA preparo: Luana sem linha de matchmakings em metas_cs_base para nov/2026'; end if;

  -- Antes da linha de teste.
  select count(*) into ip_l_antes from public.indicador_pontos('matchmakings', 'Luana');
  select count(*) into ip_v_antes from public.indicador_pontos('matchmakings', 'Vitor');
  select coalesce(sum(realizado), 0) into hi_l_antes from public.historico_indicador('matchmakings', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hi_v_antes from public.historico_indicador('matchmakings', 'cs', 'Vitor');
  select coalesce(sum(realizado), 0) into hr_l_antes from public.historico_indicador('matchmakings_resultado', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hr_v_antes from public.historico_indicador('matchmakings_resultado', 'cs', 'Vitor');
  select coalesce(sum(realizado_calculado), 0) into mc_l_antes from public.metas_cs_base('Luana', date '2026-11-01') where metrica = 'matchmakings';
  select coalesce(sum(realizado_calculado), 0) into mc_v_antes from public.metas_cs_base('Vitor', date '2026-11-01') where metrica = 'matchmakings';

  -- Linha de teste: conta do Vitor (creator_id), CS do dash = Luana, com resultado registrado em novembro.
  insert into public.matchmakings_items (id, board_group_id, mes_grupo_titulo, nome, creator_id, data, cs_dash_texto, resultado, resultado_registrado_em)
  values (9999000002, 'teste', 'Novembro 2026', 'teste banco 66b', v_vitor, date '2026-11-05', 'Luana', 'teste', timestamptz '2026-11-06 12:00:00+00');

  select cs_monday_user_id into v_cs_monday from public.matchmakings_items where id = 9999000002;
  if v_cs_monday is distinct from v_luana then
    raise exception 'FALHA 0: cs_monday_user_id deveria ser o da Luana (%), foi %', v_luana, v_cs_monday;
  end if;

  -- Depois da linha de teste: a Luana sobe, o Vitor não sobe.
  select count(*) into ip_l_depois from public.indicador_pontos('matchmakings', 'Luana');
  select count(*) into ip_v_depois from public.indicador_pontos('matchmakings', 'Vitor');
  select coalesce(sum(realizado), 0) into hi_l_depois from public.historico_indicador('matchmakings', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hi_v_depois from public.historico_indicador('matchmakings', 'cs', 'Vitor');
  select coalesce(sum(realizado), 0) into hr_l_depois from public.historico_indicador('matchmakings_resultado', 'cs', 'Luana');
  select coalesce(sum(realizado), 0) into hr_v_depois from public.historico_indicador('matchmakings_resultado', 'cs', 'Vitor');
  select coalesce(sum(realizado_calculado), 0) into mc_l_depois from public.metas_cs_base('Luana', date '2026-11-01') where metrica = 'matchmakings';
  select coalesce(sum(realizado_calculado), 0) into mc_v_depois from public.metas_cs_base('Vitor', date '2026-11-01') where metrica = 'matchmakings';

  if ip_l_depois - ip_l_antes <> 1 or ip_v_depois - ip_v_antes <> 0 then
    raise exception 'FALHA 1: indicador_pontos deveria creditar a Luana (+1) e não o Vitor (+0): Luana %, Vitor %', ip_l_depois - ip_l_antes, ip_v_depois - ip_v_antes;
  end if;
  if hi_l_depois - hi_l_antes <> 1 or hi_v_depois - hi_v_antes <> 0 then
    raise exception 'FALHA 2: historico_indicador(matchmakings) deveria creditar a Luana (+1) e não o Vitor (+0): Luana %, Vitor %', hi_l_depois - hi_l_antes, hi_v_depois - hi_v_antes;
  end if;
  if hr_l_depois - hr_l_antes <> 1 or hr_v_depois - hr_v_antes <> 0 then
    raise exception 'FALHA 3: historico_indicador(matchmakings_resultado) deveria creditar a Luana (+1) e não o Vitor (+0): Luana %, Vitor %', hr_l_depois - hr_l_antes, hr_v_depois - hr_v_antes;
  end if;
  if mc_l_depois - mc_l_antes <> 1 or mc_v_depois - mc_v_antes <> 0 then
    raise exception 'FALHA 4: metas_cs_base deveria creditar a Luana (+1) e não o Vitor (+0): Luana %, Vitor %', mc_l_depois - mc_l_antes, mc_v_depois - mc_v_antes;
  end if;

  raise exception 'TESTE_VITORIO_BANCO_66B_OK';
end
$teste$;
