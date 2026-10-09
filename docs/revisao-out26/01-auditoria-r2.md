# Auditoria R2 (somente leitura)

Feita em 09/10/2026, só com SELECT e cálculo local. Nada foi gravado.

## A. Fotografia de setembro de George e Marcos

Consulta em `cs_fechamento_mensal`:

| CS | Mês | Pontuação salva | Posição | Radar salvo |
|---|---|---|---|---|
| George | Agosto | 121 | 3 | churn 150, cases 143, matchmakings 150, rounds 50, upsell 0, indicações 150, GTD 32, carteira 100 |
| George | Setembro | 121 | 3 | churn 150, cases 150, matchmakings 110, rounds 150, upsell 0, indicações 0, GTD 32, carteira 100 |
| Marcos | Agosto | 120 | 4 | churn 100, cases 114, matchmakings 115, rounds 0, upsell 0, downsell 150, indicações 150, GTD 2, carteira 100 |
| Marcos | Setembro | 120 | 4 | churn 50, cases 111, matchmakings 138, rounds 150, upsell 0, downsell 150, indicações 100, GTD 2, carteira 100 |

O radar de setembro é diferente do de agosto nos dois casos. Então a fotografia de setembro não é uma cópia do radar de agosto.

Para verificar a pontuação, recalculei cada mês com `calcularScoreCS` (lib/pontuacao.ts) a partir dos valores e metas do próprio radar de cada mês:

- George, agosto: 121 (salvo 121).
- George, setembro: 121 (salvo 121).
- Marcos, agosto: 120 (salvo 120).
- Marcos, setembro: 120 (salvo 120).

Conclusão: setembro não reaproveitou agosto. Os dois meses têm insumos diferentes e cada pontuação salva bate com o próprio insumo. A igualdade de pontuação entre os meses é coincidência, e os dois valores estão corretos para cada mês.

Limite desta conclusão: usei os valores que a própria fotografia guardou, não as tabelas de origem (metas_subitens e boards). Recalcular a partir das fontes exigiria a rotina completa de `generateVisaoGestor`, que não é uma consulta. Se o gestor quiser essa prova completa, ela fica para a etapa de recálculo.

## B. Status em `agenda_conselhos_items`

| Status | Linhas | Primeira data | Última data |
|---|---|---|---|
| Executado | 263 | 14/01/2026 | 25/09/2026 |
| Confirmado | 39 | 30/06/2026 | 28/10/2026 |
| (nulo) | 35 | 30/04/2026 | 27/11/2026 |
| Cancelado | 7 | 13/03/2026 | 14/10/2026 |
| Em  confirmação (com espaço duplo) | 4 | 28/04/2026 | 15/10/2026 |
| Em conjunto | 4 | 15/10/2026 | 21/10/2026 |

Status que significam cancelado: apenas `Cancelado`. Os status `Confirmado`, `Em  confirmação` e `Em conjunto` são reuniões previstas; `Executado` é reunião passada. A linha com status nulo (35) não tem informação suficiente: tratada como prevista, porque o campo não diz o contrário. Registrado em `decisoes-r2.md`.
