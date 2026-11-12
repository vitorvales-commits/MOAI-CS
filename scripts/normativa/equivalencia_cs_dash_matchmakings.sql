-- Equivalência da atribuição do matchmaking (PR 1, 11/11/2026). Somente leitura, roda como SELECT no banco.
-- Compara canonico.v_matchmakings atual com o ramo creator_id da view nova, que é o que vale enquanto a
-- coluna "CS do dash" estiver vazia. Prova que a regra antiga, se reaplicada, não muda nada. A prova da
-- migração de fato (view nova na cópia descartável) fica no teste reversível do PR.
-- Resultado esperado: total = 898 e divergencias = 0.

with nova as (
  select m.id as chave,
         case
           when m.creator_id is null then 'ignorar'
           when exists (select 1 from canonico.cs c where c.monday_user_id = m.creator_id) then 'cs'
           else coalesce((select a.classe from canonico.cs_apelidos a where a.texto_normalizado = m.creator_id::text), 'pendente')
         end as classe,
         coalesce((select array_agg(c.id order by c.id) from canonico.cs c where c.monday_user_id = m.creator_id), '{}'::bigint[]) as cs_ids
  from public.matchmakings_items m
)
select count(*) as total,
       count(*) filter (where v.classe is distinct from n.classe or v.cs_ids is distinct from n.cs_ids) as divergencias
from canonico.v_matchmakings v
join nova n on n.chave = v.chave;
