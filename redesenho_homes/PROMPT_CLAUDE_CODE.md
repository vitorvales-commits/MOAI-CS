# Prompt para o Claude Code: aplicar as duas homes novas do dash de CS

Execute direto, sem preâmbulo. Repositório: C:\Users\vitor\Downloads\moai-cs-repo (Next.js 14, App Router). A pasta `redesenho_homes/` foi copiada para a raiz do repositório e contém a referência visual aprovada pelo Vitor:

1. `home_gestor.html`: a home geral que o gestor vê na rota `/`.
2. `home_cs.html`: a home que o CS vê na mesma rota `/`.
3. `capturas/`: desktop e celular de cada uma, mais a visão Mês da agenda.
4. `fonte/`: `base.css` (tokens e primitivos), `icons.svg`, `spark.js` (dock e sparkline), `dock.py` (grupos do dock por perfil) e o fonte de cada home.

Os números das previews são ilustrativos. No app, tudo vem dos dados reais. Links das previews para páginas que não estão no pacote (`gestor.html`, `cs.html`) são só navegação de demonstração.

## 1. Missão

Reescrever a interface da rota `/` (`app/route.ts` servindo `app/dashboard-html.ts`) nas duas versões, gestor e CS, com a linguagem v3: dock de vidro no topo, saudação com a situação numa frase, blocos em formato de widgets e cor só na exceção.

Cálculos, regras de negócio, sincronização, rotas de API e permissões não mudam, salvo onde este prompt disser. Os blocos de NPS saem da home.

## 2. Regras obrigatórias

1. Valem `convencoes`, `armadilhas`, `regras_negocio` e os prompts anteriores do projeto. Inspecione antes de alterar e diagnostique pela causa raiz com evidência. Quando vários problemas se acumularem num arquivo, reescreva o arquivo completo.
2. Texto visível em português formal, sem travessão e sem hífen. Hífen só em classes CSS, atributos HTML e identificadores.
3. Fidelidade de dados: nunca invente número, nome, título de case ou frase de exemplo. Bloco sem dado mostra estado vazio orientador e a lacuna vai para o PR. Não crie tabela, coluna nem rota nova sem me perguntar.
4. Uma fonte por cálculo: pontuação, ranking, metas, recordes, Health da base, GTD, críticos, advertências e semáforo de confirmados continuam vindo das funções que já existem. É proibido recalcular em componente. Toda regra nova deste prompt vira função pura em `lib/`, com teste.
5. Permissões: CS comum nunca vê ranking nominal, Top 3 nem dados de outro CS. Na home do CS, a referência é a mediana do time, nunca a lista de colegas. O que é só de gestor é decidido no servidor por `is_gestor()`, nunca escondido só no cliente.
6. Toda seção tem três estados: carregando com skeleton discreto, vazio com mensagem que orienta e erro isolado com a mensagem real. Uma seção quebrada não derruba as outras.

## 3. Etapa 0: diagnóstico (relatório curto antes de codar)

Leia `app/route.ts`, `app/dashboard-html.ts` inteiro, `lib/gtd-checklist.ts`, `lib/constants.ts`, `lib/auth.ts` e as rotas de `app/api/**` que a home chama. Verifique também se `lib/ui/tema.ts` já existe, porque o prompt do redesenho v3 pode já ter sido aplicado.

Entregue quatro coisas:

1. Como a rota `/` decide entre a visão de gestor e a de CS hoje, e o que acontece com o gestor que também é CS (Vitor aparece no Time de CS).
2. Uma tabela com bloco da preview, função ou rota que já fornece o dado, campo exato e lacuna. Os blocos são:
   1. Home do gestor: saudação, Outubro até aqui, Time de CS, Indicadores da área (crescimento e retenção), Agenda (Lista, Semana e Mês), Top 3 em pódio, Cases de sucesso do time e Conselhos visão consolidada.
   2. Home do CS: saudação, Foco de hoje, Sua pontuação com pontos tomados, Ritmo do mês, Sua semana, Tarefas do GTD e Sua carteira.
