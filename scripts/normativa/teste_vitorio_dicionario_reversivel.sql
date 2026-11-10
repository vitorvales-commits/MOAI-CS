-- Teste reversível de public.vitorio_dicionario (Vitorio 2). Roda na cópia descartável, depois de
-- supabase/migrations/20261110d_vitorio_dicionario.sql aplicada (workflow testar-migracao). Termina com erro
-- proposital: TESTE_VITORIO_DICIONARIO_OK significa que as verificações passaram e nada ficou aplicado.

do $teste$
declare
  v_gestor text;
  v jsonb;
  v_n integer;
  v_esp integer;
begin
  -- A cópia não traz o Auth: auth.jwt() e auth.role() leem as claims da sessão, como no Supabase.
  create or replace function auth.jwt() returns jsonb language sql stable as $f$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb
  $f$;
  create or replace function auth.role() returns text language sql stable as $f$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  $f$;

  select g.email into v_gestor from public.gestores g order by g.email limit 1;
  if not found or v_gestor is null then raise exception 'FALHA preparo: sem gestor cadastrado'; end if;

  -- 1. Usuário MOAI recebe o dicionário com exatamente as três listas.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_gestor)::text, true);
  v := public.vitorio_dicionario();
  select count(*) into v_n from jsonb_object_keys(v);
  if v_n <> 3 or not (v ? 'cs' and v ? 'apelidos' and v ? 'conselhos') then
    raise exception 'FALHA 1: chaves do dicionário inesperadas: %', v::text;
  end if;

  -- 2. CS ativos: mesma contagem de canonico.cs ativo, e nenhum e-mail no objeto.
  select count(*) into v_esp from canonico.cs c where c.ativo;
  select count(*) into v_n from jsonb_array_elements(v->'cs');
  if v_n <> v_esp then raise exception 'FALHA 2: CS esperados %, devolvidos %', v_esp, v_n; end if;
  select count(*) into v_n from jsonb_array_elements(v->'cs') e where e ? 'email' or e ? 'monday_user_id';
  if v_n <> 0 then raise exception 'FALHA 2: CS com campo fora da lista pública'; end if;

  -- 3. Apelidos: só os confirmados; classe diferente de 'cs' nunca vem com cs_id.
  select count(*) into v_esp from canonico.cs_apelidos a where a.confirmado;
  select count(*) into v_n from jsonb_array_elements(v->'apelidos');
  if v_n <> v_esp then raise exception 'FALHA 3: apelidos esperados %, devolvidos %', v_esp, v_n; end if;
  select count(*) into v_n from jsonb_array_elements(v->'apelidos') e
   where (e->>'classe') <> 'cs' and (e->>'cs_id') is not null;
  if v_n <> 0 then raise exception 'FALHA 3: apelido de área ou ignorar com vínculo a CS'; end if;

  -- 4. Vigências: uma linha por vigência (sem duplicar por causa do título do conselho), com fim nulo para aberta.
  select count(*) into v_esp from canonico.conselho_cs_vigencia;
  select count(*) into v_n from jsonb_array_elements(v->'conselhos');
  if v_n <> v_esp then raise exception 'FALHA 4: vigências esperadas %, devolvidas % (duplicação por título?)', v_esp, v_n; end if;
  select count(*) into v_n from jsonb_array_elements(v->'conselhos') e
   where (e ? 'inicio') is not true or (e ? 'fim') is not true or (e ? 'titulo') is not true;
  if v_n <> 0 then raise exception 'FALHA 4: vigência sem campos inicio, fim ou titulo'; end if;

  -- 5. Usuário autenticado sem domínio MOAI é recusado.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', 'externo@example.com')::text, true);
  begin
    perform public.vitorio_dicionario();
    raise exception 'FALHA 5: usuário fora do MOAI recebeu o dicionário';
  exception when sqlstate '42501' then
    null;
  end;

  -- 6. Anon não executa a função (grant revogado).
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  begin
    perform public.vitorio_dicionario();
    reset role;
    raise exception 'FALHA 6: anon executou vitorio_dicionario';
  exception when sqlstate '42501' then
    reset role;
  end;

  raise exception 'TESTE_VITORIO_DICIONARIO_OK';
end;
$teste$;
