-- ============================================================================
-- Normativa de dados, etapa 3 (complemento): autor de relatório que não é CS (01/11/2026)
--
-- Relatórios semanais e matchmakings: o autor é resolvido pelo monday_user_id em canonico.cs. Quando o
-- autor não é CS, a classe vem de canonico.cs_apelidos (área ou ignorar, por decisão do gestor).
-- Relatórios individuais (nova fonte): se o autor for CS, ele vale; senão o CS é resolvido pelo nome
-- do item (cs_nome_original). Nenhuma tabela é criada nem alterada; só as views mudam.
-- ============================================================================

create or replace view canonico.v_reports_semanais with (security_invoker = true) as
select r.id as chave,
       r.creator_id::text as cs_texto_original,
       coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = r.creator_id), '{}'::bigint[]) as cs_ids,
       case when r.creator_id is null then 'ignorar'
            when exists (select 1 from canonico.cs c where c.monday_user_id = r.creator_id) then 'cs'
            else coalesce((select a.classe from canonico.cs_apelidos a where a.texto_normalizado = r.creator_id::text), 'pendente')
       end as classe,
       r.data as data_referencia,
       null::date as mes
from public.reports_semanais_items r;

create or replace view canonico.v_matchmakings with (security_invoker = true) as
select m.id as chave,
       m.creator_id::text as cs_texto_original,
       coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.creator_id), '{}'::bigint[]) as cs_ids,
       case when m.creator_id is null then 'ignorar'
            when exists (select 1 from canonico.cs c where c.monday_user_id = m.creator_id) then 'cs'
            else coalesce((select a.classe from canonico.cs_apelidos a where a.texto_normalizado = m.creator_id::text), 'pendente')
       end as classe,
       m.data as data_referencia,
       canonico.mes_de_titulo(m.mes_grupo_titulo, coalesce(extract(year from m.synced_at)::int, extract(year from now())::int)) as mes
from public.matchmakings_items m;

create or replace view canonico.v_reports_individuais with (security_invoker = true) as
select r.id as chave,
       r.cs_nome_original as cs_texto_original,
       case
         when exists (select 1 from canonico.cs c where c.monday_user_id = r.autor_monday_id)
           then coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = r.autor_monday_id), '{}'::bigint[])
         when canonico.resolver_cs(r.cs_nome_original) is not null
           then array[canonico.resolver_cs(r.cs_nome_original)]
         else '{}'::bigint[]
       end as cs_ids,
       case
         when exists (select 1 from canonico.cs c where c.monday_user_id = r.autor_monday_id) then 'cs'
         when canonico.resolver_cs(r.cs_nome_original) is not null then 'cs'
         else canonico.classe_de(r.cs_nome_original)
       end as classe,
       r.data_report as data_referencia,
       null::date as mes
from public.reports_individuais r;

create or replace view canonico.v_cobertura with (security_invoker = true) as
with fontes as (
  select 'churn_items' as fonte, v.classe from canonico.v_churn v
  union all select 'cases_items', v.classe from canonico.v_cases v
  union all select 'upsell_downsell_items', v.classe from canonico.v_upsell_downsell v
  union all select 'rounds_items', v.classe from canonico.v_rounds v
  union all select 'metas_subitens', v.classe from canonico.v_metas v
  union all select 'reports_semanais_items', v.classe from canonico.v_reports_semanais v
  union all select 'reports_individuais', v.classe from canonico.v_reports_individuais v
  union all select 'matchmakings_items', v.classe from canonico.v_matchmakings v
  union all select 'historico_conselhos_items', v.classe from canonico.v_historico_gtd v
)
select f.fonte,
       count(*) as total,
       count(*) filter (where f.classe = 'cs') as cs,
       count(*) filter (where f.classe = 'area') as area,
       count(*) filter (where f.classe = 'ignorar') as ignorar,
       count(*) filter (where f.classe = 'pendente') as pendente,
       case when count(*) = 0 then 100::numeric
            else round(100.0 * count(*) filter (where f.classe <> 'pendente') / count(*), 2) end as pct_resolvido
from fontes f
group by f.fonte;
