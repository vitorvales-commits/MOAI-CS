-- Report via Monday, etapa 1 (aditiva). Nada é removido aqui; a remoção do nativo vai em migração separada.
-- Padrões b e c: o CS vem do criador do item (cs_config.monday_user_id), nunca do nome digitado; a semana
-- vem da coluna Data, senão da segunda-feira do envio em America/Sao_Paulo, com a exceção de envio em
-- segunda sem report na semana anterior, resolvida em ordem de envio por CS.

-- Padrão a: quem é cobrado pelo alerta de report. Luana não é cobrada.
alter table public.cs_config add column if not exists obrigado_report boolean not null default true;
update public.cs_config set obrigado_report = false where nome = 'Luana';

-- Padrão h: chave que liga a soma de pontos de advertência ao Health da Base. Começa desligada.
alter table public.configuracoes_globais add column if not exists advertencia_soma_health boolean not null default false;

alter table public.reports_individuais add column if not exists autor_monday_id bigint;
alter table public.reports_individuais add column if not exists enviado_em timestamptz;

-- Backfill a partir de reports_semanais_items (mesmo id do item no Monday; todos os 194 casam).
update public.reports_individuais r
   set autor_monday_id = i.creator_id,
       enviado_em = coalesce(r.enviado_em, i.created_at_monday, r.criado_em)
  from public.reports_semanais_items i
 where r.origem = 'monday' and i.id = r.monday_item_id;

-- Recalcula cs_nome, cs_categoria e semana_inicio de todas as linhas monday. Idempotente: a entrada são
-- só colunas fixas (criador, data, envio), então duas execuções seguidas não mudam nada.
create or replace function public.resolver_semana_reports()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  v_sem date;
  v_total integer;
begin
  drop table if exists pg_temp.tmp_resolucao_reports;
  create temp table tmp_resolucao_reports on commit drop as
    select ri.id,
           c.nome as cs_nome,
           case when c.nome is null then 'nao_mapeado' else 'cs_ativo' end as cs_categoria,
           ri.data_report,
           coalesce(ri.enviado_em, ri.criado_em) as instante_envio,
           (coalesce(ri.enviado_em, ri.criado_em) at time zone 'America/Sao_Paulo')::date as dia_envio,
           null::date as semana
      from public.reports_individuais ri
      left join public.cs_config c on c.monday_user_id = ri.autor_monday_id and c.ativo
     where ri.origem = 'monday';

  -- Com Data preenchida, a semana é fixa: a segunda-feira da data.
  update tmp_resolucao_reports t
     set semana = t.data_report - (extract(isodow from t.data_report)::int - 1)
   where t.data_report is not null;

  -- Sem Data e sem CS mapeado: segunda-feira do envio.
  update tmp_resolucao_reports t
     set semana = t.dia_envio - (extract(isodow from t.dia_envio)::int - 1)
   where t.data_report is null and t.cs_nome is null;

  -- Sem Data e com CS: sequencial por CS, em ordem de envio, para que um envio de segunda já atribuído
  -- conte na decisão do seguinte.
  for r in
    select t.id, t.cs_nome, t.dia_envio
      from tmp_resolucao_reports t
     where t.data_report is null and t.cs_nome is not null
     order by t.cs_nome, t.instante_envio, t.id
  loop
    v_sem := r.dia_envio - (extract(isodow from r.dia_envio)::int - 1);
    if extract(isodow from r.dia_envio) = 1 and not exists (
         select 1 from tmp_resolucao_reports x where x.cs_nome = r.cs_nome and x.semana = v_sem - 7)
    then
      v_sem := v_sem - 7;
    end if;
    update tmp_resolucao_reports t set semana = v_sem where t.id = r.id;
  end loop;

  update public.reports_individuais ri
     set cs_nome = t.cs_nome,
         cs_categoria = t.cs_categoria,
         semana_inicio = t.semana,
         data_aproximada = (t.data_report is null),
         atualizado_em = now()
    from tmp_resolucao_reports t
   where t.id = ri.id
     and (ri.cs_nome is distinct from t.cs_nome
          or ri.cs_categoria is distinct from t.cs_categoria
          or ri.semana_inicio is distinct from t.semana
          or ri.data_aproximada is distinct from (t.data_report is null));
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Chamada só pelo sync (service role) e pelo backfill.
revoke all on function public.resolver_semana_reports() from public, anon, authenticated;
grant execute on function public.resolver_semana_reports() to service_role;

-- Backfill: aplica a regra agora.
select public.resolver_semana_reports();
