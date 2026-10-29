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
8. **Funções que perdem EXECUTE para authenticated por não terem chamador no código:** churn_recorte_hash, cs_do_grupo, definir_vinculo_conselheiro, publicar_churn_analise, registrar_rascunho_churn_ia, reservar_geracao_churn_ia, salvar_churn_analise, report_resolver_cs, criar_um_a_um, editar_um_a_um, marcar_status_um_a_um. Se alguma tela fora do repositório as chamar, o rollback devolve o acesso. **Conferir antes de aplicar.**
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

## Pendências

- **Edge Function notificar-alertas** falha com Resend HTTP 403 desde 22/10 e ficou fora do escopo, como pedido. O cartão de saúde já a mostra como crítica (alertas_nps). Os alertas continuam sendo gravados, só o email não sai.
- Regravação incremental nos boards matchmakings (814), cases (420) e agenda_conselhos (353).
- Funções criadas por supabase_admin (por exemplo pelo painel) seguem os privilégios padrão do Supabase, que dão EXECUTE a anon. A migração só altera os privilégios padrão do papel que a executa. Quem criar função pelo painel deve revogar à mão.
- ESLint não configurado no projeto.
- Rodar get_advisors de segurança e de performance em produção depois de aplicar as migrações.
- A migração 1 apaga do sync_log, na hora em que for aplicada, o que tiver mais de 30 dias.

## Passos manuais do Vitor

1. Ativar a proteção contra senhas vazadas no painel do Supabase Auth (Authentication, Providers, Email, "Prevent use of leaked passwords"). Não há API para isso aqui.
2. Aplicar as migrações em produção na ordem dos arquivos: 20261029, 20261029b, 20261029c, 20261029d, 20261029e. A 20261029d precisa estar aplicada antes de publicar a nova versão da Edge Function sync-monday.
3. Antes da 20261029c, conferir a lista da decisão 8 e rodar scripts/testes/rpc_permissoes.ts depois dela. Se algo quebrar, rodar o arquivo de rollback.
4. Publicar a Edge Function sync-monday (supabase functions deploy sync-monday) e olhar o sync_log do primeiro ciclo.
5. Avaliar a migração do Vercel do plano Hobby para o Pro. O Supabase também está no plano gratuito, sem branches (Pro).

## Texto do PR

Título: Robustez da plataforma: retenção do sync_log, índices e policies, funções SECURITY DEFINER, sync-monday resiliente e cartão de saúde dos dados.

Justificativa de gestão: o gestor precisa saber, sem abrir nenhum detalhe, se os números que lê estão atualizados e se alguma rotina automática falhou, porque uma falha silenciosa de sete dias já ocorreu e só foi descoberta por inspeção técnica. O insight é a frescura dos dados por board e a ação é acionar o responsável técnico quando algo sai do padrão.
