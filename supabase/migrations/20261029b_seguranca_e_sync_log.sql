-- Auditoria de segurança e retenção do sync_log (29/10/2026).
--
-- 1. Segurança. Auditoria feita em 29/10/2026: todas as 57 tabelas públicas têm RLS e só políticas de SELECT
--    (nenhuma de INSERT, UPDATE ou DELETE), então anon e authenticated não escrevem em tabela espelhada; só a service
--    role (Edge Functions) escreve. O Next.js lê com a sessão do usuário (chave anon mais JWT), por isso as políticas
--    de leitura continuam como estão. Toda função de gravação executável por authenticated verifica is_gestor() ou
--    meu_cs() no corpo (editar_um_a_um, reconquista_definir, salvar_relatorio_conselho e as demais). Brechas restantes:
--    a) cs_do_grupo e faltas_do_encontro são SECURITY DEFINER sem checagem de perfil e eram chamáveis por qualquer
--       conta autenticada pelo Google, inclusive de fora do domínio. Só outras funções SECURITY DEFINER as usam
--       (salvar_relatorio_conselho e _encontros_relatorio), que seguem funcionando como dono da função.
--    b) funções de gatilho visíveis a anon: não executam nada útil fora de um gatilho, mas saem do alcance público.
revoke execute on function public.cs_do_grupo(text) from public, anon, authenticated;
revoke execute on function public.faltas_do_encontro(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.granola_notas_preserva_vinculo() from public, anon;
revoke execute on function public.visitas_churn_manter_grupo() from public, anon;

-- 2. Retenção do sync_log. A limpeza já roda em produção como job diário (sync-log-arquivar-diario, 03:00 UTC), mais
--    frequente que a semanal pedida e sem perda: antes de apagar, soma as linhas de mais de 30 dias em
--    sync_log_resumo_diario. Nenhuma tela lê linhas antigas: o selo de saúde da sincronização usa as últimas 3 horas e
--    as Edge Functions só escrevem. Este bloco apenas registra o que já existe, de forma idempotente.
create table if not exists public.sync_log_resumo_diario (
  dia date not null,
  board text not null,
  execucoes integer not null default 0,
  falhas integer not null default 0,
  itens_total bigint not null default 0,
  ultimo_erro text,
  primary key (dia, board)
);
alter table public.sync_log_resumo_diario enable row level security;

create or replace function public.sync_log_arquivar()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_corte timestamptz := (((now() at time zone 'utc')::date - 30)::timestamp) at time zone 'utc';
  v_apagadas integer;
begin
  insert into public.sync_log_resumo_diario as r (dia, board, execucoes, falhas, itens_total, ultimo_erro)
  select (s.started_at at time zone 'utc')::date, s.board, count(*), count(*) filter (where s.status = 'erro'),
         coalesce(sum(s.itens_sincronizados), 0), (array_agg(s.erro order by s.started_at desc) filter (where s.erro is not null))[1]
  from public.sync_log s where s.started_at < v_corte group by 1, 2
  on conflict (dia, board) do update
    set execucoes = r.execucoes + excluded.execucoes, falhas = r.falhas + excluded.falhas,
        itens_total = r.itens_total + excluded.itens_total, ultimo_erro = coalesce(excluded.ultimo_erro, r.ultimo_erro);
  delete from public.sync_log where started_at < v_corte;
  get diagnostics v_apagadas = row_count;
  return v_apagadas;
end;
$$;
revoke all on function public.sync_log_arquivar() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'sync-log-arquivar-diario') then
    perform cron.schedule('sync-log-arquivar-diario', '0 3 * * *', 'select public.sync_log_arquivar()');
  end if;
end $$;

-- Índices: a limpeza filtra por started_at e o selo de saúde por status e finished_at.
create index if not exists sync_log_started_at_idx on public.sync_log (started_at);
create index if not exists sync_log_sucesso_finished_idx on public.sync_log (finished_at desc) where status = 'sucesso';
