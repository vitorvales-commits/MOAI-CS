# Auditoria de dados (somente SELECT)

Projeto Supabase `evwdfeumlnxeqnnakdvq`. Todas as consultas foram SELECT, executadas em 09/10/2026. Nenhuma escrita no banco.

Saúde do sync (`sync_log`, últimos 30 dias): os boards `cases`, `rounds`, `upsell_downsell`, `matchmakings`, `churn`, `nps_conselhos` e `conselhos` estão com `sucesso` nas execuções mais recentes (09/10/2026, 13:20 UTC). Os erros antigos (`rounds` e `agenda` em 28/09, `matchmakings` em 24/09) já foram corrigidos e não aparecem nas execuções recentes.

## A1. Cases, Rounds, Upsell e Downsell zerados em outubro

Consulta: contagem por `mes_grupo_titulo` (cases, rounds, matchmakings) e por `to_char(data, 'YYYY-MM')` (upsell).

| Indicador | Agosto | Setembro | Outubro | Observação |
|---|---|---|---|---|
| Cases de Sucesso | 47 (Agosto 2026) | 64 (Setembro 2026) | **0** | Nenhum grupo "Outubro 2026" em `cases_items`. Só existe "Outubro 2025" (45 linhas), que o filtro de 2026 não pega. |
| Rounds (status Realizado) | 8 (Agosto, sem ano) | 11 (Setembro, sem ano) | 2 (Outubro, sem ano; status não Realizado) | Filtro exige status "Realizado" e grupo exato. |
| Upsell / Downsell (status Finalizado) | 4 (2026-08) | 9 (2026-09) | **0** | Último `data` com Finalizado é 24/09/2026. |
| Matchmakings | 150 | 184 | 10 | Único indicador com linhas em outubro. |

Conclusão: o zero de outubro é **ausência de dado na origem**, não falha de mapeamento. O sync está em `sucesso`, o grupo de outubro não aparece nas tabelas de Cases e o upsell não tem linha datada em outubro. Não é possível confirmar diretamente no Monday daqui (não há leitura do board nesta fase). Achado secundário: `upsell_downsell_items` tem 23 linhas com `data` nula, que o cálculo ignora sem aviso. Não corrigido, porque a data falta na origem.

Achado de rótulo: `mes_grupo_titulo` mistura "Agosto 2025", "Agosto 2026" e "Agosto" (sem ano) em Cases e Rounds. O filtro aceita as duas formas, então não gera zero, mas o registro sem ano cai em qualquer ano pela regra `filtrarPorMesSeguro`.

## A2. Cumprimento do GTD de 0% a 44%

Fórmula atual (`lib/reports.ts:1318-1319`): `taxaGtdAgregada` sobre os ciclos com `cicloAberto` **em hoje** (hoje ≤ data do conselho + 14 dias), para o CS inteiro, sem olhar o mês escolhido.

Recalculado à mão com SQL, mesma regra:

| CS | Ciclos abertos | Etapas feitas / total | Pooled | Confere com o painel |
|---|---|---|---|---|
| Marcos | 5 | 1 / 45 | 2,2% | sim (o diagnóstico de 2% da sessão de 08/10 também) |
| Vitor | 6 | 2 / 54 | 3,7% | sim |
| Luana | 2 | 5 / 18 | 27,8% | sim |

Conclusão: a aritmética está correta. O problema é a **população**: o cálculo mistura conselhos futuros (sem etapa feita ainda, como o de 22/10 do Marcos) com conselhos já vencidos, e não respeita o mês do filtro. Isso explica a faixa de 0% a 44%. Corrigir na Fase 2 (C1): a taxa do mês deve usar os conselhos realizados no período escolhido.

## A3. Selo "sem dado" da Luana

Regra que gera o selo: `calcularScoreCS` (`lib/pontuacao.ts`) devolve `estado: 'sem_dados_suficientes'` quando há menos de `PONTUACAO_MIN_INDICADORES_COM_META` (3, em `lib/constants.ts:122`) indicadores com meta **e** realizado. A página mostra "Sem dado" quando o score é nulo (`classificarScore`, `app/gestor-html.ts:1239`).

Luana tem GTD (27,8%), ou seja, há realizado, mas não há meta cadastrada na maioria dos indicadores. O motivo real é "falta meta", não "falta dado". Corrigir na Fase 2 (C1): o estado passa a ser `sem_meta` quando há realizado e faltam metas, e `sem_dado` só quando não há nem meta nem realizado.

## A4. Histórico do NPS

Consulta: `nps_conselhos_items` tem 1.965 linhas e 1.965 `id` distintos. São 1.032 pares respondente + conselho, e **401 desses pares aparecem em mais de um mês** (`mes_grupo_titulo`). Cada linha é uma resposta, com `id` próprio, e o histórico por mês está preservado (Janeiro a Outubro de 2026).

