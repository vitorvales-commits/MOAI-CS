-- Já aplicada em produção (moai-cs-dashboard) em 29/09/2026 via MCP, em blocos sucessivos.
-- Versionada agora, sem ser executada de novo. Camada de banco do sistema de metas definidas pelo
-- gestor no dash + controle de indicadores da home + recordes — feature ainda em andamento: esta
-- migração cobre só o banco (tabelas, resolução com herança, funções de recorde, RPCs de escrita e
-- a reescrita de metas_cs_base/consultar_metas_cs). A camada de app (lib/reports.ts, front-end da
-- home/página do CS/tela do gestor, nova intenção em lib/consulta.ts) é um commit separado, ainda
-- pendente no momento deste commit.
--
-- ATENÇÃO — efeito colateral já ativo em produção: metas_cs_base/consultar_metas_cs (usadas pela
-- consulta rápida da visão de gestor) já leem a resolução nova com herança. Isso muda o resultado
-- pra CS que tinham meta definida num mês passado e pararam de redefinir sem zerar explicitamente
-- (ex.: Rodrigo tinha churn=1 e downsell=0 definidos em julho/agosto de 2026, sem linha de meta em
-- setembro — antes isso significava "sem meta em setembro", agora a herança traz o valor de
-- agosto pra frente, então setembro passa a ter meta de churn/downsell também, e como o realizado
-- de setembro supera os dois, o resultado registrado como "5 de 5 metas batidas" na sessão anterior
-- passa a incluir mais indicadores com meta, alguns não batidos). Isso é a herança funcionando como
-- pedido, não um bug — documentado aqui e em handoff/consulta_metas.pl pra não ser reportado como
-- regressão depois.

-- ============================================================================
-- 1) Tabelas
-- ============================================================================
create table public.indicadores_catalogo (
  chave text primary key,
  rotulo text not null,
  unidade text not null check (unidade in ('contagem','reais','pontos')),
  direcao text not null check (direcao in ('min','max')),
  fonte text not null check (fonte in ('calculado','manual')),
  agregacao_time text not null check (agregacao_time in ('linha_unica','soma')),
  criado_em timestamptz not null default now()
);
alter table public.indicadores_catalogo enable row level security;
create policy moai_select on public.indicadores_catalogo for select using (public.is_moai_user());
grant select on public.indicadores_catalogo to authenticated;

