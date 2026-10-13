-- reports_vigentes devolve um report por CS e semana (o envio mais recente), só de origem monday.
-- Sem essa regra, duas entregas na mesma semana apareceriam como duas semanas no histórico.
create or replace function public.reports_vigentes()
returns setof public.reports_individuais
language sql
stable
set search_path to 'public'
as $$
  select r.* from public.reports_individuais r
   where r.origem = 'monday'
     and r.id in (
       select s.id from (
         select r2.id,
                row_number() over (partition by coalesce(r2.cs_nome, r2.cs_nome_original), r2.semana_inicio
                                   order by r2.criado_em desc, r2.monday_item_id desc) as rn
           from public.reports_individuais r2
          where r2.origem = 'monday'
       ) s where s.rn = 1
     );
$$;