3. O mapa atual das seções da home: `homeAbaConselhos`, `equipeSection`, `farolSemana`, `agendaBody`, `equipeIndicadores`, `equipeSemanal`, `equipeConselhos`, `csTop`, `equipeRanking`, `npsAliasesPendentesBlock` e o bloco Relatório mensal de Conselhos. Diga a função que monta cada uma.
4. A causa raiz do erro visto em produção na agenda: "Não foi possível carregar o farol: Unexpected token '<', "<!DOCTYPE "... is not valid JSON". A rota do farol está devolvendo HTML (redirect de sessão, 404 ou erro de página) em vez de JSON. Identifique qual é e corrija na origem: a rota sempre responde JSON, com status correto. O cliente checa `content-type` antes de fazer o parse e mostra uma mensagem orientadora.

Siga sem esperar, exceto se algo exigir decisão minha.

## 4. Etapa 1: tema e dock (só se ainda não existirem)

Se `lib/ui/tema.ts` já existir pelo redesenho v3, reutilize e só acrescente o que faltar. Se não existir, crie o módulo exportando quatro coisas:

1. `TEMA_CSS`: o conteúdo de `fonte/base.css`, sem alterar os tokens.
2. `ICONES_SVG`: o sprite de `fonte/icons.svg`.
3. `DOCK_SCRIPT`: o comportamento de `fonte/spark.js`. O dock abre por hover, foco e toque; fecha com Esc ou clique fora; Ctrl K foca a busca.
4. `montarDock(perfil, ativo, badges)`: traduz `fonte/dock.py`.

Os grupos do dock por perfil são estes:

1. Gestor, grupo Gestão: Início (novo, aponta para `/`), Visão da área, Time, Conselhos, Metas e destaques.
2. Gestor, grupo Saúde da base: Churn e reconquista, NPS e Pulso de CS, Fila da liderança.
3. Gestor, grupo Sistema: Controle de perfis, Ver como CS.
4. CS, grupo Meu trabalho: Início, Agenda, Meus conselhos.
5. CS, grupo Desempenho: Meus indicadores, Pontos tomados.
6. CS, item Report com badge dourado quando o report semanal estiver pendente.
7. CS, item Gestor apenas para quem `is_gestor()` aprova.

O dock substitui a barra superior antiga da home: logo, seletores de mês e ano, "ao vivo", Sair e o link para a visão de gestor. O período vai para o seletor da saudação. Sincronizar agora vira botão da saudação, só para gestor, chamando `/api/sync-agora`. Sair vai para o menu do avatar.

## 5. Etapa 2: home geral do gestor

Reproduza `home_gestor.html` com dados reais, nesta ordem.

### 5.1 Saudação

Nome do usuário, data, "dia N de M do mês" e uma frase de situação gerada pela regra da seção 7.1, por exemplo "O time está atrás do ritmo em 4 frentes".

### 5.2 Outubro até aqui

O cartão escuro da marca, com quatro partes:

1. A frase principal, gerada pela regra da seção 7.1.
2. Um parágrafo de apoio.
3. Três números em vidro: metas de crescimento no ritmo (N de 4), churn projetado contra o limite e membros críticos contra o limite com o percentual da base.
4. Dois botões: Abrir a fila de ação (vai para Visão da área) e Ver cases do mês (âncora).

### 5.3 Time de CS

Grade compacta com foto real (cs_fotos antes de FOTOS_CS, inicial como fallback), nome e pontuação do mês. O anel em volta da foto segue a mesma definição de "em risco" e "acompanhar" já usada nas urgências da Visão da área, sem criar critério novo. CS sem dados suficientes mostra "sem dados". Clique abre `/gestor/cs/[nome]`. A grade grande atual de cards sai.

### 5.4 Indicadores da área

