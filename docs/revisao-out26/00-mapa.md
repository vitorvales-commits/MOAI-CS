# Mapa do código: blocos da revisão de outubro de 2026

Base: `app/gestor-html.ts` (HTML e script da página do gestor, template string) e as rotas em `app/api/gestor/`. Linhas conferidas em 09/10/2026.

| Bloco (texto de busca) | Componente (HTML / JS) | Função ou query que gera os dados | Tabela de origem |
|---|---|---|---|
| Tabela comparativa | `app/gestor-html.ts:746` (HTML) | `visao-geral` (`lib/reports.ts`, `montarVisaoGestor`) | `reports_resumo_cs` e derivadas de `metas_subitens` |
| Sinalizadores de risco | `app/gestor-html.ts:761` (HTML) | alertas calculados em `lib/reports.ts` e `lib/insights.ts` | `metas_subitens`, `reports_individuais` |
| Urgências (report semanal e GTD) | `app/gestor-html.ts:709` (HTML), `renderUrgencias_` em `:1290` | `app/api/gestor/visao-geral/acoes/route.ts` → `lib/reports.ts:3378` e `lib/report-semana.ts`, `lib/gtd-prazos.ts` | `reports_individuais`, `historico_conselhos_items` |
| Tarefas de GTD (dentro de Urgências) | `app/gestor-html.ts:1317` | `lib/gtd.ts` (`gtdDoConselho`, `taxaGtdAgregada`), `cicloAberto` em `lib/gtd-prazos.ts:47` | `historico_conselhos_items` (`etapas` em JSON) |
| Insights | `app/gestor-html.ts:714`, `renderInsights_` em `:1346` | `lib/insights.ts` (`insightsGestor`), chamado de `lib/reports.ts:3490` | derivado do acima |
| Situação do mês (churn) | `app/gestor-html.ts:1012` | `app/api/gestor/churn/route.ts` → `lib/churn.ts` (`buscarTela`) → RPC `churn_tela` | `churn_items`, `churn_detalhes`, `visitas_churn`, `reconquista_ex_membros` |
| Emitir relatório | `app/gestor-html.ts:987` (link `churnBtnRelatorio`) | `lib/churn-relatorio-html.ts` | mesmas do churn |
| O que fazer agora | `app/gestor-html.ts:1017` | `lib/reconquista.ts` (pendências de contato) | `reconquista_ex_membros`, `churn_items` |
| Por que estão saindo | `app/gestor-html.ts:1022` | RPC `churn_tela` (motivos) | `churn_items.motivo_principal` |
| O que fazer para melhorar (kanban) | `app/gestor-html.ts:1059` | `app/api/gestor/voz` e `membro_melhorias` | `membro_melhorias`, `visitas_churn` |
| O que os membros sugerem (NPS) | `app/gestor-html.ts:1121`, `temasColunaHtml_` em `:3547` | `lib/reports.ts` (`periodoNpsMatch`, `montarVozMembro`) e `lib/voz-membro.ts` | `nps_conselhos_items`, `nps_conselho_aliases` |
| Sobre o conselho / Sobre o CS | `app/gestor-html.ts:3547` | `lib/voz-membro.ts`, `lib/voz-membro-dados.ts` | `nps_conselhos_items` |
| Sinal de cumprimento do GTD (indicador) | `app/gestor-cs-html.ts` (página do CS) | `lib/reports.ts:1319` (`cumprimentoGtdMedia`) | `historico_conselhos_items` |

## Pontos de atenção do mapa

- A página do gestor é um template string único. Os blocos de churn e de NPS ficam no mesmo arquivo, então as fases 3 a 5 mexem nele.
- O churn chega por RPC (`churn_tela`, `churn_base`), definidas em `supabase/migrations/20261005b_churn_simplificacao.sql`.
- "Sem dado" do score vem de `calcularScoreCS` em `lib/pontuacao.ts` (estado `sem_dados_suficientes`), não de um teste de realizado.
- O sync roda na Edge Function `supabase/functions/sync-monday/index.ts` (única peça que fala com o Monday). Nenhum arquivo do Next.js chama o Monday.
