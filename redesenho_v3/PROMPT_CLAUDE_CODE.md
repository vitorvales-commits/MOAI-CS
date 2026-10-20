# Prompt para o Claude Code: aplicar o redesenho v3 no dash de CS

Execute direto, sem preâmbulo. Repositório: C:\Users\vitor\Downloads\moai-cs-repo (Next.js 14, App Router). Esta pasta `redesenho_v3/` foi copiada para a raiz do repositório e contém a referência visual aprovada pelo Vitor: `home.html` (home do CS, rota `/`), `gestor.html` (Visão da área, rota `/gestor`), `cs.html` (Página do CS, rota `/gestor/cs/[nome]`), `capturas/` e `fonte/` (base.css, icons.svg, spark.js com o comportamento do dock, dock.py e build3.py). Os números das previews são ilustrativos. No app, todo número vem dos dados reais.

## 1. Missão

Levar a linguagem visual v3 para o app real. A v3 tem um dock de vidro flutuante no topo, com grupos em ícones que abrem menus ao passar o cursor, painéis sólidos e cor só na exceção. Ela reorganiza três telas (home do CS, Visão da área e Página do CS) em três níveis de leitura: relance, diagnóstico e detalhe. A tarefa é de interface e de organização da informação. Cálculos, regras de negócio, rotas de API, permissões e sincronização não mudam, salvo onde este prompt disser explicitamente.

## 2. Regras obrigatórias

Valem convencoes, armadilhas e os prompts anteriores do projeto. Inspecione antes de alterar e diagnostique pela causa raiz com evidência. Quando vários problemas se acumularem num arquivo, reescreva o arquivo completo. Português formal, sem travessão e sem hífen em texto visível; hífen só em classes CSS, atributos HTML e identificadores.

Fidelidade de dados: nunca invente número, nome ou texto de exemplo. Se um bloco da preview depende de um dado que o app não tem, renderize o estado vazio orientador (por exemplo "Sem dados suficientes" ou "Sem meta") e registre a lacuna no PR. Não crie tabela, coluna nem rota nova sem me perguntar.

Uma fonte por cálculo: pontuação, ranking, Health da base, GTD agregado, críticos e advertências continuam vindo das funções que já existem (calcularScoreCS, detalharScoreCS, rankingCSAtivos, gtdAgregadoCS, criticosPorProdutoCS e equivalentes reais). É proibido recalcular em componente.

Permissões intactas: CS comum nunca vê ranking nominal completo nem dados de outros CS. Na home do CS, mostre a posição relativa à mediana ("acima da mediana"), nunca a lista de colegas. O item Gestor do dock só aparece para quem `is_gestor()` aprova no servidor.

Segurança: nada de service role no cliente. Toda chamada continua passando por `requireMoaiUser()`.

## 3. Etapa 0: diagnóstico (relatório curto antes de codar)

Leia `app/dashboard-html.ts`, `app/gestor-html.ts`, `app/gestor-cs-html.ts`, `app/conselho-html.ts`, `app/login/page.tsx`, `app/layout.tsx`, `lib/gtd-checklist.ts`, `lib/radar-svg.ts`, `lib/constants.ts` e as rotas em `app/api/**`. Para cada bloco das três previews, monte uma tabela com quatro colunas: bloco da preview, rota ou função que já fornece o dado, campo exato e estado da lacuna. Os blocos são:

1. Home: faixa do mês, Tarefas do GTD, Próximos 7 dias, Metas do mês com ritmo e Minha carteira.
2. Visão da área: 4 KPIs com tendência, Mapa do time, Fila de ação e Rede de conselhos.
3. Página do CS: ficha, Onde estão os pontos, Pauta do 1:1, GTD que pede atenção, Evolução e as abas.

Liste também as abas atuais de `/gestor` e a forma como cada uma é ativada hoje. Entregue esse relatório no início da sessão e siga sem esperar, exceto se encontrar algo que exija decisão minha.

## 4. Etapa 1: tema compartilhado (reutilizável)

Crie `lib/ui/tema.ts` exportando:

1. `TEMA_CSS`: string com o conteúdo de `redesenho_v3/fonte/base.css`, sem alterar os tokens.
2. `ICONES_SVG`: o sprite de `fonte/icons.svg`.
3. `DOCK_SCRIPT`: o comportamento do dock de `fonte/spark.js` (abrir por hover, foco e toque, fechar com Esc ou clique fora, Ctrl K foca a busca) e a função de sparkline.
4. `montarDock(perfil, ativo, badges)`: uma função que gera o HTML do dock.

