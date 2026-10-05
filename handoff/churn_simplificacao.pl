:- encoding(utf8).
% ============================================================================
% churn_simplificacao.pl
% Simplificação da tela de churn (05/10/2026, terceiro prompt prompt_onda1_simplificacao.pl).
% Substitui, no que conflitar, handoff/churn_ajustes.pl: o cartão da Comunidade, a linha tracejada
% de recorde e o painel de quatro números deixaram de existir. Só registra o que foi verificado
% nesta sessão (SQL no banco, harness com as 220 linhas reais, tsc, testes e next build).
% ============================================================================

:- discontiguous funcao/2, rota/2, regra_negocio/2, decisao_padrao/2, achado/2, validado/2,
   pendente/2, removido/2, entrega_historico/2.

% ---- regras de negócio (texto pronto para regras_negocio.pl) ----
regra_negocio(churn_carteira_atual, "Churn oficial, nível 1: churns atribuídos a CS ativos hoje, sem a Comunidade. É o número que se compara com a meta e o do card Churn dos Indicadores gerais da área.").
regra_negocio(churn_toda_a_rede, "Churn, nível 2: todos os churns, incluindo ex CS, sem CS e, se o filtro de produto permitir, a Comunidade.").
regra_negocio(comunidade_fora_da_carteira, "A Comunidade nunca entra na carteira atual, nem quando o membro está sob um CS ativo, porque a Comunidade não tem CS. Só entra em Toda a rede, se marcada no filtro de produtos.").
regra_negocio(nenhum_churn_some, "Nenhum churn é excluído por regra silenciosa. Quem está fora de uma base aparece na lista de auditoria com a etiqueta Comunidade, Ex CS, Sem CS ou Fora do filtro.").
regra_negocio(mes_padrao, "Mês de referência padrão: o último mês fechado. O mês em andamento continua selecionável e mostra o rótulo até o dia de hoje, sem variação.").
regra_negocio(recorde_na_tela, "A nota de recorde usa o mesmo filtro e a mesma base da tela, sobre o histórico inteiro, e declara a base na frase. Não existe linha de recorde dentro do gráfico.").

% ---- dados ----
funcao(churn_base/7, "Base única das duas definições. carteira_atual: cs_categoria igual a cs_ativo e eh_comunidade falso (a chave da Comunidade é ignorada). toda_a_rede: churn_filtrados_multi.").
funcao(churn_tela/7, "Consulta única da tela, só gestor: série por motivo (12 meses ou semanas do mês), total do mês de referência e do anterior, motivo mais citado, recorde mensal e semanal no mesmo filtro, resumo da Comunidade e primeiro mês com churn de CS ativo (derivado dos dados). Tudo sai de um conjunto materializado.").
funcao(churn_itens_recorte/7, "Lista de auditoria, só gestor: todos os churns do intervalo, com dentro (compõe o número) e etiqueta de quem ficou fora.").
funcao(churn_recorte_hash/7, "Hash do recorte com a base, para o aviso de análise desatualizada.").
funcao(churn_total_carteira/2, "Total da carteira atual num intervalo. Lido pelo card Churn do time (generateEquipeReport), com queda para a soma dos CS se a RPC falhar.").
funcao(historico_indicador_churn, "historico_indicador('churn') passou a ser carteira atual (CS ativos, sem a Comunidade, data de referência). Afeta metas_time_mensal, consulta rápida e recordes dos cards, que agora usam a mesma definição do card. Os outros indicadores ficaram idênticos.").
funcao(recordes_painel_churn, "O painel de recordes calcula o churn pela carteira atual, então valor, meta e recorde comparam a mesma coisa.").
rota('/api/gestor/churn', "Resposta montada por respostaTela (lib/churn.ts) a partir de churn_tela. Parâmetro novo base (padrão carteira_atual). Sem ref, último mês fechado.").
rota('/api/gestor/churn/itens', "GET, gestor. Lista de auditoria do mês, com ?formato=csv para exportar. Cada consulta e cada exportação ficam em access_audit_log. CSV protegido contra fórmula em planilha.").
rota(card_churn, "parseChurn (lib/reports.ts) conta por data_referencia e ignora a Comunidade. Revenue churn ficou exatamente como era.").

% ---- removido da tela ----
removido(cartao_comunidade, "Virou uma linha sob o gráfico, com Ver detalhes.").
removido(chips_mensais, "Os doze chips da Comunidade.").
removido(linha_tracejada_de_recorde, "Substituída pela nota de texto.").
removido(nota_nao_fecha, "A causa dela, totais sem reconciliação, deixou de existir.").
removido(terceiro_numero_e_tabela, "Só dois números grandes. A tabela de motivos da tela foi embora; o relatório impresso continua com a dele.").

