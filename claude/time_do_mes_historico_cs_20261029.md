# Time do mês: histórico de CS por mês (29/10/2026)

## Contexto

Ao escolher um mês fechado, como janeiro de 2026, os indicadores vinham zerados: a tabela cs_periodos nunca tinha sido criada e o app usava os CS ativos de hoje em todos os meses. A tabela passou a ser o histórico único de quem foi CS, com período e aliases (grafias da pessoa nos boards). A regra é única: o mês corrente mostra só os ativos de cs_config; o mês fechado mostra quem era CS naquele mês, inclusive ex CS. O toggle "Mostrar ex membros" foi removido e trocado por uma nota que diz o recorte. A migração é supabase/migrations/20261029_cs_historico.sql; o arquivo supabase/seed/cs_periodos.sql está aposentado.

## Conclusão

Concluído em 29/10/2026, pelo PR 10 (branch feat/time_do_mes_historico_cs, commit de merge c36044c), com deploy de produção dpl_8ebKTVZGHuVfW7kAUPBaR4QncEk2 em READY.

Passo 1. A branch estava no commit "Time do mês: mês fechado mostra quem era CS na época, mês corrente só ativos". Passaram tsc sem erros, npm test com 45 de 45 arquivos e npm run build. O trabalho foi feito em uma worktree separada, porque o repositório principal tinha alterações locais de outra branch.

Passo 2. A migração foi aplicada inteira e sem alterações no projeto evwdfeumlnxeqnnakdvq. Antes, a tabela não existia, então não havia dados a preservar.

Passo 3. A consulta de conferência devolveu em janeiro de 2026 Alejandro, Lanna, Lucas, Luma, Vinicius W. e Yasmim, e em setembro de 2026 Alejandro, George, Luana, Lucas, Marcos, Mateus, Rodrigo, Vilker e Vitor, como esperado. A tabela tem 17 linhas, RLS ligada, a policy moai_select (select para authenticated) e só leitura concedida a authenticated, sem escrita para anon. Os advisors de segurança ficaram idênticos aos de antes da migração (83 avisos de função SECURITY DEFINER executável e 1 de proteção contra senhas vazadas); nada novo apareceu.

Passo 4. A main não tinha andado (bfc98f3, igual à base da branch), então não houve rebase. O PR 10 foi aberto como "Time do mês: histórico de CS por mês" e mesclado com merge commit, padrão do repositório.

Passo 5. O deploy ficou READY. O get_runtime_errors não retornou erros. Nos logs de runtime houve apenas 1 registro de nível warn, que a busca por texto e por nível não conseguiu detalhar; não houve erro em /api/gestor/visao-geral nem em /api/gestor/cs.

Passo 6. Conferido logado como gestor. Em outubro de 2026 a nota diz "CS ativos hoje · 8 CS" (Amanda, George, Iasmin, Luana, Mateus, Rodrigo, Vilker e Vitor) e Marcos não aparece. Em janeiro de 2026 a nota diz "Quem era CS em janeiro de 2026 · 6 CS" e o mapa lista os seis nomes do passo 3. A página de Alejandro abre sem erro, e as de Alejandro e Yasmim mostram churn do mês (8 e 6) e cases (0 e 1), com demais indicadores zerados. Na home, o Time de CS segue o mesmo recorte (8 ativos em outubro, os seis de janeiro).

Divergências encontradas, sem alteração de código: (a) no mapa de janeiro as colunas de pontuação, GTD e advertência aparecem como "Sem dado" ou "Fora do ranking", porque não há metas cadastradas para o mês; o churn e os cases existem, mas ficam sem meta. Isso é falta de dado, não defeito do recorte. (b) O seletor de ano só oferece 2026 e 2027, então junho de 2025 não pode ser escolhido na interface e a mensagem de ausência de registro não foi vista na tela. Foi conferido pela API autenticada: junho de 2025 devolve total 0 no modo quem_era_cs (julho de 2025 devolve 1, janeiro de 2026 devolve 6, outubro de 2026 devolve 8 no modo ativos_hoje), e o texto "Não há registro de quem era CS neste mês" existe em app/gestor-html.ts. (c) Este documento não existia no repositório e foi criado junto com esta conclusão.

Pendências que seguem abertas, apenas citadas: revisar com o gestor os registros com confirmado falso, que são Gustavo Lucas, Giovanna Monteiro e Vinicius W., cujo período termina em maio de 2026.
