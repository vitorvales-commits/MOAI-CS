-- 1:1 em três partes (08/10/2026): resumo compartilhado, notas só da liderança e itens com visibilidade.
-- Leitura do CS só pela regra de visibilidade; escrita só por funções SECURITY DEFINER com is_gestor().
-- Colunas o_que_foi_falado, combinados e status de um_a_um_registros ficam no banco sem uso (sem drop).

-- ---------------------------------------------------------------------------
-- 1. Colunas novas em um_a_um_registros
-- ---------------------------------------------------------------------------
alter table public.um_a_um_registros
  add column if not exists resumo_compartilhado text,
  add column if not exists granola_note_id text unique,
  add column if not exists atualizado_em timestamptz default now();

-- Privacidade: antes, qualquer usuário do domínio lia as 1:1 de todos os CS.
-- Agora: gestor lê tudo; CS comum lê só o próprio. alter policy troca a regra sem drop.
alter policy moai_select on public.um_a_um_registros
  using (public.is_gestor() or cs_nome = coalesce(public.meu_cs(), ''));

-- ---------------------------------------------------------------------------
-- 2. Tabela de granola_notas (usada também por salvar_um_a_um)
-- ---------------------------------------------------------------------------
create table if not exists public.granola_notas (
  note_id text primary key,
  gestor_email text not null,
  titulo text,
  data_reuniao timestamptz,
  criado_em_granola timestamptz,
  atualizado_em_granola timestamptz,
  web_url text,
  participantes jsonb not null default '[]'::jsonb,
  cs_nome text,
  vinculo text not null default 'pendente' check (vinculo in ('auto', 'manual', 'pendente', 'ignorada')),
  resumo_markdown text,
  transcricao jsonb,
  transcricao_expurgada_em timestamptz,
  excluida_no_granola boolean not null default false,
  synced_at timestamptz
);

alter table public.granola_notas enable row level security;
revoke all on public.granola_notas from anon, authenticated;
grant select on public.granola_notas to authenticated;

do $pol$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'granola_notas' and policyname = 'granola_notas_gestor_select') then
    create policy granola_notas_gestor_select on public.granola_notas for select to authenticated using (public.is_gestor());
  end if;
end
$pol$;

-- ---------------------------------------------------------------------------
-- 3. Notas privadas da liderança (tabela separada, nunca lida pelo CS)
-- ---------------------------------------------------------------------------
create table if not exists public.um_a_um_privado (
  registro_id uuid primary key references public.um_a_um_registros(id) on delete cascade,
  notas text,
  atualizado_em timestamptz default now(),
  atualizado_por text
);

alter table public.um_a_um_privado enable row level security;
revoke all on public.um_a_um_privado from anon, authenticated;
grant select on public.um_a_um_privado to authenticated;

do $pol$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'um_a_um_privado' and policyname = 'um_a_um_privado_gestor_select') then
    create policy um_a_um_privado_gestor_select on public.um_a_um_privado for select to authenticated using (public.is_gestor());
  end if;
end
$pol$;

-- ---------------------------------------------------------------------------
-- 4. Itens da 1:1
-- ---------------------------------------------------------------------------
create table if not exists public.um_a_um_itens (
  id uuid primary key default gen_random_uuid(),
  cs_nome text not null,
  registro_id uuid references public.um_a_um_registros(id) on delete set null,
  tipo text not null check (tipo in ('passo_lideranca', 'passo_liderado', 'ponto_atencao')),
  texto text not null check (char_length(texto) between 3 and 600),
  visibilidade text not null check (visibilidade in ('compartilhado', 'privado_gestor')),
  constraint um_a_um_itens_visibilidade_tipo check (
    (tipo <> 'ponto_atencao' or visibilidade = 'privado_gestor')
    and (tipo <> 'passo_liderado' or visibilidade = 'compartilhado')
  ),
  status text not null default 'backlog' check (status in ('backlog', 'em_andamento', 'realizado', 'rejeitado')),
  prioridade text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  prazo date,
  observacao text check (observacao is null or char_length(observacao) <= 600),
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  status_alterado_em timestamptz,
  excluido_em timestamptz,
  excluido_por text
);

create index if not exists um_a_um_itens_cs_status_idx on public.um_a_um_itens (cs_nome, status);
create index if not exists um_a_um_itens_tipo_status_idx on public.um_a_um_itens (tipo, status);

alter table public.um_a_um_itens enable row level security;
revoke all on public.um_a_um_itens from anon, authenticated;
grant select on public.um_a_um_itens to authenticated;

do $pol$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'um_a_um_itens' and policyname = 'um_a_um_itens_select') then
    create policy um_a_um_itens_select on public.um_a_um_itens for select to authenticated
      using (
        public.is_gestor()
        or (excluido_em is null and visibilidade = 'compartilhado' and cs_nome = coalesce(public.meu_cs(), ''))
      );
  end if;
