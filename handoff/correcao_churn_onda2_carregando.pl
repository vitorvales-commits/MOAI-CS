:- encoding(utf8).
% ============================================================================
% correcao_churn_onda2_carregando.pl (08/10/2026)
% Correção da aba Churn e voz do membro, que ficava inteira em "Carregando…"
% depois do merge da onda 2 (PR #2, commit 530c617).
% ============================================================================

:- discontiguous causa_raiz/1, defeito_secundario/1, correcao/1, guarda/1, validado/1, pendente/1.

causa_raiz("carregarChurn() fazia getElementById('churnErro').textContent, e o elemento churnErro tinha saído do HTML junto com o bloco de análise por IA. O null derrubava a função antes de qualquer fetch, e o try/catch de inicializarChurn engolia o erro só no console. A checagem de ids feita na onda 2 cobria só uma lista escolhida à mão, não todos os getElementById do script.").

defeito_secundario("carregarChurnBlocos_ só rodava depois do sucesso da rota de churn e usava Promise.all entre voz e visitas: qualquer falha deixava os outros blocos presos em Carregando.").

correcao("app/gestor-html.ts: churnErro de volta no bloco Por que estão saindo; carregarChurnBlocos_ reescrita com fontes independentes (churnErroEm_, churnRenderSeguro_), cada render protegido e iniciada junto com a rota de churn, sem depender dela; churnRenderA1_ aceita fonte nula e mostra Sem dado com o motivo; quando a rota de churn falha, os números do churn são limpos, o cartão de churns mostra o erro e o botão de produtos sai de Carregando; falha na montagem da aba vira mensagem visível nos blocos.").

guarda("tests/ids-html.test.ts: falha sempre que o script do gestor ou da home pede, por getElementById com texto literal, um id que não existe no HTML estático nem em HTML montado pelo próprio script. No código da main (530c617) o teste falha apontando churnErro; no corrigido, passa.").

validado("tsc --noEmit e next build sem erro. Testes ids-html, voz, voz-membro, visitas e os demais passam; churn.test.ts e pulso.test.ts continuam falhando como antes da onda 2, por resolução de módulo no node puro (next/cache via lib/reports.ts e ./constants sem extensão em lib/pulso.ts).").
validado("Chrome headless (playwright-core, fora do repositório) com o GESTOR_SCRIPT corrigido: com todas as rotas em 500 e com só a rota de churn em 500, nenhum elemento da aba fica em Carregando, cada bloco mostra sua mensagem e não há erro de JavaScript.").

pendente("Conferir no preview com dados reais, logado como gestor. Se algum bloco mostrar Não foi possível carregar este bloco, a mensagem traz o erro da rota.").
