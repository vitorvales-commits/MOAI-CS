% Redesenho v3 (20/10/2026). Texto para colar em handoff/historico.pl, handoff/aplicacao.pl e handoff/convencoes.pl.
:- discontiguous entrega/4, modulo/2, convencao/2, pendencia_conhecida/2.

% ---- para handoff/historico.pl ----
entrega(redesenho_v3, 2026_10_20, "Tema v3 com dock de vidro no topo, painéis sólidos e cor só na exceção. Reorganiza a Visão da área, a Página do CS e o Início do CS em relance, diagnóstico e detalhe. Conselho e login recebem só tema e dock. Cálculos, regras, rotas e permissões não mudaram, salvo os campos aditivos listados em aplicacao.pl.", "handoff/redesenho_v3.pl").

% ---- para handoff/aplicacao.pl ----
modulo(tema_v3, "lib/ui/tema.ts: TEMA_CSS (tokens de redesenho_v3/fonte/base.css), ICONES_SVG, DOCK_SCRIPT (hover, foco e toque, Esc, clique fora, Ctrl K, sparkline, sync) e montarDock(perfil, ativo, badges, opcoes). Dock de gestor: Gestão, Saúde da base e Sistema. Dock de CS: Meu trabalho, Desempenho, Report e, só com is_gestor() aprovado no servidor, Gestor.").
modulo(visao_area_v3, "app/gestor-html.ts. KPIs, Mapa do time (limiares em lib/constants.ts), Fila de ação (urgências e insights existentes), Rede de conselhos com detalhe atrás de Abrir conselhos. Abas por /gestor?aba=<chave> com history.replaceState. Consulta rápida vira gaveta aberta pela busca do dock. Campos aditivos em /api/gestor/visao-geral: serieArea e criticosArea.").
modulo(pagina_cs_v3, "app/gestor-cs-html.ts. Ficha fixa, abas Diagnóstico, Indicadores, GTD, Base e advertências, 1:1. Onde estão os ppontos vem de detalharScoreCS (lib/pontuacao.ts) e a frase de insight recalcula pela mesma calcularScoreCS. Pauta do 1:1 somente leitura. Campos aditivos em paginaCSGestor: ondePontos e time.").
modulo(inicio_cs_v3, "app/dashboard-html.ts e lib/inicio-cs.ts. Faixa do mês, Tarefas do GTD (componente único de lib/gtd-checklist.ts), agenda existente, metas com ritmo e Minha carteira. O CS vê só a posição contra a mediana. Campo aditivo inicio em /api/home-resumo. app/route.ts monta o dock no servidor. Erro 500 do perfil mostra a mensagem real (achado E9).").
pendencia_conhecida(sync_horario_real, "O dock mostra a data do snapshot do GTD, não o horário do último sync. Falta rota que leia sync_log.").
pendencia_conhecida(home_cross_conselho, "Tarefas do GTD do Início mostra um conselho por vez pelo componente único, sem a lista cruzada por prazo da preview. Próximos 7 dias usa a semana do componente de agenda.").
pendencia_conhecida(levar_pauta, "Botão Levar da pauta do 1:1 não existe: não há rota para anexar item à pauta.").
pendencia_conhecida(ver_como_cs, "Item Ver como CS não foi criado: não existe no app e mexeria em permissão.").
pendencia_conhecida(home_gestor_com_cs, "Gestor com perfil de CS abre o Início do CS em vez da home do time. Gestor sem perfil de CS segue na home antiga.").

% ---- para handoff/convencoes.pl ----
convencao(tema_obrigatorio, "Toda tela nova importa tokens, ícones, dock e sparkline de lib/ui/tema.ts. Proibido redefinir :root, cores soltas em hexadecimal que o tema substitui ou dock próprio. Texto visível sem travessão e sem hífen.").
convencao(uma_fonte_por_calculo, "Pontuação, ranking, mediana, Health da base, GTD, críticos e advertência vêm de calcularScoreCS, detalharScoreCS, rankingCSAtivos, gtdAgregadoCS, calcularRitmo e das funções de lib/reports.ts. Nenhum componente recalcula.").
