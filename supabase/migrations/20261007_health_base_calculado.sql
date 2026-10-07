-- Health da Base calculado (07/10/2026, branch feat/semaforo_healthscore).
-- O Health da Base do CS passa a ser calculado em TypeScript (calcularHealthBase em
-- lib/indicadores-base.ts) pela presença da carteira, em escala inversa (maior é pior), com as
-- advertências ativas deduzidas. Por isso o indicador vira limite máximo e fonte calculada.
-- As metas já cadastradas (20 e 25, junho a outubro de 2026) são coerentes com limite máximo.
-- metas_cs_base e consultar_metas_cs não mudam: a presença não é recalculada no banco para não
-- duplicar a lógica; lib/consulta.ts substitui a linha health_base pelo valor calculado.
-- Nada é apagado: metas_subitens continua guardando o valor manual, apenas deixa de ser lido.
update public.indicadores_catalogo
   set direcao = 'max', fonte = 'calculado'
 where chave = 'health_base';