% ---- diagnóstico (etapa 0) ----
achado(causa_barras_vazias, "Reconfirmado por SQL: nov/25 a mai/26 só têm churn sem produto informado (mais Comunidade). Com o filtro de produtos sem essa opção marcada, a conta principal desses meses é zero. Divergência com o prompt: a opção Sem produto informado EXISTE no código entregue (marcada por padrão, 126 churns fora da Comunidade) e o print mostra 6 de 7 produtos, que é o que dá desmarcá la. A causa real é que desmarcar uma opção apaga o histórico em silêncio. Com a carteira como padrão e a lista de auditoria, esse apagamento deixou de ser silencioso.").
achado(origem_do_11, "Reproduzido: setembro de 2026 tem 11 churns de CS ativos, um deles da Comunidade. Sem a Comunidade são 10, igual à meta. O card passava a Comunidade quando havia CS ativo vinculado.").
achado(reconciliacao_setembro, "22 no total igual a 10 da carteira atual, mais 3 ex CS, mais 3 sem CS, mais 6 da Comunidade.").
achado(primeiro_mes_carteira, "O primeiro mês com churn de CS ativo nos dados é maio de 2026 (4 e 26 de maio, Marcos), não junho como no exemplo do prompt. O aviso derivou do dado: Antes de mai/26 a carteira era de outros CS.").
achado(recorde_padrao, "A validação do prompt dizia que o padrão tem recorde 33 em janeiro. O padrão agora é a carteira atual, cujo recorde é 10 em setembro de 2026. Em Toda a rede sem Comunidade o recorde é 33 em janeiro, e com a Comunidade é 37 em março, como esperado.").
achado(cases_64, "Os 64 cases de setembro não são dupla contagem do app: 48 itens têm id até cerca de 26/09, exatamente os 48 do histórico, e 16 foram cadastrados depois. Um item com dois CS é contado uma vez. Continuam as 5 linhas repetidas no board (59 distintas), a confirmar com o time.").
achado(revenue_churn, "Os R$ 12.876 são 6 churns Executivo a R$ 1.247, 2 C Level a R$ 1.797 e 2 Fast Track a R$ 900, a soma da tabela de preços sobre os 10 churns de setembro da carteira atual. Não alterado.").

% ---- validado ----
validado(reconciliacao_sql, "12 combinações de filtro (as duas bases, mês e semana, CS, categoria Ex CS, vários produtos, lista vazia, Comunidade marcada): número grande, soma das barras do mês e linhas dentro da lista iguais em todas, zero divergência.").
validado(setembro, "Carteira atual 10, Toda a rede sem Comunidade 16, Comunidade 6, total 22. Com a Comunidade marcada em Toda a rede, 22.").
validado(card, "churn_total_carteira de setembro igual a 10, historico_indicador igual a 10, metas_time_mensal mostra 10 contra meta 10, status bateu.").
validado(rls, "CS comum: tela, lista, hash e painel recusados; total do time (10) e o próprio histórico liberados.").
validado(tela, "Harness com as 220 linhas reais executando respostaTela e listaAuditoria da lib, desktop 1280 e celular 390: abre em setembro; filtros numa linha; dois números; nota; gráfico com destaque âmbar; linha da Comunidade; lista com 10 na base e 12 fora; URL em outra aba reproduz a visão; Comunidade travada na carteira; sem traço no texto visível; sem erro de JS; sem rolagem horizontal. Defeitos achados e corrigidos: ícone de informação quebrando linha no desktop, gráfico do celular abrindo nos meses antigos.").
validado(build, "tsc, tests/churn.test.ts, tests/consulta.test.ts e next build limpos.").
validado(advisors, "Dois itens a mais no padrão SECURITY DEFINER de gestor com checagem no corpo (churn_itens_recorte e churn_recorte_hash de sete argumentos). Nada além disso.").

% ---- decisões padrão (confirmar com o Vitor) ----
decisao_padrao(exportar, "A exportação é CSV com ponto e vírgula e BOM, abre direto no Excel. Contém nome e empresa, só gestor, registrada em access_audit_log.").
decisao_padrao(analise_por_base, "A análise de churn salva passa a ter a base na chave do recorte (carteira_atual|...). Análise antiga com chave nula continua pertencendo ao recorte de Toda a rede com a Comunidade dentro.").
decisao_padrao(ex_cs_so_na_rede, "A opção Ex CS do filtro de CS só aparece em Toda a rede, pois a carteira atual não tem ex CS por definição.").

% ---- pendente ----
pendente(campo_manual, "Continua aberto: remover recordes_manuais, definir_recorde_manual, a rota e o formulário manual (regra zero manual).").
pendente(recorde_efetivo_cards, "Os cards da home já usam a definição de churn da carteira atual (via historico_indicador), mas o selo Recorde dos cards ainda lê recorde_efetivo, não indicador_recordes.").
pendente(preview_clique_real, "Clicar no preview como gestor e como CS comum (403 em /api/gestor/churn e /api/gestor/churn/itens).").
pendente(cases_repetidos, "Confirmar com o time as 5 linhas repetidas de cases de setembro.").
pendente(migracao_registro, "Aplicada por execute_sql em partes, pois apply_migration estoura 60 segundos. Não consta em schema_migrations.").

entrega_historico('2026-10-05', "Simplificação da tela de churn: uma coluna, dois números, nota de recorde, gráfico com o mês de referência em destaque, Comunidade em linha de rodapé e lista de auditoria exportável. Churn oficial em duas bases (carteira atual e toda a rede), uma consulta única no banco, card Churn alinhado. Migração supabase/migrations/20261005b_churn_simplificacao.sql.").
