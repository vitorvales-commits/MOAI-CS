-- Pulso de CS (05/10/2026): substitui, de outubro de 2026 em diante, a estrutura antiga de
-- feedback entre pares e NPS interno do board "NPS time CS" (18412032453).
--
-- O board passou a receber um formulário único e mensal com: recomendação do CS como lugar de
-- trabalho (0 a 10, base do NPS interno), clareza de prioridades (0 a 10), maior gargalo, uma coisa
-- a melhorar, começar, parar e continuar, destaque em colaboração, feedback por pessoa, tema de
-- apoio, algo que a liderança precisa saber e feedback para a liderança.
--
-- Decisões de privacidade:
--   1. A tabela é legível só por gestor. O CS comum nunca lê linha bruta pelo PostgREST.
--   2. O CS comum recebe só o que foi escrito sobre ele, por uma função SECURITY DEFINER que
--      nunca devolve o nome de quem respondeu e exclui a autoavaliação.
--   3. O nome do respondente fica guardado só para excluir a autoavaliação e medir adesão.
--      Nenhum payload da aplicação o repassa.
--
-- O histórico antigo (junho a setembro de 2026) continua em feedback_items, sem alteração.

-- ============ 1. tabela espelho ============
create table if not exists public.pulso_cs_items (
  id                       bigint primary key,
  board_group_id           text,
  mes_grupo_titulo         text not null,
  respondente_nome         text,
  nota_recomendacao        smallint check (nota_recomendacao between 0 and 10),
  nota_clareza             smallint check (nota_clareza between 0 and 10),
  gargalos                 text[] not null default '{}',
  melhorar_texto           text,
  comecar_parar_continuar  text,
  destaque_colaboracao     text,
  feedback_pessoas_texto   text,
  tema_apoio_texto         text,
  lideranca_saber_texto    text,
  feedback_lideranca_texto text,
  criado_em_monday         timestamptz,
  synced_at                timestamptz not null default now()
);

create index if not exists pulso_cs_items_mes_idx on public.pulso_cs_items (mes_grupo_titulo);

alter table public.pulso_cs_items enable row level security;

create policy gestor_select on public.pulso_cs_items
  for select to authenticated
  using (public.is_gestor());
-- Sem policy de escrita: só a service role da Edge Function grava.

comment on table public.pulso_cs_items is
  'Respostas do Pulso de CS espelhadas do board 18412032453. Só gestor lê. Respondente nunca sai da base.';

-- ============ 2. o que foi escrito sobre um CS ============
-- p_mes nulo ou Visão Geral considera todos os ciclos do pulso. Devolve só o necessário para a aba
-- Feedbacks do CS: quantos colegas escreveram sobre ele, quantos o indicaram como destaque em
-- colaboração, quantas respostas o ciclo teve e as falas, em ordem aleatória.
create or replace function public.pulso_cs_individual(p_cs text, p_mes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_mes   text := nullif(upper(trim(coalesce(p_mes, ''))), '');
  v_cs    text := lower(trim(coalesce(p_cs, '')));
  r       record;
  linha   text;
  m       text[];
  atual   text;
  buf     text;
  achou   boolean;
  v_self  text;
  falas   text[] := '{}';
  v_resp  integer := 0;
  v_aval  integer := 0;
  v_dest  integer := 0;
  v_ws    constant text := E' \n\r\t';
begin
  if v_cs = '' then
    raise exception 'parâmetro obrigatório: cs' using errcode = '22023';
  end if;
  if not (public.is_gestor() or coalesce(public.meu_cs() = p_cs, false)) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  for r in
    select * from public.pulso_cs_items
    where v_mes is null
       or v_mes in ('VISÃO GERAL', 'VISAO GERAL')
       or upper(trim(mes_grupo_titulo)) = v_mes
  loop
    v_resp := v_resp + 1;
    v_self := lower(split_part(trim(coalesce(r.respondente_nome, '')), ' ', 1));
    if v_self = v_cs then
      continue; -- autoavaliação nunca entra como fala de colega nem como voto
    end if;

    if lower(trim(coalesce(r.destaque_colaboracao, ''))) = v_cs then
      v_dest := v_dest + 1;
    end if;

    atual := null; buf := ''; achou := false;
    foreach linha in array regexp_split_to_array(coalesce(r.feedback_pessoas_texto, ''), E'\r?\n') loop
      m := regexp_match(linha, '^\s*\**\s*([A-ZÀ-Ú][A-Za-zÀ-ú]+)\s*\**\s*[-–:]\s*(.*)$');
      if m is not null and (
           exists (select 1 from public.cs_config c where lower(c.nome) = lower(m[1]))
           or lower(m[1]) = 'amanda'
           or linha ~ '^\s*\**\s*[A-ZÀ-Ú][A-Za-zÀ-ú]+\s+[-–]\s'
         ) then
        if atual = v_cs and length(btrim(buf, v_ws)) > 0 then
          falas := falas || btrim(buf, v_ws);
          achou := true;
        end if;
        atual := lower(m[1]);
        buf := m[2];
      elsif atual is not null then
        buf := buf || E'\n' || linha;
      end if;
    end loop;
    if atual = v_cs and length(btrim(buf, v_ws)) > 0 then
      falas := falas || btrim(buf, v_ws);
      achou := true;
    end if;
    if achou then v_aval := v_aval + 1; end if;
  end loop;

  return jsonb_build_object(
    'respostas', v_resp,
    'avaliadores', v_aval,
    'destaques', v_dest,
    'falas', (select coalesce(jsonb_agg(f order by random()), '[]'::jsonb) from unnest(falas) f)
  );
end;
$function$;

revoke all on function public.pulso_cs_individual(text, text) from public, anon;
grant execute on function public.pulso_cs_individual(text, text) to authenticated;
