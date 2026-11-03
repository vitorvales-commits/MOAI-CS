-- Etapa 4b, parte 2 (03/11/2026): data de atualização do item no Monday em visitas_churn. A edição de visitas
-- pelo dash envia essa data como "lido_em"; a fila de escrita só compara com ela se o item foi alterado depois.
-- synced_at não serve: só é gravado na inserção. Aditiva: coluna nova, nada renomeado nem removido.
-- Aplicar ANTES de publicar a nova versão da Edge Function sync-monday. Linhas ficam nulas até o próximo
-- ciclo regravar; com a data nula a tela mantém o botão Editar desabilitado.
-- Regra permanente: nenhuma tabela nova, então não há inclusão em seguranca.catalogo_tabelas; as proteções
-- são reaplicadas no fim.
alter table public.visitas_churn add column if not exists monday_updated_at timestamptz;

select seguranca.aplicar_protecoes();
