# Registro da robustez da plataforma (29/10/2026)

Branch feat/plataforma_robustez, a partir da main (f4e9953). Um commit por etapa. Nada foi aplicado em produção: as migrações são arquivos e foram validadas em transação com rollback.

## O que foi feito

| Etapa | Entrega | Arquivos |
| --- | --- | --- |
| 1 | Retenção do sync_log: tabela sync_log_resumo_diario, função sync_log_arquivar() (idempotente, search_path fixo, ON CONFLICT) agendada às 03h UTC, RLS só para gestores | supabase/migrations/20261029_sync_log_retencao.sql |
| 2 | Seis índices nas chaves estrangeiras sem índice e policy de negação explícita nas quatro tabelas sem policy | supabase/migrations/20261029b_indices_e_policies.sql |
| 3 | Endurecimento das funções SECURITY DEFINER, rollback e teste de permissões | supabase/migrations/20261029c_endurecer_funcoes_security_definer.sql, supabase/rollbacks/20261029c_endurecer_funcoes_security_definer_rollback.sql, scripts/testes/rpc_permissoes.ts |
| 4 | Tentativa com recuo exponencial no sync-monday e regravação só do que mudou em nps_conselhos | supabase/functions/sync-monday/index.ts, supabase/migrations/20261029d_nps_conselhos_monday_updated_at.sql |
| 5 | Cartão de saúde dos dados na visão de gestor | supabase/migrations/20261029e_saude_dados.sql, lib/saude-dados.ts, lib/constants.ts, lib/ui/saude-dados-ui.ts, app/api/gestor/saude-dados/route.ts, app/gestor-html.ts, tests/saude-dados.test.ts, scripts/harness-saude-dados.mts |

### Justificativa de gestão do cartão (etapa 5)
O gestor precisa saber, sem abrir nenhum detalhe, se os números que lê estão atualizados e se alguma rotina automática falhou, porque uma falha silenciosa de sete dias já ocorreu e só foi descoberta por inspeção técnica. O insight é a frescura dos dados por board. A ação é acionar o responsável técnico quando algo sai do padrão. A faixa fica neutra quando tudo está saudável e só ganha âmbar ou vermelho na exceção, e o painel lista apenas o que está fora do padrão. O cartão só existe na página do gestor, não na do CS.

O cartão já mostra um caso real hoje: alertas_nps com 659 falhas consecutivas desde 22/10 (Resend HTTP 403), e portanto crítico.

## Decisões tomadas

