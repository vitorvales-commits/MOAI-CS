-- Teste reversível do PR 1 do Vitorio registro (11/11/2026). Roda na cópia descartável, depois de
-- supabase/migrations/20261111a_matchmakings_cs_dash.sql aplicada. Termina com erro proposital: a mensagem
-- TESTE_VITORIO_REGISTRO_OK significa que as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).

do $teste$
declare
  v_id bigint;
  v_luana bigint;
  v_classe text;
  v_cs_ids bigint[];
begin
  select m.id into v_id from public.matchmakings_items m where m.creator_id is not null order by m.id limit 1;
  if v_id is null then raise exception 'FALHA preparo: sem matchmaking com creator_id'; end if;

  -- 1. Coluna vazia: resolve igual ao creator_id (mesma regra de antes).
  update public.matchmakings_items set cs_dash_texto = null where id = v_id;
  select classe, cs_ids into v_classe, v_cs_ids from canonico.v_matchmakings where chave = v_id;
  if v_classe is null then raise exception 'FALHA 1: item sem linha na view'; end if;

  -- 2. Coluna preenchida com CS conhecido: prevalece sobre o creator_id.
  select cs_id into v_luana from canonico.cs_apelidos where texto_normalizado = 'luana' and classe = 'cs';
  if v_luana is null then raise exception 'FALHA preparo: apelido luana não é CS'; end if;
  update public.matchmakings_items set cs_dash_texto = 'Luana' where id = v_id;
  select classe, cs_ids into v_classe, v_cs_ids from canonico.v_matchmakings where chave = v_id;
  if v_classe <> 'cs' or v_cs_ids <> array[v_luana] then
    raise exception 'FALHA 2: coluna CS do dash com CS conhecido deveria resolver para a Luana (classe %, ids %)', v_classe, v_cs_ids;
  end if;

  -- 3. Coluna preenchida com texto que não é CS: vira pendente, sem cair no creator_id.
  update public.matchmakings_items set cs_dash_texto = 'nome_que_nao_existe_xyz' where id = v_id;
  select classe, cs_ids into v_classe, v_cs_ids from canonico.v_matchmakings where chave = v_id;
  if v_classe <> 'pendente' or v_cs_ids <> '{}'::bigint[] then
    raise exception 'FALHA 3: texto desconhecido deveria ser pendente (classe %, ids %)', v_classe, v_cs_ids;
  end if;

  -- 4. Espaços só: tratado como vazio, volta a valer o creator_id.
  update public.matchmakings_items set cs_dash_texto = '   ' where id = v_id;
  select classe into v_classe from canonico.v_matchmakings where chave = v_id;
  if v_classe = 'pendente' then raise exception 'FALHA 4: texto só com espaços não pode contar como preenchido'; end if;

  raise exception 'TESTE_VITORIO_REGISTRO_OK';
end
$teste$;
