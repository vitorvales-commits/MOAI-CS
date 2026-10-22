-- Pontos automáticos de advertência com validade até o fim do mês (22/10/2026).
-- Decisões do Vitor: report semanal sem envio até sexta 19h gera 5 pontos por CS e semana; relatório do
-- conselho (frente 3) gera 5 pontos por encontro; pontos automáticos valem até o último dia do mês
-- corrente, 23h59 America/Sao_Paulo; o gestor vê ativos e total histórico.
-- Depois desta migração toda leitura de validade usa só advertencias_aplicadas.valido_ate.

-- 1. Colunas novas -----------------------------------------------------------------------------------
alter table public.advertencia_tipos
  add column if not exists validade_regra text not null default 'meses',
  add column if not exists codigo text;
alter table public.advertencia_tipos drop constraint if exists advertencia_tipos_validade_regra_check;
alter table public.advertencia_tipos add constraint advertencia_tipos_validade_regra_check check (validade_regra in ('meses', 'fim_do_mes'));
create unique index if not exists advertencia_tipos_codigo_key on public.advertencia_tipos (codigo) where codigo is not null;

alter table public.advertencias_aplicadas
  add column if not exists valido_ate timestamptz,
  add column if not exists origem text not null default 'manual',
  add column if not exists chave_origem text,
  add column if not exists anulada_em timestamptz,
  add column if not exists anulada_por text,
  add column if not exists motivo_anulacao text;
alter table public.advertencias_aplicadas drop constraint if exists advertencias_aplicadas_origem_check;
alter table public.advertencias_aplicadas add constraint advertencias_aplicadas_origem_check check (origem in ('manual', 'sistema'));
create unique index if not exists advertencias_aplicadas_chave_origem_key on public.advertencias_aplicadas (chave_origem) where chave_origem is not null;

-- 2. Backfill: regra atual (aplicado_em mais validade_meses) -------------------------------------------
update public.advertencias_aplicadas
   set valido_ate = aplicado_em + make_interval(months => validade_meses)
 where valido_ate is null;
alter table public.advertencias_aplicadas alter column valido_ate set not null;

-- 3. Corte de início ----------------------------------------------------------------------------------
alter table public.configuracoes_globais add column if not exists pontos_automaticos_desde date;
update public.configuracoes_globais
   set pontos_automaticos_desde = (now() at time zone 'America/Sao_Paulo')::date
 where id = true and pontos_automaticos_desde is null;

