-- Teste do gatilho matchmakings_resultado_registrado (migração 20261105_fundacao_datas_feriados).
-- Roda inteiro numa transação e desfaz no final: não deixa linha nenhuma. Só rodar depois de aplicar a migração.
-- Espera: todas as linhas de resultado 'OK'. Qualquer erro aborta a transação.
begin;

-- 1. Resultado preenchido sem changed_at do Monday (sync antigo): data continua nula. Nada de now().
insert into public.matchmakings_items (id, board_group_id, mes_grupo_titulo, nome, resultado)
values (-1, 'teste', 'teste', 'teste sem changed_at', 'Aconselhamento realizado');
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -1) is null, 'sem changed_at deveria ficar nulo';
  raise notice 'OK sem changed_at fica nulo';
end $t$;

-- 2. Resultado com changed_at: data registrada é o changed_at, exatamente.
update public.matchmakings_items
   set resultado_alterado_em_monday = '2026-10-30T14:03:50Z'
 where id = -1;
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -1) = '2026-10-30T14:03:50Z'::timestamptz, 'deveria gravar o changed_at';
  raise notice 'OK changed_at gravado';
end $t$;

-- 3. P5: edição posterior do resultado não move a data registrada.
update public.matchmakings_items
   set resultado = 'Negocio fechado', resultado_alterado_em_monday = '2026-11-03T09:00:00Z'
 where id = -1;
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -1) = '2026-10-30T14:03:50Z'::timestamptz, 'data registrada não pode mudar';
  raise notice 'OK P5 mantém a data';
end $t$;

-- 4. Resultado apagado: a data fica (P5), o item segue com resultado vazio.
update public.matchmakings_items set resultado = '' where id = -1;
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -1) = '2026-10-30T14:03:50Z'::timestamptz, 'apagar o resultado não apaga a data';
  raise notice 'OK apagado mantém a data';
end $t$;

-- 5. Criado já com resultado, sem changed_at do Monday: usa created_at_monday (migração 20261105b).
insert into public.matchmakings_items (id, board_group_id, mes_grupo_titulo, nome, resultado, created_at_monday)
values (-2, 'teste', 'teste', 'teste reserva criação', 'Vivian recebeu o preço', '2026-10-30T20:44:15Z');
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -2) = '2026-10-30T20:44:15Z'::timestamptz, 'deveria usar created_at_monday na falta de changed_at';
  raise notice 'OK reserva usa created_at_monday';
end $t$;

-- 6. Sem changed_at e sem created_at: continua nulo (nunca now()).
insert into public.matchmakings_items (id, board_group_id, mes_grupo_titulo, nome, resultado)
values (-3, 'teste', 'teste', 'teste sem nenhuma data', 'Algo');
do $t$ begin
  assert (select resultado_registrado_em from public.matchmakings_items where id = -3) is null, 'sem nenhuma data deveria ficar nulo';
  raise notice 'OK sem nenhuma data fica nulo';
end $t$;

rollback;
