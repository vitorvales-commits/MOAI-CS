-- Gravações do Granola (08/10/2026): vínculo com o CS, preservação do vínculo manual e retenção.
-- Tudo daqui é só do gestor (RLS em granola_notas). A Edge Function grava com service role.

-- ---------------------------------------------------------------------------
-- 1. Preservação do vínculo: a sincronização nunca mexe em vínculo manual ou ignorado
-- ---------------------------------------------------------------------------
-- A sincronização só grava vinculo 'auto' ou 'pendente'. Quando a linha já está 'manual' ou 'ignorada',
-- essas gravações são revertidas para cs_nome e vinculo antigos. As RPCs gravam 'manual' ou 'ignorada',
-- então não são afetadas.
create or replace function public.granola_notas_preserva_vinculo()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if old.vinculo in ('manual', 'ignorada') and new.vinculo in ('auto', 'pendente') then
    new.cs_nome := old.cs_nome;
    new.vinculo := old.vinculo;
  end if;
  return new;
end
$fn$;

drop trigger if exists granola_notas_preserva_vinculo on public.granola_notas;
create trigger granola_notas_preserva_vinculo
  before update on public.granola_notas
  for each row execute function public.granola_notas_preserva_vinculo();

-- ---------------------------------------------------------------------------
-- 2. Vínculo manual pela Fila da liderança (gestor)
-- ---------------------------------------------------------------------------
create or replace function public.vincular_granola_nota(p_note_id text, p_cs_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_gestor() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  if p_cs_nome is null then
    update granola_notas set cs_nome = null, vinculo = 'ignorada' where note_id = p_note_id;
  else
    if not exists (select 1 from cs_config where nome = p_cs_nome) then
      raise exception 'CS inválido' using errcode = '22023';
    end if;
    update granola_notas set cs_nome = p_cs_nome, vinculo = 'manual' where note_id = p_note_id;
  end if;
  if not found then
    raise exception 'gravação não encontrada' using errcode = 'P0002';
  end if;

  perform public.log_access(
    'granola_vinculo',
    'ok',
    jsonb_build_object('note_id', p_note_id, 'cs_nome', p_cs_nome),
    'granola'
  );
end
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Retenção da transcrição (chamada pela Edge Function, só service_role)
-- ---------------------------------------------------------------------------
create or replace function public.expurgar_transcricoes_granola(p_dias int)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_linhas int;
begin
  update granola_notas
     set transcricao = null,
         transcricao_expurgada_em = now()
   where data_reuniao < now() - make_interval(days => p_dias)
     and transcricao is not null;
  get diagnostics v_linhas = row_count;
  return v_linhas;
end
$fn$;

-- Permissões
revoke execute on function public.vincular_granola_nota(text, text) from public, anon;
grant execute on function public.vincular_granola_nota(text, text) to authenticated;
revoke execute on function public.expurgar_transcricoes_granola(int) from public, anon, authenticated;
grant execute on function public.expurgar_transcricoes_granola(int) to service_role;
