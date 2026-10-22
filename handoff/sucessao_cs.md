# Sucessão de CS: runbook

A carteira de um CS é definida pelo título do grupo no Monday ("Nível | Conselheiro (CS)"). A transferência acontece quando o CS entre parênteses muda. O histórico do CS que sai (cases, rounds, matchmakings, reports, churn e pontuação dos meses fechados) continua dele, porque é atribuído pelo autor ou pelo campo de pessoa na época. Nunca reatribuir histórico.

## Antes da data de corte
1. Buscar o CS novo no Monday pelo ID de usuário e confirmar e-mail, função e data de corte (padrão: dia 1 do mês seguinte, para o mês corrente fechar inteiro com quem sai).
2. Em produção, por SQL e com registro em `access_audit_log` (`via: sessao_claude_sql`):
   - `cs_config`: nome, nome_completo, apelido_conselho igual ao nome, monday_user_id, ativo, tipo `atual`, meta_carteira herdada de quem sai, obrigado_report conforme decisão;
   - `cs_usuarios`: e-mail do CS novo.
3. Incluir o período em `supabase/seed/cs_periodos.sql` com primeiro mês igual ao mês da data de corte.

## Na data de corte
4. Monday, só com autorização explícita: trocar "(CS antigo)" por "(CS novo)" no título de cada grupo; atualizar `cs_responsavel` dos conselheiros no board Conselheiros 2026; conferir que os próximos ciclos do board de histórico de GTD saem com o CS novo.
5. CS que sai: `ativo = false` e `tipo = 'ex'` em `cs_config`, e desvincular o e-mail em `cs_usuarios`. O histórico segue visível nas telas de período.
6. Gerar as metas do CS novo pelo botão Sugerir metas (a rampa de primeiro mês cobre a entrada) e deixar o gestor salvar.

## Conferência
- Controle de perfis, cartão "Carteira: cadastro e título do grupo": zero grupos com CS inativa ou não cadastrada e zero divergências de cadastro.
- CS que sai não aparece no Time de CS, no ranking nem no alerta de report a partir do mês seguinte.
- Sem foto, a inicial é o fallback: não adicionar entrada em `FOTOS_CS`.

## Armadilha vista em 22/10/2026
`cs_config` de quem sai pode ser desativado antes da data de corte. Enquanto os grupos ainda trazem o nome dele no título, o alerta acima os lista como "CS inativa". Isso é o comportamento esperado até o rename no Monday.
