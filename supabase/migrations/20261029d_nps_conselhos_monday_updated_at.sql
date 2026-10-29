-- Etapa 4 (29/10/2026): data de atualização do item no Monday em nps_conselhos_items. A Edge Function sync-monday
-- compara com ela e só regrava as respostas novas ou alteradas, em vez das 2123 a cada 5 minutos.
-- Aplicar ANTES de publicar a nova versão da Edge Function.
alter table public.nps_conselhos_items add column if not exists monday_updated_at timestamptz;