create table public.config_home_indicadores (
  indicador text primary key references public.indicadores_catalogo(chave),
  visivel boolean not null default false,
  ordem integer not null default 999,
  exibir_recorde boolean not null default true,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
alter table public.config_home_indicadores enable row level security;
create policy moai_select on public.config_home_indicadores for select using (public.is_moai_user());
grant select on public.config_home_indicadores to authenticated;

create table public.metas_definidas (
  id uuid primary key default gen_random_uuid(),
  indicador text not null references public.indicadores_catalogo(chave),
  mes date not null,
  escopo text not null check (escopo in ('time','cs')),
  cs_nome text,
  valor numeric not null check (valor >= 0),
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  constraint metas_definidas_escopo_cs_coerente check (
    (escopo = 'time' and cs_nome is null) or (escopo = 'cs' and cs_nome is not null)
  )
);
create unique index metas_definidas_unica_idx on public.metas_definidas (indicador, mes, escopo, coalesce(cs_nome, ''));
create index metas_definidas_busca_idx on public.metas_definidas (indicador, escopo, coalesce(cs_nome, ''), mes desc);
alter table public.metas_definidas enable row level security;
create policy moai_select on public.metas_definidas for select using (public.is_moai_user());
grant select on public.metas_definidas to authenticated;

create table public.recordes_manuais (
  id uuid primary key default gen_random_uuid(),
  indicador text not null references public.indicadores_catalogo(chave),
  escopo text not null check (escopo in ('time','cs')),
  cs_nome text,
  valor numeric not null,
  mes_referencia date not null,
  observacao text,
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  constraint recordes_manuais_escopo_cs_coerente check (
    (escopo = 'time' and cs_nome is null) or (escopo = 'cs' and cs_nome is not null)
  )
);
create unique index recordes_manuais_unica_idx on public.recordes_manuais (indicador, escopo, coalesce(cs_nome, ''));
alter table public.recordes_manuais enable row level security;
create policy moai_select on public.recordes_manuais for select using (public.is_moai_user());
grant select on public.recordes_manuais to authenticated;

-- Catálogo fixo (sem tela de criação) — direção/fonte/agregação conferidas lendo lib/reports.ts
-- (metas_cs_base/generateCSReport/generateEquipeReport), não uma lista arbitrária:
-- direção máxima (menos é melhor): churn, revenue_churn, downsell, suspensoes, critico.
-- fonte calculado: os 7 que já têm branch de cálculo em metas_cs_base (cases, matchmakings,
-- rounds, churn, indicacoes, upsell, downsell) + carteira (calculado em TS a partir da contagem
-- de conselhos, metaCarteiraEfetiva/calcularScoreCS — nunca populado por esta função SQL). fonte
-- manual: revenue_churn e health_base (sem branch de cálculo em metas_cs_base hoje — confirmado) e
-- presenca/suspensoes/critico (sem nenhuma computação em lib/reports.ts hoje, nomes herdados do
-- board de Metas do Monday). agregacao_time linha_unica: cases/rounds/upsell/downsell podem ter
-- mais de um CS na mesma linha (cs_raw/cs_responsavel_raw separados por vírgula) —
-- contarCasesUnicosTime/contarRoundsUnicosTime/contarUpsellDownsellUnicosTime já contam cada linha
-- uma vez, nunca por CS. Os demais são soma direta (uma linha pertence a exatamente um CS).
insert into public.indicadores_catalogo (chave, rotulo, unidade, direcao, fonte, agregacao_time) values
  ('cases', 'Cases de Sucesso', 'contagem', 'min', 'calculado', 'linha_unica'),
  ('matchmakings', 'Matchmakings', 'contagem', 'min', 'calculado', 'soma'),
  ('rounds', 'Rounds', 'contagem', 'min', 'calculado', 'linha_unica'),
  ('indicacoes', 'Indicações', 'contagem', 'min', 'calculado', 'soma'),
  ('upsell', 'Upsell', 'contagem', 'min', 'calculado', 'linha_unica'),
  ('downsell', 'Downsell', 'contagem', 'max', 'calculado', 'linha_unica'),
  ('churn', 'Churn', 'contagem', 'max', 'calculado', 'soma'),
  ('revenue_churn', 'Revenue Churn', 'reais', 'max', 'manual', 'soma'),
  ('health_base', 'Health da Base', 'pontos', 'min', 'manual', 'soma'),
  ('carteira', 'Carteira', 'contagem', 'min', 'calculado', 'soma'),
  ('presenca', 'Presença nos conselhos', 'contagem', 'min', 'manual', 'soma'),
  ('suspensoes', 'Suspensões', 'contagem', 'max', 'manual', 'soma'),
  ('critico', 'Críticos', 'contagem', 'max', 'manual', 'soma');

-- Seis cards que hoje aparecem na home (app/dashboard-html.ts, renderEquipe), visíveis e na ordem
-- atual. Padrão de exibir_recorde: true pra meta mínima, false pra limite máximo (pedido do
-- Vitor) — aplicado a todos os 13, não só os 6 visíveis.
insert into public.config_home_indicadores (indicador, visivel, ordem, exibir_recorde) values
  ('churn', true, 1, false),
  ('revenue_churn', true, 2, false),
  ('cases', true, 3, true),
  ('matchmakings', true, 4, true),
  ('rounds', true, 5, true),
  ('health_base', true, 6, true),
  ('indicacoes', false, 7, true),
  ('upsell', false, 8, true),
  ('downsell', false, 9, false),
  ('carteira', false, 10, true),
  ('presenca', false, 11, true),
  ('suspensoes', false, 12, false),
  ('critico', false, 13, false);

-- ============================================================================
-- 2) Carga inicial de metas_definidas
-- ============================================================================
-- Escopo cs, a partir de metas_subitens (mes_grupo_para_data/metrica_canonica já existiam, da
-- migração 20260929_consulta_metas_cs). cs_nome resolvido sem diferenciar caixa via cs_config.nome.
-- Ignora linhas sem meta. Conferido: 143 metas semeadas = 143 combinações distintas de
-- (cs, mês, indicador) com meta em metas_subitens.
insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
select ind.chave, m.mes, 'cs', s.nome, m.meta, 'carga_inicial_metas_subitens'
from (
  select s.nome as cs_nome_bruto,
         public.mes_grupo_para_data(ms.mes_grupo_titulo) as mes,
         public.metrica_canonica(ms.item_metrica) as metrica,
         max(ms.meta) as meta
  from metas_subitens ms
  join cs_config s on lower(trim(s.nome)) = lower(trim(ms.cs_nome))
  where ms.meta is not null
  group by 1, 2, 3
) m
join cs_config s on lower(trim(s.nome)) = lower(trim(m.cs_nome_bruto))
join indicadores_catalogo ind on ind.chave = m.metrica
on conflict (indicador, mes, escopo, coalesce(cs_nome, '')) do nothing;

