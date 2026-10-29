-- Risco de churn por membro (29/10/2026): pesos e limiares editáveis pelo gestor. Os valores iniciais espelham
-- RISCO_CONFIG_PADRAO em lib/risco-churn.ts; chave ausente aqui cai no padrão do código.
create table if not exists public.risco_churn_config (
  chave text primary key,
  valor numeric not null,
  descricao text not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

insert into public.risco_churn_config (chave, valor, descricao) values
  ('nps_nota_detrator', 6, 'Nota de NPS até este valor conta como detratora'),
  ('nps_nota_neutra', 8, 'Nota de NPS até este valor, acima do detrator, conta como neutra'),
  ('nps_pontos_detrator', 30, 'Pontos de risco para nota detratora'),
  ('nps_pontos_neutra', 10, 'Pontos de risco para nota neutra'),
  ('alerta_pontos_cada', 15, 'Pontos por alerta de NPS aberto no conselho do membro'),
  ('alerta_pontos_teto', 30, 'Teto de pontos vindos de alertas de NPS'),
  ('status_pontos_inadimplente', 40, 'Pontos para status inadimplente no mês'),
  ('status_pontos_sem_retorno', 35, 'Pontos para status sem retorno no mês'),
  ('status_pontos_downsell', 25, 'Pontos para status downsell no mês'),
  ('presenca_janela_meses', 3, 'Quantos meses recentes entram na leitura de presença'),
  ('presenca_pontos_por_falta', 10, 'Pontos por mês de falta (ausente, não vai ou sem retorno)'),
  ('presenca_pontos_teto', 30, 'Teto de pontos vindos de faltas'),
  ('report_semanas_atraso_pontos', 3, 'Pontos por semana de report atrasado do CS responsável'),
  ('report_pontos_teto', 9, 'Teto de pontos vindos do report do CS'),
  ('fidelidade_meses_proximos', 3, 'Faltam até estes meses para fechar a fidelidade de 12 meses'),
  ('fidelidade_pontos', 15, 'Pontos quando a fidelidade está perto de fechar'),
  ('limiar_atencao', 25, 'Pontuação mínima para o nível atenção'),
  ('limiar_critico', 55, 'Pontuação mínima para o nível crítico')
on conflict (chave) do nothing;

alter table public.risco_churn_config enable row level security;
drop policy if exists gestor_select on public.risco_churn_config;
create policy gestor_select on public.risco_churn_config for select to authenticated using (public.is_gestor());
revoke all on public.risco_churn_config from anon, public;
grant select on public.risco_churn_config to authenticated;

create or replace function public.definir_risco_churn_config(p_chave text, p_valor numeric)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_actor text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_valor is null or p_valor < 0 or p_valor > 1000 then raise exception 'valor inválido' using errcode = '22023'; end if;
  update public.risco_churn_config set valor = p_valor, atualizado_em = now(), atualizado_por = v_actor where chave = p_chave;
  if not found then raise exception 'chave desconhecida' using errcode = '22023'; end if;
  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'definir_risco_churn_config', 'risco_churn_config', 'success', jsonb_build_object('chave', p_chave, 'valor', p_valor));
end;
$$;
revoke all on function public.definir_risco_churn_config(text, numeric) from public, anon;
grant execute on function public.definir_risco_churn_config(text, numeric) to authenticated;
