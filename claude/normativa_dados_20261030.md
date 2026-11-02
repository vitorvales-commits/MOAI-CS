# Normativa de dados do dash de CS (30/10/2026)

Branch: `feat/normativa-dados`. Projeto Supabase: `evwdfeumlnxeqnnakdvq`.

## Estado da entrega

| Etapa | Situação |
|---|---|
| 0. Diagnóstico | Feito. Divergências abaixo. |
| 1. Backup diário | Arquivos prontos (workflow, scripts, procedimento). Não executado: falta cadastrar `SUPABASE_DB_URL` e `BACKUP_PASSPHRASE` e não há Docker nem acesso ao host do banco nesta sandbox. **Bloqueia todas as migrações.** |
| 2. Rede de segurança | Migração `20261030b` copiada para o repositório, não aplicada. Trava de sanidade dos prunes escrita em `supabase/functions/sync-monday/index.ts` (v31), não implantada. |
| 3 a 7 | Não iniciadas. Dependem da etapa 2 aplicada. |

## Divergências encontradas na etapa 0

1. `conselhos_status_historico` tem FK `membro_id` com `ON DELETE NO ACTION` (`confdeltype = 'a'`), não cascata. A cascata é manual em `prunarMembrosRemovidos`, como o código descreve. Nenhuma correção necessária, só registro.
2. `churn_items` e `churn_detalhes` têm FK em cascata (`c`), e `reconquista_ex_membros` também. A premissa da cascata está confirmada.
3. `conselhos_status_mensal` tem FK em cascata sobre `conselhos_membros`. Confirmado.
4. O Vault está vazio (0 segredos). Confirmado. Extensões `pg_cron`, `pg_net` e `supabase_vault` estão instaladas.
5. O cron `sync-monday-5min` existe. Confirmado.
6. A lista de tabelas de `public` (79 tabelas) coincide com o catálogo da migração `20261030b`. Nenhuma tabela sem classificação.
7. Colunas do board Visita Churns (18432210313): "Próximo acompanhamento" tem id `date_mm7eccg9` (tipo date). A coluna de texto se chama "Observações da visita" e tem id `text_mm7eya7z`, não "Observações". Não há coluna "Observações" sem o complemento.
8. O repositório não tinha `.github/`. Foi criado.
9. O backup proposto não cobre o schema `auth` (usuários do Supabase Auth) nem o Storage. Isso precisa de decisão: incluir `auth` no dump ou aceitar a lacuna.
10. A saúde dos dados lê `lib/saude-dados.ts`, que classifica rotinas pelo `sync_log` (`board`, `ultima_sucesso`, `falhas_consecutivas`). Os novos registros `prune:<tabela>` entram nessa tabela com `status = 'erro'`. Verificar na etapa 2 se alguma tela trata um `board` desconhecido de forma estranha.

## Backup (etapa 1)

- `.github/workflows/backup-banco.yml`: dump diário às 06h17 UTC, criptografado com AES256, artefato com 35 dias, e job de restauração que compara contagens.
- `scripts/backup/gerar-backup.sh`, `scripts/backup/contagens.sql`, `scripts/backup/tsv_para_json.py`: geração das contagens e do dump dentro da imagem `postgres:17`.
- `scripts/backup/verificar-restauracao.sh` e `scripts/backup/comparar_contagens.py`: restauração em Postgres descartável e comparação. Falha se qualquer tabela divergir.
- `public.sync_log` fica fora das contagens, porque o dump não traz os dados dela.

### Procedimento de restauração

Pré-requisito: a frase de `BACKUP_PASSPHRASE`, guardada fora do GitHub.

1. Baixe o artefato `backup-banco-<run_id>` da execução desejada.
2. Descriptografe: `gpg --decrypt --output banco.dump banco.dump.gpg`.
3. Restauração completa em um projeto vazio: `pg_restore --no-owner --no-acl -d "<URL do banco de destino>" banco.dump`.
4. Restauração de uma tabela: `pg_restore --no-owner --no-acl -t nome_da_tabela -d "<URL>" banco.dump`.
5. Compare as contagens com `contagens.json` (descriptografado) usando `scripts/backup/contagens.sql`.