-- 4. Regra única de validade --------------------------------------------------------------------------
-- Último instante do mês corrente em Brasília (23:59:59.999999). Mesma regra de lib/pontos.ts.
create or replace function public.fim_do_mes_sp(p_ts timestamptz)
returns timestamptz language sql immutable set search_path to 'public' as $$
  select ((date_trunc('month', p_ts at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo') - interval '1 microsecond';
$$;

create or replace function public.valido_ate_do_tipo(p_regra text, p_meses integer, p_ts timestamptz)
returns timestamptz language sql immutable set search_path to 'public' as $$
  select case when p_regra = 'fim_do_mes' then public.fim_do_mes_sp(p_ts) else p_ts + make_interval(months => p_meses) end;
$$;

-- 5. Tipos de sistema ---------------------------------------------------------------------------------
insert into public.advertencia_tipos (nome, pontos, validade_meses, ativo, criado_por, validade_regra, codigo)
select 'Report semanal atrasado', 5, 1, true, 'sistema', 'fim_do_mes', 'report_atrasado'
 where not exists (select 1 from public.advertencia_tipos where codigo = 'report_atrasado');
insert into public.advertencia_tipos (nome, pontos, validade_meses, ativo, criado_por, validade_regra, codigo)
select 'Relatório do conselho atrasado', 5, 1, true, 'sistema', 'fim_do_mes', 'relatorio_conselho_atrasado'
 where not exists (select 1 from public.advertencia_tipos where codigo = 'relatorio_conselho_atrasado');

-- 6. Funções manuais passam a gravar valido_ate e a respeitar os tipos de sistema -------------------------
create or replace function public.aplicar_advertencia(p_cs_nome text, p_tipo_id uuid, p_observacao text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_tipo record;
  v_id uuid;
  v_agora timestamptz := now();
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_cs_nome), '') = '' then
    raise exception 'cs_nome obrigatório' using errcode = '22023';
  end if;

  select nome, pontos, validade_meses, validade_regra into v_tipo
    from public.advertencia_tipos where id = p_tipo_id and ativo = true and codigo is null;
  if v_tipo is null then
    raise exception 'tipo de advertência não encontrado ou inativo' using errcode = 'P0002';
  end if;

  insert into public.advertencias_aplicadas(cs_nome, tipo_id, tipo_nome, pontos, validade_meses, valido_ate, observacao, aplicado_por, aplicado_em, origem)
    values (p_cs_nome, p_tipo_id, v_tipo.nome, v_tipo.pontos, v_tipo.validade_meses,
            public.valido_ate_do_tipo(v_tipo.validade_regra, v_tipo.validade_meses, v_agora),
            nullif(trim(coalesce(p_observacao, '')), ''), v_actor, v_agora, 'manual')
    returning id into v_id;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'aplicar_advertencia', v_id::text, 'success', jsonb_build_object('cs_nome', p_cs_nome, 'tipo_id', p_tipo_id, 'pontos', v_tipo.pontos));

  return v_id;
end;
$$;

create or replace function public.editar_advertencia_tipo(p_id uuid, p_nome text, p_pontos integer, p_validade_meses integer, p_ativo boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_codigo text;
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'nome obrigatório' using errcode = '22023';
  end if;
  if p_pontos is null or p_pontos < 0 then
    raise exception 'pontos inválidos' using errcode = '22023';
  end if;
  if p_validade_meses is null or p_validade_meses <= 0 then
    raise exception 'validade inválida' using errcode = '22023';
  end if;

  select codigo into v_codigo from public.advertencia_tipos where id = p_id;
  if not found then
    raise exception 'tipo de advertência não encontrado' using errcode = 'P0002';
  end if;
  if v_codigo is not null and p_ativo is false then
    raise exception 'tipo de sistema não pode ser desativado' using errcode = '22023';
  end if;

  update public.advertencia_tipos
    set nome = trim(p_nome), pontos = p_pontos, validade_meses = p_validade_meses, ativo = coalesce(p_ativo, ativo)
    where id = p_id;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'editar_advertencia_tipo', p_id::text, 'success', jsonb_build_object('nome', p_nome, 'pontos', p_pontos, 'validade_meses', p_validade_meses, 'ativo', p_ativo));
end;
$$;

create or replace function public.excluir_advertencia_aplicada(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_origem text;
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select origem into v_origem from public.advertencias_aplicadas where id = p_id;
  if not found then
    raise exception 'advertência não encontrada' using errcode = 'P0002';
  end if;
  if v_origem = 'sistema' then
    raise exception 'advertência automática não pode ser excluída, use anular' using errcode = '22023';
  end if;
  delete from public.advertencias_aplicadas where id = p_id;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'excluir_advertencia_aplicada', p_id::text, 'success', jsonb_build_object('id', p_id));
end;
$$;

-- 7. Anulação: preenche os campos, não apaga ------------------------------------------------------------
create or replace function public.anular_advertencia(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'motivo obrigatório' using errcode = '22023';
  end if;
  update public.advertencias_aplicadas
     set anulada_em = now(), anulada_por = v_actor, motivo_anulacao = trim(p_motivo)
   where id = p_id and anulada_em is null;
  if not found then
    raise exception 'advertência não encontrada ou já anulada' using errcode = 'P0002';
  end if;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'anular_advertencia', p_id::text, 'success', jsonb_build_object('id', p_id, 'motivo', p_motivo));
end;
$$;
revoke all on function public.anular_advertencia(uuid, text) from public, anon;
grant execute on function public.anular_advertencia(uuid, text) to authenticated;

-- 8. Aplicação de sistema: única porta do cron, só service role ------------------------------------------
create or replace function public.aplicar_advertencia_sistema(p_codigo text, p_cs_nome text, p_chave text, p_observacao text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare
  v_tipo record;
  v_agora timestamptz := now();
  v_linhas integer;
begin
  select id, nome, pontos, validade_meses, validade_regra into v_tipo
    from public.advertencia_tipos where codigo = p_codigo and ativo = true;
  if v_tipo is null then
    raise exception 'tipo de sistema não encontrado: %', p_codigo using errcode = 'P0002';
  end if;
  if coalesce(trim(p_chave), '') = '' or coalesce(trim(p_cs_nome), '') = '' then
    raise exception 'chave e cs_nome obrigatórios' using errcode = '22023';
  end if;
  insert into public.advertencias_aplicadas(cs_nome, tipo_id, tipo_nome, pontos, validade_meses, valido_ate, observacao, aplicado_por, aplicado_em, origem, chave_origem)
    values (p_cs_nome, v_tipo.id, v_tipo.nome, v_tipo.pontos, v_tipo.validade_meses,
            public.valido_ate_do_tipo(v_tipo.validade_regra, v_tipo.validade_meses, v_agora),
            nullif(trim(coalesce(p_observacao, '')), ''), 'sistema', v_agora, 'sistema', p_chave)
    on conflict (chave_origem) where chave_origem is not null do nothing;
  get diagnostics v_linhas = row_count;
  return v_linhas > 0;
end;
$$;
revoke all on function public.aplicar_advertencia_sistema(text, text, text, text) from public, anon, authenticated;
grant execute on function public.aplicar_advertencia_sistema(text, text, text, text) to service_role;

-- 9. Estado do report por semana sem sessão (usado pelo cron) e wrapper com sessão ---------------------------
create or replace function public.status_report_semana_base(p_semana date)
returns table(cs_nome text, semana_inicio date, prazo timestamptz, estado text, enviado_em timestamptz, horas_atraso numeric)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_prazo timestamptz := ((p_semana + 4) + time '19:00') at time zone 'America/Sao_Paulo';
begin
  return query
  with alvo as (
    select c.nome from public.cs_config c where c.ativo and c.obrigado_report
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

create or replace function public.status_report_semana(p_semana date default null)
returns table(cs_nome text, semana_inicio date, prazo timestamptz, estado text, enviado_em timestamptz, horas_atraso numeric, como_foi_semana text, risco_se_ignorar text)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
  v_sem date := coalesce(p_semana, date_trunc('week', now() at time zone 'America/Sao_Paulo')::date);
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select b.cs_nome, b.semana_inicio, b.prazo, b.estado, b.enviado_em, b.horas_atraso, vg.como_foi_semana, vg.risco_se_ignorar
    from public.status_report_semana_base(v_sem) b
    left join public.reports_vigentes() vg on vg.cs_nome = b.cs_nome and vg.semana_inicio = v_sem
   where v_gestor or b.cs_nome = v_meu
   order by (case when b.enviado_em is null and now() > b.prazo then 0 when b.enviado_em is not null and b.enviado_em > b.prazo then 1 when b.enviado_em is null then 2 else 3 end), b.cs_nome;
end;
$$;

-- 10. Leitura única de pontos ----------------------------------------------------------------------------
-- Ativos: não anulados e dentro da validade. Total histórico: todos os não anulados, inclusive vencidos.
create or replace function public.pontos_cs(p_cs text default null)
returns table(cs_nome text, pontos_ativos integer, total_historico integer, qtd_por_tipo jsonb, proximo_vencimento timestamptz, desde timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not v_gestor and v_meu is null then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select c.nome,
         coalesce(sum(a.pontos) filter (where a.valido_ate > now()), 0)::int,
         coalesce(sum(a.pontos), 0)::int,
         coalesce((select jsonb_object_agg(t.tipo_nome, t.n) from (
                     select a2.tipo_nome, count(*)::int n from public.advertencias_aplicadas a2
                      where a2.cs_nome = c.nome and a2.anulada_em is null group by a2.tipo_nome) t), '{}'::jsonb),
         min(a.valido_ate) filter (where a.valido_ate > now()),
         min(a.aplicado_em)
    from public.cs_config c
    left join public.advertencias_aplicadas a on a.cs_nome = c.nome and a.anulada_em is null
   where (c.ativo or p_cs is not null) and (p_cs is null or lower(c.nome) = lower(p_cs)) and (v_gestor or c.nome = v_meu)
   group by c.nome
   order by c.nome;
end;
$$;
revoke all on function public.pontos_cs(text) from public, anon;
grant execute on function public.pontos_cs(text) to authenticated;

-- 11. Health da Base: só pontos ativos (valido_ate), respeitando a chave advertencia_soma_health -------------
create or replace function public.health_base_cs(p_cs text default null)
returns table(cs_nome text, criticos integer, carteira integer, semana_report date, pontos_ativos integer, chave_ligada boolean, valor_decimos integer, motivo text)
language plpgsql stable security definer set search_path to 'public' as $$
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
     where a.cs_nome = r.nome and a.anulada_em is null and a.valido_ate > now();

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

-- 12. Apuração idempotente --------------------------------------------------------------------------------
-- Percorre as semanas fechadas desde o corte (pontos_automaticos_desde). p_simular não grava e devolve o que
-- seria aplicado. A parte do relatório do conselho entra na migração da frente 3 (create or replace).
create or replace function public.apurar_pontos_automaticos(p_simular boolean default false)
returns table(codigo text, cs_nome text, chave text, aplicado boolean)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_desde date := (select cg.pontos_automaticos_desde from public.configuracoes_globais cg where cg.id = true);
  v_sem date;
  r record;
  v_chave text;
begin
  if v_desde is null then return; end if;
  v_sem := date_trunc('week', v_desde::timestamp)::date;
  if v_sem < v_desde then v_sem := v_sem + 7; end if;
  -- semana fechada para o report = prazo (sexta 19h) já passou
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
end;
$$;
revoke all on function public.apurar_pontos_automaticos(boolean) from public, anon, authenticated;
grant execute on function public.apurar_pontos_automaticos(boolean) to service_role;
