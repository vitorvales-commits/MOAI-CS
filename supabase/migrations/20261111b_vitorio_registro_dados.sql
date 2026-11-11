-- ============================================================================
-- Vitorio registro, PR 2 (11/11/2026): dados e dicionário da entrada de registros do CS.
--
-- Aditivo. Nada existente é alterado.
--   public.vitorio_entradas         uma linha por registro enviado ao Vitorio: texto original, proposta do
--                                   classificador, versão confirmada, comandos da fila e instantes de abertura
--                                   e confirmação. RLS ligada, sem acesso direto: a escrita virá por função
--                                   SECURITY DEFINER (PR 3), com checagem de sessão e carteira.
--   public.vitorio_sinonimos        sinônimos de categoria e de origem, apontando para os valores canônicos do
--                                   board de Matchmakings (Categoria e Origem).
--   public.vitorio_dicionario_membros  view: uma entrada por pessoa e conselho principal, com empresa e
--                                   origem da empresa (membro ou histórico). Ver o comentário na view.
--
-- Desvio do pedido: comandos é bigint[] (e não uuid[]), porque sincronia.comandos.id é bigint identity.
-- ============================================================================

create table if not exists public.vitorio_entradas (
  id               uuid primary key default gen_random_uuid(),
  cs_id            bigint not null references canonico.cs(id),
  chave_usuario    text not null,
  texto_original   text not null check (length(texto_original) between 1 and 500),
  linha            integer not null default 1 check (linha >= 1),
  tipo             text not null check (tipo in ('registrar_matchmaking', 'registrar_resultado')),
  proposta         jsonb not null,
  confirmado       jsonb,
  situacao         text not null default 'proposta'
                     check (situacao in ('proposta', 'confirmada', 'descartada', 'gravada', 'erro')),
  comandos         bigint[] not null default '{}',
  aberto_em        timestamptz not null default now(),
  confirmado_em    timestamptz,
  criado_em        timestamptz not null default now(),
  erro             text
);
create index if not exists vitorio_entradas_usuario_idx on public.vitorio_entradas (chave_usuario, situacao);
alter table public.vitorio_entradas enable row level security;
revoke all on public.vitorio_entradas from anon, authenticated;

create table if not exists public.vitorio_sinonimos (
  campo            text not null check (campo in ('categoria', 'origem')),
  sinonimo         text not null,
  valor_canonico   text not null,
  primary key (campo, sinonimo)
);
alter table public.vitorio_sinonimos enable row level security;
revoke all on public.vitorio_sinonimos from anon, authenticated;

-- sinonimo guardado sem acento e sem caixa (canonico.normalizar). valor_canonico é o rótulo exato do board.
insert into public.vitorio_sinonimos (campo, sinonimo, valor_canonico) values
  ('categoria', canonico.normalizar('Negócio'),      'Negócio'),
  ('categoria', canonico.normalizar('Negocio'),      'Negócio'),
  ('categoria', canonico.normalizar('Negócios'),     'Negócio'),
  ('categoria', canonico.normalizar('Parceria'),     'Parceria'),
  ('categoria', canonico.normalizar('Parcerias'),    'Parceria'),
  ('categoria', canonico.normalizar('Conhecimento'), 'Conhecimento'),
  ('categoria', canonico.normalizar('Direcionamento'), 'Direcionamento'),
  ('categoria', canonico.normalizar('Round'),        'Round'),
  ('categoria', canonico.normalizar('Rounds'),       'Round'),
  ('origem',    canonico.normalizar('Conselho'),     'Conselho'),
  ('origem',    canonico.normalizar('Conselhos'),    'Conselho'),
  ('origem',    canonico.normalizar('Evento'),       'Evento'),
  ('origem',    canonico.normalizar('Eventos'),      'Evento'),
  ('origem',    canonico.normalizar('CS'),           'CS'),
  ('origem',    canonico.normalizar('Outros'),       'Outros')
on conflict (campo, sinonimo) do nothing;

