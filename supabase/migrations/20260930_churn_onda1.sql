-- Onda 1 do churn (pedido do Vitor, 30/09/2026): inteligência de churn na visão do gestor.
--
-- O que muda:
--   1. churn_items ganha só colunas categóricas (motivo_principal, created_at_monday,
--      board_group_id, cs_categoria) e a coluna gerada data_referencia. Nenhuma delas identifica
--      um membro, então a policy de SELECT continua is_moai_user(), como já era.
--   2. churn_detalhes guarda o que identifica o membro (nome, empresa) e os textos livres do
--      formulário. Leitura só para gestor; escrita só pela Edge Function (service role).
--   3. churn_analises guarda a análise de cada recorte: rascunho da IA (texto_ia) separado do
--      texto que o gestor salvou (texto_gestor). O relatório só usa texto_gestor.
--   4. churn_cs_classificacao classifica os valores do campo "Quem é o seu CS?" que não estão em
--      cs_config (ex CS sem conta, Comunidade, High End, Comercial, N/D). Alejandro e Lucas
--      entram como ex CS por decisão do Vitor em 30/09/2026. Não mexemos em
--      EX_MEMBROS_SEM_CONTA (lib/constants.ts) para não alterar os números já exibidos na home.
--   5. Funções: semana_do_mes (regra única de semana), churn_filtrados (filtro único do recorte),
--      churn_serie, churn_recorte_hash, churn_itens_recorte, churn_termos_identificaveis e as RPCs
--      de escrita reservar_geracao_churn_ia, registrar_rascunho_churn_ia, salvar_churn_analise e
--      publicar_churn_analise.
--
-- Achado do diagnóstico: 155 das 218 linhas de churn_items tinham data nula (os 153 itens do grupo
-- Finalizados, criados de out/2025 a mai/2026, nunca receberam a coluna Data). Por isso a data de
-- referência é coalesce(data, dia de criação no Monday em horário de Brasília), nunca synced_at.
-- Os indicadores antigos da home (parseChurn em lib/reports.ts) continuam lendo só a coluna data.

-- ============ 1. churn_items ============
alter table public.churn_items
  add column if not exists motivo_principal text,
  add column if not exists created_at_monday timestamptz,
  add column if not exists board_group_id text,
  add column if not exists cs_categoria text;

alter table public.churn_items
  add column if not exists data_referencia date
  generated always as (coalesce(data, (created_at_monday at time zone 'America/Sao_Paulo')::date)) stored;

create index if not exists churn_items_data_referencia_idx on public.churn_items (data_referencia);

-- ============ 2. classificação dos valores de "Quem é o seu CS?" ============
create table if not exists public.churn_cs_classificacao (
  valor text primary key,
  categoria text not null check (categoria in ('cs_ex', 'nao_cs', 'nao_informado')),
  observacao text,
  atualizado_em timestamptz not null default now()
);
alter table public.churn_cs_classificacao enable row level security;
drop policy if exists moai_select on public.churn_cs_classificacao;
create policy moai_select on public.churn_cs_classificacao for select to authenticated using (public.is_moai_user());

insert into public.churn_cs_classificacao (valor, categoria, observacao) values
  ('Luma', 'cs_ex', 'EX_MEMBROS_SEM_CONTA'),
  ('Lanna', 'cs_ex', 'EX_MEMBROS_SEM_CONTA'),
  ('Vinicius W.', 'cs_ex', 'EX_MEMBROS_SEM_CONTA'),
  ('Yasmim', 'cs_ex', 'EX_MEMBROS_SEM_CONTA'),
  ('Alejandro', 'cs_ex', 'Decisão do Vitor em 30/09/2026'),
  ('Lucas', 'cs_ex', 'Decisão do Vitor em 30/09/2026'),
  ('Comunidade', 'nao_cs', null),
  ('High End', 'nao_cs', null),
  ('Comercial', 'nao_cs', null),
  ('N/D', 'nao_informado', null),
  ('Não sei informar', 'nao_informado', null)
on conflict (valor) do nothing;

