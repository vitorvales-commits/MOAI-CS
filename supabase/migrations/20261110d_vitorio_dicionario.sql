-- ============================================================================
-- Vitorio 2, PR de leitura do dicionário (10/11/2026): reconhecimento de CS e conselhos para o Vitorio.
--
-- O que muda (aditivo):
--   public.vitorio_dicionario()   devolve um jsonb com três listas:
--     cs          todos os CS de canonico.cs (ativos e ex CS): id, nome_curto, nome_completo, ativo. Ex CS entram
--                 para que apelidos e vigências históricas sempre apontem para um cs_id existente na lista.
--     apelidos    apelidos confirmados (canonico.cs_apelidos). Classe 'cs' traz o cs_id; classes 'area' e 'ignorar'
--                 vêm só como lista de termos a não tratar como CS, com cs_id nulo.
--     conselhos   vigências de canonico.conselho_cs_vigencia com group_id, titulo do conselho (conselhos_grupos),
--                 cs_id, inicio e fim (fim nulo = vigência aberta). Traz o histórico para perguntas de mês passado.
--
-- Não reaproveita canonico_pendencias nem canonico_cobertura (fila de vínculos, textos pendentes e sugestões: não
-- servem ao reconhecimento). cs_ativos_lista é só gestor, e o CS também precisa reconhecer nomes.
-- Não devolve números, metas, pontuação, bônus, 1:1 nem e-mail.
-- Acesso: qualquer usuário MOAI (is_moai_user), CS e gestor. Anon e authenticated sem MOAI recebem recusa.
-- Rollback: drop function public.vitorio_dicionario();
-- ============================================================================

create or replace function public.vitorio_dicionario()
returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not coalesce(public.is_moai_user(), false) then
    raise exception 'Acesso restrito ao time MOAI.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'cs', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome_curto', c.nome_curto, 'nome_completo', c.nome_completo,
                                          'ativo', c.ativo)
                       order by c.nome_curto)
        from canonico.cs c
    ), '[]'::jsonb),
    'apelidos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'texto', a.texto_normalizado,
               'classe', a.classe,
               'cs_id', case when a.classe = 'cs' then a.cs_id else null end)
             order by a.texto_normalizado)
        from canonico.cs_apelidos a where a.confirmado
    ), '[]'::jsonb),
    'conselhos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'group_id', v.group_id,
               'titulo', g.titulo,
               'cs_id', v.cs_id,
               'inicio', lower(v.vigencia),
               'fim', upper(v.vigencia))
             order by v.group_id, lower(v.vigencia))
        from canonico.conselho_cs_vigencia v
        left join public.conselhos_grupos g on g.group_id = v.group_id
    ), '[]'::jsonb)
  );
end;
$fn$;

revoke all on function public.vitorio_dicionario() from public, anon;
grant execute on function public.vitorio_dicionario() to authenticated, service_role;

select seguranca.aplicar_protecoes();