end
$pol$;

-- ---------------------------------------------------------------------------
-- 5. Funções de escrita (gestor)
-- ---------------------------------------------------------------------------
create or replace function public.salvar_um_a_um(
  p_id uuid,
  p_cs_nome text,
  p_data date,
  p_resumo text,
  p_notas_privadas text,
  p_granola_note_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_cs_atual text;
  v_resumo text := nullif(btrim(coalesce(p_resumo, '')), '');
  v_notas text := nullif(btrim(coalesce(p_notas_privadas, '')), '');
  v_email text := auth.jwt() ->> 'email';
  v_nota granola_notas%rowtype;
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  if p_cs_nome is null or not exists (select 1 from cs_config where nome = p_cs_nome) then
    raise exception 'CS inválido' using errcode = '22023';
  end if;
  if p_data is null then
    raise exception 'data obrigatória' using errcode = '22023';
  end if;
  if char_length(coalesce(v_resumo, '')) > 600 or char_length(coalesce(v_notas, '')) > 600 then
    raise exception 'texto acima de 600 caracteres' using errcode = '22023';
  end if;

  if p_id is null then
    insert into um_a_um_registros (cs_nome, gestor_email, data, resumo_compartilhado, atualizado_em)
    values (p_cs_nome, coalesce(v_email, ''), p_data, v_resumo, now())
    returning id into v_id;
  else
    select cs_nome into v_cs_atual from um_a_um_registros where id = p_id for update;
    if not found then
      raise exception 'registro não encontrado' using errcode = 'P0002';
    end if;
    if v_cs_atual <> p_cs_nome then
      raise exception 'o CS de uma 1:1 não pode mudar' using errcode = '22023';
    end if;
    update um_a_um_registros
       set data = p_data,
           resumo_compartilhado = v_resumo,
           atualizado_em = now()
     where id = p_id;
    v_id := p_id;
  end if;

  insert into um_a_um_privado (registro_id, notas, atualizado_em, atualizado_por)
  values (v_id, v_notas, now(), v_email)
  on conflict (registro_id) do update
    set notas = excluded.notas,
        atualizado_em = excluded.atualizado_em,
        atualizado_por = excluded.atualizado_por;

  if p_granola_note_id is not null then
    select * into v_nota from granola_notas where note_id = p_granola_note_id for update;
    if not found then
      raise exception 'gravação do Granola não encontrada' using errcode = 'P0002';
    end if;
    if v_nota.cs_nome is not null and v_nota.cs_nome <> p_cs_nome then
      raise exception 'gravação já vinculada a outro CS' using errcode = '22023';
    end if;
    update granola_notas set cs_nome = p_cs_nome, vinculo = 'manual' where note_id = p_granola_note_id;
    update um_a_um_registros set granola_note_id = p_granola_note_id where id = v_id;
  end if;

  perform public.log_access('um_a_um_salvar', 'ok', jsonb_build_object('id', v_id, 'cs_nome', p_cs_nome), 'um_a_um');
  return v_id;
end
$fn$;

create or replace function public.salvar_um_a_um_item(
  p_id uuid,
  p_cs_nome text,
  p_registro_id uuid,
  p_tipo text,
  p_texto text,
  p_privado boolean,
  p_prioridade text,
  p_prazo date,
  p_observacao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_tipo_atual text;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_visibilidade text;
  v_email text := auth.jwt() ->> 'email';
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  if char_length(v_texto) < 3 or char_length(v_texto) > 600 then
    raise exception 'texto entre 3 e 600 caracteres' using errcode = '22023';
  end if;
  if v_obs is not null and char_length(v_obs) > 600 then
    raise exception 'observação acima de 600 caracteres' using errcode = '22023';
  end if;
  if p_prioridade not in ('alta', 'media', 'baixa') then
    raise exception 'prioridade inválida' using errcode = '22023';
  end if;

  if p_id is null then
    if p_tipo not in ('passo_lideranca', 'passo_liderado', 'ponto_atencao') then
      raise exception 'tipo inválido' using errcode = '22023';
    end if;
    if p_cs_nome is null or not exists (select 1 from cs_config where nome = p_cs_nome) then
      raise exception 'CS inválido' using errcode = '22023';
    end if;
    if p_registro_id is not null and not exists (
      select 1 from um_a_um_registros where id = p_registro_id and cs_nome = p_cs_nome
    ) then
      raise exception 'registro não pertence a este CS' using errcode = '22023';
    end if;

    -- Visibilidade derivada do tipo (decisão tipos_item).
    v_visibilidade := case
      when p_tipo = 'ponto_atencao' then 'privado_gestor'
      when p_tipo = 'passo_liderado' then 'compartilhado'
      when coalesce(p_privado, false) then 'privado_gestor'
      else 'compartilhado'
    end;

    insert into um_a_um_itens (cs_nome, registro_id, tipo, texto, visibilidade, prioridade, prazo, observacao, criado_por)
    values (p_cs_nome, p_registro_id, p_tipo, v_texto, v_visibilidade, p_prioridade, p_prazo, v_obs, v_email)
    returning id, tipo into v_id, v_tipo_atual;
  else
    select tipo into v_tipo_atual from um_a_um_itens where id = p_id and excluido_em is null for update;
    if not found then
      raise exception 'item não encontrado' using errcode = 'P0002';
    end if;

    -- Na edição, tipo e CS não mudam; a visibilidade só muda para passo da liderança.
    v_visibilidade := case
      when v_tipo_atual = 'ponto_atencao' then 'privado_gestor'
      when v_tipo_atual = 'passo_liderado' then 'compartilhado'
      when coalesce(p_privado, false) then 'privado_gestor'
      else 'compartilhado'
    end;

    update um_a_um_itens
       set texto = v_texto,
           visibilidade = v_visibilidade,
           prioridade = p_prioridade,
           prazo = p_prazo,
           observacao = v_obs,
           atualizado_em = now()
     where id = p_id;
    v_id := p_id;
  end if;

  perform public.log_access('um_a_um_item_salvar', 'ok', jsonb_build_object('id', v_id, 'tipo', v_tipo_atual), 'um_a_um');
  return v_id;
end
$fn$;

create or replace function public.definir_status_um_a_um_item(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_status not in ('backlog', 'em_andamento', 'realizado', 'rejeitado') then
    raise exception 'status inválido' using errcode = '22023';
  end if;

  update um_a_um_itens
     set status = p_status,
         status_alterado_em = now(),
         atualizado_em = now()
   where id = p_id and excluido_em is null;
  if not found then
    raise exception 'item não encontrado' using errcode = 'P0002';
  end if;

  perform public.log_access('um_a_um_item_status', 'ok', jsonb_build_object('id', p_id, 'status', p_status), 'um_a_um');
end
$fn$;

create or replace function public.excluir_um_a_um_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  update um_a_um_itens
     set excluido_em = now(),
         excluido_por = auth.jwt() ->> 'email',
         atualizado_em = now()
   where id = p_id and excluido_em is null;
  if not found then
    raise exception 'item não encontrado' using errcode = 'P0002';
  end if;

  perform public.log_access('um_a_um_item_excluir', 'ok', jsonb_build_object('id', p_id), 'um_a_um');
end
$fn$;

create or replace function public.restaurar_um_a_um_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  update um_a_um_itens
     set excluido_em = null,
         excluido_por = null,
         atualizado_em = now()
   where id = p_id and excluido_em is not null;
  if not found then
    raise exception 'item não excluído' using errcode = 'P0002';
  end if;

  perform public.log_access('um_a_um_item_restaurar', 'ok', jsonb_build_object('id', p_id), 'um_a_um');
end
$fn$;

-- Permissões: só authenticated chama, e a função checa is_gestor() no corpo.
revoke execute on function public.salvar_um_a_um(uuid, text, date, text, text, text) from public, anon;
revoke execute on function public.salvar_um_a_um_item(uuid, text, uuid, text, text, boolean, text, date, text) from public, anon;
revoke execute on function public.definir_status_um_a_um_item(uuid, text) from public, anon;
revoke execute on function public.excluir_um_a_um_item(uuid) from public, anon;
revoke execute on function public.restaurar_um_a_um_item(uuid) from public, anon;
grant execute on function public.salvar_um_a_um(uuid, text, date, text, text, text) to authenticated;
grant execute on function public.salvar_um_a_um_item(uuid, text, uuid, text, text, boolean, text, date, text) to authenticated;
grant execute on function public.definir_status_um_a_um_item(uuid, text) to authenticated;
grant execute on function public.excluir_um_a_um_item(uuid) to authenticated;
grant execute on function public.restaurar_um_a_um_item(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Migração do registro existente (decisão legado)
-- ---------------------------------------------------------------------------
update um_a_um_registros
   set resumo_compartilhado = o_que_foi_falado,
       atualizado_em = now()
 where resumo_compartilhado is null
   and o_que_foi_falado is not null
   and btrim(o_que_foi_falado) <> '';

insert into um_a_um_itens (cs_nome, registro_id, tipo, texto, visibilidade, status, criado_em, atualizado_em)
select r.cs_nome, r.id, 'passo_liderado', left(btrim(r.combinados), 600), 'compartilhado', 'backlog', now(), now()
  from um_a_um_registros r
 where r.combinados is not null
   and char_length(btrim(r.combinados)) >= 3
   and not exists (select 1 from um_a_um_itens i where i.registro_id = r.id and i.tipo = 'passo_liderado');
