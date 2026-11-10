Conselho conjunto Rafael e Rodrigo Gianesini: causa, correção e estado (10/11/2026)

Contexto. O item 12898643862 do board de Agenda ("Rafael e Rodrigo Gianesini", 12/11/2026 às 14h de Brasília, Confirmado) não aparecia no dash. A decisão do Vitor, de 10/11/2026, é que o conselho unificado vale para os dois grupos, "Executivo | Rafael Gianesini (Mateus)" e "Executivo | Rodrigo Gianesini (George)": cada grupo mantém o seu CS, e o encontro aparece uma vez na agenda.

Passo 1, causa (verificada no banco e no código antes de alterar).
- O item existe em agenda_conselhos_items com status Confirmado e data 12/11/2026 17:00 UTC. Está lá desde a sincronização de 17/09, e não foi removido.
- O dash descarta o encontro porque "Rafael e Rodrigo Gianesini" não casa com nenhum grupo. A regra de lib/agenda-nomes.ts compara texto (chave exata ou distância de edição até 2 com mesmo primeiro nome). Não há grupo com esse nome, e a distância para "rafael gianesini" é 8. Além disso, agenda_conselheiro_vinculo tinha nome_agenda como única chave, então o nome conjunto não podia ter dois conselheiros.
- O synced_at 17/09 é outro defeito, e não é a causa do encontro sumir. syncAgenda (supabase/functions/sync-monday/index.ts) faz upsert com id, conselheiro_nome, data_iso e status, sem synced_at. O default now() só vale na inserção, e o merge-duplicates mantém o valor antigo. Por isso toda a agenda mostra 17/09, embora data e status sejam atualizados a cada execução. O cron de 5 minutos continua rodando: conselheiros foi sincronizado em 10/11.

Correções.
1. Sincronização (commit 07ae60b): syncAgenda passa a enviar synced_at. Pendente publicar a Edge Function (ver abaixo).
2. Banco (commit 0cea8d3, migração supabase/migrations/20261110a_conselho_conjunto.sql, já aplicada pelo Supabase com o nome conselho_conjunto_vinculo_encontros):
   - agenda_conselheiro_vinculo: chave (nome_agenda, conselheiro_monday_item_id). Linhas preservadas: 43 para 45, com os dois vínculos do conjunto (Rafael GIanesini 10866398560 e Rodrigo Gianesini 10866387336), origem manual.
   - Gatilhos zz_seguranca_lixeira e zz_seguranca_versao passam a usar as duas colunas como chave. Sem isso a chave da lixeira e do histórico ficaria ambígua com dois vínculos por nome.
   - encontros_conselho: chave (agenda_item_id, group_id). As 351 linhas foram preservadas.
   - definir_vinculo_conselheiro, vincular_conselheiros_agenda e sincronizar_encontros_conselho reescritas com as mesmas permissões, search_path e security definer. vincular_conselheiros_agenda usava ON CONFLICT (nome_agenda), que deixaria de existir com a nova chave.
   - As políticas de segurança pendentes não foram tocadas.
3. Casamento (commit 4b9a038): chavesDaAgenda e conjuntosDaAgenda em lib/agenda-nomes.ts. Um nome com dois ou mais vínculos casa pelo nome de cada conselheiro, nunca pelo texto. O resolvedor, a próxima data do conselho e a agenda visual usam isso. O caso Henrique Guimalhaes [André Froes] segue casando com Henrique Guimaraes (Vitor) pela regra tolerante. Teste em tests/conselho-conjunto.test.ts.
4. Cartão (commit 78ab2ff, public/agenda-cs.js): o conjunto aparece uma vez, com os dois nomes e os dois CS. O semáforo é o do grupo com menos confirmados (o pior). A lista de cobrança tem uma entrada por grupo que precisa de cobrança, com o nome do grupo. O modal ganha o bloco "Por grupo".
5. Relatório: encontros_conselho passa a ter uma linha por grupo, então cada grupo tem o seu encontro, o seu relatório (relatorios_conselho já era único por group_id e data) e as suas faltas (faltas_do_encontro usa só os membros do grupo). A linha do grupo George do 12/11 foi gravada com os mesmos valores que a RPC gravaria (353 encontros no total, sem duplicatas indevidas).

Interpretações (o Vitor pode reverter).
- "A presença dos dois conselheiros conta nos dois grupos": os conselheiros (Rafael e Rodrigo) não são membros das listas dos grupos. Os membros são os clientes. Por isso o encontro vale para os dois grupos, e confirmados e esperados saem dos membros de cada grupo. Se a regra for outra, o ajuste fica em detalheDoEncontro (lib/reports.ts).
- Pior semáforo: o grupo com menos confirmados. A faixa cresce com a contagem, então é equivalente ao pior estado.
- definir_vinculo_conselheiro agora troca o conjunto inteiro de vínculos do nome. Hoje nenhum código da aplicação chama essa função; só o banco a usa.

Validação.
- tsc --noEmit: sem erros.
- npm test: 74 de 74 arquivos aprovados (eram 73; o novo é tests/conselho-conjunto.test.ts).
- npm run build: concluído.
- Visual, com a agenda real (CSS e script de public/ e generateAgendaVisual sobre fixture), em 1440 px e em 390 px, com o encontro de 12/11 e um conselho comum (Carlos Júnior, grupo Iasmin): nenhum nome cortado, sem rolagem horizontal em 1440. Limite: o Edge headless não aceitou janela abaixo de 496 px no modo de medição, mas a captura de 390 px saiu no layout mobile e o nome conjunto aparece inteiro. O modal e o texto do modo "Meus" não foram verificados visualmente.

Pendências e riscos.
- Publicar a Edge Function sync-monday depois do merge na main (deploy-functions.yml). Até lá o synced_at continua 17/09, mas o encontro já aparece pelo código novo do dash.
- Pontos automáticos: como cada grupo tem o seu relatório, o conselho conjunto gera duas obrigações. Se um dos CS não preencher o relatório no prazo, o seu grupo recebe os 5 pontos automáticos. Isso é o efeito esperado da decisão de um relatório por grupo, mas precisa ser comunicado.
- O resumo da semana conta cobranças por grupo: um conselho conjunto em que os dois grupos precisam de cobrança conta duas. Foi mantido de propósito, porque cada grupo tem o seu CS cobrando.
- Outros usos de nome por texto (lib/consulta/proximas-reunioes.ts, lib/voz-membro-dados.ts, lib/nps-agenda.ts, lib/carteira-divergencias.ts) não foram alterados. Eles passam pelo mesmo acharChaveTolerante e não enxergam o conjunto, exceto onde usam buildAgendaMap. Revisar se a consulta de próximas reuniões precisar do conjunto.
- A migração foi aplicada com o nome conselho_conjunto_vinculo_encontros. O arquivo do repo é 20261110a_conselho_conjunto.sql. O arquivo é idempotente, então reaplicar pelo workflow aplicar-migracao não altera nada.
- Entrega: branch feat/gianesini_conjunto, criada a partir de origin/main, com cinco commits. Não foi enviada ao GitHub e nenhum PR foi aberto.

Arquivos.
- supabase/migrations/20261110a_conselho_conjunto.sql (novo)
- supabase/functions/sync-monday/index.ts
- lib/agenda-nomes.ts, lib/reports.ts
- public/agenda-cs.js
- tests/conselho-conjunto.test.ts (novo)
- handoff/dados.pl, handoff/historico.pl
- claude/conselho_conjunto_gianesini_20261110.md (este arquivo)
