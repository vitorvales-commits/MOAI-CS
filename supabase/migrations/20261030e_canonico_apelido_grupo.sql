-- ============================================================================
-- Normativa de dados, etapa 3 (complemento): CS do conselho pela mesma regra do dash (01/11/2026)
--
-- O CS de um grupo é o apelido entre parênteses no fim do segundo bloco do título, depois de remover o
-- marcador de congelado. É a regra de parseGrupoAtivo em supabase/functions/sync-monday/parse-grupo.ts,
-- e um teste de equivalência confere as duas para todos os títulos de conselhos_grupos. Antes, a camada
-- lia o último parêntese do título inteiro, o que daria nulo para "Executivo | João Vitor (Mateus) | EXTERNO".
-- Nenhuma tabela é criada nem alterada; só funções.
-- ============================================================================

create or replace function canonico.apelido_do_titulo(p_titulo text) returns text
language sql immutable set search_path = '' as $fn$
  with s as (
    select regexp_replace(coalesce(p_titulo, ''), '\[?congelado\]?', '', 'i') as t
  ),
  b as (
    select btrim(split_part(s.t, '|', 2)) as bloco from s where position('|' in s.t) > 0
  )
  select nullif(btrim(substring(b.bloco from '\(([^)]*)\)\s*$')), '')
  from b
  where btrim(regexp_replace(b.bloco, '\s*\([^)]*\)\s*$', '')) <> '';
$fn$;

create or replace function canonico.cs_do_titulo(p_titulo text) returns bigint
language sql stable set search_path = '' as $fn$
  select canonico.resolver_cs(canonico.apelido_do_titulo(p_titulo));
$fn$;
