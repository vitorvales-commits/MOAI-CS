-- Trava de semana fechada nas metas semanais (05/11/2026). Só recria as duas funções de escrita; tabelas não mudam.
-- Idempotente.
--
-- Motivo: editar uma semana que já tem fechamento (metas_semanais_fechamento) reequilibra as demais, mas não muda o
-- fechamento congelado. O déficit levado deixaria de bater com a tela. Por isso semana fechada não aceita salvar nem
-- remover, para aquele CS, indicador e mês.
--
-- salvar_meta_semanal: mantém as validações da 20261105d (nome canônico, semana com parcela no mês) e acrescenta a trava.
-- remover_meta_semanal: mesma checagem de permissão de gestor, mais a trava.

create or replace function public.salvar_meta_semanal(
  p_cs_nome text, p_indicador text, p_mes date, p_semana_inicio date, p_valor numeric)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
  v_mes date := date_trunc('month', p_mes)::date;
  v_fim_mes date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
  v_nome text;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_cs_nome, '')), '') is null then
    raise exception 'cs_nome é obrigatório' using errcode = '22023';
  end if;
  if p_indicador not in ('cases', 'matchmakings', 'matchmakings_resultado', 'indicacoes', 'upsell', 'rounds') then
    raise exception 'indicador "%" não tem meta semanal (P4)', p_indicador using errcode = '22023';
  end if;
  if p_semana_inicio is null or extract(isodow from p_semana_inicio) <> 1 then
    raise exception 'semana_inicio precisa ser uma segunda-feira' using errcode = '22023';
  end if;
  if not (p_semana_inicio <= v_fim_mes and p_semana_inicio + 6 >= v_mes) then
    raise exception 'a semana de % não tem dias em %', p_semana_inicio, to_char(v_mes, 'MM/YYYY') using errcode = '22023';
  end if;
  if p_valor is null or p_valor < 0 then
    raise exception 'valor precisa ser zero ou positivo' using errcode = '22023';
  end if;

  select nome into v_nome from public.cs_config where lower(nome) = lower(trim(p_cs_nome)) limit 1;
  if v_nome is null then
    raise exception 'CS "%" não encontrado', p_cs_nome using errcode = '22023';
  end if;

  if exists (select 1 from public.metas_semanais_fechamento f
              where f.cs_nome = v_nome and f.indicador = p_indicador and f.mes = v_mes and f.semana_inicio = p_semana_inicio) then
    raise exception 'semana de % já fechada para %: a meta não pode mais ser alterada', p_semana_inicio, v_nome using errcode = '22023';
  end if;

  insert into public.metas_semanais_override (cs_nome, indicador, mes, semana_inicio, valor, atualizado_por, atualizado_em)
    values (v_nome, p_indicador, v_mes, p_semana_inicio, p_valor, v_actor, now())
  on conflict (cs_nome, indicador, mes, semana_inicio)
    do update set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = now();
end $function$;

create or replace function public.remover_meta_semanal(
  p_cs_nome text, p_indicador text, p_mes date, p_semana_inicio date)
returns void
language plpgsql security definer set search_path = public as $function$
declare
  v_mes date := date_trunc('month', p_mes)::date;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if exists (select 1 from public.metas_semanais_fechamento f
              where lower(f.cs_nome) = lower(trim(p_cs_nome)) and f.indicador = p_indicador
                and f.mes = v_mes and f.semana_inicio = p_semana_inicio) then
    raise exception 'semana de % já fechada: a meta não pode mais ser alterada', p_semana_inicio using errcode = '22023';
  end if;
  delete from public.metas_semanais_override
   where lower(cs_nome) = lower(trim(p_cs_nome))
     and indicador = p_indicador
     and mes = v_mes
     and semana_inicio = p_semana_inicio;
end $function$;

revoke all on function public.salvar_meta_semanal(text, text, date, date, numeric) from public, anon;
revoke all on function public.remover_meta_semanal(text, text, date, date) from public, anon;
grant execute on function public.salvar_meta_semanal(text, text, date, date, numeric) to authenticated;
grant execute on function public.remover_meta_semanal(text, text, date, date) to authenticated;
