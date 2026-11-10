# Metas semanais: telas (registro de 10/11/2026)

Registro das telas de metas semanais. Cada PR tem a sua seção.

## PR 1: tela Semanal e feriados (PR #33)

- Tela de metas em modo Semanal e configuração de feriados (commits anteriores da branch).
- Semana com fechamento congela a base (P3). Editar outra semana reequilibra só as abertas.
- Salvar ou remover meta de semana fechada é recusado no banco.
- Migração `supabase/migrations/20261105h_metas_semanais_trava_fechada.sql`: aplicada no SQL Editor de produção pelo Vitor. Script de teste `scripts/testes/metas_semanais_trava_fechada.sql`: passou.
- Conferência em produção (10/11/2026): matchmakings_resultado de outubro = 63 no time pela data de registro, em `matchmakings_items.resultado_registrado_em` e na soma de `metas_semanais_fechamento`. `historico_indicador` é função e já usa `resultado_registrado_em`: não há recálculo a fazer.
- Semana de 02/11 a 08/11 fechada pelo job em 09/11, conferida contra os números do prompt.

## PR 2a: home do CS e página do CS na visão do gestor (esta branch)

Branch `feat/metas-semanais-visao`, a partir da PR 1.

### O que foi entregue

- `lib/metas-semanais-visao.ts`: função pura. Lê o `MetasSemanaisCS` de `metasSemanaisDoCS` e devolve a semana corrente (`linhasSemanaAtual`) e as semanas fechadas do mês (`semanasFechadasDoMes`). Nenhum número é recalculado aqui além do ritmo.
- `lib/ritmo.ts`: `calcularRitmo` aceita a base de dias úteis da semana (`uteis`). Sem essa base, o cálculo pelo mês fica como estava. Nova função `diasUteisEntre`.
- `lib/inicio-cs.ts`: `semanalDoCS` lê `metasSemanaisDoCS` para o CS do login. O bloco `semanal` entra na home e na rota do gestor, isolado (erro não derruba a resposta).
- `app/api/gestor/cs/[nome]/route.ts`: a resposta da página do CS na visão do gestor inclui o mesmo bloco `semanal`.
- `lib/ui/metas-semanais-ui.ts`: CSS e script compartilhados entre a home do CS e a página do gestor. Desenha os cartões, a lista de semanas fechadas e a alternância.
- `app/dashboard-html.ts`: home do CS. Alternância "Semana atual" (mês corrente) ou "Semanas do mês" (mês fechado), com "Geral". A escolha vai para `?visao=`.
- `app/gestor-cs-html.ts` e `app/gestor/cs/[nome]/page.tsx`: página do CS na visão do gestor. Mesma alternância, padrão Semana atual. Em "Geral" volta o radar mensal.

### Regra do ritmo da semana

- `previsto = meta efetiva x dias úteis decorridos na semana / dias úteis da semana`, com hoje incluso.
- O status vem de `calcularRitmo`, sem fórmula nova.
- **Meta 1**: o previsto só passa de 1 no último dia útil da semana. Antes disso o status é "Começando", nunca "Atrás". Coberto por teste (`tests/metas-semanais-visao.test.ts`).
- **Meta 2**: "Atrás" a partir de 60% dos dias úteis com zero feito, porque o previsto chega a 1,2. Este é o caso que ainda pode gerar alarme no meio da semana. Decisão registrada aqui: se você preferir outro limiar, a mudança é uma linha em `calcularRitmo`.
- **Realizado ausente** não vira zero. O status fica nulo e o cartão mostra "Sem apuração".
- **Superávit** (P2) não reduz a semana seguinte. Coberto por teste.

### Estados vazios

- Sem meta mensal em nenhum indicador: a semana mostra "Nenhuma meta mensal para derivar a semana".
- Sem semana fechada no mês: "Nenhuma semana fechada neste mês. O saldo de cada semana é calculado no fechamento de segunda".
- Indicador sem meta mensal não aparece na semana.
- Item sem data (P8): aparece no detalhe do cartão como "fora desta conta".

### Números conferidos no banco (somente leitura, 10/11/2026)

