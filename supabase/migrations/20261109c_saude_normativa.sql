-- ============================================================================
-- Normativa de dados, etapas 6 e 7 (PR A, 09/11/2026): saúde dos dados
--
-- O que muda (aditivo, nada renomeado nem removido):
--   seguranca.rotulo_lixeira / seguranca.resumo_lixeira   rótulo e resumo legível de uma linha da lixeira (internas)
--   public.lixeira_nativa_recente(p_dias)                 exclusões de dado nativo do dash, para a faixa de saúde (gestor)
--   public.restaurar_da_lixeira(p_id)                     recusa linha que não é nativa e grava a restauração em auditoria
--
-- Fora da lista, de propósito (registrado na normativa):
--   - tabelas de origem monday e linhas derivadas: restaurar não teria efeito (a sync remove de novo, ou o cálculo refaz)
--   - um_a_um_* (sigiloso), e schemas que a restauração não atinge (canonico, sincronia)
-- ============================================================================

-- 1. Rótulo legível por tabela, e resumo com no máximo três campos que identifiquem o registro para uma pessoa.
create or replace function seguranca.rotulo_lixeira(p_tabela text)
returns text
language sql immutable set search_path = '' as $fn$
  select case p_tabela
    when 'metas_definidas' then 'Metas definidas'
    when 'relatorios_conselho' then 'Relatórios pós conselho'
    when 'relatorio_conselho_faltas' then 'Faltas do relatório'
    when 'advertencias_aplicadas' then 'Advertências'
    when 'cs_periodos' then 'Períodos de CS'
    when 'advertencia_tipos' then 'Tipos de advertência'
    when 'agenda_conselheiro_vinculo' then 'Agenda do conselheiro'
    when 'alerta_nps_config' then 'Configuração de alerta NPS'
    when 'atas_membro_aliases' then 'Apelidos de membro nas atas'
    when 'churn_cs_classificacao' then 'Classificação de churn por CS'
    when 'config_home_indicadores' then 'Indicadores da home'
    when 'configuracoes_globais' then 'Configurações globais'
    when 'cs_config' then 'Configuração de CS'
    when 'cs_fechamento_mensal' then 'Fechamento mensal de CS'
    when 'cs_fotos' then 'Foto de CS'
    when 'feriados' then 'Feriados'
    when 'gestores' then 'Gestores'
    when 'indicadores_catalogo' then 'Catálogo de indicadores'
    when 'membro_melhorias' then 'Melhorias de membro'
    when 'metas_semanais_override' then 'Metas semanais ajustadas'
    when 'nps_conselho_aliases' then 'Apelidos de NPS por conselho'
    when 'nps_destaque_aliases' then 'Apelidos de destaque NPS'
    when 'processos_documento' then 'Processo'
    when 'processos_versoes' then 'Versão de processo'
    when 'reconquista_ex_membros' then 'Reconquista de ex-membros'
    when 'recordes_manuais' then 'Recorde manual'
    when 'risco_churn_config' then 'Configuração de risco de churn'
    when 'vitorio_perguntas_extras' then 'Pergunta extra do Vitorio'
    else replace(p_tabela, '_', ' ')
  end;
$fn$;

create or replace function seguranca.resumo_lixeira(p_tabela text, p_linha jsonb, p_chave jsonb)
returns text
language plpgsql stable set search_path = '' as $fn$
declare
  v_partes text[];
