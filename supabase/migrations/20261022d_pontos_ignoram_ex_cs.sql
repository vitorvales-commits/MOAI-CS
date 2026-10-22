-- Pontos automáticos nunca valem para ex CS (22/10/2026). O sync do Monday reativa cs_config.ativo de quem ainda tem
-- conta ativa lá; enquanto a função sync-monday corrigida não for implantada, Marcos (tipo ex_membro_sem_conta) volta
-- a aparecer como ativo. A apuração e o estado do report passam a olhar o tipo, não só o ativo.
create or replace function public.status_report_semana_base(p_semana date)
returns table(cs_nome text, semana_inicio date, prazo timestamptz, estado text, enviado_em timestamptz, horas_atraso numeric)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_prazo timestamptz := ((p_semana + 4) + time '19:00') at time zone 'America/Sao_Paulo';
begin
  return query
  with alvo as (
    select c.nome from public.cs_config c where c.ativo and c.obrigado_report and c.tipo is distinct from 'ex_membro_sem_conta'
  ),
  primeiro as (
    select r.cs_nome, min(coalesce(r.enviado_em, r.criado_em)) as enviado
      from public.reports_individuais r
     where r.origem = 'monday' and r.semana_inicio = p_semana and r.cs_nome is not null
     group by r.cs_nome
  )
  select a.nome, p_semana, v_prazo,
    case
      when p.enviado is not null and p.enviado <= v_prazo then 'enviado_no_prazo'
      when p.enviado is not null then 'enviado_com_atraso'
      when now() <= v_prazo then 'pendente'
      else 'atrasado'
    end,
    p.enviado,
    case
      when p.enviado is not null and p.enviado > v_prazo then round((extract(epoch from (p.enviado - v_prazo)) / 3600)::numeric, 1)
      when p.enviado is null and now() > v_prazo then round((extract(epoch from (now() - v_prazo)) / 3600)::numeric, 1)
      else null
    end
  from alvo a left join primeiro p on p.cs_nome = a.nome;
end;
$$;
revoke all on function public.status_report_semana_base(date) from public, anon, authenticated;

create or replace function public.apurar_pontos_automaticos(p_simular boolean default false)
returns table(codigo text, cs_nome text, chave text, aplicado boolean)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
declare
  v_desde date := (select cg.pontos_automaticos_desde from public.configuracoes_globais cg where cg.id = true);
  v_sem date;
  r record;
  v_chave text;
begin
  if v_desde is null then return; end if;
  v_sem := date_trunc('week', v_desde::timestamp)::date;
  if v_sem < v_desde then v_sem := v_sem + 7; end if;
  while (((v_sem + 4) + time '19:00') at time zone 'America/Sao_Paulo') < now() loop
    for r in select * from public.status_report_semana_base(v_sem) b where b.estado in ('atrasado', 'enviado_com_atraso') loop
      v_chave := 'report:' || r.cs_nome || ':' || v_sem::text;
      codigo := 'report_atrasado'; cs_nome := r.cs_nome; chave := v_chave;
      if p_simular then
        aplicado := not exists (select 1 from public.advertencias_aplicadas a where a.chave_origem = v_chave);
      else
        aplicado := public.aplicar_advertencia_sistema('report_atrasado', r.cs_nome, v_chave,
          'Report da semana de ' || to_char(v_sem, 'DD/MM/YYYY') || ' sem envio até sexta 19h.');
      end if;
      return next;
    end loop;
    v_sem := v_sem + 7;
  end loop;
  for r in
    select e.group_id, e.conselho, e.cs_nome, e.data_encontro from public._encontros_relatorio(null, null) e
      join public.cs_config c on c.nome = e.cs_nome and c.ativo and c.tipo is distinct from 'ex_membro_sem_conta'
     where e.estado in ('atrasado', 'enviado_com_atraso')
  loop
    v_chave := 'relatorio:' || r.group_id || ':' || to_char(r.data_encontro at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    codigo := 'relatorio_conselho_atrasado'; cs_nome := r.cs_nome; chave := v_chave;
    if p_simular then
      aplicado := not exists (select 1 from public.advertencias_aplicadas a where a.chave_origem = v_chave);
    else
      aplicado := public.aplicar_advertencia_sistema('relatorio_conselho_atrasado', r.cs_nome, v_chave,
        'Relatório do conselho ' || r.conselho || ' do encontro de ' || to_char(r.data_encontro at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ' sem envio em 7 dias.');
    end if;
    return next;
  end loop;
end;
$$;
revoke all on function public.apurar_pontos_automaticos(boolean) from public, anon, authenticated;
grant execute on function public.apurar_pontos_automaticos(boolean) to service_role;
