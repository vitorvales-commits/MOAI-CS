:- encoding(utf8).
% ============================================================================
% churn.pl
% Onda 1 do churn (30/09/2026, via Claude Code): gráfico de churn por mês e por
% semana, análise em combinação IA + gestor e relatório imprimível, tudo na
% visão do gestor. Só registra o que foi verificado nesta sessão (SQL direto no
% banco, simulação de authenticated real, build, harness com dados reais).
% ============================================================================

:- discontiguous tabela/2, funcao/2, rpc/2, rota/2, decisao_padrao/2, achado/2,
   validado/2, pendente/2, limite_conhecido/2.

% ---- dados ----
tabela(churn_items, "Ganhou motivo_principal (chave estável do motivo; vazio vira nao_informado), created_at_monday, board_group_id, cs_categoria (derivada por trigger) e data_referencia (coluna gerada: data do Monday, senão o dia de criação do item em horário de Brasília; nunca synced_at). RLS inalterada: SELECT is_moai_user.").
tabela(churn_detalhes, "Um registro por churn (pk churn_id, fk churn_items on delete cascade): membro_nome, empresa, explicacao, expectativa_nao_atendida, sugestao_melhoria, nota_retorno (0 a 10, fora disso vira nula). RLS: SELECT só is_gestor. Sem escrita para authenticated.").
tabela(churn_analises, "Uma análise por recorte (periodo_tipo, data_inicio, data_fim, filtro_cs, filtro_produto, filtro_cs_categoria). texto_ia (rascunho da IA) separado de texto_gestor (o único texto que o relatório usa). status rascunho/publicada, base_hash para aviso de desatualização. RLS: SELECT só is_gestor.").
tabela(churn_cs_classificacao, "Classifica valores de 'Quem é o seu CS?' fora de cs_config: ex CS (Luma, Lanna, Vinicius W., Yasmim, Alejandro, Lucas), nao_cs (Comunidade, High End, Comercial), nao_informado (N/D, Não sei informar). Valor novo no dropdown aparece como nao_classificado em vez de sumir.").

funcao(semana_do_mes/1, "Regra única de semana: 1 a 7 semana 1, 8 a 14 semana 2, 15 a 21 semana 3, 22 a 28 semana 4, 29 em diante semana 5. IMMUTABLE.").
funcao(churn_filtrados/5, "Filtro único do recorte (período, CS, produto, categoria de CS). SECURITY INVOKER.").
funcao(churn_serie/6, "Série por mês ou semana do mês, quebrada por motivo, com todos os períodos (inclusive zerados). Gestor vê qualquer recorte; CS comum é forçado ao próprio meu_cs(); resto é recusado.").
funcao(churn_recorte_hash/5, "md5 dos ids do recorte. Gestor.").
funcao(churn_itens_recorte/5, "Itens com dados identificáveis. Gestor.").
funcao(churn_termos_identificaveis/0, "Todos os nomes e empresas de churn_detalhes, para anonimização. Gestor.").
rpc(reservar_geracao_churn_ia/1, "Limite de uma geração por 10 segundos por gestor, contado em access_audit_log, com advisory lock. Chamada ANTES da API paga.").
rpc(registrar_rascunho_churn_ia/8, "Grava texto_ia, base_hash, modelo e gerado_em; nunca toca texto_gestor.").
rpc(salvar_churn_analise/7, "Grava texto_gestor e volta status para rascunho; log_access.").
rpc(publicar_churn_analise/1, "Exige texto_gestor salvo; log_access.").

% ---- aplicação ----
rota('/api/gestor/churn', "GET, gestor. Série, gráfico SVG, tabela, opções de filtro, análise salva e flag de desatualização.").
rota('/api/gestor/churn/analise', "POST acao=salvar|publicar, gestor.").
rota('/api/gestor/churn/analise/gerar', "POST, gestor, 503 sem ANTHROPIC_API_KEY/ANTHROPIC_MODEL, 429 no limite. Contexto sempre anonimizado: nenhum nome de membro ou empresa vai para a API.").
rota('/gestor/churn/relatorio', "HTML imprimível, anonimizado por padrão, identificado=1 é o interruptor. Registra emissão em access_audit_log.").
rota(aba_churn, "Aba Churn em app/gestor-html.ts, carregada só quando aberta (não pesa na home). Link direto /gestor#churn.").
rota(lib_churn, "lib/churn.ts concentra recorte, rótulos, paleta, gráfico (graficoChurnSVG, componente único para mês e semana), anonimização e IA. lib/churn-relatorio-html.ts gera o relatório.").
rota(sync_monday_v22, "syncChurn traz motivo, criação, grupo, nome, empresa e textos. CPF (short_text4w9ft9pn), CNPJ (short_textln136606) e anexos (file_mm48thg5) nunca são pedidos; assertColunasPermitidas trava o sync se alguém incluir um deles.").

