-- Etapa 5 (29/10/2026): saude_dados(), a frescura dos dados por board para o cartão de saúde dos dados da visão de gestor.

-- Uma linha por board que já registrou execução. Falhas consecutivas = execuções com erro depois da última
-- bem sucedida. Se a última bem sucedida já foi arquivada (mais de 30 dias), vale o resumo diário.
create or replace function public.saude_dados()
returns table (
  board text,
  ultima_sucesso timestamptz,
  ultima_execucao timestamptz,
  falhas_consecutivas integer,
  ultimo_erro text,
  ultimo_erro_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  with boards as (
    select s.board from public.sync_log s
    union
    select r.board from public.sync_log_resumo_diario r
  ),
  ok_log as (
    select s.board, max(s.started_at) as t from public.sync_log s where s.status = 'sucesso' group by s.board
  ),
  ok_resumo as (
    select r.board, max(r.dia)::timestamptz as t from public.sync_log_resumo_diario r where r.execucoes > r.falhas group by r.board
  ),
  ult as (
    select b.board,
           coalesce(o.t, orr.t) as ultima_sucesso,
           (select max(s.started_at) from public.sync_log s where s.board = b.board) as ultima_execucao
    from boards b
    left join ok_log o on o.board = b.board
    left join ok_resumo orr on orr.board = b.board
  ),
  erro_log as (
    select distinct on (s.board) s.board, s.erro, s.started_at
    from public.sync_log s where s.status = 'erro' order by s.board, s.started_at desc
  ),
  erro_resumo as (
    select distinct on (r.board) r.board, r.ultimo_erro as erro, r.dia::timestamptz as started_at
    from public.sync_log_resumo_diario r where r.ultimo_erro is not null order by r.board, r.dia desc
  )
  select u.board,
         u.ultima_sucesso,
         u.ultima_execucao,
         (select count(*)::integer from public.sync_log s
           where s.board = u.board and s.status = 'erro'
             and s.started_at > coalesce(u.ultima_sucesso, '-infinity'::timestamptz)),
         coalesce(el.erro, er.erro),
         coalesce(el.started_at, er.started_at)
  from ult u
  left join erro_log el on el.board = u.board
  left join erro_resumo er on er.board = u.board
  order by u.board;
end;
$$;

revoke all on function public.saude_dados() from public, anon;
grant execute on function public.saude_dados() to authenticated;
