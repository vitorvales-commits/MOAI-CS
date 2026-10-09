-- Seed de cs_periodos gerado pela regra C2 (quem tem meta em metas_subitens no mês), revisão out/2026.
-- NÃO aplicado. O gestor revisa as linhas com confirmado = false antes de rodar (ver decisoes-r2.md).
insert into public.cs_periodos (nome_curto, nome_completo, primeiro_mes, ultimo_mes, origem, confirmado) values
  ('Alejandro', 'Alejandro Colina', '2026-05-01', '2026-09-01', 'metas_subitens', false),
  ('George', 'George Washington', '2026-05-01', null, 'metas_subitens', true),
  ('Marcos', 'Marcos Vinicius De Oliveira Teixeira', '2026-05-01', null, 'metas_subitens', true),
  ('Vilker', 'Vilker Ferreira', '2026-05-01', null, 'metas_subitens', true),
  ('Vitor', 'Vitor Lucas Lacerda de Oliveira', '2026-05-01', null, 'metas_subitens', true),
  ('Lucas', 'Lucas Nicoli', '2026-06-01', '2026-09-01', 'metas_subitens', false),
  ('Mateus', 'Mateus Ries', '2026-06-01', null, 'metas_subitens', true),
  ('Rodrigo', 'Rodrigo Queiroz Campos', '2026-06-01', null, 'metas_subitens', true),
  ('Luana', 'Luana Sampaio Alves', '2026-09-01', null, 'metas_subitens', true)
on conflict (nome_curto) do nothing;
