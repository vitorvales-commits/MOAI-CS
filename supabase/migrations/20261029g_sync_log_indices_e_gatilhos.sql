-- Complemento do sync_log e das funções de gatilho (29/10/2026). Idempotente: só cria o que ainda não existe e revoga
-- privilégios que já podem estar revogados. A tabela de resumo, a função sync_log_arquivar e o job diário já existem em
-- produção (20261029_sync_log_retencao.sql) e por isso não aparecem aqui.
--
-- 1. Funções de gatilho não precisam de EXECUTE para public nem anon; o gatilho dispara sem esse privilégio.
revoke execute on function public.granola_notas_preserva_vinculo() from public, anon;
revoke execute on function public.visitas_churn_manter_grupo() from public, anon;
-- 2. A limpeza filtra por started_at e o selo de saúde da sincronização por status e finished_at; o sync_log só tinha a
--    chave primária.
create index if not exists sync_log_started_at_idx on public.sync_log (started_at);
create index if not exists sync_log_sucesso_finished_idx on public.sync_log (finished_at desc) where status = 'sucesso';
--
-- As revogações de cs_do_grupo e faltas_do_encontro para authenticated ficam fora deste arquivo: cs_do_grupo é uma das
-- 11 funções da decisão 8 do registro_plataforma.md e a decisão é do Vitor. Ver claude/plataforma_robustez_conclusao_20261029.md.