Substitui `equipeIndicadores`. Mantenha o M da marca preenchendo conforme a meta, agora em fundo claro: o glifo está em `fonte/home_gestor.src.html`, com `clipPath` por altura. Os indicadores ficam em dois grupos:

1. Crescimento, quanto mais melhor: cases de sucesso, rounds, matchmakings e indicações. Cada um mostra valor, meta, barra com o traço do esperado até hoje, quanto falta contra o esperado e o recorde com mês e ano. Use a lógica de recorde já existente, inclusive a janela do histórico espelhado e o recorde manual. A nota sobre essa janela vira um texto de ajuda discreto.
2. Retenção, limite máximo: churn, revenue churn e membros críticos. Mostram o quanto do limite já foi usado e, para churn e revenue churn, a projeção do mês pela regra da seção 7.2.

Status por indicador: Acelerar, Nenhum ainda, Quase no ritmo, No ritmo, Atenção e Perto do limite. Os limiares ficam em `lib/constants.ts`, comentados em português, sem número mágico no template.

### 5.5 Agenda da equipe

Reaproveite o motor de agenda que já existe (`agendaNavegar`, `agendaMudarVisao`, farol e legenda) e troque só a apresentação.

1. Controles: anterior, Hoje, próximo; Meus ou Equipe; Lista, Semana ou Mês, com Semana como padrão.
2. Semana: grade de horários de 8h a 22h, com uma coluna por dia útil. Use colunas de sábado e domingo só se houver evento nesses dias, conforme a regra aberta `agenda_fim_de_semana`.
3. Cada evento ocupa a duração de desenho de `duracao_bloco_minutos`: conselho 240, round 120. O horário real de término continua no modal.
4. Cor do conselho pelo semáforo de confirmados de `regras_negocio`: 0 a 1 vermelho, 2 a 3 laranja, 4 a 5 amarelo, 6 a 7 verde, 8 ou mais azul. O indicador só aparece com pelo menos um confirmado, nunca vermelho por padrão.
5. Round aparece tracejado, com pílula de status e sem lista de confirmados.
6. Uma linha vermelha marca o momento atual no dia de hoje. Semana passada mostra presença, semana atual e futura mostram confirmados.
7. Mês: calendário com até dois encontros por dia, "mais N" quando passar disso e dias passados esmaecidos.
8. Lista: a lista atual, no visual novo.
9. Rodapé: total de conselhos e rounds da semana e quantos estão com 3 confirmados ou menos.
10. O farol da semana deixa de ser bloco separado e vira esse resumo do rodapé, depois de corrigido na Etapa 0.

### 5.6 Top 3 em pódio

Substitui `csTop` e `equipeRanking`. Use cartão escuro com 2º à esquerda, 1º no centro (mais alto, com coroa e anel dourado) e 3º à direita, com medalhas de ouro, prata e bronze. Cada pessoa mostra pontuação, variação no mês e uma frase gerada pela regra da seção 7.3.

No rodapé ficam dois destaques: a maior alta do mês e a distância de pontos entre o 1º e o 4º. A fonte é exclusivamente `rankingCSAtivos`: sem ex CS, sem preencher vagas quando houver menos de três elegíveis. A animação de subida e o brilho do degrau respeitam `prefers-reduced-motion`. O ranking completo fica atrás de um link para a Visão da área.

### 5.7 Cases de sucesso do time

Substitui `equipeSemanal`. Mostra o total do mês, quantos foram nesta semana, há quantos dias foi o mais recente e os 5 mais recentes com CS, conselho, data e título real do Monday. Cases são organizados por grupo de mês, nunca por `created_at`.

### 5.8 Conselhos, visão consolidada

Substitui `equipeConselhos` por quatro números (conselhos ativos, membros, presença acumulada e conselhos abaixo de 70% de presença) e um link para a área de conselhos. A aba Conselhos atual (`equipeGradeConselhos` e `equipeImpactoConselhos`) sai da home e vira o destino do item Conselhos do dock. Pode ser uma rota própria ou uma âncora numa página existente; escolha a de menor risco e registre no PR.

