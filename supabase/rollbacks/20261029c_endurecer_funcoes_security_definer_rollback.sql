-- Rollback da etapa 3. Devolve EXECUTE a authenticated em todas as funções SECURITY DEFINER do schema public,
-- exceto as que já eram fechadas antes (chamadas só por cron, Edge Function com service role ou trigger), e
-- restaura os privilégios padrão. anon e PUBLIC já não tinham EXECUTE antes da etapa 3 e continuam sem.
do $$
declare
  fechadas_antes text[] := array[
    '_encontros_relatorio','alertas_nps_candidatos','alertas_nps_para_enviar','aplicar_advertencia_sistema',
    'apurar_pontos_automaticos','avaliar_alertas_nps','enforce_email_domain_on_signup','expurgar_transcricoes_granola',
    'marcar_alertas_notificados','resolver_semana_reports','status_report_semana_base','voz_materializar',
    'sync_log_arquivar'
  ];
  r record;
begin
  for r in
    select p.oid::regprocedure as assinatura, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
  loop
    if not (r.proname = any(fechadas_antes)) then
      execute format('grant execute on function %s to authenticated', r.assinatura);
    end if;
  end loop;
end $$;

alter default privileges in schema public grant execute on functions to authenticated;