Conclusão: o modelo é **uma linha por resposta, sem sobrescrita**. Não há necessidade da migration `nps_respostas` de C2. Ressalva: a tabela não guarda a data do conselho, só o mês do grupo. O "conselho realizado" precisa vir de `historico_conselhos_items` (data_conselho) ou de `agenda_conselhos_items` (data_iso).

## A5. Formulário de NPS, perguntas abertas

Colunas de texto aberto: `sugestao_texto` (sugestões sobre o conselho, 1.067 respostas), `avalia_cs_texto` (avaliação do CS, presente em 1.965 linhas, mas vazio nos meses de Janeiro a Abril e Agosto), `destaque_texto_bruto`, `continuidade_desafios`, `aspectos_local` (lista).

Conclusão: as perguntas são separadas por **assunto** (conselho ou CS), não por **polaridade** (o que gostou ou o que melhorar). A polaridade vem da nota de quem escreveu, conforme o fallback de N1.

## A6. Formulário de saída (churn)

Colunas de churn_detalhes: `explicacao` (221 de 222), `expectativa_nao_atendida` (220), `sugestao_melhoria` (220), `nota_retorno` (216). Há uma pergunta aberta sobre o que melhorar (`sugestao_melhoria`).

Conclusão: existe pergunta aberta sobre melhoria. Não existe pergunta exata do tipo "o que teria feito você ficar", mas `sugestao_melhoria` cobre a intenção de K4.

## A7. Board de visitas, taxa de preenchimento

`visitas_churn` está **vazia** (0 linhas, nenhuma data). O sync do board `visitas_churn` roda com `sucesso` e 0 itens em todas as execuções. Não é possível calcular a taxa.

Conclusão: a taxa é 0 de 0. Ou o board do Monday está vazio, ou o mapeamento do board (`BOARDS` na Edge Function) não lê os itens. Não verificado no Monday nesta fase. Na Fase 2, K6 mostra a mensagem "As visitas ainda não registram etapa de origem nem causa evitável", com este resultado.

## A8. Bases dos números de churn de setembro de 2026

Consultas em `churn_items` com `data_referencia` entre 01/09 e 30/09/2026:

| Número no topo | Valor | Origem |
|---|---|---|
| "10 churns" | 10 | base `carteira_atual`: CS ativos, sem Comunidade (`churn_base`, migration 20261005b) |
| Churns totais da rede | 22 | base `toda_a_rede` |
| Comunidade | 6 | excluída da carteira atual |
| "6 de 18" | não reproduzido no banco | `reconquista_ex_membros` está vazia |
| "85 reconquistas em aberto" | não reproduzido no banco | `reconquista_ex_membros` está vazia |
| "0 pedidos de churn" | 0 | `visitas_churn` vazia (sem `data_pedido`) |

Conclusão parcial: os 10 e os 22 usam o **mesmo intervalo temporal** (`data_referencia` do mês), mas populações diferentes, escolhidas pela base. Não é mistura de meses. Os números de reconquista e de pedidos não batem com as tabelas do banco. Não é possível dizer a origem de "6 de 18" e "85" sem o código da tela de reconquista, o que fica para a Fase 2 (C4).

Ressalva importante: 155 de 222 linhas de `churn_items` têm `data` nula. Para o mês de referência, o cálculo usa `data_referencia`, que existe, mas a coluna `data` vazia indica que a fonte está incompleta.

## A9. Calendário de conselhos

Tabela: `historico_conselhos_items` (colunas `cs_responsavel`, `membro`, `data_conselho`, `etapas`). Uma linha por membro e conselho.

Contagem por CS (todas as datas): George 13, Luana 3, Marcos 9, Mateus 6, Rodrigo 9, Vilker 10, Vitor 12. Em outubro: George 6, Luana 1, Marcos 4, Mateus 3, Rodrigo 4, Vilker 4, Vitor 5.

Conclusão: o calendário com CS e data está em `historico_conselhos_items`. `agenda_conselhos_items` tem datas e conselheiro, mas não tem CS. Usar a primeira na Fase 3.

## Resumo para as fases seguintes

- A1: zero real na origem. Nada a corrigir no cálculo além de tratar a data nula e o rótulo sem ano.
- A2: corrigir a população do GTD (C1).
- A3: corrigir a classificação "sem meta" (C1).
- A4: modelo por linha, sem migration de NPS. C2 não se aplica.
- A7: visitas vazias. Verificar o board no Monday antes de qualquer conclusão.
- A8: os 10 e os 22 são bases diferentes, não erro. Números de reconquista e pedidos não reproduzidos.
