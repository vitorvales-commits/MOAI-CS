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

  -- 2. Lista cs: todos os CS de canonico.cs (ativos e inativos), com o campo ativo; nenhum e-mail nem id de Monday.
  select count(*) into v_esp from canonico.cs c;
  select count(*) into v_n from jsonb_array_elements(v->'cs');
  if v_n <> v_esp then raise exception 'FALHA 2: CS esperados %, devolvidos %', v_esp, v_n; end if;
  select count(*) into v_n from jsonb_array_elements(v->'cs') e where e ? 'email' or e ? 'monday_user_id';
  if v_n <> 0 then raise exception 'FALHA 2: CS com campo fora da lista pública'; end if;
  select count(*) into v_n from jsonb_array_elements(v->'cs') e where not (e ? 'ativo') or jsonb_typeof(e->'ativo') <> 'boolean';
  if v_n <> 0 then raise exception 'FALHA 2: CS sem campo ativo booleano'; end if;

  -- 2b. Um CS inativo aparece com ativo false (a cópia tem ex CS; sem nenhum, o teste não prova nada).
  select count(*) into v_n from jsonb_array_elements(v->'cs') e where (e->>'ativo')::boolean is false;
  if v_n = 0 then raise exception 'FALHA 2b: a cópia não tem CS inativo para verificar'; end if;

  -- 2c. Toda cs_id de conselhos e de apelidos de classe cs existe na lista cs.
  select count(*) into v_n from jsonb_array_elements(v->'conselhos') e
   where (e->>'cs_id') is not null
     and not exists (select 1 from jsonb_array_elements(v->'cs') c where (c->>'id')::bigint = (e->>'cs_id')::bigint);
  if v_n <> 0 then raise exception 'FALHA 2c: % vigência(s) com cs_id ausente da lista cs', v_n; end if;
  select count(*) into v_n from jsonb_array_elements(v->'apelidos') e
   where (e->>'classe') = 'cs'
     and not exists (select 1 from jsonb_array_elements(v->'cs') c where (c->>'id')::bigint = (e->>'cs_id')::bigint);
  if v_n <> 0 then raise exception 'FALHA 2c: % apelido(s) de classe cs com cs_id ausente da lista cs', v_n; end if;

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
