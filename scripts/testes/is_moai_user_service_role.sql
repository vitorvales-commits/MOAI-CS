-- Teste da migração 20261105f (is_moai_user aceita service role). Roda em transação e desfaz no final.
-- Espera: todas as notices 'OK'. Qualquer falha aborta a transação.
begin;

-- 1. Service role passa em is_moai_user.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $t$ begin
  assert public.is_moai_user(), 'service_role deveria passar em is_moai_user';
  raise notice 'OK is_moai_user aceita service_role';
end $t$;

-- 2. is_gestor continua falso para o service role (o JWT não tem e-mail).
do $t$ begin
  assert not coalesce(public.is_gestor(), false), 'service_role não pode ser gestor';
  raise notice 'OK is_gestor falso para service_role';
end $t$;

-- 3. reports_resumo_cs, a única RPC do caminho do fechamento, roda para o service role e devolve linhas.
--    criticos_total e base_total saem mascarados (nulos), porque is_gestor e meu_cs são falsos.
do $t$ declare v_linhas integer; v_criticos integer; begin
  select count(*), count(criticos_total) into v_linhas, v_criticos from public.reports_resumo_cs();
  assert v_criticos = 0, 'criticos_total deveria sair mascarado para o service role';
  raise notice 'OK reports_resumo_cs roda com service role (% linhas, campos mascarados)', v_linhas;
end $t$;

-- 4. Funções de gestor continuam negando o service role.
do $t$ begin
  begin
    perform public.salvar_meta_semanal('qualquer', 'cases', date '2026-11-01', date '2026-11-02', 1);
    raise exception 'FALHA: service role conseguiu salvar meta semanal como gestor';
  exception when insufficient_privilege then
    raise notice 'OK função de gestor nega service_role';
  end;
end $t$;

-- 5. Leitura das tabelas do caminho do fechamento segue funcionando para o service role.
do $t$ declare v integer; begin
  select count(*) into v from public.cs_config;
  assert v > 0, 'cs_config deveria ter linhas';
  select count(*) into v from public.cases_items;
  raise notice 'OK tabelas do fechamento legíveis pelo service role (cs_config: %)', v;
end $t$;

reset role;
rollback;
