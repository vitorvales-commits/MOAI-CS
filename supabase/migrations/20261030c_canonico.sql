-- ============================================================================
-- Normativa de dados, etapa 3: camada canônica (30/10/2026)
--
-- Identidade única para pessoas (CS) e para conselhos. Nada é copiado das tabelas espelhadas: a camada
-- guarda identidades e vínculos, e as views ligam os fatos existentes a essas identidades.
--
-- O que muda (aditivo, exceto a seção de seguranca):
--   canonico.normalizar(text)            texto sem acento, sem caixa, com espaços colapsados
--   canonico.cs                          uma linha por pessoa que foi CS
--   canonico.cs_apelidos                 cada grafia conhecida e a sua classe (cs, area, ignorar)
--   canonico.vinculos_pendentes          grafias sem dono, com ocorrências e sugestão (atualizada de hora em hora)
--   canonico.conselho_cs_vigencia        quem era CS de cada conselho em cada período, sem sobreposição
--   canonico.mes_de_titulo(titulo, ano)  mês de um título de grupo, com a mesma regra de lib/cs-periodos.ts
--   canonico.v_*                         uma view por fonte, com a chave, o texto original e os cs_ids resolvidos
--   canonico.v_cobertura                 indicador de qualidade por fonte
--   public.canonico_*                    funções para o app (time MOAI e gestor)
--
-- Seguranca: seguranca.aplicar_protecoes e a view de não classificados passam a aceitar nomes
-- qualificados com schema (ex.: canonico.cs). As linhas existentes, sem schema, continuam iguais.
--
-- Regra permanente: toda tabela nova entra em seguranca.catalogo_tabelas e a migração termina com
-- select seguranca.aplicar_protecoes(); a view seguranca.v_tabelas_sem_classificacao precisa estar vazia.
-- ============================================================================