### 5.9 Removidos da home

Saem `npsAliasesPendentesBlock` e o bloco Relatório mensal de Conselhos. Não apague a funcionalidade: mova os dois para a área NPS e Pulso de CS da visão do gestor, mantendo as rotas `/api/gestor/nps/aliases-pendentes` e `/api/gestor/relatorio-mensal` e o botão de download do relatório.

## 6. Etapa 3: home do CS

Reproduza `home_cs.html` com dados reais, nesta ordem.

### 6.1 Saudação

Nome, data, dias para fechar o mês, uma frase de situação e o botão Enviar report da semana, ligado ao fluxo atual do report via Monday.

### 6.2 Foco de hoje

Um único item, escolhido pela regra da seção 7.4, num cartão escuro. Tem três partes:

1. Título e explicação curta.
2. Até quatro números em vidro, como confirmados em anel, GTD do ciclo, etapas atrasadas e presença.
3. Dois botões de ação que abrem o checklist do conselho e a lista de quem não confirmou.

Se nada pedir atenção, o cartão diz "Tudo em dia" e mostra o próximo compromisso.

### 6.3 Sua pontuação

Anel com a pontuação de `calcularScoreCS` e um marcador dourado na mediana do time. A frase de simulação vem da regra da seção 7.5. O bloco Pontos tomados fica embutido: ativos contra o limite, datas de vencimento e efeito no Health da base, sempre somente leitura.

### 6.4 Ritmo do mês

Metas com barra e traço do esperado até hoje, em ordem do mais atrasado para o mais adiantado. Indicador sem meta não aparece como zero. A dica final é gerada pela regra da seção 7.6.

### 6.5 Sua semana

Faixa de Seg a Dom com marcadores e os próximos compromissos, incluindo o prazo do report. A fonte é a mesma agenda, com o recorte Meus.

### 6.6 Tarefas do GTD

Usa o componente único de `lib/gtd-checklist.ts`, sem duplicar. Mostra as etapas abertas por prazo, com marcação de concluída usando a mesma escrita que o checklist já usa.

### 6.7 Sua carteira

Os conselhos do CS, do que pede mais atenção para o que pede menos. A cor aparece só em GTD crítico ou presença baixa. Cada card abre `/conselho/[grupo]`.

### 6.8 Estado "Perfil ainda não vinculado"

Ganha o visual novo e orienta o que fazer. Corrija também o achado E9 do ui-map: um erro 500 nunca pode cair nessa mensagem.

## 7. Regras novas, todas determinísticas, sem IA, como funções puras com testes

### 7.1 Frase do mês do gestor

1. O ritmo esperado é `dias decorridos / último dia real do mês`. Cuidado com o bug do dia 31 registrado em `armadilhas`.
2. Para cada indicador de crescimento com meta, calcule o déficit relativo: `(esperado − realizado) / meta`.
3. A frase principal cita o indicador de maior déficit, com realizado, meta e esperado.
4. O parágrafo de apoio cita os outros indicadores atrás do ritmo e os indicadores de retenção cuja projeção passa do limite.
5. Na saudação, "atrás do ritmo em N frentes" conta os de crescimento atrás do ritmo mais os de retenção com projeção acima do limite.
6. Se N for zero, as frases dizem que o time está no ritmo.

### 7.2 Projeção de retenção

1. A projeção é `realizado / dias decorridos × dias do mês`, só para indicadores de fluxo (churn e revenue churn). Críticos é estoque e não é projetado.
2. Quando a projeção passar do limite, o status vira Atenção e o texto diz "No ritmo atual fecha em X".
3. Padrão adotado, a confirmar comigo no PR: esse comportamento fica atrás da constante `RETENCAO_STATUS_POR_PROJECAO = true` em `lib/constants.ts`, para eu poder desligar.
4. Nos primeiros dias do mês a projeção é instável. Abaixo de `DIAS_MIN_PROJECAO`, padrão 7, mostre só o realizado.

