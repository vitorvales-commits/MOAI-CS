-- Já aplicada em produção (moai-cs-dashboard) em 29/09/2026 via MCP. Versionada agora.
-- Migra a meta de carteira de cs_config.meta_carteira pra metas_definidas (indicador='carteira',
-- escopo='cs') — pedido explícito do Vitor. A coluna antiga cs_config.meta_carteira NÃO é
-- apagada (fica até tudo estar validado), só deixa de ser a fonte de leitura — lib/reports.ts
-- (carteiraMetaResolvida) passa a resolver daqui, com fallback pra coluna antiga se por algum
-- motivo não houver linha aqui (CS novo cadastrado depois desta migração, por exemplo).
insert into public.metas_definidas (indicador, mes, escopo, cs_nome, valor, atualizado_por)
select 'carteira', date_trunc('month', current_date)::date, 'cs', nome, meta_carteira, 'carga_inicial_cs_config_meta_carteira'
from public.cs_config
where meta_carteira is not null
on conflict (indicador, mes, escopo, coalesce(cs_nome, '')) do nothing;
