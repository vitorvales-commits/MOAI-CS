-- Ordenação total e determinística em metas_resolvidas_periodo.
-- O PostgREST corta respostas em 1000 linhas; o cliente agora pagina com range(), e a paginação por
-- intervalo só é confiável com ordem estável. Mesma lógica, mesmo retorno, mesmo search_path.
-- Grants preservados pelo create or replace.
create or replace function public.metas_resolvidas_periodo(p_mes_inicio date, p_mes_fim date)
 returns table(mes date, escopo text, cs_nome text, indicador text, valor numeric, mes_origem date)
 language sql
 stable
 set search_path to 'public'
as $function$
  with serie as (
    select generate_series(date_trunc('month', p_mes_inicio), date_trunc('month', p_mes_fim), interval '1 month')::date as mes
  ),
  chaves as (
    select distinct md.indicador, md.escopo, md.cs_nome from public.metas_definidas md
  )
  select s.mes, k.escopo, k.cs_nome, k.indicador,
    (select md.valor from public.metas_definidas md
      where md.indicador = k.indicador and md.escopo = k.escopo and coalesce(md.cs_nome,'') = coalesce(k.cs_nome,'')
        and md.mes <= s.mes order by md.mes desc limit 1) as valor,
    (select md.mes from public.metas_definidas md
      where md.indicador = k.indicador and md.escopo = k.escopo and coalesce(md.cs_nome,'') = coalesce(k.cs_nome,'')
        and md.mes <= s.mes order by md.mes desc limit 1) as mes_origem
  from serie s
  cross join chaves k
  order by s.mes, k.escopo, k.indicador, k.cs_nome nulls first
$function$;
