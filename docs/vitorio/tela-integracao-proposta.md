# Vitorio 2: integração na tela (proposta, sem código)

## Estado confirmado no código

- A tela atual é `public/vitorio.js`. Ela busca o índice (`/api/vitorio/indice`), roda a busca de processos no navegador e registra a consulta por `/api/vitorio/consulta`.
- O pipeline novo está em `POST /api/vitorio/responder`. Ele responde perguntas de elenco e de carteira, pede esclarecimento quando um conselho é ambíguo ou falta, e devolve `sem_intencao` para o resto.
- A rota registra consultas com resposta ou esclarecimento. Consultas sem intenção não são registradas aqui, porque a busca de processos já as registra.

## Onde o Vitorio aparece

Sem mudança de lugar: o mascote e o painel atuais. A rota nova entra antes da busca de processos. Ordem:

1. Pergunta enviada.
2. `responder` devolve `resposta` ou `esclarecimento`: mostra o cartão e não chama a busca.
3. `sem_intencao`: a tela segue para a busca de processos, como hoje.

## Esclarecimento

- Mostra a pergunta (`Qual conselho?` ou `De qual conselho?`) e as opções como botões.
- Escolher uma opção reenvia a pergunta já resolvida, com o `group_id` do conselho escolhido. A rota não precisa interpretar de novo.
- Nunca escolhe sozinha quando há mais de um conselho.

## Estados

- **Carregando:** texto "Consultando os dados" depois de 300 ms, para não piscar em respostas rápidas.
- **Erro:** mensagem curta e botão para tentar de novo. Não mostra detalhe técnico.
- **Esclarecimento:** cartão com as opções clicáveis.
- **Sem intenção:** segue para a busca de processos sem mensagem de erro.

## "Como cheguei nisso"

- Fica recolhido por padrão, em um único clique ("Como cheguei nisso").
- Mostra a fonte (`comoCheguei`), sem a data em formato técnico.

## O que não está decidido

- Os princípios de UX do gestor não estão no repositório. `docs/registro_plataforma.md` registra essa ausência. As decisões acima são inferidas do código e precisam ser confirmadas antes de implementar.
- Capturas em desktop e celular dependem de sessão logada no dash e de uma pergunta de carteira com resposta, que a sessão do navegador já permite.

## Pendências registradas (não implementar agora)

- Leituras de indicadores do Vitorio devem desconsiderar consultas feitas por e-mails de teste configuráveis, para que fumaça e QA não distorçam a taxa de ambíguas e de utilidade.
