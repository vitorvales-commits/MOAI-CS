-- Consulta de conferência da migração 20261110_ritmo_semanal_fila. Só leitura.
-- Rodar depois de aplicar a migração no SQL Editor de produção.
-- 1. Limiar configurado (esperado: 0.70).
select chave, valor, atualizado_por, atualizado_em from public.ritmo_semanal_config;

-- 2. Itens da fila de ritmo semanal da semana de 02/11 a 08/11 (retroativo). Esperado: o George e o Vilker
--    aparecem (cases, matchmakings_resultado abaixo do limiar); indicacoes e matchmakings de George não entram.
select cs_nome, semana_inicio, semana_fim, status, deficit_total, indicadores, responsavel, proximo_passo
  from public.fila_acao_itens
 where fonte = 'ritmo_semanal' and semana_inicio = '2026-11-02'
 order by cs_nome;

-- 3. Total de itens por semana e status (checagem de idempotência: uma linha por CS e semana).
select semana_inicio, status, count(*) as itens, count(distinct cs_nome) as cs
  from public.fila_acao_itens
 where fonte = 'ritmo_semanal'
 group by semana_inicio, status
 order by semana_inicio, status;

-- 4. Confere com o fechamento: CS com algum indicador abaixo do limiar na semana de 02/11, pela mesma regra.
select f.cs_nome, count(*) as indicadores_abaixo
  from public.metas_semanais_fechamento f
  cross join public.ritmo_semanal_config c
 where c.chave = 'limiar'
   and f.semana_inicio = '2026-11-02'
   and f.indicador in ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds')
   and f.meta_efetiva > 0 and f.realizado is not null
   and f.realizado < c.valor * f.meta_efetiva
 group by f.cs_nome
 order by f.cs_nome;
