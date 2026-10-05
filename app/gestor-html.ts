// Shell da página de gestor — mesmo padrão de app/dashboard-html.ts: HTML+CSS+JS vanilla numa
// string só, sem framework de gráfico nem dependência de client-side nova (a CSP do projeto só
// libera script-src 'self', então nada de CDN externo aqui). O acesso de verdade é garantido no
// servidor por app/gestor/page.tsx (requireMoaiUser + isGestor) antes deste HTML ser servido;
// tudo aqui dentro é só apresentação — os dados vêm de /api/gestor/visao-geral, que faz a mesma
// checagem de novo.
//
// Camada visual = protótipo aprovado (visao_area_gestor_prototipo.html), substituída por inteiro
// (não é um ajuste da tela antiga com pílulas vermelhas/verdes e ranking em barra amarela — essa
// versão foi descartada). Nenhuma lógica de dados mudou: os valores, o score (scoreReal), os
// alertas e a divergência continuam vindo prontos de generateVisaoGestor() em lib/reports.ts; este
// arquivo só lê e desenha o que a API já calcula, nunca recalcula nada por conta própria.

export const GESTOR_STYLE = `
:root{
  --cinza-fundo:#F5F5F5; --preto-tinta:#1A1A1A; --preto-profundo:#141414; --grafite:#272727;
  --branco:#FFFFFF; --cinza-texto:#5D5D5D; --cinza-apoio:#9F9F9F;
  --cinza-linha:#C6C4C4; --cinza-borda:#D8D5D5; --cinza-superficie:#E9E9E9;
  --vermelho:#C0433D; --dourado:#C89A2E; --verde:#3D8B5F;
}
.gestor-page *{box-sizing:border-box;}
.gestor-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
.gestor-page h1,.gestor-page h2,.gestor-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1180px;margin:0 auto;padding:0 28px 80px;}

.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;flex-wrap:wrap;gap:12px;}
.topbar-left{display:flex;align-items:center;gap:14px;}
.voltar-btn{
  display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);
  text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);
  background:var(--branco);
}
.voltar-btn:hover{background:var(--cinza-superficie);}
.logo-mark{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;letter-spacing:0.02em;}
.topbar-divider{width:1px;height:18px;background:var(--cinza-linha);}
.topbar-title{font-size:14px;color:var(--cinza-texto);font-weight:500;}
.topbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pill{font-size:12px;padding:6px 12px;border-radius:999px;background:var(--branco);border:1px solid var(--cinza-borda);color:var(--cinza-texto);font-weight:500;}
.pill-select{font-size:12px;padding:6px 12px;border-radius:999px;background:var(--branco);border:1px solid var(--cinza-borda);color:var(--cinza-texto);font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;}
.pill-select:hover{border-color:var(--preto-tinta);}

.tabs{display:flex;gap:4px;border-bottom:1px solid var(--cinza-linha);margin-bottom:32px;}
.tab-btn{
  font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--cinza-apoio);
  background:none;border:none;padding:12px 4px;margin-right:24px;cursor:pointer;
  border-bottom:2px solid transparent;
}
.tab-btn.active{color:var(--preto-tinta);border-bottom-color:var(--dourado);}
.tab-panel{display:none;}
.tab-panel.active{display:block;}

.hero{position:relative;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#141414 0%,#1A1A1A 48%,#272727 100%);padding:52px 44px 44px;color:var(--branco);}
.hero::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),
             radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);
  pointer-events:none;}
.hero-content{position:relative;z-index:1;max-width:640px;}
.hero-eyebrow{display:inline-block;font-size:11px;letter-spacing:0.14em;font-weight:600;color:var(--dourado);margin-bottom:14px;}
.hero h1{font-size:34px;font-weight:700;margin:0 0 12px;line-height:1.15;}
.hero-sub{font-size:14px;line-height:1.6;color:#C6C4C4;margin:0 0 32px;max-width:520px;}
.hero-stats{position:relative;z-index:1;display:flex;gap:40px;flex-wrap:wrap;margin-top:8px;}
.hero-stat-value{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:40px;display:block;line-height:1;}
.hero-stat-label{font-size:12px;color:#9F9F9F;margin-top:8px;display:block;}
.hero-stat:nth-child(1) .hero-stat-value{color:var(--dourado);}
.hero-stat:nth-child(2) .hero-stat-value{color:var(--vermelho);}
.hero-stat:nth-child(3) .hero-stat-value{color:var(--branco);}

.block{margin-top:56px;}
.block-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:22px;}
.block-head h2{font-size:22px;font-weight:700;margin:0 0 6px;}
.block-head p{font-size:13px;color:var(--cinza-texto);margin:0;max-width:520px;line-height:1.55;}
.toggle-inline{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--cinza-texto);font-weight:600;cursor:pointer;white-space:nowrap;}
.toggle-inline input{width:16px;height:16px;cursor:pointer;accent-color:var(--preto-tinta);}

.ranking-list{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;overflow:hidden;}
.rank-row{display:grid;grid-template-columns:32px 1fr 200px 64px;align-items:center;gap:18px;padding:16px 22px;border-bottom:1px solid var(--cinza-linha);}
.rank-row:last-child{border-bottom:none;}
.rank-pos{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:15px;color:var(--cinza-apoio);}
.rank-name-wrap{display:flex;align-items:center;gap:10px;}
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.rank-name{font-size:14px;font-weight:600;}
.rank-bar-bg{height:8px;border-radius:99px;background:var(--cinza-superficie);overflow:hidden;}
.rank-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--dourado),var(--verde));}
.rank-score{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:16px;text-align:right;}

.radar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;}
.radar-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:18px 18px 8px;display:flex;flex-direction:column;align-items:center;}
.radar-card-head{width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.radar-card-name{font-size:14px;font-weight:600;}
.radar-card-score{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:15px;}

.table-wrap{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;overflow:hidden;}
.table-scroll{overflow-x:auto;}
.toggle-group{display:flex;background:var(--cinza-superficie);border-radius:999px;padding:3px;gap:2px;}
.toggle-btn{border:none;background:transparent;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;padding:8px 16px;border-radius:999px;cursor:pointer;color:var(--cinza-texto);}
.toggle-btn.active{background:var(--preto-tinta);color:var(--branco);}
.gestor-page table{width:100%;border-collapse:collapse;font-size:13px;}
.gestor-page thead th{text-align:left;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:var(--cinza-apoio);font-weight:600;padding:14px 16px;border-bottom:1px solid var(--cinza-linha);white-space:nowrap;}
.gestor-page thead th.num, .gestor-page td.num{text-align:right;}
.gestor-page tbody td{padding:14px 16px;border-bottom:1px solid var(--cinza-linha);white-space:nowrap;}
.gestor-page tbody tr:last-child td{border-bottom:none;}
.gestor-page td.name{font-weight:600;}
.diverg-tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;margin-left:6px;}
.diverg-alta{background:rgba(192,67,61,0.12);color:var(--vermelho);}
.diverg-media{background:rgba(200,154,46,0.15);color:var(--dourado);}
.diverg-baixa{background:rgba(61,139,95,0.12);color:var(--verde);}

.risk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.risk-card{border-radius:20px;padding:20px;border:1px solid var(--cinza-borda);background:var(--branco);}
.risk-card.nivel-risco{border-color:rgba(192,67,61,0.4);background:rgba(192,67,61,0.05);}
.risk-card.nivel-atencao{border-color:rgba(200,154,46,0.4);background:rgba(200,154,46,0.05);}
.risk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.risk-name{font-weight:700;font-size:15px;}
.risk-badge{font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:0.03em;text-transform:uppercase;}
.risk-badge.risco{background:var(--vermelho);color:var(--branco);}
.risk-badge.atencao{background:var(--dourado);color:var(--branco);}
.risk-list{margin:0;padding:0;list-style:none;font-size:12.5px;color:var(--cinza-texto);line-height:1.9;}
.risk-list li::before{content:"— ";color:var(--cinza-apoio);}

/* visão geral da rede */
.rede-stats{display:flex;gap:20px;align-items:stretch;flex-wrap:wrap;margin-bottom:24px;}
.rede-stat{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:20px 28px;text-align:center;display:flex;flex-direction:column;justify-content:center;}
.rede-stat-value{font-family:'Bricolage Grotesque',sans-serif;font-size:34px;font-weight:800;line-height:1.1;}
.rede-stat-label{font-size:12px;color:var(--cinza-apoio);margin-top:4px;}
.rede-pizza-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:16px 24px;display:flex;align-items:center;gap:20px;}
.rede-pizza-legenda{font-size:12.5px;color:var(--cinza-texto);}
.rede-pizza-legenda .legenda-item{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.rede-pizza-legenda .legenda-item:last-child{margin-bottom:0;}
.rede-pizza-legenda .legenda-dot{width:9px;height:9px;border-radius:50%;display:inline-block;}
.tabela-rede tbody tr:nth-child(even){background:var(--cinza-fundo);}
.tabela-rede tbody td{padding:16px;}
.nivel-badge{display:inline-block;font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:rgba(200,154,46,0.12);color:var(--dourado);white-space:nowrap;}
.presenca-bar-wrap{display:flex;align-items:center;gap:8px;justify-content:flex-end;}
.presenca-bar-bg{width:80px;height:6px;border-radius:999px;background:var(--cinza-superficie);overflow:hidden;flex-shrink:0;}
.presenca-bar-fill{height:100%;border-radius:999px;}
.presenca-bar-valor{font-size:12.5px;font-weight:700;min-width:34px;text-align:right;}
.status-badge{display:inline-block;font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;}
.status-badge.congelado{background:rgba(93,93,93,0.12);color:var(--cinza-texto);}
.status-badge.atencao{background:rgba(200,154,46,0.15);color:var(--dourado);}
.kanban-collapse{margin-top:24px;}
.kanban-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;background:var(--branco);border:1px solid var(--cinza-borda);border-radius:14px;padding:16px 20px;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;color:var(--preto-tinta);}
.kanban-toggle-icon{transition:transform .15s;display:inline-block;}
.kanban-toggle.aberto .kanban-toggle-icon{transform:rotate(180deg);}
.kanban-body{margin-top:14px;}
.kanban-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.kanban-col{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:16px;padding:14px;}
.kanban-col-head{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--cinza-linha);display:flex;justify-content:space-between;}
.kanban-col-critica .kanban-col-head{color:var(--vermelho);}
.kanban-col-baixa .kanban-col-head{color:#C87A2E;}
.kanban-col-atencao .kanban-col-head{color:var(--dourado);}
.kanban-col-saudavel .kanban-col-head{color:var(--verde);}
.kanban-card{background:var(--cinza-superficie);border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12px;}
.kanban-card:last-child{margin-bottom:0;}
.kanban-card-taxa{float:right;font-weight:700;}
.kanban-card-nome{font-weight:700;}
.kanban-card-conselho{font-size:10.5px;color:var(--cinza-apoio);clear:both;}

/* controle de perfis */
.perfis-grid{display:grid;grid-template-columns:1fr;gap:24px;}
.perfis-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:24px;}
.perfis-card h3{font-size:15px;margin:0 0 16px;}
.form-inline{display:flex;gap:10px;margin-bottom:8px;}
.form-inline input{flex:1;padding:11px 14px;border-radius:12px;border:1px solid var(--cinza-borda);font-size:13px;font-family:'Inter',sans-serif;}
.form-inline input.erro{border-color:var(--vermelho);}
.form-inline select{padding:11px 14px;border-radius:12px;border:1px solid var(--cinza-borda);font-size:13px;font-family:'Inter',sans-serif;background:var(--branco);}
.form-inline button{padding:11px 20px;border-radius:12px;border:none;background:var(--preto-tinta);color:var(--branco);font-weight:600;font-size:13px;cursor:pointer;}
.form-inline button:disabled{opacity:0.5;cursor:not-allowed;}
.erro-msg{color:var(--vermelho);font-size:12px;margin:0 0 16px;min-height:14px;}
.sync-desc{font-size:12px;color:var(--cinza-apoio);margin:0 0 14px;line-height:1.5;}
.lista-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--cinza-linha);gap:14px;}
.lista-item:last-child{border-bottom:none;}
.lista-item-nome{font-size:13px;font-weight:600;}
.lista-item-sub{font-size:11px;color:var(--cinza-apoio);}
.lista-item-acoes{display:flex;align-items:center;gap:16px;flex-shrink:0;}
.meta-carteira-campo{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}
.meta-carteira-campo label{font-size:9.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--cinza-apoio);}
.meta-carteira-input{width:64px;padding:6px 8px;border-radius:8px;border:1px solid var(--cinza-borda);font-size:12px;font-family:'Inter',sans-serif;text-align:center;}
.meta-aviso{font-size:10px;font-weight:600;color:var(--dourado);background:rgba(200,154,46,0.12);border-radius:999px;padding:2px 8px;white-space:nowrap;}
.btn-remover{background:none;border:1px solid var(--cinza-borda);color:var(--vermelho);font-size:11px;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;}
.btn-remover:hover{background:rgba(192,67,61,0.08);}

.pendente-item{padding:12px 0;border-bottom:1px solid var(--cinza-linha);}
.pendente-item:last-child{border-bottom:none;}
.pendente-row{display:flex;justify-content:space-between;align-items:center;gap:12px;}
.btn-vincular-toggle{background:none;border:1px solid var(--cinza-borda);color:var(--preto-tinta);font-size:11px;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;flex-shrink:0;}
.btn-vincular-toggle:hover{background:rgba(0,0,0,0.04);}
.pendente-form{margin-top:12px;padding:14px;background:var(--cinza-superficie);border-radius:14px;}
.pendente-form .form-inline{margin-bottom:10px;}
.pendente-form .form-inline:last-child{margin-bottom:0;}
.btn-cancelar-vinculo{background:none;border:1px solid var(--cinza-borda);color:var(--cinza-texto);font-weight:600;font-size:13px;padding:11px 20px;border-radius:12px;cursor:pointer;}
.switch{position:relative;width:38px;height:22px;flex-shrink:0;}
.switch input{opacity:0;width:0;height:0;}
.switch-track{position:absolute;inset:0;background:var(--cinza-superficie);border-radius:999px;cursor:pointer;transition:background .15s;}
.switch-track::before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:var(--branco);border-radius:50%;transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,0.2);}
.switch input:checked + .switch-track{background:var(--verde);}
.switch input:checked + .switch-track::before{transform:translateX(16px);}

.gestor-empty{padding:24px;color:var(--cinza-apoio);font-size:13px;}
.gestor-erro{padding:24px;color:var(--vermelho);font-size:13px;}

/* consulta rápida (pergunta em linguagem natural sobre metas, sem IA — lib/consulta.ts) */
.consulta-painel{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:24px;margin:28px 0 0;}
.consulta-titulo{font-size:15px;font-weight:700;margin:0 0 4px;}
.consulta-sub{font-size:12.5px;color:var(--cinza-texto);margin:0 0 16px;}
.consulta-form{display:flex;gap:10px;}
.consulta-form input{flex:1;min-width:0;padding:12px 16px;border-radius:12px;border:1px solid var(--cinza-borda);font-size:14px;font-family:'Inter',sans-serif;}
.consulta-form button{padding:0 22px;border-radius:12px;border:none;background:var(--preto-tinta);color:var(--branco);font-weight:600;font-size:13px;cursor:pointer;flex-shrink:0;}
.consulta-form button:disabled{opacity:0.5;cursor:not-allowed;}
.consulta-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.consulta-chip{background:none;border:1px dashed var(--cinza-borda);color:var(--cinza-texto);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
.consulta-chip:hover{background:var(--cinza-superficie);}
.consulta-chip-recente{border-style:solid;}
.consulta-resposta{margin-top:16px;padding:16px 18px;background:var(--cinza-fundo);border-radius:14px;border-left:4px solid var(--dourado);white-space:pre-wrap;font-size:13.5px;line-height:1.6;color:var(--preto-tinta);}
@media (max-width:640px){.consulta-form{flex-direction:column;}}

/* notinha clicável de pontuação/critério (Parte C, pedido do Vitor 25/09/2026) */
.info-btn{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--cinza-superficie);color:var(--cinza-texto);font-size:10px;font-weight:800;border:none;cursor:pointer;margin-left:6px;flex-shrink:0;font-family:'Inter',sans-serif;line-height:1;padding:0;}
.info-btn:hover{background:var(--cinza-linha);}
.info-btn.claro{background:rgba(255,255,255,0.16);color:#fff;}
.info-btn.claro:hover{background:rgba(255,255,255,0.3);}
.info-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100;align-items:center;justify-content:center;padding:24px;}
.info-modal-overlay.ativo{display:flex;}
.info-modal{background:var(--branco);border-radius:26px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:32px;position:relative;}
.info-modal-close{position:absolute;top:20px;right:20px;width:32px;height:32px;border-radius:50%;background:var(--cinza-fundo);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--cinza-texto);}
.info-modal-close:hover{background:var(--cinza-superficie);}
.info-modal-titulo{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;color:var(--preto-tinta);margin-bottom:4px;padding-right:30px;}
.info-modal-sub{font-size:12.5px;color:var(--cinza-texto);margin-bottom:16px;}
.score-detalhe-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--cinza-linha);font-size:12px;color:var(--cinza-texto);}
.score-detalhe-row:last-child{border-bottom:none;}
.score-detalhe-label{flex:1;color:var(--preto-tinta);font-weight:600;}
.score-detalhe-peso{color:var(--cinza-apoio);font-size:11px;}
.score-detalhe-valor{color:var(--cinza-apoio);white-space:nowrap;}
.score-detalhe-pontos{font-weight:800;color:var(--preto-tinta);white-space:nowrap;min-width:56px;text-align:right;}
.info-modal-rodape{font-size:11.5px;color:var(--cinza-apoio);margin-top:14px;line-height:1.6;}
.config-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:24px;display:flex;align-items:center;gap:16px;justify-content:space-between;}
.config-card-desc{font-size:12.5px;color:var(--cinza-texto);line-height:1.6;max-width:520px;}
.config-card-status{font-size:11px;font-weight:700;color:var(--cinza-apoio);margin-top:6px;}

footer.footnote{margin-top:60px;padding-top:20px;border-top:1px solid var(--cinza-linha);font-size:11.5px;color:var(--cinza-apoio);}

/* matriz de metas (Parte G, 29/09/2026) */
#tabelaMatrizMetas{border-collapse:separate;border-spacing:0;}
#tabelaMatrizMetas th, #tabelaMatrizMetas td{white-space:nowrap;}
#tabelaMatrizMetas thead th:first-child, #tabelaMatrizMetas tbody td:first-child{
  position:sticky;left:0;background:var(--branco);z-index:1;text-align:left;font-weight:600;
}
.matriz-input{width:64px;padding:6px 8px;border-radius:8px;border:1px solid var(--cinza-borda);font-size:12.5px;font-family:'Inter',sans-serif;text-align:center;}
.matriz-input.herdado{border-style:dashed;color:var(--cinza-apoio);background:var(--cinza-fundo);}
.matriz-input.alterado{border-color:var(--dourado);background:rgba(200,154,46,0.08);}
.matriz-input.invalido{border-color:var(--vermelho);}
.matriz-col-time{background:rgba(200,154,46,0.06);}
#btnSalvarMatriz{padding:11px 22px;border-radius:12px;border:none;background:var(--preto-tinta);color:var(--branco);font-weight:600;font-size:13px;cursor:pointer;}
#btnSalvarMatriz:disabled{opacity:0.4;cursor:not-allowed;}
.ordem-setas{display:inline-flex;gap:4px;}
.ordem-seta{background:none;border:1px solid var(--cinza-borda);border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:11px;line-height:1;color:var(--preto-tinta);}
.ordem-seta:disabled{opacity:0.3;cursor:not-allowed;}

/* churn (onda 1, 30/09/2026) — gráfico vem pronto do servidor (graficoChurnSVG em lib/churn.ts) */
.churn-filtros{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;}
.churn-filtros label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--cinza-texto);}
.churn-filtros select{max-width:240px;}
.churn-descricao{font-size:12.5px;color:var(--cinza-apoio);margin:0 0 14px;}
.churn-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:22px 22px 16px;}
.churn-resumo{display:flex;gap:28px;flex-wrap:wrap;margin-bottom:10px;}
.churn-resumo b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:30px;line-height:1.1;}
.churn-resumo span{font-size:12px;color:var(--cinza-apoio);}
.churn-legenda{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--cinza-texto);margin-top:10px;}
.churn-legenda span.item{display:inline-flex;align-items:center;gap:6px;}
.churn-grafico .churn-seg:hover path{opacity:0.82;}
.churn-grafico .churn-col:hover rect{fill:rgba(0,0,0,0.03);}
#churnGrafico{overflow-x:auto;}
.churn-tabela-wrap{margin-top:16px;}
.churn-status{font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;background:var(--cinza-superficie);color:var(--cinza-texto);white-space:nowrap;}
.churn-status.ia{background:rgba(200,154,46,0.15);color:var(--dourado);}
.churn-status.salva{background:rgba(26,26,26,0.08);color:var(--preto-tinta);}
.churn-status.publicada{background:rgba(61,139,95,0.14);color:var(--verde);}
.churn-aviso{font-size:12.5px;line-height:1.55;border-radius:12px;padding:10px 14px;margin-bottom:12px;background:rgba(200,154,46,0.08);border:1px solid rgba(200,154,46,0.45);}
.churn-aviso button{background:none;border:none;padding:0;margin-left:6px;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;color:var(--preto-tinta);}
#churnTexto{width:100%;min-height:260px;padding:14px 16px;border-radius:14px;border:1px solid var(--cinza-borda);font-family:'Inter',sans-serif;font-size:13.5px;line-height:1.65;resize:vertical;color:var(--preto-tinta);}
#churnTexto:focus{outline:none;border-color:var(--preto-tinta);}
.churn-acoes{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center;}
.churn-acoes button,.churn-acoes a{padding:11px 18px;border-radius:12px;font-weight:600;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.churn-acoes button.primario{background:var(--preto-tinta);color:var(--branco);border-color:var(--preto-tinta);}
.churn-acoes button:disabled{opacity:0.45;cursor:not-allowed;}
.churn-meta{font-size:11.5px;color:var(--cinza-apoio);margin:8px 0 0;line-height:1.5;}
.churn-tabela th{text-align:left;}
.churn-campo{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--cinza-texto);}
.ms{position:relative;}
.ms-btn{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ms-pop{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:250px;max-height:340px;overflow-y:auto;background:var(--branco);border:1px solid var(--cinza-borda);border-radius:16px;padding:10px 12px;box-shadow:0 12px 32px rgba(26,26,26,0.12);}
.ms-pop[hidden]{display:none;}
.ms-acoes{display:flex;gap:14px;padding:2px 2px 8px;border-bottom:1px solid var(--cinza-superficie);margin-bottom:6px;}
.ms-acoes button{background:none;border:none;padding:0;font:inherit;font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer;color:var(--preto-tinta);}
.ms-op{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:13px;font-weight:500;color:var(--preto-tinta);cursor:pointer;}
.ms-op input{width:16px;height:16px;accent-color:var(--preto-tinta);flex-shrink:0;}
.ms-op .qtd{margin-left:auto;font-size:11px;color:var(--cinza-apoio);font-weight:600;}
.ms-sep{border-top:1px solid var(--cinza-superficie);margin:6px 0 2px;padding-top:4px;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;color:var(--cinza-apoio);font-weight:700;}
.churn-topo{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;margin-bottom:16px;align-items:start;}
.churn-topo .churn-card{margin:0;}
.churn-com{border-style:dashed;}
.churn-com h3{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;margin:0;}
.churn-com-cab{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;}
.churn-com-pill{font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--cinza-superficie);color:var(--cinza-texto);white-space:nowrap;}
.churn-com-pill.dentro{background:rgba(200,154,46,0.15);color:var(--dourado);}
.churn-com-num b{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;line-height:1.1;display:block;}
.churn-com-num span{font-size:12px;color:var(--cinza-apoio);}
.churn-com-soma{font-size:12px;color:var(--cinza-texto);margin:8px 0 10px;line-height:1.5;}
.churn-com-lista{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;}
.churn-com-lista span{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--cinza-fundo);color:var(--cinza-texto);}
.churn-com table{width:100%;font-size:12px;margin-top:6px;}
.churn-com td,.churn-com th{padding:5px 4px;}
.rec-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(200,154,46,0.15);color:var(--dourado);margin-left:6px;white-space:nowrap;}
.rec-sub{display:block;font-size:11px;color:var(--cinza-apoio);font-weight:500;}

@media (max-width:640px){
  .hero{padding:38px 24px 34px;} .hero h1{font-size:26px;} .hero-stats{gap:26px;}
  .rank-row{grid-template-columns:24px 1fr 44px;} .rank-bar-wrap{display:none;}
  .form-inline{flex-direction:column;}
  .kanban-grid{grid-template-columns:1fr;}
  .rede-stats{flex-direction:column;align-items:stretch;}
  .tabs{overflow-x:auto;}
  .tab-btn{margin-right:16px;white-space:nowrap;}
  .churn-card{padding:16px 12px 12px;}
  .churn-topo{grid-template-columns:minmax(0,1fr);}
  .churn-campo{width:100%;justify-content:space-between;}
  .ms-pop{left:auto;right:0;min-width:min(280px,86vw);}
  #churnGrafico svg{min-width:560px;}
  .churn-filtros label{width:100%;justify-content:space-between;}
  .churn-filtros select{max-width:62%;}
  .churn-acoes button,.churn-acoes a{flex:1 1 45%;text-align:center;}
}
`;

