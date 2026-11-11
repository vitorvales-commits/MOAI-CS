-- ============================================================================
-- Vitorio registro, PR 1 (11/11/2026): atribuição do matchmaking pela coluna "CS do dash".
--
-- Aditivo. A coluna cs_dash_texto recebe o texto da coluna "CS do dash" do board de Matchmakings
-- (sincronizada pela sync-monday numa etapa seguinte). Enquanto a coluna estiver vazia, a view
-- canonico.v_matchmakings resolve exatamente como antes, pelo creator_id. Quando preenchida, o CS
-- é resolvido pelo texto (canonico.resolver_cs). Nenhuma tabela nova: não entra em catalogo_tabelas.
-- ============================================================================

alter table public.matchmakings_items add column if not exists cs_dash_texto text;

create or replace view canonico.v_matchmakings with (security_invoker = true) as
select m.id as chave,
       coalesce(nullif(btrim(m.cs_dash_texto), ''), m.creator_id::text) as cs_texto_original,
       case
         when nullif(btrim(m.cs_dash_texto), '') is not null then
           coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.id = canonico.resolver_cs(m.cs_dash_texto)), '{}'::bigint[])
         else
           coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.creator_id), '{}'::bigint[])
       end as cs_ids,
       case
         when nullif(btrim(m.cs_dash_texto), '') is not null then
           case when canonico.resolver_cs(m.cs_dash_texto) is not null then 'cs' else 'pendente' end
         when m.creator_id is null then 'ignorar'
         when exists (select 1 from canonico.cs c where c.monday_user_id = m.creator_id) then 'cs'
         else coalesce((select a.classe from canonico.cs_apelidos a where a.texto_normalizado = m.creator_id::text), 'pendente')
       end as classe,
       m.data as data_referencia,
       canonico.mes_de_titulo(m.mes_grupo_titulo, coalesce(extract(year from m.synced_at)::int, extract(year from now())::int)) as mes
from public.matchmakings_items m;

-- Campos que o Vitorio poderá escrever no board de Matchmaking. A fila sincronia.comandos já está ligada em
-- produção (sincronia.configuracao 'fila_escrita_ativa' = true desde 09/11/2026): estes campos só passam a ser
-- escritos quando houver comandos para eles, e o fluxo do Vitorio que os cria é o PR 3. Nome do item não entra
-- aqui: é o nome do elemento, enviado em criar_item. "CS do dash" entra quando o id da coluna for cadastrado
-- (ver MATCHMAKINGS_CS_DASH_COL na sync).
insert into sincronia.campos_editaveis (board_id, coluna_id, tipo_coluna, rotulo, papel, ativo) values
  ('18409198202', 'long_textuevre4t8', 'long_text', 'Motivo',    'cs', true),
  ('18409198202', 'single_selectyleiwd8', 'status', 'Categoria', 'cs', true),
  ('18409198202', 'single_selecto6mf971', 'status', 'Origem',    'cs', true),
  ('18409198202', 'long_texto8zt8o1n', 'long_text', 'Resultado', 'cs', true),
  ('18409198202', 'date_mm4e7y75', 'date', 'Data',               'cs', true)
on conflict (board_id, coluna_id) do nothing;

select seguranca.aplicar_protecoes();
