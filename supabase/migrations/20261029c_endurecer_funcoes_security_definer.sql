-- Etapa 3 (29/10/2026): endurecimento das funções SECURITY DEFINER do schema public.
-- Rollback: supabase/rollbacks/20261029c_endurecer_funcoes_security_definer_rollback.sql (fora de migrations/ para nunca
-- ser aplicado em sequência por engano; rodar à mão se necessário).
--
-- Passo 1, inventário. A lista abaixo reúne os nomes chamados por .rpc( e /rest/v1/rpc/ no app Next.js, nas
-- Edge Functions e em lib/scripts-cliente.mts, mais as funções usadas por policies RLS (is_gestor, is_moai_user,
-- meu_cs, que o Postgres avalia com o papel de quem consulta), mais as 22 funções administrativas cobertas por
-- scripts/testes/rpc_permissoes.ts, mais saude_dados (etapa 5). Funções chamadas só pelo pg_cron, pelas Edge Functions
-- com service role ou por triggers (avaliar_alertas_nps, alertas_nps_para_enviar, marcar_alertas_notificados,
-- expurgar_transcricoes_granola, resolver_semana_reports, apurar_pontos_automaticos, voz_materializar e as
-- auxiliares) não recebem grant para authenticated. service_role e postgres não são tocados.
--
-- Passo 2: revogar EXECUTE de PUBLIC, anon e authenticated em toda função SECURITY DEFINER do schema e conceder a
-- authenticated apenas as do inventário (todas as sobrecargas do nome).
-- Passo 3: funções futuras nascem fechadas.

do $$
declare
  inventario text[] := array[
    -- usadas pelo app e por policies
    'is_gestor','is_moai_user','meu_cs','log_access','get_configuracoes_globais','listar_gestores','listar_cs_usuarios',
    'churn_tela','churn_itens_recorte','churn_termos_identificaveis','recordes_painel','consultar_metas_cs','metas_time_mensal',
    'metas_cs_mensal_completo','metas_resolvidas_periodo','health_base_area','health_base_cs','pontos_cs','pulso_cs_individual',
    'status_report_semana','reports_historico_cs','reports_resumo_cs','regularidade_relatorio_cs','regularidade_report_cs',
    'encontros_pendentes_relatorio','faltas_do_encontro','faltas_por_membro_conselho','membros_elegiveis_rede','visitas_resultado',
    'advertencia_soma_health_ligada','tratar_alerta_nps','reconquista_definir','sincronizar_encontros_conselho',
    'vincular_conselheiros_agenda','vincular_granola_nota','salvar_relatorio_conselho','salvar_um_a_um','salvar_um_a_um_item',
    'excluir_um_a_um','excluir_um_a_um_item','restaurar_um_a_um_item','definir_status_um_a_um_item',
    'membro_melhoria_salvar','membro_melhoria_excluir','membro_melhoria_restaurar','confirmar_alias_nps_conselho',
    'confirmar_alias_nps_destaque','confirmar_membro_ata','editar_advertencia_aplicada','remover_cs_foto','set_cs_foto',
    'set_destaque','set_meta_carteira','voz_definir_status','voz_excluir','voz_restaurar',
    -- administrativas cobertas por scripts/testes/rpc_permissoes.ts
    'adicionar_gestor','remover_gestor','vincular_cs','vincular_cs_usuario','desvincular_cs_usuario','set_cs_ativo',
    'reabrir_fechamento_mensal','salvar_fechamento_mensal','definir_metas_lote','copiar_metas_mes','definir_alerta_nps_config',
    'definir_advertencia_soma_health','criar_advertencia_tipo','editar_advertencia_tipo','aplicar_advertencia',
    'anular_advertencia','excluir_advertencia_aplicada','definir_recorde_manual','configurar_home_indicadores',
    'set_revelar_indicadores_equipe','processos_publicar','processos_restaurar',
    -- funcionalidade pronta sem tela hoje: mantidas por pertencerem a frentes que existem no banco
    'churn_recorte_hash','salvar_churn_analise','publicar_churn_analise','registrar_rascunho_churn_ia','reservar_geracao_churn_ia',
    'criar_um_a_um','editar_um_a_um','marcar_status_um_a_um','cs_do_grupo','definir_vinculo_conselheiro','report_resolver_cs',
    -- etapa 5
    'saude_dados'
  ];
  r record;
begin
  for r in
    select p.oid::regprocedure as assinatura, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.assinatura);
    if r.proname = any(inventario) then
      execute format('grant execute on function %s to authenticated', r.assinatura);
    end if;
  end loop;
end $$;

-- Passo 3. Vale para objetos criados pelo papel que roda as migrações. As funções criadas por supabase_admin
-- (pelo painel) seguem o padrão do Supabase e precisam de revisão manual, ver docs/registro_plataforma.md.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;
