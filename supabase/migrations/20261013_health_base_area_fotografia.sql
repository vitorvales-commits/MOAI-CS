-- Críticos e Health da Base da área (card da visão geral). Regras (decisões de 13/10/2026):
-- - Sem período: fotografia atual. Cada CS obrigado conta pelo último report válido (enviado nos últimos
--   14 dias), não importa em que semana o report começou. Ausência de report na semana corrente não derruba.
-- - Com período: série histórica e fechamento mensal. Filtra pela data de envio (America/Sao_Paulo),
--   nunca por semana_inicio.
-- - Numerador e denominador usam o mesmo conjunto de CS: ativos, obrigado_report e com report válido.
--   Denominador = membros distintos das carteiras desse conjunto.
-- - Novas colunas: cs_obrigados (quantos CS devem reportar) e cs_sem_report (quais ficaram de fora).
drop function if exists public.health_base_area(date, date);

create function public.health_base_area(p_de date default null, p_ate date default null)
returns table(criticos integer, base integer, cs_com_report integer, cs_so_importado integer,
              cs_obrigados integer, cs_sem_report text[])
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_periodo boolean := p_de is not null or p_ate is not null;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with obrigados as (
    select c.nome from public.cs_config c where c.ativo and c.obrigado_report
  ),
  ultimos as (
    select distinct on (v.cs_nome) v.cs_nome, v.semana_inicio, v.criticos_total,
           coalesce(v.data_report, (v.criado_em at time zone 'America/Sao_Paulo')::date) as data_ef
      from public.reports_vigentes() v
      join obrigados o on o.nome = v.cs_nome
     where v.criticos_total is not null
       and (not v_periodo or (
             (p_de is null or coalesce(v.data_report, (v.criado_em at time zone 'America/Sao_Paulo')::date) >= p_de)
         and (p_ate is null or coalesce(v.data_report, (v.criado_em at time zone 'America/Sao_Paulo')::date) <= p_ate)))
     order by v.cs_nome, v.semana_inicio desc
  ),
  validos as (
    select u.* from ultimos u where v_periodo or u.data_ef >= v_hoje - 14
  ),
  base as (
    select distinct e.membro_id from public.membros_elegiveis_rede() e
     where exists (select 1 from validos v where v.cs_nome = any(e.cs_nomes))
  )
  select
    coalesce((select sum(v.criticos_total) from validos v), 0)::int,
    (select count(*) from base)::int,
    (select count(*) from validos)::int,
    0,
    (select count(*) from obrigados)::int,
    coalesce((select array_agg(o.nome order by o.nome) from obrigados o
               where not exists (select 1 from validos v where v.cs_nome = o.nome)), array[]::text[]);
end;
$$;

revoke all on function public.health_base_area(date, date) from public, anon;
grant execute on function public.health_base_area(date, date) to authenticated;
