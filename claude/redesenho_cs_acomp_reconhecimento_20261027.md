# Redesenho das abas Acompanhamento e Reconhecimento do CS (27/10/2026)

Branch `feat/redesenho_cs_acomp_reconhecimento`, a partir da main no commit 0ac4a24.

## Painel de relatórios pós conselho (gestor)
Verificado em produção com a sessão do Vitor: o deployment da main (0ac4a24) está READY e o alias moai-cs-dashboard.vercel.app o serve. `/gestor?aba=conselhos` mostra "Relatórios pós conselho" no topo da aba e `/api/gestor/relatorios-conselho` responde 200 em JSON (0 de 4 enviados, 4 no prazo). A fila de ação da Visão geral estava com 0 itens, porque o botão "Ver relatórios" só entra quando há relatório atrasado (regra de app/gestor-html.ts), e hoje nenhum está atrasado. Não é defeito de deploy nem de cache.

## O que mudou
- `lib/ui/redesenho-cs-ui.ts`: CSS das prévias sob o prefixo `rd-` e o script com os construtores (abertura, ritmo, report, críticos, relatórios do conselho, frase da posição). Testado em `tests/redesenho-cs.test.ts`.
- `app/dashboard-html.ts`: markup e funções das duas abas, `lineChart` com tamanho opcional, pendências com relatório do conselho, Meus indicadores em fundo claro.
- `app/api/cs/[nome]/report/route.ts`: campo aditivo `relatoriosPendentes` (listarEncontrosRelatorio, a mesma fonte da home). Sem ele a aba cai para `regularidadeRelatorio`.

## Meus indicadores: o que os documentos pediam e não estava em produção
Os arquivos citados no prompt (handoff/prompt_redesenho_v3.md, handoff/prompt_redesenho_homes.md, claude/redesenho_visual_rodada1_20261020.md, handoff/principios_ux_gestor.pl) não existem no repositório; usei redesenho_v3/PROMPT_CLAUDE_CODE.md e redesenho_homes/PROMPT_CLAUDE_CODE.md. Nenhum dos dois pede uma reescrita da aba Meu mês, mas o estilo pedido (fundo claro, vidro, M preenchendo conforme a meta, decimais com vírgula) não estava nela:
1. Cartões dos indicadores, GTD e cases em fundo escuro: passaram para fundo claro.
2. Decimais com ponto (3.5, meta 4.5, recorde): agora com vírgula.
3. Travessão como texto vazio: agora "Sem dado" e "sem meta".
Não feito: faixa do mês com frase por regra e mediana na aba (isso vive no Início); sparklines.

## Lacunas
Barra de elogios, sugestões e atenção da prévia não existe nos dados do Pulso e foi omitida. As falas de exemplo das prévias não entraram.

## Validação
tsc limpo, npm test 43 de 43, next build ok, Playwright (Edge) a 1312 e 390 pixels com dados fictícios sem rolagem horizontal, scripts inline com node --check, ids-html ok.
