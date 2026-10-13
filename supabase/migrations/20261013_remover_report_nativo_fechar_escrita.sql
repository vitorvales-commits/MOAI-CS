-- Fecha a porta de escrita do report nativo antes de qualquer mudança de tela (regra fechar_primeiro_o_banco).
-- Só revoga execução; as funções e tabelas são removidas numa migração seguinte, depois de reescrever as dependentes.
revoke all on function public.salvar_report_individual(text, date, jsonb, bigint[]) from public, anon, authenticated;
revoke all on function public.definir_data_corte_reports(date) from public, anon, authenticated;
grant execute on function public.salvar_report_individual(text, date, jsonb, bigint[]) to service_role;
grant execute on function public.definir_data_corte_reports(date) to service_role;
