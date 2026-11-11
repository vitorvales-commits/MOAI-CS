-- Teste reversível do PR 2 do Vitorio registro (11/11/2026). Roda na cópia descartável, depois de
-- supabase/migrations/20261111b_vitorio_registro_dados.sql aplicada. Termina com erro proposital: a mensagem
-- TESTE_VITORIO_REGISTRO_OK significa que as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).

do $teste$
declare
  v_cs bigint;
  v_n integer;
  v_empresa text;
  v_origem text;
  v_chaves text;
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

  -- 4a. Uma entrada por pessoa e conselho principal: nenhuma chave repetida no mesmo conselho.
  select count(*) into v_n from (
    select nome_normalizado, group_id from public.vitorio_dicionario_membros group by 1, 2 having count(*) > 1
  ) z;
  if v_n > 0 then raise exception 'FALHA 4a: % chaves repetidas no mesmo conselho', v_n; end if;

  -- 4b. Toda pessoa que aparece em linha de dupla tem entrada. Mesma regra de corte da view: "(copy)" fora,
  -- " - " termina o nome, "(" termina a chave, " + " separa pessoas.
  select count(*) into v_n from (
    select canonico.normalizar(nullif(btrim(split_part(p.t, '(', 1)), '')) as chave
    from public.conselhos_membros m
    cross join lateral regexp_split_to_table(
      regexp_replace(
        case when position('|' in regexp_replace(replace(m.nome, chr(160), ' '), '\s*\(copy\)\s*$', '')) > 0
             then split_part(regexp_replace(replace(m.nome, chr(160), ' '), '\s*\(copy\)\s*$', ''), '|', 1)
             else regexp_replace(replace(m.nome, chr(160), ' '), '\s*\(copy\)\s*$', '') end,
        '\s+-\s+.*$', ''),
      '\s*\+\s*') as p(t)
    where m.nome like '%+%' and m.nome not ilike '%convidado%' and nullif(btrim(split_part(p.t, '(', 1)), '') is not null
  ) pessoas
  where not exists (select 1 from public.vitorio_dicionario_membros v where v.nome_normalizado = pessoas.chave);
  if v_n > 0 then raise exception 'FALHA 4b: % pessoas de dupla sem entrada', v_n; end if;

  -- 4c. Empresa vinda do próprio membro. Medição com esta regra: 459 entradas. A contagem é por entrada (uma
  -- por pessoa), não por linha de membro (572 linhas com "|"). Piso de regressão.
  select count(*) into v_n from public.vitorio_dicionario_membros where empresa_origem = 'membro';
  if v_n < 459 then raise exception 'FALHA 4c: empresa vinda do membro em só % entradas', v_n; end if;

  -- 4d. Nenhuma entrada cujo conselho principal seja reserva ou duplicado quando a pessoa tem grupo principal.
  select count(*) into v_n
  from public.vitorio_dicionario_membros v
  join public.conselhos_grupos g on g.group_id = v.group_id
  where (g.is_repo is true or g.group_id like 'duplicate_of%')
    and exists (
      select 1 from public.vitorio_dicionario_membros v2
      join public.conselhos_grupos g2 on g2.group_id = v2.group_id
      where v2.nome_normalizado = v.nome_normalizado
        and g2.is_repo is not true and g2.group_id not like 'duplicate_of%'
    );
  if v_n > 0 then raise exception 'FALHA 4d: % entradas de reserva ou duplicado com grupo principal', v_n; end if;

  -- 5. Convidado fica no dicionário com tipo convidado e sem empresa.
  if exists (select 1 from public.vitorio_dicionario_membros where tipo = 'convidado' and empresa is not null) then
    raise exception 'FALHA 5: convidado com empresa';
  end if;

  -- 6. Chave limpa: nenhuma chave com " - " nem parênteses.
  select count(*), string_agg(nome_normalizado, ' | ') into v_n, v_chaves
  from public.vitorio_dicionario_membros
   where nome_normalizado like '%-%' or nome_normalizado like '%(%' or nome_normalizado like '%)%';
  if v_n > 0 then raise exception 'FALHA 6: % chaves com " - " ou parênteses: %', v_n, v_chaves; end if;

  -- 7. Jocivane Brito: "Jocivane Brito - Monumental Contabilidade" no board, empresa vinda do membro.
  select empresa, empresa_origem into v_empresa, v_origem
  from public.vitorio_dicionario_membros where nome_normalizado = 'jocivane brito' limit 1;
  if v_empresa is distinct from 'Monumental Contabilidade' or v_origem is distinct from 'membro' then
    raise exception 'FALHA 7: Jocivane Brito (%, %)', v_empresa, v_origem;
  end if;

  -- 8. Pedro Coelho: BMAI vem do nome do membro no board ("Pedro coelho | BMAI"), não só do histórico.
  if not exists (select 1 from public.conselhos_membros where nome ilike 'pedro coelho | bmai%') then
    raise exception 'FALHA 8: nome do membro Pedro Coelho no board sem BMAI';
  end if;
  select empresa, empresa_origem into v_empresa, v_origem
  from public.vitorio_dicionario_membros where nome_normalizado = 'pedro coelho' limit 1;
  if v_empresa is distinct from 'BMAI' or v_origem is distinct from 'membro' then
    raise exception 'FALHA 8: empresa do Pedro Coelho (%, %)', v_empresa, v_origem;
  end if;

  raise exception 'TESTE_VITORIO_REGISTRO_OK';
end
$teste$;
