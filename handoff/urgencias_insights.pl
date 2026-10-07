:- encoding(utf8).
% ============================================================================
% urgencias_insights.pl
% Entrega de 07/10/2026, branch feat/urgencias_insights_gestor: Carteira fora da
% pontuação, extrapolação acima de 100, Urgências (report e GTD) e Insights na
% Visão geral do gestor. Registro dos documentos do projeto que não existem no
% repositório (regras_negocio, aplicacao, armadilhas, historico).
% ============================================================================

:- discontiguous regra/2, revogada/2, armadilha/2, padrao_adotado/2, pendente/2, arquivo/2, aplicacao/2.

regra(carteira_sem_pontos, "PESO_CARTEIRA_NA_PONTUACAO = 0 em lib/constants.ts. A Carteira segue no retorno de calcularScoreCS como informação (sem pontos) e não conta como indicador que pontua.").
regra(sem_teto, "TETO_APROVEITAMENTO_INDICADOR nulo: indicador de mínimo é alcançado sobre meta e passa de 100. Churn e Downsell valem 1 até o máximo e depois meta sobre alcançado, sem bônus.").
regra(pontuacao_100, "Sem a Carteira os pesos somam 85 e são renormalizados sobre os elegíveis: bater exatamente todas as metas vale 100.").
regra(prazo_gtd, "GTD_PRAZOS_ETAPA em lib/constants.ts, aplicada por lib/gtd-prazos.ts. Confirmação individual 9 dias antes, confirmação no grupo 5 antes, verificar a jornada 1 antes, encaminhamentos e cuidei dos membros 2 depois, gestão de conhecimento 4, matchmakings 7, upsells 8, follow 9 depois.").
regra(ciclo_aberto, "cicloAberto: hoje (America/Sao_Paulo) menor ou igual a data_conselho mais 14 dias. A mesma função serve às Urgências, ao Andamento do GTD da página do CS, ao detalhe do conselho e ao indicador de cumprimento do GTD (todos os ciclos abertos, razão pooled).").
regra(status_etapa, "feita, atrasada (prazo passou), a_vencer (prazo hoje ou nos próximos 7 dias), futura ou ciclo_fechado. Ciclo fechado nunca é urgência.").
regra(report_semanal, "lib/report-semana.ts: semana de segunda a domingo, prazo na sexta, referência é a última semana cuja sexta terminou. Terça a sexta em dia, sábado e domingo com atraso, segunda fecha a semana anterior com atraso. Nativo vence o Monday, primeiro envio vence.").
regra(insights, "lib/insights.ts, sete regras fixas sem IA, no máximo 5 visíveis, ordenadas por severidade e impacto. Nova regra é um registro em CATALOGO_INSIGHTS.").
aplicacao(visao_geral_gestor, "Urgências e Insights logo abaixo de Como a área de CS está de verdade, lado a lado no desktop, empilhados no celular, via GET /api/gestor/visao-geral/acoes (só gestor, uma chamada, blocos isolados).").
armadilha(rotulos_gtd_sinal_errado, "Os rótulos D+9 Confirmação Individual e D+5 Confirmação no grupo acontecem ANTES do conselho. Nunca deduzir prazo do prefixo.").
armadilha(etapas_atrasadas_vazio, "historico_conselhos_items.etapas_atrasadas está vazia em 62 de 62 ciclos. O atraso é calculado pela plataforma.").
armadilha(semana_inicio_importada, "reports_individuais.semana_inicio das linhas do Monday vem da data de criação: o report de segunda 05/10 do Marcos veio na semana 05/10. A semana é reatribuída pela data efetiva (data_report ou criado_em em America/Sao_Paulo), pela regra de report_semanal.").
armadilha(reports_vigentes_ultimo, "reports_vigentes() mantém o ÚLTIMO envio por CS e semana. Para a regra do primeiro envio as Urgências leem as linhas cruas de reports_individuais.").
armadilha(rodrigo_nathan, "Rodrigo Nathan e Rodrigo Nathan de Matos são outra pessoa, não o CS Rodrigo (Rodrigo Queiroz Campos). Nunca mapear CS por primeiro nome.").
padrao_adotado(rota_hifen, "A rota é /api/gestor/visao-geral/acoes (hífen), igual às demais rotas do projeto, e não visao_geral como no texto do prompt.").
padrao_adotado(insights_periodo, "Insights de ritmo usam o mês real de hoje, não o seletor de período da página, porque urgência e ritmo são sobre o agora.").
padrao_adotado(insight_gtd_concentrado, "Só dispara com pelo menos 3 etapas atrasadas no time (INSIGHT_GTD_CONCENTRACAO_MIN_ATRASADAS), para um total pequeno não gerar alarme.").
padrao_adotado(insight_etapa_unica, "A regra de etapa esquecida gera um único insight, sobre a pior etapa, e cita quantas outras também estão abaixo do limiar.").
padrao_adotado(a_vencer_7_dias, "A vencer usa a janela de 7 dias (GTD_JANELA_A_VENCER_DIAS). Em 07/10 são 71 etapas.").
pendente(luana_gtd, "Luana tem 4 etapas atrasadas num único conselho (Gugu). Confirmar se o GTD dela já está em uso real.").
pendente(nomes_nulos, "99 de 187 linhas de reports_individuais têm cs_nome nulo: ex CS e pessoas não mapeadas (Alejandro 26, Luma 16, Yasmim 16, Vinicius Walviesse 14, Rodrigo Nathan 10, Lorena 7, Lucas 8, entre outros) e uma linha Rodrigo ambígua. Ficam fora das Urgências e aparecem contadas no rodapé.").
pendente(hero, "O card 7 CS com pelo menos um indicador abaixo da meta não diferencia ninguém. Sugestão: trocar por Urgências abertas e CS acima de 100. Não implementado, aguarda confirmação.").
pendente(sem_teto, "Se algum CS passar de 200 em um indicador, avaliar preencher TETO_APROVEITAMENTO_INDICADOR.").
arquivo(novo, "lib/gtd-prazos.ts, lib/report-semana.ts, lib/insights.ts, app/api/gestor/visao-geral/acoes/route.ts, tests/gtd-prazos.test.ts, tests/report-semana.test.ts, tests/insights.test.ts").
