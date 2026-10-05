:- encoding(utf8).
% ============================================================================
% churn_ajustes.pl
% Ajustes da onda 1 do churn (05/10/2026, segundo prompt prompt_onda1_ajustes.pl):
% filtro de produto em seleção múltipla, bloco da Comunidade, recordes calculados
% do histórico do Monday e ex CS só nos agregados. Complementa handoff/churn.pl.
% Só registra o que foi verificado nesta sessão (SQL no banco, harness com as 220
% linhas reais, tsc, testes e next build).
% ============================================================================

:- discontiguous tabela/2, funcao/2, rota/2, regra_negocio/2, decisao_padrao/2,
   achado/2, validado/2, pendente/2, entrega_historico/2.

% ---- dados (texto pronto para dados.pl) ----
tabela(churn_items, "Colunas novas: produto_normalizado (text, not null, padrão sem_produto_informado) e eh_comunidade (boolean, not null, padrão false), ambas derivadas pelo trigger churn_items_derivar a cada insert ou update, portanto a cada sync. Backfill feito: 220 linhas, 52 da Comunidade, nenhuma sem produto normalizado.").
funcao(churn_normalizar_produto/1, "Nulo, vazio, N/D ou Não sei informar vira sem_produto_informado. Os demais valores ficam como no Monday (C-Level e C-Level + sem fundir).").
funcao(churn_filtrados_multi/6, "Filtro único com seleção múltipla: período, CS, categoria de CS, lista de produtos e chave da Comunidade. Linha da Comunidade obedece só à chave; as demais obedecem à lista. Lista nula significa todos os produtos.").
funcao(churn_periodos/3, "Períodos do gráfico (mês ou semana do mês), compartilhado por churn_serie e churn_comunidade_resumo.").
funcao(churn_serie/7, "Sobrecarga nova de churn_serie com p_produtos text[] e p_incluir_comunidade boolean (padrão falso). A de seis argumentos segue intacta.").
funcao(churn_comunidade_resumo/3, "Gestor. Comunidade por período e por motivo no mesmo intervalo do gráfico, independente do filtro de produto e de CS, com total_recorte (todos os churns do período) para o percentual.").
funcao(churn_recorte_hash_itens_multi, "churn_recorte_hash e churn_itens_recorte ganharam sobrecargas de seis argumentos com a seleção múltipla. Só gestor.").
funcao(salvar_churn_analise_registrar_rascunho, "Sobrecargas com p_base_hash: as antigas calculavam o hash com a assinatura velha e o aviso de análise desatualizada dispararia sempre. O app calcula o hash com o filtro novo e envia.").
funcao(indicador_recordes/6, "Mecanismo único de recorde. Recebe indicador, CS, motivo, produtos, chave da Comunidade e categoria de CS e devolve o recorde mensal (valor, mês, selo em andamento, empates), o recorde semanal quando há data por registro, valor do mês corrente, diferença, histórico desde e data do cálculo. Histórico inteiro, cada linha uma vez. Aceita cases e rounds como apelidos.").
funcao(indicador_pontos_serie_mensal, "indicador_pontos (um ponto por registro de origem, com a atribuição por CS de historico_indicador) e indicador_serie_mensal (soma por mês, NPS pela régua padrão em nota_conselheiro). Base de indicador_recordes.").
funcao(recordes_por_cs/1, "Gestor. Recorde mensal de um indicador para cada CS ativo. Nenhuma linha para ex CS.").
funcao(recordes_painel/1, "Gestor. Painel completo: valor do mês corrente, meta resolvida do mês, recorde e diferença de cada indicador, para o time ou para um CS ativo.").
rota('/api/gestor/churn', "Passou a devolver comunidade (bloco), recorde (com a referência do gráfico) e opções novas: só CS ativos, categoria agregada Ex CS, produtos reais na ordem fixa e a Comunidade à parte. Aceita produtos=a,b e comunidade=1; produto único antigo continua valendo. CS que não é ativo recebe 400.").
rota('/api/gestor/recordes', "GET, gestor. Painel de recordes calculados, com ?cs= para um CS ativo.").
rota(tela, "Aba Churn: seletor múltiplo de produtos com Selecionar todos e Limpar, Comunidade desmarcada por padrão, seleção na URL (mesmos nomes da API) e herdada pelo relatório; bloco Comunidade ao lado do total; linha tracejada de recorde com selo. Aba Metas e destaques: seção Recordes calculados.").