Semana de 02/11 a 08/11, `metas_semanais_fechamento`:

| CS | Indicador | Base | Efetiva | Realizado | Déficit levado |
|---|---|---|---|---|---|
| George | cases | 3 | 3 | 0 | 3 |
| George | indicacoes | 1 | 1 | 1 | 0 |
| George | matchmakings | 8 | 8 | 12 | 0 (superávit, P2) |
| George | matchmakings_resultado | 4 | 4 | 1 | 3 |
| Vilker | cases | 2 | 2 | 0 | 2 |
| Vilker | indicacoes | 2 | 2 | 0 | 2 |
| Vilker | matchmakings | 6 | 6 | 1 | 5 |
| Vilker | matchmakings_resultado | 3 | 3 | 1 | 2 |

Outubro (mês fechado) para George e Vilker, nos indicadores com meta: os fechamentos de cinco semanas foram lidos e usados no fixture de "Semanas do mês". `matchmakings_resultado` não tem base mensal em outubro e não aparece nesse modo, como previsto.

### Capturas

Pasta `docs/registros/capturas_metas_semanais_visao/`. Os fixtures saem das funções reais (`linhasSemanaAtual`, `semanasFechadasDoMes`), a partir dos números acima. Gerados por `scripts/capturas/gerar_harness_home_cs.ts`. Dados de exemplo, não gravados.

- `home-george-semana-desktop.png` e `home-george-semana-celular.png`: home do George, Semana atual, semana de 09/11 a 15/11, quarta-feira 11/11.
- `home-vilker-semana-desktop.png` e `home-vilker-semana-celular.png`: Vilker, mesma semana, com o déficit herdado (base mais déficit = efetiva) nos cartões. O detalhe com base e déficit fica recolhido.
- `home-george-outubro-semanas-desktop.png` e `home-george-outubro-semanas-celular.png`: outubro como mês fechado, em "Semanas do mês".
- `gestor-george-semana-desktop.png` e `gestor-george-semana-celular.png`: página do CS na visão do gestor, Semana atual.
- `gestor-george-outubro-semanas-desktop.png`: página do CS na visão do gestor, outubro, em "Semanas do mês".

Ressalvas das capturas:
- O banner vermelho no topo da página do gestor é do harness: o fetch mockado devolve 404 para o cabeçalho. Não existe em produção.
- A base e o realizado ao vivo da semana de 09/11 são de exemplo. O déficit herdado vem do fechamento real de 02/11.
- A visão Geral não entra nas capturas: o `metaMensal` do fixture é de exemplo.

### Verificação

- `tsc --noEmit` limpo.
- `npm test`: 69 de 69 arquivos aprovados (inclui `tests/metas-semanais-visao.test.ts`, com 8 blocos de casos).
- `next build` compilado.
- JavaScript inline das páginas validado com `node --check`.

### Pendências desta PR

- Conferência visual com login real no preview do Vercel, com a semana de 09/11 a 15/11 e dados reais. Responsabilidade do Vitor.
- **Limites como consumo do mês (P4)**: não implementado. Nenhum dos seis indicadores de `INDICADORES_SEMANAIS` é limite, e não existe fonte de limite mensal nos dados de metas semanais. Precisa de decisão antes de implementar.
- **Duas grades de status**: a visão Geral do gestor ainda calcula o ritmo em JavaScript (`indRitmo_` em `app/gestor-cs-html.ts`), com outros rótulos ("No prazo", "Abaixo", "Longe"). A visão Semana atual usa `calcularRitmo` no servidor, com os rótulos "Começando", "Atenção", "Atrás", "No ritmo". Unificar exige mudar a grade atual: fica para decisão.
- A página do gestor tem estado de erro próprio na seção de metas semanais (`s.erro`), mas ainda não há teste automatizado para ele.

## PR 2b e PR 3

- PR 2b (home do gestor com alternância; Semana atual mostra progresso do time e acesso aos itens `ritmo_semanal`): pendente.
- PR 3 (fonte `ritmo_semanal` na fila de ação, limiar 0,70 configurável, retroativo de 02/11 a 08/11): pendente. Precisa estar pronta antes do fechamento de segunda, 16/11.
