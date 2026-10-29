-- Remove a síntese por IA do churn (decisão de 8 de outubro de 2026: o dash não tem síntese com IA).
-- Conferido em 29/10/2026: nenhuma rota, tela ou Edge Function chama estas funções, nenhuma outra função
-- do banco depende delas e churn_analises tem 0 linhas. Sem CASCADE: se surgir dependência, o comando falha.
drop function if exists public.reservar_geracao_churn_ia(text);
drop function if exists public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text);
drop function if exists public.registrar_rascunho_churn_ia(text, date, date, text, text, text, text, text, text);
drop function if exists public.salvar_churn_analise(text, date, date, text, text, text, text);
drop function if exists public.salvar_churn_analise(text, date, date, text, text, text, text, text);
drop function if exists public.publicar_churn_analise(uuid);
drop function if exists public.churn_recorte_hash(date, date, text, text, text);
drop function if exists public.churn_recorte_hash(date, date, text, text, text[], boolean);
drop function if exists public.churn_recorte_hash(date, date, text, text, text[], boolean, text);
drop table if exists public.churn_analises;
