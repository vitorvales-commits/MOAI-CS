-- Etapa 2 (29/10/2026): índices para as seis chaves estrangeiras sem índice e policy explícita de
-- negação nas quatro tabelas com RLS ligado e nenhuma policy.
-- Nenhum índice sem uso é removido: os dados de uso ainda são curtos.
-- Confirmado por grep antes de escrever: nenhum código do Next.js nem das Edge Functions lê
-- gestores, cs_usuarios, configuracoes_globais ou access_audit_log por from() ou REST; o acesso é
-- só por funções SECURITY DEFINER (is_gestor, listar_gestores, get_configuracoes_globais, log_access etc.)
-- e pela service role, que ignora RLS. A negação cobre as quatro.

create index if not exists advertencias_aplicadas_tipo_id_idx on public.advertencias_aplicadas (tipo_id);
create index if not exists agenda_conselheiro_vinculo_conselheiro_monday_item_id_idx on public.agenda_conselheiro_vinculo (conselheiro_monday_item_id);
create index if not exists atas_conselho_bigdeal_group_id_idx on public.atas_conselho_bigdeal (group_id);
create index if not exists conselhos_grupos_repo_group_id_idx on public.conselhos_grupos (repo_group_id);
create index if not exists cs_usuarios_nome_idx on public.cs_usuarios (nome);
create index if not exists um_a_um_itens_registro_id_idx on public.um_a_um_itens (registro_id);

do $$
declare t text;
begin
  foreach t in array array['gestores', 'cs_usuarios', 'configuracoes_globais', 'access_audit_log'] loop
    execute format('drop policy if exists negar_acesso_direto on public.%I', t);
    execute format('create policy negar_acesso_direto on public.%I as permissive for all to anon, authenticated using (false) with check (false)', t);
    execute format('comment on table public.%I is %L', t,
      'RLS ativo com negação explícita para anon e authenticated. O acesso ocorre apenas por funções SECURITY DEFINER e pela service role.');
  end loop;
end $$;
