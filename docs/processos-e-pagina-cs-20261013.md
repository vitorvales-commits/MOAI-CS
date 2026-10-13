# Processos de CS e revisão da página do CS (13/10/2026)

Base: commit 9f38b38 da main. Validado com tsc limpo, node check dos dois scripts embutidos em app/dashboard-html.ts, 28 de 28 arquivos de teste (17 casos em processos) e next build compilando. Teste visual em Chromium headless com servidor simulado, desktop e 390 px.

## Como aplicar

Copie os arquivos do pacote sobre o repositório preservando as pastas. Depois aplique as duas migrações no Supabase, nesta ordem: supabase/migrations/20261013_processos_cs.sql e supabase/migrations/20261013b_set_destaque_so_gestor.sql. Rode get_advisors de segurança. A página /processos depende da primeira migração; sem ela, a leitura devolve erro e a tela mostra a mensagem de falha com o botão de tentar de novo. A migração foi reescrita depois do arquivo real (moldura e dados, sem tabela de seções); como nunca foi aplicada, aplique só esta versão. Por fim npm test, npx tsc --noEmit, commit e push.

## Processos de CS (/processos)

O arquivo real (MOAI_CS_Arquitetura_Blueprint_Fluxos.html, 473 KB) é uma aplicação movida a dados: abas, busca, diagramas, blueprint e POPs são desenhados a partir de constantes em caixa alta no script (META, CADEIA, NIVEIS, MACROS, PROCESSOS, LANE_COR, STATUS_TXT, FAQ, MODELOS, MODELO_CORPO, L, FLUXOS, POPS, CFG, mais os auxiliares M e N). As seções do corpo chegam vazias. Por isso o desenho por seções foi abandonado no mesmo dia: o banco guarda a moldura (o HTML inteiro com o bloco de dados trocado por /*PROC_DADOS*/, 84 KB) e os dados (lista ordenada das constantes avaliadas em JSON; funções como M e N ficam como código). Edição acontece item a item nos dados; a moldura só muda ao importar um HTML novo. Arquivo sem bloco de dados é guardado inteiro.

Regra de extração: no script inline com mais constantes em caixa alta na coluna zero, a região de dados vai da primeira delas até a primeira declaração de function ou class, ou a primeira constante fora de caixa alta (no arquivo real, const $). A avaliação roda num iframe isolado. Remontagem conferida no arquivo real: abre sem erros e mostra 16 processos, 129 atividades e 62 modelos.

Leitura aberta a todo usuário do domínio, em tela cheia (o documento já tem busca e navegação próprias). Escrita só por processos_publicar e processos_restaurar, SECURITY DEFINER com is_gestor(), concorrência otimista pela versão e auditoria em access_audit_log. Cada publicação grava um snapshot; ficam as 40 mais recentes.

Editor (Editar processos, só gestor), num rascunho salvo no navegador até publicar: coleções com nomes de tela (Perguntas frequentes, Processos, Fluxos e atividades, POPs, Modelos, cadastro e conteúdo, Macroprocessos, cabeçalho) e configurações agrupadas à parte; busca de item; editar, inserir em posição escolhida, mover, remover com restaurar e Desfazer; formulário gerado a partir do formato do item, com alternativa em JSON; importar o HTML atualizado com comparação item a item (novo, alterado, sai) e escolha linha a linha, mais opção de levar a estrutura visual nova; histórico com pré-visualização e restauração.

Proteção antes de publicar: verificação de referências entre coleções (modelo usado por atividade, fluxos de processos e POPs, macroprocesso, ref, dispara, vemDe, processo do fluxo), com aviso fixo no editor, e teste do documento montado num iframe oculto que clica em cada aba e recolhe erros. Publicar fica bloqueado se houver problema. Exemplo testado: remover o modelo guia_designacao é barrado com a mensagem de que o fluxo Designação ainda o usa.

O iframe herda a CSP do app: imagens e folhas de estilo de fora do domínio e do Google Fonts não carregam (o arquivo atual não usa nenhuma).

Arquivos: lib/processos.ts, lib/processos-ui.ts, public/processos.js (trocar VERSAO_SCRIPT em app/processos/page.tsx ao alterar), app/processos/page.tsx, app/api/processos/*, tests/processos.test.ts. Link Processos na topbar do painel e da visão da área.

Primeiro uso: aplicar a migração, abrir /processos como gestor, Importar HTML de processos com o arquivo atual, conferir e publicar.

## Página do CS na visão dele

Acima das abas entram duas peças de leitura de relance. O que fazer agora junta, por urgência, report da semana pendente ou atrasado (e o da semana anterior não enviado), etapas atrasadas do GTD nos ciclos abertos, conselhos dos próximos 7 dias com semáforo vermelho ou laranja, passos da 1:1 vencidos ou com prazo na semana e pontos acima do limite, cada um com a ação direta. Metas do mês substitui os quatro cartões de texto: quantas metas estão no alvo, barra de proporção e atalhos para os indicadores que pedem atenção. Os cartões de indicador passam a vir ordenados por urgência.

Abas de 7 para 4: Meu mês (indicadores, GTD e cases), Conselhos e agenda (agenda saiu do topo), Acompanhamento (1:1, report e pontos, com contador de pendências) e Reconhecimento (posição, Top 3 e Pulso). O hero ficou compacto e perdeu as linhas de próximo conselho e último 1:1, que viraram pendências.

Correções: o próprio CS conseguia gravar o número de vezes CS Destaque (formulário visível e rota e função aceitando o dono); agora só gestor, na rota e na função set_destaque. O arrasto do recorte de foto nunca era ligado porque o script rodava antes do modal existir; agora espera o DOM.

Ainda em aberto: o histórico do report usa tabela, contra a preferência registrada de não exibir dados em tabela.
