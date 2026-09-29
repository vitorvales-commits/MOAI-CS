-- Já aplicada em produção (moai-cs-dashboard) em 29/09/2026 via MCP. Versionada agora.
-- Igual metas_time_mensal, mas no escopo de um CS específico — usada só pela página individual
-- (nunca dentro de generateCSReport/generateEquipeReport, que rodam em lote pra todo o time;
-- chamar isto pra cada CS numa agregação multiplicaria round-trips ao banco sem necessidade,
-- lição já registrada em lib/reports.ts sobre esgotamento do pool de conexões).
create or replace function public.metas_cs_mensal_completo(p_cs text, p_mes date default null)
returns table (
  indicador text, mes date, meta numeric, meta_mes_origem date,
  realizado numeric, fonte text, status text, percentual numeric,
  em_recorde boolean, recorde_valor numeric, recorde_mes date, recorde_distancia numeric
)
language plpgsql stable set search_path = public as $function$
declare
  v_mes date := date_trunc('month', coalesce(p_mes, current_date))::date;
  r record;
begin
  for r in select chave, direcao from public.indicadores_catalogo order by chave loop
    declare
      v_meta numeric; v_meta_origem date;
      v_realizado numeric;
      v_rec_valor numeric; v_rec_mes date;
    begin
      select rm.valor, rm.mes_origem into v_meta, v_meta_origem from public.resolver_meta(r.chave, 'cs', p_cs, v_mes) rm;
      select h.realizado into v_realizado from public.historico_indicador(r.chave, 'cs', p_cs) h where h.mes = v_mes;
      select re.valor, re.mes into v_rec_valor, v_rec_mes from public.recorde_efetivo(r.chave, 'cs', p_cs) re;

      indicador := r.chave;
      mes := v_mes;
      meta := v_meta;
      meta_mes_origem := v_meta_origem;
      realizado := v_realizado;
      fonte := case when v_realizado is not null then 'calculado' else 'sem_dado' end;
      status := case
        when v_meta is null then 'sem_meta'
        when v_realizado is null then 'sem_meta'
        when r.direcao = 'min' and v_realizado >= v_meta then 'bateu'
        when r.direcao = 'max' and v_realizado <= v_meta then 'bateu'
        else 'nao_bateu' end;
      percentual := case when v_meta is null or v_meta = 0 or v_realizado is null then null
        else round(100 * v_realizado / v_meta, 0) end;
      recorde_valor := v_rec_valor;
      recorde_mes := v_rec_mes;
      recorde_distancia := case when v_rec_valor is not null and v_realizado is not null then v_realizado - v_rec_valor else null end;
      em_recorde := case
        when v_rec_valor is null or v_realizado is null then false
        when r.direcao = 'min' then v_realizado > v_rec_valor
        else v_realizado < v_rec_valor end;
      return next;
    end;
  end loop;
end;
$function$;

revoke all on function public.metas_cs_mensal_completo(text, date) from public, anon;
grant execute on function public.metas_cs_mensal_completo(text, date) to authenticated, service_role;