-- cs_ativo quando o valor bate com um CS ativo de cs_config; cs_ex quando bate com um CS inativo
-- de cs_config ou com a tabela acima; nao_classificado quando aparecer um valor novo no dropdown
-- do Monday que ninguém classificou ainda (fica visível no gráfico em vez de sumir calado).
create or replace function public.churn_classificar_cs(p_valor text)
returns text
language sql stable
set search_path = public
as $function$
  select case
    when nullif(trim(coalesce(p_valor, '')), '') is null then 'nao_informado'
    when exists (select 1 from public.cs_config c where lower(c.nome) = lower(trim(p_valor)) and c.ativo) then 'cs_ativo'
    when exists (select 1 from public.cs_config c where lower(c.nome) = lower(trim(p_valor))) then 'cs_ex'
    else coalesce(
      (select k.categoria from public.churn_cs_classificacao k where lower(k.valor) = lower(trim(p_valor))),
      'nao_classificado')
  end;
$function$;

-- Deriva cs_categoria e garante motivo_principal preenchido em todo insert/update, venha a linha
-- da Edge Function ou de um backfill. Como o sync faz upsert de todas as linhas a cada 5 minutos,
-- uma mudança em cs_config (CS que sai do time) reclassifica o histórico no ciclo seguinte.
create or replace function public.churn_items_derivar()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.cs_categoria := public.churn_classificar_cs(new.quem_e_seu_cs);
  new.motivo_principal := coalesce(nullif(trim(coalesce(new.motivo_principal, '')), ''), 'nao_informado');
  return new;
end;
$function$;

drop trigger if exists trg_churn_items_derivar on public.churn_items;
create trigger trg_churn_items_derivar
  before insert or update on public.churn_items
  for each row execute function public.churn_items_derivar();

-- backfill de cs_categoria (motivo_principal real só chega com o próximo sync da Edge Function)
update public.churn_items set quem_e_seu_cs = quem_e_seu_cs;

-- ============ 3. churn_detalhes (identificável, só gestor lê) ============
create table if not exists public.churn_detalhes (
  churn_id bigint primary key references public.churn_items(id) on delete cascade,
  membro_nome text,
  empresa text,
  explicacao text,
  expectativa_nao_atendida text,
  sugestao_melhoria text,
  nota_retorno numeric check (nota_retorno is null or (nota_retorno >= 0 and nota_retorno <= 10)),
  synced_at timestamptz not null default now()
);
alter table public.churn_detalhes enable row level security;
drop policy if exists gestor_select on public.churn_detalhes;
create policy gestor_select on public.churn_detalhes for select to authenticated using (public.is_gestor());

