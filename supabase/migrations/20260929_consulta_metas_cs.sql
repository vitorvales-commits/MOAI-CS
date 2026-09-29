-- Já aplicada em produção (moai-cs-dashboard) em 29/09/2026 via MCP. Versionar no repositório.
create or replace function public.mes_grupo_para_data(t text)
returns date language sql immutable as $$
  select case when idx is null then null
    else make_date(coalesce(nullif(substring(t from '(20[0-9]{2})'),'')::int, 2026), idx, 1) end
  from (
    select i as idx
    from generate_series(1,12) i
    where strpos(translate(lower(coalesce(t,'')),'ç','c'),
      (array['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[i]) > 0
    limit 1
  ) x
$$;

create or replace function public.metrica_canonica(t text)
returns text language sql immutable as $$
  select case
    when k like 'rounds%' then 'rounds'
    when k like 'upsell%' then 'upsell'
    when k like 'downsell%' then 'downsell'
    when k like 'cases%' then 'cases'
    when k like 'indica%' then 'indicacoes'
    when k like 'revenuechurn%' then 'revenue_churn'
    when k like 'matchmaking%' then 'matchmakings'
    when k like 'health%' then 'health_base'
    when k like 'churn%' then 'churn'
    when k like 'presen%' then 'presenca'
    when k like 'suspens%' then 'suspensoes'
    when k like 'critico%' then 'critico'
    else k end
  from (select lower(regexp_replace(coalesce(t,''),'[^[:alpha:]]','','g')) as k) s
$$;

create or replace function public.metas_cs_base(p_cs text default null, p_mes date default null)
returns table (
  cs text, mes date, metrica text, direcao text,
  meta numeric, alcancado_manual numeric, realizado_calculado numeric,
  realizado numeric, fonte text, status text, percentual numeric, divergencia boolean
)
language sql stable set search_path = public as $$
with alvo as (
  select date_trunc('month', coalesce(p_mes, current_date))::date as mes
),
m as (
  select s.nome as cs, s.nome_completo, s.monday_user_id,
         public.mes_grupo_para_data(ms.mes_grupo_titulo) as mes,
         public.metrica_canonica(ms.item_metrica) as metrica,
         max(ms.meta) as meta, max(ms.alcancado) as alcancado_manual
  from metas_subitens ms
  join cs_config s on lower(trim(s.nome)) = lower(trim(ms.cs_nome))
  where (p_cs is null or lower(s.nome) = lower(trim(p_cs)) or lower(s.nome_completo) like '%'||lower(trim(p_cs))||'%')
  group by 1,2,3,4,5
),
f as (select m.*, case when m.metrica in ('churn','revenue_churn','downsell','suspensoes','critico') then 'max' else 'min' end as direcao from m, alvo where m.mes = alvo.mes),
c as (
  select f.*,
    case f.metrica
      when 'cases' then (select count(*) from cases_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
      when 'matchmakings' then (select count(*) from matchmakings_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.creator_id=f.monday_user_id)
      when 'rounds' then (select count(*) from rounds_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.status='Realizado' and lower(x.cs_responsavel_raw) like '%'||lower(f.nome_completo)||'%')
      when 'churn' then (select count(*) from churn_items x where date_trunc('month',x.data)=f.mes and lower(trim(x.quem_e_seu_cs)) like lower(f.cs)||'%')
      when 'indicacoes' then (select coalesce(sum(x.indicacoes),0) from reports_semanais_items x where x.creator_id=f.monday_user_id and date_trunc('month',coalesce(x.data,x.created_at_monday::date))=f.mes)
      when 'upsell' then (select count(*) from upsell_downsell_items x where lower(x.tipo_troca) like 'upsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
      when 'downsell' then (select count(*) from upsell_downsell_items x where lower(x.tipo_troca) like 'downsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
      else null end as calc
  from f
)
select c.cs, c.mes, c.metrica, c.direcao, c.meta, c.alcancado_manual, c.calc::numeric,
  coalesce(c.calc::numeric, c.alcancado_manual, 0) as realizado,
  case when c.calc is not null then 'calculado' when c.alcancado_manual is not null then 'manual' else 'sem_dado' end as fonte,
  case
    when c.meta is null then 'sem_meta'
    when c.direcao='min' and coalesce(c.calc::numeric, c.alcancado_manual, 0) >= c.meta then 'bateu'
    when c.direcao='max' and coalesce(c.calc::numeric, c.alcancado_manual, 0) <= c.meta then 'bateu'
    else 'nao_bateu' end as status,
  case when c.meta is null or c.meta = 0 then null
    else round(100 * coalesce(c.calc::numeric, c.alcancado_manual, 0) / c.meta, 0) end as percentual,
  (c.calc is not null and c.alcancado_manual is not null and c.calc::numeric <> c.alcancado_manual) as divergencia
from c
order by c.cs, c.metrica
$$;

revoke all on function public.metas_cs_base(text,date) from public, anon, authenticated;
grant execute on function public.metas_cs_base(text,date) to service_role;

create or replace function public.consultar_metas_cs(p_cs text default null, p_mes date default null)
returns table (
  cs text, mes date, metrica text, direcao text,
  meta numeric, alcancado_manual numeric, realizado_calculado numeric,
  realizado numeric, fonte text, status text, percentual numeric, divergencia boolean
)
language plpgsql stable security definer set search_path = public as $$
declare v_cs text;
begin
  if not public.is_moai_user() then raise exception 'acesso negado'; end if;
  if public.is_gestor() then
    v_cs := p_cs;
  else
    v_cs := public.meu_cs();
    if v_cs is null then raise exception 'perfil sem vinculo de CS'; end if;
  end if;
  return query select * from public.metas_cs_base(v_cs, p_mes);
end $$;

revoke all on function public.consultar_metas_cs(text,date) from public, anon;
grant execute on function public.consultar_metas_cs(text,date) to authenticated;
