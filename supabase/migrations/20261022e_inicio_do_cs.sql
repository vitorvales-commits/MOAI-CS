-- Obrigação de report e de relatório só a partir do início do CS (22/10/2026). Um CS novo não leva ponto de semana ou
-- encontro anteriores à entrada dele. cs_config.inicio_em nulo significa sem restrição (CS antigo). Semana vale se a
-- segunda-feira dela é igual ou posterior ao início; encontro vale se a data (Brasília) é igual ou posterior.
alter table public.cs_config add column if not exists inicio_em date;
-- Iasmin: primeiro mês na carteira em 01/11/2026 (supabase/seed/cs_periodos.sql, origem sucessao_marcos).
update public.cs_config set inicio_em = date '2026-11-01' where nome = 'Iasmin' and inicio_em is null;

create or replace function public.status_report_semana_base(p_semana date)
returns table(cs_nome text, semana_inicio date, prazo timestamptz, estado text, enviado_em timestamptz, horas_atraso numeric)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_prazo timestamptz := ((p_semana + 4) + time '19:00') at time zone 'America/Sao_Paulo';
begin
  return query
  with alvo as (
    select c.nome from public.cs_config c
     where c.ativo and c.obrigado_report and c.tipo is distinct from 'ex_membro_sem_conta'
       and (c.inicio_em is null or p_semana >= c.inicio_em)
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

create or replace function public._encontros_relatorio(p_cs text, p_desde date)
returns table(group_id text, conselho text, cs_nome text, data_encontro timestamptz, prazo timestamptz, estado text, dias_restantes integer,
              relatorio_id uuid, enviado_em timestamptz, avaliacao text, faltas jsonb, faltas_sem_justificativa integer, presenca_pendente integer)
language plpgsql stable security definer set search_path to 'public' as $$
#variable_conflict use_column
declare
  v_piso date := greatest(date '2026-09-23', coalesce(p_desde, (select cg.pontos_automaticos_desde from public.configuracoes_globais cg where cg.id = true), date '2026-09-23'));
begin
  return query
  with base as (
    select distinct on (e.group_id, e.data_iso) e.group_id, g.titulo, public.cs_do_grupo(e.group_id) as cs, e.data_iso,
           (((((e.data_iso at time zone 'America/Sao_Paulo')::date + 8)::timestamp) at time zone 'America/Sao_Paulo') - interval '1 microsecond') as prazo,
           public.mes_nome_pt(e.data_iso) as mes
      from public.encontros_conselho e
      join public.conselhos_grupos g on g.group_id = e.group_id and not coalesce(g.is_repo, false)
     where e.status_agenda in ('Executado', 'Confirmado', 'Em conjunto')
       and e.data_iso + interval '240 minutes' <= now()
       and (e.data_iso at time zone 'America/Sao_Paulo')::date >= v_piso
     order by e.group_id, e.data_iso
  ),
  vivos as (
    select b.* from base b
     where (p_cs is null or lower(b.cs) = lower(p_cs))
       and not exists (select 1 from public.cs_config c where c.nome = b.cs and c.inicio_em is not null
                        and (b.data_iso at time zone 'America/Sao_Paulo')::date < c.inicio_em)
       and not (
         select coalesce(count(*) filter (where s.status = 'Não teve') * 2 > count(*), false)
           from public.conselhos_membros m join public.conselhos_status_mensal s on s.membro_id = m.id and s.mes = b.mes
          where m.group_id = b.group_id)
  )
  select v.group_id, v.titulo, v.cs, v.data_iso, v.prazo,
         case when r.enviado_em is not null then (case when r.enviado_em <= v.prazo then 'enviado_no_prazo' else 'enviado_com_atraso' end)
              when now() > v.prazo then 'atrasado'
              when (now() at time zone 'America/Sao_Paulo')::date = (v.prazo at time zone 'America/Sao_Paulo')::date then 'vence_hoje'
              else 'a_preencher' end,
         ((v.prazo at time zone 'America/Sao_Paulo')::date - (now() at time zone 'America/Sao_Paulo')::date)::int,
         r.id, r.enviado_em, r.avaliacao,
         coalesce((select jsonb_agg(jsonb_build_object('membro_id', f.membro_id, 'nome', f.nome, 'tipo', f.tipo,
                                                       'categoria', rf.categoria, 'justificativa', rf.justificativa) order by f.nome)
                     from public.faltas_do_encontro(v.group_id, v.data_iso) f
                     left join public.relatorio_conselho_faltas rf on rf.relatorio_id = r.id and rf.membro_id = f.membro_id), '[]'::jsonb),
         (select count(*)::int from public.faltas_do_encontro(v.group_id, v.data_iso) f
            left join public.relatorio_conselho_faltas rf on rf.relatorio_id = r.id and rf.membro_id = f.membro_id
           where f.tipo = 'falta' and (rf.justificativa is null or rf.categoria is null)),
         case when now() >= v.data_iso + interval '24 hours' then
           (select count(*)::int from public.conselhos_membros m join public.conselhos_status_mensal s on s.membro_id = m.id and s.mes = v.mes
             where m.group_id = v.group_id and s.status in ('Confirmado', 'Agd. Confirmação'))
         else 0 end
    from vivos v
    left join public.relatorios_conselho r on r.group_id = v.group_id and r.data_encontro = v.data_iso
   order by v.prazo, v.titulo;
end;
$$;
revoke all on function public._encontros_relatorio(text, date) from public, anon, authenticated;
grant execute on function public._encontros_relatorio(text, date) to service_role;
