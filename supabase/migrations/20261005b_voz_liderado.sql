-- Voz do liderado (05/10/2026): transforma as respostas abertas do Pulso de CS em uma fila de
-- sugestões que o líder trata com status. Depende de 20261005_pulso_cs.sql.
--
-- Fluxo: a Edge Function grava pulso_cs_items, um trigger materializa cada resposta aberta em itens
-- de voz_liderado_itens (uma sugestão por frase no campo começar, parar e continuar, uma por resposta
-- nos demais) e o gestor muda o status por voz_definir_status. O status sobrevive a novas
-- sincronizações porque o trigger só atualiza o texto, nunca o status.
--
-- Privacidade: o item não guarda quem respondeu, só o id da resposta de origem, usado para contar
-- em quantas respostas distintas um tema aparece. Se a resposta sai do Monday e a sincronização a
-- remove de pulso_cs_items, o item da voz some junto (cascade). Só gestor lê e escreve.
--
-- Atenção ao aplicar via MCP do Supabase: comandos de remoção explícita, como drop policy, ficam
-- esperando uma confirmação que não chega e travam por 180 segundos. Esta migração não usa nenhum.

-- ============ 1. tabela ============
create table if not exists public.voz_liderado_itens (
  id                 uuid primary key default gen_random_uuid(),
  pulso_item_id      bigint not null references public.pulso_cs_items(id) on delete cascade,
  campo              text not null check (campo in ('melhorar', 'comecar_parar_continuar', 'tema_apoio', 'lideranca_saber', 'feedback_lideranca')),
  ordem              smallint not null default 1,
  tipo               text check (tipo in ('comecar', 'parar', 'continuar')),
  mes_grupo_titulo   text not null,
  texto              text not null,
  status             text not null default 'backlog' check (status in ('backlog', 'em_andamento', 'rejeitado', 'realizado')),
  observacao_lider   text,
  status_alterado_em timestamptz,
  status_alterado_por text,
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  unique (pulso_item_id, campo, ordem)
);

create index if not exists voz_liderado_itens_status_idx on public.voz_liderado_itens (status) where ativo;
create index if not exists voz_liderado_itens_mes_idx on public.voz_liderado_itens (mes_grupo_titulo);

alter table public.voz_liderado_itens enable row level security;
create policy gestor_select on public.voz_liderado_itens for select to authenticated using (public.is_gestor());
-- Sem policy de escrita: só voz_definir_status e o trigger gravam.

-- ============ 2. quebra de uma resposta em sugestões ============
-- No campo começar, parar e continuar cada frase vira uma sugestão, com o tipo inferido pela primeira
-- palavra de ação. Respostas vazias e do tipo nada a declarar não geram item.
create or replace function public.voz_segmentos(p_campo text, p_texto text)
returns table (ordem integer, tipo text, texto text)
language plpgsql
immutable
set search_path = public
as $function$
declare
  v_ws    constant text := E' \n\r\t';
  partes  text[];
  seg     text;
  n       integer := 0;
  t       text;
  m       text[];
begin
  if p_texto is null or length(btrim(p_texto, v_ws)) = 0 then
    return;
  end if;
  if p_campo = 'comecar_parar_continuar' then
    partes := regexp_split_to_array(btrim(p_texto, v_ws), '(?<=[.!?;])\s+|\s*\n+\s*');
  else
    partes := array[btrim(p_texto, v_ws)];
  end if;
  foreach seg in array partes loop
    seg := btrim(seg, v_ws);
    if length(seg) < 8 then continue; end if;
    if length(seg) <= 40 and lower(seg) ~ '^(nada|nenhum|nenhuma|não há|nao ha|sem nada|n/a)' then continue; end if;
    n := n + 1;
    t := null;
    if p_campo = 'comecar_parar_continuar' then
      m := regexp_match(lower(seg), '\m(começar|comecar|iniciar|parar|interromper|continuar|manter)\M');
      if m is not null then
        t := case
          when m[1] in ('começar', 'comecar', 'iniciar') then 'comecar'
          when m[1] in ('parar', 'interromper') then 'parar'
          else 'continuar'
        end;
      end if;
    end if;
    ordem := n; tipo := t; texto := seg;
    return next;
  end loop;
end;
$function$;

-- ============ 3. materialização automática ============
create or replace function public.voz_materializar()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  par   record;
  v_max integer;
begin
  for par in
    select * from (values
      ('melhorar', new.melhorar_texto),
      ('comecar_parar_continuar', new.comecar_parar_continuar),
      ('tema_apoio', new.tema_apoio_texto),
      ('lideranca_saber', new.lideranca_saber_texto),
      ('feedback_lideranca', new.feedback_lideranca_texto)
    ) v(campo, texto)
  loop
    insert into public.voz_liderado_itens (pulso_item_id, campo, ordem, tipo, mes_grupo_titulo, texto)
      select new.id, par.campo, s.ordem, s.tipo, new.mes_grupo_titulo, s.texto
      from public.voz_segmentos(par.campo, par.texto) s
    on conflict (pulso_item_id, campo, ordem) do update
      set texto = excluded.texto, tipo = excluded.tipo, mes_grupo_titulo = excluded.mes_grupo_titulo, ativo = true;

    -- frases que deixaram de existir ficam inativas, com o status preservado
    select coalesce(max(s.ordem), 0) into v_max from public.voz_segmentos(par.campo, par.texto) s;
    update public.voz_liderado_itens
       set ativo = false
     where pulso_item_id = new.id and campo = par.campo and ordem > v_max and ativo;
  end loop;
  return new;
end;
$function$;

create or replace trigger voz_materializar_trg
  after insert or update of melhorar_texto, comecar_parar_continuar, tema_apoio_texto, lideranca_saber_texto, feedback_lideranca_texto, mes_grupo_titulo
  on public.pulso_cs_items
  for each row execute function public.voz_materializar();

-- ============ 4. status, só gestor ============
create or replace function public.voz_definir_status(p_id uuid, p_status text, p_observacao text default null)
returns public.voz_liderado_itens
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor    text := auth.jwt() ->> 'email';
  v_anterior text;
  v_row      public.voz_liderado_itens;
begin
  if not public.is_gestor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('backlog', 'em_andamento', 'rejeitado', 'realizado') then
    raise exception 'status inválido' using errcode = '22023';
  end if;

  select status into v_anterior from public.voz_liderado_itens where id = p_id;
  if not found then
    raise exception 'sugestão não encontrada' using errcode = 'P0002';
  end if;

  update public.voz_liderado_itens
     set status = p_status,
         observacao_lider = case when p_observacao is null then observacao_lider
                                 else nullif(btrim(left(p_observacao, 600), E' \n\r\t'), '') end,
         status_alterado_em = case when status is distinct from p_status then now() else status_alterado_em end,
         status_alterado_por = case when status is distinct from p_status then v_actor else status_alterado_por end
   where id = p_id
   returning * into v_row;

  insert into public.access_audit_log (user_email, action, resource, result, metadata)
    values (v_actor, 'voz_definir_status', p_id::text, 'success', jsonb_build_object('de', v_anterior, 'para', p_status));

  return v_row;
end;
$function$;

revoke all on function public.voz_segmentos(text, text) from public, anon, authenticated;
revoke all on function public.voz_materializar() from public, anon, authenticated;
revoke all on function public.voz_definir_status(uuid, text, text) from public, anon;
grant execute on function public.voz_definir_status(uuid, text, text) to authenticated;

-- Se já houver respostas em pulso_cs_items ao aplicar, materializa todas de uma vez.
update public.pulso_cs_items set melhorar_texto = melhorar_texto;
