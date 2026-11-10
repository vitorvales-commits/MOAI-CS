-- Conferência da migração 20261105g (historico_indicador por registro do resultado). Só leitura.
-- Esperado (distribuição por mês do registro, time): abr 4, mai 14, jun 4, ago 11, set 120, out 63. Total 216.
-- Outubro no time tem que dar 63.

select mes, realizado
from public.historico_indicador('matchmakings_resultado', 'time', null)
where mes >= date '2026-04-01'
order by mes;

-- Total do time bate com os matchmakings com resultado registrado (216 em produção em 05/11/2026).
select
  (select sum(realizado) from public.historico_indicador('matchmakings_resultado', 'time', null)) as total_historico,
  (select count(*) from public.matchmakings_items m
    where m.resultado_registrado_em is not null and nullif(btrim(m.resultado), '') is not null) as total_registrados;
