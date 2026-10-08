:- encoding(utf8).
% ============================================================================
% historico.pl
% Registro cronológico das entregas do dash de CS. Cada entrada diz o que foi
% publicado, em que versão, e onde ficou a evidência. Detalhes técnicos ficam
% nos arquivos temáticos (churn.pl, dados.pl, report_individual.pl, etc.).
% ============================================================================

:- discontiguous entrega/4, versao_producao/3, evidencia/2.

% ---- 08/10/2026: onda 2 do churn ----
entrega(churn_onda2, 2026_10_08, "Churn e voz do membro: aba reconstruída, visitas de reversão, exclusão na Voz do liderado, farol da semana na home, relatório anonimizado, sem IA. PR #2 mesclado na main.", "handoff/dados.pl, handoff/pendencias.pl").

versao_producao(sync_monday, 30, "Sync com a gravação de reports_individuais (v30 do report individual, que estava na main desde 07/10/2026) e com a nova tarefa visitas_churn. Publicada em 08/10/2026 pelo Supabase como versão 30, verify_jwt ligado, código idêntico ao da branch feat/churn_onda2. Rollback da v29 guardado fora do repositório.").

evidencia(sync_monday_v30_pos_deploy, "Sync completo pelo cron das 14:40 UTC, 08/10/2026: todos os boards com sucesso em sync_log, inclusive visitas_churn (0 itens, igual ao board menos o item TESTE). nps_conselhos_items sem nenhuma nota fora de faixa nas nove colunas. reports_individuais com 188 linhas (esperado 187 ou mais).").

evidencia(correcao_nps_faixa, "Correção única dos dados: 15 notas fora de faixa em nps_conselhos_items viraram nulo (nota_conselheiro, nota_conselho, nota_cs_hoje, nota_cs_mes, nota_estrutura_local, nota_comida_local, e avaliações de trocas e evolução fora de 1 a 5). Feita na migração churn_onda2 (versão 20261008134435).").

evidencia(testes_onda2, "tsc --noEmit e next build sem erro. Testes novos passam: tests/voz-membro.test.ts, tests/visitas.test.ts, tests/voz.test.ts. Dois testes já falhavam antes desta onda, por resolução de módulo, e não foram alterados: tests/churn.test.ts e tests/pulso.test.ts.").
