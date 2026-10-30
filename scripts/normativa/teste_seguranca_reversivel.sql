create temp table _r (k text, v text);
do $t$
declare v_id bigint; v_churn bigint; v_ret text; v_n int;
begin
  select min(id) into v_churn from public.churn_items where id in (select churn_id from public.churn_detalhes);
  delete from public.churn_items where id = v_churn;
  insert into _r select 'lixeira_apos_delete', string_agg(tabela||':'||chave::text, ' | ') from seguranca.lixeira;
  select id into v_id from seguranca.lixeira where tabela='churn_items';
  select seguranca.restaurar(v_id) into v_ret; insert into _r values ('restaurar_pai', v_ret);
  select id into v_id from seguranca.lixeira where tabela='churn_detalhes';
  select seguranca.restaurar(v_id) into v_ret; insert into _r values ('restaurar_filho', v_ret);
  select count(*) into v_n from public.churn_detalhes where churn_id=v_churn; insert into _r values ('filho_de_volta', v_n::text);
  update public.cs_config set updated_at = now() where id = 5;
  update public.cs_config set meta_carteira = coalesce(meta_carteira,0) + 1 where id = 5;
  insert into _r select 'versoes', count(*)::text from seguranca.versoes;
  begin truncate public.cases_items; insert into _r values ('truncate','PASSOU (ruim)');
  exception when others then insert into _r values ('truncate_bloqueado', left(sqlerrm,60)); end;
  insert into _r select 'sem_classificacao', coalesce(string_agg(tabela, ','),'nenhuma') from seguranca.v_tabelas_sem_classificacao;
  insert into _r select 'gatilhos', count(*)::text from pg_trigger where tgname like 'zz_seguranca%';
  raise exception 'RESULTADO %', (select json_agg(_r) from _r);
end $t$;