## Trava de sanidade do prune (etapa 2, item 3)

Limiares em `LIMITE_PRESENCA_PRUNE = 0.8` e `LIMITE_REMOCAO_PRUNE = 50`, no topo de `supabase/functions/sync-monday/index.ts`. Quando a trava segura, o motivo vai para `sync_log` e o ciclo segue.

## Regra permanente para migrações futuras

Toda migração que criar tabela em `public` inclui a tabela em `seguranca.catalogo_tabelas` e termina com `select seguranca.aplicar_protecoes();`. A view `seguranca.v_tabelas_sem_classificacao` precisa estar vazia. Falta o teste em `tests/` que verifica isso (depende da migração aplicada).

## Pendências

- Cadastrar `SUPABASE_DB_URL` e `BACKUP_PASSPHRASE` no GitHub Secrets e guardar a frase fora do GitHub.
- Primeira execução do backup e da restauração, com contagens idênticas.
- Decidir sobre o schema `auth` no backup.
- Aplicar a migração `20261030b`, rodar `scripts/normativa/teste_seguranca_reversivel.sql` e os advisors.
- Implantar `sync-monday` com a trava.
- Etapas 3 a 7.

## Portão do backup (aceito em 01/11/2026)

- Execução `41321452611` do workflow "Backup do banco", disparada manualmente pela `main` (commit `e0199e2`).
- Job "Dump criptografado": verde. Dump de 6.525.848 bytes antes da criptografia, 62 tabelas contadas, snapshot `00000027-0000DE37-1`.
- Artefato `backup-banco-41321452611` (id 13089716722): 6.144.774 bytes, criptografado, retenção de 35 dias.
- Job "Teste de restauração": verde. `62 tabela(s) comparada(s), 0 divergência(s)`. O único erro do `pg_restore` foi `schema "public" already exists`, esperado num Postgres novo.
- Tentativas anteriores (`41320857035` e `41321150142`) falharam por senha errada no pooler. O segredo `SUPABASE_DB_URL` foi redefinido e substituído pelo Vitor.

## Etapa 2 (parcial): migração 20261030b aplicada em 01/11/2026

- Teste reversível (`scripts/normativa/teste_seguranca_reversivel.sql` concatenado à migração, numa única chamada): falhou na primeira rodada com `churn_items` gerando erro, porque `seguranca.restaurar` tentava gravar a coluna gerada `data_referencia`. A transação foi desfeita, nada ficou aplicado. Corrigido: a função agora grava só as colunas que não são geradas (`attgenerated = ''`). Na segunda rodada, todas as verificações passaram: exclusão em cascata foi para a lixeira, restauração devolveu pai e filho, carimbo sozinho não gerou versão e alteração real gerou uma, TRUNCATE foi bloqueado, nenhuma tabela ficou sem classificação e há 144 gatilhos.
- Aplicação com `apply_migration` (nome `20261030b_normativa_seguranca`). Depois: `sem_classificacao = nenhuma`, `catalogo_tabelas` com 63 linhas, 144 gatilhos `zz_seguranca%`, lixeira com 0 linhas.
- Advisors de segurança: (a) RLS sem policy em `seguranca.catalogo_tabelas`, `lixeira` e `versoes`, intencional, acesso só por service role e funções; (b) `lixeira_recente` e `restaurar_da_lixeira` executáveis por `authenticated`, intencional, com checagem de gestor, no mesmo padrão de cerca de 87 RPCs já existentes; (c) proteção contra senha vazada desligada no Auth, fora desta entrega. Nenhum achado novo exige ação imediata.

## Pendências desta etapa