-- ============ 4. churn_analises ============
create table if not exists public.churn_analises (
  id uuid primary key default gen_random_uuid(),
  periodo_tipo text not null check (periodo_tipo in ('mes', 'semana', 'intervalo')),
  data_inicio date not null,
  data_fim date not null,
  filtro_cs text,
  filtro_produto text,
  filtro_cs_categoria text,
  texto_ia text,
  texto_gestor text,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  base_hash text,
  modelo_ia text,
  gerado_em timestamptz,
  editado_por text,
  editado_em timestamptz,
  criado_em timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create unique index if not exists churn_analises_recorte_uidx on public.churn_analises
  (periodo_tipo, data_inicio, data_fim, coalesce(filtro_cs, ''), coalesce(filtro_produto, ''), coalesce(filtro_cs_categoria, ''));
alter table public.churn_analises enable row level security;
drop policy if exists gestor_select on public.churn_analises;
create policy gestor_select on public.churn_analises for select to authenticated using (public.is_gestor());

-- Nenhuma policy de insert/update/delete nas tabelas novas. Revogação explícita por cima disso,
-- mesma defesa em profundidade: escrita só por service role (Edge Function) e pelas funções
-- SECURITY DEFINER abaixo.
revoke insert, update, delete, truncate on public.churn_detalhes, public.churn_analises, public.churn_cs_classificacao from anon, authenticated;

-- ============ 5. funções de leitura ============
-- Regra única de semana do mês: 1 a 7 é semana 1, 8 a 14 semana 2, 15 a 21 semana 3,
-- 22 a 28 semana 4, 29 em diante semana 5.
create or replace function public.semana_do_mes(p_data date)
returns integer
language sql immutable parallel safe
set search_path = ''
as $function$
  select case when p_data is null then null else least(5, ((extract(day from p_data)::int - 1) / 7) + 1) end;
$function$;

-- Filtro único do recorte, usado pela série, pelo hash e pelos itens. SECURITY INVOKER: a RLS de
-- churn_items (is_moai_user) continua valendo para quem chama.
create or replace function public.churn_filtrados(p_inicio date, p_fim date, p_cs text, p_produto text, p_cs_categoria text)
returns setof public.churn_items
language sql stable
set search_path = public
as $function$
  select c.* from public.churn_items c
  where c.data_referencia between p_inicio and p_fim
    and (p_cs is null or lower(c.quem_e_seu_cs) = lower(p_cs))
    and (p_produto is null
         or (p_produto = '__sem_produto__' and c.produto is null)
         or c.produto = p_produto)
    and (p_cs_categoria is null or c.cs_categoria = p_cs_categoria);
$function$;

-- Série de churn por mês ou por semana do mês, quebrada por motivo. Gestor vê qualquer recorte;
-- CS comum (vínculo em cs_usuarios) só enxerga o próprio churn, mesma regra de dono do resto do
-- app (meu_cs, lib/auth.ts); qualquer outro usuário é recusado. Todo período do intervalo aparece
-- no resultado, mesmo sem churn (linha com motivo nulo e qtd 0), para o gráfico não pular barras.
create or replace function public.churn_serie(
  p_granularidade text, p_inicio date, p_fim date,
  p_cs text default null, p_produto text default null, p_cs_categoria text default null)
returns table (periodo_inicio date, periodo_fim date, semana integer, motivo text, qtd integer)
language plpgsql stable
set search_path = public
as $function$
declare
  v_cs text := p_cs;
  v_meu_cs text;
begin
  if not coalesce(public.is_gestor(), false) then
    v_meu_cs := public.meu_cs();
    if v_meu_cs is null then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    v_cs := v_meu_cs;
  end if;
  if p_granularidade is null or p_granularidade not in ('mes', 'semana') then
    raise exception 'granularidade precisa ser mes ou semana' using errcode = '22023';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 1100 then
    raise exception 'período inválido' using errcode = '22023';
  end if;

  return query
  with meses as (
    select m::date as mes
    from generate_series(date_trunc('month', p_inicio), date_trunc('month', p_fim), interval '1 month') m
  ), periodos as (
    select mes as ini, (mes + interval '1 month' - interval '1 day')::date as fim, null::integer as sem
    from meses where p_granularidade = 'mes'
    union all
    select (mes + (s - 1) * 7) as ini,
           least(mes + (s - 1) * 7 + 6, (mes + interval '1 month' - interval '1 day')::date) as fim,
           s as sem
    from meses cross join generate_series(1, 5) s
    where p_granularidade = 'semana'
      and mes + (s - 1) * 7 <= (mes + interval '1 month' - interval '1 day')::date
  ), base as (
    select f.data_referencia, f.motivo_principal
    from public.churn_filtrados(p_inicio, p_fim, v_cs, p_produto, p_cs_categoria) f
  ), contagem as (
    select p.ini, p.sem, b.motivo_principal as mot, count(*)::integer as n
    from periodos p
    join base b on date_trunc('month', b.data_referencia) = date_trunc('month', p.ini)
               and (p.sem is null or public.semana_do_mes(b.data_referencia) = p.sem)
    group by p.ini, p.sem, b.motivo_principal
  )
  select p.ini, p.fim, p.sem, c.mot, coalesce(c.n, 0)
  from periodos p
  left join contagem c on c.ini = p.ini and c.sem is not distinct from p.sem
  order by p.ini, c.mot;
end;
$function$;

-- Hash dos ids do recorte: permite avisar que a análise ficou desatualizada quando entram (ou
-- saem) churns do período depois da geração.
create or replace function public.churn_recorte_hash(p_inicio date, p_fim date, p_cs text, p_produto text, p_cs_categoria text)
returns text
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (
    select md5(coalesce(string_agg(f.id::text, ',' order by f.id), ''))
    from public.churn_filtrados(p_inicio, p_fim, p_cs, p_produto, p_cs_categoria) f
  );
end;
$function$;

-- Itens do recorte com os dados sensíveis, para o contexto da IA e para a versão identificada do
-- relatório. Só gestor.
create or replace function public.churn_itens_recorte(p_inicio date, p_fim date, p_cs text, p_produto text, p_cs_categoria text)
returns table (
  id bigint, data_referencia date, quem_e_seu_cs text, cs_categoria text, produto text,
  motivo_principal text, membro_nome text, empresa text, explicacao text,
  expectativa_nao_atendida text, sugestao_melhoria text, nota_retorno numeric)
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select f.id, f.data_referencia, f.quem_e_seu_cs, f.cs_categoria, f.produto, f.motivo_principal,
         d.membro_nome, d.empresa, d.explicacao, d.expectativa_nao_atendida, d.sugestao_melhoria, d.nota_retorno
  from public.churn_filtrados(p_inicio, p_fim, p_cs, p_produto, p_cs_categoria) f
  left join public.churn_detalhes d on d.churn_id = f.id
  order by f.data_referencia, f.id;
end;
$function$;

-- Todos os nomes de membro e empresas conhecidos, para a anonimização do relatório e do contexto
-- da IA (um texto livre pode citar outro membro, não só o do próprio item). Só gestor.
create or replace function public.churn_termos_identificaveis()
returns table (termo text)
language plpgsql stable security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select distinct t from (
    select nullif(trim(membro_nome), '') as t from public.churn_detalhes
    union all
    select nullif(trim(empresa), '') from public.churn_detalhes
  ) x
  where t is not null;
end;
$function$;

-- ============ 6. RPCs de escrita (gestor) ============
create or replace function public.churn_validar_recorte(p_periodo_tipo text, p_inicio date, p_fim date, p_cs_categoria text)
returns void
language plpgsql immutable
set search_path = public
as $function$
begin
  if p_periodo_tipo is null or p_periodo_tipo not in ('mes', 'semana', 'intervalo') then
    raise exception 'periodo_tipo inválido' using errcode = '22023';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 1100 then
    raise exception 'período inválido' using errcode = '22023';
  end if;
  if p_cs_categoria is not null and p_cs_categoria not in ('cs_ativo', 'cs_ex', 'nao_cs', 'nao_informado', 'nao_classificado') then
    raise exception 'categoria de CS inválida' using errcode = '22023';
  end if;
end;
$function$;

-- Limite de uma geração de rascunho a cada 10 segundos por gestor, contado na própria trilha de
-- auditoria (mesmo princípio de rate_limit_por_auditoria do projeto). A rota chama esta função
-- ANTES de chamar a API da Anthropic. O advisory lock serializa duas chamadas simultâneas do
-- mesmo gestor, que de outro modo passariam as duas pela checagem.
create or replace function public.reservar_geracao_churn_ia(p_resource text)
returns void
language plpgsql security definer
set search_path = public
as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('churn_ia|' || lower(v_actor)));
  if exists (
    select 1 from public.access_audit_log
    where lower(user_email) = lower(v_actor) and action = 'churn_analise_ia'
      and created_at > now() - interval '10 seconds'
  ) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'churn_analise_ia', left(p_resource, 200), 'reservado', '{}'::jsonb);
