# Pontos automáticos, alerta de NPS e relatório do conselho

Branch `feat/pontos-nps-relatorio-conselho`, três commits (um por frente) mais este de documentação. Texto para os `.pl` em `handoff/texto_para_pl_22_10_pontos_nps_relatorio.md`.

## Frente 1: pontos automáticos com validade até o fim do mês
Padrões adotados:
- Tipos de sistema `report_atrasado` e `relatorio_conselho_atrasado` (5 pontos, `fim_do_mes`), fora da lista de aplicação manual e sem desativação pela tela.
- `valido_ate` é o instante exato do vencimento; ativa enquanto `valido_ate > now()`. Fim do mês é 23:59:59,999 de Brasília.
- Apuração percorre todas as semanas fechadas desde o corte, não só a mais recente, para não perder semana se o cron ficar parado. É idempotente pela chave.
- A função do estado do report foi separada em `status_report_semana_base` (sem sessão, usada pelo cron) e `status_report_semana` (com sessão), sem mudar o resultado para as telas.
- Ex CS (`tipo = ex_membro_sem_conta`) fica fora da apuração, porque o sync do Monday ainda reativa o Marcos até a função nova ser implantada.

Pontos que liam `validade_meses` e passaram a ler `valido_ate`: `advertenciaAtiva` e `pontuacaoAtiva` (`lib/indicadores-base.ts`), `mapAdvertenciaAplicadaRow` e `listarAdvertenciasCS` (`lib/reports.ts`), a leitura de dados brutos do Health (`lib/reports.ts`), o histórico semanal de Health (`app/api/cs/[nome]/report/route.ts`), o próximo vencimento da home (`lib/inicio-cs.ts`), a validade exibida em `app/gestor-cs-html.ts` e `app/dashboard-html.ts`, a função SQL `health_base_cs` e o teste `tests/indicadores-base.test.ts`. `validade_meses` segue só no catálogo e como insumo de `valido_ate_do_tipo` para a regra `meses`.

## Frente 2: alerta de NPS
Padrões adotados:
- Encontro de NPS é `group_id` mais `mes_grupo_titulo`; resposta sem `group_id` (ou de grupo que não existe em `conselhos_grupos`) não alerta.
- Detrator e nota do CS até 6; NPS abaixo de 70 e média abaixo de 8,5 com pelo menos 5 respostas. NPS usa promotor 9 ou 10 e detrator até o limiar de detrator.
- Avaliação só considera meses a partir de `alerta_nps_config.avaliar_desde_mes` (outubro de 2026), para não disparar o histórico.
- Alerta com mais de 7 dias é baixado sem email, para o primeiro envio não virar enxurrada.
- Destinatário vem de `cs_config.email` e `recebe_alerta_nps`; a Luana foi preenchida a partir de `gestores`.

Constantes configuráveis: `ALERTA_NPS_LIMIAR_DETRATOR` 6, `ALERTA_NPS_LIMIAR_NOTA_CS` 6, `ALERTA_NPS_MINIMO` 70, `ALERTA_NPS_MEDIA_MINIMA` 8,5, `ALERTA_NPS_AMOSTRA_MINIMA` 5, `ALERTA_NPS_JANELA_AGRUPAMENTO_MIN` 60, `ALERTA_NPS_VALIDADE_ENVIO_DIAS` 7 (em `lib/constants.ts`, espelhadas em `alerta_nps_config`, editável por `definir_alerta_nps_config`, só gestor). Também `PONTOS_REPORT_ATRASADO`, `PONTOS_RELATORIO_ATRASADO`, `RELATORIO_*_MAX` e `HOME_FOCO_DIAS_RELATORIO`.

## Frente 3: relatório do conselho
Padrões adotados:
- Encontro realizado: agenda `Executado`, `Confirmado` ou `Em conjunto` com o fim previsto (início mais 240 minutos) já passado; `Cancelado` e conselho com maioria `Não teve` no mês ficam fora.
- Piso: o maior entre 23/09/2026 e `pontos_automaticos_desde`. Em 22/10/2026 isso significa que só encontros a partir de hoje geram relatório.
- O casamento agenda para `group_id` continua único, no código (`resolverEncontrosAgenda`), e é gravado em `encontros_conselho` para o SQL ler.
- Envio permitido a qualquer momento; edição do CS só até o prazo; depois do prazo só gestor. Envio tardio gera `enviado_com_atraso` e o ponto automático.
- A lista de alertas e de relatórios nunca entra no cache compartilhado do detalhe do conselho.

Correção de passagem: o título do Foco de hoje da home do CS estava escuro sobre fundo escuro; corrigido.

## Validações
- `tsc --noEmit`, `next build` e `node --check` dos scripts inline (inclui `gestor-cs` e `conselho`) sem erro; 40 de 40 arquivos de teste. O repositório não tem configuração de ESLint (`next lint` pede configuração interativa), então lint não rodou.
- Testes novos: `pontos`, `alertas-nps`, `notificar-alertas`, `relatorio-conselho`, mais casos em `indicadores-base`.
- SQL: faltas de dois encontros de outubro conferidas contra `conselhos_status_historico` (JP do Rodrigo em 06/10: Dayahn e Kadydja; Carlos Júnior da Iasmin em 15/10: Eric, Isabelle e Rogério); `avaliar_alertas_nps(true)` contra setembro e outubro (5 alertas, incluindo NPS 63,6 do Julio Faccioli com 11 respostas).
- Permissões em transação com rollback: CS comum só vê e grava o que é dele; sem vínculo recebe 42501; ninguém além da service role executa `aplicar_advertencia_sistema`; anular e tratar alerta só gestor; prazo encerrado bloqueia o CS e libera o gestor; idempotência da chave (true e false).
- Capturas por código (Chrome, 1280 e 390 px): bloco de pontos, formulário do relatório com faltas, fila do gestor com alerta de NPS e relatório atrasado, Foco de hoje, email.
- Busca de travessão e hífen nos textos visíveis novos: nenhum. Títulos de conselho vêm do Monday e trazem hífen (por exemplo C-Level); não são texto nosso.
- `get_advisors` (segurança): não ficou sem alerta novo. Entram 11 avisos do tipo `authenticated_security_definer_function_executable` (anular_advertencia, pontos_cs, definir_alerta_nps_config, tratar_alerta_nps, encontros_pendentes_relatorio, salvar_relatorio_conselho, faltas_por_membro_conselho, regularidade_relatorio_cs, sincronizar_encontros_conselho, faltas_do_encontro e cs_do_grupo), o mesmo tipo dos 76 que já existiam: são RPCs chamadas pela sessão do usuário, com a checagem de perfil dentro da função. As funções só do cron (aplicar_advertencia_sistema, apurar_pontos_automaticos, avaliar_alertas_nps e demais) foram revogadas de anon e authenticated e não geram aviso.

## Pendências para ligar
1. Cron de pontos NÃO ligado: `supabase/cron/apurar_pontos_automaticos.sql`, depois da aprovação da apuração simulada.
2. Envio de email desligado: faltam `RESEND_API_KEY`, `ALERTAS_REMETENTE` e `SITE_URL` como secrets da função `notificar-alertas`.
3. Implantar `sync-monday` (preserva o ex CS).
