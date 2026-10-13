-- Etapa 3 do report via Monday: estado do report por CS e semana, regularidade, Health da Base e chave
-- de advertência. Uma função de estado (status_report_semana) alimenta a Visão da área e a página do CS
-- (regra uma_funcao_de_estado). Prazo: sexta às 19h, America/Sao_Paulo (padrões d e e).

-- Estado por CS e semana. Dois envios na mesma semana: o mais recente dá o conteúdo, o mais antigo o prazo.
create or replace function public.status_report_semana(p_semana date default null)
returns table(cs_nome text, semana_inicio date, prazo timestamptz, estado text, enviado_em timestamptz,
              horas_atraso numeric, como_foi_semana text, risco_se_ignorar text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
  v_sem date := coalesce(p_semana, date_trunc('week', now() at time zone 'America/Sao_Paulo')::date);
  v_prazo timestamptz := ((v_sem + 4) + time '19:00') at time zone 'America/Sao_Paulo';
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  with alvo as (
    select c.nome from public.cs_config c
     where c.ativo and c.obrigado_report and (v_gestor or c.nome = v_meu)
  ),
  primeiro as (
    select r.cs_nome, min(coalesce(r.enviado_em, r.criado_em)) as enviado
      from public.reports_individuais r
     where r.origem = 'monday' and r.semana_inicio = v_sem and r.cs_nome is not null
     group by r.cs_nome
  ),
  vigente as (
    select v.cs_nome, v.como_foi_semana, v.risco_se_ignorar from public.reports_vigentes() v
     where v.semana_inicio = v_sem
  )
  select a.nome, v_sem, v_prazo,
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
    end,
    vg.como_foi_semana, vg.risco_se_ignorar
  from alvo a
  left join primeiro p on p.cs_nome = a.nome
  left join vigente vg on vg.cs_nome = a.nome
  order by (case when p.enviado is null and now() > v_prazo then 0 when p.enviado is not null and p.enviado > v_prazo then 1 when p.enviado is null then 2 else 3 end), a.nome;
end;
$$;

-- Regularidade: últimas N semanas fechadas, com o estado de cada uma (reutiliza status_report_semana).
create or replace function public.regularidade_report_cs(p_cs text, p_semanas int default 8)
returns table(semana_inicio date, estado text, horas_atraso numeric)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_atual date := date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
  v_k int;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  for v_k in reverse greatest(p_semanas, 1)..1 loop
    return query
      select s.semana_inicio, s.estado, s.horas_atraso
        from public.status_report_semana(v_atual - 7 * v_k) s
       where lower(s.cs_nome) = lower(p_cs);
  end loop;
end;
$$;

-- Chave que liga a soma de pontos de advertência ao Health (padrão h). Começa desligada.
create or replace function public.advertencia_soma_health_ligada()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select cg.advertencia_soma_health from public.configuracoes_globais cg where cg.id = true), false)
  where public.is_moai_user();
$$;

-- Só o gestor altera a chave. Fica registrada em configuracoes_globais e em access_audit_log.
create or replace function public.definir_advertencia_soma_health(p_ligado boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.configuracoes_globais
     set advertencia_soma_health = p_ligado, atualizado_por = v_actor, atualizado_em = now()
   where id = true;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_advertencia_soma_health', 'configuracoes_globais', 'success', jsonb_build_object('ligado', p_ligado));
  return p_ligado;
end;
$$;

-- Health da Base por CS (padrões f e g). Critérios: report vigente mais recente com até 14 dias;
-- carteira de membros_elegiveis_rede; décimos de ponto, teto 1000; pontos só entram com a chave ligada.
create or replace function public.health_base_cs(p_cs text default null)
returns table(cs_nome text, criticos integer, carteira integer, semana_report date, pontos_ativos integer,
              chave_ligada boolean, valor_decimos integer, motivo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_chave boolean := coalesce((select cg.advertencia_soma_health from public.configuracoes_globais cg where cg.id = true), false);
  r record;
  v_rep record;
  v_carteira integer;
  v_pontos integer;
  v_dec integer;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  for r in
    select c.nome from public.cs_config c
     where c.ativo and (p_cs is null or lower(c.nome) = lower(p_cs)) and (v_gestor or c.nome = v_meu)
     order by c.nome
  loop
    select v.semana_inicio, v.criticos_total, coalesce(v.data_report, (v.criado_em at time zone 'America/Sao_Paulo')::date) as data_ef
      into v_rep
      from public.reports_vigentes() v
     where v.cs_nome = r.nome
     order by v.semana_inicio desc limit 1;
    select count(distinct e.membro_id)::int into v_carteira
      from public.membros_elegiveis_rede() e where r.nome = any(e.cs_nomes);
    select coalesce(sum(a.pontos), 0)::int into v_pontos
      from public.advertencias_aplicadas a
     where a.cs_nome = r.nome and a.aplicado_em + make_interval(months => a.validade_meses) > now();

    cs_nome := r.nome; carteira := v_carteira; chave_ligada := v_chave;
    pontos_ativos := v_pontos; semana_report := null; criticos := null; valor_decimos := null; motivo := null;
    if v_carteira = 0 then motivo := 'sem_apuracao';
    elsif v_rep.semana_inicio is null or v_rep.data_ef < v_hoje - 14 then motivo := 'sem_report';
    else
      semana_report := v_rep.semana_inicio; criticos := v_rep.criticos_total;
      if v_rep.criticos_total is null then motivo := 'sem_apuracao';
      elsif v_rep.criticos_total > v_carteira then motivo := 'inconsistente';
      else
        v_dec := (v_rep.criticos_total * 1000 * 2 + v_carteira) / (2 * v_carteira);
        if v_chave then v_dec := least(1000, v_dec + v_pontos * 10); end if;
        valor_decimos := v_dec;
      end if;
    end if;
    return next;
  end loop;
end;
$$;

-- Health da área (padrão i): soma dos críticos dos CS com report válido dividida pelos membros distintos
-- das carteiras desses CS. Nunca média de percentuais; sem soma de advertência.
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
     where exists (select 1 from validos v where v.cs_nome = any(e.cs_nomes))
  )
  select
    coalesce((select sum(v.criticos_total) from validos v), 0)::int,
    (select count(*) from base)::int,
    (select count(*) from validos)::int,
    0;
end;
$$;

revoke all on function public.status_report_semana(date) from public, anon;
revoke all on function public.regularidade_report_cs(text, int) from public, anon;
revoke all on function public.advertencia_soma_health_ligada() from public, anon;
revoke all on function public.definir_advertencia_soma_health(boolean) from public, anon;
revoke all on function public.health_base_cs(text) from public, anon;
grant execute on function public.status_report_semana(date) to authenticated;
grant execute on function public.regularidade_report_cs(text, int) to authenticated;
grant execute on function public.advertencia_soma_health_ligada() to authenticated;
grant execute on function public.definir_advertencia_soma_health(boolean) to authenticated;
grant execute on function public.health_base_cs(text) to authenticated;
