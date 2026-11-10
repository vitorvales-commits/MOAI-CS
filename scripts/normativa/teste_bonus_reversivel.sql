-- Teste reversível do bônus de pontuação (etapa 5, PR A). Roda na cópia descartável, depois de
-- supabase/migrations/20261110a_bonus_pontos.sql aplicada (workflow testar-migracao). Termina com erro proposital:
-- a mensagem TESTE_BONUS_OK significa que todas as verificações passaram e que nada ficou aplicado (a transação
-- inteira é desfeita).
-- Regras do teste: toda comparação é nula-segura (is distinct from), e cada leitura confere "not found", para
-- que um registro ausente nunca faça a verificação passar sem testar nada. Ao fim de cada etapa, pg_temp.checar
-- confere que nenhuma falha de espelho foi registrada em access_audit_log.

do $teste$
declare
  v_gestor text;
  v_cs text;
  v_cs2 text;
  v_mes date := date '2026-08-01';
  v_ids uuid[];
  v_id uuid;
  v_id_espelho uuid;
  v_n integer;
  v_soma0 integer;
  v_soma1 integer;
  v_val jsonb;
  v_nome text;
  v_txt text;
  v_m jsonb;
  v_linha jsonb;
  v_res jsonb := '{}'::jsonb;
begin
  alter table sincronia.comandos disable trigger comandos_disparar;
  update sincronia.configuracao set valor = true where chave = 'fila_escrita_ativa';

  -- A cópia de teste não traz o Auth: verificar-restauracao.sh define auth.jwt() como '{}', e então is_gestor()
  -- é sempre falso. Aqui a função passa a ler as claims da sessão, como no Supabase, para simular gestor e CS.
  -- A redefinição é desfeita no fim da transação, junto com todo o resto.
  create or replace function auth.jwt() returns jsonb language sql stable as $f$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb
  $f$;

  perform set_config('teste.falhas0',
    (select count(*) from public.access_audit_log where action = 'sincronia_espelho_falhou')::text, true);

  create function pg_temp.checar(p_etapa text) returns void language plpgsql as $f$
  declare
    n integer;
  begin
    select count(*) into n from public.access_audit_log where action = 'sincronia_espelho_falhou';
    if n is distinct from current_setting('teste.falhas0')::integer then
      raise exception 'FALHA silenciosa na etapa %: % falha(s) de espelho registrada(s)', p_etapa, n;
    end if;
  end
  $f$;

  -- Preparo: um gestor real (primeiro da tabela gestores) e dois CS reais (de cs_periodos).
  select g.email into v_gestor from public.gestores g order by g.email limit 1;
  if not found or v_gestor is null then raise exception 'FALHA preparo: sem gestor cadastrado'; end if;
  select p.nome_curto into v_cs from public.cs_periodos p order by p.nome_curto limit 1;
  if not found then raise exception 'FALHA preparo: sem CS em cs_periodos'; end if;
  select p.nome_curto into v_cs2 from public.cs_periodos p order by p.nome_curto offset 1 limit 1;
  if not found then raise exception 'FALHA preparo: falta um segundo CS em cs_periodos'; end if;

  -- 1. CS comum não concede, não edita e não anula.
  perform set_config('request.jwt.claims', '{"email":"nao.gestor.teste@teste.invalid","role":"authenticated"}', true);
  set local role authenticated;
  begin
    perform public.conceder_bonus(jsonb_build_array(jsonb_build_object('cs_nome', v_cs, 'pontos', 1)), 'TESTE CS', v_mes, null);
    raise exception 'FALHA 1a: CS comum conseguiu conceder';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.editar_bonus(gen_random_uuid(), 'TESTE CS', 1, v_mes, null);
    raise exception 'FALHA 1b: CS comum conseguiu editar';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.anular_bonus(gen_random_uuid(), 'TESTE CS');
    raise exception 'FALHA 1c: CS comum conseguiu anular';
  exception when insufficient_privilege then null;
  end;
  reset role;
  v_res := v_res || jsonb_build_object('1_cs_comum_bloqueado', true);

  -- 2. Gestor concede em lote: as duas linhas são gravadas, com o mesmo mês, dinâmica e observação.
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_ids := public.conceder_bonus(
    jsonb_build_array(
      jsonb_build_object('cs_nome', v_cs, 'pontos', 10),
      jsonb_build_object('cs_nome', v_cs2, 'pontos', 5)),
    'TESTE DINAMICA', v_mes, 'observação de teste');
  reset role;
  if v_ids is null or coalesce(array_length(v_ids, 1), 0) is distinct from 2 then
    raise exception 'FALHA 2: lote devolveu % id(s)', coalesce(array_length(v_ids, 1), 0);
  end if;
  select count(*) into v_n from public.bonus_aplicados
    where dinamica = 'TESTE DINAMICA' and mes_referencia = v_mes and observacao = 'observação de teste'
      and anulado_em is null;
  if v_n is distinct from 2 then raise exception 'FALHA 2b: lote gravou % linha(s), esperado 2', v_n; end if;
  perform pg_temp.checar('2');
  v_res := v_res || jsonb_build_object('2_lote_grava_todas', true);

  -- 3. Lote com um CS inexistente: nada é gravado (transação única).
  set local role authenticated;
  begin
    perform public.conceder_bonus(
      jsonb_build_array(
        jsonb_build_object('cs_nome', v_cs, 'pontos', 3),
        jsonb_build_object('cs_nome', 'CS Inexistente Teste Bonus', 'pontos', 3)),
      'TESTE LOTE RUIM', v_mes, null);
    raise exception 'FALHA 3a: lote com CS inexistente foi aceito';
  exception when sqlstate 'P0002' then null;
  end;
  reset role;
  select count(*) into v_n from public.bonus_aplicados where dinamica = 'TESTE LOTE RUIM';
  if v_n is distinct from 0 then raise exception 'FALHA 3b: lote recusado deixou % linha(s)', v_n; end if;
  perform pg_temp.checar('3');
  v_res := v_res || jsonb_build_object('3_lote_atomico', true);

  -- 4. Mês fora do dia 1, mês futuro e pontos zero são recusados.
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.conceder_bonus(jsonb_build_array(jsonb_build_object('cs_nome', v_cs, 'pontos', 1)), 'TESTE MES', date '2026-08-15', null);
    raise exception 'FALHA 4a: mês fora do dia 1 foi aceito';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.conceder_bonus(jsonb_build_array(jsonb_build_object('cs_nome', v_cs, 'pontos', 1)), 'TESTE MES',
      (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date, null);
    raise exception 'FALHA 4b: mês futuro foi aceito';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.conceder_bonus(jsonb_build_array(jsonb_build_object('cs_nome', v_cs, 'pontos', 0)), 'TESTE MES', v_mes, null);
    raise exception 'FALHA 4c: pontos zero foram aceitos';
  exception when sqlstate '22023' then null;
  end;
  reset role;
  select count(*) into v_n from public.bonus_aplicados where dinamica = 'TESTE MES';
  if v_n is distinct from 0 then raise exception 'FALHA 4d: recusas deixaram % linha(s)', v_n; end if;
  perform pg_temp.checar('4');
  v_res := v_res || jsonb_build_object('4_mes_e_pontos_validados', true);

  -- 5. Anulação: o bônus deixa de somar, nada é apagado, e não anula duas vezes nem sem motivo.
  select coalesce(sum(b.pontos), 0) into v_soma0 from public.bonus_aplicados b
    where b.cs_nome = v_cs and b.mes_referencia = v_mes and b.anulado_em is null;
  set local role authenticated;
  perform public.anular_bonus(v_ids[1], 'teste de anulação');
  begin
    perform public.anular_bonus(v_ids[1], 'de novo');
    raise exception 'FALHA 5a: anulou duas vezes';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.anular_bonus(v_ids[2], '   ');
    raise exception 'FALHA 5b: anulou sem motivo';
  exception when sqlstate '22023' then null;
  end;
  reset role;
  perform 1 from public.bonus_aplicados b where b.id = v_ids[1] and b.anulado_em is not null;
  if not found then raise exception 'FALHA 5c: bônus anulado sumiu ou não ficou marcado (deveria ficar no histórico)'; end if;
  select coalesce(sum(b.pontos), 0) into v_soma1 from public.bonus_aplicados b
    where b.cs_nome = v_cs and b.mes_referencia = v_mes and b.anulado_em is null;
  if v_soma1 is distinct from v_soma0 - 10 then
    raise exception 'FALHA 5d: anulado ainda soma (antes %, depois %)', v_soma0, v_soma1;
  end if;
  perform pg_temp.checar('5');
  v_res := v_res || jsonb_build_object('5_anulado_nao_soma_e_nao_apaga', true);

  -- 6. Edição: bônus anulado não edita; bônus vigente edita e mantém o CS.
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.editar_bonus(v_ids[1], 'TESTE EDITADO', 12, v_mes, null);
    raise exception 'FALHA 6a: bônus anulado foi editado';
  exception when sqlstate '22023' then null;
  end;
  perform public.editar_bonus(v_ids[2], 'TESTE EDITADO', 7, v_mes, 'nova obs');
  reset role;
  select b.pontos, b.cs_nome, b.dinamica into v_n, v_nome, v_txt from public.bonus_aplicados b where b.id = v_ids[2];
  if not found then raise exception 'FALHA 6b: bônus editado não encontrado'; end if;
  if v_n is distinct from 7 or v_nome is distinct from v_cs2 or v_txt is distinct from 'TESTE EDITADO' then
    raise exception 'FALHA 6c: edição gravou valores errados (pontos %, cs %, dinâmica %)', v_n, v_nome, v_txt;
  end if;
  perform pg_temp.checar('6');
  v_res := v_res || jsonb_build_object('6_edicao_respeita_anulacao', true);

  -- 7. Espelho: ligado, o bônus enfileira "Ativo" com nome CS | dinâmica | AAAA-MM; anulado vira "Anulada"
  -- no mesmo comando pendente (coalescência); exclusão monta "Excluído no dash".
  update sincronia.espelhos set ativo = true where tabela = 'bonus_aplicados';
  perform set_config('request.jwt.claims', json_build_object('email', v_gestor, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_ids := public.conceder_bonus(jsonb_build_array(jsonb_build_object('cs_nome', v_cs, 'pontos', 4)), 'TESTE ESPELHO', v_mes, null);
  reset role;
  v_id_espelho := v_ids[1];
  select c.valores, c.nome_item into v_val, v_nome from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'bonus_aplicados' and c.origem_chave = v_id_espelho::text;
  if not found then raise exception 'FALHA 7a: comando de espelho do bônus não foi criado'; end if;
  if v_nome is distinct from v_cs || ' | TESTE ESPELHO | 2026-08' then
    raise exception 'FALHA 7b: nome do item %', v_nome;
  end if;
  if v_val->'color_mm8zb9s8'->>'valor' is distinct from 'Ativo' then raise exception 'FALHA 7c: situação %', v_val; end if;
  if v_val->'numeric_mm8zmh9r'->>'valor' is distinct from '4' then raise exception 'FALHA 7d: pontos %', v_val; end if;
  if v_val->'date_mm8zvnd6'->>'valor' is distinct from '2026-08-01' then raise exception 'FALHA 7e: mês %', v_val; end if;

  set local role authenticated;
  perform public.anular_bonus(v_id_espelho, 'teste espelho');
  reset role;
  select count(*) into v_n from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'bonus_aplicados' and c.origem_chave = v_id_espelho::text;
  if v_n is distinct from 1 then raise exception 'FALHA 7f: anulação deixou % pendentes, esperado 1', v_n; end if;
  select c.valores into v_val from sincronia.comandos c
    where c.operacao = 'espelhar' and c.estado = 'pendente'
      and c.origem_tabela = 'bonus_aplicados' and c.origem_chave = v_id_espelho::text;
  if not found then raise exception 'FALHA 7g: comando pendente da anulação não encontrado'; end if;
  if v_val->'color_mm8zb9s8'->>'valor' is distinct from 'Anulada' then raise exception 'FALHA 7h: situação anulada %', v_val; end if;
  if v_val->'date_mm8zm1na'->>'valor' is null then raise exception 'FALHA 7i: data de anulação ausente %', v_val; end if;

  select to_jsonb(b) into v_linha from public.bonus_aplicados b where b.id = v_id_espelho;
  if not found then raise exception 'FALHA 7j: bônus do espelho não encontrado'; end if;
  v_m := sincronia.montar_espelho('bonus_aplicados', v_linha, true);
  if v_m->'valores'->'color_mm8zb9s8'->>'valor' is distinct from 'Excluído no dash' then
    raise exception 'FALHA 7k: exclusão não marcou o item %', v_m;
  end if;
  if v_m->'valores'->'numeric_mm8zmh9r'->>'valor' is distinct from '4' then
    raise exception 'FALHA 7l: exclusão perdeu os pontos %', v_m;
  end if;
  perform pg_temp.checar('7');
  v_res := v_res || jsonb_build_object('7_espelho_ativo_anulada_excluida', true);

  raise exception 'TESTE_BONUS_OK: %', v_res;
end;
$teste$;
