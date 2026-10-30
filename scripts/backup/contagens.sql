-- Contagem exata de linhas por tabela dos schemas protegidos. Usada pelo backup (produção) e pelo
-- teste de restauração (cópia), que precisam produzir exatamente a mesma saída.
-- public.sync_log fica de fora: o dump não traz os dados dela.
select n.nspname || '.' || c.relname as tabela,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint as linhas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public', 'seguranca', 'canonico', 'sincronia')
  and not (n.nspname = 'public' and c.relname = 'sync_log')
order by 1;
