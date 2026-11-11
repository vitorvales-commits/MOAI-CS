# Eventos da MOAI na agenda: aplicação (11/11/2026)

Status geral: **parcial**. Código aplicado e verificado localmente. Migração aplicada, `sync-sympla` implantada, cadeia cron/Vault/banco provada sem token. **Faltam** a implantação da `sync-monday` (bloqueada, ver abaixo), a execução da tarefa `eventos` e a validação visual com login.

## Onde está

- Worktree isolado: `C:\Users\vitor\Downloads\moai-cs-eventos`, branch `feat/eventos-sympla-agenda`, base `2a281b3` (main).
- O repositório principal `C:\Users\vitor\Downloads\moai-cs-repo` não foi tocado. Ele está na branch `feat/report_via_monday_etapa3` com alterações não commitadas que não são deste trabalho.
- Commits: `b3c9bb6` (feature), `f62f9b6` (testes), `e0f9ac3` (prompt). São três commits, não dois, porque o terceiro traz o prompt de aplicação.

## Arquivos alterados (conferidos byte a byte contra o zip, ignorando CRLF)

- `supabase/migrations/20261111_eventos_sympla.sql`
- `supabase/functions/_shared/eventos.ts`
- `supabase/functions/sync-sympla/index.ts`, `logica.ts`
- `supabase/functions/sync-monday/index.ts` (tarefa `eventos`), mais os módulos irmãos já existentes
- `lib/eventos.ts`, `lib/eventos-agenda.ts`, `lib/reports.ts`, `lib/agenda-ui.ts`
- `public/agenda-cs.js`
- `tests/eventos.test.ts`, `tests/sympla.test.ts`
- `handoff/prompt_eventos_sympla_agenda.md`

## Adaptações

1. `handoff/principios_ux_gestor.pl`, `handoff/convencoes.pl` e `handoff/armadilhas.pl` não existem no repositório. A leitura foi feita a partir do prompt e dos patches.
2. `npm test` reportou **82 de 82** arquivos, não 83 como o prompt dizia. Todos passaram.
3. Migração aplicada pelo MCP do Supabase com o nome `20261111_eventos_sympla`, com o mesmo SQL do arquivo.
4. `sync-sympla` implantada pelo MCP, colando o conteúdo dos dois arquivos. A verificação foi por leitura de volta (`get_edge_function`), comparando visualmente. Não houve comparação por hash.
5. Não havia token da CLI do Supabase (`SUPABASE_ACCESS_TOKEN`) neste ambiente, então não foi possível usar `supabase functions deploy` a partir do disco.

## Resultado de cada passo

**Seção 2.1, migração:** aplicada com sucesso. Pré-requisitos conferidos antes: `seguranca.catalogo_tabelas` existe com as colunas esperadas, `public.is_moai_user()` existe, os segredos `sync_function_secret` e `sync_function_authorization` estão no Vault, as extensões `pg_net` e `pg_cron` estão instaladas e `sync_log` existe.

**Seção 2.2, implantação:**
- `sync-sympla`: **implantada**, `verify_jwt` ligado, versão 1, status ACTIVE.
- `sync-monday`: **não implantada**. Motivo: o arquivo tem 1970 linhas e importa quatro módulos irmãos (`espelho.ts`, `fila-escrita.ts`, `parse-grupo.ts`, `prune-trava.ts`) além de `_shared/eventos.ts`. Sem a CLI autenticada, o único caminho seria retranscrever mais de 110 KB pelo MCP, risco inaceitável numa função que roda a cada 5 minutos em produção.

**Seção 2.3, tarefa `eventos`:** **não executada**, porque depende da implantação da `sync-monday`. Os itens de verificação (Comitê de IA de 18/11, Connect de 22/10, Mesa de 24/11 com `sympla_event_id = 3647115`) ficam pendentes.

**Seção 2.4, cadeia cron/Vault/banco:** **provada**. `select public.sympla_disparar();` retornou `true`. A linha de `sync_log` ficou com `board = 'sympla'`, `status = 'sucesso'`, `erro = 'AVISO: aguardando o token do Sympla (secret SYMPLA_TOKEN)'`.

**Seção 2.5, advisors:**
- Segurança: nenhum achado cita `eventos_items`, `sympla_eventos` ou `sympla_disparar`. Os achados são antigos e de outras tabelas.
- Performance: os índices novos aparecem como `unused_index` (INFO). É esperado, porque as tabelas acabaram de ser criadas e estão vazias. Os demais achados são antigos.
- Nenhum alerta novo que exija correção.

**Seção 3, validação:**
- `npx tsc --noEmit`: **passou**, código 0.
- `npm test`: **passou**, 82 de 82 arquivos.
- `next build`: **passou**, código 0, sem erros nem avisos no log. Rotas geradas normalmente, inclusive `/gestor` e `/gestor/cs/[nome]`.
- Preview do PR com login real, capturas em 1440 e 390 px, modal de evento: **não feitos**. Dependem de push da branch (ação externa, não feita sem confirmação) e de dados na `eventos_items`, que só existem depois da `sync-monday`.
- Teste de erro de leitura: a proteção está no código. `generateAgendaVisual` (em `lib/reports.ts`) envolve `eventosDaAgenda` em try/catch e devolve `eventosErro`, sem derrubar conselhos e rounds. **Não foi exercitado** num app rodando.

**Seção 4, token do Sympla:** pendente, é tarefa do Vitor. Nada foi feito com o token, que ainda não existe.

## Pendências para fechar

1. Implantar `sync-monday` com a CLI autenticada: `supabase functions deploy sync-monday` a partir do worktree. Para isso, é preciso um `supabase login` ou `SUPABASE_ACCESS_TOKEN` na máquina.
2. Disparar `sync-monday?board=eventos` e conferir as linhas esperadas em `eventos_items` e `sync_log`.
3. Push da branch e preview para validação visual com login.
4. Teste de erro de leitura num app rodando.
5. Quando o token chegar: `supabase secrets set SYMPLA_TOKEN=<token>` e conferir a Mesa de 24/11 (3647115) em `sympla_eventos`.