end;
$function$;

create or replace function public.registrar_rascunho_churn_ia(
  p_periodo_tipo text, p_inicio date, p_fim date, p_filtro_cs text, p_filtro_produto text,
  p_filtro_cs_categoria text, p_texto_ia text, p_modelo_ia text)
returns uuid
language plpgsql security definer
set search_path = public
as $function$
declare
  v_id uuid;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform public.churn_validar_recorte(p_periodo_tipo, p_inicio, p_fim, p_filtro_cs_categoria);
  if nullif(trim(coalesce(p_texto_ia, '')), '') is null or length(p_texto_ia) > 30000 then
    raise exception 'texto da IA vazio ou longo demais' using errcode = '22023';
  end if;

  insert into public.churn_analises (periodo_tipo, data_inicio, data_fim, filtro_cs, filtro_produto, filtro_cs_categoria,
                                     texto_ia, base_hash, modelo_ia, gerado_em)
  values (p_periodo_tipo, p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria, p_texto_ia,
          public.churn_recorte_hash(p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria),
          left(p_modelo_ia, 100), now())
  on conflict (periodo_tipo, data_inicio, data_fim, coalesce(filtro_cs, ''), coalesce(filtro_produto, ''), coalesce(filtro_cs_categoria, ''))
  do update set texto_ia = excluded.texto_ia, base_hash = excluded.base_hash,
                modelo_ia = excluded.modelo_ia, gerado_em = excluded.gerado_em
  returning id into v_id;

  perform public.log_access('registrar_rascunho_churn_ia', 'success', jsonb_build_object('analise_id', v_id),
                            p_periodo_tipo || '|' || p_inicio || '|' || p_fim);
  return v_id;
