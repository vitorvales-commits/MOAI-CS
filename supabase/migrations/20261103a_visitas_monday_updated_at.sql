-- Etapa 4b, parte 2 (03/11/2026, ampliada em 06/11/2026). Migração aditiva: nada renomeado nem removido.
--
-- 1. monday_updated_at: data de atualização do item no Monday. A edição de visitas pelo dash envia essa data
--    como "lido_em"; a fila de escrita só considera conflito se o item foi alterado no Monday depois dela.
--    synced_at não serve, porque só é gravado na inserção.
-- 2. item_teste: marca o item fixo de teste da fila de escrita ("teste", ID 13441800409, board Visita Churns).
--    Ele passa a ser sincronizado (PR B), fica fora de todo indicador, relatório e CSV e só o gestor o edita.
-- 3. visitas_resultado e sincronia.validar_edicao redefinidas a partir do corpo em produção em 06/11/2026
--    (pg_get_functiondef), com uma única mudança cada: excluir o item de teste. CREATE OR REPLACE preserva
--    assinatura, owner e grants (visitas_resultado: authenticated e service_role; validar_edicao: só postgres).
--
-- Levantamento em produção (pg_proc, pg_views, pg_matviews, pg_trigger): só essas duas funções leem
-- visitas_churn. enfileirar_edicao_monday apenas grava o nome da tabela; os gatilhos visitas_churn_manter_grupo,
-- zz_seguranca_lixeira e zz_seguranca_truncate não mudam. Não há view sobre a tabela.
--
-- Ordem: aplicar ANTES de publicar a sync-monday da parte 2. Nenhuma tabela nova, então não há inclusão em
-- seguranca.catalogo_tabelas; as proteções são reaplicadas no fim.

alter table public.visitas_churn add column if not exists monday_updated_at timestamptz;

alter table public.visitas_churn add column if not exists item_teste boolean not null default false;

comment on column public.visitas_churn.monday_updated_at is
  'Data de atualização do item no Monday, gravada pela sync-monday. É o lido_em das edições feitas pelo dash.';
comment on column public.visitas_churn.item_teste is
  'Verdadeiro só para o item fixo de teste da fila de escrita. Fica fora de indicadores, relatórios e CSV; só o gestor edita.';

