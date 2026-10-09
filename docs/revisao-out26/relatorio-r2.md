# Relatório R2: revisão do dash de CS (outubro de 2026)

Branch `revisao-dash-cs-out26-r2`, a partir da `main` com a rodada 1 mergeada. Este relatório é a descrição do PR. Decisões completas em `decisoes-r2.md`.

## O que mudou, por fase

**Fase 0 e auditoria (`00-mapa-r2.md`, `01-auditoria-r2.md`).**
- Auditoria A: a fotografia de setembro não reaproveitou agosto (radares diferentes; pontuação bate com os próprios insumos).
- Auditoria B: só `Cancelado` significa cancelado na agenda.

**Fase 1, Ritmo do mês em cartões.** Resumo "X de Y indicadores do time no ritmo hoje" com barra de distribuição. Cartão por CS com anel, até três indicadores atrasados (realizado, esperado até hoje e meta), "Tudo no ritmo" quando não há atraso, e clique que leva ao controle de perfis. Nenhuma tabela.

**Fase 2, Tarefas de GTD em dois gráficos.** "Fila por CS" (atrasadas, a vencer, em dia) e "Onde o processo trava" (por etapa). Clique num segmento abre painel lateral com as tarefas por conselho. Matriz removida.

**Fase 3, diagrama de rosa.** Substitui o radar da página do CS. Raio pela raiz da proporção, anel de 100% da meta, cor pelo estado calculado, sem meta em contorno tracejado. Cartões de indicador inalterados.

**Fase 4, períodos de CS (parcial).** `normalizarMes` testado (aceita "Metas Maio", "Ale - Maio", "JUNHO"). Regra "tem meta no mês é CS". Migration `supabase/migrations/20261009_cs_periodos.sql` e seed `supabase/seed/cs_periodos.sql` gerados pela regra; **nenhum dos dois foi aplicado**. Não feito: reclassificar `cs_fechamento_mensal` (C3) e a marcação "entrou em junho" e "3º de 7" na Evolução (C4).

**Fase 5, próximas reuniões.** Intenção nova na consulta rápida (`lib/consulta/proximas-reunioes.ts`), por regra, sem IA. Formato exato da especificação, testes cobrindo hora, dia da semana, conselheiro, membro, CS, ausência de entidade e cancelada. Atalho "Próximo conselho do André Soares" adicionado.

**Fase 6, NPS.** Seletor "Mês" (padrão) e "Últimos 3 meses". Anel de cobertura no cabeçalho (conselhos realizados já avaliados, previstos no mês), com painel lateral dos que ainda vão acontecer, sem nota. "Onde a nota cai" virou gráfico de pontos (uma faixa por dimensão, eixo de 6 a 10, vermelho abaixo de 9, três mais baixos rotulados) com painel lateral por conselho.

**Fase 7, sugestões em gráfico.** Seletor "Sobre o conselho" e "Sobre o CS". Conselho: barras por tema com traço do mês anterior e anel de "sem sugestão". CS: barras divergentes, crítica à esquerda e elogio à direita, polaridade pelo campo `nota_cs_hoje`. Respostas sem sugestão descartadas (testado). Tema de tecnologia ganhou "sinal", "celular" e "wi-fi".

**Fase 8, validação.**
- `tsc --noEmit`: sem erros.
- `npm test`: 24 de 24 arquivos aprovados.
- `next build`: passou.
- Scripts das duas páginas (gestor e CS): sintaxe conferida.
- Busca por travessão nos textos novos: nenhuma ocorrência.
- Lint: sem configuração no repo.
- **Capturas de tela em 1280 e 390 px: NÃO feitas.** As páginas exigem sessão de gestor autenticada. Validação visual manual em preview continua necessária.

## Auditorias

- **A**: George (121 e 121) e Marcos (120 e 120) não reaproveitam agosto. Radares diferentes, pontuação bate com os insumos de cada mês.
- **B**: `Executado`, `Confirmado`, `Em  confirmação`, `Em conjunto`, nulo e `Cancelado`. Só `Cancelado` sai das reuniões.

## Pessoas incluídas e excluídas do histórico de CS

Incluídas pela regra (tem meta no mês): George, Marcos, Vilker e Vitor (desde maio), Mateus e Rodrigo (desde junho), Luana (desde setembro), Alejandro e Lucas (não estão em `cs_config`, revisar).

Excluídas (aparecem nos boards, sem meta): Luma Guadanhim, Yasmim Cardoso Marques, Lanna Rosa, Gustavo Lucas, Juliana Aguiar, Natasha Caldas do Prado, Lorena Menezes Batista Pitt, Malu Sarnícola, Juliane Scheidt de Cristo, Tainara Lopes da Silva Costa, Barbara, giovannamonteiro, vinicius.souza, Contato MOAI, Membro excluído.

## Migrations, seed e Edge Function

- Migration `20261009_cs_periodos.sql`: criada, **não aplicada**.
- Seed `cs_periodos.sql`: gerado, **não aplicado**.
- Edge Function: nenhuma alteração.

## Passos manuais, na ordem

1. Revisar `decisoes-r2.md` (itens 3 e 4) com o gestor.
2. Aplicar a migration `20261009_cs_periodos.sql` no Supabase.
3. Aplicar o seed `supabase/seed/cs_periodos.sql`.
4. Revisar em `cs_periodos` as linhas com `confirmado = false` (Alejandro, Lucas) e a entrada da Luana.
5. Fazer o deploy.
6. Clicar em "Recalcular a fotografia" para maio a setembro. Isso ainda exige a implementação da Fase 4 (C3); sem ela, o recálculo continua usando `cs_config`.

## Bloqueios e pendências

- Capturas de tela e validação visual (Fase 8).
- Fase 4, C3 e C4: reclassificação da fotografia e marcação de entrada na Evolução.
- Limites da cobertura do NPS: o universo de conselhos realizados vem da agenda, e o vínculo com a resposta é pelo nome do conselheiro no título do grupo.

## Atualização: C3 e C4

- **C3**: a visão geral e a fotografia usam quem era CS em cada mês, a partir de `cs_periodos`. Mês atual ou futuro soma os CS ativos de `cs_config`. Ex CS é calculado com os dados da própria `cs_periodos`. Enquanto a migration não for aplicada, o código usa a lista antiga, então nada quebra.
- **C4**: a Evolução mostra "Entrou em <mês>" quando o CS entrou depois do início da janela, e a posição aparece como "N.º de M".
- Os itens de "Não feitos" acima sobre C3 e C4 deixam de valer. O que continua pendente: aplicar a migration e o seed, e as capturas de tela da Fase 8.
