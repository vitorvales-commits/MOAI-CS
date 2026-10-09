# Relatório: revisão do dash de CS (outubro de 2026)

Branch `revisao-dash-cs-out26`. Este relatório é a descrição do PR. As decisões completas estão em `decisoes.md`.

## O que mudou, por fase

**Fase 0, mapa do código.** `00-mapa.md` com o arquivo, a função e a tabela de cada bloco pedido.

**Fase 1, auditoria somente leitura.** `01-auditoria.md` com as consultas e as conclusões de A1 a A9. Nenhuma escrita no banco.

**Fase 2, correções de dado.**
- GTD do CS (C1): a taxa do mês usa os conselhos realizados no período escolhido. Antes usava os ciclos abertos de hoje, o que misturava conselhos futuros.
- "Sem meta" (C1): quando há realizado e faltam metas, o card mostra "Sem meta". "Sem dados suficientes" fica só para quem não tem nem meta nem realizado.
- NPS (C2): não aplicado. A auditoria mostrou que a tabela já guarda uma linha por resposta, sem sobrescrita.
- NPS (C3): cobertura em uma linha ("X de Y conselhos do mês já avaliados"). Limitação: a tabela de NPS não tem a data do conselho, então o universo são os conselhos ativos.
- Churn (C4): não alterado. "6 de 18" e "85" não aparecem nas tabelas do banco; a origem precisa ser localizada no código da tela de reconquista.

**Fase 3, visão geral.**
- V1: tabela comparativa removida (com o script e os botões que só ela usava).
- V2: Insights e Sinalizadores de risco removidos.
- V3: bloco "Ritmo do mês". `calcularRitmo` em `lib/ritmo.ts` (testado), cálculo no servidor, tela com barra por indicador, traço do previsto, painel com a conta e a ação padrão.
- V4: tarefas de GTD viraram matriz CS por etapa, com atrasadas em vermelho e a vencer em até 7 dias em âmbar. Clique abre a lista por conselho.

**Fase 4, voz do membro (NPS).**
- N1: polaridade pela nota (`lib/voz-membro/polaridade.ts`, testado).
- N2: tema "Tecnologia e formulários" (testado com os trechos da especificação).
- N3: duas colunas por seção (elogio e crítica), variação por extenso contra o mês anterior, cor só pelo sentido, trechos com nota e mês.
- N4: o bloco respeita o período escolhido e mostra a cobertura e as respostas sem texto.

**Fase 5, churn.**
- K1: situação do mês com três números: churns no mês (contra o mês anterior e a média dos seis meses), pedidos de churn em aberto com o MRR em risco, e o recorde como linha discreta. O MRR perdido foi omitido (sem coluna no banco).
- K2: "O que fazer agora" em tabela de no máximo dez linhas, com opção de ver todas.
- K3: "Por que estão saindo" em barras horizontais, com a marca do mês anterior.
- K4: bloco novo "O que os churns pedem para melhorar", com trechos anonimizados, ação por motivo e botão "Criar melhoria" que abre o formulário preenchido.
- K5: "6 das 18 respostas..." na reconquista, com funil acumulado.
- K6: quadro de melhorias vazio recolhido em uma linha; "0 de 0" trocado pela frase da especificação.
- "Emitir relatório" passou para a linha da barra de filtros.

**Fase 6, validação.**
- `tsc --noEmit`: sem erros.
- `npm test`: 20 de 20 arquivos aprovados (inclui os testes novos: `ritmo`, `voz-membro-polaridade`, `churn-pedidos`).
- `next build`: passou.
- Lint: o repo não tem ESLint configurado.
- Busca por travessão, meia-risca e " - " em textos visíveis: nenhuma ocorrência nos textos novos.
- Capturas de tela em 1280 e 390 px: **não feitas** (ver bloqueios).

## Evidências da auditoria que sustentam as decisões

- Cases e Upsell zerados em outubro: não há grupo "Outubro 2026" em `cases_items` e nenhuma linha de upsell datada em outubro. O sync está em `sucesso` desde 09/10/2026.
- GTD recalculado à mão: Marcos 2,2%, Vitor 3,7%, Luana 27,8%. A conta confere; o que muda é a população.
- NPS: 1.965 respostas com `id` único; 401 pares respondente + conselho aparecem em mais de um mês. Modelo por linha, sem sobrescrita.
- Visitas: `visitas_churn` está vazia e o sync reporta 0 itens. Precisa de conferência no Monday.
- Churn de setembro: 10 na base carteira atual e 22 na base toda a rede, no mesmo intervalo.

## Migrations e Edge Function

- Migrations: nenhuma criada nem aplicada.
- Edge Function `sync-monday`: nenhuma alteração.
- Nenhum arquivo do Next.js chama o Monday.

## Bloqueios e pendências

1. **Capturas de tela (Fase 6)**: as páginas exigem sessão de gestor e não podem ser abertas daqui com dados reais. Precisa de validação manual em preview, nas três telas, em 1280 e 390 px.
2. **Board de visitas no Monday**: `visitas_churn` está vazia. Conferir se o board tem itens e se o mapeamento da Edge Function lê esse board (A7).
3. **Origem de "6 de 18" e "85"** (C4): não encontrados no banco.
4. **Merge em `main`**: não feito. Um merge publica em produção pela Vercel e a validação visual ainda não foi feita. O branch padrão do repo é `main`, não `master`.
5. **Pergunta sobre o Downsell** (decisão 10): o texto manda usar dias úteis para o Downsell, mas diz que ele fica contra a meta cheia. Segui a regra do previsto. Confirmar.

## Como revisar

- Começar por `decisoes.md`, que lista cada escolha e a justificativa.
- Conferir os números da auditoria em `01-auditoria.md`.
- Rodar `npm test` e `npx next build`.
- Abrir o preview da Vercel e conferir a visão geral, o NPS e o churn em 1280 e 390 px.
