-- View que liga cada conselheiro da agenda aos grupos do NPS (revisão out/2026, rodada 2, Parte B).
-- ESCRITA COMO ARQUIVO. NÃO APLICADA. Depende de 20261009b_agenda_conselho_aliases.sql.
-- Ordem: alias confirmado primeiro; depois o casamento automático pelo nome entre "| " e " (" no título do grupo,
-- sem acento e sem caixa. Grupos is_repo só entram quando não há grupo comum para o mesmo conselheiro.
create or replace view public.v_agenda_conselho_grupo as
with agenda as (
  select distinct conselheiro_nome
  from public.agenda_conselhos_items
  where conselheiro_nome is not null
),
norm as (
  select conselheiro_nome,
    translate(lower(trim(regexp_replace(conselheiro_nome, '\s+', ' ', 'g'))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc') as chave
  from agenda
),
grupos as (
  select group_id, is_repo,
    translate(lower(trim(split_part(split_part(titulo, '| ', 2), ' (', 1))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc') as chave
  from public.conselhos_grupos
  where titulo like '%| %'
),
automatico as (
  select n.conselheiro_nome, g.group_id, g.is_repo
  from norm n
  join grupos g on g.chave = n.chave
),
automatico_final as (
  select a.conselheiro_nome, a.group_id, 'automatico'::text as origem
  from automatico a
  where not a.is_repo
  union all
  select a.conselheiro_nome, a.group_id, 'automatico'::text
  from automatico a
  where a.is_repo
    and not exists (select 1 from automatico b where b.conselheiro_nome = a.conselheiro_nome and not b.is_repo)
)
select al.conselheiro_nome, al.group_id, 'alias'::text as origem
from public.agenda_conselho_aliases al
where al.confirmado
union all
select f.conselheiro_nome, f.group_id, f.origem
from automatico_final f
where not exists (
  select 1 from public.agenda_conselho_aliases al
  where al.confirmado and al.conselheiro_nome = f.conselheiro_nome
);
