:- encoding(utf8).
% ============================================================================
% report_individual.pl
% Entrega de 07/10/2026, branch feat/report_individual_health_base: Health da
% Base redefinido como percentual de críticos, aba Report nativa na página do
% CS com rastreio nominal de críticos, e substituição (a partir da data de
% corte) do board 18394181332 Reports Individuais CS. Corrige a definição de
% Health da Base de handoff/semaforo_healthscore.pl (presença saiu do cálculo).
% ============================================================================

:- discontiguous regra/2, revogada/2, tabela/2, funcao/2, arquivo/2, migracao/2,
   validado/2, pendente/2, achado/2, padrao_adotado/2.

% ---- regras de negócio ----
regra(health_base, "Health da Base = percentual de membros críticos na base do CS (report vigente mais recente do período) + pontos de advertência ativos x PESO_PONTO_ADVERTENCIA_DECIMOS (10), teto 100,0. Menor é melhor. calcularHealthBase(criticos, base, pontos) em lib/indicadores-base.ts é o único cálculo. Presença não entra.").
revogada(health_base_presenca, "Definição de 07/10/2026 em semaforo_healthscore.pl (presença da carteira em escala inversa). HEALTH_BASE_ESCALA_INVERSA removida.").
regra(valor_mensal, "Indicadores e metas: último report vigente com semana_inicio dentro do mês. Mês sem report = Sem report (nunca zero). Aba Report e kanban mostram o mais recente, com selo desatualizado acima de REPORT_VALIDADE_DIAS (14).").
regra(valor_time, "health_base_area(p_de, p_ate): críticos únicos dos reports nativos mais recentes + contagem dos que só têm importado, sobre a união dos membros elegíveis das carteiras dos CS ativos. Razão ponderada (indicadores_catalogo.agregacao_time = razao_ponderada), sem advertência.").
regra(membros_elegiveis, "membros_elegiveis_rede() no banco é a fonte única: titulares de grupos ativos, sem Conselheiro, Sócio de Conselheiro, Mentor Alavanca e status nulo; cs_nomes pelo vínculo (Apelido) do título. Usada pelo kanban (via getDadosBrutos), pelo menu do report, pelo denominador e pelo total da rede.").
regra(vigencia, "reports_vigentes(): nativo sempre; importado do Monday só antes de configuracoes_globais.data_corte_reports_nativos (nula = sempre) e só sem nativo na mesma semana; dois importados na mesma semana: vale o mais recente.").
regra(criticos_nominais, "O número de críticos nunca é digitado no nativo: é a contagem dos membro_id enviados, validados no servidor contra a base do CS. base_total é snapshot no envio.").
regra(indicacoes_matchmakings, "Autodeclarados passam a vir de reports_resumo_cs (data_efetiva = data do report ou criação no Monday), não mais de reports_semanais_items. CS resolvido pelo nome do report via alias, não pelo creator_id.").

% ---- dados ----
tabela(reports_individuais, "Um report por CS por semana (único parcial para nativo). origem nativo|monday, base_origem snapshot_carteira|declarada_monday, criticos_origem nomeados|contagem_monday. RLS: gestor tudo, CS só o próprio. Escrita só por salvar_report_individual e pela sync (service role).").
tabela(reports_individuais_criticos, "report_id, membro_id, group_id, nome_snapshot. Nomes só aqui; nunca em auditoria nem em visão agregada.").
tabela(reports_cs_aliases, "Nome digitado normalizado -> CS. aplicado = usado pela sync; confirmado = conferido pelo Vitor. Só gestor lê.").
funcao(rpc, "membros_elegiveis_rede, report_resolver_cs, membros_da_base_cs, reports_vigentes (invoker), reports_resumo_cs, report_individual_semana, reports_historico_cs, criticos_atuais_cs, health_base_area, salvar_report_individual, definir_data_corte_reports. Execute só para authenticated.").
migracao('2026-10-07', "20261007_report_individual.sql, 20261007_report_individual_data_efetiva.sql, 20261007_health_base_area_periodo.sql. Aplicadas via MCP nesta sessão. Catálogo: critico fonte calculado; health_base unidade percentual, agregação razao_ponderada.").
arquivo(criado, "app/api/cs/[nome]/report/route.ts, app/api/cs/[nome]/report/membros/route.ts, handoff/report_individual.pl").
arquivo(modificado, "lib/constants.ts, lib/indicadores-base.ts, lib/reports.ts, lib/consulta.ts, app/api/consulta/route.ts, app/dashboard-html.ts (aba Report, card Health), app/gestor-html.ts (import relativo), supabase/functions/sync-monday/index.ts (v30, NÃO implantada), tests/*.").