% ---- regras de negócio (texto pronto para regras_negocio.pl) ----
regra_negocio(comunidade, "Churn da Comunidade é o que tem produto Comunidade OU o campo Quem é o seu CS igual a Comunidade. Os dois representam a mesma coisa, pois a Comunidade não tem CS. Fica fora da conta principal por padrão e aparece sempre no bloco Comunidade. Nunca aparece em visão por CS.").
regra_negocio(sem_produto, "Churn sem produto informado (nulo, vazio, N/D) tem opção própria, marcada por padrão, para não apagar a maior parte da base.").
regra_negocio(cs_nao_pessoa, "High End, Comercial e N/D no campo CS continuam na conta e nunca aparecem como pessoa.").
regra_negocio(recorde_calculado, "Todo recorde é calculado do histórico inteiro do Monday e se atualiza a cada sincronização. Proibido digitar recorde. Nunca é o máximo entre manual e calculado. Em churn e downsell o recorde é o MAIOR valor mensal já registrado. O mês corrente conta e leva o selo em andamento até fechar.").
regra_negocio(ex_cs, "Ex CS nunca ganham card, ranking, avatar nem roster. No filtro de CS aparecem agrupados na opção Ex CS. As linhas deles contam uma vez nos agregados.").
regra_negocio(nps_base_minima, "Recorde de NPS só considera meses com pelo menos 30 respostas, e o mês corrente com base menor aparece sem valor.").

% ---- decisões padrão aplicadas (confirmar com o Vitor) ----
decisao_padrao(upsell_finalizado, "Upsell e downsell no recorde contam só status Finalizado, a mesma definição dos cards, para que a diferença para o recorde compare coisas iguais. Sem filtro de status, upsell de setembro empata com maio em 7; com Finalizado, setembro tem 4 e o recorde 7 é de maio. O valor do recorde é 7 nos dois casos.").
decisao_padrao(produto_nd, "Produto N/D entra em sem_produto_informado (3 linhas).").
decisao_padrao(chave_analise, "Análise salva usa a chave todos_exceto_comunidade no recorte padrão. Uma análise antiga salva com a chave nula passa a ser de recorte com a Comunidade dentro.").
decisao_padrao(selecionar_todos, "Selecionar todos marca todos os produtos e a Comunidade. Limpar desmarca tudo.").
decisao_padrao(rounds_mes, "Rounds contam no mês do grupo do Monday (igual aos cards); a data de início serve para a semana.").

% ---- achados ----
achado(total_220, "O banco tem 220 churns, não 218: entraram 2 em outubro de 2026 (4 e 5 de outubro). A janela de 12 meses até setembro tem 218.").
achado(comunidade_52, "Comunidade por produto OU por CS são 52 churns (46 pelo CS, 15 pelo produto, 9 nos dois). No padrão: 166 na conta principal mais 52 da Comunidade fecham 218 na janela até setembro.").
achado(cases_64_duplicados, "Cases de setembro de 2026: 64 linhas, mas só 59 combinações distintas de nome, empresa e CS. Há 5 linhas repetidas no board (mesmo nome, empresa e CS, ids diferentes): Carol Pinheiro 2, Felipe Gaião e Wendley 3, Messias 2, Santino Araujo 2. É duplicidade de preenchimento na origem, não do app. Não corrigi, o recorde de 64 segue como o Monday entrega. Se forem duplicados, o recorde de cases cairia para 59, ainda o maior do histórico (agosto tem 47).").
achado(matchmakings_184, "Matchmakings do board em setembro: 184, não 154. O grupo Setembro (sem ano no título) tem 184 itens com data de 01 a 30/09, sem duplicidade. A base cresceu depois da verificação de 30/09. Matchmakings dos reports semanais: 165 em julho, como esperado.").
achado(grupo_sem_ano, "Grupos do Monday sem ano (Abril, Maio, Junho, Setembro, Outubro) são lidos como 2026 por mes_grupo_para_data. Nenhum grupo ficou sem leitura em cases, matchmakings, rounds e NPS. Em 2027 um grupo sem ano será lido como 2026.").
achado(upsell_sem_data, "23 linhas de upsell e downsell estão sem data e ficam fora de qualquer mês, como já ficavam nos cards.").
achado(indicadores_sem_historico, "Revenue churn, health da base, carteira, presença, suspensões e crítico não têm série mensal calculável em tabela do banco (são calculados no TypeScript a partir do estado atual). Ficaram fora do mecanismo de recordes.").
achado(historico_desde, "Matchmakings do board só existem desde abril de 2026, rounds desde maio, cases desde julho de 2025, indicações e upsell desde janeiro de 2026. A coluna Série desde mostra isso na tela.").
achado(ferramenta_migracao, "apply_migration e um update em lote em churn_items estouraram 60 segundos nesta sessão. As mudanças foram aplicadas por execute_sql em partes (colunas, funções, backfill) e conferidas. A migração não aparece em schema_migrations.").

