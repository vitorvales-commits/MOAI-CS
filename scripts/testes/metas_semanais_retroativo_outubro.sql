-- Retroativo de outubro de 2026: fecha as semanas de outubro (metas_semanais_fechamento) pela rota de fechamento.
-- NÃO RODAR antes do deploy de produção da rota (PR #30 mergeado e Vercel em Ready).
-- Antes de colar no editor do Supabase, troque <METAS_FECHAMENTO_SECRET> pelo valor da variável na Vercel.
-- O valor não fica neste arquivo.
--
-- net.http_post é assíncrono: a resposta aparece em net._http_response depois de alguns segundos.
-- timeout_milliseconds 120000: o padrão do pg_net desiste em 5 segundos, e o fechamento de um mês leva mais.
--
-- Esperado na resposta: status_code 200 e "ok": true, com porMes['2026-10-01'] preenchido.

select net.http_post(
  url := 'https://moai-cs-dashboard.vercel.app/api/interno/metas-semanais/fechar',
  headers := jsonb_build_object('Content-Type', 'application/json', 'X-Metas-Secret', '<METAS_FECHAMENTO_SECRET>'),
  body := '{"mes":"2026-10","reprocessar":false}'::jsonb,
  timeout_milliseconds := 120000
);

-- Depois de alguns segundos:
select id, status_code, left(content::text, 400) as resposta
from net._http_response
order by id desc
limit 1;
