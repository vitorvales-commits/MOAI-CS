-- ============================================================================
-- Vitorio registro, PR 1 (11/11/2026): atribuição do matchmaking pela coluna "CS do dash".
--
-- Aditivo. A coluna cs_dash_texto recebe o texto da coluna "CS do dash" do board de Matchmakings
-- (sincronizada pela sync-monday numa etapa seguinte). Enquanto a coluna estiver vazia, a view
-- canonico.v_matchmakings resolve exatamente como antes, pelo creator_id. Quando preenchida, o CS
-- é resolvido pelo texto (canonico.resolver_cs). Nenhuma tabela nova: não entra em catalogo_tabelas.
-- ============================================================================

alter table public.matchmakings_items add column if not exists cs_dash_texto text;
alter table public.matchmakings_items add column if not exists cs_monday_user_id bigint;

-- Regra única da atribuição do CS de um matchmaking: "CS do dash" preenchida vence (resolvida pelo nome canônico);
-- vazia usa o creator_id. Quem consome lê cs_monday_user_id, preenchida pelo trigger abaixo; ninguém repete a regra.
create or replace function canonico.cs_monday_do_matchmaking(p_texto text, p_creator_id bigint) returns bigint
language sql stable set search_path = '' as $fn$
  select case when nullif(btrim(p_texto), '') is not null
              then (select c.monday_user_id from canonico.cs c where c.id = canonico.resolver_cs(p_texto))
              else p_creator_id end;
$fn$;
revoke all on function canonico.cs_monday_do_matchmaking(text, bigint) from public, anon, authenticated;

create or replace function public.matchmakings_atribuir_cs() returns trigger
language plpgsql set search_path = '' as $fn$
begin
  new.cs_monday_user_id := canonico.cs_monday_do_matchmaking(new.cs_dash_texto, new.creator_id);
  return new;
end
$fn$;
revoke all on function public.matchmakings_atribuir_cs() from public, anon, authenticated;

drop trigger if exists matchmakings_atribuir_cs on public.matchmakings_items;
create trigger matchmakings_atribuir_cs before insert or update on public.matchmakings_items
  for each row execute function public.matchmakings_atribuir_cs();

-- Preenche cs_monday_user_id das linhas que já existem (o trigger recalcula cada uma).
update public.matchmakings_items set cs_monday_user_id = cs_monday_user_id;

create or replace view canonico.v_matchmakings with (security_invoker = true) as
select m.id as chave,
       coalesce(nullif(btrim(m.cs_dash_texto), ''), m.creator_id::text) as cs_texto_original,
       coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.cs_monday_user_id), '{}'::bigint[]) as cs_ids,
       case
         when nullif(btrim(m.cs_dash_texto), '') is not null then
           case when m.cs_monday_user_id is not null then 'cs' else 'pendente' end
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
  ('18409198202', 'name', 'text', 'Nome do item', 'cs', true),
  ('18409198202', 'long_textuevre4t8', 'long_text', 'Motivo',    'cs', true),
  ('18409198202', 'single_selectyleiwd8', 'status', 'Categoria', 'cs', true),
  ('18409198202', 'single_selecto6mf971', 'status', 'Origem',    'cs', true),
  ('18409198202', 'long_texto8zt8o1n', 'long_text', 'Resultado', 'cs', true),
  ('18409198202', 'date_mm4e7y75', 'date', 'Data',               'cs', true),
  ('18409198202', 'text_mm90ny4r', 'text', 'CS do dash',         'cs', true)
on conflict (board_id, coluna_id) do nothing;

select seguranca.aplicar_protecoes();
