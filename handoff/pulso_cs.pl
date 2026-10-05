:- encoding(utf8).
% ============================================================================
% pulso_cs.pl
% Pulso de CS (05/10/2026). Substitui, de outubro de 2026 em diante, a avaliação entre pares e o NPS
% interno antigo do board 18412032453, hoje chamado NPS time CS. Só registra o que foi verificado
% nesta sessão: board lido ao vivo, SQL aplicado e testado no banco, tsc, testes, next build e
% captura de tela das duas telas. A Edge Function e o código do app dependem de aplicação no
% repositório, ver pendente/2.
% ============================================================================

:- discontiguous fonte/2, coluna/3, regra_negocio/2, tabela/2, funcao/2, rota/2, tela/2, decisao_padrao/2, validado/2, pendente/2, achado/2.

% ---- o que mudou no board ----
fonte(board, "18412032453, NPS time CS. Antes chamado Feedback e NPS antigo em dados.pl. Grupos Junho a Setembro são o formulário antigo, o grupo Outubro já é o Pulso.").
achado(estrutura_antiga, "Junho a Setembro: positivo e construtivo por pessoa, cinco votações de categoria. Setembro, Agosto e Julho com 6 a 7 respostas por ciclo.").
achado(estrutura_nova, "Outubro: cinco respostas no dia 05/10/2026. Colunas novas de nota de recomendação, clareza, gargalo, melhorar, começar parar continuar, destaque, feedback por pessoa, tema de apoio, liderança.").
achado(colunas_antigas_no_board, "As colunas antigas continuam no board como histórico. Nenhuma foi apagada.").

coluna(pulso, single_selectb4e2e8e, "De 0 a 10, o quanto você recomendaria trabalhar no time de CS da MOAI. Coluna de status com rótulos 0 a 10. Base do NPS interno.").
coluna(pulso, single_selectnplmm5m, "De 0 a 10, clareza das prioridades e capacidade de executar. Status com rótulos 0 a 10.").
coluna(pulso, multi_select4jj71hpl, "Maior gargalo da operação, múltipla escolha com seis opções.").
coluna(pulso, short_textevra41s2, "Uma coisa a melhorar no CS no próximo mês.").
coluna(pulso, short_textt2tcskqm, "Começar, parar e continuar como time.").
coluna(pulso, single_selectk23k963, "Quem mais se destacou em colaboração e apoio ao time. Status com o primeiro nome do CS, inclui Amanda, que não está em cs_config.").
coluna(pulso, long_text4sqv7qb5, "Feedback por pessoa, texto livre com uma linha por colega no formato Nome, hífen, texto.").
coluna(pulso, short_textovdjx4pr, "Tema em que precisa de mais apoio ou desenvolvimento.").
coluna(pulso, short_textdryxvk9l, "Algo importante que a liderança precisa saber.").
coluna(pulso, long_textvo70fkvt, "Feedback para a liderança.").

% ---- regras de negócio (texto pronto para regras_negocio.pl) ----
regra_negocio(pulso_periodo, "Outubro de 2026 em diante vale o Pulso. Até setembro de 2026 vale a avaliação entre pares antiga. Visão Geral de 2026 mostra as duas, cada uma na sua seção. De 2027 em diante só o Pulso.").
regra_negocio(nps_interno, "NPS interno é calcularNPS aplicado à nota de recomendação, régua padrão MOAI, 9 e 10 promotor, 7 e 8 neutro, 0 a 6 detrator. Nunca existe uma segunda implementação.").
regra_negocio(pulso_anonimato, "Nenhum payload da aplicação devolve o nome de quem respondeu. O nome fica na tabela só para excluir a autoavaliação e contar adesão. Textos saem embaralhados.").
regra_negocio(pulso_acesso, "Gestor vê o agregado e todos os textos, sem nomes. CS comum vê apenas o que foi escrito sobre ele e quantos colegas o indicaram como destaque. O CS comum nunca lê linha bruta.").
regra_negocio(pulso_adesao, "Adesão é quantos respondentes distintos contra CS ativos em cs_config no mês.").