O `montarDock` traduz para TypeScript a lógica de `fonte/dock.py`, com estes grupos:

1. Perfil gestor: Gestão (Visão da área, Time, Conselhos, Metas e destaques), Saúde da base (Churn e reconquista, NPS e Pulso de CS, Fila da liderança) e Sistema (Controle de perfis, Ver como CS).
2. Perfil CS: Meu trabalho (Início, Agenda, Meus conselhos), Desempenho (Meus indicadores, Pontos tomados), Report e, só para quem também é gestor, Gestor.

Todas as páginas passam a importar desse módulo. Remova as definições duplicadas de `:root` e as cores soltas em hexadecimal que o tema substitui (vermelho #C0392B e cinza #807E7E viram tokens). Mantenha o link do Google Fonts para Inter e Bricolage Grotesque, já liberado no CSP. Respeite `prefers-reduced-motion` e `prefers-reduced-transparency` como na fonte.

## 5. Etapa 2: navegação no dock

Hoje as seções do gestor são abas internas de `/gestor`. Não quebre isso: cada item do dock que corresponde a uma aba aponta para `/gestor?aba=<chave>`, e o script da página abre a aba pela query. A navegação interna troca a aba e atualiza a URL com `history.replaceState`, para que voltar, recarregar e compartilhar o link funcionem. O mapeamento fica assim:

1. Visão da área vai para a aba visão geral.
2. Metas e destaques, Churn e reconquista, NPS e Pulso de CS, Fila da liderança e Controle de perfis vão para as abas atuais correspondentes. Se Churn e NPS forem abas separadas hoje, mantenha as duas como itens separados do menu.
3. Time vai para a página do primeiro CS do ranking, `/gestor/cs/[nome]`, que ganha os botões anterior e próximo.
4. Conselhos vai para a âncora da Rede de conselhos.

O grupo da página atual fica ativo e mostra o nome dela. O badge vermelho de Visão da área é o número de urgências da semana, vindo de `/api/gestor/visao-geral/acoes` ou da fonte real que o diagnóstico apontar. O badge dourado de Report aparece quando o report semanal do CS estiver pendente. O indicador de sincronização mostra o horário real do último sync. Remova a barra superior antiga, o seletor de abas antigo e o botão Voltar, que o dock substitui.

## 6. Etapa 3: Visão da área (`app/gestor-html.ts`)

Reproduza `gestor.html` com dados reais.

KPIs: score médio da área, CS em risco, membros críticos e divergência real contra autodeclarado. Cada um traz a comparação com o mês anterior e uma sparkline de 6 meses. Se não houver série histórica para algum KPI, omita só a sparkline dele.

Mapa do time: uma linha por CS ativo, com as colunas pontuação com marcador da mediana, ritmo, GTD, críticos, advertência e report da semana. Os limiares de cor saem de `lib/constants.ts`. Se algum limiar não existir lá, crie a constante comentada em português, sem número mágico no template. A ordenação pode ser por prioridade (exceções primeiro) ou por ranking. CS sem dados suficientes vai para o fim, fora do ranking. Clicar na linha abre `/gestor/cs/[nome]`.

Fila de ação: usa as urgências que já existem, com os filtros Esta semana, Críticas e Comigo. "Comigo" só aparece se o dado de responsável existir.

Blocos que a v3 absorve: Ranking ponderado, CS da área com foto, Health da Base por CS, Ritmo do mês e Report da semana deixam de ser blocos próprios, porque o Mapa do time e a Fila de ação cobrem o mesmo conteúdo. A Consulta rápida vai para a busca do dock (Ctrl K) e continua chamando `/api/consulta`. A tabela da rede e a presença por membro ficam um clique abaixo, atrás de "Abrir conselhos".

## 7. Etapa 4: Página do CS (`app/gestor-cs-html.ts`)

Reproduza `cs.html` mantendo a chamada única agregada a `/api/gestor/cs/[nome]`.

Ficha fixa: foto real (resolução cs_fotos antes de FOTOS_CS, inicial como fallback), medidor de pontuação com o marcador da mediana, posição, Health da base decomposto em críticos mais advertência e os botões Registrar 1:1 e Advertência, que usam as funções de servidor existentes.

Abas: Diagnóstico, Indicadores, GTD, Base e advertências, 1:1. Os blocos que já existem migram para as abas correspondentes. O radar continua disponível, por decisão anterior, como alternativa dentro de Indicadores.

Onde estão os pontos que faltam: deriva de `detalharScoreCS`. Para cada indicador, mostra o peso renormalizado, os pontos conquistados e os pontos em aberto. Indicador sem meta aparece como fora da conta. A frase de insight é gerada por regra determinística, sem IA, e traz duas coisas: o indicador que mais perde pontos e quanto a pontuação subiria se ele atingisse a meta, recalculado pela mesma função.

Pauta do 1:1: une os combinados em aberto de `/api/gestor/cs/[nome]/um-a-um` com os sinais do mês (indicador mais atrasado e conselho com GTD crítico). O botão Levar só existe se houver como persistir na pauta. Se não houver, mostre o bloco somente leitura e registre a lacuna.

## 8. Etapa 5: home do CS (`app/dashboard-html.ts`)

Reproduza `home.html`. A faixa do mês traz uma frase gerada por regra (metas no ritmo e o indicador mais atrasado, com quanto falta por semana), a pontuação comparada à mediana, os dias restantes e os pontos tomados.

O ritmo esperado é a fração de dias decorridos do mês, usando o último dia real de cada mês (cuidado com o bug do dia 31 registrado em armadilhas).

Tarefas do GTD reutiliza o componente único de `lib/gtd-checklist.ts`, sem duplicar. Próximos 7 dias usa a agenda que já existe, com confirmados e semáforo. Minha carteira lista os conselhos do CS ordenados por atenção, e cada card abre `/conselho/[grupo]`. O estado "Perfil ainda não vinculado" ganha o visual novo com uma mensagem que orienta o que fazer. Corrija também o achado E9 do ui-map: um erro 500 não pode cair nessa mensagem e precisa mostrar o erro real da seção.

## 9. Etapa 6: consistência mínima nas demais telas

Em `app/conselho-html.ts` e `app/login/page.tsx`, aplique só o tema e o dock: tokens, fontes, painéis e botões, sem reorganizar conteúdo. O login não tem dock. O redesenho completo do conselho fica para a próxima rodada.

## 10. Estados

Toda seção tem carregando com skeleton discreto, vazio com mensagem que orienta e erro isolado mostrando a mensagem real só naquela seção. Uma seção quebrada não derruba as outras.

## 11. Validação obrigatória

1. `npx tsc --noEmit` sem erro e lint limpo.
2. `npm run build`. Se faltar memória, como no E1 do ui-map, tente `NODE_OPTIONS=--max-old-space-size=6144` e, se ainda falhar, valide pelo build do preview no Vercel e registre isso.
3. Extraia cada script inline dos templates `*-html.ts` e rode `node --check` antes de cada commit.
4. Capture por Playwright, com o Edge local, cada tela em 1440x900 e 390x844 nos estados carregando, erro e vazio, usando o esquema de `ui-map/_tools`. Depois confira logado no preview do Vercel e compare lado a lado com `redesenho_v3/capturas/`.
5. Teste o dock no mouse (hover abre, a saída tem atraso e fecha), no teclado (Tab, Enter e Esc) e no toque (abre e fecha com toque).
6. Confirme que voltar, recarregar e um link direto com `?aba=` abrem a aba certa.
7. Faça uma busca nos textos visíveis provando que não há travessão nem hífen.
8. Confirme que CS comum não vê ranking nominal nem o item Gestor, e que `/gestor` continua redirecionando quem não é gestor.

## 12. Entrega

1. Branch `feat/redesenho-v3` a partir da main atualizada, commits pequenos em português, PR com o relatório da Etapa 0, a lista de lacunas de dados e as capturas antes e depois. Me passe o link do preview.
2. Não faça merge sem meu ok.
3. Ao final, escreva um resumo curto em prosa formal com o que mudou em cada tela, as lacunas e as pendências.
4. Gere o texto de registro para `handoff/historico.pl`, `handoff/aplicacao.pl` (tema, dock e as três telas) e `handoff/convencoes.pl` (uso obrigatório de `lib/ui/tema.ts` em toda tela nova).

## 13. Quando parar e me perguntar

1. Se um bloco essencial (Mapa do time, Onde estão os pontos ou a faixa do mês) depender de dado inexistente.
2. Se migrar alguma aba para o dock exigir mudar rota ou permissão.
3. Se a preview contradisser uma decisão registrada nos documentos do projeto. Mostre a contradição e espere minha decisão.
