-- Fixa search_path nas funções auxiliares e remove execução de anon no trigger de rate limit.
-- Já aplicada em produção; este arquivo versiona a mudança no repositório.

ALTER FUNCTION public.mes_grupo_para_data(text) SET search_path = public;
ALTER FUNCTION public.metrica_canonica(text) SET search_path = public;
ALTER FUNCTION public.normalizar_nome_sql(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.enforce_write_rate_limit() FROM PUBLIC, anon;
