# Mapa do código (rodada 2)

Levantado em 09/10/2026, branch `revisao-dash-cs-out26-r2`, a partir da `main` com a rodada 1 mergeada.

| Bloco | Componente (HTML / JS) | Dados | Tabela de origem |
|---|---|---|---|
| Ritmo do mês | `app/gestor-html.ts` (`renderRitmo`, seção `#blocoRitmo`) | `generateVisaoGestor` → `montarRitmoDoMes` em `lib/reports.ts`; regra em `lib/ritmo.ts` | `metas_subitens`, `historico_conselhos_items`, boards |
| Tarefas de GTD | `app/gestor-html.ts` (`renderUrgencias_`, `gtdMatrizHtml_`), rota `/api/gestor/visao-geral/acoes` | `etapasPendentes` em `lib/gtd-prazos.ts`, `taxaGtdAgregada` em `lib/gtd.ts` | `historico_conselhos_items` (`etapas` em JSON) |
| Report semanal | `app/gestor-html.ts` (`renderUrgencias_`, faixa "Report semanal") | `lib/reports.ts` (`carregarAcoes`), `lib/report-semana.ts` | `reports_individuais` |
| Controle de perfis (radar) | aba `#tab-controlePerfis` em `app/gestor-html.ts`; radar por CS em `app/gestor-cs-html.ts` | `lib/radar-svg.ts`, `radarEquipe` de `generateVisaoGestor` | `metas_subitens`, `reports_individuais` |
| Evolução | `app/gestor-cs-html.ts` (`<h2>Evolução`, linha 249); `app/gestor-html.ts` (ranking) | `lib/evolucao.ts`, `lib/evolucao-dados.ts` | `cs_fechamento_mensal` |
| Consulta rápida | `app/gestor-html.ts` (bloco `.consulta-titulo`, linha 740); rota `app/api/consulta/route.ts` | `lib/consulta.ts` (`processarPergunta`, intenções) | `metas_subitens`, `cs_config`, `agenda_conselhos_items` (a criar) |
| Como os membros avaliam | `app/gestor-html.ts` (`renderNps`, linha 1173); `temasColunaHtml_` | `lib/voz-membro-dados.ts`, rota `/api/gestor/nps-conselhos` | `nps_conselhos_items` |
| Onde a nota cai | `app/gestor-html.ts` (linha 1176, `<h3>Onde a nota cai</h3>`) | `carregarNps_` / `churnRenderNotas_` | `nps_conselhos_items` |
| O que os membros sugerem | `app/gestor-html.ts` (`npsRenderSugestoes_`, `npsMostrarTrechos_`) | `lib/voz-membro-dados.ts` (`colunasPolares`) | `nps_conselhos_items` |

## Pontos de atenção

- `cs_fechamento_mensal` é escrito por `lib/evolucao.ts` (`linhaFechamento`) a partir de `generateVisaoGestor`. Por isso a fotografia de um mês reflete a lista de CS de `getCSListCompleto`, que vem de `cs_config`.
- `nps_conselhos_items` não tem data de resposta; o mês vem de `mes_grupo_titulo`.
- `agenda_conselhos_items` tem `conselheiro_nome`, `data_iso` e `status`, e não tem CS. A ligação com CS e membro passa por `conselhos_membros`.