begin
  v_partes := case p_tabela
    when 'metas_definidas' then array[
        p_linha->>'indicador',
        coalesce(p_linha->>'cs_nome', p_linha->>'escopo'),
        to_char((p_linha->>'mes')::date, 'MM/YYYY')]
    when 'relatorios_conselho' then array[
        coalesce((select g.titulo from public.conselhos_grupos g where g.group_id = p_linha->>'group_id'), p_linha->>'group_id'),
        p_linha->>'cs_nome',
        to_char((p_linha->>'data_encontro')::timestamptz at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')]
    when 'relatorio_conselho_faltas' then array[
        p_linha->>'membro_nome',
        p_linha->>'tipo',
        'relatório ' || left(p_linha->>'relatorio_id', 8)]
    when 'advertencias_aplicadas' then array[
        p_linha->>'cs_nome',
        p_linha->>'tipo_nome',
        to_char((p_linha->>'aplicado_em')::timestamptz at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')]
    when 'cs_periodos' then array[
        p_linha->>'nome_curto',
        p_linha->>'nome_completo',
        to_char((p_linha->>'primeiro_mes')::date, 'MM/YYYY')]
    else array[left(p_chave::text, 80)]
  end;
  return nullif(array_to_string(array(select x from unnest(v_partes) x where nullif(btrim(x), '') is not null), ' | '), '');
end;
$fn$;

revoke all on function seguranca.rotulo_lixeira(text) from public, anon, authenticated;
revoke all on function seguranca.resumo_lixeira(text, jsonb, jsonb) from public, anon, authenticated;

-- 2. Exclusões de dado nativo do dash, para a faixa de saúde. Só gestor (ou serviço).
create or replace function public.lixeira_nativa_recente(p_dias integer default 30)
returns table (
  id bigint,
  tabela text,
  rotulo text,
  chave text,
  resumo text,
  removido_em timestamptz,
  removido_por text,
  restaurado_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor vê as exclusões do dash.';
  end if;
  return query
    select l.id, l.tabela, seguranca.rotulo_lixeira(l.tabela), l.chave::text,
           seguranca.resumo_lixeira(l.tabela, l.linha, l.chave),
           l.removido_em, l.removido_por, l.restaurado_em
    from seguranca.lixeira l
    join seguranca.catalogo_tabelas c on c.tabela = l.tabela
    where c.origem = 'nativa'
      and l.tabela !~ '[.]'
      and l.tabela not like 'um\_a\_um\_%'
      and l.restaurado_em is null
      and l.removido_em >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 365)))
    order by l.removido_em desc;
end;
$fn$;

revoke all on function public.lixeira_nativa_recente(integer) from public, anon;
grant execute on function public.lixeira_nativa_recente(integer) to authenticated, service_role;

-- 3. Restauração pela tela. Recusa o que não tem efeito e registra cada restauração em auditoria.
-- A checagem de gestor continua dentro de seguranca.restaurar.
drop function if exists public.restaurar_da_lixeira(bigint);

create function public.restaurar_da_lixeira(p_id bigint)
returns text
language plpgsql security definer set search_path = '' as $fn$
declare
  v_tabela text;
  v_chave jsonb;
  v_origem text;
  v_resultado text;
begin
  -- Perfil primeiro: antes disso, nada da lixeira é consultado. Assim um CS não consegue sondar o que existe nela
  -- (a mesma mensagem vale para id existente e inexistente). seguranca.restaurar mantém a mesma checagem.
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    raise exception 'Apenas gestor restaura dados.';
  end if;

  select l.tabela, l.chave into v_tabela, v_chave from seguranca.lixeira l where l.id = p_id;
  if not found then raise exception 'Item % não está na lixeira.', p_id; end if;

  select c.origem into v_origem from seguranca.catalogo_tabelas c where c.tabela = v_tabela;
  if v_origem is distinct from 'nativa' then
    raise exception 'Esta linha vem do Monday ou é calculada; restaurar aqui não teria efeito.';
  end if;
  if v_tabela like '%.%' then
    raise exception 'Esta tabela não é restaurada por esta tela.';
  end if;

  v_resultado := seguranca.restaurar(p_id);

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
  values (coalesce(seguranca.autor_atual(), 'sistema'), 'restaurar_lixeira', v_tabela, 'ok',
          jsonb_build_object('lixeira_id', p_id, 'tabela', v_tabela, 'chave', v_chave, 'resultado', v_resultado));
  return v_resultado;
end;
$fn$;

revoke all on function public.restaurar_da_lixeira(bigint) from public, anon;
grant execute on function public.restaurar_da_lixeira(bigint) to authenticated, service_role;

select seguranca.aplicar_protecoes();