CREATE OR REPLACE FUNCTION public.visitas_resultado()
 RETURNS TABLE(id bigint, membro_nome text, membro_id bigint, group_id text, churn_item_id bigint, cs_responsavel text, visitantes text, etapa text, produto text, local text, acao_principal text, termometro text, causa_raiz text, etapa_origem text, duracao text, expansao text, algo_novo boolean, causa_encontrada boolean, evitavel boolean, identificavel_antes boolean, mrr_em_risco numeric, data_pedido date, data_pedido_aproximada boolean, data_visita date, data_desfecho date, fim_fidelidade date, proximo_acompanhamento date, observacoes text, board_group_id text, created_at_monday timestamp with time zone, synced_at timestamp with time zone, encerrada boolean, retencao_imediata boolean, situacao_hoje text, dentro_fidelidade boolean, dias_ate_visita integer, novo_risco_em date, dias_ate_novo_risco integer, retido_30 text, retido_90 text, retido_180 text, iev integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  base as (
    select
      v.*,
      h.d as hoje_d,
      (v.etapa in ('revertido', 'perdido')) as enc,
      case when v.etapa = 'revertido' then true when v.etapa = 'perdido' then false end as ret,
      public.membro_situacao(v.membro_id) as sit,
      case when v.fim_fidelidade is null then null else v.data_pedido < v.fim_fidelidade end as dent,
      (v.data_visita - v.data_pedido) as dias_v,
      (
        select min(o.data_pedido)
        from visitas_churn o
        where o.membro_id = v.membro_id
          and o.id <> v.id
          and not o.item_teste
          and o.data_pedido > coalesce(v.data_desfecho, v.data_visita, v.data_pedido)
      ) as novo
    from visitas_churn v
    cross join hoje h
    where not v.item_teste
  ),
  r as (
    select
      b.*,
      case
        when b.data_visita + 30 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x30,
      case
        when b.data_visita + 90 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x90,
      case
        when b.data_visita + 180 > b.hoje_d then 'em_maturacao'
        when b.etapa = 'perdido' then 'perdido'
        when b.membro_id is null then 'indeterminado'
        when b.etapa = 'revertido' and b.sit = 'ativo' then 'retido'
        when b.sit = 'saiu' then 'perdido'
        else 'em_aberto'
      end as x180
    from base b
  )
  select
    r.id, r.membro_nome, r.membro_id, r.group_id, r.churn_item_id, r.cs_responsavel, r.visitantes,
    r.etapa, r.produto, r."local", r.acao_principal, r.termometro, r.causa_raiz, r.etapa_origem,
    r.duracao, r.expansao, r.algo_novo, r.causa_encontrada, r.evitavel, r.identificavel_antes,
    r.mrr_em_risco, r.data_pedido, r.data_pedido_aproximada, r.data_visita, r.data_desfecho,
    r.fim_fidelidade, r.proximo_acompanhamento, r.observacoes, r.board_group_id,
    r.created_at_monday, r.synced_at,
    r.enc,
    r.ret,
    r.sit,
    r.dent,
    r.dias_v::integer,
    r.novo,
    (r.novo - r.data_visita)::integer,
    r.x30,
    r.x90,
    r.x180,
    case
      when r.etapa = 'perdido' then 0
      when r.data_visita is null or r.x180 = 'em_maturacao' then null
      else
        (case when r.x90 = 'retido' then 1 else 0 end)
        + (case when r.x180 = 'retido' then 1 else 0 end)
        + (case when r.fim_fidelidade < r.hoje_d and r.sit = 'ativo' then 2 else 0 end)
        + (case when r.expansao is not null and r.expansao <> 'Nenhuma' then 1 else 0 end)
        + (case when r.novo is null or r.novo > r.data_visita + 180 then 1 else 0 end)
    end
  from r
  order by r.data_pedido desc nulls last, r.id;
end
$function$;

CREATE OR REPLACE FUNCTION sincronia.validar_edicao(p_board_id text, p_item_id text, p_valores jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_coluna text;
  v_campo sincronia.campos_editaveis%rowtype;
  v_grupo text;
  v_item_teste boolean;
  v_cs_id bigint;
begin
  if not sincronia.fila_ativa() then
    raise exception 'Fila de escrita desligada: a edição não foi enviada ao Monday. O gestor precisa ligar a chave fila_escrita_ativa.';
  end if;
  if p_valores is null or jsonb_typeof(p_valores) <> 'object' or p_valores = '{}'::jsonb then
    raise exception 'Nenhum valor para enviar.';
  end if;

  for v_coluna in select jsonb_object_keys(p_valores) loop
    select * into v_campo from sincronia.campos_editaveis
      where board_id = p_board_id and coluna_id = v_coluna and ativo;
    if not found then
      raise exception 'Coluna % não é editável pelo dash neste board.', v_coluna;
    end if;
    if v_campo.papel = 'gestor' and not (sincronia.chamador_privilegiado() or public.is_gestor()) then
      raise exception 'A coluna % é restrita a gestor.', v_campo.rotulo;
    end if;
  end loop;

  -- CS: só edita item de conselho da própria carteira (vigência aberta, cs_id = o CS logado).
  -- O item fixo de teste da fila (item_teste) é exclusivo do gestor.
  if not (sincronia.chamador_privilegiado() or public.is_gestor()) then
    select v.group_id, v.item_teste into v_grupo, v_item_teste
      from public.visitas_churn v where v.id::text = p_item_id;
    if coalesce(v_item_teste, false) then raise exception 'O item de teste é restrito a gestor.'; end if;
    if v_grupo is null then raise exception 'Item inexistente neste board.'; end if;
    select c.id into v_cs_id from canonico.cs c
      where canonico.normalizar(c.nome_curto) = canonico.normalizar(public.meu_cs());
    if not exists (
      select 1 from canonico.conselho_cs_vigencia x
      where x.group_id = v_grupo and x.cs_id = v_cs_id and upper(x.vigencia) is null
    ) then
      raise exception 'Item fora da sua carteira.';
    end if;
  end if;
end;
$function$;

select seguranca.aplicar_protecoes();
