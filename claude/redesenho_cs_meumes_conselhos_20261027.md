# Redesenho das abas Meu mês e Conselhos e agenda do CS (27/10/2026)

Branch feat/redesenho_cs_meumes_conselhos, a partir da main com o PR 8. Mesmo módulo do PR 8 (lib/ui/redesenho-cs-ui.ts, prefixo rd-), sem segundo sistema visual, sem IA, sem tabela.

## Inconsistências encontradas (por leitura do código e captura com dados fictícios)
Não consegui logar como CS no preview e na produção (sem credenciais nesta máquina), então as fotos de preview e produção ficam para o Vitor conferir. Pelo código, o que fugia do padrão das abas redesenhadas:
1. Cabeçalho do CS em bloco escuro grande, enquanto as abas usam cartões claros.
2. O resumo do mês e a abertura diziam a mesma coisa em lugares diferentes.
3. Meu mês: cartões em grade 3 x 3 com M centralizado, bloco escuro de Cases com dois mini blocos, rótulos de seção com linha.
4. Conselhos: dois conjuntos de cartões para o mesmo conselho (grade Meus conselhos e lista Carteira de conselhos), caixa Pontos de atenção em lista de marcadores, título solto.

## O que mudou
- Faixa do CS compacta e clara (foto, nome, conselhos na carteira, selo CS Destaque). O que fazer agora é um cartão rd-card. O resumo do mês saiu do bloco acima das abas.
- Meu mês: abertura escura com a frase do mês e o ritmo (dias para fechar), barra de proporção e atalhos para o que pede atenção. Oito indicadores em cartões claros rd-g3, do mais atrasado ao melhor, com M, valor, meta, selo, recorde e barra com o traço do esperado até hoje. O GTD é o nono cartão, com link para Conselhos. Cases de sucesso é um cartão único (número, meta, selo e cases clicáveis), sem duplicar o indicador na grade. A linha Time só aparece com dado; o desfoque de configRevelarIndicadoresTime foi mantido.
- Conselhos: abertura com a frase da carteira e o donut dentro dela; cartões de exceção por urgência (relatório, GTD, confirmação, presença abaixo de 60%) com conselho, motivo e ação; agenda em cartão; grade Meus conselhos com selo de estado e relatório pendente com botão Preencher relatório (data-rc-abrir). A lista da carteira só aparece para o gestor vendo outro CS ou se a grade falhar: o mesmo conselho não aparece duas vezes.

## Justificativa de gestão por bloco
- Faixa e O que fazer agora: o insight é quem é a pessoa e o que está vencendo; provoca a ação imediata na ordem de urgência; removeu o hero escuro e o resumo duplicado.
- Abertura de Meu mês: insight de quantas metas estão no alvo e quantas pedem atenção; provoca ir direto ao indicador atrasado pelos atalhos; removeu o bloco de resumo separado.
- Cartões de indicador: comparam valor, meta e ritmo esperado; provocam acelerar o que está abaixo do traço; removeram o rótulo Time vazio e a cor sem exceção.
- Cases: mostra se a meta de cases está viva e os cases que sustentam o número; provoca registrar ou revisitar cases; removeu o bloco escuro e a repetição do indicador.
- Abertura de Conselhos e atenção: insight da saúde da carteira em uma frase; provoca tratar primeiro o cartão urgente; removeu a lista de marcadores e o título solto.
- Agenda e grade: mostram quando é o próximo encontro e qual relatório falta; provocam preencher o relatório do cartão; removeram a lista duplicada.

## Limites e decisões
- O traço do esperado é linear no mês (dia de hoje sobre dias do mês), só para meta de mínimo no mês corrente. O Início usa o esperado do servidor; este não foi reaproveitado porque não vem no payload do CS.
- O detalhe de GTD por etapa (modal) para o próprio CS fica acessível pelos botões das pendências e dos cartões de exceção, já que a lista foi substituída pela grade.
- handoff/principios_ux_gestor.pl não existe no repositório (já registrado no PR 8); apliquei o padrão do PR 8.

## Validação
tsc limpo, npm test 43 de 43, next build ok, node --check dos scripts inline ok, ids-html ok. Captura com Chrome headless a 1312 e 390 pixels com API simulada: sem erro de página e sem rolagem horizontal. Preview e produção: pendentes de conferência do Vitor após o merge.
