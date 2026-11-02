-- ============================================================================
-- Normativa de dados, etapa 4b (backend): leitura da fila de escrita (02/11/2026)
--
-- Duas funções de leitura para a interface. Nada é alterado nas tabelas.
--   public.sincronia_comando_status(id)   estado de um comando: time MOAI vê o próprio; gestor vê todos
--   public.sincronia_escritas_pendentes() comandos em erro ou em conflito, para a fila de ação do gestor
-- ============================================================================

create or replace function public.sincronia_comando_status(p_id bigint)
returns table (
  id bigint,
  estado text,
  erro text,
  resultado jsonb,
  valores_anteriores jsonb,
  lido_em timestamptz,
  executado_em timestamptz,
  criado_por text
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_moai_user()) then
    raise exception 'Acesso restrito ao time MOAI.';
  end if;
  return query
    select c.id, c.estado, c.erro, c.resultado, c.valores_anteriores, c.lido_em, c.executado_em, c.criado_por
    from sincronia.comandos c
    where c.id = p_id
      and (sincronia.chamador_privilegiado() or public.is_gestor() or c.criado_por = seguranca.autor_atual());
end;
$fn$;

create or replace function public.sincronia_escritas_pendentes()
returns table (
  id bigint,
  board_id text,
  item_id text,
  estado text,
  erro text,
  criado_em timestamptz,
  executado_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor vê as escritas pendentes.';
  end if;
  return query
    select c.id, c.board_id, c.item_id, c.estado, c.erro, c.criado_em, c.executado_em
    from sincronia.comandos c
    where c.estado in ('erro', 'conflito')
    order by coalesce(c.executado_em, c.criado_em);
end;
$fn$;

revoke all on function public.sincronia_comando_status(bigint) from public, anon;
revoke all on function public.sincronia_escritas_pendentes() from public, anon;
grant execute on function public.sincronia_comando_status(bigint) to authenticated;
grant execute on function public.sincronia_escritas_pendentes() to authenticated;