- Trava de sanidade do `sync-monday`: código pronto, deploy não feito. Falta implantar e disparar um ciclo completo para confirmar em `sync_log`.
- Push bloqueado: o histórico de `feat/normativa-dados` foi reescrito pelo rebase sobre a `main` e o remoto ainda aponta para `bca5902`. O force-push foi negado pelo classificador automático, então a branch local está à frente do remoto só em histórico, sem conteúdo novo além do que já está lá. Aguardando decisão do Vitor.

## Deploy automático e trava do sync-monday (01/11/2026)

- PR #17 (`chore/deploy-functions`) mergeado. Workflow `deploy-functions.yml` com CLI fixada em 2.122.0.
- PR #18 (`feat/normativa-dados`) mergeado. O push na `main` disparou o deploy (execução `41323481819`, verde). Publicou só `sync-monday`.
- `sync-monday` no ar: versão 39 (era 38). `verify_jwt = true`, igual às outras funções.
- Ciclo completo disparado com o comando do `pg_cron`. 16 boards com `sucesso`, nenhuma trava disparada. A trava ainda não foi exercitada num caso real de prune perigoso.
- Avisos pré-existentes, sem relação com o deploy: `granola` sem o secret `GRANOLA_FONTES`; `alertas_nps` com `Resend HTTP 403`.

## Etapa 3: backup antes da 20261030c

- Execução `41323685184` (branch `main`, commit `c72c95e`): verde nos dois jobs. Artefato `backup-banco-41323685184` com 6.155.104 bytes, criptografado, retenção de 35 dias.
- A migração `20261030c` ainda não foi escrita. Nada aplicado. Branch `feat/canonico-etapa3`.

## Etapa 3: confirmações do gestor e complemento (01/11/2026)

- Vínculo de monday_user_id aos ex CS, com evidência de `reports_individuais.autor_monday_id` e `cs_nome_original`: Alejandro (80007640), Luma (67648894), Yasmim (84002101), Vinicius W. (49770403), Lucas (97950299).
- Classe área (decisão do gestor): Tainara Lopes da Silva Costa, Juliane Scheidt de Cristo, Malu Sarnícola, Juliana Aguiar, Natasha Caldas do Prado, barbara@mmoai.com.br, autor 96958790 (Pedro Paulo Santos Braga, Produto) e autor 21005878 (Vinicius Postai, admin).
- Confirmações gravadas em `canonico.cs_apelidos` com `origem = gestor`, e 13 linhas em `access_audit_log`. A função `canonico_confirmar_apelido` exige o login do gestor, então o registro foi feito em SQL, com a mesma regra e o mesmo registro de auditoria.
- Migração `20261030d_canonico_relatorios` (backup `41326946254` verde antes da aplicação): autor que não é CS é classificado por `cs_apelidos`. Relatórios individuais viram fonte nova, com resolução pelo nome do item quando o autor não é CS.
- Cobertura após as confirmações: 100% nas fontes de churn, cases, matchmakings, metas, histórico e rounds (cases 100% depois da classe área, matchmakings 100%). Relatórios individuais 96,19%, relatórios semanais 97,14%, upsell 94,81%.
- Pendências restantes: ID 98302554 (Lorena, 6 relatórios semanais) e o texto "Lorena Menezes Batista Pitt" (4 upsells). Aguardando a resposta do gestor sobre a Lorena.

## Etapa 6 (parcial): trava dos prunes em função pura

- `supabase/functions/sync-monday/prune-trava.ts` com `decidirPrune`. `index.ts` passa a usar essa função. Testes em `tests/prune-trava.test.ts`: leitura vazia, leitura abaixo de 80%, arredondamento, mais de 50 remoções, limites exatos e casos sem órfãos.

## Etapa 3: fechamento (01/11/2026)