end;
$function$;

-- Salva o texto do gestor (é o único texto que o relatório usa). Salvar sempre volta o status para
-- rascunho: uma análise publicada que foi editada precisa ser publicada de novo.
create or replace function public.salvar_churn_analise(
  p_periodo_tipo text, p_inicio date, p_fim date, p_filtro_cs text, p_filtro_produto text,
  p_filtro_cs_categoria text, p_texto_gestor text)
returns uuid
language plpgsql security definer
set search_path = public
as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_id uuid;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform public.churn_validar_recorte(p_periodo_tipo, p_inicio, p_fim, p_filtro_cs_categoria);
  if nullif(trim(coalesce(p_texto_gestor, '')), '') is null or length(p_texto_gestor) > 30000 then
    raise exception 'texto vazio ou longo demais' using errcode = '22023';
  end if;

  insert into public.churn_analises (periodo_tipo, data_inicio, data_fim, filtro_cs, filtro_produto, filtro_cs_categoria,
                                     texto_gestor, status, base_hash, editado_por, editado_em)
  values (p_periodo_tipo, p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria, p_texto_gestor, 'rascunho',
          public.churn_recorte_hash(p_inicio, p_fim, p_filtro_cs, p_filtro_produto, p_filtro_cs_categoria),
          v_actor, now())
  on conflict (periodo_tipo, data_inicio, data_fim, coalesce(filtro_cs, ''), coalesce(filtro_produto, ''), coalesce(filtro_cs_categoria, ''))
  do update set texto_gestor = excluded.texto_gestor, status = 'rascunho', base_hash = excluded.base_hash,
                editado_por = excluded.editado_por, editado_em = excluded.editado_em
  returning id into v_id;

  perform public.log_access('salvar_churn_analise', 'success', jsonb_build_object('analise_id', v_id),
                            p_periodo_tipo || '|' || p_inicio || '|' || p_fim);
  return v_id;
end;
$function$;

create or replace function public.publicar_churn_analise(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.churn_analises
     set status = 'publicada', editado_por = auth.jwt() ->> 'email', editado_em = now()
   where id = p_id and nullif(trim(coalesce(texto_gestor, '')), '') is not null;
  if not found then
    raise exception 'análise inexistente ou sem texto salvo pelo gestor' using errcode = '22023';
  end if;
  perform public.log_access('publicar_churn_analise', 'success', jsonb_build_object('analise_id', p_id), p_id::text);
end;
$function$;

-- ============ 7. permissões de execução ============
revoke execute on function public.churn_classificar_cs(text) from public, anon;
revoke execute on function public.churn_items_derivar() from public, anon, authenticated;
revoke execute on function public.churn_filtrados(date, date, text, text, text) from public, anon;
revoke execute on function public.churn_serie(text, date, date, text, text, text) from public, anon;
revoke execute on function public.churn_recorte_hash(date, date, text, text, text) from public, anon;
revoke execute on function public.churn_itens_recorte(date, date, text, text, text) from public, anon;
revoke execute on function public.churn_termos_identificaveis() from public, anon;
revoke execute on function public.churn_validar_recorte(text, date, date, text) from public, anon;
revoke execute on function public.reservar_geracao_churn_ia(text) from public, anon;
revoke execute on function public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text) from public, anon;
revoke execute on function public.salvar_churn_analise(text, date, date, text, text, text, text) from public, anon;
revoke execute on function public.publicar_churn_analise(uuid) from public, anon;

grant execute on function public.churn_classificar_cs(text) to authenticated;
grant execute on function public.churn_filtrados(date, date, text, text, text) to authenticated;
grant execute on function public.churn_serie(text, date, date, text, text, text) to authenticated;
grant execute on function public.churn_recorte_hash(date, date, text, text, text) to authenticated;
grant execute on function public.churn_itens_recorte(date, date, text, text, text) to authenticated;
grant execute on function public.churn_termos_identificaveis() to authenticated;
grant execute on function public.churn_validar_recorte(text, date, date, text) to authenticated;
grant execute on function public.reservar_geracao_churn_ia(text) to authenticated;
grant execute on function public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text) to authenticated;
grant execute on function public.salvar_churn_analise(text, date, date, text, text, text, text) to authenticated;
grant execute on function public.publicar_churn_analise(uuid) to authenticated;
