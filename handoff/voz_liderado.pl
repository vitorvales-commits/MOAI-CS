% Voz do liderado (05/10/2026). Aba da visão de gestor que transforma as respostas abertas do Pulso de CS em uma fila de sugestões tratadas com status.
%
% Visão que guia a tela: o líder quer os insights do que os liderados dizem. Por isso a aba abre com insights em texto corrido, depois números por status, ranking de temas e só então o quadro.
%
% Banco (já aplicado em produção em 05/10/2026, arquivo supabase/migrations/20261005b_voz_liderado.sql): tabela voz_liderado_itens com RLS só para gestor, função voz_segmentos, trigger voz_materializar_trg em pulso_cs_items e função voz_definir_status (SECURITY DEFINER, valida is_gestor, grava access_audit_log). O status padrão é backlog e sobrevive às sincronizações porque o trigger atualiza só o texto. Se a resposta some do Monday, a sugestão some junto por cascade.
%
% Regras: cada resposta aberta vira uma sugestão por campo; no campo começar, parar e continuar cada frase vira uma sugestão e o tipo é inferido pela palavra de ação. Itens do tipo continuar não entram no quadro e aparecem em O que o time quer manter. Respostas como nada ou nenhuma não geram sugestão. Status possíveis: backlog, em_andamento, realizado, rejeitado. Observação opcional do líder até 600 caracteres.
%
% Temas: classificação por palavras em lib/voz.ts (TEMAS_VOZ), sem acento, até dois temas por texto, fora do banco para ajustar sem migração. Recorrência é o número de respostas distintas em que o tema aparece, contado no servidor.
%
% Privacidade: nenhum payload devolve nome de respondente nem pulso_item_id. Só gestor lê e escreve.
%
% Código: lib/voz.ts, app/api/gestor/voz/route.ts (GET e POST), aba voz em app/gestor-html.ts (inicializarVoz_, carregarVoz_, renderVoz_, vozSalvar_), tests/voz.test.ts.
%
% Validação feita: tsc, tests/voz.test.ts, pulso, churn, consulta, next build e captura Playwright em desktop e celular, incluindo troca de status por POST e filtro por tema.
%
% Pendente para a Voz ter dados: aplicar o zip, fazer deploy da Edge Function sync-monday (grava pulso_cs_items) e aguardar o sync. Depois disso o trigger materializa as sugestões sozinho.
%
% Armadilhas: no MCP do Supabase comandos com drop policy travam por 180 segundos, usar execute_sql sem remoção. Dentro de GESTOR_SCRIPT não usar crases nem cifrão com chave, e escapar barra invertida como em \\u0300.
voz_liderado(ok).
