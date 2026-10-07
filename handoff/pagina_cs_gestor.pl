:- encoding(utf8).
% ============================================================================
% pagina_cs_gestor.pl
% Entrega de 07/10/2026, branch feat/pagina_cs_gestor: pontuação corrigida e
% CS Top 3, GTD no detalhe do conselho, cards com foto e página do CS na visão
% do gestor. regras_negocio.pl, aplicacao.pl, armadilhas.pl e historico.pl
% citados no prompt não existem neste repositório; o registro fica aqui.
% ============================================================================

:- discontiguous regra/2, revogada/2, armadilha/2, padrao_adotado/2, pendente/2, arquivo/2.

regra(elegibilidade_pontuacao, "Só entra na média o indicador com meta cadastrada (maior que zero) e dado no período, com pesos renormalizados. Sem meta: sem_meta, fora da média. lib/pontuacao.ts é a única função (calcularScoreCS, rankingCSAtivos).").
regra(minimo_indicadores, "PONTUACAO_MIN_INDICADORES_COM_META = 3 em lib/constants.ts. Abaixo disso: Sem dados suficientes, sem número, fora do ranking e do Top 3.").
regra(ranking_nominal, "Só cs_config com ativo verdadeiro e fora de EX_MEMBROS_SEM_CONTA. Empate: mais indicadores elegíveis, depois ordem alfabética.").
regra(carteira_na_pontuacao, "A carteira só pontua com meta PRÓPRIA do CS. O fallback do maior número de conselhos do time continua só como régua de exibição, nunca da pontuação.").
regra(gtd_antes_depois, "Decisão do Vitor: sinal do prefixo do rótulo. D-N é antes do conselho, D+N é depois. Sem prefixo reconhecido aparece à parte. lib/gtd.ts.").
regra(gtd_agregado, "Cumprimento do GTD do CS é a razão pooled de etapas feitas sobre etapas totais dos ciclos atuais (maior data_conselho por id_item_conselho), não a média das taxas.").
regra(gtd_vinculo, "O vínculo do ciclo ao conselho é pelo nome do conselheiro (membro do histórico contra o contato do título), o mesmo da visão do CS. Sem vínculo: nota Não vinculado, sem adivinhar.").
regra(componente_unico, "Checklist do GTD em lib/gtd-checklist.ts e radar em lib/radar-svg.ts: CSS e JS exportados uma vez e injetados em cada página. Proibido segunda implementação.").
regra(criticos_por_produto, "criticosPorProdutoCS: report mais recente do CS. Com nomes, por produto (nível do conselho, Setorial exibido como Executivo); só contagem importada do Monday, total declarado e Sem detalhamento por produto; sem report, Sem report.").
regra(advertencia_local, "Aplicar, editar e excluir advertência moram em /gestor/cs/[nome]. A aba do dashboard virou Pontos tomados, somente leitura, com Health da Base com e sem os pontos. Funções SECURITY DEFINER inalteradas.").
revogada(advertencia_visibilidade, "A aba Advertências igual para gestor e CS, com escrita do gestor nela, foi substituída por Pontos tomados somente leitura.").
armadilha(credito_por_ausencia_de_meta, "achievementIndicador dava 30 por cento (mínimo) ou 100 por cento (máximo com zero) a indicador sem meta, e o ranking nominal usava a lista com ex CS. Resultado: Luana com 50 só com a meta de carteira, e Luma e Lanna no Top 3.").
armadilha(worktree_compartilhado, "Outra sessão edita o mesmo diretório moai-cs-repo. Trabalhar em worktree próprio (moai-cs-pagina-cs) e não trocar a branch do diretório principal.").

arquivo(novo, "lib/pontuacao.ts, lib/gtd.ts, lib/gtd-checklist.ts, lib/criticos.ts, lib/radar-svg.ts, app/gestor-cs-html.ts, app/gestor/cs/[nome]/page.tsx, app/api/gestor/cs/[nome]/route.ts, tests/pontuacao.test.ts, tests/gtd.test.ts, tests/criticos.test.ts").

padrao_adotado(dedupe_percentual_criticos, "lib/criticos.ts tem percentualCriticosDecimos próprio porque a versão de indicadores-base.ts ainda está na branch feat/report_individual_health_base. Unificar ao juntar as duas.").
pendente(luana, "Luana só tem a meta de carteira em metas_definidas. Confirmar se faltam metas dela no board de Metas.").
pendente(gtd_na_pontuacao, "GTD aparece no radar e não pesa na pontuação. Padrão mantido: não entra.").
pendente(nomes_na_pagina, "A página mostra só percentuais de críticos. Lista nominal por produto, só para gestor, depende de decisão.").
pendente(reports_sem_nomes, "Os 187 reports no banco são importados do Monday (contagem_monday) e nenhum tem críticos nomeados: por produto aparece Sem detalhamento por produto até existirem reports nativos.").
