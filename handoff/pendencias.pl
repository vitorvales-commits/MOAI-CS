:- encoding(utf8).
% ============================================================================
% pendencias.pl
% Lista consolidada do que ainda falta validar ou fazer, juntando os
% teste_pendente/pendencia_conhecida espalhados pelos outros arquivos de
% handoff/ com os itens específicos da entrega de 29/09/2026 (metas do
% gestor). Criado nesta sessão porque a lista estava crescendo espalhada por
% handoff/consulta_metas.pl e handoff/aplicacao.pl sem um lugar único pra
% conferir tudo de uma vez.
% ============================================================================

:- discontiguous pendente/2, feito_e_verificado/2.

% ---- feito e verificado nesta sessão (não é pendência, é registro do que já foi conferido) ----
feito_e_verificado(rpcs_security_definer, "As 4 RPCs de escrita de metas do gestor gravam corretamente simulando um authenticated real (set role authenticated + request.jwt.claims, não só o editor SQL): lote de 7 itens gera 1 linha de auditoria, usuário não vinculado é rejeitado com 'not authorized', insert direto na tabela continua bloqueado mesmo pra gestor. Ver bug_encontrado_e_corrigido(rpcs_sem_security_definer) em handoff/dados.pl.").
feito_e_verificado(tsc_build_testes, "npx tsc --noEmit, npx next build e tests/consulta.test.ts rodam limpos depois de toda a aba Metas e destaques e da intenção recordes_time.").
feito_e_verificado(historico_ignora_data_nula, "Confirmado lendo o corpo de historico_indicador: where mes_grupo_para_data(...) is not null em cases e rounds (mesmo padrão nos demais) — linha cujo mes_grupo_titulo não converte em data nunca entra no histórico nem pode virar recorde.").
feito_e_verificado(advisor_pos_migracao, "get_advisors (security) rodado depois de todas as migrações desta sessão: nenhum achado novo específico das tabelas/RPCs de metas do gestor além do padrão já esperado do projeto (funções SECURITY DEFINER executáveis por authenticated, que é o padrão de toda RPC de escrita aqui — ver convencao(escrita_unica) em handoff/aplicacao.pl).").

% ---- pendente de verificação manual (preview/produção, navegador de verdade) ----
pendente(metas_gestor_preview_gestor, "Clicar de verdade na aba Metas e destaques como gestor: abrir a matriz de um mês com heranças (ex.: setembro 2026), editar uma célula e salvar, usar 'copiar mês anterior' num mês vazio e confirmar que não sobrescreve nada, alternar visível/ordem/recorde na lista de indicadores da home, cadastrar um recorde manual e ver aparecer na lista.").
pendente(metas_gestor_preview_restricao, "Confirmar em preview que CS comum e conta sem vínculo em cs_usuarios recebem 403 nas 4 rotas /api/gestor/metas*, /api/gestor/indicadores-home, /api/gestor/recordes-manuais, e que a aba Metas e destaques nem aparece (a lógica de isGestor existe e foi revisada no código, não foi exercitada com sessão real de CS comum).").
pendente(metas_gestor_visual, "Teste visual desktop e mobile da matriz (rolagem horizontal da tabela em telas estreitas, coluna Time fixa) não foi feito — sem acesso a browser nesta sessão.").
pendente(recordes_time_preview, "Perguntar 'o time bateu a meta de rounds esse mês' e 'quais recordes foram batidos' de verdade no painel de consulta rápida — testes automatizados com RPC simulada passam, RPC real (metas_time_mensal) foi validada só via SQL direto.").
pendente(preview_gestor_consulta_metas, "Herdado de handoff/consulta_metas.pl: pergunta 'quais metas o Rodrigo bateu' em preview/produção — atenção que a resposta mudou depois da herança (ver divergencia_encontrada(heranca_muda_rodrigo_setembro) em handoff/dados.pl), não é mais literalmente '5 de 5'.").
pendente(cs_comum_sem_vinculo, "Herdado de handoff/consulta_metas.pl: mesma verificação de 403/painel ausente, mas pro painel de consulta rápida (não pra aba Metas e destaques, que é item separado acima).").

% ---- divergências e achados que qualquer sessão futura deveria saber antes de mexer nisso ----
pendente(divergencias_conhecidas, "Ver handoff/dados.pl: divergencia_encontrada(cases_49_vs_50) (não era bug), divergencia_encontrada(heranca_muda_rodrigo_setembro) (comportamento correto, mas muda o resultado do teste de aceite literal do pedido original) e divergencia_encontrada(health_base_direcao_inconsistente) (pré-existente, só afeta um badge visual, não corrigida por estar fora do escopo).").

% ---- pendências herdadas de sessões/documentos anteriores, ainda abertas ----
pendente(dependencias_cve, "Next.js 14.2.35 com CVEs sem correção na linha 14 — ver handoff/seguranca.pl.").
pendente(rate_limit_borda, "Sem limite por IP nas rotas — precisa de regra manual no Vercel Firewall, fora do escopo de acesso desta sessão.").

% ---- ajustes da onda 1 do churn (05/10/2026), detalhe em handoff/churn_ajustes.pl ----
pendente(churn_campo_manual, "Remover recordes_manuais, definir_recorde_manual, /api/gestor/recordes-manuais e o formulário manual? Aguarda confirmação do Vitor (regra zero manual).").
pendente(churn_recorde_efetivo, "Unificar os cards da home com indicador_recordes? Muda o selo Recorde de churn e downsell. Aguarda decisão do Vitor.").
pendente(churn_cases_duplicados, "5 linhas repetidas em cases de setembro de 2026 (recorde 64 contra 59 distintos). O crescimento de 48 para 64 foi real, ver handoff/churn_simplificacao.pl. Confirmar as repetidas com o time.").

% ---- onda 2 do churn (08/10/2026), detalhe em handoff/historico.pl e handoff/dados.pl ----
% Deploy da v30 do report individual: concluído junto com a sync da onda 2 (ver handoff/report_individual.pl).
pendente(revisao_visual_preview_onda2, "Revisão visual no preview do Vercel (https://moai-cs-dashboard-git-feat-churnonda2-moai7.vercel.app): aba Churn e voz do membro (todos os blocos, estados vazio, carregando e erro, 1280 e 390 px sem rolagem horizontal), farol da semana na home, relatório imprimível. Não foi feita por falta de browser nesta sessão.").
pendente(monday_ajustes_onda2, "Feito à mão pelo Vitor no board Visita Churns (18432210313): renomear a coluna Name para Membro (a API não permite renomear a coluna de nome), apagar o item TESTE e as colunas text_mm7evpkq (MRR em risco R$ como texto), text_mm7enkg8 (Data da ação) e timerange_mm7ejmsj (Date). Nenhum desses ids é lido no código (conferido por git grep em 08/10/2026).").
pendente(padroes_onda2_a_confirmar, "Padrões assumidos e ainda não confirmados pelo Vitor: prazo de 7 dias entre o pedido e a visita (VISITA_SLA_DIAS), janela de 3 meses da voz do membro, notas e desafio (VOZ_MEMBRO_JANELA_MESES), amostra mínima de 5 casos (AMOSTRA_MINIMA), farol sempre na semana corrente.").
pendente(status_mensal_sem_ano, "conselhos_status_mensal.mes não tem ano. A função membro_situacao (usada em visitas_resultado) pega o status de maior mes_idx do membro, o que pode misturar anos. Regra mantida como está na especificação; revisar se a ambiguidade aparecer nos dados.").
