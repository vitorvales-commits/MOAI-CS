-- Reserva de data para o resultado de matchmaking criado já preenchido (05/11/2026).
--
-- Causa: no Monday, um item criado com o resultado já preenchido não tem changed_at na coluna Resultado
-- (o value traz só o texto). Ficavam 18 matchmakings de outubro com resultado e sem data de registro.
-- Correção: a data de registro vem do changed_at quando existe; na falta, do created_at_monday do item.
-- Nunca usa now(). Se nenhum dos dois existir, a data continua nula e o item é pendente no log do sync.
-- Idempotente.

create or replace function public.matchmakings_marcar_resultado_registrado()
returns trigger
language plpgsql set search_path = public as $function$
begin
  if new.resultado_registrado_em is null
     and nullif(trim(coalesce(new.resultado, '')), '') is not null
     and coalesce(new.resultado_alterado_em_monday, new.created_at_monday) is not null then
    new.resultado_registrado_em := coalesce(new.resultado_alterado_em_monday, new.created_at_monday);
  end if;
  return new;
end $function$;

-- Preenche os já existentes sem data: só resultado preenchido, sem data de registro e com created_at_monday.
-- Não toca em nenhuma outra linha.
update public.matchmakings_items
   set resultado_registrado_em = created_at_monday
 where resultado_registrado_em is null
   and nullif(trim(coalesce(resultado, '')), '') is not null
   and created_at_monday is not null;
