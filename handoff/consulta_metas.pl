:- encoding(utf8).
% ============================================================================
% consulta_metas.pl
% Consulta rápida de metas na visão de gestor. Fonte: implementação de
% 29/09/2026 via Claude Code, commit 2ff890e.
% ============================================================================

:- discontiguous arquivo/2, migracao/2, comportamento/2, decisao_consciente/2,
   pendente/2, teste_pendente/2, commit/2.

funcionalidade(consulta_rapida_metas, "Campo de pergunta em português na visão de gestor (app/gestor-html.ts), sem IA e sem custo por pergunta. Interpreta CS, mês e filtro (bateu, não bateu, ambos) e devolve prosa formal sem traço ou hífen no texto exibido.").

arquivo(criado, "lib/consulta.ts — interpretação da pergunta, formatação da resposta, despacho por intenção (INTENCOES: reconhece + responder). Duas intenções hoje: recordes_time (agregado do time/equipe e recordes, via metas_time_mensal — checada primeiro) e metas (por CS, via consultar_metas_cs). Nova intenção entra acrescentando um item na lista, sem mexer na rota nem na tela.").
arquivo(criado, "app/api/consulta/route.ts — POST, requireMoaiUser + isGestor (403 genérico pro resto), valida pergunta (string, até 300 caracteres), chama processarPergunta e loga em log_access com resource = CS|mês.").
arquivo(criado, "tests/consulta.test.ts — testes de interpretar/responderMetas (herdados do rascunho já validado) mais testes novos do despacho: intenção metas com RPC simulada, e pergunta não reconhecida sem tocar no banco. Roda com node --experimental-strip-types tests/consulta.test.ts.").
arquivo(criado, "handoff/consulta_metas.pl — este arquivo.").
arquivo(modificado, "app/gestor-html.ts — painel Consulta rápida inserido logo após o topbar, fora dos dois tabs (sempre visível). CSS, HTML e JS reaproveitam classes e variáveis já existentes (--dourado, --preto-tinta, --cinza-*, fontes Inter/Bricolage Grotesque). Init isolado em IIFE com try/catch antes de carregarVisaoGeral(), pelo motivo já documentado no próprio arquivo: um <script> inline só, erro não tratado no meio pararia a execução do resto da tela.").
arquivo(modificado, "tsconfig.json — allowImportingTsExtensions: true, necessário porque tests/consulta.test.ts importa lib/consulta.ts com extensão .ts (exigência do node --experimental-strip-types) e o tsc de outro modo rejeita import com extensão .ts. Compatível com noEmit, já ligado.").
arquivo(nao_criado, "app/consulta/page.tsx — nunca chegou a existir no repositório (só existia no rascunho anexado), então não houve nada para remover ou redirecionar. A consulta vive só dentro de app/gestor-html.ts.").

migracao('2026-09-29', "supabase/migrations/20260929_consulta_metas_cs.sql — mes_grupo_para_data, metrica_canonica, metas_cs_base (só service_role) e consultar_metas_cs (security definer, reconfere is_moai_user/is_gestor/meu_cs). Já estava aplicada em produção antes deste commit; só foi versionada agora, sem ser executada de novo. Não recriada nem alterada.").
migracao('2026-09-29', "supabase/migrations/20260929_log_access_resource_param.sql — log_access ganha p_resource text default null (a assinatura antiga não tinha como popular resource, sempre gravava null). Aplicada nesta sessão via MCP antes do commit. login/logout (app/auth/callback e app/auth/signout) não passam esse parâmetro, então continuam com resource nulo e sem mudança de comportamento.").

comportamento(direcao_metrica, "Churn, Revenue Churn, Downsell, Suspensões e Críticos são limite máximo; as demais são meta mínima — direcao já vem calculada assim em metas_cs_base, lib/consulta.ts só lê o campo.").
comportamento(fonte_realizado, "Realizado usa o valor calculado nas tabelas espelhadas quando existe cálculo (cases, matchmakings, rounds, indicações, upsell, downsell, churn); Health da Base e suspensões usam o valor manual do Monday. Quando manual diverge do calculado, a resposta avisa (linha de divergência) e usa o calculado.").
comportamento(sem_meta, "Métrica sem meta cadastrada fica fora da contagem de metas batidas (comMeta filtra status != sem_meta antes de contar bateu/não bateu); se tiver registro mesmo sem meta, aparece à parte na resposta.").
comportamento(coluna_meta_carteira, "cs_config.meta_carteira é a coluna real de meta de carteira, não meta_carteira_conselhos — não usada diretamente por metas_cs_base (metas vêm de metas_subitens), só relevante se uma intenção futura precisar dela.").

