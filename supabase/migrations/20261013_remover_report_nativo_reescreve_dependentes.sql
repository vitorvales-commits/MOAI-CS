-- Reescreve as funções que dependem do report nativo antes de dropar as tabelas e colunas (migração seguinte).
-- Sem nativo, todo report vigente é de origem monday; corte de data deixa de existir.
create or replace function public.reports_vigentes()
returns setof public.reports_individuais
language sql
stable
set search_path to 'public'
as $$
  select r.* from public.reports_individuais r where r.origem = 'monday';
$$;

-- Mesma assinatura (com os mesmos padrões) e colunas. Críticos vêm só dos reports monday.
create or replace function public.health_base_area(p_de date default null, p_ate date default null)
returns table(criticos integer, base integer, cs_com_report integer, cs_so_importado integer)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with ultimos as (
    select distinct on (r.cs_nome) r.* from public.reports_vigentes() r
    join public.cs_config c on c.nome = r.cs_nome and c.ativo
    where (p_ate is null or r.semana_inicio <= p_ate) and (p_de is null or r.semana_inicio >= p_de)
    order by r.cs_nome, r.semana_inicio desc
  ),
  base as (select distinct e.membro_id from public.membros_elegiveis_rede() e where cardinality(e.cs_nomes) > 0)
  select
    coalesce((select sum(u.criticos_total) from ultimos u), 0)::int,
    (select count(*) from base)::int,
    (select count(*) from ultimos)::int,
    (select count(*) from ultimos)::int;
end;
$$;
