-- health_base_area passa a receber o início do período: o valor mensal do time usa só o último
-- report de cada CS DENTRO do mês (mesma regra do valor individual), nunca um report de mês
-- anterior. Sem p_de, continua pegando o mais recente até p_ate.
drop function if exists public.health_base_area(date);
create function public.health_base_area(p_de date default null, p_ate date default null)
returns table(criticos integer, base integer, cs_com_report integer, cs_so_importado integer)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with ultimos as (
    select distinct on (r.cs_nome) r.* from public.reports_vigentes() r
    join public.cs_config c on c.nome = r.cs_nome and c.ativo
    where (p_ate is null or r.semana_inicio <= p_ate) and (p_de is null or r.semana_inicio >= p_de)
    order by r.cs_nome, r.semana_inicio desc, (r.origem = 'nativo') desc
  ),
  base as (select distinct e.membro_id from public.membros_elegiveis_rede() e where cardinality(e.cs_nomes) > 0)
  select
    ((select count(distinct c.membro_id) from public.reports_individuais_criticos c
       join ultimos u on u.id = c.report_id and u.origem = 'nativo'
       where c.membro_id in (select b.membro_id from base b))
     + coalesce((select sum(u.criticos_total) from ultimos u where u.origem = 'monday'), 0))::int,
    (select count(*) from base)::int,
    (select count(*) from ultimos)::int,
    (select count(*) from ultimos u where u.origem = 'monday')::int;
end; $$;
revoke all on function public.health_base_area(date, date) from public, anon;
grant execute on function public.health_base_area(date, date) to authenticated;