1. **Branches do Supabase indisponíveis.** create_branch devolveu "Branching is supported only on the Pro plan or above". Cada migração foi validada na produção dentro de um bloco DO que termina em RAISE EXCEPTION, o que desfaz tudo. Conferi depois que a produção ficou intacta (sync_log com 183.234 linhas, sem a tabela de resumo). Consequência: get_advisors só roda no projeto real, então não foi possível confirmar o sumiço dos alertas pelo advisor. Conferi pelas mesmas consultas do linter dentro da transação com rollback: chaves estrangeiras sem índice caíram de 6 para 0 e tabelas com RLS sem policy de 4 para 0. Rodar get_advisors de segurança e de performance depois de aplicar em produção.
2. **Simulação da etapa 5 sem branch.** As capturas usam scripts/harness-saude-dados.mts, que serve a página real do gestor com a API simulada. Nenhum dado foi simulado no banco.
3. **Rollback fora de migrations/.** Ficaria depois da migração na ordem alfabética e o db push o aplicaria em sequência, desfazendo o endurecimento. Está em supabase/rollbacks/.
4. **Etapa 1.** Falha é status 'erro'. O dia é contado em UTC. A função soma ao resumo existente e apaga na mesma transação, e só olha dias inteiros anteriores ao corte, então rodar duas vezes não duplica (verificado: segunda rodada não alterou o resumo, e resumo mais restante igual ao total original de 183.184 linhas). A carga inicial roda dentro da migração e, ao ser aplicada, apaga do sync_log cerca de 42 mil linhas anteriores a 30 dias, que ficam resumidas em 156 linhas do resumo.
5. **Etapa 2.** O grep por .from( e /rest/v1/ não achou leitura direta de gestores, cs_usuarios, configuracoes_globais nem access_audit_log no Next.js, nas Edge Functions e nos scripts, então as quatro receberam a negação. A policy é FOR ALL para anon e authenticated com USING false e WITH CHECK false. O dono das tabelas (postgres) não tem FORCE RLS, então is_gestor() e as demais funções SECURITY DEFINER continuam lendo. Os índices são de b-tree simples, nenhum índice sem uso foi removido.
6. **Etapa 3, estado real do banco difere do prompt.** Já havia 12 das 91 funções fechadas, anon e PUBLIC já não tinham EXECUTE em nenhuma e os privilégios padrão do papel postgres já excluíam PUBLIC e anon. A migração mesmo assim revoga de PUBLIC, anon e authenticated e reconcede só o inventário, para o resultado não depender do estado anterior. O passo 3 também revoga de anon e authenticated nos privilégios padrão (o pedido era só PUBLIC), porque os privilégios padrão do Supabase concedem explicitamente a esses papéis e revogar só PUBLIC não faria funções novas nascerem fechadas. service_role e postgres não são tocados.
7. **Inventário da etapa 3.** Nomes chamados por .rpc( e /rest/v1/rpc/ no app, mais os nomes que aparecem em lib/ e app/ por outros caminhos (faltas_do_encontro, vincular_conselheiros_agenda, editar_advertencia_aplicada, nomes montados por variável em um_a_um e melhorias), mais as funções usadas por policies RLS (is_gestor, is_moai_user, meu_cs, avaliadas com o papel de quem consulta), mais as 22 administrativas do teste, mais saude_dados. Ficaram só com service_role as chamadas por cron, Edge Function e trigger: avaliar_alertas_nps, alertas_nps_para_enviar, alertas_nps_candidatos, marcar_alertas_notificados, expurgar_transcricoes_granola, resolver_semana_reports, apurar_pontos_automaticos, voz_materializar, status_report_semana_base, aplicar_advertencia_sistema, _encontros_relatorio, enforce_*.
8. **As 11 funções sem chamador no código foram todas mantidas** (decisão tomada pela regra de desempate, em 29/10/2026). Todas pertencem a uma frente que existe no banco mesmo sem tela hoje, e o critério era revogar só as sem frente correspondente. Mantidas com EXECUTE para authenticated:
   - churn_recorte_hash, salvar_churn_analise, publicar_churn_analise, registrar_rascunho_churn_ia, reservar_geracao_churn_ia: análises de churn (tabelas de análise do churn onda 2).
   - criar_um_a_um, editar_um_a_um, marcar_status_um_a_um: 1 a 1 (tabelas um_a_um_registros e um_a_um_itens); versões antigas das RPCs que a tela hoje chama por outros nomes, sem prova de que estejam mortas.
   - cs_do_grupo: resolve o CS de um conselho, usado pelo relatório e pelas faltas do conselho.
   - definir_vinculo_conselheiro: vínculo da agenda com o conselheiro (agenda_conselheiro_vinculo).
   - report_resolver_cs: resolução do CS do report individual (reports_individuais).
   Nenhuma foi revogada. O arquivo da migração 20261029c ganhou as 11 no inventário; o rollback não muda, porque já devolve EXECUTE a todas as funções que não eram só de cron.
9. **Guardas das funções administrativas.** As 22 já têm is_gestor() no início, então nenhuma correção de função foi necessária. Em transação com rollback, simulando o JWT: o usuário CS (mateus.ries) levou 42501 em todas as 22 e em saude_dados, e o gestor passou da guarda em todas.
10. **Argumentos do teste de permissões.** Com o gestor as funções de fato executam, então cada linha usa argumentos que a validação interna recusa. Descoberta importante: set_revelar_indicadores_equipe(null) gravaria false na configuração (coalesce), então essa linha reenvia o valor atual para o gestor. O teste lê a lista de um array único (FUNCOES) no topo do arquivo, uma linha por função.
11. **Etapa 4, esperas.** "Três tentativas, esperas de 1, 3 e 9 segundos" foi lido como a primeira tentativa mais três repetições, com esperas de 1, 3 e 9 segundos e variação de até 20%. Repete 429, 500, 502, 503, 504, falha de rede e corpo que não é JSON. Os demais 4xx e os erros GraphQL do Monday não repetem. Na falha final o texto do erro ganha "[tentativas: N]". Continua uma linha de sync_log por board e por ciclo. A gravação do próprio sync_log passou a ter tentativa e, se falhar, só registra no console em vez de derrubar o ciclo (antes uma falha de rede ali caía no catch). O pior caso de um board que falha de forma persistente passa a custar cerca de 13 segundos extras por chamada. O download de foto (asset do Monday em S3) não passou pelo utilitário porque não é chamada à API.
12. **nps_conselhos.** O Monday expõe updated_at por item, então a comparação é por updated_at, não por hash (content_hash não foi criada). A coluna nova é nps_conselhos_items.monday_updated_at. O upsert leva só o item novo, alterado ou com group_id diferente (confirmação de alias muda o group_id sem mudar o item). Linhas antigas sem a data são regravadas uma vez, depois o ciclo passa a gravar só o que mudou. A leitura ao Monday continua completa a cada ciclo, só a escrita no Supabase diminui. O sync_log segue registrando o total lido como itens sincronizados.
13. **Outros boards com mais de 300 itens.** matchmakings_items (814), cases_items (420) e agenda_conselhos_items (353) passam de 300, mas cada um exige coluna nova, ajuste da query e do mapeamento, e a comparação não é uma troca de uma linha. Ficaram como pendência.
14. **Etapa 5.** Limiares em lib/constants.ts (SAUDE_DADOS_LIMITES): 15 e 60 minutos para os boards do ciclo de 5 minutos, 45 e 120 para granola e alertas_nps, e 5 falhas consecutivas como crítico. O texto neutro "Dados atualizados há N minutos" usa a idade do board mais antigo, para não prometer mais do que é verdade. Board sem nenhuma execução bem sucedida é crítico. O painel atualiza a cada 2 minutos. O estilo reaproveita o módulo rd- (REDESENHO_CS_CSS) em vez de criar um sistema visual novo. O texto de interface não usa hífen nem travessão (escrevi "email").
15. **saude_dados()** lê do sync_log e, para a última execução bem sucedida e o último erro de boards cujo histórico já foi arquivado, do sync_log_resumo_diario. STABLE, SECURITY DEFINER, search_path vazio, guarda is_gestor() e grant só para authenticated (como a migração de endurecimento roda antes, ela mesma concede).
16. **Lint.** O projeto não tem ESLint configurado: npm run lint abre o assistente interativo de configuração. Não configurei, para não mudar o projeto nesta tarefa. Ficou sem rodar.
17. **Arquivos de contexto citados no prompt.** Não existem CLAUDE.md nem documentos de princípios de UX no repositório (já registrado em claude/redesenho_cs_meumes_conselhos_20261027.md). Segui o padrão rd- e as convenções das migrações existentes.

## Validação

- npx tsc --noEmit: limpo. npm run build: ok. npm test: 44 de 44 (inclui tests/saude-dados.test.ts). node --check dos scripts inline: ok.
- Migrações 1 a 5 e a função saude_dados validadas em transação com rollback (ver decisões 1, 4, 6 e 9).
- scripts/testes/rpc_permissoes.ts **não foi executado**: precisa de SUPABASE_SERVICE_ROLE_KEY, que não está nesta máquina, e cria dois usuários de teste no Auth. Rodar com `npx tsx scripts/testes/rpc_permissoes.ts` depois de aplicar as migrações. O equivalente por SQL (decisão 9) foi executado.
- A lógica de tentativa do sync-monday não tem teste automatizado: o arquivo é Deno e depende de Deno.env no topo. Foi conferida só por leitura, e o tsc do projeto não cobre a pasta das funções. Primeiro ciclo depois do deploy deve ser observado no sync_log.
- Capturas da faixa em docs/capturas_plataforma_robustez: faixa_saudavel.png, faixa_atrasado.png, faixa_critico.png e painel_critico.png, geradas com scripts/harness-saude-dados.mts e dados fictícios.

## Aplicação em produção (29/10/2026)

Aplicada pelo Claude em sessão posterior, com autorização do Vitor.

1. **Estado anterior verificado por consulta:** coluna monday_updated_at, seis índices, quatro policies negar_acesso_direto, sync_log_resumo_diario com RLS, função sync_log_arquivar com o job sync-log-arquivar-diario (0 3 * * *) e saude_dados existiam. Nada disso foi reaplicado. O supabase migration repair não se aplica: o histórico do banco usa versões por timestamp (por exemplo 20261029164619) e nunca teve os mesmos nomes dos arquivos do repositório, então não há correspondência para reparar.
2. **Edge Function sync-monday publicada** pela CLI (supabase functions deploy, com verify_jwt mantido). Em 10 minutos, 57 execuções bem sucedidas, nenhum erro novo (o único erro é o alertas_nps com Resend HTTP 403, já conhecido) e todos os boards de 5 minutos com 3 ciclos. Em nps_conselhos, a primeira execução preencheu monday_updated_at nas 2123 linhas e as duas execuções seguintes regravaram 0 linhas (conferido pelo xmin das linhas). O sync_log continua registrando o total lido (2123) em itens_sincronizados, por decisão, então a queda só aparece nas regravações.
3. **Arquivo bruto antes do arquivamento:** ~/moai_backups/sync_log_antes_20261029.csv, 42.126 linhas (o pedido estimava cerca de 45 mil; o corte de 30 dias dá 42.126), 2.486 falhas, 8.406.220 itens, de 17/09 a 28/09. Conferido com leitor de CSV com aspas (os erros têm vírgulas e quebras de linha, então wc -l não serve). SHA256 começa com b70bc7df.
4. **sync_log_arquivar() executada:** apagou 42.126 linhas. O resumo ficou com 156 linhas, 42.126 execuções, 2.486 falhas e 8.406.220 itens, idêntico ao arquivo. Conservação: falhas do resumo (2.486) mais as do sync_log (808) dão 3.294, igual ao total anterior; linhas do resumo mais as do sync_log (141.274) dão 183.400, igual ao total anterior. A linha mais antiga do sync_log passou a ser de 29/09.
5. **Decisão das 11 funções:** ver a decisão 8. Todas mantidas.
6. **Migração 20261029c aplicada** pelo MCP com o nome endurecer_funcoes_security_definer. Resultado: 91 assinaturas (85 nomes) SECURITY DEFINER executáveis por authenticated, contra 91 antes; anon 0. Das 91 originais, o conjunto muda pouco porque as funções de cron e service role já estavam fechadas, e o ganho real é o resto ficar fechado por construção e os privilégios padrão. O inventário no arquivo tem 90 nomes, dos quais 5 (churn_tela, recordes_painel, metas_time_mensal, metas_cs_mensal_completo, metas_resolvidas_periodo) não são SECURITY DEFINER e por isso não entram na contagem.
7. **scripts/testes/rpc_permissoes.ts executado com a service role** (chave obtida pela CLI, nunca impressa): 23 de 23. Em todas, o CS foi negado (42501) e o gestor aceito. Os usuários de teste foram removidos no fim.
8. **Teste de fumaça com sessão de gestor e de CS pela tela: não executado.** Não há credenciais de gestor nem de CS nesta máquina. Como evidência substituta: nos logs do Postgres, zero ocorrências de permission denied for function desde a aplicação, e nos logs da API as chamadas reais (is_gestor, meu_cs, reports_resumo_cs, health_base_area, metas_time_mensal e outras) responderam 200. O volume de tráfego real nesse intervalo foi baixo, então a recomendação é o Vitor abrir cada aba como gestor e como CS e fazer uma escrita por perfil. Se aparecer permissão negada inesperada, rodar supabase/rollbacks/20261029c_endurecer_funcoes_security_definer_rollback.sql e incluir a função no inventário.

## Advisors do Supabase de produção, antes e depois (29/10/2026)

| Alerta | Antes | Depois |
| --- | --- | --- |
| Chaves estrangeiras sem índice (performance) | 6 | 0 |
| Tabelas com RLS ativo e sem policy (segurança) | 4 | 0 |
| Funções SECURITY DEFINER executáveis por authenticated (segurança) | 91 | 91 |
| Índices sem uso (performance, informativo) | 5 | 11 |
| Proteção contra senhas vazadas (segurança) | desligada | desligada |

Os dois alertas pedidos foram a zero. O de funções executáveis por authenticated **não caiu**: o linter conta cada assinatura que authenticated pode chamar, e o inventário reúne praticamente todas as funções que o app usa, então o número ficou em 91 assinaturas (85 nomes). O ganho da etapa é outro: o conjunto passa a ser explícito e fechado por construção, funções novas nascem sem EXECUTE e as de cron, service role e trigger não são chamáveis por usuários. Reduzir esse número exige trocar funções específicas para SECURITY INVOKER ou movê-las para fora do schema exposto, o que fica como pendência de médio prazo. Os seis índices novos aparecem como sem uso apenas porque acabaram de ser criados; não foram removidos.

## PR e entrega (29/10/2026)

- PR 9 (vitorvales-commits/MOAI-CS), de feat/plataforma_robustez para main, merge commit preservando os commits.
- Preview da Vercel (commit be0c9a7): READY, check verde, nenhum erro de execução nas últimas 2 horas. O preview é protegido pelo login da Vercel, então as rotas respondem 302 para o login e não foi possível abrir a página por perfil.
- Hora do merge, estado do deployment de produção e resultado dos dez minutos de verificação (erros de execução, sync_log, rota /api/gestor/saude-dados) ficam registrados em comentário no PR 9, porque só existem depois do merge e este arquivo foi fechado antes dele para evitar um segundo PR.

## Pendências e passos manuais que restam ao Vitor (estado final)

1. Ligar a proteção contra senhas vazadas no Supabase Auth (painel, Authentication, senhas). O advisor ainda mostra o alerta.
2. Resolver o Resend HTTP 403 da Edge Function notificar-alertas (chave ou domínio remetente). Fora do escopo e não alterada. O cartão de saúde dos dados a mostra como crítica enquanto não for resolvida.
3. Avaliar a migração do Vercel do plano Hobby para o Pro. O Supabase também está no plano gratuito e não oferece branches (exigem Pro).
4. Configurar um ESLint padrão do Next.js: npm run lint abre o assistente interativo porque o projeto não tem configuração.
5. Abrir cada aba como gestor e como CS e fazer uma escrita por perfil (salvar uma meta, salvar e remover um relatório de conselho de teste, registrar e remover um 1 a 1 de teste). Não foi possível sem credenciais. Se houver permissão negada inesperada, aplicar o rollback de supabase/rollbacks/.
6. Regravação incremental nos boards matchmakings (814), cases (420) e agenda_conselhos (353).
7. Funções criadas por supabase_admin pelo painel seguem os privilégios padrão do Supabase (com EXECUTE para anon). Revogar à mão ao criar.
8. Reduzir o número de funções SECURITY DEFINER executáveis por authenticated (91) convertendo para SECURITY INVOKER as que puderem.
9. O arquivo ~/moai_backups/sync_log_antes_20261029.csv guarda o detalhe de 17/09 a 28/09. Guardar em local seguro ou descartar quando não for mais necessário.

## Texto do PR

Título: Robustez da plataforma: retenção do sync_log, índices e policies, funções SECURITY DEFINER, sync-monday resiliente e cartão de saúde dos dados.

Justificativa de gestão: o gestor precisa saber, sem abrir nenhum detalhe, se os números que lê estão atualizados e se alguma rotina automática falhou, porque uma falha silenciosa de sete dias já ocorreu e só foi descoberta por inspeção técnica. O insight é a frescura dos dados por board e a ação é acionar o responsável técnico quando algo sai do padrão.
