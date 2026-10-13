-- Remoção definitiva do report nativo (decisão do Vitor, 13/10/2026). Nenhuma função restante depende destes objetos.
drop function if exists public.salvar_report_individual(text, date, jsonb, bigint[]);
drop function if exists public.definir_data_corte_reports(date);
drop function if exists public.report_individual_semana(text, date);
drop function if exists public.membros_da_base_cs(text);
drop function if exists public.criticos_atuais_cs(text);
drop table if exists public.reports_individuais_criticos;
drop table if exists public.reports_cs_aliases;
alter table public.configuracoes_globais drop column if exists data_corte_reports_nativos;
