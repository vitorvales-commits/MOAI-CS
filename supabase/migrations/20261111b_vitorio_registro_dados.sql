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
--   public.vitorio_dicionario_membros  view: membros de conselhos_membros com o conselho de cada um e a empresa
--                                   mais frequente no histórico de nomes dos matchmakings ("Pessoa | Empresa").
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

-- Dicionário de membros. Cada nome do histórico é quebrado em pessoas separadas por " + "; a parte depois
-- de "|" é a empresa daquela pessoa. A empresa de um membro é a mais frequente para o nome normalizado
-- (empate: ordem alfabética). Sem empresa no histórico, empresa fica nula e empresa_ocorrencias é zero.
create or replace view public.vitorio_dicionario_membros with (security_invoker = true) as
with pedacos as (
  select regexp_split_to_table(m.nome, '\s*\+\s*') as pedaco
  from public.matchmakings_items m
  where m.nome is not null
),
pessoas as (
  select canonico.normalizar(nullif(btrim(split_part(pedaco, '|', 1)), '')) as nome_norm,
         nullif(btrim(split_part(pedaco, '|', 2)), '') as empresa
  from pedacos
),
contagem as (
  select nome_norm, empresa, count(*) as n
  from pessoas
  where nome_norm is not null and empresa is not null
  group by nome_norm, empresa
),
escolhida as (
  select distinct on (nome_norm) nome_norm, empresa, n
  from contagem
  order by nome_norm, n desc, empresa
)
-- O nome do membro também vem no formato "Pessoa | Empresa": a chave é só a parte antes do "|".
-- Membro com " + " no nome (dupla) não casa com ninguém, porque o histórico separa as pessoas.
select m.id as membro_id,
       m.nome,
       canonico.normalizar(nullif(btrim(split_part(m.nome, '|', 1)), '')) as nome_normalizado,
       m.group_id,
       g.titulo as conselho,
       e.empresa,
       coalesce(e.n, 0)::integer as empresa_ocorrencias
from public.conselhos_membros m
left join public.conselhos_grupos g on g.group_id = m.group_id
left join escolhida e on e.nome_norm = canonico.normalizar(nullif(btrim(split_part(m.nome, '|', 1)), ''));

insert into seguranca.catalogo_tabelas (tabela, origem, board_monday, proteger_exclusao, versionar, descricao) values
  ('vitorio_entradas',  'nativa', null, true, false, 'Registros enviados ao Vitorio pelo CS: texto original, proposta, confirmado e comandos da fila'),
  ('vitorio_sinonimos', 'nativa', null, true, false, 'Sinônimos de categoria e origem para os valores canônicos do board de Matchmakings')
on conflict (tabela) do nothing;

select seguranca.aplicar_protecoes();
