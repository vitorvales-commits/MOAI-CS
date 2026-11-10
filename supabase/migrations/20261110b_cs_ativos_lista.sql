-- ============================================================================
-- Lista de CS ativos para a tela do gestor (normativa, etapa 6/7 e bônus)
--
-- O que muda (aditivo, nada renomeado nem removido):
--   public.cs_ativos_lista()   CS ativos em ordem alfabética (id, nome_curto, nome_completo). Só gestor.
--
-- Usada por: "Este é o CS" (faixa de saúde, quando o banco não sugere um CS) e o formulário de bônus.
-- Leitura só, sem tabela nova e sem auditoria (é consulta, não ação). Um CS comum recebe recusa.
-- ============================================================================

create or replace function public.cs_ativos_lista()
returns table (
  id bigint,
  nome_curto text,
  nome_completo text
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor vê a lista de CS.';
  end if;
  return query
    select c.id, c.nome_curto, c.nome_completo
    from canonico.cs c
    where c.ativo
    order by c.nome_curto;
end;
$fn$;

revoke all on function public.cs_ativos_lista() from public, anon;
grant execute on function public.cs_ativos_lista() to authenticated, service_role;

select seguranca.aplicar_protecoes();
