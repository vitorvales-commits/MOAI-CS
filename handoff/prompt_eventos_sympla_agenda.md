# Prompt: eventos da MOAI na agenda, com escala, meta e ingressos do Sympla (11/11/2026)

Você está no repositório do dash de CS da MOAI (Next.js no Vercel, Supabase `evwdfeumlnxeqnnakdvq`). O pacote `eventos_sympla_agenda.zip` traz o código pronto, testado e com build limpo, na branch `feat/eventos-sympla-agenda` (dois commits sobre a main 2a281b3). Leia antes `handoff/principios_ux_gestor.pl`, `handoff/convencoes.pl`, `handoff/armadilhas.pl` e `claude/eventos_sympla_agenda_20261111.md`. Trabalhe com autonomia; quando algo do código real divergir deste prompt, siga a intenção e registre a adaptação no relatório final. Não pare para perguntar: o token do Sympla ainda não existe e a entrega precisa funcionar sem ele.

## 0. Regras de segurança

O token do Sympla só existe no secret `SYMPLA_TOKEN` da Edge Function `sync-sympla`. Ele nunca passa pelo Next.js, pelo Vercel, por tabela ou por log. Nenhum dado pessoal de participante (nome, email, documento, número de ingresso) é gravado: a função recebe a lista de participantes só para contar. O link dos convites do Monday não é gravado, porque link de evento privado carrega token; só o id numérico do Sympla. Não acrescente coluna com dado pessoal em `sympla_eventos`.

## 1. Arquivos (copie preservando o caminho, ou faça checkout da branch)

`supabase/migrations/20261111_eventos_sympla.sql`, `supabase/functions/_shared/eventos.ts`, `supabase/functions/sync-sympla/index.ts`, `supabase/functions/sync-sympla/logica.ts`, `supabase/functions/sync-monday/index.ts` (tarefa nova `eventos`), `lib/eventos.ts`, `lib/eventos-agenda.ts`, `lib/reports.ts`, `lib/agenda-ui.ts`, `public/agenda-cs.js`, `tests/eventos.test.ts`, `tests/sympla.test.ts`.

## 2. Ordem de implantação

1. Aplique a migração `20261111_eventos_sympla.sql`. Ela cria `eventos_items` e `sympla_eventos` com RLS (leitura só `is_moai_user()`, escrita só service role), registra as duas no `seguranca.catalogo_tabelas` e agenda `sync-sympla-15min`, que lê `sync_function_secret` e `sync_function_authorization` do Vault na hora da chamada.
2. Implante as funções: `supabase functions deploy sync-monday` e `supabase functions deploy sync-sympla` (verify_jwt ligado, como as demais). A sync-monday passa a importar `../_shared/eventos.ts`; confirme que o bundle inclui a pasta `_shared`.
3. Rode só a tarefa nova: chamada manual da sync-monday com `?board=eventos`. Confira em `sync_log` uma linha `board = 'eventos'` com sucesso e cerca de 74 itens, e em `eventos_items` que o Comitê de IA de 18/11 tem `inicio` 19h de Brasília, `meta_raw` "60 pessoas" e quatro escalados; que o Connect de 22/10 tem `escalados_fonte = 'subitens'` (a coluna Escalados está vazia e os subitens marcam Rodrigo, Mateus e Vilker); que a Mesa de 24/11 tem `sympla_event_id = 3647115`.
4. Rode `select public.sympla_disparar();`, espere 20 segundos e confira em `sync_log` uma linha `board = 'sympla'` com `AVISO: aguardando o token do Sympla`. Isso prova a cadeia cron, Vault, função e banco sem token.
5. Rode `get_advisors` (security e performance) e corrija qualquer alerta novo.

## 3. Validação

`npx tsc --noEmit`, `npm test` (83 arquivos), `next build` limpo, preview do PR com login real: agenda da home do gestor e da página de um CS, semanas de 16/11 e 23/11, capturas a 1440 e 390 px, modal de um evento. Com o token ainda ausente, os cartões de evento mostram escala e meta e não mostram venda; nenhum conselho ou round muda. Force erro de leitura (renomeie a tabela numa transação desfeita, ou simule no código) e confirme que a agenda continua com conselhos e rounds e mostra o aviso de eventos.

## 4. Quando o token chegar (para o Vitor)

No Sympla, entre como organizador da MOAI, abra Minha conta, Integrações, e gere o token da API (o Sympla chama de s_token). Rode no terminal `supabase secrets set SYMPLA_TOKEN=<token>`, sem colar o token em chat, commit ou documento. A próxima execução do cron, em até 15 minutos, grava os eventos e as contagens. Para revogar, apague o token no Sympla e rode `supabase secrets unset SYMPLA_TOKEN`. Na primeira leitura real, confira em `sympla_eventos` que a Mesa de 24/11 (3647115) apareceu com `vendidos` igual ao painel do Sympla; se a API devolver campos com outro nome, ajuste `logica.ts` e o teste `tests/sympla.test.ts`.

## 5. Relatório

Grave `claude/eventos_sympla_agenda_aplicacao_<data>.md` com arquivos alterados, adaptações e o resultado de cada passo das seções 2 e 3.