- Lorena (fevereiro a março de 2026): identidade em `canonico.cs` (ID do Monday 98302554) e período em `cs_periodos`. Grafias "Lorena" e "Lorena Menezes Batista Pitt" confirmadas como CS.
- Ale = Alejandro, confirmado com evidência de `metas_subitens` ("Ale - Maio") e dos 4 reports de 12/01 do admin.
- CS do conselho pela regra do dash: apelido entre parênteses no fim do segundo bloco, depois de remover o marcador de congelado. Migração `20261030e` aplicada após backup `41346119908` verde. Teste de equivalência `tests/parse-grupo-equivalencia.test.ts` com os 67 títulos de `conselhos_grupos`.
- Mateus no conselho `group_mm33rstr` (Executivo | João Vitor (Mateus) | EXTERNO): vigência aberta desde 2026-11-01.
- "Novo grupo" (`group_mm7f2nx0`): 0 membros e sem vigência. Fora das regras de carteira, sem alteração.
- "Fast Track | Livia" (`group_mm331w1n`): pendente de decisão de negócio. Sem alteração.
- `v_cobertura` em 100% nas nove fontes. Pendências: zero.

## Etapa 4a: motor da fila de escrita (02/11/2026, PR em revisão)

- Migração `20261030f_sincronia_motor`: schema `sincronia` (configuração, campos editáveis com o piloto de Visita Churns, comandos sem operação de exclusão), `public.enfileirar_edicao_monday`, gatilho com `pg_net` e as funções `sincronia_*` para o serviço e para o gestor. Ainda não aplicada: entra pelo workflow `aplicar-migracao`, depois do merge.
- Chave `fila_escrita_ativa` começa desligada. Com ela desligada, o enfileiramento é recusado e a tarefa `fila_escrita` não lê nem escreve nada.
- Segredo da função: lido do cron e gravado no Vault sem exibir o valor. Se o cron não tiver o valor (cópia restaurada), a migração avisa e segue.
- Tarefa `fila_escrita` na sync-monday: consome a fila em lotes de 25, com reserva atômica. Regra de conflito em `fila-escrita.ts` (`decidirEscrita`), esperas de 1, 5, 30 e 120 minutos, 5 tentativas no total.
- Isolamento: `executarCiclo` roda cada tarefa com try/catch. Erro de `fila_escrita` vai para `sync_log` com esse rótulo e não interrompe os boards.
- Testes: `tests/fila-escrita.test.ts`.

## Etapa 4a: teste de ponta a ponta (02/11/2026)

- Item de teste fixo da fila: "teste" (ID `13441800409`) no board Visita Churns, grupo Churn. Fica no board como ambiente de teste da fila de escrita. Não usar em nenhum outro fim.
- Edição com sucesso: comando `e2e-sucesso-1`, concluído. O Monday mostrou o texto gravado.
- Conflito: comando `e2e-conflito-1`, com leitura anterior à edição feita no Monday. Ficou em `conflito`, sem escrita.
- Os dois comandos foram marcados como `cancelado`, com motivo "teste de ponta a ponta" no campo `erro`, para não aparecerem na fila de ação do gestor.
- Chave `fila_escrita_ativa`: desligada. Será ligada como último passo da etapa 4b, depois do merge, pela função auditada `public.sincronia_definir_fila_ativa`.

## Etapa 4b: parte 1 (backend, em revisão)

- Migração `20261030g_sincronia_leitura`: `public.sincronia_comando_status` (estado de um comando, para o cartão) e `public.sincronia_escritas_pendentes` (erro ou conflito, para a fila de ação). Entra pelo workflow `aplicar-migracao`, depois do merge.
- Rotas: `POST /api/monday/editar` (enfileira pela função do banco; com a chave desligada devolve 503 com mensagem clara) e `GET /api/monday/comando/[id]`.
- Lógica pura em `lib/sincronia.ts`: validação, estado visual (enviando, salvo, conflito, erro) e filtro da fila (erro ou conflito há mais de 24 horas). Testes em `tests/sincronia-edicao.test.ts`.
- Pendente (parte 2): edição no cartão de visita com os estados e os botões "Usar o valor do Monday" e "Reaplicar a minha alteração"; bloco "Escritas no Monday pendentes" na Fila de ação; capturas em 1440 e 390 px.