-- Escopo time, mês corrente: valor vigente = soma das metas individuais desse mês (único jeito
-- que a meta do time existia até aqui — generateEquipeReport, somaInd). A partir desta carga a
-- meta do time é independente; isto é só o valor inicial pra não mudar o texto/status exibido na
-- home no dia da migração. Só semeados os indicadores que hoje resolvem a um valor não nulo
-- (churn/revenue_churn/health_base não têm nenhuma meta individual em setembro/2026 — confirmado
-- ao vivo — então continuam "sem meta"/Acompanhar).
insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
select ind.chave, date_trunc('month', current_date)::date, 'time', null, soma.valor, 'carga_inicial_soma_individuais_vigente'
from (
  select public.metrica_canonica(ms.item_metrica) as metrica, sum(ms.meta) as valor
  from metas_subitens ms
  where ms.meta is not null
    and public.mes_grupo_para_data(ms.mes_grupo_titulo) = date_trunc('month', current_date)::date
  group by 1
) soma
join indicadores_catalogo ind on ind.chave = soma.metrica
on conflict (indicador, mes, escopo, coalesce(cs_nome, '')) do nothing;

-- ============================================================================
-- 3) Resolução com herança (visão/função reutilizável)
-- ============================================================================
-- Vigência mensal com herança: a meta de um mês é o valor definido pra aquele mês e, se não
-- houver, o do mês definido mais recente anterior, e se não houver, sem meta.
create or replace function public.resolver_meta(p_indicador text, p_escopo text, p_cs_nome text, p_mes date)
returns table (valor numeric, mes_origem date)
language sql stable set search_path = public as $$
  select md.valor, md.mes
  from public.metas_definidas md
  where md.indicador = p_indicador
    and md.escopo = p_escopo
    and coalesce(md.cs_nome, '') = coalesce(p_cs_nome, '')
    and md.mes <= date_trunc('month', p_mes)::date
  order by md.mes desc
  limit 1
$$;

-- Leitura em lote pro período de interesse da UI (seletor de mês/ano vai até 2027) — evita N
-- chamadas a resolver_meta por relatório. Mesma regra de herança.
create or replace function public.metas_resolvidas_periodo(p_mes_inicio date, p_mes_fim date)
returns table (mes date, escopo text, cs_nome text, indicador text, valor numeric, mes_origem date)
language sql stable set search_path = public as $$
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
$$;

revoke all on function public.resolver_meta(text,text,text,date) from public, anon;
grant execute on function public.resolver_meta(text,text,text,date) to authenticated, service_role;
revoke all on function public.metas_resolvidas_periodo(date,date) from public, anon;
grant execute on function public.metas_resolvidas_periodo(date,date) to authenticated, service_role;

-- ============================================================================
-- 4) Histórico e recorde
-- ============================================================================
-- Normalização de nome equivalente a normalizeNome (lib/reports.ts): minúsculo, sem acento, sem
-- espaço nas pontas.
create or replace function public.normalizar_nome_sql(t text)
returns text language sql immutable as $$
  select lower(trim(translate(coalesce(t,''),
    'áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN')))
$$;

