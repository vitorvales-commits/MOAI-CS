-- ============================================================================
-- Normativa de dados, etapa 5 (PR B): leitura do espelho para a Edge Function (09/11/2026)
--
-- A sync-monday grava o vínculo (sincronia_vincular_espelho, PR A) mas, para decidir o destino de um
-- espelho, também precisa ler o vínculo e a coluna "Chave do dash" do board. Esta função é a única leitura
-- nova: só o serviço (service role ou postgres) chama. Aditiva: nada é alterado nem removido.
-- ============================================================================

create or replace function public.sincronia_ler_espelho(p_tabela text, p_chave text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not sincronia.chamador_privilegiado() then
    raise exception 'Apenas o serviço lê o espelho.';
  end if;
  return (
    select jsonb_build_object(
      'monday_item_id', v.monday_item_id,
      'coluna_chave', e.coluna_chave,
      'board_id', e.board_id,
      'grupo_id', e.grupo_id)
    from sincronia.espelhos e
    left join sincronia.vinculo_nativo v on v.tabela = e.tabela and v.chave = p_chave
    where e.tabela = p_tabela
  );
end;
$fn$;

revoke all on function public.sincronia_ler_espelho(text, text) from public, anon, authenticated;

select seguranca.aplicar_protecoes();
