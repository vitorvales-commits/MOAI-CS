:- encoding(utf8).
% ============================================================================
% agenda_faixa_reposicoes.pl
% Agenda de conselhos (14/10/2026): semáforo aplicado ao cartão inteiro e
% reposições no modal. Registra o que foi verificado no código e no banco
% nesta sessão. A regra de faixa (SEMAFORO_CONFIRMADOS) NÃO foi alterada.
% ============================================================================

:- discontiguous entrega/2, dado/2, decisao/2, pendencia/2.

entrega(tokens_faixa, "lib/agenda-faixa.ts: fonte única dos tokens por faixa (fundo, borda, destaque, texto de destaque). Destaque é a cor da bolinha (SEMAFORO_CONFIRMADOS; sem_dados vem de SEMAFORO_NEUTRO). Fundo é o destaque a 10% sobre branco. Texto de destaque é um tom escuro da mesma família, com contraste acima de 6:1 sobre o fundo.").
entrega(cartao_tingido, "public/agenda-cs.js e lib/agenda-ui.ts: todo cartão de conselho recebe data-faixa e fica tingido (fundo, borda de 1px, barra lateral de 4px). A lâmpada e a legenda usam o mesmo data-faixa. Rounds seguem neutros. Encerrado segue neutro, com lâmpada cinza.").
entrega(caminho_unico, "Removidos AGENDA_COR_MODO (lib/constants.ts), as classes alerta/semaforo e o estilo inline por cartão. Há um único caminho de estilo: data-faixa no componente compartilhado, que vale para a home, a visão do CS e a página do CS.").
entrega(modal_reposicoes, "public/agenda-cs.js: o modal separa Confirmados (titulares) de Reposições. Sem reposição, mostra 'Nenhuma reposição para este conselho.' em cinza. A linha Faixa agora diz, por exemplo, 'Laranja, 1 confirmado e 1 reposição de 5 esperados'.").
entrega(servidor_marca_reposicao, "lib/reports.ts (confirmadosDoMes): cada confirmado sai com reposicao true/false. Quem é titular e reposição ao mesmo tempo conta uma vez, como titular.").

dado(reposicao_espelhada, "Reposição já está no banco: membros do grupo de reposição (conselhos_grupos.is_repo = true, ligado por repo_group_id) ficam em conselhos_membros com o group_id do grupo de reposição, e o status mensal em conselhos_status_mensal. Conferido em 14/10/2026: há reposições com status 'Confirmado' em Outubro e Setembro. Nenhuma migration ou alteração na Edge Function sync-monday foi necessária.").
dado(origem_da_reposicao_ausente, "O banco não guarda de qual conselho de origem vem cada reposição. Conselhos_membros tem só id, group_id, nome, plaquinha e status_pagamento. O título 'Reposições no <Conselho> | <Nome>' indica o conselho de destino. Por isso o modal NÃO mostra 'vem do conselho de X'.").
dado(reposicao_na_contagem, "Reposições confirmadas JÁ entram na contagem x/y e na faixa hoje (confirmadosDoMes soma titulares e reposição). O denominador (esperados) conta só titulares.").

decisao(sem_dados_presentacional, "Sem dado de confirmação = não encerrado, membrosEsperados igual a 0 e confirmadosQtd igual a 0. Esse cartão usa o token sem_dados (cinza). A faixa do servidor não muda, e a cobrança segue a regra atual (para esse caso, faixa vermelha e cobrança).").
decisao(encerrado_neutro, "Conselho encerrado não recebe token de faixa. Fica neutro, com lâmpada cinza-azulada (AGENDA_PASSADO_COR), como antes.").
decisao(meta_vs_titulares, "Esperados continua contando só titulares. Reposições não aumentam o denominador.").

pendencia(gestor_regra_faixa, "Decidir se reposições devem entrar na contagem da faixa e no x/y. Hoje entram. Só registrar, não mudar.").
pendencia(origem_reposicao, "Para mostrar 'vem do conselho de X', o Monday precisaria trazer o conselho de origem em uma coluna espelhada. Não há essa coluna hoje.").
pendencia(validacao_visual_pagina_cs, "A validação visual foi feita em harness local com dados mockados (Edge headless). Falta conferir a página individual do CS (app/gestor/cs/[nome]) com dados reais, e o cartão no celular.").
pendencia(deploy, "Nada foi enviado à main nem promovido. Branch feat/agenda_faixa_reposicoes local.").
