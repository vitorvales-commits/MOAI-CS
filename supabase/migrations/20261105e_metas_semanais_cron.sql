-- Fechamento semanal de metas (05/11/2026, fase 2, P3). Agenda o POST da rota de fechamento toda segunda às 09:00 UTC
-- (06:00 de Brasília). Idempotente: cron.schedule com o mesmo nome substitui o job existente.
--
-- ANTES DE APLICAR: troque <METAS_FECHAMENTO_SECRET> pelo valor da variável METAS_FECHAMENTO_SECRET (o mesmo
-- configurado na Vercel). O valor não fica neste arquivo. Não rode com o marcador: a rota responde 401.
--
-- Mesmo padrão de granola-sync-15min: o segredo fica só no comando do job, nunca no repositório.
-- Para desligar: select cron.unschedule('metas-semanais-fechamento-segunda');

select cron.schedule(
  'metas-semanais-fechamento-segunda',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://moai-cs-dashboard.vercel.app/api/interno/metas-semanais/fechar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Metas-Secret', '<METAS_FECHAMENTO_SECRET>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