decisao_consciente(paleta_visual, "O pedido descrevia estilo blueprint azul marinho e âmbar, fontes IBM Plex Mono e Space Grotesk. Essas cores/fontes não existem em nenhum lugar do app (conferido em GESTOR_STYLE antes de escrever qualquer CSS novo) — a paleta real da visão de gestor é preto/dourado/branco/cinza, Inter + Bricolage Grotesque (protótipo aprovado, ver comentário no topo de app/gestor-html.ts). Reaproveitada a paleta real, seguindo a instrução explícita de reaproveitar variáveis e classes já existentes antes de criar novas.").
decisao_consciente(sem_nonce_csp, "O pedido falava em CSP com nonce por requisição. A CSP real do projeto (next.config.mjs) usa script-src 'self' unsafe-inline de propósito, com comentário explícito no próprio arquivo dizendo que migrar para nonce exigiria reescrever a template de HTML puro do dashboard. Não introduzida nenhuma mudança de CSP; o painel segue o mesmo padrão de script inline já usado por todo o resto de app/gestor-html.ts.").
decisao_consciente(log_access_resource, "A instrução pedia log_access com resource populado, mas a função (antes desta sessão) sempre gravava resource como null. Em vez de criar uma função nova ou inserir direto em access_audit_log a partir da rota, log_access foi estendida com p_resource opcional (migração log_access_resource_param), mantendo escrita única centralizada em SECURITY DEFINER, mesmo princípio já documentado em handoff/seguranca.pl (principio(escrita_unica, ...)).").
decisao_consciente(intencao_unica_hoje, "reconheceMetas usa um regex de palavras-chave (meta, bateu, atingiu, desempenho, indicador, resultado etc.) para decidir se a pergunta é sobre metas — não é NLP de verdade, é o suficiente para a única intenção existente. Pode gerar falso negativo em frases muito indiretas; não é um problema de correção, é limite conhecido de uma primeira intenção.").
decisao_consciente(intencao_time_prioritaria, "recordes_time (perguntas com 'recorde', 'o time', 'a equipe' etc.) é testada antes de metas na lista INTENCOES, de propósito: consultar_metas_cs com cs nulo devolve a quebra por CS (todo mundo), não o agregado do time, que não é soma das metas individuais (handoff/dados.pl, comportamento(meta_time_nao_e_soma)). Uma pergunta tipo 'o time bateu a meta de rounds' precisa do agregado real, por isso usa metas_time_mensal em vez de reaproveitar a intenção metas com cs=null.").

funcionalidade(recordes_time_consulta, "Segunda intenção de lib/consulta.ts (Parte G, 29/09/2026): perguntas sobre o time/equipe ou sobre recordes usam metas_time_mensal(mes) — meta com herança, realizado calculado, status e recorde efetivo por indicador, já prontos no banco (handoff/dados.pl). Indicador carteira é descartado da resposta (seu realizado é calculado em TypeScript, metas_time_mensal não tem esse dado). resource de auditoria é sempre 'time|AAAA-MM-01', nunca o texto da pergunta.").

teste_pendente(preview_gestor, "Clicar de verdade em preview ou produção como gestor: perguntar quais metas o Rodrigo bateu e não bateu deve devolver 5 de 5 em setembro de 2026 com aviso de divergência em Rounds e Upsell. Validado o dado (metas_cs_base direto no banco bate exatamente com isso), não validada a volta completa navegador -> rota -> RPC -> painel.").
teste_pendente(cs_comum_sem_vinculo, "Confirmar em preview que uma conta de CS comum e uma conta autenticada sem vínculo em cs_usuarios recebem 403 de /api/consulta e nunca veem o painel (app/gestor/page.tsx já redireciona antes de servir qualquer HTML de gestor para quem não é isGestor — a lógica existe e foi revisada, não foi exercitada com uma sessão real).").
teste_pendente(visual_mobile, "Teste visual do painel em desktop e celular não foi feito por mim (sem acesso a browser nesta sessão) — só confirmado que a media query max-width 640px empilha o formulário e que .page já limita a largura, sem introduzir rolagem horizontal nova.").

teste_pendente(recordes_time_preview, "Testes automatizados de recordes_time passam (tests/consulta.test.ts, RPC simulada), mas não foi clicado em preview/produção — perguntar 'o time bateu a meta de rounds esse mês' ou 'quais recordes foram batidos' de verdade no painel.").

commit('2026-09-29', '2ff890e').
commit('2026-09-29', '07c0d8a').