% ---- banco, já aplicado em produção ----
tabela(pulso_cs_items, "Espelho do Pulso. RLS ligado, policy gestor_select com is_gestor, sem policy de escrita, só a service role da Edge Function grava. Aplicada em 05/10/2026.").
funcao(pulso_cs_individual/2, "SECURITY DEFINER, execute só para authenticated. Autoriza gestor ou o próprio CS via meu_cs com coalesce. Devolve respostas, avaliadores, destaques e falas embaralhadas, exclui autoavaliação. Testada com linhas sintéticas em transação revertida, incluindo o caso de usuário sem vínculo que recebe erro 42501.").
achado(armadilha_mcp_drop, "Nesta sessão apply_migration e execute_sql travaram 180 segundos em DDL com drop policy, comando tratado como destrutivo que aguarda confirmação que não chega. Sem o drop, aplicou na hora. A migração do repositório já está sem o drop.").
achado(advisor, "get_advisors de segurança depois da migração: nada novo além do aviso informativo habitual de função SECURITY DEFINER executável por authenticated, que é intencional e validado dentro da função.").

% ---- código ----
funcao(sync_feedback, "syncFeedback na Edge Function lê as colunas novas. Item de pulso, por grupo Outubro a Dezembro ou por ter nota, vai só para pulso_cs_items. O resto segue em feedback_items. Prune separado por tabela, então as linhas vazias de Outubro que o sync antigo criou em feedback_items saem sozinhas.").
funcao(lib_pulso, "lib/pulso.ts: modoFeedbackDoPeriodo, mesesDoPulso, resumirPulso (pura), generatePulsoCS (gestor) e buscarPulsoIndividual (RPC).").
rota('/api/gestor/pulso', "GET mes e ano, gestor apenas, devolve resumo, adesão e série mensal.").
rota('/api/cs/[nome]', "Ganhou o campo pulso. Falha do RPC derruba só a aba Feedbacks, com a mensagem real, nunca o perfil.").
tela(feedbacks_cs, "Aba Feedbacks do CS: de outubro em diante mostra o Pulso, com contagem de colegas que escreveram e de indicações, e as falas. Antes, o legado. Visão Geral mostra as duas. O card Destaque em feedback do topo usa a primeira fala do Pulso quando não há legado. O texto dos colegas agora passa por escape de HTML.").
tela(gestor_pulso, "Aba nova Pulso de CS no painel do gestor: NPS interno, clareza média, adesão, gargalos, destaques, evolução mensal e cinco blocos de texto.").

decisao_padrao(sem_backfill, "Não foi feito backfill de Outubro por SQL. A primeira sincronização depois do deploy da Edge Function preenche pulso_cs_items sozinha.").
decisao_padrao(ano_nos_grupos, "Os grupos do board não trazem ano. O Pulso assume 2026 até o primeiro ciclo de 2027 exigir uma coluna de ano.").
decisao_padrao(autoavaliacao, "Quando o respondente escreve sobre si mesmo, a fala e o voto são descartados pela comparação do primeiro nome do respondente com o CS.").

validado(tsc, "npx tsc --noEmit limpo.").
validado(testes, "tests/pulso.test.ts novo, mais churn.test.ts e consulta.test.ts, rodados com npx tsx.").
validado(build, "next build limpo. Edge Function conferida por esbuild e comparada com a versão 28 em produção, idêntica ao HEAD antes do patch.").
validado(visual, "Capturas de tela da aba do gestor e da aba Feedbacks do CS em navegador sem cabeça, com API simulada. Fala com tag HTML aparece como texto.").

% ---- pendente ----
pendente(deploy_edge_function, "Alta. Aplicar o zip, rodar supabase functions deploy sync-monday e conferir em pulso_cs_items as 5 linhas de Outubro depois da próxima sincronização.").
pendente(deploy_app, "Alta. Commit e push na main, depois abrir a aba Pulso de CS como gestor e a aba Feedbacks de um CS em Outubro.").
pendente(nome_respondente_vs_cs, "Média. O primeiro nome do respondente precisa bater com cs_config.nome para excluir a autoavaliação. Conferir quando entrar o mês completo.").
pendente(amanda, "Baixa. Amanda aparece no formulário mas não existe em cs_config. Se for CS, criar o perfil, senão confirmar com o time o motivo da opção.").
pendente(parser_feedback_pessoas, "Baixa. O parser de feedback por pessoa reconhece linha iniciada por primeiro nome conhecido ou por Nome, espaço, hífen, espaço. Se o time mudar o padrão de preenchimento, revisar a função.").
