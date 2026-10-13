-- CS Destaque só pela liderança (13/10/2026). A função aceitava o próprio CS (meu_cs() = p_nome), o que
-- permitia a qualquer CS se autoatribuir o emblema chamando a RPC direto com a sessão dele, mesmo com a
-- rota /api/destaque já restrita a gestor. Mesma função, só a checagem de permissão muda.
create or replace function public.set_destaque(p_nome text, p_valor integer)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_clamped integer;
  v_actor text;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_clamped := greatest(0, least(999, coalesce(p_valor, 0)));
  v_actor := auth.jwt() ->> 'email';

  update public.cs_config
    set vezes_destaque = v_clamped, updated_at = now()
    where nome = p_nome;

  if not found then
    raise exception 'CS "%": não encontrado', p_nome using errcode = 'P0002';
  end if;

  insert into public.access_audit_log(user_email, action, resource, result, metadata)
    values (v_actor, 'set_destaque', p_nome, 'success', jsonb_build_object('novo_valor', v_clamped));

  return v_clamped;
end;
$function$;
