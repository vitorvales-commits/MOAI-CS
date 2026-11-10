-- Teste reversível da lista de CS ativos (public.cs_ativos_lista). Roda na cópia descartável, depois de
-- supabase/migrations/20261110b_cs_ativos_lista.sql. Termina com erro proposital: a mensagem TESTE_CS_LISTA_OK
-- significa que as verificações passaram e que a transação inteira é desfeita.
-- Regras do teste: comparações nulas-seguras (is distinct from) e "if not found" após cada leitura.

do $teste$
declare
  v_gestor text;
  v_esperado integer;
  v_n integer;
  v_nome text;
  v_ordem text[];
  v_msg text;
  v_res jsonb := '{}'::jsonb;
begin
  -- A cópia de teste não traz o Auth: verificar-restauracao.sh define auth.jwt() como '{}'. Aqui a função passa a
  -- ler as claims da sessão, como no Supabase, para simular gestor e CS. A redefinição é desfeita no fim da transação.
  create or replace function auth.jwt() returns jsonb language sql stable as $f$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb
  $f$;

  select g.email into v_gestor from public.gestores g order by g.email limit 1;
  if not found or v_gestor is null then raise exception 'FALHA preparo: sem gestor cadastrado'; end if;

  select count(*) into v_esperado from canonico.cs c where c.ativo;
  if v_esperado = 0 then raise exception 'FALHA preparo: nenhum CS ativo na cópia'; end if;

  -- 1. Gestor recebe exatamente os CS ativos, em ordem alfabética, sem inativos.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_gestor)::text, true);
  set local role authenticated;
  select count(*) into v_n from public.cs_ativos_lista();
  reset role;
  if v_n is distinct from v_esperado then
    raise exception 'FALHA 1: gestor recebeu % CS, esperado % (ativos)', v_n, v_esperado;
  end if;

  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', v_gestor)::text, true);
  set local role authenticated;
  select array_agg(l.nome_curto order by l.nome_curto) into v_ordem from public.cs_ativos_lista() l;
  reset role;
  if v_ordem is distinct from (select array_agg(c.nome_curto order by c.nome_curto) from canonico.cs c where c.ativo) then
    raise exception 'FALHA 1b: ordem ou conjunto da lista difere de canonico.cs ativos';
  end if;

  select count(*) into v_n from public.cs_ativos_lista() l
    join canonico.cs c on c.id = l.id where not c.ativo;
  if v_n is distinct from 0 then raise exception 'FALHA 1c: lista contém CS inativo'; end if;
  v_res := v_res || jsonb_build_object('1_gestor_recebe_ativos_em_ordem', true);

  -- 2. CS comum (authenticated, e-mail que não é gestor) é recusado com a mensagem de perfil.
  perform set_config('request.jwt.claims', '{"role":"authenticated","email":"cs.comum@teste.invalid"}', true);
  set local role authenticated;
  v_msg := null;
  begin
    perform public.cs_ativos_lista();
  exception when others then
    v_msg := sqlerrm;
  end;
  reset role;
  if v_msg is distinct from 'Apenas gestor vê a lista de CS.' then
    raise exception 'FALHA 2: CS comum recebeu % ', coalesce(v_msg, '(sem erro)');
  end if;
  v_res := v_res || jsonb_build_object('2_cs_comum_recusado', true);

  -- 3. Sem sessão (papel anon) não executa a função.
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  v_msg := null;
  begin
    perform public.cs_ativos_lista();
  exception when others then
    v_msg := sqlerrm;
  end;
  reset role;
  if v_msg is null then raise exception 'FALHA 3: anon executou cs_ativos_lista'; end if;
  v_res := v_res || jsonb_build_object('3_anon_sem_execucao', true);

  raise exception 'TESTE_CS_LISTA_OK %', v_res::text;
end;
$teste$;
