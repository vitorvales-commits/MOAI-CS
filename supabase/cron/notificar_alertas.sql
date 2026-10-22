-- APLICADO em 22/10/2026. Chama a Edge Function notificar-alertas a cada 15 minutos.
-- O comando clona o do job granola-sync-15min (mesmo X-Sync-Secret) e só troca a função chamada,
-- para o segredo nunca aparecer em arquivo. Sem RESEND_API_KEY e ALERTAS_REMETENTE a função grava os
-- alertas e registra em sync_log que o envio está desligado.
select cron.schedule(
  'notificar-alertas-15min',
  '*/15 * * * *',
  replace((select command from cron.job where jobname = 'granola-sync-15min'), 'functions/v1/granola-sync', 'functions/v1/notificar-alertas')
);
-- Para desligar: select cron.unschedule('notificar-alertas-15min');
