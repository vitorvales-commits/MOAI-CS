# Redesenho v3 do dash de CS

Branch `feat/redesenho-v3`, a partir da main de 14/10/2026. Referência visual em `redesenho_v3/`.

## O que mudou
- **Tema e dock** (`lib/ui/tema.ts`): tokens, ícones, dock, sparkline e sync num módulo só.
- **Visão da área**: KPIs, Mapa do time, Fila de ação e Rede de conselhos. Abas por `?aba=`.
- **Página do CS**: ficha fixa, cinco abas, Onde estão os pontos, pauta do 1:1 e GTD que pede atenção.
- **Início do CS**: faixa do mês, tarefas, agenda, metas com ritmo e carteira. Erro 500 do perfil mostra a mensagem real (E9).
- **Conselho e login**: só tema e dock.

## Campos aditivos (sem rota nem tabela nova)
`/api/gestor/visao-geral`: `serieArea`, `criticosArea`. `paginaCSGestor`: `ondePontos`, `time`. `/api/home-resumo`: `inicio`.

## Lacunas de dados
Horário real do sync, filtro Comigo, sparklines de risco, críticos e divergência, botão Levar, Ver como CS, lista cruzada de tarefas do GTD, contagem de membros na ficha.

## Verificação
tsc sem erro, `npm test` 29 de 29, `npm run build` ok. Dock testado em Chrome real: hover abre e fecha com atraso, Tab e Enter abrem, Esc fecha, clique fora fecha, Ctrl K foca a busca. `?aba=` abre a aba certa ao carregar e ao trocar. ESLint não existe nesta máquina. Falta conferir no preview do Vercel com dados reais, em 390 pixels e comparar com `redesenho_v3/capturas/`.
