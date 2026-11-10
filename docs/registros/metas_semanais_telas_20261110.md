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
- **Atrasado só quando o que falta é maior que os dias úteis restantes da semana** (decisão do Vitor, 10/11/2026). Falta = meta efetiva menos realizado. Com ritmo abaixo do previsto e falta que ainda cabe nos dias restantes, o status é "Atenção" (âmbar), não "Atrás". A regra vale só para a semana (`calcularRitmo` com `uteis`); o cálculo pelo mês não mudou.
- **Meta 2 com zero feito**: "Atenção" enquanto restarem dois dias úteis ou mais (quarta, em semana de cinco dias); "Atrás" a partir de quinta. Teste em `tests/metas-semanais-visao.test.ts`, caso 4.
- **Meta 1**: "Começando" até o último dia útil; "Atrás" só na sexta, se ainda estiver com zero. Teste caso 2 e 3.
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
- **Limites como consumo do mês (P4): fora da Semana atual, decisão do Vitor (10/11/2026).** Não implementado nesta PR nem na PR 2b. Motivo: nenhum dos seis indicadores de `INDICADORES_SEMANAIS` é limite, e não há fonte de limite mensal nos dados de metas semanais. Se o Vitor quiser o consumo do limite, é um item novo, com fonte definida.
- **Unificar a grade de status do Geral do gestor com `calcularRitmo`: entra na PR 2b** (decisão do Vitor, 10/11/2026). A grade atual calcula o ritmo em JavaScript (`indRitmo_` em `app/gestor-cs-html.ts`) com rótulos "No prazo", "Abaixo", "Longe". A Semana atual usa `calcularRitmo` no servidor, com "Começando", "Atenção", "Atrás", "No ritmo". Até a PR 2b, as duas visões podem divergir no rótulo do mesmo indicador.
- A página do gestor tem estado de erro próprio na seção de metas semanais (`s.erro`), mas ainda não há teste automatizado para ele.

## PR 2b e PR 3

- PR 2b (home do gestor com alternância; Semana atual mostra progresso do time e acesso aos itens `ritmo_semanal`): pendente.
- PR 3 (fonte `ritmo_semanal` na fila de ação, limiar 0,70 configurável, retroativo de 02/11 a 08/11): pendente. Precisa estar pronta antes do fechamento de segunda, 16/11.
