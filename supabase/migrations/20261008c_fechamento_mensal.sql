-- Evolução por período (08/10/2026): fotografia mensal congelada da pontuação de cada CS.
-- O mês M fica aberto (calculado ao vivo) até o dia FECHAMENTO_DIA_CORTE do mês seguinte, inclusive.
-- A partir daí, o primeiro acesso de um gestor grava a fotografia de todos os CS, pela RPC abaixo.
-- Escrita só por função SECURITY DEFINER com is_gestor() no corpo.

create table if not exists public.cs_fechamento_mensal (
  ano int not null,
  mes int not null check (mes between 1 and 12),
  cs_nome text not null,
  pontuacao int,
  estado text not null check (estado in ('com_pontuacao', 'sem_dados_suficientes')),
  elegiveis int not null default 0,
  posicao int,
  total_rankeados int not null default 0,
  radar jsonb not null default '[]'::jsonb,
  fechado_em timestamptz not null default now(),
  fechado_por text,
  primary key (ano, mes, cs_nome)
);

alter table public.cs_fechamento_mensal enable row level security;
revoke all on public.cs_fechamento_mensal from anon, authenticated;
grant select on public.cs_fechamento_mensal to authenticated;

do $pol$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cs_fechamento_mensal' and policyname = 'cs_fechamento_mensal_gestor_select') then
    create policy cs_fechamento_mensal_gestor_select on public.cs_fechamento_mensal for select to authenticated using (public.is_gestor());
  end if;
end
$pol$;

-- Gravação da fotografia de um mês fechado. Recusa mês aberto: hoje (America/Sao_Paulo) precisa ser
-- depois do dia p_dia_corte do mês seguinte. Apaga e insere numa transação.
create or replace function public.salvar_fechamento_mensal(p_ano int, p_mes int, p_linhas jsonb, p_dia_corte int)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_fim_abertura date;
  v_linhas int;
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_mes < 1 or p_mes > 12 or p_ano < 2026 then
    raise exception 'mês inválido' using errcode = '22023';
  end if;
  if p_dia_corte < 1 or p_dia_corte > 28 then
    raise exception 'dia de corte inválido' using errcode = '22023';
  end if;

  v_fim_abertura := make_date(p_ano, p_mes, 1) + interval '1 month' + ((p_dia_corte - 1) * interval '1 day');
  if v_hoje <= v_fim_abertura::date then
    raise exception 'mês ainda aberto' using errcode = '22023';
  end if;

  delete from cs_fechamento_mensal where ano = p_ano and mes = p_mes;
  insert into cs_fechamento_mensal (ano, mes, cs_nome, pontuacao, estado, elegiveis, posicao, total_rankeados, radar, fechado_por)
  select p_ano, p_mes, l->>'csNome', nullif(l->>'pontuacao', '')::int, l->>'estado', coalesce((l->>'elegiveis')::int, 0),
         nullif(l->>'posicao', '')::int, coalesce((l->>'totalRankeados')::int, 0), coalesce(l->'radar', '[]'::jsonb),
         auth.jwt() ->> 'email'
    from jsonb_array_elements(p_linhas) as l;
  get diagnostics v_linhas = row_count;

  perform public.log_access('fechamento_mensal_salvar', 'ok', jsonb_build_object('ano', p_ano, 'mes', p_mes, 'linhas', v_linhas), 'evolucao');
  return v_linhas;
end
$fn$;

-- Reabre um mês: apaga a fotografia. O próximo acesso recalcula e grava de novo.
create or replace function public.reabrir_fechamento_mensal(p_ano int, p_mes int)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_linhas int;
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  delete from cs_fechamento_mensal where ano = p_ano and mes = p_mes;
  get diagnostics v_linhas = row_count;
  perform public.log_access('fechamento_mensal_reabrir', 'ok', jsonb_build_object('ano', p_ano, 'mes', p_mes, 'apagadas', v_linhas), 'evolucao');
  return v_linhas;
end
$fn$;

revoke execute on function public.salvar_fechamento_mensal(int, int, jsonb, int) from public, anon;
grant execute on function public.salvar_fechamento_mensal(int, int, jsonb, int) to authenticated;
revoke execute on function public.reabrir_fechamento_mensal(int, int) from public, anon;
grant execute on function public.reabrir_fechamento_mensal(int, int) to authenticated;