% ---- validado ----
validado(valores_esperados, "Por SQL como gestor simulado: churn 37 em março e 16 na semana 1 de março, cases 64 em setembro, rounds 8 e 76 pessoas em julho, indicações 34 em setembro, upsell 7 (maio), downsell 7 (março), matchmakings dos reports 165 em julho. Divergente: matchmakings do board (184) e falta de tempo 58 em vez de 57 (base cresceu).").
validado(conta, "Padrão sem Comunidade 166 mais Comunidade 52 igual a 218; com a Comunidade marcada 218; só Executivo 21.").
validado(rls, "CS comum George: painel, recordes por CS, bloco da Comunidade e itens identificados recusados; recorde do time e do próprio nome liberados; recorde de outro CS recusado; série forçada ao próprio CS. Conta sem vínculo: painel e série recusados.").
validado(tela, "Harness com as 220 linhas reais (mesmo código do app), desktop 1280 e celular 390: filtro múltiplo, Selecionar todos, Limpar, Comunidade marcada, URL em outra aba reproduz a mesma visão, modo semana, painel de recordes, relatório. Zero erro de JS. Defeito achado e corrigido: no celular o card do gráfico passava da tela.").
validado(build, "npx tsc --noEmit, tests/churn.test.ts, tests/consulta.test.ts e npx next build limpos.").
validado(advisors, "get_advisors de segurança sem alerta novo além das funções SECURITY DEFINER de gestor com checagem no corpo (mesmo padrão do projeto).").

% ---- pendente ----
pendente(campo_manual, "Existem tabela recordes_manuais (vazia), RPC definir_recorde_manual, rota /api/gestor/recordes-manuais e o formulário Recordes anteriores ao histórico. Contrariam a regra zero manual. Proposta: remover as quatro peças. Aguarda confirmação do Vitor.").
pendente(recorde_efetivo, "Os cards da home e da página do CS ainda leem recorde_efetivo (meses fechados, recorde de menor valor para churn e downsell, e blending com o manual). Com a tabela manual vazia o número é calculado, mas a definição difere de indicador_recordes. Unificar muda o selo Recorde dos cards de churn e downsell. Aguarda decisão do Vitor.").
pendente(cases_duplicados, "Confirmar com o time se as 5 linhas repetidas de cases de setembro são duplicidade e corrigir no Monday.").
pendente(preview_clique_real, "Clicar no preview como gestor e como CS comum (403 nas rotas /api/gestor/churn e /api/gestor/recordes). O harness usa as linhas reais e as RPCs foram testadas no banco, mas a sessão de navegador real não foi exercitada.").
pendente(pr, "O PR 1 está fechado e o main já contém a onda 1. Este trabalho está na branch claude/new-session-dxbo2v, sem PR aberto.").

% ---- texto pronto para historico.pl ----
entrega_historico('2026-10-05', "Ajustes da onda 1 do churn: filtro de produto em seleção múltipla com a Comunidade fora da conta por padrão, bloco da Comunidade sempre visível, recordes calculados por um mecanismo único (indicador_recordes) sobre o histórico inteiro do Monday, linha de recorde no gráfico, painel de recordes calculados na aba Metas e destaques, e ex CS só nos filtros e agregados. Migração supabase/migrations/20261005_churn_onda1_ajustes.sql.").
