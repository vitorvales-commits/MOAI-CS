-- Seed dos aliases agenda -> grupo do NPS e RPC de confirmação pelo gestor (03/11/2026).
-- Ordem de aplicação pelo workflow aplicar-migracao: 20261009b, 20261009c e, por último, esta.
-- Idempotente: reaplicar não duplica nem sobrescreve confirmações já feitas pelo gestor.
-- Confirmados: casamento único e inequívoco com conselhos_grupos e conselheiros (ver claude/aliases_agenda_aplicacao_20261103.md).
-- Não confirmados: candidato mais provável, à espera de decisão do gestor pela RPC confirmar_alias_agenda_conselho.
insert into public.agenda_conselho_aliases (conselheiro_nome, group_id, confirmado, confirmado_por, confirmado_em) values
  ('João Pedro', 'group_mktkwg6v', true, 'revisão out/2026', now()),
  ('João Pedro (JP)', 'group_mktkwg6v', true, 'revisão automática, 03/11/2026', now()),
  ('Alan Nogales', 'topics', true, 'revisão automática, 03/11/2026', now()),
  ('Carlos Jr', 'novo_grupo91575', true, 'revisão automática, 03/11/2026', now()),
  ('Eduardo Gallo', 'novo_grupo', true, 'revisão automática, 03/11/2026', now()),
  ('Eduardo Gallo (Gallo)', 'novo_grupo', true, 'revisão automática, 03/11/2026', now()),
  ('Fernando Zago', 'group_mktkzr1y', true, 'revisão automática, 03/11/2026', now()),
  ('Guilherme Figueiredo', 'novo_grupo18849', true, 'revisão automática, 03/11/2026', now()),
  ('Guilherme Figueiredo (Gui)', 'novo_grupo18849', true, 'revisão automática, 03/11/2026', now()),
  ('Gustavo Dayan', 'novo_grupo47062', true, 'revisão automática, 03/11/2026', now()),
  ('Gustavo Dahyan', 'novo_grupo47062', true, 'revisão automática, 03/11/2026', now()),
  ('Herick Ferreira', 'novo_grupo50247', true, 'revisão automática, 03/11/2026', now()),
  ('Kadydja Albuquerque', 'novo_grupo65945', true, 'revisão automática, 03/11/2026', now()),
  ('Livia Baioni', 'group_mm331w1n', true, 'revisão automática, 03/11/2026', now()),
  ('Luís Gustavo (Gugu)', 'duplicate_of_bruno_capanema___', true, 'revisão automática, 03/11/2026', now()),
  ('Murilo Hypólito', 'novo_grupo70162', true, 'revisão automática, 03/11/2026', now()),
  ('Rodrigo Melo', 'group_mkvcqfd8', true, 'revisão automática, 03/11/2026', now()),
  ('Rodrigo Melo (Digo)', 'group_mkvcqfd8', true, 'revisão automática, 03/11/2026', now()),
  ('Tarso Frota', 'group_mkvegqts', true, 'revisão automática, 03/11/2026', now()),
  ('Tatiana Moura', 'group_mkz7tfgw', true, 'revisão automática, 03/11/2026', now()),
  ('Tatiana Moura (Tati)', 'group_mkz7tfgw', true, 'revisão automática, 03/11/2026', now()),
  ('Thiago Correia', 'group_mkv9wd3q', true, 'revisão automática, 03/11/2026', now()),
  ('André Froes', 'novo_grupo74947', false, null, null),
  ('André Fróes', 'novo_grupo74947', false, null, null),
  ('Henrique Guimalhaes [André Froes]', 'novo_grupo74947', false, null, null),
  ('Rafael e Rodrigo Gianesini', 'group_mkvvwbpj', false, null, null),
  ('Rafael e Rodrigo Gianesini', 'novo_grupo17438', false, null, null),
  ('Rodrigo Félix (Bruno Teixeira substituiu)', 'novo_grupo__1', false, null, null)
on conflict (conselheiro_nome, group_id) do nothing;

-- Confirma (ou troca) o grupo de um nome da agenda. Troca: as demais linhas do mesmo nome são removidas e a escolhida
-- fica confirmada. SECURITY DEFINER com is_gestor() dentro do banco e auditoria, como confirmar_alias_nps_conselho.
create or replace function public.confirmar_alias_agenda_conselho(p_conselheiro_nome text, p_group_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if trim(coalesce(p_conselheiro_nome, '')) = '' or trim(coalesce(p_group_id, '')) = '' then
    raise exception 'parâmetros obrigatórios: conselheiro_nome, group_id' using errcode = '22023';
  end if;
  if not exists (select 1 from public.conselhos_grupos where group_id = p_group_id) then
    raise exception 'grupo "%" não existe em conselhos_grupos', p_group_id using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.agenda_conselhos_items where conselheiro_nome = p_conselheiro_nome) then
    raise exception 'nome "%" não existe na agenda', p_conselheiro_nome using errcode = 'P0002';
  end if;

  delete from public.agenda_conselho_aliases where conselheiro_nome = p_conselheiro_nome and group_id <> p_group_id;
  insert into public.agenda_conselho_aliases (conselheiro_nome, group_id, confirmado, confirmado_por, confirmado_em)
    values (p_conselheiro_nome, p_group_id, true, v_actor, now())
    on conflict (conselheiro_nome, group_id) do update
      set confirmado = true, confirmado_por = excluded.confirmado_por, confirmado_em = excluded.confirmado_em;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'confirmar_alias_agenda_conselho', p_conselheiro_nome, 'success', jsonb_build_object('group_id', p_group_id));
end;
$function$;

revoke all on function public.confirmar_alias_agenda_conselho(text, text) from public, anon;
grant execute on function public.confirmar_alias_agenda_conselho(text, text) to authenticated, service_role;
