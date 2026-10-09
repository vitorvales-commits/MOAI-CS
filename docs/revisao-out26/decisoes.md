# Decisões da execução (revisão do dash de CS, outubro de 2026)

1. **Zero de outubro em Cases e Upsell (A1)**: tratado como ausência de dado na origem, não como falha de mapeamento, porque o sync está em `sucesso` e não há grupo nem linha datada em outubro. Não alterado no cálculo.
2. **Base do GTD (A2, C1)**: a taxa passa a usar os conselhos realizados no período escolhido, não os ciclos abertos de hoje. Conselhos futuros saem do cálculo do mês.
3. **"Sem dado" versus "sem meta" (A3, C1)**: quando há realizado e faltam metas, o estado é `sem_meta`. `sem_dado` fica só para quando não há nem meta nem realizado.
4. **NPS sem migration (A4, C2)**: o modelo já guarda uma linha por resposta, sem sobrescrita. Não foi criada `nps_respostas`.
5. **Polaridade do NPS (A5, N1)**: as perguntas abertas são separadas por assunto, não por polaridade. A polaridade vem da nota (9 e 10 elogio, 0 a 6 crítica, 7 e 8 neutro).
6. **Calendário de conselhos (A9)**: usado `historico_conselhos_items` (tem CS e data), porque `agenda_conselhos_items` não tem CS.
7. **Visitas vazias (A7)**: a taxa de preenchimento não foi calculada (0 de 0). Mensagem de K6 usada no lugar do percentual. Verificar o board no Monday antes de concluir que está vazio.
8. **Números de reconquista e pedidos de churn (A8)**: "6 de 18" e "85" não aparecem nas tabelas do banco. Não foi possível localizar a origem sem o código da tela de reconquista. Pendência para a Fase 2.