-- Série histórica mensal de um indicador calculado, no escopo time (cada linha contada uma vez —
-- pedido do Vitor) ou no escopo de um CS (mesma regra de atribuição de generateCSReport/
-- generateEquipeReport: cases/rounds/upsell/downsell por nome_completo em cs_raw/
-- cs_responsavel_raw — comma-split, igualdade exata, igual nomeBateColunaPessoa —,
-- matchmakings/indicações por creator_id=monday_user_id, churn por quem_e_seu_cs). Ignora sempre
-- linha sem data em churn/upsell/downsell/indicações. Indicadores sem branch aqui (carteira,
-- presenca, suspensoes, critico, health_base, revenue_churn) devolvem conjunto vazio de
-- propósito — não têm valor calculado nas tabelas espelhadas hoje.
create or replace function public.historico_indicador(p_indicador text, p_escopo text, p_cs_nome text)
returns table (mes date, realizado numeric)
language plpgsql stable set search_path = public as $function$
declare
  v_nome_completo text;
  v_monday_user_id bigint;
begin
  if p_escopo = 'cs' then
    select nome_completo, monday_user_id into v_nome_completo, v_monday_user_id
    from public.cs_config where lower(trim(nome)) = lower(trim(coalesce(p_cs_nome,'')));
    if v_nome_completo is null then return; end if;
  end if;

  if p_indicador = 'cases' then
    return query
      select public.mes_grupo_para_data(c.mes_grupo_titulo), count(*)::numeric
      from public.cases_items c
      where public.mes_grupo_para_data(c.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(c.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'rounds' then
    return query
      select public.mes_grupo_para_data(r.mes_grupo_titulo), count(*)::numeric
      from public.rounds_items r
      where r.status = 'Realizado' and public.mes_grupo_para_data(r.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(r.cs_responsavel_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'matchmakings' then
    return query
      select public.mes_grupo_para_data(m.mes_grupo_titulo), count(*)::numeric
      from public.matchmakings_items m
      where public.mes_grupo_para_data(m.mes_grupo_titulo) is not null
        and (p_escopo = 'time' or m.creator_id = v_monday_user_id)
      group by 1;
  elsif p_indicador = 'churn' then
    return query
      select date_trunc('month', c.data)::date, count(*)::numeric
      from public.churn_items c
      where c.data is not null and coalesce(c.quem_e_seu_cs,'') not in ('Comunidade','N/D')
        and (p_escopo = 'time' or lower(trim(c.quem_e_seu_cs)) = lower(trim(coalesce(p_cs_nome,''))))
      group by 1;
  elsif p_indicador = 'upsell' then
    return query
      select date_trunc('month', u.data)::date, count(*)::numeric
      from public.upsell_downsell_items u
      where u.data is not null and u.status = 'Finalizado' and u.tipo_troca ilike 'upsell%'
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(u.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'downsell' then
    return query
      select date_trunc('month', u.data)::date, count(*)::numeric
      from public.upsell_downsell_items u
      where u.data is not null and u.status = 'Finalizado' and u.tipo_troca ilike 'downsell%'
        and (p_escopo = 'time' or exists (
          select 1 from unnest(string_to_array(u.cs_raw, ',')) t
          where public.normalizar_nome_sql(t) = public.normalizar_nome_sql(v_nome_completo)
        ))
      group by 1;
  elsif p_indicador = 'indicacoes' then
    return query
      select date_trunc('month', coalesce(rs.data, rs.created_at_monday::date))::date, sum(coalesce(rs.indicacoes,0))::numeric
      from public.reports_semanais_items rs
      where coalesce(rs.data, rs.created_at_monday::date) is not null
        and (p_escopo = 'time' or rs.creator_id = v_monday_user_id)
      group by 1;
  end if;
  return;
end;
$function$;

-- Recorde efetivo: melhor entre o calculado (só meses fechados, só quando aplicável pela
-- direção/exibir_recorde) e o manual em recordes_manuais.
create or replace function public.recorde_efetivo(p_indicador text, p_escopo text, p_cs_nome text)
returns table (valor numeric, mes date, fonte text)
language plpgsql stable set search_path = public as $function$
declare
  v_direcao text;
  v_exibir_recorde boolean;
  v_calc_valor numeric;
  v_calc_mes date;
  v_manual_valor numeric;
  v_manual_mes date;
begin
  select ic.direcao, coalesce(chi.exibir_recorde, true)
    into v_direcao, v_exibir_recorde
  from public.indicadores_catalogo ic
  left join public.config_home_indicadores chi on chi.indicador = ic.chave
  where ic.chave = p_indicador;
  if v_direcao is null then return; end if;

  if v_direcao = 'min' or (v_direcao = 'max' and v_exibir_recorde) then
    if v_direcao = 'min' then
      select h.realizado, h.mes into v_calc_valor, v_calc_mes
      from public.historico_indicador(p_indicador, p_escopo, p_cs_nome) h
      where h.mes < date_trunc('month', current_date)::date
      order by h.realizado desc, h.mes asc limit 1;
    else
      select h.realizado, h.mes into v_calc_valor, v_calc_mes
      from public.historico_indicador(p_indicador, p_escopo, p_cs_nome) h
      where h.mes < date_trunc('month', current_date)::date
      order by h.realizado asc, h.mes asc limit 1;
    end if;
  end if;

  select rm.valor, rm.mes_referencia into v_manual_valor, v_manual_mes
  from public.recordes_manuais rm
  where rm.indicador = p_indicador and rm.escopo = p_escopo and coalesce(rm.cs_nome,'') = coalesce(p_cs_nome,'');

  if v_calc_valor is null and v_manual_valor is null then return; end if;
  if v_calc_valor is null then valor := v_manual_valor; mes := v_manual_mes; fonte := 'manual'; return next; return; end if;
  if v_manual_valor is null then valor := v_calc_valor; mes := v_calc_mes; fonte := 'calculado'; return next; return; end if;

  if (v_direcao = 'min' and v_manual_valor > v_calc_valor) or (v_direcao = 'max' and v_manual_valor < v_calc_valor) then
    valor := v_manual_valor; mes := v_manual_mes; fonte := 'manual';
  else
    valor := v_calc_valor; mes := v_calc_mes; fonte := 'calculado';
  end if;
  return next;
end;
$function$;

revoke all on function public.historico_indicador(text,text,text) from public, anon;
grant execute on function public.historico_indicador(text,text,text) to authenticated, service_role;
revoke all on function public.recorde_efetivo(text,text,text) from public, anon;
grant execute on function public.recorde_efetivo(text,text,text) to authenticated, service_role;

-- Metas do time por mês: meta (resolver_meta, escopo time), realizado (historico_indicador,
-- escopo time), status e recorde (recorde_efetivo). Mesmo vocabulário de status de
-- metas_cs_base/consultar_metas_cs (bateu, nao_bateu, sem_meta) — usada pela consulta rápida e
-- pela matriz de metas do gestor.
create or replace function public.metas_time_mensal(p_mes date default null)
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
      select rm.valor, rm.mes_origem into v_meta, v_meta_origem from public.resolver_meta(r.chave, 'time', null, v_mes) rm;
      select h.realizado into v_realizado from public.historico_indicador(r.chave, 'time', null) h where h.mes = v_mes;
      select re.valor, re.mes into v_rec_valor, v_rec_mes from public.recorde_efetivo(r.chave, 'time', null) re;

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

revoke all on function public.metas_time_mensal(date) from public, anon;
grant execute on function public.metas_time_mensal(date) to authenticated, service_role;

-- ============================================================================
-- 5) metas_cs_base passa a ler a resolução nova (mesma assinatura)
-- ============================================================================
-- O "alcançado" autodeclarado no Monday (metas_subitens.alcancado) continua sendo lido — é um
-- relato daquele mês específico, sem herança, e o board de Metas do Monday só vira legado pra
-- definição de META (decisão do Vitor); não há ainda outro lugar pra registrar autodeclarado,
-- então esta é a única leitura de metas_subitens que sobrevive ao corte, e só pro mês exato, nunca
-- pra resolver meta. 'carteira' fica de fora de propósito: seu realizado (contagem de conselhos
-- por apelido) é calculado em TypeScript, não é expressável aqui sem duplicar aquela lógica de
-- casamento de título.
create or replace function public.metas_cs_base(p_cs text default null, p_mes date default null)
returns table (
  cs text, mes date, metrica text, direcao text,
  meta numeric, alcancado_manual numeric, realizado_calculado numeric,
  realizado numeric, fonte text, status text, percentual numeric, divergencia boolean
)
language plpgsql stable set search_path = public as $function$
declare
  v_mes date := date_trunc('month', coalesce(p_mes, current_date))::date;
begin
  return query
  with alvo_cs as (
    select s.nome as cs, s.nome_completo, s.monday_user_id
    from public.cs_config s
    where (p_cs is null or lower(s.nome) = lower(trim(p_cs)) or lower(s.nome_completo) like '%'||lower(trim(p_cs))||'%')
  ),
  manual as (
    select s.nome as cs, public.metrica_canonica(ms.item_metrica) as metrica, max(ms.alcancado) as alcancado_manual
    from public.metas_subitens ms
    join public.cs_config s on lower(trim(s.nome)) = lower(trim(ms.cs_nome))
    where public.mes_grupo_para_data(ms.mes_grupo_titulo) = v_mes and ms.alcancado is not null
      and (p_cs is null or lower(s.nome) = lower(trim(p_cs)) or lower(s.nome_completo) like '%'||lower(trim(p_cs))||'%')
    group by 1, 2
  ),
  chaves as (
    select ac.cs, ac.nome_completo, ac.monday_user_id, ic.chave as metrica, ic.direcao
    from alvo_cs ac
    cross join public.indicadores_catalogo ic
    where ic.chave <> 'carteira'
      and (
        exists (select 1 from public.resolver_meta(ic.chave, 'cs', ac.cs, v_mes))
        or exists (select 1 from manual mn where mn.cs = ac.cs and mn.metrica = ic.chave)
      )
  ),
  f as (
    select k.cs, k.nome_completo, k.monday_user_id, v_mes as mes, k.metrica, k.direcao,
      (select rm.valor from public.resolver_meta(k.metrica, 'cs', k.cs, v_mes) rm) as meta,
      (select mn.alcancado_manual from manual mn where mn.cs = k.cs and mn.metrica = k.metrica) as alcancado_manual
    from chaves k
  ),
  c as (
    select f.*,
      case f.metrica
        when 'cases' then (select count(*) from public.cases_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        when 'matchmakings' then (select count(*) from public.matchmakings_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.creator_id=f.monday_user_id)
        when 'rounds' then (select count(*) from public.rounds_items x where public.mes_grupo_para_data(x.mes_grupo_titulo)=f.mes and x.status='Realizado' and lower(x.cs_responsavel_raw) like '%'||lower(f.nome_completo)||'%')
        when 'churn' then (select count(*) from public.churn_items x where date_trunc('month',x.data)=f.mes and lower(trim(x.quem_e_seu_cs)) like lower(f.cs)||'%')
        when 'indicacoes' then (select coalesce(sum(x.indicacoes),0) from public.reports_semanais_items x where x.creator_id=f.monday_user_id and date_trunc('month',coalesce(x.data,x.created_at_monday::date))=f.mes)
        when 'upsell' then (select count(*) from public.upsell_downsell_items x where lower(x.tipo_troca) like 'upsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        when 'downsell' then (select count(*) from public.upsell_downsell_items x where lower(x.tipo_troca) like 'downsell%' and date_trunc('month',x.data)=f.mes and lower(x.cs_raw) like '%'||lower(f.nome_completo)||'%')
        else null end as calc
    from f
  )
  select c.cs, c.mes, c.metrica, c.direcao, c.meta, c.alcancado_manual, c.calc::numeric,
    coalesce(c.calc::numeric, c.alcancado_manual, 0) as realizado,
    case when c.calc is not null then 'calculado' when c.alcancado_manual is not null then 'manual' else 'sem_dado' end as fonte,
    case
      when c.meta is null then 'sem_meta'
      when c.direcao='min' and coalesce(c.calc::numeric, c.alcancado_manual, 0) >= c.meta then 'bateu'
      when c.direcao='max' and coalesce(c.calc::numeric, c.alcancado_manual, 0) <= c.meta then 'bateu'
      else 'nao_bateu' end as status,
    case when c.meta is null or c.meta = 0 then null
      else round(100 * coalesce(c.calc::numeric, c.alcancado_manual, 0) / c.meta, 0) end as percentual,
    (c.calc is not null and c.alcancado_manual is not null and c.calc::numeric <> c.alcancado_manual) as divergencia
  from c
  order by c.cs, c.metrica;
end;
$function$;

-- ============================================================================
-- 6) RPCs de escrita do gestor
-- ============================================================================
-- coalesce(is_gestor(), false) em todas — nunca "if not is_gestor()" puro, porque IF com NULL não
-- dispara a exceção em PL/pgSQL. Todas gravam UMA linha em access_audit_log por chamada (não uma
-- por item do lote), porque o trigger trg_write_rate_limit limita 60 escritas por minuto por
-- usuário.

create or replace function public.definir_metas_lote(p_mes date, p_itens jsonb)
returns integer
language plpgsql set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_mes date := date_trunc('month', p_mes)::date;
  v_item jsonb;
  v_indicador text; v_escopo text; v_cs_nome text; v_valor numeric;
  v_total integer := 0;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'p_itens precisa ser um array jsonb' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_indicador := v_item ->> 'indicador';
    v_escopo := v_item ->> 'escopo';
    v_cs_nome := nullif(trim(coalesce(v_item ->> 'cs_nome', '')), '');
    if not (v_item ? 'valor') or jsonb_typeof(v_item -> 'valor') not in ('number') then
      raise exception 'valor precisa ser numérico (indicador %, escopo %)', v_indicador, v_escopo using errcode = '22023';
    end if;
    v_valor := (v_item ->> 'valor')::numeric;

    if not exists (select 1 from public.indicadores_catalogo where chave = v_indicador) then
      raise exception 'indicador "%" não existe no catálogo', v_indicador using errcode = '22023';
    end if;
    if v_escopo not in ('time', 'cs') then
      raise exception 'escopo precisa ser "time" ou "cs" (recebido "%")', v_escopo using errcode = '22023';
    end if;
    if v_valor < 0 then
      raise exception 'valor não pode ser negativo (indicador %)', v_indicador using errcode = '22023';
    end if;
    if v_escopo = 'time' and v_cs_nome is not null then
      raise exception 'escopo time não leva cs_nome' using errcode = '22023';
    end if;
    if v_escopo = 'cs' then
      if v_cs_nome is null then
        raise exception 'escopo cs exige cs_nome' using errcode = '22023';
      end if;
      if not exists (select 1 from public.cs_config where lower(nome) = lower(v_cs_nome)) then
        raise exception 'CS "%" não encontrado', v_cs_nome using errcode = '22023';
      end if;
    end if;

    insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
      values (v_indicador, v_mes, v_escopo, v_cs_nome, v_valor, v_actor)
    on conflict (indicador, mes, escopo, coalesce(cs_nome, ''))
      do update set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = now();
    v_total := v_total + 1;
  end loop;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_metas_lote', to_char(v_mes, 'YYYY-MM'), 'success', jsonb_build_object('itens', v_total));

  return v_total;
end;
$function$;

create or replace function public.copiar_metas_mes(p_de date, p_para date)
returns integer
language plpgsql set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_de date := date_trunc('month', p_de)::date;
  v_para date := date_trunc('month', p_para)::date;
  v_total integer;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_de = v_para then
    raise exception 'mês de origem e destino não podem ser o mesmo' using errcode = '22023';
  end if;

  with inseridos as (
    insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
    select indicador, v_para, escopo, cs_nome, valor, v_actor
    from public.metas_definidas
    where mes = v_de
    on conflict (indicador, mes, escopo, coalesce(cs_nome, '')) do nothing
    returning 1
  )
  select count(*) into v_total from inseridos;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'copiar_metas_mes', to_char(v_de,'YYYY-MM') || '->' || to_char(v_para,'YYYY-MM'), 'success', jsonb_build_object('copiadas', v_total));

  return v_total;
end;
$function$;

create or replace function public.configurar_home_indicadores(p_itens jsonb)
returns integer
language plpgsql set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_item jsonb;
  v_indicador text;
  v_total integer := 0;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'p_itens precisa ser um array jsonb' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_indicador := v_item ->> 'indicador';
    if not exists (select 1 from public.indicadores_catalogo where chave = v_indicador) then
      raise exception 'indicador "%" não existe no catálogo', v_indicador using errcode = '22023';
    end if;
    if jsonb_typeof(v_item -> 'visivel') <> 'boolean' or jsonb_typeof(v_item -> 'exibirRecorde') <> 'boolean' then
      raise exception 'visivel e exibirRecorde precisam ser booleanos (indicador %)', v_indicador using errcode = '22023';
    end if;
    if jsonb_typeof(v_item -> 'ordem') <> 'number' then
      raise exception 'ordem precisa ser numérica (indicador %)', v_indicador using errcode = '22023';
    end if;

    insert into public.config_home_indicadores (indicador, visivel, ordem, exibir_recorde, atualizado_por)
      values (v_indicador, (v_item ->> 'visivel')::boolean, (v_item ->> 'ordem')::integer, (v_item ->> 'exibirRecorde')::boolean, v_actor)
    on conflict (indicador) do update set
      visivel = excluded.visivel, ordem = excluded.ordem, exibir_recorde = excluded.exibir_recorde,
      atualizado_por = excluded.atualizado_por, atualizado_em = now();
    v_total := v_total + 1;
  end loop;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'configurar_home_indicadores', 'config_home_indicadores', 'success', jsonb_build_object('itens', v_total));

  return v_total;
end;
$function$;

create or replace function public.definir_recorde_manual(
  p_indicador text, p_escopo text, p_cs text, p_valor numeric, p_mes date, p_obs text
)
returns void
language plpgsql set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_cs_nome text := nullif(trim(coalesce(p_cs, '')), '');
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.indicadores_catalogo where chave = p_indicador) then
    raise exception 'indicador "%" não existe no catálogo', p_indicador using errcode = '22023';
  end if;
  if p_escopo not in ('time', 'cs') then
    raise exception 'escopo precisa ser "time" ou "cs"' using errcode = '22023';
  end if;
  if p_escopo = 'cs' and v_cs_nome is null then
    raise exception 'escopo cs exige cs' using errcode = '22023';
  end if;
  if p_escopo = 'time' and v_cs_nome is not null then
    raise exception 'escopo time não leva cs' using errcode = '22023';
  end if;
  if p_escopo = 'cs' and not exists (select 1 from public.cs_config where lower(nome) = lower(v_cs_nome)) then
    raise exception 'CS "%" não encontrado', v_cs_nome using errcode = '22023';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor precisa ser numérico e não negativo' using errcode = '22023';
  end if;
  if p_mes is null then
    raise exception 'mes_referencia é obrigatório' using errcode = '22023';
  end if;

  insert into public.recordes_manuais (indicador, escopo, cs_nome, valor, mes_referencia, observacao, atualizado_por)
    values (p_indicador, p_escopo, v_cs_nome, p_valor, date_trunc('month', p_mes)::date, p_obs, v_actor)
  on conflict (indicador, escopo, coalesce(cs_nome, ''))
    do update set valor = excluded.valor, mes_referencia = excluded.mes_referencia,
      observacao = excluded.observacao, atualizado_por = excluded.atualizado_por, atualizado_em = now();

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_recorde_manual', p_indicador || '|' || p_escopo || coalesce('|'||v_cs_nome,''), 'success', jsonb_build_object('valor', p_valor, 'mes_referencia', p_mes));
end;
$function$;

revoke all on function public.definir_metas_lote(date, jsonb) from public, anon;
grant execute on function public.definir_metas_lote(date, jsonb) to authenticated, service_role;
revoke all on function public.copiar_metas_mes(date, date) from public, anon;
grant execute on function public.copiar_metas_mes(date, date) to authenticated, service_role;
revoke all on function public.configurar_home_indicadores(jsonb) from public, anon;
grant execute on function public.configurar_home_indicadores(jsonb) to authenticated, service_role;
revoke all on function public.definir_recorde_manual(text, text, text, numeric, date, text) from public, anon;
grant execute on function public.definir_recorde_manual(text, text, text, numeric, date, text) to authenticated, service_role;
