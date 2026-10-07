:- encoding(utf8).
% ============================================================================
% semaforo_healthscore.pl
% Entrega de 07/10/2026, branch feat/semaforo_healthscore: semáforo de
% confirmações na agenda, percentuais por faixa no kanban da Visão da rede e
% Health da Base calculado pela presença da carteira com desconto das
% advertências ativas. Os arquivos regras_negocio.pl, convencoes.pl,
% armadilhas.pl e historico.pl citados no prompt não existem neste
% repositório; o registro fica aqui e em aplicacao.pl/consulta_metas.pl.
% ============================================================================

:- discontiguous decisao_ui/2, regra/2, revogada/2, arquivo/2, migracao/2,
   validado/2, pendente/2, achado/2, padrao_adotado/2.

% ---- decisões de interface ----
decisao_ui(agenda_cor, "Substitui a de 28/09: o fundo de cada conselho aberto é a cor do semáforo de confirmações (0 a 1 vermelho, 2 a 3 laranja, 4 a 5 amarelo, 6 a 7 verde, 8 ou mais azul). O nível vira um ponto de 8 px antes do título. Selo numérico sempre visível, inclusive zero. Aria label e tooltip com nível, CS, contagem e faixa. Legenda gerada da constante.").
decisao_ui(agenda_encerrado, "Conselho cujo término (início mais AGENDA_DURACAO_CONSELHO_MIN, 240 min) já passou usa fundo neutro #64748B e mostra presentes de registrados. Rounds mantêm a cor do status.").
decisao_ui(kanban_percentual, "Cabeçalho de cada coluna mostra contagem e percentual com uma casa, pelo maior resto, somando 100,0. Seletor de carteira (Todos, cada CS ativo, Ex CS agregado), barra empilhada por CS ativo com o Health da Base, nota com membros sem apuração.").
decisao_ui(health_base_card, "Card mostra o Health da Base com uma casa e vírgula, a composição na linha de apoio e no tooltip, e Sem apuração quando a carteira não tem membro apurado. Selo de recorde omitido para este indicador.").

% ---- regras de negócio ----
regra(semaforo_confirmados, "SEMAFORO_CONFIRMADOS em lib/constants.ts, aplicada por semaforoConfirmados em lib/indicadores-base.ts; injetada nos templates HTML. Nenhum limiar fora da constante.").
regra(confirmados_deduplicados, "confirmadosDoMes (agenda) deduplica por nome normalizado entre titulares e reposição; selo e cor saem da mesma lista.").
regra(faixa_presenca, "FAIXAS_PRESENCA em lib/constants.ts (até 20 crítica, até 50 baixa, até LIMIAR_PRESENCA_ATENCAO atenção, acima saudável), aplicada por faixaPresenca. bandaPresenca foi removida; corPresenca do gestor deriva da mesma constante.").
regra(carteira_cs, "gruposDaCarteira: grupos não repo cujo título contém (ApelidoConselho). Conselho com mais de um CS conta para cada um. Membro = titular sem Conselheiro e Sócio de Conselheiro.").
regra(health_base, "calcularHealthBase: média simples da presença individual acumulada (décimos) dos membros apurados, menos PESO_PONTO_ADVERTENCIA_DECIMOS (10) por ponto ativo, piso zero; exibido como 1000 menos a saúde líquida (HEALTH_BASE_ESCALA_INVERSA). Sem membro apurado devolve Sem apuração, nunca zero.").
regra(health_base_area, "Indicadores gerais da área: rede inteira (mesmo universo do kanban), cada membro uma vez, sem desconto de advertência.").
regra(advertencia_ativa, "advertenciaAtiva (aplicado_em mais validade_meses maior que agora) é a única regra de validade; pontuacaoAtiva soma os pontos ativos. aplicar e excluir advertência invalidam o cache de dados brutos.").
revogada(advertencia_separada, "A advertência deixou de ser só indicador visual: a pontuação ativa desconta do Health da Base do CS.").
revogada(agenda_cor_28_09, "Cor de fundo pelo nível do conselho.").
revogada(agenda_indicador_confirmacao_sem_vermelho, "Só para a cor do bloco: zero confirmado é vermelho.").

