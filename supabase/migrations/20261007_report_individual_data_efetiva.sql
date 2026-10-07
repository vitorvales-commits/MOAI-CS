-- reports_resumo_cs passa a devolver data_efetiva: data do report quando preenchida, senão a data
-- de criação (Brasília), a mesma regra de data aproximada que lib/reports.ts usava para
-- reports_semanais_items (data || created_at_monday). Indicações e matchmakings autodeclarados
-- continuam caindo no mesmo mês de antes. Assinatura muda, por isso drop function antes.
drop function if exists public.reports_resumo_cs();
create function public.reports_resumo_cs()
returns table(cs_nome text, cs_categoria text, semana_inicio date, data_efetiva date, data_aproximada boolean,
              origem text, nota_semana smallint, indicacoes integer, matchmakings integer,
              criticos_total integer, base_total integer, base_origem text, criticos_origem text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_gestor boolean := public.is_gestor(); v_meu text := public.meu_cs();
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select r.cs_nome, r.cs_categoria, r.semana_inicio,
      coalesce(r.data_report, (r.criado_em at time zone 'America/Sao_Paulo')::date), r.data_aproximada, r.origem,
      r.nota_semana, r.indicacoes, r.matchmakings,
      case when v_gestor or coalesce(r.cs_nome = v_meu, false) then r.criticos_total end,
      case when v_gestor or coalesce(r.cs_nome = v_meu, false) then r.base_total end,
      r.base_origem, r.criticos_origem
    from public.reports_vigentes() r
    order by r.cs_nome, r.semana_inicio;
end; $$;
revoke all on function public.reports_resumo_cs() from public, anon;
grant execute on function public.reports_resumo_cs() to authenticated;
