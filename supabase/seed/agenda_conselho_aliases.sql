-- Seed dos aliases agenda -> grupo do NPS (revisão out/2026, rodada 2, Parte B). NÃO APLICADO.
-- Confirmado: só o caso conhecido (João Pedro é o JP do grupo C-Level). Os demais têm um candidato de grupo
-- pelo nome, mas ficam como não confirmados até o gestor revisar (ver docs/revisao-out26/relatorio-r2.md).
insert into public.agenda_conselho_aliases (conselheiro_nome, group_id, confirmado, confirmado_por, confirmado_em) values
  ('João Pedro', 'group_mktkwg6v', true, 'revisão out/2026', now()),
  ('João Pedro (JP)', 'group_mktkwg6v', false, null, null),
  ('Alan Nogales', 'topics', false, null, null),
  ('Carlos Jr', 'novo_grupo91575', false, null, null),
  ('Eduardo Gallo', 'novo_grupo', false, null, null),
  ('Eduardo Gallo (Gallo)', 'novo_grupo', false, null, null),
  ('Fernando Zago', 'group_mktkzr1y', false, null, null),
  ('Guilherme Figueiredo', 'novo_grupo18849', false, null, null),
  ('Guilherme Figueiredo (Gui)', 'novo_grupo18849', false, null, null),
  ('Gustavo Dayan', 'novo_grupo47062', false, null, null),
  ('Henrique Guimalhaes [André Froes]', 'novo_grupo74947', false, null, null),
  ('Herick Ferreira', 'novo_grupo50247', false, null, null),
  ('Kadydja Albuquerque', 'novo_grupo65945', false, null, null),
  ('Livia Baioni', 'group_mm331w1n', false, null, null),
  ('Luís Gustavo (Gugu)', 'duplicate_of_bruno_capanema___', false, null, null),
  ('Murilo Hypólito', 'novo_grupo70162', false, null, null),
  ('Rodrigo Félix (Bruno Teixeira substituiu)', 'novo_grupo__1', false, null, null),
  ('Rodrigo Melo', 'group_mkvcqfd8', false, null, null),
  ('Rodrigo Melo (Digo)', 'group_mkvcqfd8', false, null, null),
  ('Tarso Frota', 'group_mkvegqts', false, null, null),
  ('Tatiana Moura', 'group_mkz7tfgw', false, null, null),
  ('Tatiana Moura (Tati)', 'group_mkz7tfgw', false, null, null),
  ('Thiago Correia', 'group_mkv9wd3q', false, null, null)
on conflict (conselheiro_nome, group_id) do nothing;
