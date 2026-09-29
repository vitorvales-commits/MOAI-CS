:- encoding(utf8).
% ============================================================================
% aplicacao.pl
% Estado geral da aplicação moai-cs-dashboard, visão de alto nível. Arquivo
% criado em 29/09/2026 (não existia antes) — registra só o que foi
% diretamente verificado nesta sessão; módulos mais antigos aparecem como
% existentes, sem detalhamento inventado. Detalhe de segurança em
% handoff/seguranca.pl, detalhe da consulta rápida em
% handoff/consulta_metas.pl.
% ============================================================================

:- discontiguous modulo/2, doc_relacionado/2, convencao/2, pendencia_conhecida/2.

modulo(home_cs_comum, "Home do CS comum (app/dashboard-html.ts) — cada CS só vê os próprios números, com exceções pontuais (Top 3 nomeado, própria posição no ranking). Existente desde a Parte A de 25/09/2026, não reauditado a fundo nesta sessão além da revisão de autorização já registrada em handoff/seguranca.pl.").
modulo(visao_gestor, "Visão de gestor (app/gestor-html.ts, servida por app/gestor/page.tsx) — abas Visão geral e Controle de perfis, protegida por requireMoaiUser + isGestor no servidor antes de qualquer HTML ser enviado. Recebeu nesta sessão o painel Consulta rápida (handoff/consulta_metas.pl) e, antes dela, as correções de autorização de case/conselho (handoff/seguranca.pl).").
modulo(sync_monday, "Edge Function supabase/functions/sync-monday espelha os boards do Monday.com pro Postgres via pg_cron a cada 5 minutos. Segredo rotacionado em 29/09/2026 (handoff/seguranca.pl); cuidado documentado ali sobre nunca implantar essa função a partir de uma cópia local desatualizada.").
modulo(um_a_um_advertencias_foto, "Registro de 1:1 gestor-CS, sistema de advertência e foto de perfil com recorte — existentes desde o commit e5b415f (29/09/2026), não auditados nesta sessão além de confirmar via advisor que as novas RPCs (aplicar_advertencia, marcar_status_um_a_um, set_cs_foto etc.) seguem o mesmo padrão de checagem is_gestor/dono no corpo.").
modulo(consulta_rapida_metas, "Consulta em linguagem natural sobre metas, dentro da visão de gestor. Detalhe completo em handoff/consulta_metas.pl.").
modulo(metas_do_gestor, "Metas por CS e por time com vigência mensal e herança, indicadores configuráveis da home (visível/ordem/recorde) e recordes (calculados + manuais pra histórico anterior à sincronização). Aba 'Metas e destaques' em app/gestor-html.ts (matriz de metas, lista de indicadores da home, formulário de recordes manuais), 4 RPCs de escrita restritas a gestor, home/página do CS/consulta rápida todas lendo a resolução nova. Detalhe completo em handoff/dados.pl.").

convencao(escrita_unica, "Toda escrita de negócio passa por função SECURITY DEFINER com checagem de is_gestor/dono/is_moai_user no corpo e trilha em access_audit_log com resource preenchido (rate limit de 60/min, 600/h) — ver handoff/seguranca.pl, principio(escrita_unica) e principio(rate_limit_por_auditoria).").
convencao(auth_rota, "Toda rota de API chama requireMoaiUser() (lib/auth.ts) antes de tocar em qualquer dado; rotas restritas a gestor conferem isGestor explicitamente e respondem 403 genérico pro resto — nunca confiam em campo vindo do cliente.").
convencao(migracoes_versionadas, "supabase/migrations/ só passou a existir no repositório em 29/09/2026 (primeira migração: 20260929_consulta_metas_cs.sql). Mudanças de banco anteriores a essa data foram aplicadas direto via MCP, sem arquivo correspondente no repositório — não reconstruídas retroativamente.").
convencao(handoff_pl, "Arquivos .pl em handoff/ são a memória entre sessões: registram o que foi feito, por quê, e o que ficou pendente, em fatos Prolog legíveis por humano e por outra sessão. Atualizar o arquivo relevante (ou criar um novo, como este) ao concluir uma entrega, não deixar só na mensagem de commit.").

doc_relacionado(seguranca, "handoff/seguranca.pl — modelo de segurança em produção: camadas de autenticação/autorização, RLS, rate limit, vulnerabilidades corrigidas e residuais.").
doc_relacionado(consulta_metas, "handoff/consulta_metas.pl — consulta rápida de metas na visão de gestor.").
doc_relacionado(dados, "handoff/dados.pl — modelo de dados de metas do gestor: tabelas, funções de resolução/herança/recorde, RPCs de escrita, divergências encontradas entre o pedido e o código real.").
doc_relacionado(pendencias, "handoff/pendencias.pl — lista consolidada do que ainda falta validar ou fazer, entre todas as entregas desta sessão.").

pendencia_conhecida(dependencias_cve, "Next.js 14.2.35 com CVEs sem correção na linha 14 — ver handoff/seguranca.pl, vulnerabilidade(dependencias_cve, alta, aberta, ...).").
pendencia_conhecida(rate_limit_borda, "Sem limite por IP nas rotas — precisa de regra manual no Vercel Firewall, fora do escopo de acesso desta sessão (moai7). Ver handoff/seguranca.pl.").
pendencia_conhecida(preview_gestor_consulta, "Consulta rápida não foi clicada de verdade em preview/produção nesta sessão — ver teste_pendente em handoff/consulta_metas.pl.").
pendencia_conhecida(metas_gestor_checklist, "Aba Metas e destaques validada por tsc/next build/RPC direto no banco (inclusive simulando authenticated real, não só o editor SQL), mas não clicada em preview como gestor (matriz, hide/show/reorder, copiar mês) nem testada visualmente em mobile — ver handoff/pendencias.pl.").
