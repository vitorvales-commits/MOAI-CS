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

## Ajustes aprovados (11/11/2026)

1. **Cartão de resposta.** A primeira linha é a resposta em linguagem de gestão, por exemplo "O conselho C-Level | Zago estava com Vilker em 05/11/2026." A confiança numérica nunca aparece para o usuário. A ação direta (abrir a carteira do CS ou o conselho) só entra quando existir rota no dash para isso; até confirmar a rota, o cartão não mostra ação.
2. **"Como cheguei nisso" em linguagem de gestão.** O texto visível usa rótulos como "Registro de responsáveis por conselho, mantido desde 30/10/2026", "Histórico de períodos dos CS" e "Lista de CS ativos hoje". O rótulo técnico (nomes de tabela) continua no log e nos testes, no campo `fonteTecnica`.
3. **Sem registro é estado próprio.** Diz que não há registro para aquela data, a partir de quando o registro existe (30/10/2026) e o que fazer (consultar o gestor da área ou o board do Monday). Sem cartão vazio.
4. **Esclarecimento.** Cada opção mostra o título completo do conselho. Até cinco opções; acima disso, pede para digitar mais do nome. Inclui a saída "Nenhum desses", que segue para a busca de processos.
5. **Nomenclatura e estilo.** CS, conselho e carteira, como nas páginas do dash. O cartão reaproveita as classes `vt-*` já existentes em `lib/vitorio/montagem.ts`; as regras novas só completam o que faltava.
6. **Justificativa de gestão.** Veja abaixo.

## Justificativa de gestão

- **Insight do cartão de resposta:** quem cuida de um conselho em uma data, sem abrir a carteira. O gestor lê a resposta e a fonte na mesma tela.
- **Ação que provoca:** abrir o conselho ou a carteira do CS quando a resposta mostra um responsável que precisa ser acompanhado. Sem essa rota confirmada, a ação fica pendente, e não é inventada.
- **Insight do esclarecimento:** o sobrenome compartilhado por mais de um conselho aparece com o título completo, para que o usuário escolha sem tentativa e erro.
- **Insight do sem registro:** a ausência de registro antes de 30/10/2026 é informação, não erro. A ação é consultar o responsável pela área ou o board do Monday.
- **Insight do "Como cheguei nisso":** a fonte da resposta fica disponível, mas recolhida, para quem precisa auditar sem poluir a leitura de relance.
