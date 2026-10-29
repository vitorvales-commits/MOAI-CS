-- Etapa 1 (29/10/2026): retenção do sync_log.
-- sync_log chegou a 168 mil linhas e cresce cerca de 4 mil por dia. Dias com mais de 30 dias passam
-- a viver só como resumo diário por board; o detalhe de cada execução é apagado.
-- Falha = status 'erro'. O dia é contado em UTC, o mesmo fuso do agendamento.

create table if not exists public.sync_log_resumo_diario (
  dia         date    not null,
  board       text    not null,
  execucoes   integer not null default 0,
  falhas      integer not null default 0,
  itens_total bigint  not null default 0,
  ultimo_erro text,
  primary key (dia, board)
);

comment on table public.sync_log_resumo_diario is
  'Resumo diário do sync_log por board para dias com mais de 30 dias. Alimentado por sync_log_arquivar() (pg_cron, 03h UTC). Leitura apenas para gestores.';

alter table public.sync_log_resumo_diario enable row level security;

drop policy if exists gestor_select on public.sync_log_resumo_diario;
create policy gestor_select on public.sync_log_resumo_diario
  for select to authenticated using (public.is_gestor());

-- Idempotente: só considera dias inteiros anteriores ao corte, agrega com ON CONFLICT e apaga na
-- mesma transação. Rodar duas vezes seguidas não altera o resultado.
create or replace function public.sync_log_arquivar()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_corte timestamptz := (((now() at time zone 'utc')::date - 30)::timestamp) at time zone 'utc';
  v_apagadas integer;
begin
  insert into public.sync_log_resumo_diario as r (dia, board, execucoes, falhas, itens_total, ultimo_erro)
  select (s.started_at at time zone 'utc')::date,
         s.board,
         count(*),
         count(*) filter (where s.status = 'erro'),
         coalesce(sum(s.itens_sincronizados), 0),
         (array_agg(s.erro order by s.started_at desc) filter (where s.erro is not null))[1]
  from public.sync_log s
  where s.started_at < v_corte
  group by 1, 2
  on conflict (dia, board) do update
    set execucoes   = r.execucoes + excluded.execucoes,
        falhas      = r.falhas + excluded.falhas,
        itens_total = r.itens_total + excluded.itens_total,
        ultimo_erro = coalesce(excluded.ultimo_erro, r.ultimo_erro);

  delete from public.sync_log where started_at < v_corte;
  get diagnostics v_apagadas = row_count;
  return v_apagadas;
end;
$$;

revoke all on function public.sync_log_arquivar() from public, anon, authenticated;

-- Reagendar sem duplicar.
do $$
begin
  perform cron.unschedule('sync-log-arquivar-diario') where exists (select 1 from cron.job where jobname = 'sync-log-arquivar-diario');
  perform cron.schedule('sync-log-arquivar-diario', '0 3 * * *', 'select public.sync_log_arquivar()');
end $$;

-- Carga inicial dos dias já vencidos.
select public.sync_log_arquivar();