% ---- decisões padrão aplicadas (confirmar com o Vitor) ----
decisao_padrao(a, "Relatório anonimizado por padrão; versão identificada atrás de interruptor na própria página, rota já restrita a gestor.").
decisao_padrao(b, "Semana do mês por dia fixo (1 a 7, 8 a 14...), não por semana de calendário.").
decisao_padrao(c, "Data do churn = coluna Data do Monday, senão o dia de criação do item.").
decisao_padrao(janela_mensal, "Visão mensal mostra 12 meses terminando no mês de referência.").
decisao_padrao(ia_nunca_ve_nomes, "Mais estrito que o pedido: a IA nunca recebe nome de membro nem empresa, em nenhum modo.").
decisao_padrao(paleta, "Mantida a paleta real do app (preto, dourado, Inter, Bricolage), como já decidido em handoff/consulta_metas.pl; azul marinho e âmbar não existem no app. Motivos usam os 6 slots validados da paleta categórica de referência do skill de visualização.").

% ---- achados ----
achado(data_nula, "155 das 218 linhas de churn_items tinham data nula (153 do grupo Finalizados, criados de out/2025 a mai/2026). Os indicadores antigos da home (parseChurn em lib/reports.ts) ignoram essas linhas; não alterados para não mudar números da home. O gráfico novo usa data_referencia e cobre de 10/10/2025 a 30/09/2026.").
achado(grupo_analise_coordenador, "Grupo 'Análise pelo Coordenador' vazio (0 itens) e coluna long_textbrea1pxh vazia nos 218 itens em 30/09/2026. Nada a importar.").
achado(updates_finalizados, "27 itens de Finalizados têm updates com negociação de multa e estorno citando pessoas. Sensível e fora do escopo; não sincronizado.").
achado(empresa_generica, "Há empresas cadastradas como palavra genérica (ex.: ANÁLISE). Anonimizar isso apagava 'análise' do texto do gestor; lib/churn.ts ignora termos de uma palavra que estejam em TERMOS_GENERICOS.").
achado(env_local_desatualizado, ".env.local tem um SYNC_FUNCTION_SECRET anterior à rotação de 29/09/2026 (a Edge Function recusou com 401). Não afeta produção.").

% ---- validado nesta sessão ----
validado(contagem, "218 em churn_items = items_count do Monday; soma por motivo = 218; 218 em churn_detalhes; set/2026 = 22 (bate com o grupo Setembro).").
validado(semana_do_mes, "Dias 1,7,8,14,15,21,22,28,29,30,31 -> 1,1,2,2,3,3,4,4,5,5,5.").
validado(rls, "CS comum (authenticated real): 0 linhas em churn_detalhes e churn_analises, série forçada ao próprio CS, not authorized nas funções de gestor, insert direto negado. Gestor: 218 linhas, insert/update direto também negado.").
validado(rpcs, "reservar 2x seguidas: segunda bloqueada (rate_limited); publicar sem texto do gestor bloqueado; salvar preserva texto_ia; editar publicada volta a rascunho. Testado em transação sem commit, banco limpo depois.").
validado(privacidade, "Nenhuma coluna cpf/cnpj/documento/anexo em nenhum schema; ids proibidos só aparecem no comentário e na lista de bloqueio; nenhum padrão de CPF/CNPJ nos textos livres.").
validado(relatorio_anonimo, "HTML anonimizado com dados reais: dos 429 nomes e empresas, nenhum aparece, exceto a palavra genérica de propósito. Nome e empresa reais injetados no texto da análise foram removidos. Versão identificada contém os 429 (controle).").
validado(visual, "Screenshots por harness com dados reais (mesmo código, RPCs reais como gestor): aba mês e semana em 1280px e 390px, relatório em 1280px e 390px, scrollWidth 390 sem rolagem horizontal; PDF A4 de 3 páginas sem cortar gráfico.").
validado(build, "npx tsc --noEmit, tests/consulta.test.ts e npx next build limpos. Projeto não tem ESLint configurado.").

% ---- pendente ----
pendente(chave_ia, "Criar ANTHROPIC_API_KEY e ANTHROPIC_MODEL (sugestão: claude-opus-5-5) no Vercel, Preview e Production. Sem elas o botão de IA fica desabilitado com aviso e a edição manual funciona.").
pendente(preview_clique_real, "Clicar em preview como gestor: gerar, editar, salvar, recarregar, publicar, emitir relatório; e como CS comum confirmar 403 nas rotas /api/gestor/churn*. Sem acesso ao escopo moai7 do Vercel nesta sessão.").
pendente(merge, "PR aberto, sem merge na main até o Vitor validar o preview.").
limite_conhecido(terceiros_em_texto_livre, "A anonimização remove nomes e empresas cadastrados no board de churn. Um terceiro citado só no texto livre (ex.: sócio mencionado pelo primeiro nome) não é conhecido e pode aparecer.").
limite_conhecido(indicadores_antigos, "Card de churn da home e ranking seguem contando só linhas com data preenchida; unificar com data_referencia é decisão para uma próxima onda.").