### 7.3 Frase de cada pessoa no pódio

Em ordem de prioridade:

1. O indicador de crescimento em que a pessoa tem o maior valor do time no mês ("Maior volume de X do time").
2. Se não liderar nenhum, a maior alta de pontuação do mês entre os três ("Quem mais subiu no mês").
3. Se nada disso se aplicar, "N de M indicadores com meta batidos ou no ritmo".

Nunca repita a mesma frase para duas pessoas.

### 7.4 Foco de hoje do CS

Em ordem de prioridade:

1. Conselho do CS nos próximos 3 dias com confirmados ≤ 3 ou com etapa de GTD atrasada.
2. Report semanal pendente com prazo em até 1 dia.
3. Meta de maior peso mais atrasada contra o ritmo.
4. Próximo compromisso com "Tudo em dia".

Os prazos e limiares ficam em constantes.

### 7.5 Simulação da pontuação

Pegue o indicador de crescimento atrasado com maior peso e calcule, pela mesma `calcularScoreCS` com o valor hipotético, quantas unidades levam a pontuação ao próximo patamar inteiro relevante, limitado a fechar a meta. A frase é "N a mais levam você a X". Se a função não aceitar entrada hipotética sem duplicar lógica, extraia o núcleo puro e reutilize nos dois usos.

### 7.6 Dica do ritmo do CS

Para o indicador mais atrasado, informe quanto falta e o ritmo semanal necessário até o fim do mês.

## 8. Validação obrigatória

1. `npx tsc --noEmit` sem erro e lint limpo.
2. `npm run build`. Se faltar memória, como no E1 do ui-map, tente `NODE_OPTIONS=--max-old-space-size=6144` e, se ainda falhar, valide pelo build do preview no Vercel e registre isso.
3. Extraia cada script inline do template e rode `node --check` antes de cada commit.
4. Testes unitários das regras da seção 7, com dois casos obrigatórios:
   1. Dia 20 de um mês de 31 dias, meta 55 e realizado 11 dá esperado 35 e déficit 24.
   2. Churn 8 no dia 20 de um mês de 31 dias projeta 12.
5. Capturas por Playwright com o Edge local, em 1440x900 e 390x844, nos estados carregando, vazio e erro das duas homes e nas três visões da agenda. Depois confira logado no preview do Vercel como gestor e como CS, comparando lado a lado com `redesenho_homes/capturas/`.
6. Confirme que o farol carrega sem o erro de JSON.
7. Confirme que CS comum não recebe Top 3, ranking, dados de outro CS nem o item Gestor do dock, tanto no HTML quanto nas respostas de API.
8. Faça uma busca nos textos visíveis provando que não há travessão nem hífen.

## 9. Entrega

1. Branch `feat/redesenho-homes` a partir da main atualizada, commits pequenos em português e PR com:
   1. O relatório da Etapa 0.
   2. A causa raiz do farol.
   3. As lacunas de dados.
   4. Os padrões adotados, com destaque para a projeção de retenção.
   5. As capturas antes e depois.
2. Me passe o link do preview. Não faça merge sem meu ok.
3. Ao final, um resumo curto em prosa formal.
4. Texto de registro pronto para `handoff/historico.pl`, `handoff/aplicacao.pl` (as duas homes, a agenda em calendário e o pódio), `handoff/regras_negocio.pl` (as regras da seção 7 e as constantes novas) e `handoff/armadilhas.pl` (a causa do erro do farol).

## 10. Quando parar e me perguntar

1. Se a rota `/` não tiver como distinguir gestor de CS no servidor sem mudar a autenticação.
2. Se algum bloco principal depender de dado inexistente. Os blocos principais são: Outubro até aqui, Indicadores da área, Foco de hoje e Ritmo do mês.
3. Se mover os blocos de NPS exigir mudar permissão ou rota.
4. Se a preview contradisser uma decisão registrada nos documentos do projeto. Mostre a contradição e espere.