% ---- consulta rápida ----
regra(fonte_health_base, "Nova regra_fonte: Health da Base usa o valor calculado (aplicarHealthBaseCalculado em lib/consulta.ts, via healthBaseExibidoPorCS), nunca o manual, sem blending. Só vale para o mês corrente; em outro mês a linha sai da contagem com aviso.").
achado(cobrir_health_base_resolvida, "pendencia_consulta(cobrir_health_base) resolvida.").

% ---- arquivos ----
arquivo(criado, "lib/indicadores-base.ts, tests/indicadores-base.test.ts, supabase/migrations/20261007_health_base_calculado.sql, handoff/semaforo_healthscore.pl").
arquivo(modificado, "lib/constants.ts, lib/reports.ts, lib/consulta.ts, app/api/consulta/route.ts, tests/consulta.test.ts, app/dashboard-html.ts, app/gestor-html.ts").
migracao('2026-10-07', "20261007_health_base_calculado.sql: indicadores_catalogo.health_base passa a direcao max e fonte calculado. Aplicada no banco via MCP nesta sessão. Sem função nova; get_advisors sem alerta novo.").

% ---- achados ----
achado(bloco_preto_terca, "Causa raiz: app/dashboard-html.ts pintava de #1A1A1A todo conselho cujo INÍCIO já tinha passado (item.passado). Corrigido: passado agora é término passado, estilo neutro.").
achado(metas_health, "Metas de Health da Base cadastradas: 20 e 25 (jun a out/2026, CS e time). Coerentes com limite máximo, sem necessidade de perguntar a direção.").
achado(arquivos_handoff_ausentes, "regras_negocio.pl, convencoes.pl, armadilhas.pl e historico.pl não existem no repositório.").

% ---- valores conferidos por SQL em 07/10/2026 ----
validado(kanban_rede, "Crítica 13, baixa 49, atenção 55, saudável 137, total apurado 254, 8 sem apuração. Percentuais 5,1, 19,3, 21,7, 53,9. Igual ao print.").
validado(health_por_cs, "Presença média (décimos) e Health da Base exibido: George 743 e 25,7; Luana 493 menos 10 pontos ativos e 60,7; Marcos 758 e 24,2; Mateus 687 e 31,3; Rodrigo 765 e 23,5; Vilker 612 e 38,8; Vitor 704 e 29,6. Rede 705 e 29,5. Ex CS: 1 membro apurado.").
validado(build, "tsc --noEmit, next build, node --check nos scripts inline renderizados, testes unitários. next lint não roda (ESLint ausente).").
validado(screenshots, "Fixture com os sete blocos do print e faixas 0, 1, 2, 3, 7, 9 renderizada em Edge headless, desktop e 390 px, semana, lista e mês; kanban com as contagens reais.").

% ---- pendências ----
pendente(preview_clicado, "Clicar no preview como gestor e como CS comum (extensão do Chrome não conectada nesta sessão). Conferir Health na tela contra validado(health_por_cs).").
pendente(permissoes_preview, "Exercitar com sessão real: CS comum vê só o próprio Health (/api/cs/[nome] já devolve 403 para outro CS); sessão sem vínculo não vê nada.").
pendente(campo_manual, "Health manual ainda é lido por metas_cs_base (alcancado_manual) e alimenta historico_indicador/recorde_efetivo do banco. Remover só com confirmação do Vitor.").
pendente(peso_advertencia, "Luana tem 10 pontos ativos (um tipo vale 10 pontos), desconto de 10,0 p.p. Confirmar se o peso de 1,0 p.p. por ponto está adequado.").
pendente(horizonte_semaforo, "Conselhos distantes no mês tendem a vermelho por falta de confirmação. Avaliar janela de dias antes do encontro, só com decisão do Vitor.").
