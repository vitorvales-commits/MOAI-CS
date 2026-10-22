-- Relatório do conselho com faltas de quem confirmou (22/10/2026).
-- Primeira escrita do CS dentro da plataforma. Prazo: 7 dias corridos depois do encontro, 23h59 de Brasília;
-- passado o prazo, 5 pontos automáticos (apurar_pontos_automaticos). Estado e prazo espelham lib/pontos.ts.

-- 1. Encontros resolvidos para group_id ----------------------------------------------------------------------
-- A agenda só traz o nome do conselheiro. O casamento nome -> grupo é feito UMA vez, no código
-- (resolverEncontrosAgenda em lib/reports.ts, a mesma regra da agenda visual, do próximo encontro e do GTD), e
-- gravado aqui. O SQL (cron e telas) só lê esta tabela; nunca refaz o casamento por nome.
create table if not exists public.encontros_conselho (
  agenda_item_id bigint primary key,
  group_id text not null,
  data_iso timestamptz not null,
  status_agenda text,
  atualizado_em timestamptz not null default now()
);
create index if not exists encontros_conselho_data_idx on public.encontros_conselho (data_iso);
alter table public.encontros_conselho enable row level security;
drop policy if exists moai_select on public.encontros_conselho;
create policy moai_select on public.encontros_conselho for select to authenticated using (public.is_moai_user());
revoke all on public.encontros_conselho from anon, public;
grant select on public.encontros_conselho to authenticated;

