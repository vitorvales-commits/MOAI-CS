-- Indicador de críticos da home (visão geral): críticos informados dos CS com report válido sobre o total
-- de membros da rede (todas as carteiras de CS ativos). Antes o denominador era só a base dos CS com
-- report válido; agora é o total de membros, como pedido pelo Vitor em 13/10/2026.
create or replace function public.health_base_area(p_de date default null, p_ate date default null)
returns table(criticos integer, base integer, cs_com_report integer, cs_so_importado integer)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with ultimos as (
    select distinct on (v.cs_nome) v.cs_nome, v.semana_inicio, v.criticos_total,
           coalesce(v.data_report, (v.criado_em at time zone 'America/Sao_Paulo')::date) as data_ef
      from public.reports_vigentes() v
      join public.cs_config c on c.nome = v.cs_nome and c.ativo
     where (p_ate is null or v.semana_inicio <= p_ate) and (p_de is null or v.semana_inicio >= p_de)
     order by v.cs_nome, v.semana_inicio desc
  ),
  validos as (select u.* from ultimos u where u.data_ef >= v_hoje - 14 and u.criticos_total is not null),
  base as (
    select distinct e.membro_id from public.membros_elegiveis_rede() e
     where cardinality(e.cs_nomes) > 0
  )
  select
    coalesce((select sum(v.criticos_total) from validos v), 0)::int,
    (select count(*) from base)::int,
    (select count(*) from validos)::int,
    0;
end;
$$;