export const GESTOR_HTML = `
<div class="gestor-page">
<div class="page">

  <header class="topbar">
    <div class="topbar-left">
      <a href="/" class="voltar-btn">&larr; Voltar</a>
      <span class="topbar-divider"></span>
      <span class="logo-mark">MOAI</span>
      <span class="topbar-divider"></span>
      <span class="topbar-title">Visão da área · perfil gestor</span>
    </div>
    <div class="topbar-right">
      <select class="pill-select" id="selMesGestor"></select>
      <select class="pill-select" id="selAnoGestor"><option>2026</option><option>2027</option></select>
      <span class="pill">Acesso restrito a gestores</span>
    </div>
  </header>

  <section class="consulta-painel" id="consultaPainel">
    <h2 class="consulta-titulo">Consulta rápida</h2>
    <p class="consulta-sub">Pergunte em português sobre metas do time ou de um CS. A resposta usa os mesmos dados e regras de cálculo do resto do painel, sem custo de IA por pergunta.</p>
    <div class="consulta-form">
      <input type="text" id="consultaInput" maxlength="300" placeholder="Ex.: quais metas o Rodrigo bateu e não bateu?">
      <button id="consultaBtn" type="button">Consultar</button>
    </div>
    <div class="consulta-chips" id="consultaChipsExemplo">
      <button class="consulta-chip" type="button" data-pergunta="Quais metas o Rodrigo bateu e não bateu">Quais metas o Rodrigo bateu e não bateu</button>
      <button class="consulta-chip" type="button" data-pergunta="O que a Luana não bateu em agosto">O que a Luana não bateu em agosto</button>
      <button class="consulta-chip" type="button" data-pergunta="Metas do time neste mês">Metas do time neste mês</button>
    </div>
    <div class="consulta-chips" id="consultaChipsRecentes"></div>
    <div id="consultaRespostaWrap"></div>
  </section>

  <div class="tabs">
    <button class="tab-btn active" data-tab="visaoGeral">Visão geral</button>
    <button class="tab-btn" data-tab="controlePerfis">Controle de perfis</button>
    <button class="tab-btn" data-tab="metasDestaques">Metas e destaques</button>
    <button class="tab-btn" data-tab="churn">Churn</button>
  </div>

  <div class="tab-panel active" id="tab-visaoGeral">
    <section class="hero">
      <div class="hero-content">
        <span class="hero-eyebrow">DESEMPENHO REAL · SEM MÁSCARA</span>
        <h1>Como a área de CS está de verdade</h1>
        <p class="hero-sub">Todo indicador abaixo usa só o valor calculado a partir do Monday. O autodeclarado aparece à parte, nunca substituindo o real.</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><span class="hero-stat-value" id="statScore">—</span><span class="hero-stat-label">Score médio da área</span></div>
        <div class="hero-stat"><span class="hero-stat-value" id="statRisco">—</span><span class="hero-stat-label" id="statRiscoLabel">CS em risco</span></div>
        <div class="hero-stat"><span class="hero-stat-value" id="statDiverg">—</span><span class="hero-stat-label">Divergência média real × autodeclarado</span></div>
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <div>
          <h2>Ranking ponderado</h2>
          <p>Pontuação única por CS (score real, já calculado no servidor), só com valor calculado.</p>
        </div>
        <label class="toggle-inline" title="Também afeta o radar por CS abaixo">
          <input type="checkbox" id="chkExMembros">
          <span>Mostrar ex-membros</span>
        </label>
      </div>
      <div class="ranking-list" id="rankingList"><div class="gestor-empty">Carregando…</div></div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Radar por CS</h2>
        <p>Os nove indicadores acompanhados pela área, normalizados a 100% = meta batida.</p>
      </div>
      <div class="radar-grid" id="radarGrid"></div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Tabela comparativa</h2>
        <div class="toggle-group">
          <button class="toggle-btn active" data-mode="calculado">Só valor real</button>
          <button class="toggle-btn" data-mode="divergencia">Real × autodeclarado</button>
        </div>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table>
          <thead><tr id="tabelaHead"></tr></thead>
          <tbody id="tabelaBody"></tbody>
        </table>
      </div></div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Sinalizadores de risco</h2><p>Alertas já calculados no servidor (indicador abaixo da meta ou divergência alta entre o real e o autodeclarado).</p></div>
      <div class="risk-grid" id="riskGrid"></div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Visão geral da rede</h2>
        <p>Todos os conselhos ativos, agregados no mesmo período selecionado acima — não é sobre nenhum CS em específico.</p>
      </div>
      <div class="rede-stats">
        <div class="rede-stat"><span class="rede-stat-value" id="redeStatMembros">—</span><span class="rede-stat-label">Membros na rede</span></div>
        <div id="redePizzaWrap"></div>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="tabela-rede">
          <thead><tr><th>Conselheiro</th><th>Nível</th><th class="num">Membros</th><th class="num">Presença</th><th>Status</th></tr></thead>
          <tbody id="redeTabelaBody"></tbody>
        </table>
      </div></div>
      <div class="kanban-collapse">
        <button class="kanban-toggle" id="btnToggleKanban" type="button">
          <span id="kanbanToggleLabel">Presença por membro</span>
          <span class="kanban-toggle-icon">▾</span>
        </button>
        <div class="kanban-body" id="kanbanBody" style="display:none">
          <div class="kanban-grid" id="kanbanGrid"></div>
        </div>
      </div>
    </section>
  </div>

  <div class="tab-panel" id="tab-controlePerfis">
    <div class="config-card" style="margin-bottom:24px;">
      <div>
        <h3 style="margin:0 0 6px;">Indicadores do time na home do CS</h3>
        <div class="config-card-desc">Liga ou desliga, pra todo mundo que não é gestor de uma vez, a parte numérica dos indicadores agregados do time nos cards da home individual (o medidor visual nunca é afetado, sempre mostra o progresso real). Nasce desligado — indicadores borrados por padrão.</div>
        <div class="config-card-status" id="statusRevelar">Carregando…</div>
      </div>
      <label class="switch" style="flex-shrink:0;">
        <input type="checkbox" id="chkRevelarIndicadores">
        <span class="switch-track"></span>
      </label>
    </div>
    <div class="perfis-grid">
      <div class="perfis-card">
        <h3>Gestores</h3>
        <div class="form-inline">
          <input type="email" id="inputNovoGestor" placeholder="email@moaiclubedelideres.com">
          <button id="btnAddGestor">Adicionar</button>
        </div>
        <p class="erro-msg" id="erroGestor"></p>
        <div id="listaGestores"></div>
      </div>
      <div class="perfis-card">
        <h3>Acesso de login por CS</h3>
        <p class="sync-desc">Vincula o e-mail de login (Google, @moaiclubedelideres.com) ao perfil de CS correspondente — é esse vínculo que faz a home de um CS comum saber quais são "os próprios números" (Parte A). Sem vínculo, o CS vê uma tela vazia pedindo pra falar com o gestor.</p>
        <div class="form-inline">
          <input type="email" id="inputEmailCS" placeholder="email@moaiclubedelideres.com">
          <select id="selectCSParaVincular"></select>
          <button id="btnVincularCS">Vincular</button>
        </div>
        <p class="erro-msg" id="erroVinculoCS"></p>
        <div id="listaVinculosCS"></div>
      </div>
      <div class="perfis-card">
        <h3>CS ativos</h3>
        <div id="listaCS"></div>
      </div>
      <div class="perfis-card">
        <h3>Catálogo de advertência</h3>
        <p class="sync-desc">Nome, pontos e validade de cada tipo. Desativar tira do formulário de aplicar em "Advertências" no perfil do CS, mas mantém o histórico de quem já recebeu (a aplicação guarda uma cópia congelada, não muda com edição no catálogo).</p>
        <div class="form-inline" style="flex-wrap:wrap;">
          <input type="text" id="advTipoNome" placeholder="Nome do tipo" style="flex:2;min-width:140px;">
          <input type="number" id="advTipoPontos" placeholder="Pontos" min="0" style="flex:1;min-width:80px;">
          <input type="number" id="advTipoValidade" placeholder="Validade (meses)" min="1" style="flex:1;min-width:120px;">
          <button onclick="criarAdvertenciaTipoClick()">Adicionar</button>
        </div>
        <p class="erro-msg" id="erroAdvTipo"></p>
        <div id="listaAdvTipos"></div>
      </div>
      <div class="perfis-card">
        <h3 id="tituloNaoVinculados">Detectados, ainda não vinculados</h3>
        <p class="sync-desc">Nomes de CS encontrados nos dados do Monday (conselheiros, rounds, cases, upsell/downsell, churn) que ainda não têm perfil em "CS ativos". Clique em "Vincular" para criar o perfil.</p>
        <div id="listaNaoVinculados"></div>
      </div>
    </div>
  </div>

  <div class="tab-panel" id="tab-metasDestaques">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Matriz de metas</h2>
          <p>Meta por indicador, um mês de cada vez. A coluna Time é independente da soma das colunas de CS — cada uma vale por si (ex.: um round com vários CS conta 1 pro time, não a soma).</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <select class="pill-select" id="selMesMatriz"></select>
          <select class="pill-select" id="selAnoMatriz"><option>2026</option><option>2027</option></select>
          <label class="toggle-inline"><input type="checkbox" id="chkMostrarOcultosMatriz"><span>Mostrar ocultos</span></label>
          <button class="btn-remover" id="btnCopiarMesAnterior" style="color:var(--preto-tinta);">Copiar do mês anterior</button>
        </div>
      </div>
      <p class="erro-msg" id="avisoMesPassadoMatriz" style="color:var(--dourado);display:none;">Este é um mês passado — alterar a meta muda a pontuação retroativa já calculada, e fica registrado na auditoria.</p>
      <p class="erro-msg" id="erroMatriz"></p>
      <div class="table-wrap"><div class="table-scroll">
        <table id="tabelaMatrizMetas"><thead><tr id="matrizHead"></tr></thead><tbody id="matrizBody"><tr><td class="gestor-empty">Carregando…</td></tr></tbody></table>
      </div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
        <span id="statusMatriz" style="font-size:12px;color:var(--cinza-apoio);"></span>
        <button id="btnSalvarMatriz" disabled>Salvar alterações</button>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Indicadores da home</h2><p>Quais cards aparecem nos cards de time da home, em que ordem, e se mostram o selo de recorde. Não afeta a página individual do CS nem a Visão da área.</p></div>
      <p class="erro-msg" id="erroIndicadoresHome"></p>
      <div class="table-wrap"><div class="table-scroll">
        <table><thead><tr><th>Indicador</th><th class="num">Visível</th><th class="num">Ordem</th><th class="num">Recorde</th></tr></thead>
          <tbody id="listaIndicadoresHome"><tr><td class="gestor-empty" colspan="4">Carregando…</td></tr></tbody>
        </table>
      </div></div>
    </section>

    <section class="block">
      <div class="block-head">
        <div>
          <h2>Recordes calculados</h2>
          <p>Todo recorde sai do histórico inteiro do Monday e se atualiza a cada sincronização. Nada aqui é digitado. Para churn e downsell, recorde significa o maior valor já registrado em um mês. O mês corrente conta e leva o selo em andamento até fechar.</p>
        </div>
        <label class="churn-campo">Visão <select class="pill-select" id="recVisao"><option value="">Time</option></select></label>
      </div>
      <div class="table-wrap"><div class="table-scroll">
        <table class="churn-tabela"><thead><tr><th>Indicador</th><th class="num">Mês atual</th><th class="num">Meta</th><th>Recorde mensal</th><th>Diferença</th><th>Recorde semanal</th><th>Série desde</th></tr></thead>
          <tbody id="listaRecordesCalculados"><tr><td class="gestor-empty" colspan="7">Carregando…</td></tr></tbody>
        </table>
      </div></div>
      <p class="churn-meta" id="recordesMeta"></p>
      <p class="erro-msg" id="erroRecordesCalculados"></p>
    </section>

    <section class="block">
      <div class="block-head"><h2>Recordes anteriores ao histórico</h2><p>Pro recorde de antes da sincronização começar (ex.: um mês excepcional em 2025). Opcional — sem isso, o recorde considera só o histórico espelhado.</p></div>
      <div class="perfis-card">
        <div class="form-inline" style="flex-wrap:wrap;">
          <select id="recIndicador" style="flex:1;min-width:160px;"></select>
          <select id="recEscopo" style="flex:1;min-width:110px;"><option value="time">Time</option><option value="cs">Um CS</option></select>
          <select id="recCS" style="flex:1;min-width:140px;display:none;"></select>
          <input type="number" id="recValor" placeholder="Valor" style="flex:1;min-width:90px;">
          <input type="month" id="recMes" style="flex:1;min-width:140px;">
        </div>
        <div class="form-inline">
          <input type="text" id="recObs" placeholder="Observação (opcional)" style="flex:2;">
          <button id="btnSalvarRecordeManual">Salvar</button>
        </div>
        <p class="erro-msg" id="erroRecordeManual"></p>
        <div id="listaRecordesManuais"></div>
      </div>
    </section>
  </div>

  <div class="tab-panel" id="tab-churn">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Churn por motivo</h2>
          <p>Quantos membros saíram e por quê, pelo motivo declarado no formulário de saída do Monday. A data do churn é a data informada no formulário ou, na falta dela, o dia em que o item foi criado.</p>
        </div>
        <div class="toggle-group" id="churnGranularidade">
          <button class="toggle-btn active" type="button" data-gran="mes">Por mês</button>
          <button class="toggle-btn" type="button" data-gran="semana">Por semana</button>
        </div>
      </div>
      <div class="churn-filtros">
        <label>Mês de referência <select class="pill-select" id="churnRef"></select></label>
        <label>CS <select class="pill-select" id="churnCs"><option value="">Todos</option></select></label>
        <div class="churn-campo">Produtos
          <div class="ms" id="churnProdutoWrap">
            <button type="button" class="pill-select ms-btn" id="churnProdutoBtn" aria-haspopup="true" aria-expanded="false">Carregando…</button>
            <div class="ms-pop" id="churnProdutoPop" role="group" aria-label="Produtos" hidden>
              <div class="ms-acoes"><button type="button" id="churnProdutoTodos">Selecionar todos</button><button type="button" id="churnProdutoLimpar">Limpar</button></div>
              <div id="churnProdutoOpcoes"></div>
            </div>
          </div>
        </div>
      </div>
      <p class="churn-descricao" id="churnDescricao"></p>
      <div class="churn-topo">
        <div class="churn-card">
          <div class="churn-resumo" id="churnResumo"></div>
          <div id="churnGrafico"><div class="gestor-empty">Carregando…</div></div>
          <div class="churn-legenda" id="churnLegenda"></div>
        </div>
        <div class="churn-card churn-com" id="churnComunidade" aria-live="polite"><div class="gestor-empty">Carregando…</div></div>
      </div>
      <div class="table-wrap churn-tabela-wrap"><div class="table-scroll" id="churnTabela"></div></div>
    </section>

    <section class="block">
      <div class="block-head">
        <div>
          <h2>Análise do churn</h2>
          <p>A IA escreve um rascunho a partir dos números e dos textos anonimizados deste recorte, você edita e salva. O relatório usa somente o texto salvo por você.</p>
        </div>
        <span class="churn-status" id="churnStatus">Sem análise</span>
      </div>
      <div class="churn-card">
        <div class="churn-aviso" id="churnAvisoDesatualizada" style="display:none">Entraram ou saíram churns deste recorte depois que esta análise foi gerada ou salva. Vale revisar o texto antes de emitir o relatório.</div>
        <div class="churn-aviso" id="churnAvisoRascunho" style="display:none">Este é o rascunho mais recente da IA e ainda não foi salvo.<button type="button" id="churnBtnVoltarSalvo">Voltar ao texto salvo</button></div>
        <div class="churn-aviso" id="churnAvisoIA" style="display:none"></div>
        <textarea id="churnTexto" placeholder="Escreva aqui por que os membros deste recorte deram churn, ou gere um rascunho com a IA e edite."></textarea>
        <div class="churn-acoes">
          <button type="button" id="churnBtnGerar">Gerar rascunho com IA</button>
          <button type="button" class="primario" id="churnBtnSalvar">Salvar análise</button>
          <button type="button" id="churnBtnPublicar">Publicar</button>
          <a id="churnBtnRelatorio" href="#" target="_blank" rel="noopener">Emitir relatório</a>
        </div>
        <p class="erro-msg" id="churnErro" style="margin:10px 0 0;"></p>
        <p class="churn-meta" id="churnMeta"></p>
      </div>
    </section>
  </div>

  <footer class="footnote">Visão restrita a gestores · valores calculados pelo sistema, sem a máscara do autodeclarado.</footer>
</div>
</div>
<div class="info-modal-overlay" id="infoModalOverlay" onclick="if(event.target===this) fecharInfoModal()">
  <div class="info-modal">
    <div class="info-modal-close" onclick="fecharInfoModal()">✕</div>
    <div id="infoModalBody"></div>
  </div>
</div>
`;

