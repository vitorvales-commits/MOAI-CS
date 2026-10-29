-- Complemento de segurança e índices do sync_log (29/10/2026). Idempotente: só aplica o que as migrations já aplicadas
-- (indices_e_policies, sync_log_retencao_estrutura, sync_log_arquivar_funcao_e_cron, endurecer_funcoes_security_definer)
-- não cobriram. A tabela sync_log_resumo_diario, a função sync_log_arquivar e o job sync-log-arquivar-diario já existem
-- em produção e por isso não são recriados aqui.
--
-- 1. cs_do_grupo e faltas_do_encontro são SECURITY DEFINER sem checagem de perfil e eram chamáveis por qualquer conta
--    autenticada. Só salvar_relatorio_conselho e _encontros_relatorio (também SECURITY DEFINER) as usam; o Next.js não
--    as chama. Revogar não afeta essas duas, que executam como dono.
revoke execute on function public.cs_do_grupo(text) from public, anon, authenticated;
revoke execute on function public.faltas_do_encontro(text, timestamptz) from public, anon, authenticated;
-- 2. Funções de gatilho não precisam de EXECUTE público; o gatilho dispara sem esse privilégio.
revoke execute on function public.granola_notas_preserva_vinculo() from public, anon;
revoke execute on function public.visitas_churn_manter_grupo() from public, anon;
-- 3. A limpeza filtra por started_at e o selo de saúde da sincronização por status e finished_at.
create index if not exists sync_log_started_at_idx on public.sync_log (started_at);
create index if not exists sync_log_sucesso_finished_idx on public.sync_log (finished_at desc) where status = 'sucesso';
