-- Ajustes de salvar_meta_semanal (05/11/2026). Só recria a função; tabelas não mudam. Idempotente.
--
-- 1. Nome canônico do CS: grava o nome de cs_config, não o texto digitado. A unique da tabela é sensível a
--    maiúsculas, então "rodrigo" e "Rodrigo" não podem virar duas linhas.
-- 2. A semana precisa ter parcela no mês informado: semana_inicio <= último dia do mês e semana_inicio + 6 >= 1º dia.
--    Antes era possível gravar a semana de 05/01 com mes = novembro.

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
  -- A semana precisa tocar o mês: começa até o último dia e termina a partir do primeiro.
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

  insert into public.metas_semanais_override (cs_nome, indicador, mes, semana_inicio, valor, atualizado_por, atualizado_em)
    values (v_nome, p_indicador, v_mes, p_semana_inicio, p_valor, v_actor, now())
  on conflict (cs_nome, indicador, mes, semana_inicio)
    do update set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = now();
end $function$;

revoke all on function public.salvar_meta_semanal(text, text, date, date, numeric) from public, anon;
grant execute on function public.salvar_meta_semanal(text, text, date, date, numeric) to authenticated;
