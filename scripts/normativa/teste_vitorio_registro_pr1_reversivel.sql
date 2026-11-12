-- Teste reversível do PR 1 do Vitorio registro (11/11/2026). Roda na cópia descartável, depois de
-- supabase/migrations/20261111a_matchmakings_cs_dash.sql aplicada. Termina com erro proposital: a mensagem
-- TESTE_VITORIO_REGISTRO_OK significa que as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).

do $teste$
declare
  v_total bigint;
  v_div bigint;
  v_id bigint;
  v_luana bigint;
  v_luana_monday bigint;
  v_classe text;
  v_cs_ids bigint[];
  v_cs_ids_antes bigint[];
begin
  -- 0. Equivalência com a coluna vazia em todos os itens: a view nova resolve igual à regra do creator_id.
  -- Mesma consulta de scripts/normativa/equivalencia_cs_dash_matchmakings.sql.
  with nova as (
    select m.id as chave,
           case
             when m.creator_id is null then 'ignorar'
             when exists (select 1 from canonico.cs c where c.monday_user_id = m.creator_id) then 'cs'
             else coalesce((select a.classe from canonico.cs_apelidos a where a.texto_normalizado = m.creator_id::text), 'pendente')
           end as classe,
           coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.creator_id), '{}'::bigint[]) as cs_ids
    from public.matchmakings_items m
  )
  select count(*), count(*) filter (where v.classe is distinct from n.classe or v.cs_ids is distinct from n.cs_ids)
    into v_total, v_div
  from canonico.v_matchmakings v join nova n on n.chave = v.chave;
  if v_total = 0 then raise exception 'FALHA 0: equivalência sem nenhum item'; end if;
  if v_div <> 0 then raise exception 'FALHA 0: % divergência(s) de % item(ns) com coluna vazia', v_div, v_total; end if;

  select cs_id into v_luana from canonico.cs_apelidos where texto_normalizado = 'luana' and classe = 'cs';
  if v_luana is null then raise exception 'FALHA preparo: apelido luana não é CS'; end if;
  select c.monday_user_id into v_luana_monday from canonico.cs c where c.id = v_luana;

  -- Matchmaking cujo creator_id é de OUTRO CS (ou não é CS), para o caso 2 não ser vazio.
  select m.id into v_id from public.matchmakings_items m
  where m.creator_id is not null and m.creator_id is distinct from v_luana_monday
  order by m.id limit 1;
  if v_id is null then raise exception 'FALHA preparo: sem matchmaking com creator_id diferente da Luana'; end if;

  -- 1. Coluna vazia: resolve igual ao creator_id (mesma regra de antes).
  update public.matchmakings_items set cs_dash_texto = null where id = v_id;
  select classe, cs_ids into v_classe, v_cs_ids from canonico.v_matchmakings where chave = v_id;
  if v_classe is null then raise exception 'FALHA 1: item sem linha na view'; end if;
  v_cs_ids_antes := v_cs_ids;

  -- 2. Coluna preenchida com CS conhecido: prevalece sobre o creator_id.
  update public.matchmakings_items set cs_dash_texto = 'Luana' where id = v_id;
  select classe, cs_ids into v_classe, v_cs_ids from canonico.v_matchmakings where chave = v_id;
  if v_cs_ids_antes = array[v_luana] then raise exception 'FALHA preparo: creator_id já resolve para a Luana, caso não prova nada'; end if;
  if v_classe <> 'cs' or v_cs_ids <> array[v_luana] then
    raise exception 'FALHA 2: coluna CS do dash com CS conhecido deveria vencer o creator_id (classe %, ids %)', v_classe, v_cs_ids;
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
