-- Teste das funções de meta semanal (migração 20261105c_metas_semanais).
-- Roda inteiro numa transação e desfaz no final. Não deixa linha nenhuma.
-- Espera: todas as notices 'OK'. Qualquer falha aborta a transação.
begin;

-- 1. Não gestor não escreve nem remove (SECURITY DEFINER com checagem de is_gestor).
do $t$ begin
  perform set_config('request.jwt.claims', '{"email":"nao.gestor.teste@teste.invalid","role":"authenticated"}', true);
  set local role authenticated;
  begin
    perform public.salvar_meta_semanal('qualquer', 'cases', date '2026-11-01', date '2026-11-02', 5);
    raise exception 'FALHA: não gestor conseguiu salvar';
  exception when insufficient_privilege then
    raise notice 'OK não gestor bloqueado ao salvar';
  end;
  begin
    perform public.remover_meta_semanal('qualquer', 'cases', date '2026-11-01', date '2026-11-02');
    raise exception 'FALHA: não gestor conseguiu remover';
  exception when insufficient_privilege then
    raise notice 'OK não gestor bloqueado ao remover';
  end;
  reset role;
end $t$;

-- 2. Gestor real (primeiro e-mail da tabela gestores): validações, gravação e remoção.
-- As leituras de gestores e cs_config são feitas como postgres; as chamadas, como authenticated.
do $t$ declare v_gestor text; v_cs text; v_valor numeric; v_existe boolean; begin
  select email into v_gestor from public.gestores order by email limit 1;
  select nome into v_cs from public.cs_config order by nome limit 1;
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.salvar_meta_semanal(v_cs, 'churn', date '2026-11-01', date '2026-11-02', 1);
    raise exception 'FALHA: churn aceito como meta semanal';
  exception when sqlstate '22023' then raise notice 'OK churn fora do P4 recusado'; end;

  begin
    perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-11-03', 1);
    raise exception 'FALHA: semana que não começa na segunda aceita';
  exception when sqlstate '22023' then raise notice 'OK semana fora de segunda recusada'; end;

  begin
    perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-11-02', -2);
    raise exception 'FALHA: valor negativo aceito';
  exception when sqlstate '22023' then raise notice 'OK valor negativo recusado'; end;

  -- Semana de janeiro com mês de novembro: não tem parcela em novembro, precisa ser recusada.
  begin
    perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-01-05', 1);
    raise exception 'FALHA: semana de janeiro aceita como parcela de novembro';
  exception when sqlstate '22023' then raise notice 'OK semana sem parcela no mês recusada'; end;

  -- Nome em minúsculas: grava o nome canônico de cs_config (semana 09/11, usada só nesta checagem).
  perform public.salvar_meta_semanal(lower(v_cs), 'cases', date '2026-11-01', date '2026-11-09', 4);

  perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-11-02', 6);
  perform public.salvar_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-11-02', 7);
  reset role;

  select valor into v_valor from public.metas_semanais_override
   where cs_nome = v_cs and indicador = 'cases' and mes = date '2026-11-01' and semana_inicio = date '2026-11-02';
  assert v_valor = 7, 'upsert deveria sobrescrever o valor (obtido: ' || coalesce(v_valor::text, 'nulo') || ')';
  raise notice 'OK salvar e sobrescrever';

  set local role authenticated;
  perform public.remover_meta_semanal(v_cs, 'cases', date '2026-11-01', date '2026-11-02');
  reset role;

  select exists (select 1 from public.metas_semanais_override
     where cs_nome = v_cs and indicador = 'cases' and semana_inicio = date '2026-11-02') into v_existe;
  assert not v_existe, 'remover deveria apagar a linha';
  raise notice 'OK remover';
end $t$;

-- 3. Nome canônico: a linha da semana 09/11 foi gravada com o nome de cs_config, e só uma.
do $t$ declare v_nome text; v_qtd integer; begin
  select nome into v_nome from public.cs_config order by nome limit 1;
  select count(*) into v_qtd from public.metas_semanais_override
   where lower(cs_nome) = lower(v_nome) and semana_inicio = date '2026-11-09';
  assert v_qtd = 1, 'deveria haver uma linha só (obtido ' || v_qtd || ')';
  assert (select cs_nome from public.metas_semanais_override
           where lower(cs_nome) = lower(v_nome) and semana_inicio = date '2026-11-09') = v_nome,
    'cs_nome deveria ser o canônico de cs_config';
  raise notice 'OK nome canônico gravado, uma linha só';
end $t$;

rollback;