create extension if not exists btree_gist with schema extensions;
create schema if not exists canonico;
revoke all on schema canonico from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Normalização de texto. Imutável: só translate, lower e expressões regulares.
-- ---------------------------------------------------------------------------
create or replace function canonico.normalizar(t text) returns text
language sql immutable strict set search_path = '' as $fn$
  select btrim(
    regexp_replace(
      regexp_replace(
        translate(lower(t), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
        '\s+', ' ', 'g'),
      '^[^[:alnum:]]+|[^[:alnum:]]+$', '', 'g'));
$fn$;

-- Equivale a normalizarMes em lib/cs-periodos.ts: separa por caracteres não alfanuméricos, tira acentos,
-- pega o primeiro token que é nome de mês e o primeiro token de quatro dígitos como ano. Sem mês: nulo.
create or replace function canonico.mes_de_titulo(titulo text, ano_padrao int) returns date
language sql immutable set search_path = '' as $fn$
  with tokens as (
    select s.tok, s.ord
    from regexp_split_to_table(
      translate(lower(coalesce(titulo, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
      '[^a-z0-9]+') with ordinality as s(tok, ord)
    where s.tok <> ''
  ),
  mes as (
    select array_position(
             array['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
             t.tok) as idx
    from tokens t
    where array_position(
             array['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
             t.tok) is not null
    order by t.ord
    limit 1
  ),
  ano as (
    select t.tok::int as a from tokens t where t.tok ~ '^[0-9]{4}$' order by t.ord limit 1
  )
  select make_date(coalesce((select a from ano), ano_padrao), (select idx from mes), 1)
  where exists (select 1 from mes);
$fn$;

-- ---------------------------------------------------------------------------
-- Identidade das pessoas
-- ---------------------------------------------------------------------------
create table if not exists canonico.cs (
  id              bigint generated always as identity primary key,
  nome_curto      text not null,
  nome_completo   text,
  monday_user_id  bigint unique,
  email           text,
  cs_config_id    integer references public.cs_config(id),
  ativo           boolean not null default false,
  criado_em       timestamptz not null default now()
);
create unique index if not exists cs_nome_curto_normalizado_key on canonico.cs (canonico.normalizar(nome_curto));

insert into canonico.cs (nome_curto, nome_completo, monday_user_id, email, cs_config_id, ativo)
select c.nome, c.nome_completo, c.monday_user_id, c.email, c.id, coalesce(c.ativo, false)
from public.cs_config c
on conflict do nothing;

insert into canonico.cs (nome_curto, nome_completo, ativo)
select p.nome_curto, p.nome_completo, false
from public.cs_periodos p
on conflict do nothing;

create table if not exists canonico.cs_apelidos (
  texto_normalizado text primary key,
  cs_id             bigint references canonico.cs(id),
  classe            text not null check (classe in ('cs', 'area', 'ignorar')),
  origem            text not null,
  confirmado        boolean not null default false,
  criado_em         timestamptz not null default now(),
  constraint cs_apelidos_cs_exige_id check ((classe = 'cs') = (cs_id is not null))
);

-- Grafias de cada pessoa: nome curto, nome completo, apelido do conselho, e-mail e aliases de cs_periodos.
insert into canonico.cs_apelidos (texto_normalizado, cs_id, classe, origem, confirmado)
select canonico.normalizar(x.texto), x.cs_id, 'cs', x.origem, true
from (
  select c.nome_curto as texto, c.id as cs_id, 'nome_curto' as origem from canonico.cs c
  union all
  select c.nome_completo, c.id, 'nome_completo' from canonico.cs c where c.nome_completo is not null
  union all
  select cc.apelido_conselho, c.id, 'apelido_conselho'
  from public.cs_config cc join canonico.cs c on c.cs_config_id = cc.id
  where cc.apelido_conselho is not null
  union all
  select c.email, c.id, 'email' from canonico.cs c where c.email is not null
  union all
  select a.alias, c.id, 'alias_periodo'
  from public.cs_periodos p
  cross join lateral unnest(coalesce(p.aliases, '{}'::text[])) as a(alias)
  join canonico.cs c on canonico.normalizar(c.nome_curto) = canonico.normalizar(p.nome_curto)
) x
where canonico.normalizar(x.texto) <> ''
on conflict (texto_normalizado) do nothing;

-- Áreas e grafias que não identificam pessoa.
insert into canonico.cs_apelidos (texto_normalizado, cs_id, classe, origem, confirmado)
select canonico.normalizar(v.texto), null, v.classe, 'manual', true
from (values
  ('Comercial', 'area'),
  ('Comunidade', 'area'),
  ('High End', 'area'),
  ('N/D', 'ignorar'),
  ('Contato MOAI', 'ignorar'),
  ('Membro excluído', 'ignorar'),
  ('', 'ignorar')
) as v(texto, classe)
on conflict (texto_normalizado) do nothing;

-- ---------------------------------------------------------------------------
-- Resolução: sem efeito colateral.
-- ---------------------------------------------------------------------------
create or replace function canonico.classe_de(p_texto text) returns text
language sql stable set search_path = '' as $fn$
  select coalesce(
    (select a.classe from canonico.cs_apelidos a where a.texto_normalizado = canonico.normalizar(p_texto)),
    case when coalesce(canonico.normalizar(p_texto), '') = '' then 'ignorar' else 'pendente' end);
$fn$;

create or replace function canonico.resolver_cs(p_texto text) returns bigint
language sql stable set search_path = '' as $fn$
  select a.cs_id from canonico.cs_apelidos a
  where a.texto_normalizado = canonico.normalizar(p_texto) and a.classe = 'cs';
$fn$;

create or replace function canonico.resolver_cs_lista(p_texto text) returns bigint[]
language sql stable set search_path = '' as $fn$
  select coalesce(array_agg(distinct a.cs_id order by a.cs_id), '{}'::bigint[])
  from canonico.cs_apelidos a
  where a.classe = 'cs'
    and a.texto_normalizado in (
      select canonico.normalizar(x) from regexp_split_to_table(coalesce(p_texto, ''), ',') as x
    );
$fn$;

-- Campo com vários nomes: pendente se algum nome estiver pendente; senão cs; senão area; senão ignorar.
create or replace function canonico.classe_lista(p_texto text) returns text
language sql stable set search_path = '' as $fn$
  with k as (
    select canonico.classe_de(x) as classe from regexp_split_to_table(coalesce(p_texto, ''), ',') as x
  )
  select case
    when bool_or(classe = 'pendente') then 'pendente'
    when bool_or(classe = 'cs') then 'cs'
    when bool_or(classe = 'area') then 'area'
    else 'ignorar' end
  from k;
$fn$;

-- ---------------------------------------------------------------------------
-- Vínculos pendentes: grafias sem dono, com ocorrências e sugestão por primeiro nome.
-- ---------------------------------------------------------------------------
create table if not exists canonico.vinculos_pendentes (
  tipo              text not null check (tipo in ('texto', 'monday_user_id')),
  texto_original    text not null,
  texto_normalizado text not null,
  fontes            text[] not null,
  ocorrencias       integer not null,
  primeira_vez      date,
  ultima_vez        date,
  sugestao_cs_id    bigint references canonico.cs(id),
  primary key (tipo, texto_normalizado)
);

-- Reconstrói as pendências a partir das fontes. Preserva primeira_vez e remove o que já tem dono.
create or replace function canonico.atualizar_pendencias() returns integer
language sql volatile set search_path = '' as $fn$
  with origem as (
    select 'texto'::text as tipo, 'churn_items.quem_e_seu_cs'::text as fonte, c.quem_e_seu_cs as bruto, c.synced_at::date as dia
    from public.churn_items c
    union all
    select 'texto', 'metas_subitens.cs_nome', m.cs_nome, m.synced_at::date from public.metas_subitens m
    union all
    select 'texto', 'cases_items.cs_raw', x.v, c.synced_at::date
    from public.cases_items c cross join lateral regexp_split_to_table(coalesce(c.cs_raw, ''), ',') as x(v)
    union all
    select 'texto', 'upsell_downsell_items.cs_raw', x.v, u.synced_at::date
    from public.upsell_downsell_items u cross join lateral regexp_split_to_table(coalesce(u.cs_raw, ''), ',') as x(v)
    union all
    select 'texto', 'rounds_items.cs_responsavel_raw', x.v, r.synced_at::date
    from public.rounds_items r cross join lateral regexp_split_to_table(coalesce(r.cs_responsavel_raw, ''), ',') as x(v)
    union all
    select 'monday_user_id', 'reports_semanais_items.creator_id', r.creator_id::text, r.synced_at::date
    from public.reports_semanais_items r where r.creator_id is not null
    union all
    select 'monday_user_id', 'matchmakings_items.creator_id', m.creator_id::text, m.synced_at::date
    from public.matchmakings_items m where m.creator_id is not null
  ),
  pendentes as (
    select o.tipo, o.fonte, o.bruto as texto_original, canonico.normalizar(o.bruto) as texto_normalizado, o.dia
    from origem o
    where coalesce(canonico.normalizar(o.bruto), '') <> ''
      and not exists (select 1 from canonico.cs_apelidos a where a.texto_normalizado = canonico.normalizar(o.bruto))
      and case when o.tipo = 'monday_user_id'
            then not exists (select 1 from canonico.cs c where c.monday_user_id::text = o.bruto)
            else true end
  ),
  ins as (
    insert into canonico.vinculos_pendentes as v
      (tipo, texto_original, texto_normalizado, fontes, ocorrencias, primeira_vez, ultima_vez, sugestao_cs_id)
    select p.tipo, min(p.texto_original), p.texto_normalizado, array_agg(distinct p.fonte order by p.fonte),
           count(*), min(p.dia), max(p.dia),
           case when p.tipo = 'texto' then
             (select case when count(*) = 1 then min(c.id) end from canonico.cs c
              where canonico.normalizar(c.nome_curto) = split_part(p.texto_normalizado, ' ', 1))
           end
    from pendentes p
    group by p.tipo, p.texto_normalizado
    on conflict (tipo, texto_normalizado) do update set
      texto_original = excluded.texto_original,
      fontes = excluded.fontes,
      ocorrencias = excluded.ocorrencias,
      ultima_vez = excluded.ultima_vez,
      sugestao_cs_id = excluded.sugestao_cs_id
    returning 1
  ),
  removidas as (
    delete from canonico.vinculos_pendentes v
    where not exists (select 1 from pendentes p where p.tipo = v.tipo and p.texto_normalizado = v.texto_normalizado)
    returning 1
  )
  select ((select count(*) from ins) + (select count(*) from removidas))::integer;
$fn$;

-- ---------------------------------------------------------------------------
-- Carteira por conselho: quem era CS de cada conselho em cada período.
-- ---------------------------------------------------------------------------
create table if not exists canonico.conselho_cs_vigencia (
  id            bigint generated always as identity primary key,
  group_id      text not null references public.conselhos_grupos(group_id),
  cs_id         bigint not null references canonico.cs(id),
  vigencia      daterange not null,
  origem        text not null check (origem in ('retrato_inicial', 'titulo_do_grupo', 'manual')),
  registrado_em timestamptz not null default now(),
  constraint conselho_cs_vigencia_sem_sobreposicao exclude using gist (group_id with =, vigencia with &&)
);

-- CS do título: o apelido entre parênteses no fim do título do grupo ("Produto | Contato (Apelido)").
create or replace function canonico.cs_do_titulo(p_titulo text) returns bigint
language sql stable set search_path = '' as $fn$
  select canonico.resolver_cs(substring(p_titulo from '\(([^()]*)\)\s*$'));
$fn$;

-- Carga inicial: cada grupo ativo (não congelado e que não é de reposição) com o CS do título, em vigência
-- aberta desde o início dos tempos.
insert into canonico.conselho_cs_vigencia (group_id, cs_id, vigencia, origem)
select g.group_id, canonico.cs_do_titulo(g.titulo), daterange('-infinity'::date, null), 'retrato_inicial'
from public.conselhos_grupos g
where g.congelado is not true and g.is_repo is not true
  and canonico.cs_do_titulo(g.titulo) is not null;

-- Diário: fecha a vigência aberta no dia anterior quando o CS do título muda ou o grupo deixa de ser
-- ativo, e abre uma nova a partir de hoje. Nunca apaga: o conselho que sai fica com a vigência fechada.
create or replace function canonico.registrar_carteira() returns integer
language plpgsql set search_path = '' as $fn$
declare
  r record;
  v_aberta record;
  v_desejado bigint;
  v_alteracoes integer := 0;
begin
  for r in select g.group_id, g.titulo, g.congelado, g.is_repo from public.conselhos_grupos g loop
    select * into v_aberta from canonico.conselho_cs_vigencia v
      where v.group_id = r.group_id and upper(v.vigencia) is null;

    if r.congelado is true or r.is_repo is true then
      v_desejado := null;
    else
      v_desejado := canonico.cs_do_titulo(r.titulo);
      if v_desejado is null then continue; end if;
    end if;

    if v_aberta.id is not null and (v_desejado is null or v_desejado <> v_aberta.cs_id) then
      update canonico.conselho_cs_vigencia
        set vigencia = daterange(lower(vigencia), current_date)
        where id = v_aberta.id;
      v_alteracoes := v_alteracoes + 1;
    end if;

    if v_desejado is not null and (v_aberta.id is null or v_desejado <> v_aberta.cs_id) then
      insert into canonico.conselho_cs_vigencia (group_id, cs_id, vigencia, origem)
      values (r.group_id, v_desejado, daterange(current_date, null), 'titulo_do_grupo');
      v_alteracoes := v_alteracoes + 1;
    end if;
  end loop;
  return v_alteracoes;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Views por fonte. Cada uma expõe: chave, texto original, cs_ids resolvidos, classe e data ou mês.
-- Para mes_grupo_titulo, o ano padrão é o ano do registro (synced_at).
-- ---------------------------------------------------------------------------
create or replace view canonico.v_churn with (security_invoker = true) as
select c.id as chave,
       c.quem_e_seu_cs as cs_texto_original,
       case when canonico.resolver_cs(c.quem_e_seu_cs) is not null
            then array[canonico.resolver_cs(c.quem_e_seu_cs)] else '{}'::bigint[] end as cs_ids,
       canonico.classe_de(c.quem_e_seu_cs) as classe,
       c.data_referencia as data_referencia,
       null::date as mes
from public.churn_items c;

create or replace view canonico.v_cases with (security_invoker = true) as
select c.id as chave,
       c.cs_raw as cs_texto_original,
       canonico.resolver_cs_lista(c.cs_raw) as cs_ids,
       canonico.classe_lista(c.cs_raw) as classe,
       null::date as data_referencia,
       canonico.mes_de_titulo(c.mes_grupo_titulo, coalesce(extract(year from c.synced_at)::int, extract(year from now())::int)) as mes
from public.cases_items c;

create or replace view canonico.v_upsell_downsell with (security_invoker = true) as
select u.id as chave,
       u.cs_raw as cs_texto_original,
       canonico.resolver_cs_lista(u.cs_raw) as cs_ids,
       canonico.classe_lista(u.cs_raw) as classe,
       u.data as data_referencia,
       null::date as mes
from public.upsell_downsell_items u;

create or replace view canonico.v_rounds with (security_invoker = true) as
select r.id as chave,
       r.cs_responsavel_raw as cs_texto_original,
       canonico.resolver_cs_lista(r.cs_responsavel_raw) as cs_ids,
       canonico.classe_lista(r.cs_responsavel_raw) as classe,
       null::date as data_referencia,
       canonico.mes_de_titulo(r.mes_grupo_titulo, coalesce(extract(year from r.synced_at)::int, extract(year from now())::int)) as mes
from public.rounds_items r;

create or replace view canonico.v_metas with (security_invoker = true) as
select m.id as chave,
       m.cs_nome as cs_texto_original,
       case when canonico.resolver_cs(m.cs_nome) is not null
            then array[canonico.resolver_cs(m.cs_nome)] else '{}'::bigint[] end as cs_ids,
       canonico.classe_de(m.cs_nome) as classe,
       null::date as data_referencia,
       canonico.mes_de_titulo(m.mes_grupo_titulo, coalesce(extract(year from m.synced_at)::int, extract(year from now())::int)) as mes
from public.metas_subitens m;

create or replace view canonico.v_reports_semanais with (security_invoker = true) as
select r.id as chave,
       r.creator_id::text as cs_texto_original,
       coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = r.creator_id), '{}'::bigint[]) as cs_ids,
       case when r.creator_id is null then 'ignorar'
            when exists (select 1 from canonico.cs c where c.monday_user_id = r.creator_id) then 'cs'
            else 'pendente' end as classe,
       r.data as data_referencia,
       null::date as mes
from public.reports_semanais_items r;

create or replace view canonico.v_matchmakings with (security_invoker = true) as
select m.id as chave,
       m.creator_id::text as cs_texto_original,
       coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.creator_id), '{}'::bigint[]) as cs_ids,
       case when m.creator_id is null then 'ignorar'
            when exists (select 1 from canonico.cs c where c.monday_user_id = m.creator_id) then 'cs'
            else 'pendente' end as classe,
       m.data as data_referencia,
       canonico.mes_de_titulo(m.mes_grupo_titulo, coalesce(extract(year from m.synced_at)::int, extract(year from now())::int)) as mes
from public.matchmakings_items m;

create or replace view canonico.v_historico_gtd with (security_invoker = true) as
select h.id as chave,
       h.cs_responsavel as cs_texto_original,
       case when canonico.resolver_cs(h.cs_responsavel) is not null
            then array[canonico.resolver_cs(h.cs_responsavel)] else '{}'::bigint[] end as cs_ids,
       canonico.classe_de(h.cs_responsavel) as classe,
       h.data_conselho as data_referencia,
       null::date as mes
from public.historico_conselhos_items h;

-- Indicador de qualidade. Resolvido = identidade atribuída (cs, area ou ignorar). Pendente = sem dono.
create or replace view canonico.v_cobertura with (security_invoker = true) as
with fontes as (
  select 'churn_items' as fonte, v.classe from canonico.v_churn v
  union all select 'cases_items', v.classe from canonico.v_cases v
  union all select 'upsell_downsell_items', v.classe from canonico.v_upsell_downsell v
  union all select 'rounds_items', v.classe from canonico.v_rounds v
  union all select 'metas_subitens', v.classe from canonico.v_metas v
  union all select 'reports_semanais_items', v.classe from canonico.v_reports_semanais v
  union all select 'matchmakings_items', v.classe from canonico.v_matchmakings v
  union all select 'historico_conselhos_items', v.classe from canonico.v_historico_gtd v
)
select f.fonte,
       count(*) as total,
       count(*) filter (where f.classe = 'cs') as cs,
       count(*) filter (where f.classe = 'area') as area,
       count(*) filter (where f.classe = 'ignorar') as ignorar,
       count(*) filter (where f.classe = 'pendente') as pendente,
       case when count(*) = 0 then 100::numeric
            else round(100.0 * count(*) filter (where f.classe <> 'pendente') / count(*), 2) end as pct_resolvido
from fontes f
group by f.fonte;

-- ---------------------------------------------------------------------------
-- Funções para o app. O schema canonico não é exposto na API: o acesso é por estas funções.
-- ---------------------------------------------------------------------------
create or replace function public.canonico_cobertura()
returns table (fonte text, total bigint, cs bigint, area bigint, ignorar bigint, pendente bigint, pct_resolvido numeric)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_moai_user() then raise exception 'Acesso restrito ao time MOAI.'; end if;
  return query
    select v.fonte, v.total, v.cs, v.area, v.ignorar, v.pendente, v.pct_resolvido
    from canonico.v_cobertura v
    order by v.fonte;
end;
$fn$;

create or replace function public.canonico_pendencias()
returns table (tipo text, texto_original text, texto_normalizado text, fontes text[], ocorrencias integer,
               primeira_vez date, ultima_vez date, sugestao_cs_id bigint, sugestao_nome text)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_moai_user() then raise exception 'Acesso restrito ao time MOAI.'; end if;
  return query
    select p.tipo, p.texto_original, p.texto_normalizado, p.fontes, p.ocorrencias,
           p.primeira_vez, p.ultima_vez, p.sugestao_cs_id, c.nome_curto
    from canonico.vinculos_pendentes p
    left join canonico.cs c on c.id = p.sugestao_cs_id
    order by p.ocorrencias desc, p.texto_normalizado;
end;
$fn$;

create or replace function public.canonico_confirmar_apelido(p_texto text, p_cs_id bigint, p_classe text)
returns void
language plpgsql security definer set search_path = '' as $fn$
declare
  v_texto text := canonico.normalizar(p_texto);
begin
  if not public.is_gestor() then raise exception 'Apenas gestor confirma vínculos.'; end if;
  if p_classe = 'cs' and not exists (select 1 from canonico.cs c where c.id = p_cs_id) then
    raise exception 'CS inexistente para o vínculo.';
  end if;
  if coalesce(v_texto, '') = '' then raise exception 'Texto vazio não pode ser confirmado.'; end if;

  insert into canonico.cs_apelidos (texto_normalizado, cs_id, classe, origem, confirmado)
  values (v_texto, case when p_classe = 'cs' then p_cs_id else null end, p_classe, 'gestor', true)
  on conflict (texto_normalizado) do update set
    cs_id = excluded.cs_id, classe = excluded.classe, origem = excluded.origem, confirmado = true;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (seguranca.autor_atual(), 'canonico_confirmar_apelido', 'canonico.cs_apelidos', 'ok',
          jsonb_build_object('texto_normalizado', v_texto, 'classe', p_classe, 'cs_id', p_cs_id));

  perform canonico.atualizar_pendencias();
end;
$fn$;

revoke all on function public.canonico_cobertura() from public, anon;
revoke all on function public.canonico_pendencias() from public, anon;
revoke all on function public.canonico_confirmar_apelido(text, bigint, text) from public, anon;
grant execute on function public.canonico_cobertura() to authenticated;
grant execute on function public.canonico_pendencias() to authenticated;
grant execute on function public.canonico_confirmar_apelido(text, bigint, text) to authenticated;

-- RLS ligado em todas as tabelas, sem policy: anon e authenticated não leem nem escrevem.
alter table canonico.cs enable row level security;
alter table canonico.cs_apelidos enable row level security;
alter table canonico.vinculos_pendentes enable row level security;
alter table canonico.conselho_cs_vigencia enable row level security;
revoke all on all tables in schema canonico from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Agendamentos
-- ---------------------------------------------------------------------------
select cron.schedule('canonico-pendencias', '0 * * * *', $c$select canonico.atualizar_pendencias()$c$);
select cron.schedule('canonico-carteira', '30 3 * * *', $c$select canonico.registrar_carteira()$c$);

-- ---------------------------------------------------------------------------
-- Catálogo de seguranca: as tabelas novas entram com a origem correta.
-- ---------------------------------------------------------------------------
insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('canonico.cs',                    'nativa',   null, true,  true,  'Identidade de cada pessoa que foi CS'),
  ('canonico.cs_apelidos',           'nativa',   null, true,  true,  'Grafias por pessoa e classe (confirmadas pelo gestor)'),
  ('canonico.vinculos_pendentes',    'derivada', null, false, false, 'Recalculada por canonico.atualizar_pendencias'),
  ('canonico.conselho_cs_vigencia',  'nativa',   null, true,  true,  'Carteira de CS por conselho; fechada, nunca apagada')
on conflict (tabela) do update set
  origem = excluded.origem, proteger_exclusao = excluded.proteger_exclusao,
  versionar = excluded.versionar, descricao = excluded.descricao, atualizado_em = now();

-- O catálogo passa a aceitar nomes qualificados. As linhas existentes (sem schema) não mudam.
create or replace view seguranca.v_tabelas_sem_classificacao as
  select case when n.nspname = 'public' then c.relname::text else n.nspname || '.' || c.relname end as tabela
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'canonico') and c.relkind = 'r'
    and not exists (
      select 1 from seguranca.catalogo_tabelas t
      where t.tabela = case when n.nspname = 'public' then c.relname::text else n.nspname || '.' || c.relname end
    );

create or replace function seguranca.aplicar_protecoes() returns table (tabela text, lixeira boolean, versoes boolean)
language plpgsql security definer set search_path = '' as $fn$
declare
  r record;
  v_pk text[];
  v_args text;
  v_qualificada text;
begin
  for r in
    select t.tabela, t.proteger_exclusao, t.versionar, n.nspname as sch, c.relname as rel
    from seguranca.catalogo_tabelas t
    join pg_class c on c.oid = to_regclass(case when t.tabela like '%.%' then t.tabela else 'public.' || t.tabela end)::oid
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
  loop
    v_qualificada := format('%I.%I', r.sch, r.rel);
    select array_agg(a.attname::text order by a.attnum) into v_pk
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = v_qualificada::regclass and i.indisprimary;
    if v_pk is null then
      raise exception 'Tabela % sem chave primária; a normativa exige chave primária.', v_qualificada;
    end if;
    select string_agg(quote_literal(x), ', ') into v_args from unnest(v_pk) as x;

    execute format('drop trigger if exists zz_seguranca_lixeira on %s', v_qualificada);
    execute format('drop trigger if exists zz_seguranca_versao on %s', v_qualificada);
    execute format('drop trigger if exists zz_seguranca_truncate on %s', v_qualificada);

    if r.proteger_exclusao then
      execute format('create trigger zz_seguranca_lixeira before delete on %s for each row execute function seguranca.gatilho_lixeira(%s)', v_qualificada, v_args);
      execute format('create trigger zz_seguranca_truncate before truncate on %s for each statement execute function seguranca.gatilho_bloquear_truncate()', v_qualificada);
    end if;
    if r.versionar then
      execute format('create trigger zz_seguranca_versao after update on %s for each row execute function seguranca.gatilho_versao(%s)', v_qualificada, v_args);
    end if;

    tabela := r.tabela; lixeira := r.proteger_exclusao; versoes := r.versionar;
    return next;
  end loop;
end;
$fn$;

revoke all on function seguranca.aplicar_protecoes() from public, anon, authenticated;

alter table seguranca.catalogo_tabelas enable row level security;

select * from seguranca.aplicar_protecoes();
