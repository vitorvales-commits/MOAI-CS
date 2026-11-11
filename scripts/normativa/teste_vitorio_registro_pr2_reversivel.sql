-- Teste reversível do PR 2 do Vitorio registro (11/11/2026). Roda na cópia descartável, depois de
-- supabase/migrations/20261111b_vitorio_registro_dados.sql aplicada. Termina com erro proposital: a mensagem
-- TESTE_VITORIO_REGISTRO_OK significa que as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).

do $teste$
declare
  v_cs bigint;
  v_n integer;
  v_empresa text;
  v_ocorr integer;
begin
  -- 1. Tabelas novas com RLS ligada e sem acesso direto para anon e authenticated.
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relname = 'vitorio_entradas' and c.relrowsecurity) then
    raise exception 'FALHA 1: RLS desligada em vitorio_entradas';
  end if;
  if has_table_privilege('authenticated', 'public.vitorio_entradas', 'select')
     or has_table_privilege('anon', 'public.vitorio_entradas', 'select') then
    raise exception 'FALHA 1: vitorio_entradas com select direto para anon ou authenticated';
  end if;

  -- 2. Check de situacao aceita os cinco estados e recusa outro valor.
  select cs.id into v_cs from canonico.cs cs order by cs.id limit 1;
  if v_cs is null then raise exception 'FALHA preparo: sem CS em canonico.cs'; end if;
  begin
    insert into public.vitorio_entradas (cs_id, chave_usuario, texto_original, tipo, proposta, situacao)
    values (v_cs, 'teste', 'mm teste', 'registrar_matchmaking', '{}'::jsonb, 'situacao_invalida');
    raise exception 'FALHA 2: situacao inválida aceita';
  exception when check_violation then null;
  end;

  -- 3. Sinônimos: "conselhos" aponta para o valor canônico do board e a origem tem a lista fechada.
  select count(*) into v_n from public.vitorio_sinonimos
   where campo = 'origem' and valor_canonico in ('Conselho', 'Evento', 'CS', 'Outros');
  if v_n < 4 then raise exception 'FALHA 3: sinônimos de origem incompletos (%)', v_n; end if;
  if not exists (select 1 from public.vitorio_sinonimos where campo = 'origem' and sinonimo = 'conselhos' and valor_canonico = 'Conselho') then
    raise exception 'FALHA 3: "conselhos" não aponta para Conselho';
  end if;
  if exists (select 1 from public.vitorio_sinonimos where valor_canonico not in ('Negócio', 'Parceria', 'Conhecimento', 'Direcionamento', 'Round', 'Conselho', 'Evento', 'CS', 'Outros')) then
    raise exception 'FALHA 3: valor canônico fora da lista do board';
  end if;

  -- 4. Dicionário: toda linha traz conselho e a empresa, quando houver, tem ao menos uma ocorrência.
  select count(*) into v_n from public.vitorio_dicionario_membros;
  if v_n < 600 then raise exception 'FALHA 4: dicionário com menos linhas que membros (%)', v_n; end if;
  if exists (select 1 from public.vitorio_dicionario_membros where empresa is not null and empresa_ocorrencias < 1) then
    raise exception 'FALHA 4: empresa sem ocorrência';
  end if;

  -- 5. Empresa do BMAI para o Pedro Coelho: a mais frequente no histórico (20 ocorrências, a maior do banco).
  select empresa, empresa_ocorrencias into v_empresa, v_ocorr
    from public.vitorio_dicionario_membros where nome_normalizado = 'pedro coelho' limit 1;
  if v_empresa is distinct from 'BMAI' or v_ocorr < 20 then
    raise exception 'FALHA 5: empresa do Pedro Coelho (%, %)', v_empresa, v_ocorr;
  end if;

  raise exception 'TESTE_VITORIO_REGISTRO_OK';
end
$teste$;
