-- Teste reversível do Vitorio 2, PR A. Roda na cópia descartável, depois de
-- supabase/migrations/20261110c_vitorio_2.sql aplicada (workflow testar-migracao). Termina com erro proposital:
-- a mensagem TESTE_VITORIO2_OK significa que as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).

do $teste$
declare
  v_gestor text;
  v_id uuid;
  v_id2 uuid;
  v_id3 uuid;
  v_outro text;
  v_int text;
  v_ent text;
  v_n integer;
begin
  -- A cópia não traz o Auth: define-se auth.jwt() para ler as claims da sessão, como no Supabase.
  create or replace function auth.jwt() returns jsonb language sql stable as $f$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb
  $f$;
  -- verificar-restauracao.sh define auth.role() como nulo; is_moai_user() exige 'authenticated', então lê a claim.
  create or replace function auth.role() returns text language sql stable as $f$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  $f$;

  select g.email into v_gestor from public.gestores g order by g.email limit 1;
  if not found or v_gestor is null then raise exception 'FALHA preparo: sem gestor cadastrado'; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_gestor)::text, true);

  -- 1. O check aceita o resultado 'social' e grava intenção e entidades.
  begin
    insert into public.vitorio_consultas (perfil, consulta_normalizada, resultado, intencao, entidades)
    values ('gestor', 'teste social', 'social', 'teste_social', '{"cs": "x"}'::jsonb);
  exception when check_violation then
    raise exception 'FALHA 1: resultado social recusado pelo check';
  end;

  -- 2. O check recusa resultado fora da lista.
  begin
    insert into public.vitorio_consultas (perfil, consulta_normalizada, resultado)
    values ('cs', 'teste invalido', 'xyz');
    raise exception 'FALHA 2: resultado xyz aceito';
  exception when check_violation then
    null;
  end;

  -- 3. A função nova registra com intenção e entidades, e devolve o id.
  v_id := public.vitorio_registrar_consulta_v2('gestor', 'teste funcao', 'resposta', 'chave', false, 'teste_fn', '{"a": 1}'::jsonb);
  select c.intencao, c.entidades::text into v_int, v_ent from public.vitorio_consultas c where c.id = v_id;
  if not found then raise exception 'FALHA 3: função não gravou a consulta'; end if;
  if v_int is distinct from 'teste_fn' then raise exception 'FALHA 3: intenção gravada errada: %', v_int; end if;
  if v_ent is distinct from '{"a": 1}' then raise exception 'FALHA 3: entidades gravadas erradas: %', v_ent; end if;

  -- 3b. Repetição idêntica do mesmo usuário em até 10 segundos devolve o mesmo id e não gera linha nova.
  v_id := public.vitorio_registrar_consulta_v2('gestor', 'teste repeticao', 'nada', null, false, null, null);
  v_id2 := public.vitorio_registrar_consulta_v2('gestor', '  teste repeticao ', 'nada', null, false, null, null);
  if v_id2 is distinct from v_id then raise exception 'FALHA 3b: repetição gerou outro id'; end if;
  select count(*) into v_n from public.vitorio_consultas where consulta_normalizada = 'teste repeticao';
  if v_n <> 1 then raise exception 'FALHA 3b: repetição gerou % linhas', v_n; end if;

  -- 3c. A mesma pergunta de outro usuário gera outra linha.
  select g.email into v_outro from public.gestores g where g.email <> v_gestor order by g.email limit 1;
  if v_outro is null then
    select c.email into v_outro from canonico.cs c where c.email is not null and c.email <> v_gestor order by c.email limit 1;
  end if;
  if v_outro is null then raise exception 'FALHA preparo 3c: sem segundo usuário na cópia'; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_outro)::text, true);
  v_id3 := public.vitorio_registrar_consulta_v2('gestor', 'teste repeticao', 'nada', null, false, null, null);
  if v_id3 is not distinct from v_id then raise exception 'FALHA 3c: outro usuário reaproveitou a linha'; end if;
  select count(*) into v_n from public.vitorio_consultas where consulta_normalizada = 'teste repeticao';
  if v_n <> 2 then raise exception 'FALHA 3c: esperava 2 linhas, achou %', v_n; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_gestor)::text, true);

  -- 4. Entidades que não são objeto são recusadas com 22023.
  begin
    perform public.vitorio_registrar_consulta_v2('gestor', 'teste', 'nada', null, false, null, '[1]'::jsonb);
    raise exception 'FALHA 4: entidades que não são objeto foram aceitas';
  exception when sqlstate '22023' then
    null;
  end;

  -- 5. A função antiga continua recusando 'social' (não foi alterada) e a nova continua aceitando as três antigas.
  begin
    perform public.vitorio_registrar_consulta('gestor', 'teste antigo', 'social', null, false);
    raise exception 'FALHA 5: função antiga aceitou social';
  exception when sqlstate '22023' then
    null;
  end;
  v_id := public.vitorio_registrar_consulta_v2('cs', 'teste ambigua', 'ambigua', null, false, null, null);
  select count(*) into v_n from public.vitorio_consultas where id = v_id and intencao is null and entidades is null;
  if v_n <> 1 then raise exception 'FALHA 5: consulta sem intenção/entidades não gravada como nula'; end if;

  raise exception 'TESTE_VITORIO2_OK';
end;
$teste$;
