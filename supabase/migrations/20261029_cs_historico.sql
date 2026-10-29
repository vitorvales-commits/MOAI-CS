-- Histórico de quem foi CS e em que meses (29/10/2026). Substitui a lista fixa EX_MEMBROS_SEM_CONTA de
-- lib/constants.ts e completa a migração 20261009_cs_periodos, que nunca tinha sido aplicada.
--
-- Por que existe: ao escolher um mês fechado (janeiro, por exemplo), o dash montava o time com os CS
-- ativos hoje. Ninguém da equipe atual atuava em janeiro, então todos os indicadores vinham zerados.
-- Com esta tabela, cada mês mostra quem era CS naquele mês, e o mês corrente mostra só quem está ativo.
--
-- Regras:
-- 1. Uma linha por pessoa que já foi CS. primeiro_mes e ultimo_mes são o primeiro dia do mês.
-- 2. ultimo_mes nulo quer dizer que a pessoa segue CS. Quem sai recebe o último mês em que atuou.
-- 3. aliases guarda toda grafia com que a pessoa aparece nos boards (nome curto do Churn, nome completo
--    dos campos de pessoa, e-mail de conta excluída). É a única fonte de casamento de nome para ex CS.
-- 4. Os períodos iniciais vieram da evidência nos boards (cases, upsell e downsell, rounds, churn e
--    metas). confirmado falso marca as linhas que o gestor ainda deve revisar.
-- 5. Leitura para usuários MOAI. Escrita só pela service role (sem policy de escrita).

create table if not exists public.cs_periodos (
  nome_curto text primary key,
  nome_completo text not null,
  primeiro_mes date not null,
  ultimo_mes date,
  origem text not null,
  confirmado boolean not null default false
);

alter table public.cs_periodos add column if not exists aliases text[] not null default '{}';
alter table public.cs_periodos add column if not exists atualizado_em timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cs_periodos_primeiro_dia') then
    alter table public.cs_periodos add constraint cs_periodos_primeiro_dia check (extract(day from primeiro_mes) = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cs_periodos_ultimo_dia') then
    alter table public.cs_periodos add constraint cs_periodos_ultimo_dia check (ultimo_mes is null or extract(day from ultimo_mes) = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cs_periodos_ordem') then
    alter table public.cs_periodos add constraint cs_periodos_ordem check (ultimo_mes is null or ultimo_mes >= primeiro_mes);
  end if;
end $$;

alter table public.cs_periodos enable row level security;

drop policy if exists moai_select on public.cs_periodos;
create policy moai_select on public.cs_periodos
  for select to authenticated
  using (public.is_moai_user());

revoke insert, update, delete on public.cs_periodos from anon, authenticated;

comment on table public.cs_periodos is 'Quem foi CS em cada mês e com quais grafias aparece nos boards. Ver lib/cs-periodos.ts e lib/reports.ts (rosterDoMes).';
comment on column public.cs_periodos.aliases is 'Grafias da pessoa nos boards do Monday, comparadas sem acento e sem caixa.';

insert into public.cs_periodos (nome_curto, nome_completo, primeiro_mes, ultimo_mes, origem, confirmado, aliases) values
  ('Gustavo',     'Gustavo Lucas',                         '2025-07-01', '2025-10-01', 'evidencia_boards', false, array['Gustavo Lucas']),
  ('Giovanna',    'Giovanna Monteiro',                     '2025-08-01', '2025-11-01', 'evidencia_boards', false, array['giovannamonteiro@mmoai.com.br']),
  ('Alejandro',   'Alejandro Colina',                      '2025-08-01', '2026-09-01', 'evidencia_boards', true,  array['Alejandro Colina', 'Alejandro']),
  ('Luma',        'Luma Guadanhim',                        '2025-08-01', '2026-05-01', 'evidencia_boards', true,  array['Luma Guadanhim', 'Luma']),
  ('Vinicius W.', 'Vinicius Walviesse',                    '2025-08-01', '2026-05-01', 'evidencia_boards', false, array['Vinicius W.', 'Vinicius Walviesse', 'vinicius.souza@mmoai.com.br']),
  ('Yasmim',      'Yasmim Cardoso Marques',                '2025-10-01', '2026-06-01', 'evidencia_boards', true,  array['Yasmim Cardoso Marques', 'Yasmim']),
  ('Lanna',       'Lanna Rosa',                            '2025-10-01', '2026-02-01', 'evidencia_boards', true,  array['Lanna Rosa', 'Lanna']),
  ('Lucas',       'Lucas Nicoli',                          '2026-01-01', '2026-09-01', 'evidencia_boards', true,  array['Lucas Nicoli', 'Lucas']),
  ('Marcos',      'Marcos Vinicius De Oliveira Teixeira',  '2026-05-01', '2026-10-01', 'evidencia_boards', true,  array['Marcos Vinicius De Oliveira Teixeira', 'Marcos']),
  ('George',      'George Washington',                     '2026-05-01', null,         'metas_subitens',   true,  array['George Washington', 'George']),
  ('Vilker',      'Vilker Ferreira',                       '2026-05-01', null,         'metas_subitens',   true,  array['Vilker Ferreira', 'Vilker']),
  ('Vitor',       'Vitor Lucas Lacerda de Oliveira',       '2026-05-01', null,         'metas_subitens',   true,  array['Vitor Lucas Lacerda de Oliveira', 'Vitor']),
  ('Mateus',      'Mateus Ries',                           '2026-06-01', null,         'metas_subitens',   true,  array['Mateus Ries', 'Mateus']),
  ('Rodrigo',     'Rodrigo Queiroz Campos',                '2026-06-01', null,         'metas_subitens',   true,  array['Rodrigo Queiroz Campos', 'Rodrigo']),
  ('Luana',       'Luana Sampaio Alves',                   '2026-09-01', null,         'metas_subitens',   true,  array['Luana Sampaio Alves', 'Luana']),
  ('Amanda',      'Amanda Borges',                         '2026-10-01', null,         'evidencia_boards', true,  array['Amanda Borges', 'Amanda']),
  ('Iasmin',      'Iasmin Lyara Cabral da Silva',          '2026-11-01', null,         'sucessao_marcos',  true,  array['Iasmin Lyara Cabral da Silva', 'Iasmin'])
on conflict (nome_curto) do update set
  nome_completo = excluded.nome_completo,
  primeiro_mes  = excluded.primeiro_mes,
  ultimo_mes    = excluded.ultimo_mes,
  origem        = excluded.origem,
  confirmado    = excluded.confirmado,
  aliases       = excluded.aliases,
  atualizado_em = now();