% ---- backfill ----
validado(backfill, "187 itens do board lidos ao vivo em 07/10/2026 e gravados em reports_individuais origem monday pela mesma transformação da sync v30 (sem os textos livres risco e por quê, que entram na primeira execução da sync implantada). 187 linhas, 0 monday_item_id repetido, ids iguais aos de reports_semanais_items. 88 mapeados (George 16, Marcos 25, Mateus 10, Vilker 20, Vitor 17), 99 nao_mapeado. 168 vigentes.").
achado(creator_id, "creator_id não identifica o respondente: a conta do Marcos criou itens de Yasmim, Luma e Vinicius; a conta 21005878 criou itens de Luma, Lucas, Lorena e Ale; a de Mateus criou um item de Vilker. Por isso o mapeamento é por nome digitado.").
achado(semana_aproximada, "143 de 187 itens sem a coluna Data. Semana vem do título do grupo (jan a abr, exata) ou da criação (mai a out, aproximada, data_aproximada = true).").

% ---- validações ----
validado(permissoes, "Simulando authenticated real: CS dono lê base (50) e grava; outro CS 42501 ao ler base, histórico ou gravar; RLS devolve 0 linhas de outro CS; resumo não expõe críticos de outro CS; sem vínculo 42501; gestor lê e edita semana antiga; auditoria só com contagens; reenvio na mesma semana atualiza (1 report).").
validado(servidor, "Rejeitados com 22023: membro de outra carteira, nota 11, semana fora da janela, críticos + níveis acima da base.").
validado(health, "SQL: George 4/50 = 8,0; Vitor 7/43 = 16,3; Mateus 3/20 = 15,0; Marcos 1/50 = 2,0; Vilker 4/46 = 8,7. Luana (10 pontos ativos) e Rodrigo: Sem report. Advertência vencida coberta por teste unitário.").
validado(kanban, "Com Mentor Alavanca fora: crítica 13, baixa 49, atenção 55, saudável 136 (era 137), sem apuração 7 (era 8), 260 elegíveis.").

% ---- pendências ----
pendente(deploy_sync, "Implantar supabase/functions/sync-monday v30 (diff só acrescenta; repositório era idêntico à produção v29). Comando: npx supabase functions deploy sync-monday --project-ref evwdfeumlnxeqnnakdvq. Sem isso, reports novos do board não chegam a reports_individuais.").
pendente(mapeamento_nomes, "Confirmar Rodrigo Nathan (mesma conta Monday de Rodrigo, cs_config diz Rodrigo Queiroz Campos), Amanda Leite e ex CS (Alejandro, Ale, Lucas, Lucas Nicoli, Lorena, Luma, Yasmim, Yas, Vinicius Walviesse). Enquanto isso Rodrigo fica Sem report e sem indicações/matchmakings autodeclarados.").
pendente(base_status, "Mentor Alavanca e status nulo ficam fora da base até decisão do Vitor.").
pendente(data_corte, "Definir data de corte (definir_data_corte_reports) e, no mesmo dia, tirar reports_semanais do agendamento da sync.").
pendente(campo_manual, "metas_subitens (Health da Base e Críticos manuais) ainda é lido por metas_cs_base; não usado pelo app. Remover só com confirmação.").
pendente(preview_clicado, "Clicar no preview como CS e como gestor (sem browser nesta sessão; validação visual por fixtures).").
