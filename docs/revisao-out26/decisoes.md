# Decisões da execução (revisão do dash de CS, outubro de 2026)

1. **Zero de outubro em Cases e Upsell (A1)**: tratado como ausência de dado na origem, não como falha de mapeamento, porque o sync está em `sucesso` e não há grupo nem linha datada em outubro. Não alterado no cálculo.
2. **Base do GTD (A2, C1)**: a taxa passa a usar os conselhos realizados no período escolhido, não os ciclos abertos de hoje. Conselhos futuros saem do cálculo do mês.
3. **"Sem dado" versus "sem meta" (A3, C1)**: quando há realizado e faltam metas, o estado é `sem_meta`. `sem_dado` fica só para quando não há nem meta nem realizado.
4. **NPS sem migration (A4, C2)**: o modelo já guarda uma linha por resposta, sem sobrescrita. Não foi criada `nps_respostas`.
5. **Polaridade do NPS (A5, N1)**: as perguntas abertas são separadas por assunto, não por polaridade. A polaridade vem da nota (9 e 10 elogio, 0 a 6 crítica, 7 e 8 neutro).
6. **Calendário de conselhos (A9)**: usado `historico_conselhos_items` (tem CS e data), porque `agenda_conselhos_items` não tem CS.
7. **Visitas vazias (A7)**: a taxa de preenchimento não foi calculada (0 de 0). Mensagem de K6 usada no lugar do percentual. Verificar o board no Monday antes de concluir que está vazio.
8. **Números de reconquista e pedidos de churn (A8)**: "6 de 18" e "85" não aparecem nas tabelas do banco. Não foi possível localizar a origem sem o código da tela de reconquista. Pendência para a Fase 2.

## Fase 2 e lógica das fases 3 a 5

9. **Feriados (V3)**: lista nacional de 2026 em `lib/feriados.ts`. Carnaval e Corpo de Deus ficam de fora (ponto facultativo). Sexta-feira Santa entra.
10. **Downsell no ritmo (V3)**: o texto manda usar dias úteis para Downsell, mas o mesmo texto diz que Downsell fica contra a meta cheia. Segui a regra de previsto (dias úteis). Confirmar com o gestor.
11. **Ritmo (V3)**: limiares de 70% (atenção) e 25% (projeção) conforme o texto. Só a função pura está pronta. O layout da tabela ainda não foi feito.
12. **Polaridade (N1)**: 9 e 10 elogio; 7 e 8 crítica com rótulo neutro; 0 a 6 crítica. Implementada em `lib/voz-membro/polaridade.ts`.
13. **Tecnologia e formulários (N2)**: tema novo, com internet, wifi, rede, cadastro, formulário, site, CPF, app e link. Saíram de "Local e estrutura".
14. **Telas não feitas**: V1, V2, V4, N3, N4, K1 a K6 e as capturas de tela da Fase 6 continuam pendentes.

## Telas (fases 3 a 5) e validação

15. **Ritmo (V3)**: calculado no servidor (`montarRitmoDoMes` em `lib/reports.ts`) e só no mês atual. A tela só desenha.
16. **Ação padrão do ritmo**: textos em `config/acoes-por-indicador.ts`, enviados no payload para o navegador.
17. **Matriz de GTD (V4)**: colunas são as etapas que têm pendência no período, na ordem do prazo (D-1 antes de D+2 etc.). Etapas sem pendência não aparecem.
18. **NPS (N3)**: polaridade por nota do próprio campo (`nota_conselho` para o conselho e `nota_cs_hoje` para o CS). O texto de cada trecho recebe o mês da resposta, porque a tabela não guarda a data exata.
19. **Cobertura do NPS (C3)**: a tabela de NPS não tem a data do conselho. O universo usado é `conselhos_grupos` (conselhos ativos). Limitação registrada, não resolvida.
20. **Situação do mês (K1)**: o MRR perdido no mês foi omitido, porque `churn_items` não tem coluna de MRR. O número de pedidos de churn em aberto mantém o MRR em risco de `visitas_churn`.
21. **Motivos (K3 e K4)**: as ações de `config/acoes-por-motivo.ts` só valem para `falta_de_tempo` e `financeiro`. Os demais motivos do banco (questões internas, ausência de Brasília, insatisfação, questões pessoais, preferiu não informar e sem resposta) não têm correspondência clara com a lista da especificação e recebem "Definir ação com o time".
22. **Reconquista (K5)**: o funil é aproximado pelos contadores de `reconquista_ex_membros`: disseram que voltariam (total), contatados (total menos a contatar), em negociação (abertos menos a contatar) e voltaram.
23. **O que fazer agora (K2)**: a tabela junta visitas e reconquista, com no máximo dez linhas e a opção de ver todas. Ex membros sem contato viram uma linha por CS.
24. **Acoes de insights**: a rota `/api/gestor/visao-geral/acoes` ainda devolve insights, mas a tela não os usa mais (V2). Removê-los do servidor fica para um próximo passo.
25. **Lint**: o repo não tem configuração de ESLint, então não há o que rodar. O `next build` passou.
26. **Capturas de tela (Fase 6)**: não foram feitas. As páginas exigem sessão de gestor autenticada e não há como abri-las com dados reais daqui. Pendente para validação manual em preview.
27. **Merge**: não feito. A validação visual está pendente, e um merge em `main` publica em produção pela Vercel. O branch padrão é `main` (não existe `master`).
