# Vitorio 2, B1 concluído (11/11/2026)

## O que está em produção

- **Pipeline no servidor** (`POST /api/vitorio/responder`): recebe texto livre e devolve `resposta`, `esclarecimento` ou `sem_intencao`. Usa `vitorio_dicionario` (CS, apelidos e vigências), `cs_periodos` e `vitorio_registrar_consulta_v2`.
- **Intenções do B1:** elenco (CS de um período) e carteira (quem estava com um conselho em uma data). Sem IA: classificação por frases exemplo e sinais estruturais, entidades por palavras do título e do nome do CS.
- **Fonte por data:** antes de 30/10/2026, elenco vem de `cs_periodos` e carteira não tem registro; a partir de 30/10/2026, vigência de `canonico.conselho_cs_vigencia`; mês corrente ou futuro, CS ativos hoje.
- **Tela** (`public/vitorio.js`, `lib/vitorio/montagem.ts`): o Vitorio responde antes da busca de processos. Cartão de resposta com "Ver conselho" e, para gestor, "Ver carteira do CS"; "Como cheguei nisso" recolhido; "Isso ajudou?" quando há `consultaId`; esclarecimento com opções clicáveis; estado sem registro; carregando após 300 ms; erro com "Tentar de novo"; sem intenção segue para a busca de processos.

## Regras de esclarecimento (gerais)

1. Conselho reconhecido com sinal de "quem cuida" (cuida, responsável, de quem é, CS do/da, tá com, carteira) é carteira. Sem o sinal, ou com outro assunto junto (quantos, membros, quando, reunião, nota), é sem intenção.
2. Sobrenome que aparece em mais de um título sempre pede esclarecimento com todos esses conselhos, mesmo com sinal de carteira e mesmo sem sinal. Só uma sequência de palavras presente em um único título resolve.
3. CS como sujeito sem conselho ("quais conselhos o X cuida") é sem intenção nesta etapa.
4. Elenco sem período e sem verbo de tempo ("quem são os CS", "time de CS") é elenco do mês corrente.
5. Primeiro nome de CS sozinho não identifica conselho; o sobrenome identifica.
6. **Limite:** até cinco conselhos nas opções; "Nenhum desses" fica fora da contagem e sempre aparece. Com mais de cinco candidatos, a tela pede para digitar mais do nome.
7. Erro de digitação só vale para palavras só com letras (nomes com número não casam por diferença de um caractere).

## Títulos

- Respostas de carteira usam o título sem o CS entre parênteses (`tituloDeExibicao`), porque o parêntese é o CS atual no Monday. As opções de esclarecimento mantêm o título completo.

## Validação registrada

- Ouro da pipeline: 61 perguntas, 100% de intenção, status e entidades.
- Conjunto cego, três rodadas, todas do lacrado do usuário: rodada 1 (83% intenção, 80% status, 92% entidades); rodada 2 (30/30 intenção, 29/30 status, 24/24 entidades); rodada 3 (30/30, 30/30, 25/25, sem categoria de erro). Os conjuntos e a sequência de correções ficaram registrados nas conversas, não no repositório.
- Suíte completa: 82 de 82 arquivos antes do merge do #61.
- Testes de registro: uuid, erro, limite 54000, exceção, escolha em `p_chave`, cinco conselhos mais "Nenhum desses".
- Smoke em produção (11/11/2026): uma pergunta de carteira ("quem cuida do zago em 05/11") devolveu a frase sem parêntese e gravou uma linha em `vitorio_consultas`.

## PRs e commits

- #48 (migração `20261110c_vitorio_2`), #49 (função `vitorio_dicionario`, migração `20261110d`), #51, #53, #54, #56, #57 (pipeline), #61 (tela, merge `5ea078f`).

## Ressalvas e pendências

- **Capturas:** as de desktop estão em `docs/vitorio/capturas-tela/`, em 1536 px (a janela não ficou em 1440 px). As de 390 px foram dispensadas pelo usuário, porque abaixo de 640 px o painel vira folha inferior, comportamento existente.
- **Consultas de teste:** leituras de indicadores do Vitorio devem desconsiderar consultas de e-mails de teste configuráveis. Ainda não implementado.
- **Ação de rota:** só há link para conselho e, para gestor, para carteira do CS. Não há ação para outras rotas do dash.
- **Escopo fora do B1:** intenções 6, 7, 8 e NPS, relatórios, churn, metas, pontos, bônus, GTD e upsell continuam sem intenção.
- **Mês sem dia em carteira:** usa hoje para o mês corrente, e o último dia para outros meses. Antes de 30/10/2026 não há registro.

## Próxima frente

Definida pelo Vitor.