-- Dicionário de membros.
--   Pessoa: o nome do membro é "Pessoa | Empresa"; a parte antes do "|" é separada em pessoas por " + " (dupla).
--   Grupo principal: não é de reposição (is_repo falso) nem duplicado (group_id começa com duplicate_of).
--   Uma entrada por (pessoa, conselho principal). Mesmo nome em dois conselhos principais são duas entradas
--   (homônimos). Pessoa só em grupos de reposição ou duplicados tem uma entrada, no primeiro desses grupos.
--   outros_grupos: grupos em que a pessoa aparece e que não são conselho principal de nenhuma entrada dela.
--   Empresa: a parte depois do "|" no nome do membro; sem ela na linha escolhida, a mais frequente entre as
--   linhas da mesma pessoa (empresa_origem = 'membro'). Sem nenhuma, a mais frequente no histórico de
--   matchmakings (empresa_origem = 'historico'). Sufixo "(copy)" é descartado. Convidado não recebe empresa.
--   tipo: 'convidado' (nome com "convidado"), 'dupla' (nome com " + ") ou 'membro'. Convidados ficam no
--   dicionário para o PR 3 não confundi-los com membros: não entram em pergunta de ambiguidade.
create or replace view public.vitorio_dicionario_membros with (security_invoker = true) as
with grupos as (
  select g.group_id, g.titulo, (g.is_repo is true or g.group_id like 'duplicate_of%') as reserva
  from public.conselhos_grupos g
),
base as (
  select m.id as membro_id, m.group_id, coalesce(gr.reserva, true) as reserva, gr.titulo as conselho_titulo,
         (m.nome ilike '%convidado%') as convidado, (m.nome like '%+%') as dupla,
         -- "(copy)" é sufixo de grupo duplicado no Monday, não faz parte da empresa.
         nullif(btrim(regexp_replace(split_part(m.nome, '|', 2), '\s*\(copy\)\s*$', '')), '') as empresa_membro,
         split_part(m.nome, '|', 1) as pessoas_txt
  from public.conselhos_membros m
  left join grupos gr on gr.group_id = m.group_id
),
pessoas as (
  select b.membro_id, b.group_id, b.reserva, b.conselho_titulo, b.convidado, b.dupla, b.empresa_membro,
         btrim(p.nome_txt) as nome_exibicao,
         canonico.normalizar(nullif(btrim(p.nome_txt), '')) as chave
  from base b
  cross join lateral regexp_split_to_table(b.pessoas_txt, '\s*\+\s*') as p(nome_txt)
  where nullif(btrim(p.nome_txt), '') is not null
),
pedacos as (
  select regexp_split_to_table(m.nome, '\s*\+\s*') as pedaco
  from public.matchmakings_items m
  where m.nome is not null
),
hp as (
  select canonico.normalizar(nullif(btrim(split_part(pedaco, '|', 1)), '')) as chave,
         nullif(btrim(split_part(pedaco, '|', 2)), '') as empresa
  from pedacos
),
hc as (
  select chave, empresa, count(*) as n
  from hp
  where chave is not null and empresa is not null
  group by chave, empresa
),
historico as (
  select distinct on (chave) chave, empresa, n
  from hc
  order by chave, n desc, empresa
),
-- Empresa da pessoa nas linhas de membro: a mais frequente entre as linhas em que ela aparece (não convidado).
empresa_pessoa as (
  select distinct on (chave) chave, empresa
  from (select chave, empresa_membro as empresa, count(*) as n
        from pessoas
        where empresa_membro is not null and not convidado
        group by chave, empresa_membro) c
  order by chave, n desc, empresa
),
principais as (
  select distinct on (chave, group_id) *
  from pessoas
  where not reserva
  order by chave, group_id, membro_id
),
sem_principal as (
  select distinct on (chave) *
  from pessoas p
  where not exists (select 1 from principais x where x.chave = p.chave)
  order by chave, group_id, membro_id
),
escolhidos as (
  select * from principais
  union all
  select * from sem_principal
),
entradas as (
  select e.membro_id, e.nome_exibicao, e.chave, e.group_id, e.conselho_titulo, e.convidado, e.dupla,
         coalesce(e.empresa_membro, ep.empresa) as empresa_membro, h.empresa as empresa_historico, h.n as historico_n,
         array(
           select distinct p2.group_id
           from pessoas p2
           where p2.chave = e.chave
             and not exists (select 1 from escolhidos s where s.chave = p2.chave and s.group_id = p2.group_id)
           order by p2.group_id
         ) as outros_grupos
  from escolhidos e
  left join historico h on h.chave = e.chave
  left join empresa_pessoa ep on ep.chave = e.chave
)
select en.membro_id,
       en.nome_exibicao as nome,
       en.chave as nome_normalizado,
       en.group_id,
       en.conselho_titulo as conselho,
       en.outros_grupos,
       case when en.convidado then 'convidado' when en.dupla then 'dupla' else 'membro' end as tipo,
       case when en.convidado then null
            when en.empresa_membro is not null then en.empresa_membro
            else en.empresa_historico end as empresa,
       case when en.convidado then null
            when en.empresa_membro is not null then 'membro'
            when en.empresa_historico is not null then 'historico' end as empresa_origem,
       case when en.convidado or en.empresa_membro is not null then 0
            else coalesce(en.historico_n, 0) end::integer as empresa_ocorrencias
from entradas en;

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('vitorio_entradas',  'nativa', null, true, false, 'Registros enviados ao Vitorio pelo CS: texto original, proposta, confirmado e comandos da fila'),
  ('vitorio_sinonimos', 'nativa', null, true, false, 'Sinônimos de categoria e origem para os valores canônicos do board de Matchmakings')
on conflict (tabela) do nothing;

select seguranca.aplicar_protecoes();