export const GESTOR_SCRIPT = `
function fetchJSON_(url, opts) {
  opts = opts || {};
  opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    // Sessão expirada ou domínio não autorizado (401/403 de requireMoaiUser() em qualquer rota):
    // manda de volta pro /login em vez de deixar a tela tentar renderizar um erro genérico.
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/login';
      return new Promise(function () {});
    }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
      return data;
    });
  });
}

var ENDPOINT_VISAO_GERAL = '/api/gestor/visao-geral';
var ENDPOINT_GESTORES = '/api/gestor/gestores';
var ENDPOINT_CS_ROSTER = '/api/gestor/cs-roster';
var ENDPOINT_VINCULAR_CS = '/api/gestor/vincular-cs';
var ENDPOINT_CONFIG = '/api/config';
var ENDPOINT_GESTOR_CONFIG = '/api/gestor/config';
var ENDPOINT_CS_USUARIOS = '/api/gestor/cs-usuarios';
var ENDPOINT_ADVERTENCIA_TIPOS = '/api/gestor/advertencia-tipos';
var ENDPOINT_CONSULTA = '/api/consulta';

// ============ notinha clicável (Parte C, pedido do Vitor 25/09/2026) ============
// Modal genérico reaproveitado em dois lugares: detalhamento item a item de uma pontuação
// ponderada (mesma fórmula/pesos de sempre, calcularScoreCS/detalharScoreCS em lib/reports.ts,
// nunca recalculado aqui) e o critério completo por trás de um status de conselho (ex. "Em
// atenção"). Os dois só desenham o que o servidor já mandou pronto.
function fecharInfoModal(){ document.getElementById('infoModalOverlay').classList.remove('ativo'); }

var SCORE_MODAL_DATA_ = [];
function registrarScoreModal_(nome, score, detalhamento){
  SCORE_MODAL_DATA_.push({ nome: nome, score: score, detalhamento: detalhamento || [] });
  return SCORE_MODAL_DATA_.length - 1;
}
function abrirScoreModal(idx){
  var d = SCORE_MODAL_DATA_[idx];
  if (!d) return;
  var linhas = d.detalhamento.map(function (item) {
    var val = (item.valorAlcancado === null || item.valorAlcancado === undefined) ? '—' : item.valorAlcancado;
    var meta = (item.meta === null || item.meta === undefined) ? '—' : item.meta;
    var ach = (item.achievementPct === null || item.achievementPct === undefined) ? '—' : item.achievementPct + '%';
    var avisoMeta = item.semMetaPropria ? '<span class="meta-aviso" title="Sem meta própria cadastrada — usando o maior número de conselhos do time como fallback.">sem meta própria</span>' : '';
    return '<div class="score-detalhe-row">'
      + '<span class="score-detalhe-label">' + item.label + avisoMeta + '</span>'
      + '<span class="score-detalhe-peso">peso ' + item.peso + '</span>'
      + '<span class="score-detalhe-valor">' + val + ' / ' + meta + ' · ' + ach + '</span>'
      + '<span class="score-detalhe-pontos">' + item.pontos + ' pts</span>'
      + '</div>';
  }).join('');
  document.getElementById('infoModalBody').innerHTML =
    '<div class="info-modal-titulo">' + d.nome + '</div>'
    + '<div class="info-modal-sub">Pontuação: ' + (d.score === null || d.score === undefined ? '—' : d.score) + '</div>'
    + linhas
    + '<div class="info-modal-rodape">Pontos = peso × aproveitamento de cada indicador na meta. A soma dos pontos é a pontuação final (0–100) — mesma fórmula ponderada de sempre, só exposta item a item.</div>';
  document.getElementById('infoModalOverlay').classList.add('ativo');
}

var CRITERIO_MODAL_DATA_ = [];
function registrarCriterioModal_(titulo, corpo){
  CRITERIO_MODAL_DATA_.push({ titulo: titulo, corpo: corpo });
  return CRITERIO_MODAL_DATA_.length - 1;
}
function abrirCriterioModal(idx){
  var d = CRITERIO_MODAL_DATA_[idx];
  if (!d) return;
  document.getElementById('infoModalBody').innerHTML = '<div class="info-modal-titulo">' + d.titulo + '</div>' + d.corpo;
  document.getElementById('infoModalOverlay').classList.add('ativo');
}

// ============ tabs ============

document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'controlePerfis') { carregarGestores(); carregarCSRoster(); carregarConfigRevelar(); carregarVinculosCS(); carregarAdvertenciaTipos(); }
    if (btn.dataset.tab === 'metasDestaques' && !metasDestaquesCarregado) { metasDestaquesCarregado = true; inicializarMetasDestaques(); }
    if (btn.dataset.tab === 'churn' && !churnCarregado) { churnCarregado = true; inicializarChurn(); }
  });
});

// ============ radar SVG (feito à mão, sem lib externa) ============
// Eixos e valores (escala 0-150, 100 = bateu a meta, capado em 150) vêm prontos do back-end em
// data.radarEixos / cs.radar — este código só desenha, nunca recalcula.

function polarPonto(cx, cy, r, i, total) {
  var a = (Math.PI * 2 * i / total) - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function radarSVG(labels, valores, gradId) {
  var size = 240, cx = size / 2, cy = size / 2 - 6, rMax = 84, total = labels.length;
  var svg = '<svg width="' + size + '" height="' + (size + 18) + '" viewBox="0 0 ' + size + ' ' + (size + 18) + '">';
  [{ f: 50 / 150, dash: '3,3' }, { f: 100 / 150, dash: '0' }, { f: 1, dash: '3,3' }].forEach(function (anel) {
    var pts = '';
    for (var i = 0; i < total; i++) { var p = polarPonto(cx, cy, rMax * anel.f, i, total); pts += p.x + ',' + p.y + ' '; }
    svg += '<polygon points="' + pts + '" fill="none" stroke="#D8D5D5" stroke-width="1" stroke-dasharray="' + anel.dash + '"/>';
  });
  for (var i = 0; i < total; i++) {
    var p = polarPonto(cx, cy, rMax, i, total);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x + '" y2="' + p.y + '" stroke="#D8D5D5" stroke-width="1"/>';
    var lp = polarPonto(cx, cy, rMax + 16, i, total);
    var anchor = 'middle'; if (lp.x > cx + 4) anchor = 'start'; else if (lp.x < cx - 4) anchor = 'end';
    svg += '<text x="' + lp.x + '" y="' + lp.y + '" font-size="8" fill="#9F9F9F" font-family="Inter,sans-serif" text-anchor="' + anchor + '" dominant-baseline="middle">' + labels[i] + '</text>';
  }
  var pts = '';
  for (var i = 0; i < total; i++) { var v = Math.max(0, Math.min(150, valores[i] || 0)) / 150; var p = polarPonto(cx, cy, rMax * v, i, total); pts += p.x + ',' + p.y + ' '; }
  svg += '<polygon points="' + pts + '" fill="url(#' + gradId + ')" stroke="#C89A2E" stroke-width="1.6" fill-opacity="0.55"/>';
  for (var i = 0; i < total; i++) { var v = Math.max(0, Math.min(150, valores[i] || 0)) / 150; var p = polarPonto(cx, cy, rMax * v, i, total); svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="2.3" fill="#141414"/>'; }
  svg += '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C89A2E"/><stop offset="100%" stop-color="#3D8B5F"/></linearGradient></defs></svg>';
  return svg;
}

// ============ visão geral ============
// classificarScore() é só um agrupamento visual (3 faixas) do scoreReal que já vem pronto do
// back-end (calcularScoreCS, reaproveitado em montarVisaoGestorCS) — não recalcula o score, só
// decide a cor/rótulo do badge a partir do número que a API já mandou.
function classificarScore(scoreReal) {
  if (scoreReal === null || scoreReal === undefined) return { nivel: 'sem_dado', cor: 'var(--cinza-apoio)', label: 'Sem dado' };
  if (scoreReal >= 75) return { nivel: 'ok', cor: 'var(--verde)', label: 'Saudável' };
  if (scoreReal >= 55) return { nivel: 'atencao', cor: 'var(--dourado)', label: 'Atenção' };
  return { nivel: 'risco', cor: 'var(--vermelho)', label: 'Risco' };
}

var DADOS = null;

function renderHero() {
  var scores = DADOS.porCS.map(function (c) { return c.scoreReal; }).filter(function (v) { return v !== null && v !== undefined; });
  var scoreMedio = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : null;
  document.getElementById('statScore').textContent = scoreMedio === null ? '—' : scoreMedio;
  document.getElementById('statRisco').textContent = DADOS.csAbaixoDaMeta;
  document.getElementById('statRiscoLabel').textContent = DADOS.csAbaixoDaMeta + ' CS com pelo menos um indicador abaixo da meta';
  var divergs = DADOS.porCS.map(function (c) { return c.indiceDivergencia || 0; });
  var divergMedia = divergs.length ? Math.round(divergs.reduce(function (a, b) { return a + b; }, 0) / divergs.length) : 0;
  document.getElementById('statDiverg').textContent = divergMedia;
}

function renderRanking() {
  var el = document.getElementById('rankingList');
  if (!DADOS.ranking.length) { el.innerHTML = '<div class="gestor-empty">Sem dados suficientes neste período.</div>'; return; }
  var maxScore = Math.max.apply(null, DADOS.ranking.map(function (r) { return r.scoreReal || 0; }).concat([1]));
  el.innerHTML = DADOS.ranking.map(function (r, i) {
    var status = classificarScore(r.scoreReal);
    var pct = maxScore > 0 ? (r.scoreReal / maxScore * 100) : 0;
    var idxModal = registrarScoreModal_(r.nome, r.scoreReal, r.detalhamento);
    return '<div class="rank-row"><span class="rank-pos">' + (i + 1) + '</span>'
      + '<div class="rank-name-wrap"><span class="status-dot" style="background:' + status.cor + '"></span><span class="rank-name">' + r.nome + '</span></div>'
      + '<div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:' + pct.toFixed(0) + '%"></div></div></div>'
      + '<span class="rank-score">' + (r.scoreReal === null || r.scoreReal === undefined ? '—' : r.scoreReal) + '<button class="info-btn" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta">ⓘ</button></span></div>';
  }).join('');
}

function renderRadares() {
  var el = document.getElementById('radarGrid');
  el.innerHTML = '';
  DADOS.porCS.forEach(function (cs, idx) {
    var status = classificarScore(cs.scoreReal);
    var idxModal = registrarScoreModal_(cs.nome, cs.scoreReal, cs.detalhamento);
    var card = document.createElement('div'); card.className = 'radar-card';
    card.innerHTML = '<div class="radar-card-head"><span class="radar-card-name">' + cs.nome + '</span><span class="radar-card-score" style="color:' + status.cor + '">' + (cs.scoreReal === null || cs.scoreReal === undefined ? '—' : cs.scoreReal) + '<button class="info-btn" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta">ⓘ</button></span></div>'
      + radarSVG(DADOS.radarEixos, cs.radar, 'gradFill_' + idx);
    el.appendChild(card);
  });
}

function divergTag(manual, calc) {
  if (manual === null || manual === undefined) return '';
  if (calc === manual) return '<span class="diverg-tag diverg-baixa">sem divergência</span>';
  var base = Math.max(calc, 1);
  var diff = Math.abs(manual - calc) / base;
  if (diff < 0.3) return '<span class="diverg-tag diverg-baixa">+' + Math.round(diff * 100) + '%</span>';
  if (diff < 0.6) return '<span class="diverg-tag diverg-media">+' + Math.round(diff * 100) + '%</span>';
  return '<span class="diverg-tag diverg-alta">+' + Math.round(diff * 100) + '%</span>';
}

function renderTabelaHead() {
  var thead = document.getElementById('tabelaHead');
  thead.innerHTML = '<th>CS</th>' + DADOS.indicadoresOrdem.map(function (k) {
    return '<th class="num">' + (DADOS.labelsIndicador[k] || k) + '</th>';
  }).join('') + '<th class="num">Score</th>';
}
function renderTabela(modo) {
  var body = document.getElementById('tabelaBody'); body.innerHTML = '';
  var ordenado = [...DADOS.porCS].sort(function (a, b) { return (b.scoreReal || 0) - (a.scoreReal || 0); });
  ordenado.forEach(function (cs) {
    var status = classificarScore(cs.scoreReal);
    var celulas = DADOS.indicadoresOrdem.map(function (k) {
      var i = cs.indicadores[k];
      var unidade = i.unidade === '%' ? '%' : '';
      var valor = (i.calculado === null || i.calculado === undefined) ? '—' : (i.calculado + unidade);
      if (modo === 'divergencia' && i.manual !== null && i.manual !== undefined) {
        return '<td class="num">' + valor + ' <span style="color:var(--cinza-apoio)">(decl. ' + i.manual + unidade + ')</span>' + divergTag(i.manual, i.calculado) + '</td>';
      }
      return '<td class="num">' + valor + '</td>';
    }).join('');
    var idxModal = registrarScoreModal_(cs.nome, cs.scoreReal, cs.detalhamento);
    body.innerHTML += '<tr><td class="name">' + cs.nome + '</td>' + celulas + '<td class="num" style="color:' + status.cor + ';font-weight:700;">' + (cs.scoreReal === null || cs.scoreReal === undefined ? '—' : cs.scoreReal) + '<button class="info-btn" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta">ⓘ</button></td></tr>';
  });
}
document.querySelectorAll('.toggle-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.toggle-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderTabela(btn.dataset.mode);
  });
});

function renderRiscos() {
  var el = document.getElementById('riskGrid');
  el.innerHTML = '';
  DADOS.porCS.filter(function (cs) { return cs.alertas && cs.alertas.length > 0; }).forEach(function (cs) {
    var status = classificarScore(cs.scoreReal);
    var nivel = (status.nivel === 'risco' || status.nivel === 'atencao') ? status.nivel : 'atencao';
    var card = document.createElement('div'); card.className = 'risk-card nivel-' + nivel;
    card.innerHTML = '<div class="risk-head"><span class="risk-name">' + cs.nome + '</span><span class="risk-badge ' + nivel + '">' + status.label + '</span></div>'
      + '<ul class="risk-list">' + cs.alertas.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>';
    el.appendChild(card);
  });
  if (!el.children.length) el.innerHTML = '<div class="gestor-empty">Nenhum alerta neste período.</div>';
}

// ============ visão geral da rede (B, pedido do Vitor 25-26/09/2026) ============
// Bloco separado do ranking/radar por CS acima — olha a rede inteira de conselhos ativos no mesmo
// período selecionado. Os dados já vêm prontos em DADOS.visaoGeralRede (generateVisaoGeralRede em
// lib/reports.ts); este código só desenha.

// Mesma pizza SVG de pagante x permuta usada no detalhe de UM conselho (conselho-html.ts), só que
// aqui somada sobre todos os conselhos ativos da rede de uma vez (ver calcularPagamento no back-end).
function pizzaRedeSVG(p) {
  var r = 46, c = 2 * Math.PI * r;
  var fatias = [
    { valor: p.pagante, cor: '#3D8B5F' },
    { valor: p.permuta, cor: '#7dd3fc' },
  ].filter(function (f) { return f.valor > 0; });
  var offset = 0;
  var circulos = fatias.map(function (f) {
    var comprimento = (f.valor / p.total) * c;
    var svg = '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + f.cor + '" stroke-width="16" '
      + 'stroke-dasharray="' + comprimento + ' ' + (c - comprimento) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 60 60)"></circle>';
    offset += comprimento;
    return svg;
  }).join('');
  var pct = Math.round(p.pagante / p.total * 100);
  return '<svg width="120" height="120" viewBox="0 0 120 120">' + circulos
    + '<text x="60" y="66" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-size="20" font-weight="700" fill="#1A1A1A">' + pct + '%</text></svg>';
}

// Parte C (pedido do Vitor 25/09/2026): notinha clicável junto do status. As duas etiquetas vêm
// do campo "Status de Engajamento" do board Conselheiros 2026 (ajuste manual da gestão, não um
// cálculo automático) — a notinha deixa isso explícito e, pra "Em atenção", ainda mostra o mesmo
// critério de presença (limiar, quantos encontros entraram na conta, valor medido) já usado no
// kanban de presença por membro logo abaixo, como contexto objetivo de apoio.
function statusConselhoBadge(c) {
  if (c.congelado) {
    var idxC = registrarCriterioModal_('Por que "Congelado"?',
      '<div class="info-modal-sub">Etiqueta definida no campo "Status de Engajamento" do board Conselheiros 2026 (ajuste manual da gestão) — não é gerada por um cálculo automático do sistema.</div>');
    return '<span class="status-badge congelado">Congelado<button class="info-btn" style="background:rgba(0,0,0,0.08);" onclick="abrirCriterioModal(' + idxC + ')" title="Por que essa etiqueta?">ⓘ</button></span>';
  }
  if (c.atencao) {
    var cp = c.criterioPresenca || {};
    var valor = (cp.valorMedidoPct === null || cp.valorMedidoPct === undefined) ? '—' : cp.valorMedidoPct + '%';
    var corpo = '<div class="info-modal-sub">Etiqueta definida no campo "Status de Engajamento" do board Conselheiros 2026 (ajuste manual da gestão) — não é gerada por um cálculo automático do sistema. Os números abaixo são o critério de presença que o sistema já usa em outros pontos do painel (kanban de presença por membro), como contexto objetivo.</div>'
      + '<div class="score-detalhe-row"><span class="score-detalhe-label">Limiar de atenção (presença)</span><span class="score-detalhe-pontos">' + cp.limiarAtencaoPct + '%</span></div>'
      + '<div class="score-detalhe-row"><span class="score-detalhe-label">Encontros considerados (histórico)</span><span class="score-detalhe-pontos">' + cp.encontrosContados + '</span></div>'
      + '<div class="score-detalhe-row"><span class="score-detalhe-label">Presentes no total</span><span class="score-detalhe-pontos">' + cp.presentesContados + '</span></div>'
      + '<div class="score-detalhe-row"><span class="score-detalhe-label">Valor medido de presença</span><span class="score-detalhe-pontos">' + valor + '</span></div>';
    var idxA = registrarCriterioModal_('Por que "Em atenção"?', corpo);
    return '<span class="status-badge atencao">Em atenção<button class="info-btn" style="background:rgba(0,0,0,0.08);" onclick="abrirCriterioModal(' + idxA + ')" title="Por que essa etiqueta?">ⓘ</button></span>';
  }
  return ''; // sem alerta — célula vazia, sem traço (Ponto 3, correção 25/09/2026)
}

// Mesmos limiares do kanban de presença (bandaPresenca no back-end): ≤50% e ≤70% (LIMIAR_PRESENCA_
// ATENCAO), só que aqui em 3 cores (vermelho/amarelo/verde) em vez das 4 faixas do kanban — pedido
// explícito do Vitor pra barra de progresso da tabela.
function corPresenca(taxa) {
  if (taxa === null) return 'var(--cinza-apoio)';
  if (taxa <= 50) return 'var(--vermelho)';
  if (taxa <= 70) return 'var(--dourado)';
  return 'var(--verde)';
}
function presencaBarHTML(taxa) {
  if (taxa === null) return '<span style="color:var(--cinza-apoio)">—</span>';
  var cor = corPresenca(taxa);
  return '<div class="presenca-bar-wrap"><div class="presenca-bar-bg"><div class="presenca-bar-fill" style="width:' + taxa + '%;background:' + cor + '"></div></div>'
    + '<span class="presenca-bar-valor" style="color:' + cor + '">' + taxa + '%</span></div>';
}

var KANBAN_LABELS = { critica: 'Presença crítica (≤20%)', baixa: 'Presença baixa (21–50%)', atencao: 'Em atenção (51–70%)', saudavel: 'Saudável (>70%)' };
var KANBAN_ORDEM = ['critica', 'baixa', 'atencao', 'saudavel'];

function renderVisaoRede() {
  var rede = DADOS.visaoGeralRede;
  if (!rede) return;

  document.getElementById('redeStatMembros').textContent = rede.totalMembros;

  var pizzaWrap = document.getElementById('redePizzaWrap');
  if (!rede.pagamentoRede || !rede.pagamentoRede.total) {
    pizzaWrap.innerHTML = '<div class="gestor-empty">Sem status de pagamento classificado.</div>';
  } else {
    var p = rede.pagamentoRede;
    pizzaWrap.innerHTML = '<div class="rede-pizza-card">' + pizzaRedeSVG(p)
      + '<div class="rede-pizza-legenda">'
      + '<div class="legenda-item"><span class="legenda-dot" style="background:#3D8B5F"></span>Pagante <b>' + p.pagante + '</b></div>'
      + '<div class="legenda-item"><span class="legenda-dot" style="background:#7dd3fc"></span>Permuta <b>' + p.permuta + '</b></div>'
      + '</div></div>';
  }

  var body = document.getElementById('redeTabelaBody');
  if (!rede.presencaConselhos.length) {
    body.innerHTML = '<tr><td colspan="5" class="gestor-empty">Nenhum conselho ativo neste período.</td></tr>';
  } else {
    body.innerHTML = rede.presencaConselhos.map(function (c) {
      var taxa = (c.presenca && c.presenca.taxa !== null && c.presenca.taxa !== undefined) ? c.presenca.taxa : null;
      return '<tr><td class="name">' + (c.conselheiro || '—') + '</td><td><span class="nivel-badge">' + (c.nivel || '—') + '</span></td>'
        + '<td class="num">' + c.membros + '</td><td class="num">' + presencaBarHTML(taxa) + '</td><td>' + statusConselhoBadge(c) + '</td></tr>';
    }).join('');
  }

  var grid = document.getElementById('kanbanGrid');
  var totalCritica = (rede.kanbanPresenca.critica || []).length;
  document.getElementById('kanbanToggleLabel').textContent = 'Presença por membro' + (totalCritica ? ' — ' + totalCritica + ' em presença crítica' : '');
  grid.innerHTML = KANBAN_ORDEM.map(function (chave) {
    var lista = rede.kanbanPresenca[chave] || [];
    var cards = lista.length
      ? lista.map(function (m) {
          return '<div class="kanban-card"><span class="kanban-card-taxa">' + m.taxaPresenca + '%</span>'
            + '<div class="kanban-card-nome">' + m.nome + '</div><div class="kanban-card-conselho">' + m.conselho + '</div></div>';
        }).join('')
      : '<div class="gestor-empty" style="padding:8px 0;">Nenhum membro nesta faixa.</div>';
    return '<div class="kanban-col kanban-col-' + chave + '"><div class="kanban-col-head"><span>' + KANBAN_LABELS[chave] + '</span><span>' + lista.length + '</span></div>' + cards + '</div>';
  }).join('');
}

document.getElementById('btnToggleKanban').addEventListener('click', function () {
  var body = document.getElementById('kanbanBody');
  var aberto = body.style.display !== 'none';
  body.style.display = aberto ? 'none' : 'block';
  this.classList.toggle('aberto', !aberto);
});

// Ponto 4 (correção 25/09/2026): toggle "Mostrar ex-membros", desligado por padrão — sem ele,
// ranking e radar usam só cs_config ativo (getCSListCompleto no servidor); ligado, volta a incluir
// EX_MEMBROS_SEM_CONTA (comportamento original). Os dois gráficos leem da mesma lista de membros
// no servidor (ver generateVisaoGestor), então um único toggle já cobre ambos.
var incluirExMembros = false;
function inicializarToggleExMembros() {
  var chk = document.getElementById('chkExMembros');
  chk.checked = incluirExMembros;
  chk.addEventListener('change', function () {
    incluirExMembros = chk.checked;
    carregarVisaoGeral();
  });
}
inicializarToggleExMembros();

function carregarVisaoGeral() {
  fetchJSON_(ENDPOINT_VISAO_GERAL + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual) + '&incluirExMembros=' + incluirExMembros).then(function (data) {
    DADOS = data;
    renderHero();
    renderRanking();
    renderRadares();
    renderTabelaHead();
    renderTabela('calculado');
    renderRiscos();
    renderVisaoRede();
  }).catch(function (err) {
    document.getElementById('rankingList').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>';
  });
}

// ============ seletor de período (Ponto 2, correção 25/09/2026) ============
// A tela de gestor tinha só uma pílula de texto mostrando o mês fixo do carregamento, sem nenhum
// jeito de trocar — igual ao seletor de mês/ano que já existe no dashboard principal
// (dashboard-html.ts), mas nunca tinha sido conectado aqui. mesAtual/anoAtual eram sempre "agora"
// e carregarVisaoGeral() nunca era chamado de novo com outro período.
var MESES_GESTOR = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var agoraGestor = new Date();
var mesAtual = MESES_GESTOR[agoraGestor.getMonth()];
var anoAtual = agoraGestor.getFullYear();

function inicializarSeletorPeriodoGestor() {
  var selMes = document.getElementById('selMesGestor');
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; selMes.appendChild(opt);
  MESES_GESTOR.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  selMes.value = mesAtual;
  document.getElementById('selAnoGestor').value = anoAtual;
  selMes.addEventListener('change', onFiltroChangeGestor);
  document.getElementById('selAnoGestor').addEventListener('change', onFiltroChangeGestor);
}
function onFiltroChangeGestor() {
  mesAtual = document.getElementById('selMesGestor').value;
  anoAtual = Number(document.getElementById('selAnoGestor').value);
  carregarVisaoGeral();
}
inicializarSeletorPeriodoGestor();

// ============ controle de perfis: gestores ============

function renderGestores(lista) {
  var el = document.getElementById('listaGestores');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum gestor cadastrado.</div>'; return; }
  el.innerHTML = lista.map(function (g) {
    return '<div class="lista-item"><div><div class="lista-item-nome">' + (g.nome || g.email) + '</div><div class="lista-item-sub">' + g.email + '</div></div>'
      + '<button class="btn-remover" data-email="' + g.email + '">Remover</button></div>';
  }).join('');
  el.querySelectorAll('.btn-remover').forEach(function (b) { b.addEventListener('click', function () { removerGestorUI(b.dataset.email); }); });
}

function carregarGestores() {
  fetchJSON_(ENDPOINT_GESTORES).then(function (data) { renderGestores(data.gestores || []); })
    .catch(function (err) { document.getElementById('listaGestores').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>'; });
}

function removerGestorUI(email) {
  if (!window.confirm('Remover o gestor ' + email + '? Ele perde acesso à visão da área imediatamente.')) return;
  fetchJSON_(ENDPOINT_GESTORES + '?email=' + encodeURIComponent(email), { method: 'DELETE' })
    .then(function (data) { renderGestores(data.gestores || []); })
    .catch(function (err) { window.alert('Não foi possível remover: ' + err.message); });
}

var DOMINIO_GESTOR = '@moaiclubedelideres.com';
function emailDominioValido(email) {
  // Checagem por sufixo puro, sem regex — evita qualquer risco de escape de barra se disto
  // (\\s, \\.) sumir num processamento de string por engano, como já aconteceu uma vez aqui.
  return email.indexOf('@') > 0
    && email.indexOf(' ') === -1
    && email.length > DOMINIO_GESTOR.length
    && email.slice(-DOMINIO_GESTOR.length) === DOMINIO_GESTOR;
}

document.getElementById('btnAddGestor').addEventListener('click', function () {
  var input = document.getElementById('inputNovoGestor');
  var erroEl = document.getElementById('erroGestor');
  var email = input.value.trim().toLowerCase();
  erroEl.textContent = '';
  input.classList.remove('erro');

  if (!emailDominioValido(email)) {
    erroEl.textContent = 'E-mail precisa terminar em ' + DOMINIO_GESTOR;
    input.classList.add('erro');
    return;
  }
  var btn = document.getElementById('btnAddGestor');
  btn.disabled = true;
  fetchJSON_(ENDPOINT_GESTORES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
    .then(function (data) { input.value = ''; renderGestores(data.gestores || []); })
    .catch(function (err) { erroEl.textContent = err.message; input.classList.add('erro'); })
    .then(function () { btn.disabled = false; });
});

// ============ controle de perfis: roster de CS ============

// CS_ROSTER_ATUAL_ (Parte A, 25/09/2026): guardado aqui só pra popular o <select> de "Acesso de
// login por CS" sem precisar buscar o roster de novo — mesma lista que já alimenta esta seção.
var CS_ROSTER_ATUAL_ = [];
function renderCSRoster(lista) {
  CS_ROSTER_ATUAL_ = lista;
  var el = document.getElementById('listaCS');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum CS cadastrado.</div>'; return; }
  el.innerHTML = lista.map(function (c) {
    var checked = c.ativo ? 'checked' : '';
    var temMeta = c.metaCarteira !== null && c.metaCarteira !== undefined;
    var avisoSemMeta = temMeta ? '' : '<span class="meta-aviso" title="Sem meta própria: a pontuação de carteira desse CS usa o maior número de conselhos do time como fallback.">sem meta própria</span>';
    return '<div class="lista-item"><div><div class="lista-item-nome">' + c.nome + '</div><div class="lista-item-sub">' + c.nomeCompleto + '</div></div>'
      + '<div class="lista-item-acoes">'
      + '<div class="meta-carteira-campo">'
      + '<label>Meta de carteira</label>'
      + '<input type="number" min="1" step="1" class="meta-carteira-input" placeholder="—" value="' + (temMeta ? c.metaCarteira : '') + '" data-nome="' + c.nome + '">'
      + avisoSemMeta
      + '</div>'
      + '<label class="switch"><input type="checkbox" ' + checked + ' data-nome="' + c.nome + '"><span class="switch-track"></span></label>'
      + '</div></div>';
  }).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(function (chk) {
    chk.addEventListener('change', function () {
      var nome = chk.dataset.nome, novoAtivo = chk.checked;
      fetchJSON_(ENDPOINT_CS_ROSTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, ativo: novoAtivo }) })
        .then(function (data) { renderCSRoster(data.roster || []); })
        .catch(function (err) { chk.checked = !novoAtivo; window.alert('Não foi possível alterar: ' + err.message); });
    });
  });
  el.querySelectorAll('.meta-carteira-input').forEach(function (inp) {
    var valorAnterior = inp.value;
    inp.addEventListener('change', function () {
      var nome = inp.dataset.nome, novoValor = inp.value.trim();
      inp.disabled = true;
      fetchJSON_(ENDPOINT_CS_ROSTER, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, metaCarteira: novoValor === '' ? null : Number(novoValor) }) })
        .then(function (data) { renderCSRoster(data.roster || []); })
        .catch(function (err) { inp.value = valorAnterior; inp.disabled = false; window.alert('Não foi possível salvar a meta: ' + err.message); });
    });
  });
  var sel = document.getElementById('selectCSParaVincular');
  if (sel) sel.innerHTML = lista.map(function (c) { return '<option value="' + c.nome + '">' + c.nome + ' (' + c.nomeCompleto + ')</option>'; }).join('');
}

// ============ controle de perfis: catálogo de advertência (brainstorm 29/09/2026) ============
// Nome/pontos/validade de cada tipo. Desativar (switch) tira do formulário de "aplicar" no
// perfil do CS mas mantém o histórico intacto (aplicação guarda cópia congelada, não referência
// viva ao tipo — ver aplicar_advertencia em lib/reports.ts).
var ADV_TIPOS_ATUAL_ = [];
function carregarAdvertenciaTipos() {
  fetchJSON_(ENDPOINT_ADVERTENCIA_TIPOS).then(function (data) { renderAdvertenciaTipos(data.tipos || []); })
    .catch(function (err) {
      document.getElementById('listaAdvTipos').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>';
    });
}
function renderAdvertenciaTipos(lista) {
  ADV_TIPOS_ATUAL_ = lista;
  var el = document.getElementById('listaAdvTipos');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum tipo cadastrado ainda.</div>'; return; }
  el.innerHTML = lista.map(function (t, i) {
    var checked = t.ativo ? 'checked' : '';
    return '<div class="pendente-item"><div class="pendente-row">'
      + '<div><div class="lista-item-nome">' + t.nome + '</div><div class="lista-item-sub">' + t.pontos + ' ponto(s) · validade ' + t.validadeMeses + ' mês(es)' + (t.ativo ? '' : ' · inativo') + '</div></div>'
      + '<div class="lista-item-acoes">'
      + '<button class="btn-vincular-toggle" data-idx="' + i + '">Editar</button>'
      + '<label class="switch"><input type="checkbox" ' + checked + ' data-idx="' + i + '"><span class="switch-track"></span></label>'
      + '</div></div>'
      + '<div class="pendente-form" id="advTipoForm' + i + '" style="display:none">'
      + '<div class="form-inline"><input type="text" placeholder="Nome" data-field="nome" value="' + t.nome + '"></div>'
      + '<div class="form-inline"><input type="number" placeholder="Pontos" min="0" data-field="pontos" value="' + t.pontos + '" style="flex:1;"><input type="number" placeholder="Validade (meses)" min="1" data-field="validadeMeses" value="' + t.validadeMeses + '" style="flex:1;"></div>'
      + '<p class="erro-msg" id="erroAdvTipoEdit' + i + '"></p>'
      + '<div class="form-inline"><button class="btn-salvar-vinculo" data-idx="' + i + '">Salvar</button><button class="btn-cancelar-vinculo" data-idx="' + i + '">Cancelar</button></div>'
      + '</div></div>';
  }).join('');

  el.querySelectorAll('.btn-vincular-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var form = document.getElementById('advTipoForm' + b.dataset.idx);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });
  el.querySelectorAll('input[type=checkbox]').forEach(function (chk) {
    chk.addEventListener('change', function () {
      var t = ADV_TIPOS_ATUAL_[Number(chk.dataset.idx)];
      var novoAtivo = chk.checked;
      fetchJSON_(ENDPOINT_ADVERTENCIA_TIPOS + '/' + encodeURIComponent(t.id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: t.nome, pontos: t.pontos, validadeMeses: t.validadeMeses, ativo: novoAtivo }),
      }).then(function () { carregarAdvertenciaTipos(); })
        .catch(function (err) { chk.checked = !novoAtivo; window.alert('Não foi possível alterar: ' + err.message); });
    });
  });
  el.querySelectorAll('.btn-salvar-vinculo').forEach(function (b) {
    b.addEventListener('click', function () {
      var idx = Number(b.dataset.idx);
      var t = ADV_TIPOS_ATUAL_[idx];
      var form = document.getElementById('advTipoForm' + idx);
      var nome = form.querySelector('[data-field=nome]').value.trim();
      var pontos = Number(form.querySelector('[data-field=pontos]').value);
      var validadeMeses = Number(form.querySelector('[data-field=validadeMeses]').value);
      var erroEl = document.getElementById('erroAdvTipoEdit' + idx);
      erroEl.textContent = '';
      if (!nome) { erroEl.textContent = 'Nome obrigatório.'; return; }
      if (!(pontos >= 0)) { erroEl.textContent = 'Pontos inválidos.'; return; }
      if (!(validadeMeses > 0)) { erroEl.textContent = 'Validade inválida.'; return; }
      fetchJSON_(ENDPOINT_ADVERTENCIA_TIPOS + '/' + encodeURIComponent(t.id), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, pontos: pontos, validadeMeses: validadeMeses, ativo: t.ativo }),
      }).then(function () { carregarAdvertenciaTipos(); })
        .catch(function (err) { erroEl.textContent = err.message; });
    });
  });
  el.querySelectorAll('.btn-cancelar-vinculo').forEach(function (b) {
    b.addEventListener('click', function () {
      document.getElementById('advTipoForm' + b.dataset.idx).style.display = 'none';
    });
  });
}
function criarAdvertenciaTipoClick() {
  var nomeEl = document.getElementById('advTipoNome'), pontosEl = document.getElementById('advTipoPontos'), validadeEl = document.getElementById('advTipoValidade');
  var erroEl = document.getElementById('erroAdvTipo');
  erroEl.textContent = '';
  var nome = nomeEl.value.trim();
  var pontos = Number(pontosEl.value);
  var validadeMeses = Number(validadeEl.value);
  if (!nome) { erroEl.textContent = 'Informe um nome.'; return; }
  if (!(pontos >= 0)) { erroEl.textContent = 'Pontos inválidos.'; return; }
  if (!(validadeMeses > 0)) { erroEl.textContent = 'Validade inválida.'; return; }
  fetchJSON_(ENDPOINT_ADVERTENCIA_TIPOS, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: nome, pontos: pontos, validadeMeses: validadeMeses }),
  }).then(function () {
    nomeEl.value = ''; pontosEl.value = ''; validadeEl.value = '';
    carregarAdvertenciaTipos();
  }).catch(function (err) { erroEl.textContent = err.message; });
}

// ============ controle de perfis: acesso de login por CS (Parte A, 25/09/2026) ============
function renderVinculosCS(lista) {
  var el = document.getElementById('listaVinculosCS');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum login vinculado ainda — todo CS comum vê uma tela vazia até ser vinculado.</div>'; return; }
  el.innerHTML = lista.map(function (v) {
    return '<div class="lista-item"><div><div class="lista-item-nome">' + v.nome + '</div><div class="lista-item-sub">' + v.email + '</div></div>'
      + '<button class="btn-remover" data-email="' + v.email + '">Remover</button></div>';
  }).join('');
  el.querySelectorAll('.btn-remover').forEach(function (b) { b.addEventListener('click', function () { removerVinculoCS(b.dataset.email); }); });
}
function carregarVinculosCS() {
  fetchJSON_(ENDPOINT_CS_USUARIOS).then(function (data) { renderVinculosCS(data.vinculos || []); })
    .catch(function (err) { document.getElementById('listaVinculosCS').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>'; });
}
function removerVinculoCS(email) {
  if (!window.confirm('Remover o vínculo de ' + email + '? Esse CS perde acesso à própria home até vincular de novo.')) return;
  fetchJSON_(ENDPOINT_CS_USUARIOS + '?email=' + encodeURIComponent(email), { method: 'DELETE' })
    .then(function (data) { renderVinculosCS(data.vinculos || []); })
    .catch(function (err) { window.alert('Não foi possível remover: ' + err.message); });
}
document.getElementById('btnVincularCS').addEventListener('click', function () {
  var input = document.getElementById('inputEmailCS');
  var sel = document.getElementById('selectCSParaVincular');
  var erroEl = document.getElementById('erroVinculoCS');
  var email = input.value.trim().toLowerCase();
  var nome = sel.value;
  erroEl.textContent = '';
  input.classList.remove('erro');
  if (!emailDominioValido(email)) {
    erroEl.textContent = 'E-mail precisa terminar em ' + DOMINIO_GESTOR;
    input.classList.add('erro');
    return;
  }
  if (!nome) { erroEl.textContent = 'Selecione um CS.'; return; }
  var btn = document.getElementById('btnVincularCS');
  btn.disabled = true;
  fetchJSON_(ENDPOINT_CS_USUARIOS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, nome: nome }) })
    .then(function (data) { input.value = ''; renderVinculosCS(data.vinculos || []); })
    .catch(function (err) { erroEl.textContent = err.message; input.classList.add('erro'); })
    .then(function () { btn.disabled = false; });
});

// ============ controle de perfis: blur dos indicadores do time (Parte B, 25/09/2026) ============
function renderStatusRevelar(valor) {
  var chk = document.getElementById('chkRevelarIndicadores');
  var status = document.getElementById('statusRevelar');
  if (chk) chk.checked = !!valor;
  if (status) status.textContent = valor ? 'Ligado — indicadores do time aparecem sem blur pra todo mundo.' : 'Desligado — indicadores do time aparecem borrados pra quem não é gestor.';
}
function carregarConfigRevelar() {
  fetchJSON_(ENDPOINT_CONFIG).then(function (data) { renderStatusRevelar(data.revelarIndicadoresEquipe); })
    .catch(function (err) { document.getElementById('statusRevelar').textContent = 'Erro ao carregar: ' + err.message; });
}
document.getElementById('chkRevelarIndicadores').addEventListener('change', function () {
  var chk = this;
  var novoValor = chk.checked;
  chk.disabled = true;
  fetchJSON_(ENDPOINT_GESTOR_CONFIG, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revelarIndicadoresEquipe: novoValor }) })
    .then(function (data) { renderStatusRevelar(data.revelarIndicadoresEquipe); })
    .catch(function (err) { chk.checked = !novoValor; window.alert('Não foi possível salvar: ' + err.message); })
    .then(function () { chk.disabled = false; });
});

function carregarCSRoster() {
  fetchJSON_(ENDPOINT_CS_ROSTER).then(function (data) { renderCSRoster(data.roster || []); renderNaoVinculados(data.naoVinculados || []); })
    .catch(function (err) {
      document.getElementById('listaCS').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>';
      document.getElementById('listaNaoVinculados').innerHTML = '';
    });
}

// ============ controle de perfis: CS detectados e ainda não vinculados ============

function primeiroNomeSugerido_(nomeDetectado) {
  return (nomeDetectado || '').trim().split(/\\s+/)[0] || '';
}

function renderNaoVinculados(lista) {
  var titulo = document.getElementById('tituloNaoVinculados');
  if (titulo) titulo.textContent = 'Detectados, ainda não vinculados' + (lista.length ? ' (' + lista.length + ')' : '');
  var el = document.getElementById('listaNaoVinculados');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum nome pendente — tudo vinculado.</div>'; return; }
  el.innerHTML = lista.map(function (p, i) {
    var origens = p.ocorrenciasPorOrigem.map(function (o) { return o.origem + ' (' + o.qtd + ')'; }).join(', ');
    return '<div class="pendente-item">'
      + '<div class="pendente-row">'
      + '<div><div class="lista-item-nome">' + p.nome + '</div><div class="lista-item-sub">' + origens + ' · ' + p.totalOcorrencias + ' ocorrência(s)</div></div>'
      + '<button class="btn-vincular-toggle" data-idx="' + i + '">Vincular</button>'
      + '</div>'
      + '<div class="pendente-form" id="pendenteForm' + i + '" style="display:none">'
      + '<div class="form-inline"><input type="text" placeholder="Nome curto" data-field="nome" value="' + primeiroNomeSugerido_(p.nome) + '"></div>'
      + '<div class="form-inline"><input type="text" placeholder="Nome completo (exato do Monday)" data-field="nomeCompleto" value="' + p.nome + '"></div>'
      + '<div class="form-inline"><input type="text" placeholder="Apelido no conselho (opcional)" data-field="apelidoConselho"></div>'
      + '<div class="form-inline"><input type="text" placeholder="Monday user ID (opcional)" data-field="mondayUserId"></div>'
      + '<p class="erro-msg" id="erroPendente' + i + '"></p>'
      + '<div class="form-inline"><button class="btn-salvar-vinculo" data-idx="' + i + '">Salvar</button><button class="btn-cancelar-vinculo" data-idx="' + i + '">Cancelar</button></div>'
      + '</div>'
      + '</div>';
  }).join('');

  el.querySelectorAll('.btn-vincular-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var form = document.getElementById('pendenteForm' + b.dataset.idx);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });
  el.querySelectorAll('.btn-cancelar-vinculo').forEach(function (b) {
    b.addEventListener('click', function () {
      document.getElementById('pendenteForm' + b.dataset.idx).style.display = 'none';
    });
  });
  el.querySelectorAll('.btn-salvar-vinculo').forEach(function (b) {
    b.addEventListener('click', function () {
      var idx = b.dataset.idx;
      var form = document.getElementById('pendenteForm' + idx);
      var erroEl = document.getElementById('erroPendente' + idx);
      erroEl.textContent = '';
      var nome = form.querySelector('[data-field="nome"]').value.trim();
      var nomeCompleto = form.querySelector('[data-field="nomeCompleto"]').value.trim();
      var apelidoConselho = form.querySelector('[data-field="apelidoConselho"]').value.trim();
      var mondayUserIdRaw = form.querySelector('[data-field="mondayUserId"]').value.trim();
      if (!nome || !nomeCompleto) { erroEl.textContent = 'Informe nome e nome completo.'; return; }
      if (mondayUserIdRaw && !/^[0-9]+$/.test(mondayUserIdRaw)) { erroEl.textContent = 'Monday user ID precisa ser numérico.'; return; }
      b.disabled = true;
      fetchJSON_(ENDPOINT_VINCULAR_CS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, nomeCompleto: nomeCompleto, apelidoConselho: apelidoConselho || null, mondayUserId: mondayUserIdRaw || null }),
      })
        .then(function (data) { renderCSRoster(data.roster || []); renderNaoVinculados(data.naoVinculados || []); })
        .catch(function (err) { erroEl.textContent = 'Erro: ' + err.message; b.disabled = false; });
    });
  });
}

// ============ consulta rápida (Parte E, pedido do Vitor 29/09/2026) ============
// Painel isolado do resto da tela: tudo roda dentro de initConsulta_, com try/catch em volta —
// este arquivo é um <script> inline só, executado de cima pra baixo; sem o try/catch, um erro
// aqui (ex.: elemento faltando por alguma edição futura) pararia a execução ANTES de
// carregarVisaoGeral() na linha de baixo, quebrando a tela inteira por causa de um painel à parte
// (já aconteceu uma vez com um erro de sintaxe no template inteiro — ver nota do LEIA_ME).
// Mantém só as últimas 5 perguntas da sessão em memória (sem localStorage, como pedido).
var CONSULTA_RECENTES_ = [];

function consultaNormalizarEspacos_(s) { return (s || '').replace(/\\s+/g, ' ').trim(); }

function consultaRenderRecentes_() {
  var wrap = document.getElementById('consultaChipsRecentes');
  if (!wrap) return;
  wrap.innerHTML = '';
  CONSULTA_RECENTES_.forEach(function (p) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'consulta-chip consulta-chip-recente';
    btn.textContent = p;
    btn.addEventListener('click', function () { consultaExecutar_(p); });
    wrap.appendChild(btn);
  });
}

function consultaRegistrarRecente_(pergunta) {
  CONSULTA_RECENTES_ = CONSULTA_RECENTES_.filter(function (p) { return p !== pergunta; });
  CONSULTA_RECENTES_.unshift(pergunta);
  if (CONSULTA_RECENTES_.length > 5) CONSULTA_RECENTES_.length = 5;
  consultaRenderRecentes_();
}

function consultaExecutar_(pergunta) {
  pergunta = consultaNormalizarEspacos_(pergunta);
  var input = document.getElementById('consultaInput');
  var btn = document.getElementById('consultaBtn');
  var respostaWrap = document.getElementById('consultaRespostaWrap');
  if (!pergunta || !input || !btn || !respostaWrap) return;
  input.value = pergunta;
  btn.disabled = true;
  var rotuloAnterior = btn.textContent;
  btn.textContent = 'Consultando…';
  respostaWrap.innerHTML = '';
  fetchJSON_(ENDPOINT_CONSULTA, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: pergunta }),
  }).then(function (data) {
    // textContent, nunca innerHTML: a resposta cita nomes vindos do Monday, texto livre não
    // sanitizado — nunca deve ser interpretado como HTML.
    var div = document.createElement('div');
    div.className = 'consulta-resposta';
    div.textContent = data.resposta || 'Sem resposta.';
    respostaWrap.appendChild(div);
    consultaRegistrarRecente_(pergunta);
  }).catch(function (err) {
    var div = document.createElement('div');
    div.className = 'gestor-erro';
    div.textContent = 'Erro ao consultar: ' + err.message;
    respostaWrap.appendChild(div);
  }).then(function () {
    btn.disabled = false;
    btn.textContent = rotuloAnterior;
  });
}

(function initConsulta_() {
  try {
    var painel = document.getElementById('consultaPainel');
    var input = document.getElementById('consultaInput');
    var btn = document.getElementById('consultaBtn');
    if (!painel || !input || !btn) return;
    btn.addEventListener('click', function () { consultaExecutar_(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); consultaExecutar_(input.value); }
    });
    painel.querySelectorAll('#consultaChipsExemplo .consulta-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { consultaExecutar_(chip.dataset.pergunta); });
    });
  } catch (err) {
    var respostaWrap = document.getElementById('consultaRespostaWrap');
    if (respostaWrap) respostaWrap.innerHTML = '<div class="gestor-erro">A consulta rápida não carregou.</div>';
  }
})();

// ============ Metas e destaques (Parte G, pedido do Vitor 29/09/2026) ============
// Carregado só na primeira vez que a aba é aberta (mesmo padrão preguiçoso de Controle de
// Perfis) — matriz de metas, indicadores da home e recordes manuais, nessa ordem.
var metasDestaquesCarregado = false;
var ENDPOINT_METAS = '/api/gestor/metas';
var ENDPOINT_METAS_COPIAR = '/api/gestor/metas/copiar';
var ENDPOINT_INDICADORES_HOME = '/api/gestor/indicadores-home';
var ENDPOINT_RECORDES_MANUAIS = '/api/gestor/recordes-manuais';
var MESES_ABREV_MATRIZ = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

var MATRIZ_DADOS = null;
var MATRIZ_ALTERACOES = {};

function matrizChave_(indicador, escopo, csNome) { return indicador + '|' + escopo + '|' + (csNome || ''); }
function formatarMesAnoCurto_(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  return MESES_ABREV_MATRIZ[Number(p[1]) - 1] + '/' + p[0];
}
function matrizMesAtual_() {
  var mesNome = document.getElementById('selMesMatriz').value;
  var ano = document.getElementById('selAnoMatriz').value;
  var idx = MESES_GESTOR.indexOf(mesNome);
  if (idx === -1 || !ano) return null;
  return ano + '-' + String(idx + 1).padStart(2, '0') + '-01';
}
function popularSeletorMesMatriz_() {
  var selMes = document.getElementById('selMesMatriz');
  MESES_GESTOR.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  selMes.value = (mesAtual === 'Visão Geral') ? MESES_GESTOR[agoraGestor.getMonth()] : mesAtual;
  document.getElementById('selAnoMatriz').value = String(anoAtual);
}

function carregarMatriz() {
  var mes = matrizMesAtual_();
  if (!mes) return;
  document.getElementById('erroMatriz').textContent = '';
  document.getElementById('matrizBody').innerHTML = '<tr><td class="gestor-empty">Carregando…</td></tr>';
  var hojeMes = new Date(); hojeMes.setDate(1); hojeMes.setHours(0, 0, 0, 0);
  var mesData = new Date(mes + 'T00:00:00');
  document.getElementById('avisoMesPassadoMatriz').style.display = (mesData < hojeMes) ? 'block' : 'none';
  fetchJSON_(ENDPOINT_METAS + '?mes=' + encodeURIComponent(mes)).then(function (data) {
    MATRIZ_DADOS = data;
    MATRIZ_ALTERACOES = {};
    atualizarStatusMatriz_();
    renderMatrizTabela_();
    popularSelectRecordeIndicador_();
    popularSelectRecordeCS_();
  }).catch(function (err) {
    document.getElementById('matrizBody').innerHTML = '<tr><td class="gestor-erro">Erro ao carregar: ' + err.message + '</td></tr>';
  });
}

function matrizCelulaHtml_(indicador, escopo, csNome, resolvidoIndex, mesAtualMatriz) {
  var chave = matrizChave_(indicador, escopo, csNome);
  var resolvido = resolvidoIndex[chave];
  var valor = (resolvido && resolvido.valor !== null && resolvido.valor !== undefined) ? resolvido.valor : '';
  var herdado = !!(resolvido && resolvido.mes_origem && resolvido.mes_origem !== mesAtualMatriz);
  var titulo = herdado ? ' title="Herdado de ' + formatarMesAnoCurto_(resolvido.mes_origem) + '"' : '';
  return '<input type="number" min="0" class="matriz-input' + (herdado ? ' herdado' : '') + '" data-chave="' + chave + '" data-indicador="' + indicador + '" data-escopo="' + escopo + '" data-cs="' + (csNome || '') + '" value="' + valor + '"' + titulo + '>';
}

function renderMatrizTabela_() {
  if (!MATRIZ_DADOS) return;
  var mostrarOcultos = document.getElementById('chkMostrarOcultosMatriz').checked;
  var indicadores = MATRIZ_DADOS.catalogo.filter(function (c) { return mostrarOcultos || c.visivel; });
  var csAtivos = MATRIZ_DADOS.csAtivos;
  var mesAtualMatriz = MATRIZ_DADOS.mes;

  var head = '<th>Indicador</th>';
  csAtivos.forEach(function (cs) { head += '<th class="num">' + cs.nome + '</th>'; });
  head += '<th class="num matriz-col-time">Time</th>';
  document.getElementById('matrizHead').innerHTML = head;

  var resolvidoIndex = {};
  MATRIZ_DADOS.resolvidas.forEach(function (r) { resolvidoIndex[matrizChave_(r.indicador, r.escopo, r.cs_nome)] = r; });

  var corpo = indicadores.map(function (ind) {
    var linha = '<tr><td>' + ind.rotulo + '</td>';
    csAtivos.forEach(function (cs) {
      linha += '<td class="num">' + matrizCelulaHtml_(ind.chave, 'cs', cs.nome, resolvidoIndex, mesAtualMatriz) + '</td>';
    });
    linha += '<td class="num matriz-col-time">' + matrizCelulaHtml_(ind.chave, 'time', null, resolvidoIndex, mesAtualMatriz) + '</td>';
    return linha + '</tr>';
  }).join('');
  document.getElementById('matrizBody').innerHTML = corpo || '<tr><td class="gestor-empty">Nenhum indicador.</td></tr>';

  document.querySelectorAll('.matriz-input').forEach(function (input) {
    input.addEventListener('input', function () { onMatrizInputMudou_(input); });
  });
}

function onMatrizInputMudou_(input) {
  var chave = input.dataset.chave;
  var raw = input.value.trim();
  input.classList.remove('invalido');
  if (raw === '') { delete MATRIZ_ALTERACOES[chave]; input.classList.remove('alterado'); atualizarStatusMatriz_(); return; }
  var num = Number(raw);
  if (!isFinite(num) || num < 0) { input.classList.add('invalido'); return; }
  MATRIZ_ALTERACOES[chave] = { indicador: input.dataset.indicador, escopo: input.dataset.escopo, csNome: input.dataset.cs || null, valor: num };
  input.classList.add('alterado');
  input.classList.remove('herdado');
  atualizarStatusMatriz_();
}

function atualizarStatusMatriz_() {
  var qtd = Object.keys(MATRIZ_ALTERACOES).length;
  document.getElementById('statusMatriz').textContent = qtd ? (qtd + ' alteração(ões) não salva(s)') : '';
  document.getElementById('btnSalvarMatriz').disabled = qtd === 0;
}

function salvarMatriz_() {
  var mes = matrizMesAtual_();
  var itens = Object.keys(MATRIZ_ALTERACOES).map(function (k) { return MATRIZ_ALTERACOES[k]; });
  if (!mes || !itens.length) return;
  document.getElementById('btnSalvarMatriz').disabled = true;
  document.getElementById('erroMatriz').textContent = '';
  fetchJSON_(ENDPOINT_METAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mes: mes, itens: itens }) })
    .then(function () { carregarMatriz(); })
    .catch(function (err) { document.getElementById('erroMatriz').textContent = 'Erro ao salvar: ' + err.message; document.getElementById('btnSalvarMatriz').disabled = false; });
}

function copiarMesAnterior_() {
  var para = matrizMesAtual_();
  if (!para) return;
  var partes = para.split('-');
  var d = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  var de = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  document.getElementById('erroMatriz').textContent = '';
  fetchJSON_(ENDPOINT_METAS_COPIAR, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de: de, para: para }) })
    .then(function () { carregarMatriz(); })
    .catch(function (err) { document.getElementById('erroMatriz').textContent = 'Erro ao copiar do mês anterior: ' + err.message; });
}

// ---- indicadores da home ----
var INDICADORES_HOME_DADOS = [];
function carregarIndicadoresHome() {
  document.getElementById('erroIndicadoresHome').textContent = '';
  document.getElementById('listaIndicadoresHome').innerHTML = '<tr><td class="gestor-empty" colspan="4">Carregando…</td></tr>';
  fetchJSON_(ENDPOINT_INDICADORES_HOME).then(function (data) {
    INDICADORES_HOME_DADOS = data.itens || [];
    renderIndicadoresHomeTabela_();
  }).catch(function (err) {
    document.getElementById('listaIndicadoresHome').innerHTML = '<tr><td class="gestor-erro" colspan="4">Erro ao carregar: ' + err.message + '</td></tr>';
  });
}
function renderIndicadoresHomeTabela_() {
  var lista = INDICADORES_HOME_DADOS.slice().sort(function (a, b) { return a.ordem - b.ordem; });
  document.getElementById('listaIndicadoresHome').innerHTML = lista.map(function (it, idx) {
    return '<tr>' +
      '<td>' + it.rotulo + '</td>' +
      '<td class="num"><label class="switch"><input type="checkbox" class="chk-visivel-home" data-idx="' + idx + '"' + (it.visivel ? ' checked' : '') + '><span class="switch-track"></span></label></td>' +
      '<td class="num"><span class="ordem-setas"><button class="ordem-seta btn-subir-home" data-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + ' type="button">▲</button><button class="ordem-seta btn-descer-home" data-idx="' + idx + '"' + (idx === lista.length - 1 ? ' disabled' : '') + ' type="button">▼</button></span></td>' +
      '<td class="num"><label class="switch"><input type="checkbox" class="chk-recorde-home" data-idx="' + idx + '"' + (it.exibirRecorde ? ' checked' : '') + '><span class="switch-track"></span></label></td>' +
      '</tr>';
  }).join('');

  document.querySelectorAll('.chk-visivel-home').forEach(function (chk) {
    chk.addEventListener('change', function () { lista[Number(chk.dataset.idx)].visivel = chk.checked; salvarIndicadoresHome_(lista); });
  });
  document.querySelectorAll('.chk-recorde-home').forEach(function (chk) {
    chk.addEventListener('change', function () { lista[Number(chk.dataset.idx)].exibirRecorde = chk.checked; salvarIndicadoresHome_(lista); });
  });
  document.querySelectorAll('.btn-subir-home').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = Number(btn.dataset.idx);
      if (idx === 0) return;
      var tmp = lista[idx].ordem; lista[idx].ordem = lista[idx - 1].ordem; lista[idx - 1].ordem = tmp;
      salvarIndicadoresHome_(lista);
    });
  });
  document.querySelectorAll('.btn-descer-home').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = Number(btn.dataset.idx);
      if (idx === lista.length - 1) return;
      var tmp = lista[idx].ordem; lista[idx].ordem = lista[idx + 1].ordem; lista[idx + 1].ordem = tmp;
      salvarIndicadoresHome_(lista);
    });
  });
}
function salvarIndicadoresHome_(lista) {
  document.getElementById('erroIndicadoresHome').textContent = '';
  fetchJSON_(ENDPOINT_INDICADORES_HOME, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens: lista }) })
    .then(function () { carregarIndicadoresHome(); })
    .catch(function (err) { document.getElementById('erroIndicadoresHome').textContent = 'Erro ao salvar: ' + err.message; carregarIndicadoresHome(); });
}

// ---- recordes anteriores ao histórico ----
function popularSelectRecordeIndicador_() {
  var sel = document.getElementById('recIndicador');
  sel.innerHTML = '';
  (MATRIZ_DADOS ? MATRIZ_DADOS.catalogo : []).forEach(function (c) {
    var o = document.createElement('option'); o.value = c.chave; o.textContent = c.rotulo; sel.appendChild(o);
  });
}
function popularSelectRecordeCS_() {
  var sel = document.getElementById('recCS');
  sel.innerHTML = '';
  (MATRIZ_DADOS ? MATRIZ_DADOS.csAtivos : []).forEach(function (cs) {
    var o = document.createElement('option'); o.value = cs.nome; o.textContent = cs.nome; sel.appendChild(o);
  });
}
function matrizRotuloIndicador_(chave) {
  var item = (MATRIZ_DADOS ? MATRIZ_DADOS.catalogo : []).filter(function (c) { return c.chave === chave; })[0];
  return item ? item.rotulo : chave;
}
function carregarRecordesManuais() {
  document.getElementById('listaRecordesManuais').innerHTML = '<div class="gestor-empty">Carregando…</div>';
  fetchJSON_(ENDPOINT_RECORDES_MANUAIS).then(function (data) { renderRecordesManuais_(data.recordes || []); })
    .catch(function (err) { document.getElementById('listaRecordesManuais').innerHTML = '<div class="gestor-erro">Erro ao carregar: ' + err.message + '</div>'; });
}
function renderRecordesManuais_(lista) {
  if (!lista.length) { document.getElementById('listaRecordesManuais').innerHTML = '<div class="gestor-empty">Nenhum recorde manual cadastrado.</div>'; return; }
  document.getElementById('listaRecordesManuais').innerHTML = lista.map(function (r) {
    var alvo = r.escopo === 'time' ? 'Time' : r.cs_nome;
    return '<div class="lista-item"><div><div class="lista-item-nome">' + matrizRotuloIndicador_(r.indicador) + ' · ' + alvo + '</div>' +
      '<div class="lista-item-sub">' + r.valor + ' em ' + formatarMesAnoCurto_(r.mes_referencia) + (r.observacao ? ' · ' + r.observacao : '') + '</div></div></div>';
  }).join('');
}
function salvarRecordeManual_() {
  var indicador = document.getElementById('recIndicador').value;
  var escopo = document.getElementById('recEscopo').value;
  var cs = escopo === 'cs' ? document.getElementById('recCS').value : null;
  var valor = Number(document.getElementById('recValor').value);
  var mesInput = document.getElementById('recMes').value;
  var obs = document.getElementById('recObs').value.trim();
  var erroEl = document.getElementById('erroRecordeManual');
  erroEl.textContent = '';
  if (!indicador || !isFinite(valor) || valor < 0 || !mesInput) { erroEl.textContent = 'Preencha indicador, valor e mês.'; return; }
  fetchJSON_(ENDPOINT_RECORDES_MANUAIS, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicador: indicador, escopo: escopo, cs: cs, valor: valor, mes: mesInput + '-01', obs: obs }),
  }).then(function () {
    document.getElementById('recValor').value = ''; document.getElementById('recMes').value = ''; document.getElementById('recObs').value = '';
    carregarRecordesManuais();
  }).catch(function (err) { erroEl.textContent = 'Erro: ' + err.message; });
}

// ---- recordes calculados (mecanismo único no banco, nenhum valor digitado) ----
var recordesVisaoMontada_ = false;
function recNum_(v) {
  return v === null || v === undefined ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function carregarRecordesCalculados(cs) {
  var corpo = document.getElementById('listaRecordesCalculados');
  document.getElementById('erroRecordesCalculados').textContent = '';
  corpo.innerHTML = '<tr><td class="gestor-empty" colspan="7">Carregando…</td></tr>';
  fetchJSON_('/api/gestor/recordes' + (cs ? '?cs=' + encodeURIComponent(cs) : '')).then(function (data) {
    if (!recordesVisaoMontada_) {
      recordesVisaoMontada_ = true;
      var sel = document.getElementById('recVisao');
      sel.innerHTML = '<option value="">Time</option>' + (data.csAtivos || []).map(function (n) {
        return '<option value="' + churnEsc_(n) + '">' + churnEsc_(n) + '</option>';
      }).join('');
      sel.addEventListener('change', function () { carregarRecordesCalculados(this.value); });
    }
    renderRecordesCalculados_(data);
  }).catch(function (err) {
    corpo.innerHTML = '<tr><td class="gestor-erro" colspan="7">Erro ao carregar: ' + churnEsc_(err.message) + '</td></tr>';
  });
}
function renderRecordesCalculados_(data) {
  var ultimo = null;
  document.getElementById('listaRecordesCalculados').innerHTML = (data.indicadores || []).map(function (i) {
    if (i.calculadoEm) ultimo = i.calculadoEm;
    var rec = i.mensal
      ? '<b>' + recNum_(i.mensal.valor) + '</b> em ' + formatarMesAnoCurto_(i.mensal.mes) +
        (i.mensal.emAndamento ? '<span class="rec-pill">em andamento</span>' : '') +
        (i.mensal.empates > 1 ? '<span class="rec-sub">empatado em ' + i.mensal.empates + ' meses</span>' : '')
      : 'Sem histórico';
    var dif = '';
    if (i.diferenca !== null && i.diferenca !== undefined) {
      dif = i.diferenca === 0 ? 'Igual ao recorde'
        : (i.diferenca < 0 ? recNum_(Math.abs(i.diferenca)) + ' abaixo' : recNum_(i.diferenca) + ' acima');
    } else if (i.mensal) {
      dif = 'Base do mês ainda pequena';
    }
    var sem = i.semanal
      ? '<b>' + recNum_(i.semanal.valor) + '</b>, semana ' + i.semanal.semana + ' de ' + formatarMesAnoCurto_(i.semanal.mes) +
        (i.semanal.emAndamento ? '<span class="rec-pill">em andamento</span>' : '')
      : 'Sem data por semana';
    return '<tr><td>' + churnEsc_(i.rotulo || i.indicador) + '</td>' +
      '<td class="num">' + (i.valorMesCorrente === null || i.valorMesCorrente === undefined ? 'Sem base' : recNum_(i.valorMesCorrente)) + '</td>' +
      '<td class="num">' + (i.meta === null || i.meta === undefined ? 'Sem meta' : recNum_(i.meta)) + '</td>' +
      '<td>' + rec + '</td><td>' + dif + '</td><td>' + sem + '</td>' +
      '<td>' + (i.historicoDesde ? formatarMesAnoCurto_(i.historicoDesde) : '') + '</td></tr>';
  }).join('');
  document.getElementById('recordesMeta').textContent = ultimo
    ? 'Calculado em ' + churnDataHora_(ultimo) + ' sobre o histórico inteiro que o Monday entrega, e recalculado a cada abertura desta tela. A coluna Série desde mostra onde cada série começa. Matchmakings dos reports semanais são o total autodeclarado e aparecem só como referência.'
    : '';
}

function inicializarMetasDestaques() {
  try {
    carregarRecordesCalculados('');
    popularSeletorMesMatriz_();
    document.getElementById('selMesMatriz').addEventListener('change', carregarMatriz);
    document.getElementById('selAnoMatriz').addEventListener('change', carregarMatriz);
    document.getElementById('chkMostrarOcultosMatriz').addEventListener('change', renderMatrizTabela_);
    document.getElementById('btnSalvarMatriz').addEventListener('click', salvarMatriz_);
    document.getElementById('btnCopiarMesAnterior').addEventListener('click', copiarMesAnterior_);
    document.getElementById('recEscopo').addEventListener('change', function () {
      document.getElementById('recCS').style.display = this.value === 'cs' ? '' : 'none';
    });
    document.getElementById('btnSalvarRecordeManual').addEventListener('click', salvarRecordeManual_);
    carregarMatriz();
    carregarIndicadoresHome();
    carregarRecordesManuais();
  } catch (err) {
    console.error('Erro ao iniciar Metas e destaques:', err);
  }
}

// ============ churn (onda 1, 30/09/2026) ============
// Série, gráfico SVG, tabela, opções de filtro e análise salva chegam prontos de /api/gestor/churn
// (lib/churn.ts); aqui só ficam os filtros, o estado do editor e as chamadas de gerar, salvar e
// publicar. Três estados do painel de análise: sem análise, rascunho da IA ainda não salvo, e
// análise salva (ou publicada). O relatório usa sempre o texto salvo, nunca o do editor.
var ENDPOINT_CHURN = '/api/gestor/churn';
var churnCarregado = false;
var churnEstado_ = { granularidade: 'mes', ref: '', cs: '', categoria: '', produtos: null, comunidade: false };
var churnOpcoesProdutos_ = [];
var churnReq_ = 0;
var churnAgendado_ = null;
var churnRetentouCs_ = false;
var churnDados_ = null;
var churnTextoBase_ = '';
var churnOpcoesMontadas_ = false;
var churnConfirmarGerar_ = false;
var CHURN_MESES_ = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function churnEsc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function churnDataHora_(iso) {
  try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso; }
}
// Mesma seleção da API e da URL da página: produtos ausente = todos, produtos vazio = nenhum
// marcado, comunidade=1 = Comunidade dentro da conta. Copiar o link reproduz a visão.
function churnParams_() {
  var p = new URLSearchParams({ granularidade: churnEstado_.granularidade, ref: churnEstado_.ref });
  if (churnEstado_.cs) p.set('cs', churnEstado_.cs);
  if (churnEstado_.categoria) p.set('categoria', churnEstado_.categoria);
  if (churnEstado_.produtos !== null) p.set('produtos', churnEstado_.produtos.join(','));
  if (churnEstado_.comunidade) p.set('comunidade', '1');
  return p.toString();
}
function churnCorpo_(extra) {
  var o = {
    granularidade: churnEstado_.granularidade, ref: churnEstado_.ref,
    cs: churnEstado_.cs || null, categoria: churnEstado_.categoria || null,
    produtos: churnEstado_.produtos, comunidade: churnEstado_.comunidade,
  };
  Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
  return JSON.stringify(o);
}

function churnPopularRef_() {
  var sel = document.getElementById('churnRef');
  var hoje = new Date();
  var ano = hoje.getFullYear(), mes = hoje.getMonth() + 1, html = '';
  for (var i = 0; i < 24; i++) {
    var valor = ano + '-' + (mes < 10 ? '0' + mes : String(mes));
    html += '<option value="' + valor + '">' + CHURN_MESES_[mes - 1] + ' de ' + ano + '</option>';
    mes--;
    if (mes === 0) { mes = 12; ano--; }
  }
  sel.innerHTML = html;
  churnEstado_.ref = sel.value;
}

function churnSincronizarUrl_() {
  try { window.history.replaceState(null, '', window.location.pathname + '?' + churnParams_() + '#churn'); } catch (e) {}
}
function churnGarantirOpcaoRef_(valor) {
  var sel = document.getElementById('churnRef');
  var existe = false;
  for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value === valor) existe = true; }
  if (!existe) {
    var o = document.createElement('option');
    o.value = valor;
    o.textContent = CHURN_MESES_[Number(valor.slice(5, 7)) - 1] + ' de ' + valor.slice(0, 4);
    sel.appendChild(o);
  }
  sel.value = valor;
}
// Lê a seleção da URL (mesmos nomes da API) para que um link copiado reproduza a mesma visão.
function churnLerUrl_() {
  var q = new URLSearchParams(window.location.search);
  if (!q.has('granularidade') && !q.has('ref') && !q.has('produtos') && !q.has('comunidade')) return;
  if (q.get('granularidade') === 'semana') {
    churnEstado_.granularidade = 'semana';
    document.querySelectorAll('#churnGranularidade .toggle-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.gran === 'semana'); });
  }
  var ref = q.get('ref') || '';
  if (/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(ref)) { churnGarantirOpcaoRef_(ref); churnEstado_.ref = ref; }
  churnEstado_.cs = q.get('cs') || '';
  churnEstado_.categoria = q.get('categoria') || '';
  churnEstado_.produtos = q.has('produtos') ? q.get('produtos').split(',').filter(function (x) { return x; }) : null;
  churnEstado_.comunidade = q.get('comunidade') === '1';
}

function churnAtualizarRotuloProdutos_() {
  var e = churnEstado_, n = churnOpcoesProdutos_.length, txt;
  if (e.produtos === null) txt = e.comunidade ? 'Todos, com a Comunidade' : 'Todos, Comunidade fora';
  else if (e.produtos.length === 0) txt = e.comunidade ? 'Somente a Comunidade' : 'Nenhum marcado';
  else txt = e.produtos.length + (n ? ' de ' + n : '') + ' produtos' + (e.comunidade ? ' e a Comunidade' : '');
  document.getElementById('churnProdutoBtn').textContent = txt;
}
function churnSincronizarChecks_() {
  var sel = churnEstado_.produtos;
  document.querySelectorAll('.chk-prod').forEach(function (c) { c.checked = sel === null ? true : sel.indexOf(c.value) !== -1; });
  var com = document.getElementById('chkComunidade');
  if (com) com.checked = churnEstado_.comunidade;
  churnAtualizarRotuloProdutos_();
}
function churnAgendar_() {
  if (churnAgendado_) clearTimeout(churnAgendado_);
  churnAgendado_ = setTimeout(function () { churnAgendado_ = null; carregarChurn(); }, 300);
}
function churnLerChecks_() {
  var marcados = [], todos = 0;
  document.querySelectorAll('.chk-prod').forEach(function (c) { todos++; if (c.checked) marcados.push(c.value); });
  churnEstado_.produtos = marcados.length === todos ? null : marcados;
  var com = document.getElementById('chkComunidade');
  churnEstado_.comunidade = !!(com && com.checked);
  churnAtualizarRotuloProdutos_();
  churnAgendar_();
}
function churnAbrirProdutos_(abrir) {
  document.getElementById('churnProdutoPop').hidden = !abrir;
  document.getElementById('churnProdutoBtn').setAttribute('aria-expanded', abrir ? 'true' : 'false');
}

function churnPopularOpcoes_(op) {
  if (churnOpcoesMontadas_ || !op) return;
  churnOpcoesMontadas_ = true;
  // CS: só ativos por pessoa; os ex CS aparecem juntos na opção agregada Ex CS.
  var html = '<option value="">Todos</option>';
  if (op.cs.length) {
    html += '<optgroup label="CS ativos">' + op.cs.map(function (x) {
      return '<option value="cs:' + churnEsc_(x.valor) + '">' + churnEsc_(x.valor) + ' (' + x.qtd + ')</option>';
    }).join('') + '</optgroup>';
  }
  if (op.categorias.length) {
    html += '<optgroup label="Histórico">' + op.categorias.map(function (c) {
      return '<option value="cat:' + churnEsc_(c.chave) + '">' + churnEsc_(c.rotulo) + ' (' + c.qtd + ')</option>';
    }).join('') + '</optgroup>';
  }
  var selCs = document.getElementById('churnCs');
  selCs.innerHTML = html;
  var valorCs = churnEstado_.cs ? 'cs:' + churnEstado_.cs : (churnEstado_.categoria ? 'cat:' + churnEstado_.categoria : '');
  selCs.value = valorCs;
  if (selCs.value !== valorCs) { selCs.value = ''; churnEstado_.cs = ''; churnEstado_.categoria = ''; }

  // Produtos em seleção múltipla. A Comunidade vem desmarcada por padrão e continua visível no bloco ao lado.
  churnOpcoesProdutos_ = op.produtos.map(function (p) { return p.valor; });
  var ops = op.produtos.map(function (p) {
    return '<label class="ms-op"><input type="checkbox" class="chk-prod" value="' + churnEsc_(p.valor) + '"> ' + churnEsc_(p.rotulo) + '<span class="qtd">' + p.qtd + '</span></label>';
  }).join('');
  ops += '<div class="ms-sep">Fora da conta por padrão</div>' +
    '<label class="ms-op"><input type="checkbox" id="chkComunidade"> ' + churnEsc_(op.comunidade.rotulo) + '<span class="qtd">' + op.comunidade.qtd + '</span></label>';
  document.getElementById('churnProdutoOpcoes').innerHTML = ops;
  document.querySelectorAll('.chk-prod, #chkComunidade').forEach(function (c) { c.addEventListener('change', churnLerChecks_); });
  churnSincronizarChecks_();
}

function churnAmostra_(cor) {
  var estilo = cor === 'hachura'
    ? 'background:repeating-linear-gradient(45deg,#E9E9E9 0 3px,#9F9F9F 3px 5px);'
    : 'background:' + cor + ';';
  return '<span style="display:inline-block;width:10px;height:10px;border-radius:3px;flex-shrink:0;margin-right:6px;' + estilo + '"></span>';
}
function churnMesCurto_(iso) {
  var p = String(iso).split('-');
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(p[1]) - 1] + '/' + p[0].slice(2);
}

function carregarChurn() {
  var minha = ++churnReq_;
  document.getElementById('churnErro').textContent = '';
  document.getElementById('churnGrafico').innerHTML = '<div class="gestor-empty">Carregando…</div>';
  return fetchJSON_(ENDPOINT_CHURN + '?' + churnParams_()).then(function (data) {
    if (minha !== churnReq_) return;
    churnDados_ = data;
    churnPopularOpcoes_(data.opcoes);
    renderChurn_(data);
    churnSincronizarUrl_();
  }).catch(function (err) {
    if (minha !== churnReq_) return;
    // link com um CS que não é ativo: volta a Todos uma vez em vez de travar a tela
    if (churnEstado_.cs && !churnRetentouCs_ && /CS ativo/.test(err.message || '')) {
      churnRetentouCs_ = true; churnEstado_.cs = ''; churnEstado_.categoria = '';
      return carregarChurn();
    }
    document.getElementById('churnGrafico').innerHTML = '<div class="gestor-erro">Erro ao carregar o churn: ' + churnEsc_(err.message) + '</div>';
  });
}

function renderComunidade_(c, totalPrincipal) {
  var el = document.getElementById('churnComunidade');
  var pctTxt = String(c.pct).replace('.', ',');
  var html = '<div class="churn-com-cab"><h3>Comunidade</h3>' +
    (c.incluida ? '<span class="churn-com-pill dentro">Somada ao gráfico</span>' : '<span class="churn-com-pill">Fora da conta principal</span>') + '</div>' +
    '<div class="churn-com-num"><b>' + c.total + '</b><span>churns da Comunidade no recorte, ' + pctTxt + '% dos ' + c.totalRecorte + ' churns do período</span></div>';
  if (c.incluida) {
    html += '<p class="churn-com-soma">A Comunidade está marcada no filtro de produtos e já compõe as barras e o total ao lado.</p>';
  } else {
    var fecha = (totalPrincipal + c.total === c.totalRecorte);
    html += '<p class="churn-com-soma">Conta principal: ' + totalPrincipal + '. Comunidade: ' + c.total + '.' +
      (fecha ? ' Juntas fecham ' + c.totalRecorte + '.' : ' A conta principal está com filtro de CS ou de produto, por isso não fecha com o total do período.') + '</p>';
  }
  if (!c.total) {
    html += '<p class="churn-com-soma">Nenhum churn da Comunidade neste recorte.</p>';
  } else {
    html += '<table class="churn-tabela"><thead><tr><th>Motivo</th><th class="num">Churns</th></tr></thead><tbody>' + c.porMotivo.map(function (m) {
      return '<tr><td>' + churnAmostra_(m.cor) + churnEsc_(m.rotulo) + '</td><td class="num">' + m.qtd + '</td></tr>';
    }).join('') + '</tbody></table>';
    html += '<div class="churn-com-lista">' + c.periodos.filter(function (p) { return p.qtd > 0; }).map(function (p) {
      return '<span title="' + churnEsc_(p.rotuloLongo) + '">' + churnEsc_(p.rotulo) + ': ' + p.qtd + '</span>';
    }).join('') + '</div>';
  }
  el.innerHTML = html;
}

function renderChurn_(data) {
  document.getElementById('churnDescricao').textContent = 'Recorte: ' + data.descricao + '.';
  var maior = null;
  data.legenda.forEach(function (m) { if (!maior || m.qtd > maior.qtd) maior = m; });
  var rotuloTotal = churnEstado_.comunidade ? 'churns no recorte, com a Comunidade' : 'churns na conta principal, sem a Comunidade';
  var rec = data.recorde || {};
  var semanal = churnEstado_.granularidade === 'semana';
  var rv = semanal ? rec.semanal : rec.mensal;
  var recHtml = '';
  if (rv && rv.valor > 0) {
    var rotRec = semanal
      ? 'recorde semanal, semana ' + rv.semana + ' de ' + churnMesCurto_(rv.mes)
      : 'recorde mensal, ' + churnMesCurto_(rv.mes);
    recHtml = '<div><b>' + rv.valor + '</b><span>' + rotRec + (rv.emAndamento ? ', em andamento' : '') + '</span></div>';
  }
  document.getElementById('churnResumo').innerHTML =
    '<div><b>' + data.total + '</b><span>' + rotuloTotal + '</span></div>' +
    (maior ? '<div><b>' + churnEsc_(String(maior.pct).replace('.', ',')) + '%</b><span>' + churnEsc_(maior.rotulo) + ', motivo mais citado</span></div>' : '') +
    recHtml;
  document.getElementById('churnGrafico').innerHTML = data.total
    ? data.graficoSvg
    : '<div class="gestor-empty">Nenhum churn neste recorte. Troque o mês de referência ou os filtros.</div>';
  document.getElementById('churnLegenda').innerHTML = data.total ? data.legenda.map(function (m) {
    return '<span class="item">' + m.amostra + churnEsc_(m.rotulo) + '</span>';
  }).join('') : '';
  document.getElementById('churnTabela').innerHTML = data.tabelaHtml || '';
  document.getElementById('churnTabela').parentNode.style.display = data.tabelaHtml ? '' : 'none';
  document.getElementById('churnBtnRelatorio').href = '/gestor/churn/relatorio?' + data.query;
  renderComunidade_(data.comunidade, data.total);
  renderAnaliseChurn_(data.analise, data.iaDisponivel, data.total);
}

function churnEstadoAnalise_(a) {
  if (!a) return 'vazia';
  var iaMaisNova = a.textoIa && a.geradoEm && (!a.editadoEm || Date.parse(a.geradoEm) > Date.parse(a.editadoEm));
  if (a.textoIa && (!a.textoGestor || iaMaisNova)) return 'ia';
  if (!a.textoGestor) return 'vazia';
  return a.status === 'publicada' ? 'publicada' : 'salva';
}

function renderAnaliseChurn_(a, iaOk, total) {
  var estado = churnEstadoAnalise_(a);
  var rotulos = { vazia: 'Sem análise', ia: 'Rascunho da IA, não salvo', salva: 'Análise salva', publicada: 'Análise publicada' };
  var st = document.getElementById('churnStatus');
  st.textContent = rotulos[estado];
  st.className = 'churn-status' + (estado === 'vazia' ? '' : ' ' + estado);

  var texto = estado === 'ia' ? a.textoIa : ((a && a.textoGestor) || '');
  document.getElementById('churnTexto').value = texto;
  // rascunho da IA conta como alteração ainda não salva: nada da IA vira análise sem o gestor salvar
  churnTextoBase_ = estado === 'ia' ? '' : texto;
  churnConfirmarGerar_ = false;

  document.getElementById('churnAvisoRascunho').style.display = (estado === 'ia' && a.textoGestor) ? '' : 'none';
  document.getElementById('churnAvisoDesatualizada').style.display = (a && a.desatualizada) ? '' : 'none';
  var avisoIA = document.getElementById('churnAvisoIA');
  var btnGerar = document.getElementById('churnBtnGerar');
  if (!iaOk) {
    avisoIA.style.display = '';
    avisoIA.textContent = 'A geração por IA ainda não está configurada neste ambiente. Você pode escrever e salvar a análise manualmente.';
    btnGerar.disabled = true;
  } else {
    avisoIA.style.display = 'none';
    btnGerar.disabled = !total;
  }
  btnGerar.textContent = 'Gerar rascunho com IA';

  var partes = [];
  if (a && a.geradoEm) partes.push('Rascunho da IA gerado em ' + churnDataHora_(a.geradoEm) + (a.modeloIa ? ' com ' + a.modeloIa : ''));
  if (a && a.textoGestor && a.editadoEm) partes.push('Última alteração por ' + a.editadoPor + ' em ' + churnDataHora_(a.editadoEm));
  document.getElementById('churnMeta').textContent = partes.length ? partes.join('. ') + '.' : '';
  churnAtualizarBotoes_();
}

function churnAlterado_() {
  return document.getElementById('churnTexto').value.trim() !== churnTextoBase_.trim();
}
function churnAtualizarBotoes_() {
  var a = churnDados_ && churnDados_.analise;
  var temTexto = !!document.getElementById('churnTexto').value.trim();
  var alterado = churnAlterado_();
  document.getElementById('churnBtnSalvar').disabled = !temTexto || !alterado;
  document.getElementById('churnBtnPublicar').disabled = alterado || !a || !a.textoGestor || a.status === 'publicada';
  document.getElementById('churnBtnPublicar').textContent = a && a.status === 'publicada' && !alterado ? 'Publicada' : 'Publicar';
}

function churnGerar_() {
  var erro = document.getElementById('churnErro');
  erro.textContent = '';
  if (churnAlterado_() && document.getElementById('churnTexto').value.trim() && !churnConfirmarGerar_) {
    churnConfirmarGerar_ = true;
    erro.textContent = 'Você tem alterações não salvas no editor. Clique de novo em Gerar rascunho para substituí-las pelo novo rascunho.';
    return;
  }
  var btn = document.getElementById('churnBtnGerar');
  btn.disabled = true;
  btn.textContent = 'Gerando rascunho…';
  fetchJSON_(ENDPOINT_CHURN + '/analise/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: churnCorpo_({}) })
    .then(function () { return carregarChurn(); })
    .catch(function (err) {
      erro.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Gerar rascunho com IA';
    });
}

function churnSalvar_() {
  var erro = document.getElementById('churnErro');
  erro.textContent = '';
  var btn = document.getElementById('churnBtnSalvar');
  btn.disabled = true;
  fetchJSON_(ENDPOINT_CHURN + '/analise', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: churnCorpo_({ acao: 'salvar', texto: document.getElementById('churnTexto').value }),
  }).then(function (r) {
    churnDados_.analise = r.analise;
    renderAnaliseChurn_(r.analise, churnDados_.iaDisponivel, churnDados_.total);
  }).catch(function (err) {
    erro.textContent = err.message;
    churnAtualizarBotoes_();
  });
}

function churnPublicar_() {
  var erro = document.getElementById('churnErro');
  erro.textContent = '';
  document.getElementById('churnBtnPublicar').disabled = true;
  fetchJSON_(ENDPOINT_CHURN + '/analise', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: churnCorpo_({ acao: 'publicar' }),
  }).then(function (r) {
    churnDados_.analise = r.analise;
    renderAnaliseChurn_(r.analise, churnDados_.iaDisponivel, churnDados_.total);
  }).catch(function (err) {
    erro.textContent = err.message;
    churnAtualizarBotoes_();
  });
}

function inicializarChurn() {
  try {
    churnPopularRef_();
    churnLerUrl_();
    document.querySelectorAll('#churnGranularidade .toggle-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#churnGranularidade .toggle-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        churnEstado_.granularidade = b.dataset.gran;
        carregarChurn();
      });
    });
    document.getElementById('churnRef').addEventListener('change', function () { churnEstado_.ref = this.value; carregarChurn(); });
    document.getElementById('churnCs').addEventListener('change', function () {
      var v = this.value;
      churnEstado_.cs = v.indexOf('cs:') === 0 ? v.slice(3) : '';
      churnEstado_.categoria = v.indexOf('cat:') === 0 ? v.slice(4) : '';
      carregarChurn();
    });
    document.getElementById('churnProdutoBtn').addEventListener('click', function () {
      churnAbrirProdutos_(document.getElementById('churnProdutoPop').hidden);
    });
    document.getElementById('churnProdutoTodos').addEventListener('click', function () {
      churnEstado_.produtos = null; churnEstado_.comunidade = true;
      churnSincronizarChecks_(); churnAgendar_();
    });
    document.getElementById('churnProdutoLimpar').addEventListener('click', function () {
      churnEstado_.produtos = []; churnEstado_.comunidade = false;
      churnSincronizarChecks_(); churnAgendar_();
    });
    document.addEventListener('click', function (ev) {
      var wrap = document.getElementById('churnProdutoWrap');
      if (wrap && !wrap.contains(ev.target)) churnAbrirProdutos_(false);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') churnAbrirProdutos_(false); });
    document.getElementById('churnTexto').addEventListener('input', function () { churnConfirmarGerar_ = false; churnAtualizarBotoes_(); });
    document.getElementById('churnBtnGerar').addEventListener('click', churnGerar_);
    document.getElementById('churnBtnSalvar').addEventListener('click', churnSalvar_);
    document.getElementById('churnBtnPublicar').addEventListener('click', churnPublicar_);
    document.getElementById('churnBtnVoltarSalvo').addEventListener('click', function () {
      var a = churnDados_ && churnDados_.analise;
      if (!a || !a.textoGestor) return;
      document.getElementById('churnTexto').value = a.textoGestor;
      churnTextoBase_ = a.textoGestor;
      document.getElementById('churnAvisoRascunho').style.display = 'none';
      var st = document.getElementById('churnStatus');
      st.textContent = a.status === 'publicada' ? 'Análise publicada' : 'Análise salva';
      st.className = 'churn-status ' + (a.status === 'publicada' ? 'publicada' : 'salva');
      churnAtualizarBotoes_();
    });
    document.getElementById('churnBtnRelatorio').addEventListener('click', function () {
      if (churnAlterado_()) {
        document.getElementById('churnErro').textContent = 'O relatório usa o texto salvo. Salve a análise para incluir as alterações do editor.';
      }
    });
    carregarChurn();
  } catch (err) {
    console.error('Erro ao iniciar Churn:', err);
  }
}

carregarVisaoGeral();

// link direto /gestor#churn (usado pelo "Voltar ao painel" do relatório de churn)
if (window.location.hash === '#churn' || new URLSearchParams(window.location.search).has('granularidade')) {
  var btnAbaChurn_ = document.querySelector('.tab-btn[data-tab="churn"]');
  if (btnAbaChurn_) btnAbaChurn_.click();
}
`;
