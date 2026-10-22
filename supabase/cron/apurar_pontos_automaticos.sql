-- NÃO APLICADO. Liga a apuração dos pontos automáticos a cada 15 minutos (pg_cron).
-- Só rodar depois de o Vitor ver a primeira apuração simulada:
--   select * from public.apurar_pontos_automaticos(true);
-- A função é idempotente (chave_origem única) e só apura semanas e encontros posteriores a
-- configuracoes_globais.pontos_automaticos_desde.
select cron.schedule(
  'apurar-pontos-15min',
  '*/15 * * * *',
  $$ select * from public.apurar_pontos_automaticos(false); $$
);
-- Para desligar: select cron.unschedule('apurar-pontos-15min');