-- Só group_id e agenda_item_id vêm do código; data e status saem sempre da própria agenda.
create or replace function public.sincronizar_encontros_conselho(p_itens jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v integer;
begin
  if not (public.is_gestor() or auth.role() = 'service_role') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'itens inválidos' using errcode = '22023';
  end if;
  create temporary table _enc_novos on commit drop as
    select a.id as agenda_item_id, x.group_id, a.data_iso, a.status
      from jsonb_to_recordset(p_itens) as x(agenda_item_id bigint, group_id text)
      join public.agenda_conselhos_items a on a.id = x.agenda_item_id
      join public.conselhos_grupos g on g.group_id = x.group_id
     where a.data_iso is not null;
  insert into public.encontros_conselho as e (agenda_item_id, group_id, data_iso, status_agenda)
    select n.agenda_item_id, n.group_id, n.data_iso, n.status from _enc_novos n
  on conflict (agenda_item_id) do update
    set group_id = excluded.group_id, data_iso = excluded.data_iso, status_agenda = excluded.status_agenda, atualizado_em = now()
    where (e.group_id, e.data_iso, e.status_agenda) is distinct from (excluded.group_id, excluded.data_iso, excluded.status_agenda);
  if exists (select 1 from _enc_novos) then
    delete from public.encontros_conselho e where e.agenda_item_id not in (select agenda_item_id from _enc_novos);
  end if;
  select count(*) into v from public.encontros_conselho;
  drop table if exists _enc_novos;
  return v;
end;
$$;
revoke all on function public.sincronizar_encontros_conselho(jsonb) from public, anon;
grant execute on function public.sincronizar_encontros_conselho(jsonb) to authenticated, service_role;

-- 2. Apoios -------------------------------------------------------------------------------------------------
create or replace function public.mes_nome_pt(p_ts timestamptz)
returns text language sql immutable set search_path to 'public' as $$
  select (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'])
         [extract(month from p_ts at time zone 'America/Sao_Paulo')::int];
$$;

-- CS responsável do grupo: o nome entre parênteses do título casa com cs_config.apelido_conselho.
create or replace function public.cs_do_grupo(p_group_id text)
returns text language sql stable security definer set search_path to 'public' as $$
  select c.nome from public.conselhos_grupos g
    join public.cs_config c on lower(c.apelido_conselho) = lower(substring(g.titulo from '\(([^)]+)\)\s*$'))
   where g.group_id = p_group_id limit 1;
$$;
revoke all on function public.cs_do_grupo(text) from public, anon;
grant execute on function public.cs_do_grupo(text) to authenticated, service_role;

-- 3. Faltas de quem confirmou ---------------------------------------------------------------------------------
-- falta: ainda Ausente no mês e (trocou de Confirmado para Ausente no mês, ou a última troca antes do encontro
-- deixou Confirmado). desistencia: ainda Não vai e trocou de Confirmado para Não vai antes do encontro.
create or replace function public.faltas_do_encontro(p_group_id text, p_data timestamptz)
returns table(membro_id bigint, nome text, tipo text)
language sql stable security definer set search_path to 'public' as $$
  with mes as (select public.mes_nome_pt(p_data) as nome)
  select m.id, m.nome, 'falta'::text
    from public.conselhos_membros m
    join public.conselhos_status_mensal s on s.membro_id = m.id
    cross join mes
   where m.group_id = p_group_id and s.mes = mes.nome and s.status = 'Ausente'
     and (
       exists (select 1 from public.conselhos_status_historico h
                where h.membro_id = m.id and h.mes = mes.nome and h.status_anterior = 'Confirmado' and h.status_novo = 'Ausente')
       or (select h.status_novo from public.conselhos_status_historico h
            where h.membro_id = m.id and h.mes = mes.nome and h.alterado_em <= p_data
            order by h.alterado_em desc limit 1) = 'Confirmado'
     )
  union all
  select m.id, m.nome, 'desistencia'::text
    from public.conselhos_membros m
    join public.conselhos_status_mensal s on s.membro_id = m.id
    cross join mes
   where m.group_id = p_group_id and s.mes = mes.nome and s.status = 'Não vai'
     and exists (select 1 from public.conselhos_status_historico h
                  where h.membro_id = m.id and h.mes = mes.nome and h.status_anterior = 'Confirmado' and h.status_novo = 'Não vai' and h.alterado_em <= p_data);
$$;
revoke all on function public.faltas_do_encontro(text, timestamptz) from public, anon;
grant execute on function public.faltas_do_encontro(text, timestamptz) to authenticated, service_role;

-- 4. Relatórios --------------------------------------------------------------------------------------------------
create table if not exists public.relatorios_conselho (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  data_encontro timestamptz not null,
  cs_nome text not null,
  avaliacao text not null check (avaliacao in ('Muito bom', 'Bom', 'Regular', 'Ruim')),
  avanco text not null check (char_length(avanco) between 1 and 280),
  membro_atencao_id bigint,
  membro_atencao_motivo text check (membro_atencao_motivo is null or char_length(membro_atencao_motivo) <= 200),
  combinado text check (combinado is null or char_length(combinado) <= 280),
  enviado_em timestamptz not null default now(),
  enviado_por text not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  unique (group_id, data_encontro)
);
create table if not exists public.relatorio_conselho_faltas (
  relatorio_id uuid not null references public.relatorios_conselho (id) on delete cascade,
  membro_id bigint not null,
  membro_nome text not null,
  tipo text not null check (tipo in ('falta', 'desistencia')),
  categoria text check (categoria is null or categoria in ('Imprevisto profissional', 'Saúde', 'Viagem', 'Esquecimento', 'Sem retorno do membro', 'Outro')),
  justificativa text check (justificativa is null or char_length(justificativa) <= 200),
  primary key (relatorio_id, membro_id)
);
alter table public.relatorios_conselho enable row level security;
alter table public.relatorio_conselho_faltas enable row level security;
drop policy if exists moai_select on public.relatorios_conselho;
create policy moai_select on public.relatorios_conselho for select to authenticated using (public.is_moai_user());
drop policy if exists moai_select on public.relatorio_conselho_faltas;
create policy moai_select on public.relatorio_conselho_faltas for select to authenticated using (public.is_moai_user());
-- Escrita só pela função security definer abaixo.
revoke all on public.relatorios_conselho, public.relatorio_conselho_faltas from anon, public;
grant select on public.relatorios_conselho, public.relatorio_conselho_faltas to authenticated;

-- 5. Estado dos encontros (sem sessão, usado também pelo cron) -----------------------------------------------------
-- Realizado = status da agenda Executado, Confirmado ou Em conjunto, e o fim previsto (início mais 240 minutos,
-- AGENDA_DURACAO_CONSELHO_MIN) já passou. Cancelado e Não teve não geram relatório. Piso: 23/09/2026 e o corte de
-- pontos_automaticos_desde (p_desde substitui o corte, só para validação).
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

-- Única fonte para a home do CS, a página do conselho, a página do CS e a fila do gestor.
create or replace function public.encontros_pendentes_relatorio(p_cs text default null, p_desde date default null)
returns table(group_id text, conselho text, cs_nome text, data_encontro timestamptz, prazo timestamptz, estado text, dias_restantes integer,
              relatorio_id uuid, enviado_em timestamptz, avaliacao text, faltas jsonb, faltas_sem_justificativa integer, presenca_pendente integer)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
  v_cs text := p_cs;
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not v_gestor then
    if v_meu is null then raise exception 'not authorized' using errcode = '42501'; end if;
    if p_cs is not null and lower(p_cs) <> lower(v_meu) then raise exception 'not authorized' using errcode = '42501'; end if;
    v_cs := v_meu;
  end if;
  return query select * from public._encontros_relatorio(v_cs, p_desde);
end;
$$;
revoke all on function public.encontros_pendentes_relatorio(text, date) from public, anon;
grant execute on function public.encontros_pendentes_relatorio(text, date) to authenticated;

-- 6. Salvar (criar ou editar) -------------------------------------------------------------------------------------
create or replace function public.salvar_relatorio_conselho(
  p_group_id text, p_data_encontro timestamptz, p_avaliacao text, p_avanco text,
  p_membro_atencao_id bigint, p_membro_atencao_motivo text, p_combinado text, p_faltas jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
  v_cs text := public.cs_do_grupo(p_group_id);
  v_enc record;
  v_ex record;
  v_id uuid;
  v_f record;
  v_item jsonb;
  v_avanco text := trim(coalesce(p_avanco, ''));
  v_motivo text := nullif(trim(coalesce(p_membro_atencao_motivo, '')), '');
  v_comb text := nullif(trim(coalesce(p_combinado, '')), '');
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not v_gestor and (v_meu is null or v_cs is null or lower(v_meu) <> lower(v_cs)) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_enc from public._encontros_relatorio(null, null) e where e.group_id = p_group_id and e.data_encontro = p_data_encontro;
  if not found then raise exception 'encontro não encontrado ou sem relatório exigido' using errcode = 'P0002'; end if;
  if v_cs is null then raise exception 'conselho sem CS responsável cadastrado' using errcode = '22023'; end if;

  if p_avaliacao is null or p_avaliacao not in ('Muito bom', 'Bom', 'Regular', 'Ruim') then raise exception 'avaliação inválida' using errcode = '22023'; end if;
  if char_length(v_avanco) not between 1 and 280 then raise exception 'avanço deve ter de 1 a 280 caracteres' using errcode = '22023'; end if;
  if v_comb is not null and char_length(v_comb) > 280 then raise exception 'combinado com mais de 280 caracteres' using errcode = '22023'; end if;
  if p_membro_atencao_id is not null then
    if v_motivo is null or char_length(v_motivo) > 200 then raise exception 'motivo da atenção deve ter de 1 a 200 caracteres' using errcode = '22023'; end if;
    if not exists (select 1 from public.conselhos_membros m join public.conselhos_status_mensal s on s.membro_id = m.id and s.mes = public.mes_nome_pt(p_data_encontro)
                    where m.id = p_membro_atencao_id and m.group_id = p_group_id and s.status in ('Presente', 'Reposição')) then
      raise exception 'o membro em atenção precisa estar entre os presentes' using errcode = '22023';
    end if;
  else
    v_motivo := null;
  end if;

  select * into v_ex from public.relatorios_conselho r where r.group_id = p_group_id and r.data_encontro = p_data_encontro;
  if found and not v_gestor and now() > v_enc.prazo then
    raise exception 'prazo encerrado: só o gestor edita este relatório' using errcode = '42501';
  end if;

  -- Faltas de quem confirmou exigem categoria e justificativa; desistência avisada é opcional.
  for v_f in select * from public.faltas_do_encontro(p_group_id, p_data_encontro) loop
    select x into v_item from jsonb_array_elements(coalesce(p_faltas, '[]'::jsonb)) x where (x ->> 'membro_id')::bigint = v_f.membro_id limit 1;
    if v_f.tipo = 'falta' then
      if v_item is null or coalesce(v_item ->> 'categoria', '') not in ('Imprevisto profissional', 'Saúde', 'Viagem', 'Esquecimento', 'Sem retorno do membro', 'Outro')
         or char_length(trim(coalesce(v_item ->> 'justificativa', ''))) not between 1 and 200 then
        raise exception 'falta de % exige categoria e justificativa de até 200 caracteres', v_f.nome using errcode = '22023';
      end if;
    end if;
  end loop;

  if v_ex.id is null then
    insert into public.relatorios_conselho (group_id, data_encontro, cs_nome, avaliacao, avanco, membro_atencao_id, membro_atencao_motivo, combinado, enviado_por, atualizado_por)
      values (p_group_id, p_data_encontro, v_cs, p_avaliacao, v_avanco, p_membro_atencao_id, v_motivo, v_comb, v_actor, v_actor)
      returning id into v_id;
  else
    update public.relatorios_conselho
       set avaliacao = p_avaliacao, avanco = v_avanco, membro_atencao_id = p_membro_atencao_id, membro_atencao_motivo = v_motivo,
           combinado = v_comb, atualizado_em = now(), atualizado_por = v_actor
     where id = v_ex.id returning id into v_id;
    delete from public.relatorio_conselho_faltas where relatorio_id = v_id;
  end if;

  insert into public.relatorio_conselho_faltas (relatorio_id, membro_id, membro_nome, tipo, categoria, justificativa)
    select v_id, f.membro_id, f.nome, f.tipo,
           case when (j.item ->> 'categoria') in ('Imprevisto profissional', 'Saúde', 'Viagem', 'Esquecimento', 'Sem retorno do membro', 'Outro') then j.item ->> 'categoria' end,
           left(nullif(trim(coalesce(j.item ->> 'justificativa', '')), ''), 200)
      from public.faltas_do_encontro(p_group_id, p_data_encontro) f
      left join lateral (select x as item from jsonb_array_elements(coalesce(p_faltas, '[]'::jsonb)) x where (x ->> 'membro_id')::bigint = f.membro_id limit 1) j on true;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'salvar_relatorio_conselho', v_id::text, 'success', jsonb_build_object('group_id', p_group_id, 'data_encontro', p_data_encontro, 'edicao', v_ex.id is not null));
  return v_id;
end;
$$;
revoke all on function public.salvar_relatorio_conselho(text, timestamptz, text, text, bigint, text, text, jsonb) from public, anon;
grant execute on function public.salvar_relatorio_conselho(text, timestamptz, text, text, bigint, text, text, jsonb) to authenticated;

-- 7. Faltas por membro (categoria mais frequente) ------------------------------------------------------------------
create or replace function public.faltas_por_membro_conselho(p_group_id text)
returns table(membro_id bigint, membro_nome text, faltas integer, categoria_mais_frequente text, ultima_falta timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select rf.membro_id, max(rf.membro_nome), count(*)::int, mode() within group (order by rf.categoria), max(r.data_encontro)
    from public.relatorio_conselho_faltas rf join public.relatorios_conselho r on r.id = rf.relatorio_id
   where r.group_id = p_group_id and rf.tipo = 'falta' and public.is_moai_user()
   group by rf.membro_id
   order by count(*) desc, max(rf.membro_nome);
$$;
revoke all on function public.faltas_por_membro_conselho(text) from public, anon;
grant execute on function public.faltas_por_membro_conselho(text) to authenticated;

-- 8. Regularidade do relatório nas últimas 8 semanas (um quadrado por encontro) ----------------------------------
create or replace function public.regularidade_relatorio_cs(p_cs text, p_semanas integer default 8)
returns table(semana_inicio date, estado text, horas_atraso numeric)
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_gestor boolean := public.is_gestor();
  v_meu text := public.meu_cs();
begin
  if not public.is_moai_user() then raise exception 'not authorized' using errcode = '42501'; end if;
  if not v_gestor and (v_meu is null or lower(v_meu) <> lower(p_cs)) then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select date_trunc('week', e.data_encontro at time zone 'America/Sao_Paulo')::date,
         case e.estado when 'a_preencher' then 'pendente' when 'vence_hoje' then 'pendente' else e.estado end,
         case when e.estado = 'enviado_com_atraso' then round((extract(epoch from (e.enviado_em - e.prazo)) / 3600)::numeric, 1)
              when e.estado = 'atrasado' then round((extract(epoch from (now() - e.prazo)) / 3600)::numeric, 1) else null end
    from public._encontros_relatorio(p_cs, null) e
   where e.data_encontro >= now() - make_interval(weeks => greatest(p_semanas, 1))
   order by e.data_encontro;
end;
$$;
revoke all on function public.regularidade_relatorio_cs(text, integer) from public, anon;
grant execute on function public.regularidade_relatorio_cs(text, integer) to authenticated;

-- 9. Pontos automáticos também pelo relatório do conselho ------------------------------------------------------------
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
  -- report semanal: semanas cujo prazo (sexta 19h) já passou, a partir do corte
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
  -- relatório do conselho: prazo vencido sem envio no prazo, de CS ativo, uma vez por encontro
  for r in
    select e.group_id, e.conselho, e.cs_nome, e.data_encontro from public._encontros_relatorio(null, null) e
      join public.cs_config c on c.nome = e.cs_nome and c.ativo
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
