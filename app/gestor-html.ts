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

import { FAIXAS_PRESENCA } from '../lib/constants.ts';
import { RADAR_SVG_SCRIPT } from '../lib/radar-svg.ts';

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
.rank-bar-bg{position:relative;height:8px;border-radius:99px;background:var(--cinza-superficie);overflow:hidden;}
.rank-bar-mark{position:absolute;top:0;bottom:0;width:2px;background:var(--preto-tinta);opacity:.55;}
.rank-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--dourado),var(--verde));}
.rank-score{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:16px;text-align:right;}

.cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px;}
.cs-card{position:relative;background:var(--branco);border:1px solid var(--cinza-borda);border-radius:24px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;transition:transform .15s ease,box-shadow .15s ease;outline:none;}
.cs-card:hover,.cs-card:focus-visible{transform:translateY(-3px);box-shadow:0 12px 28px rgba(20,20,20,0.12);}
.cs-card:focus-visible{border-color:var(--dourado);}
.cs-card-foto-wrap{position:relative;aspect-ratio:1/1;background:var(--grafite);overflow:hidden;}
.cs-card-foto{width:100%;height:100%;object-fit:cover;display:block;}
.cs-card-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:64px;color:#fff;}
.cs-card-pos{position:absolute;top:12px;left:12px;font-size:11px;font-weight:800;padding:5px 11px;border-radius:99px;background:var(--dourado);color:var(--preto-tinta);}
.cs-card-pos.sem{background:rgba(20,20,20,0.72);color:#fff;font-weight:700;}
.cs-card-over{position:absolute;left:0;right:0;bottom:0;padding:34px 16px 12px;background:linear-gradient(180deg,rgba(20,20,20,0),rgba(20,20,20,0.82));color:#fff;}
.cs-card-nome{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:18px;line-height:1.15;}
.cs-card-body{padding:14px 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.cs-card-score{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:30px;line-height:1;}
.cs-card-score-lbl{font-size:11px;color:var(--cinza-texto);margin-top:3px;}
.cs-card-semdados{font-size:12.5px;font-weight:600;color:var(--cinza-texto);line-height:1.35;}
.cs-nota{font-size:12px;color:var(--cinza-texto);margin-top:14px;}
.acoes-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:20px;margin-top:28px;align-items:start;}
@media (max-width:980px){.acoes-grid{grid-template-columns:1fr;}}
.acoes-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:24px;padding:24px;}
.acoes-card h2{font-size:21px;font-weight:700;margin:0 0 4px;}
.acoes-sub{font-size:12.5px;color:var(--cinza-texto);margin:0 0 16px;line-height:1.5;}
.acoes-faixa{padding:16px 0;border-top:1px solid #EFEDED;}
.acoes-faixa:first-of-type{border-top:none;padding-top:0;}
.acoes-faixa-titulo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;font-weight:700;font-size:14px;margin-bottom:10px;}
.acoes-faixa-titulo span{font-weight:500;font-size:12px;color:var(--cinza-texto);}
.cont-linha{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.cont{font-size:12px;font-weight:700;padding:5px 12px;border-radius:99px;background:var(--cinza-fundo);color:var(--cinza-texto);}
.cont.vermelho{background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.cont.ambar{background:#FBF1DA;color:#8A6410;border:1px solid #EBD39C;}
.chips-nomes{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
.chip-nome{font-size:12px;font-weight:700;padding:4px 11px;border-radius:99px;}
.chip-nome.vermelho{background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.chip-nome.ambar{background:#FBF1DA;color:#8A6410;border:1px solid #EBD39C;}
.urg-cs{border-top:1px solid #EFEDED;}
.urg-cs:first-of-type{border-top:none;}
.urg-cs > summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 0;font-size:13.5px;}
.urg-cs > summary::-webkit-details-marker{display:none;}
.urg-cs > summary::before{content:"▸";color:var(--cinza-apoio);font-size:11px;width:10px;}
.urg-cs[open] > summary::before{content:"▾";}
.urg-cs-nome{font-weight:700;min-width:70px;}
.urg-cs-muted{color:var(--cinza-texto);font-size:12.5px;}
.urg-lista{padding:0 0 12px 20px;}
.urg-item{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:7px 0;border-top:1px solid #F3F1F1;font-size:12.5px;}
.urg-item:first-child{border-top:none;}
.urg-item b{font-weight:600;}
.urg-item .quando{font-weight:700;text-align:right;white-space:nowrap;}
.urg-item .quando.vermelho{color:var(--vermelho);}
.urg-item .quando.ambar{color:#8A6410;}
.urg-item .detalhe{font-size:11.5px;color:var(--cinza-texto);}
.acoes-rodape{margin-top:14px;font-size:11.5px;color:var(--cinza-apoio);line-height:1.5;}
.ins-item{padding:14px 0;border-top:1px solid #EFEDED;}
.ins-item:first-of-type{border-top:none;padding-top:0;}
.ins-topo{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.ins-sev{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:99px;}
.ins-sev.alta{background:#FBEEEC;color:var(--vermelho);}
.ins-sev.media{background:#FBF1DA;color:#8A6410;}
.ins-sev.baixa{background:var(--cinza-superficie);color:var(--cinza-texto);}
.ins-oque{font-size:13.5px;font-weight:600;line-height:1.4;}
.ins-num{font-size:12.5px;margin-top:5px;}
.ins-num b{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;}
.ins-num span{color:var(--cinza-texto);}
.ins-acao{font-size:12.5px;margin-top:6px;line-height:1.5;}
.ins-quem{font-size:12px;color:var(--cinza-texto);margin-top:4px;}
.ins-mais{margin-top:10px;background:none;border:none;color:var(--dourado);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;padding:0;}
.acoes-erro{padding:12px 14px;border-radius:12px;background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;font-size:12.5px;line-height:1.5;}

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
.kanban-col-head-num{display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-transform:none;letter-spacing:0;white-space:nowrap;}
.kanban-col-pct{font-size:10.5px;font-weight:600;color:var(--cinza-apoio);}
.kanban-filtro{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;}
.kanban-filtro label{font-weight:700;color:var(--cinza-apoio);text-transform:uppercase;font-size:10.5px;letter-spacing:0.04em;}
.kanban-filtro select{font:inherit;font-size:12.5px;padding:7px 10px;border:1px solid var(--cinza-borda);border-radius:10px;background:var(--branco);}
.kanban-health{font-size:12.5px;font-weight:700;padding:5px 12px;border-radius:999px;background:var(--cinza-superficie);}
.kanban-nota{font-size:11px;color:var(--cinza-apoio);margin:-4px 0 12px;}
.kanban-barras{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.kanban-barra-linha{display:grid;grid-template-columns:110px 1fr 120px;gap:10px;align-items:center;font-size:12px;}
.kanban-barra-nome{font-weight:700;}
.kanban-barra{display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--cinza-linha);}
.kanban-barra-seg{height:100%;}
.kanban-barra-health{font-size:11px;color:var(--cinza-apoio);text-align:right;white-space:nowrap;}
.kanban-legenda{display:flex;flex-wrap:wrap;gap:12px;font-size:10.5px;color:var(--cinza-apoio);margin-bottom:10px;}
.kanban-legenda span{display:inline-flex;align-items:center;gap:5px;}
.kanban-legenda i{width:10px;height:10px;border-radius:3px;display:inline-block;}
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
.churn-numeros{display:flex;gap:48px;flex-wrap:wrap;margin:6px 0 4px;}
.churn-numero b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:40px;line-height:1.05;}
.churn-numero b.texto{font-size:26px;line-height:1.2;}
.churn-numero .rot{display:block;font-size:13px;font-weight:600;color:var(--preto-tinta);margin-top:4px;}
.churn-numero .def{display:block;font-size:12px;color:var(--cinza-apoio);margin-top:2px;}
.churn-nota{font-size:12.5px;color:var(--cinza-apoio);margin:6px 0 14px;min-height:18px;}
.churn-info{width:22px;height:22px;border-radius:50%;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--cinza-texto);font-size:12px;font-weight:700;cursor:pointer;line-height:1;padding:0;}
.churn-info:hover{border-color:var(--preto-tinta);}
.churn-sem-carteira{font-size:12.5px;color:var(--cinza-texto);margin:12px 0 0;}
.churn-sem-carteira button,.churn-link{background:none;border:none;padding:0;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;color:var(--preto-tinta);}
.churn-rodape{margin:14px 0 0;font-size:13px;color:var(--cinza-texto);}
.churn-rodape-linha{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
.churn-rodape-det{margin-top:8px;max-width:420px;}
.churn-rodape-det table{width:100%;font-size:12px;}
.churn-rodape-det td,.churn-rodape-det th{padding:5px 4px;}
.churn-lista-wrap{margin:14px 0 0;}
.churn-lista{margin-top:10px;}
.churn-lista h4{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;margin:16px 0 6px;}
.churn-lista table{width:100%;font-size:12.5px;}
.churn-lista td,.churn-lista th{padding:7px 8px;vertical-align:top;}
.churn-lista .acoes{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:12.5px;}
.churn-lista .acoes a{font-weight:700;color:var(--preto-tinta);}
.rec-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(200,154,46,0.15);color:var(--dourado);margin-left:6px;white-space:nowrap;}
.rec-sub{display:block;font-size:11px;color:var(--cinza-apoio);font-weight:500;}

@media (max-width:640px){
  .hero{padding:38px 24px 34px;} .hero h1{font-size:26px;} .hero-stats{gap:26px;}
  .rank-row{grid-template-columns:24px 1fr 44px;} .rank-bar-wrap{display:none;}
  .form-inline{flex-direction:column;}
  .kanban-grid{grid-template-columns:1fr;}
  .kanban-barra-linha{grid-template-columns:80px 1fr;} .kanban-barra-health{grid-column:1/-1;text-align:left;}
  .rede-stats{flex-direction:column;align-items:stretch;}
  .tabs{overflow-x:auto;}
  .tab-btn{margin-right:16px;white-space:nowrap;}
  .churn-card{padding:16px 12px 12px;}
  .churn-numeros{gap:22px;} .churn-numero b{font-size:32px;} .churn-numero b.texto{font-size:22px;}
  .churn-campo{width:100%;justify-content:space-between;}
  .ms-pop{left:auto;right:0;min-width:min(280px,86vw);}
  #churnGrafico svg{min-width:560px;}
  .churn-filtros label{width:100%;justify-content:space-between;}
  .churn-filtros select{max-width:62%;}
  .churn-acoes button,.churn-acoes a{flex:1 1 45%;text-align:center;}
}

/* Pulso de CS (05/10/2026) */
.pulso-filtros{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:18px;}
.pulso-aviso{font-size:12px;color:var(--cinza-texto);background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:14px;padding:12px 16px;margin-bottom:22px;line-height:1.55;max-width:760px;}
.pulso-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:26px;}
.pulso-tile{background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:20px;padding:22px 24px;}
.pulso-tile-label{font-size:11px;letter-spacing:0.08em;font-weight:600;color:var(--cinza-apoio);text-transform:uppercase;margin-bottom:10px;}
.pulso-tile-valor{font-size:40px;font-weight:700;line-height:1;color:var(--preto-tinta);}
.pulso-tile-valor.ok{color:var(--verde);} .pulso-tile-valor.atencao{color:var(--dourado);} .pulso-tile-valor.risco{color:var(--vermelho);}
.pulso-tile-sub{font-size:12px;color:var(--cinza-texto);margin-top:10px;line-height:1.5;}
.pulso-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:26px;}
.pulso-card{background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:20px;padding:22px 24px;}
.pulso-card h3{font-size:14px;font-weight:700;margin:0 0 14px;}
.pulso-barra-linha{display:grid;grid-template-columns:minmax(120px,1.4fr) 2fr 28px;gap:10px;align-items:center;margin-bottom:9px;font-size:12px;}
.pulso-barra-bg{background:var(--cinza-superficie);border-radius:6px;height:8px;overflow:hidden;}
.pulso-barra-fill{background:var(--dourado);height:100%;border-radius:6px;}
.pulso-barra-num{font-weight:700;text-align:right;}
.pulso-serie{width:100%;border-collapse:collapse;font-size:12px;}
.pulso-serie th{text-align:left;font-size:11px;letter-spacing:0.06em;color:var(--cinza-apoio);font-weight:600;padding:6px 8px;border-bottom:0.75pt solid var(--cinza-borda);}
.pulso-serie td{padding:8px;border-bottom:0.75pt solid var(--cinza-superficie);}
.pulso-textos{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;}
.pulso-texto-bloco{background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:20px;padding:20px 22px;}
.pulso-texto-bloco h3{font-size:13px;font-weight:700;margin:0 0 12px;}
.pulso-fala{font-size:12.5px;line-height:1.6;color:var(--preto-tinta);padding:10px 0;border-top:0.75pt solid var(--cinza-superficie);white-space:pre-line;}
.pulso-fala:first-of-type{border-top:0;padding-top:0;}
.pulso-vazio{font-size:12px;color:var(--cinza-apoio);}

/* Voz do liderado (05/10/2026) */
.voz-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px;}
.voz-tile{background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:16px;padding:16px 18px;}
.voz-tile-valor{font-size:30px;font-weight:700;line-height:1;}
.voz-tile-label{font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;color:var(--cinza-apoio);margin-top:8px;}
.voz-insights{background:var(--preto-profundo);color:#fff;border-radius:20px;padding:24px 28px;margin-bottom:22px;}
.voz-insights h3{font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:var(--dourado);margin:0 0 14px;font-weight:700;}
.voz-insight{font-size:13.5px;line-height:1.6;padding:9px 0 9px 16px;border-left:2px solid var(--dourado);margin-bottom:8px;}
.voz-insight:last-child{margin-bottom:0;}
.voz-temas-linha{display:grid;grid-template-columns:minmax(150px,1.3fr) 3fr 90px;gap:12px;align-items:center;padding:7px 8px;margin:0 -8px;border-radius:10px;font-size:12px;cursor:pointer;background:none;border:0;width:calc(100% + 16px);text-align:left;font-family:inherit;color:inherit;}
.voz-temas-linha:hover,.voz-temas-linha.ativo{background:var(--cinza-fundo);}
.voz-temas-barra{display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--cinza-superficie);}
.voz-seg-backlog{background:var(--cinza-linha);} .voz-seg-em_andamento{background:var(--dourado);} .voz-seg-realizado{background:var(--verde);} .voz-seg-rejeitado{background:var(--vermelho);}
.voz-temas-num{font-weight:700;text-align:right;white-space:nowrap;}
.voz-legenda{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--cinza-texto);margin-top:12px;}
.voz-legenda i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:middle;}
.voz-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start;margin-top:8px;}
.voz-col{background:var(--cinza-superficie);border-radius:18px;padding:12px;min-height:120px;}
.voz-col-head{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:4px 6px 12px;}
.voz-col-backlog .voz-col-head{color:var(--cinza-texto);} .voz-col-em_andamento .voz-col-head{color:var(--dourado);} .voz-col-realizado .voz-col-head{color:var(--verde);} .voz-col-rejeitado .voz-col-head{color:var(--vermelho);}
.voz-col-vazio{font-size:12px;color:var(--cinza-apoio);padding:10px 6px;}
.voz-card{background:var(--branco);border:0.75pt solid var(--cinza-borda);border-radius:14px;padding:14px 14px 12px;margin-bottom:10px;}
.voz-card-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;}
.voz-tag{font-size:10px;font-weight:600;letter-spacing:0.03em;padding:3px 8px;border-radius:20px;background:var(--cinza-fundo);color:var(--cinza-texto);}
.voz-tag.origem{background:var(--preto-tinta);color:#fff;}
.voz-tag.parar{background:#F6DEDC;color:var(--vermelho);} .voz-tag.comecar{background:#DDEFE5;color:var(--verde);}
.voz-tag.tema{background:#F5ECD3;color:#8A6A18;}
.voz-card-texto{font-size:12.5px;line-height:1.6;white-space:pre-line;}
.voz-card-meta{font-size:11px;color:var(--cinza-texto);margin-top:8px;line-height:1.5;}
.voz-card-meta b{color:var(--preto-tinta);}
.voz-card-acoes{display:flex;gap:6px 8px;align-items:center;flex-wrap:wrap;margin-top:12px;}
.voz-card-acoes select{flex:1 1 130px;min-width:0;}
.voz-btn-link{background:none;border:0;font-family:inherit;font-size:11px;font-weight:600;color:var(--cinza-texto);cursor:pointer;text-decoration:underline;padding:4px;}
.voz-obs{margin-top:10px;}
.voz-obs textarea{width:100%;min-height:62px;font-family:inherit;font-size:12px;border:1px solid var(--cinza-borda);border-radius:10px;padding:8px 10px;resize:vertical;}
.voz-obs button{margin-top:6px;}
.voz-obs-lida{margin-top:10px;font-size:11.5px;line-height:1.5;background:var(--cinza-fundo);border-radius:10px;padding:8px 10px;color:var(--cinza-texto);}
.voz-manter{margin-bottom:22px;}
.voz-manter li{font-size:12.5px;line-height:1.6;margin-bottom:6px;}
.voz-erro{font-size:11px;color:var(--vermelho);margin-top:6px;}
@media (max-width:1100px){.voz-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media (max-width:640px){.voz-grid{grid-template-columns:1fr;} .voz-temas-linha{grid-template-columns:1fr;gap:6px;} .voz-temas-num{text-align:left;}}
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
    <button class="tab-btn" data-tab="pulso">Pulso de CS</button>
    <button class="tab-btn" data-tab="voz">Voz do liderado</button>
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

    <div class="acoes-grid">
      <section class="acoes-card" id="blocoUrgencias" aria-label="Urgências">
        <h2>Urgências</h2>
        <p class="acoes-sub">O que precisa ser feito o quanto antes, com responsável e prazo.</p>
        <div id="urgenciasCorpo"><div class="gestor-empty">Carregando…</div></div>
      </section>
      <section class="acoes-card" id="blocoInsights" aria-label="Insights">
        <h2>Insights</h2>
        <p class="acoes-sub">O que os números estão dizendo e a primeira ação a tomar.</p>
        <div id="insightsCorpo"><div class="gestor-empty">Carregando…</div></div>
      </section>
    </div>

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
        <h2>CS da área</h2>
        <p>Foto, pontuação e posição de cada CS ativo. Clique no card para abrir a página do CS, com radar, GTD, membros críticos e advertências.</p>
      </div>
      <div class="cs-grid" id="csGrid"></div>
      <div class="cs-nota" id="csGridNota"></div>
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
          <div class="kanban-filtro">
            <label for="kanbanCS">Carteira</label>
            <select id="kanbanCS"></select>
            <span class="kanban-health" id="kanbanHealthCS" style="display:none"></span>
          </div>
          <div class="kanban-nota" id="kanbanNota"></div>
          <div id="kanbanBarrasWrap"></div>
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
        <p class="sync-desc">Nome, pontos e validade de cada tipo. Desativar tira do formulário de aplicar na página do CS, mas mantém o histórico de quem já recebeu (a aplicação guarda uma cópia congelada, não muda com edição no catálogo).</p>
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

  <div class="tab-panel" id="tab-voz">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Voz do liderado</h2>
          <p>O que o time sugere, aponta e pede nas respostas abertas do Pulso de CS, organizado para o líder decidir o que fazer com cada ponto. Toda sugestão entra em backlog.</p>
        </div>
      </div>
      <div class="pulso-filtros">
        <label class="churn-campo">Período <select class="pill-select" id="vozMes"></select></label>
        <label class="churn-campo">Tema <select class="pill-select" id="vozTema"><option value="">Todos</option></select></label>
        <label class="churn-campo">Origem <select class="pill-select" id="vozCampo"><option value="">Todas</option></select></label>
        <label class="churn-campo">Busca <input type="text" class="pill-select" id="vozBusca" maxlength="80" placeholder="Palavra no texto" style="min-width:180px;"></label>
      </div>
      <p class="pulso-aviso">As sugestões aparecem sem o nome de quem escreveu. Cada resposta aberta do Pulso vira uma ou mais sugestões, e as do campo começar, parar e continuar são separadas por frase. O que o time quer manter fica à parte, porque não pede uma ação. O status e a observação ficam registrados com a data e o gestor que decidiu.</p>
      <div id="vozConteudo"><div class="gestor-empty">Carregando…</div></div>
    </section>
  </div>

  <div class="tab-panel" id="tab-pulso">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Pulso de CS</h2>
          <p>Formulário mensal do time de CS. Substitui, a partir de outubro de 2026, a avaliação entre pares e o NPS interno antigo.</p>
        </div>
      </div>
      <div class="pulso-filtros">
        <label class="churn-campo">Período <select class="pill-select" id="pulsoMes"></select></label>
      </div>
      <p class="pulso-aviso">Nenhuma resposta é identificada nesta tela. Os textos aparecem embaralhados e sem o nome de quem respondeu. O NPS interno usa a régua padrão da MOAI: notas 9 e 10 são promotores, 7 e 8 neutros e 0 a 6 detratores.</p>
      <div id="pulsoConteudo"><div class="gestor-empty">Carregando…</div></div>
    </section>
  </div>

  <div class="tab-panel" id="tab-churn">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Churn por motivo</h2>
          <p>Quantos membros saíram e por quê, segundo o formulário de saída.</p>
        </div>
      </div>
      <div class="churn-filtros">
        <label class="churn-campo">Mês <select class="pill-select" id="churnRef" title="Mês de referência"></select></label>
        <label class="churn-campo">Base <select class="pill-select" id="churnBase"><option value="carteira_atual">Carteira atual</option><option value="toda_a_rede">Toda a rede</option></select></label>
        <label class="churn-campo">CS <select class="pill-select" id="churnCs"><option value="">Todos</option></select></label>
        <div class="churn-campo">Produtos
          <div class="ms" id="churnProdutoWrap">
            <button type="button" class="pill-select ms-btn" id="churnProdutoBtn" aria-haspopup="true" aria-expanded="false">Carregando…</button>
            <div class="ms-pop" id="churnProdutoPop" role="group" aria-label="Produtos" hidden>
              <div class="ms-acoes"><button type="button" id="churnProdutoTodos">Selecionar todos</button><button type="button" id="churnProdutoLimpar">Limpar</button></div>
              <div id="churnProdutoOpcoes"></div>
            </div>
          </div>
        </div>
        <div class="toggle-group" id="churnGranularidade">
          <button class="toggle-btn active" type="button" data-gran="mes">Por mês</button>
          <button class="toggle-btn" type="button" data-gran="semana">Por semana</button>
        </div>
        <button type="button" class="churn-info" id="churnInfo" aria-label="Como este recorte é calculado" title="Como este recorte é calculado">i</button>
      </div>
      <p class="churn-descricao" id="churnDescricao" hidden></p>
      <div class="churn-numeros" id="churnNumeros"><div class="gestor-empty">Carregando…</div></div>
      <p class="churn-nota" id="churnNotaRecorde"></p>
      <div class="churn-card">
        <div id="churnGrafico"><div class="gestor-empty">Carregando…</div></div>
        <div class="churn-legenda" id="churnLegenda"></div>
        <p class="churn-sem-carteira" id="churnAvisoCarteira" hidden><span id="churnAvisoCarteiraTexto"></span> <button type="button" id="churnVerRede">Ver Toda a rede</button></p>
      </div>
      <div class="churn-rodape" id="churnComunidade" aria-live="polite"></div>
      <div class="churn-lista-wrap">
        <button type="button" class="churn-link" id="churnVerLista" aria-expanded="false">Ver os churns deste mês</button>
        <div class="churn-lista" id="churnLista" hidden></div>
      </div>
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
    var semMeta = !!item.semMeta;
    var avisoMeta = semMeta ? '<span class="meta-aviso" title="Sem meta cadastrada: o indicador fica fora da média.">sem meta</span>' : (item.semPontos ? '<span class="meta-aviso" title="A carteira não dá pontos: mede alocação, não desempenho.">sem pontos</span>' : '');
    var alem = (item.alemDaMetaPct > 0) ? ', ' + item.alemDaMetaPct + '% além da meta' : '';
    return '<div class="score-detalhe-row">'
      + '<span class="score-detalhe-label">' + item.label + avisoMeta + '</span>'
      + '<span class="score-detalhe-peso">peso ' + item.peso + '</span>'
      + '<span class="score-detalhe-valor">' + (semMeta ? val + ' · sem meta' : val + ' / ' + meta + ' · ' + ach + alem) + '</span>'
      + '<span class="score-detalhe-pontos">' + (item.semPontos ? 'sem pontos' : ((semMeta || item.pontos === null || item.pontos === undefined) ? 'fora da média' : item.pontos + ' pts')) + '</span>'
      + '</div>';
  }).join('');
  document.getElementById('infoModalBody').innerHTML =
    '<div class="info-modal-titulo">' + d.nome + '</div>'
    + '<div class="info-modal-sub">Pontuação: ' + (d.score === null || d.score === undefined ? '—' : d.score) + '</div>'
    + linhas
    + '<div class="info-modal-rodape">Pontos = peso × aproveitamento de cada indicador na meta. Indicador sem meta cadastrada fica fora da média e os pesos dos demais são redistribuídos. A carteira não dá pontos. Quem supera a meta passa de 100.</div>';
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
    if (btn.dataset.tab === 'pulso' && !pulsoCarregado_) { pulsoCarregado_ = true; inicializarPulso_(); }
    if (btn.dataset.tab === 'voz' && !vozCarregado_) { vozCarregado_ = true; inicializarVoz_(); }
  });
});

${RADAR_SVG_SCRIPT}

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
  // quem ficou sem indicadores com meta suficientes não ganha número: a nota fica abaixo da lista
  // escala dinâmica com marca em 100: quem passa da meta (acima de 100) se destaca sem quebrar o layout
  var maxScore = Math.max.apply(null, DADOS.ranking.map(function (r) { return r.scoreReal || 0; }).concat([100]));
  var marca100 = (100 / maxScore * 100).toFixed(1);
  el.innerHTML = DADOS.ranking.map(function (r, i) {
    var status = classificarScore(r.scoreReal);
    var pct = maxScore > 0 ? (r.scoreReal / maxScore * 100) : 0;
    var idxModal = registrarScoreModal_(r.nome, r.scoreReal, r.detalhamento);
    return '<div class="rank-row"><span class="rank-pos">' + (i + 1) + '</span>'
      + '<div class="rank-name-wrap"><span class="status-dot" style="background:' + status.cor + '"></span><span class="rank-name">' + r.nome + '</span></div>'
      + '<div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:' + pct.toFixed(0) + '%"></div><div class="rank-bar-mark" style="left:' + marca100 + '%" title="Meta batida (100)"></div></div></div>'
      + '<span class="rank-score">' + (r.scoreReal === null || r.scoreReal === undefined ? '—' : r.scoreReal) + '<button class="info-btn" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta">ⓘ</button></span></div>';
  }).join('');
}


// ============ Urgências e Insights (07/10/2026) ============
// Uma chamada agregada (/api/gestor/visao-geral/acoes). Cada bloco tem proteção própria e mostra a
// mensagem real do erro só nele. Cor só para exceção: CS sem pendência não ganha destaque. Nada
// aqui é calculado: status de report, prazos de GTD e insights chegam prontos do servidor.
var ACOES_ = null;
var INSIGHTS_TODOS_ = false;
function dmAcoes_(iso) { if (!iso) return 'sem data'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
function dmaAcoes_(iso) { if (!iso) return 'sem data'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function chipsAcoes_(nomes, cor) { return nomes.length ? '<div class="chips-nomes">' + nomes.map(function (n) { return '<span class="chip-nome ' + cor + '">' + escCS_(n) + '</span>'; }).join('') + '</div>' : ''; }
function quandoAcoes_(i) {
  if (i.status === 'atrasada') return '<span class="quando vermelho">' + i.dias + (i.dias === 1 ? ' dia de atraso' : ' dias de atraso') + '</span>';
  return '<span class="quando ambar">' + (i.dias === 0 ? 'vence hoje' : 'vence em ' + i.dias + (i.dias === 1 ? ' dia' : ' dias')) + '</span>';
}
function renderUrgencias_() {
  var el = document.getElementById('urgenciasCorpo');
  var u = ACOES_.urgencias;
  if (u.erro) { el.innerHTML = '<div class="acoes-erro">Não foi possível carregar as urgências: ' + escCS_(u.erro) + '</div>'; return; }
  var d = u.dado, r = d.report;
  var html = '<div class="acoes-faixa"><div class="acoes-faixa-titulo">Report semanal <span>semana de ' + dmAcoes_(r.semanaInicio) + ' a ' + dmAcoes_(r.semanaFim) + ', prazo na sexta ' + dmAcoes_(r.prazo) + '</span></div>'
    + '<div class="cont-linha"><span class="cont">Em dia ' + r.emDia.length + '</span>'
    + '<span class="cont' + (r.comAtraso.length ? ' ambar' : '') + '">Com atraso ' + r.comAtraso.length + '</span>'
    + '<span class="cont' + (r.pendentes.length ? ' vermelho' : '') + '">Pendente ' + r.pendentes.length + '</span></div>'
    + (r.pendentes.length ? '<div class="urg-cs-muted">Pendentes</div>' + chipsAcoes_(r.pendentes, 'vermelho') : '')
    + (r.comAtraso.length ? '<div class="urg-cs-muted" style="margin-top:8px;">Enviaram com atraso</div>' + chipsAcoes_(r.comAtraso, 'ambar') : '')
    + (!r.pendentes.length && !r.comAtraso.length ? '<div class="urg-cs-muted">Todos os CS enviaram o report no prazo.</div>' : '')
    + '</div>';
  var g = d.gtd;
  html += '<div class="acoes-faixa"><div class="acoes-faixa-titulo">Tarefas de GTD <span>ciclos abertos, até 14 dias depois do conselho</span></div>'
    + '<div class="cont-linha"><span class="cont' + (g.totalAtrasadas ? ' vermelho' : '') + '">Atrasadas ' + g.totalAtrasadas + '</span>'
    + '<span class="cont' + (g.totalAVencer ? ' ambar' : '') + '">A vencer em 7 dias ' + g.totalAVencer + '</span></div>';
  html += g.porCS.map(function (c) {
    if (!c.ciclosAbertos) return '<div class="urg-cs"><div class="urg-cs-muted" style="padding:11px 0 11px 20px;"><b>' + escCS_(c.cs) + '</b>, sem ciclos abertos</div></div>';
    if (!c.atrasadas && !c.aVencer) return '<div class="urg-cs"><div class="urg-cs-muted" style="padding:11px 0 11px 20px;"><b>' + escCS_(c.cs) + '</b>, sem pendências em ' + c.ciclosAbertos + (c.ciclosAbertos === 1 ? ' ciclo aberto' : ' ciclos abertos') + '</div></div>';
    var itens = c.itens.map(function (i) {
      return '<div class="urg-item"><div><b>' + escCS_(i.membro) + '</b>, ' + escCS_(i.rotulo) + '</div>' + quandoAcoes_(i)
        + '<div class="detalhe">Prazo ' + dmAcoes_(i.prazo) + ', conselho em ' + dmAcoes_(i.dataConselho) + (i.vinculado ? '' : ', não vinculado a um conselho ativo') + '</div></div>';
    }).join('');
    return '<details class="urg-cs"' + (c.atrasadas && c === g.porCS[0] ? ' open' : '') + '><summary><span class="urg-cs-nome">' + escCS_(c.cs) + '</span>'
      + (c.atrasadas ? '<span class="cont vermelho">Atrasadas ' + c.atrasadas + '</span>' : '')
      + (c.aVencer ? '<span class="cont ambar">A vencer ' + c.aVencer + '</span>' : '') + '</summary><div class="urg-lista">' + itens + '</div></details>';
  }).join('');
  html += '</div>';
  var rodape = 'GTD com posição de ' + dmaAcoes_(ACOES_.carimbos.gtdSnapshot) + '.';
  if (ACOES_.carimbos.ultimoReportCriadoEm) rodape += ' Último report recebido em ' + dmaAcoes_(ACOES_.carimbos.ultimoReportCriadoEm) + '.';
  if (r.reportsSemMapeamento) rodape += ' ' + r.reportsSemMapeamento + ' reports de pessoas sem vínculo com um CS ativo ficam de fora.';
  if (g.rotulosNaoMapeados.length) rodape += ' Etapas sem prazo mapeado: ' + g.rotulosNaoMapeados.map(escCS_).join(', ') + '.';
  document.getElementById('urgenciasCorpo').innerHTML = html + '<div class="acoes-rodape">' + rodape + '</div>';
}
function insightHtml_(i) {
  var sev = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }[i.severidade];
  return '<div class="ins-item"><div class="ins-topo"><span class="ins-sev ' + i.severidade + '">' + sev + '</span></div>'
    + '<div class="ins-oque">' + escCS_(i.oQue) + '</div>'
    + '<div class="ins-num"><b>' + escCS_(i.numero) + '</b> <span>' + escCS_(i.referencia) + '</span></div>'
    + '<div class="ins-acao"><b>Ação:</b> ' + escCS_(i.acao) + '</div>'
    + (i.responsaveis.length ? '<div class="ins-quem">Quem age: ' + i.responsaveis.map(escCS_).join(', ') + '</div>' : '<div class="ins-quem">Quem age: o time</div>') + '</div>';
}
function renderInsights_() {
  var el = document.getElementById('insightsCorpo');
  var n = ACOES_.insights;
  if (n.erro) { el.innerHTML = '<div class="acoes-erro">Não foi possível carregar os insights: ' + escCS_(n.erro) + '</div>'; return; }
  var d = n.dado;
  var html;
  if (!d.total) html = '<div class="gestor-empty">Nenhum ponto de atenção identificado neste período.</div>';
  else {
    html = d.visiveis.map(insightHtml_).join('');
    if (d.restantes.length) {
      html += (INSIGHTS_TODOS_ ? d.restantes.map(insightHtml_).join('') : '')
        + '<button class="ins-mais" type="button" id="insMais">' + (INSIGHTS_TODOS_ ? 'Mostrar menos' : 'Ver todos, mais ' + d.restantes.length) + '</button>';
    }
  }
  el.innerHTML = html + '<div class="acoes-rodape">Regras fixas, sem IA, sobre os dados de ' + escCS_(d.periodo.mes) + ' de ' + d.periodo.ano + ' e do dia de hoje. Gerado em ' + new Date(ACOES_.geradoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '.</div>';
  var b = document.getElementById('insMais');
  if (b) b.addEventListener('click', function () { INSIGHTS_TODOS_ = !INSIGHTS_TODOS_; renderInsights_(); });
}
function carregarAcoes() {
  fetchJSON_('/api/gestor/visao-geral/acoes').then(function (data) {
    ACOES_ = data; renderUrgencias_(); renderInsights_();
  }).catch(function (err) {
    var msg = '<div class="acoes-erro">Não foi possível carregar: ' + escCS_(err.message) + '</div>';
    document.getElementById('urgenciasCorpo').innerHTML = msg;
    document.getElementById('insightsCorpo').innerHTML = msg;
  });
}

// Cards com a cara de cada CS (07/10/2026): foto grande (a mesma resolução do app, cs_fotos antes de
// FOTOS_CS), nome, pontuação com o ícone de composição e posição. Sem foto, círculo com a inicial.
// Quem tem menos indicadores com meta do que o mínimo aparece como "Sem dados suficientes", sem
// número e fora do ranking. A pontuação e a posição vêm prontas do servidor, nunca recalculadas.
function corDoNome_(nome) {
  var cores = ['#8A6D1C', '#3D8B5F', '#C0433D', '#2F6F8F', '#6B4E9B', '#B5651D', '#4A7A4A'];
  var h = 0; String(nome || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  return cores[h % cores.length];
}
function escCS_(t) { return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function abrirPaginaCS(nome) {
  window.location.href = '/gestor/cs/' + encodeURIComponent(nome) + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual);
}
function renderCardsCS() {
  var el = document.getElementById('csGrid');
  var cards = DADOS.cards || [];
  if (!cards.length) { el.innerHTML = '<div class="gestor-empty">Nenhum CS ativo neste período.</div>'; document.getElementById('csGridNota').textContent = ''; return; }
  el.innerHTML = '';
  cards.forEach(function (c) {
    var temNota = c.pontuacao !== null && c.pontuacao !== undefined;
    var status = classificarScore(c.pontuacao);
    var idxModal = registrarScoreModal_(c.nome, c.pontuacao, c.detalhamento);
    var foto = c.fotoUrl
      ? '<img class="cs-card-foto" loading="lazy" src="' + escCS_(c.fotoUrl) + '" alt="Foto de ' + escCS_(c.nome) + '">'
      : '<div class="cs-card-fallback" style="background:' + corDoNome_(c.nomeCompleto || c.nome) + '">' + escCS_((c.nome || '?').charAt(0).toUpperCase()) + '</div>';
    var pos = temNota ? '<span class="cs-card-pos">' + c.posicao + 'º no ranking</span>' : '<span class="cs-card-pos sem">Fora do ranking</span>';
    var corpo = temNota
      ? '<div><div class="cs-card-score" style="color:' + status.cor + '">' + c.pontuacao + '</div><div class="cs-card-score-lbl">pontos</div></div>'
      : '<div class="cs-card-semdados">Sem dados suficientes<br>' + c.elegiveis + ' de ' + DADOS.minimoIndicadores + ' indicadores com meta</div>';
    var card = document.createElement('div');
    card.className = 'cs-card'; card.tabIndex = 0; card.setAttribute('role', 'link');
    card.setAttribute('aria-label', 'Abrir a página de ' + c.nome);
    card.innerHTML = '<div class="cs-card-foto-wrap">' + foto + pos + '<div class="cs-card-over"><div class="cs-card-nome">' + escCS_(c.nome) + '</div></div></div>'
      + '<div class="cs-card-body">' + corpo + '<button class="info-btn" type="button" title="Como essa pontuação foi composta" aria-label="Composição da pontuação de ' + escCS_(c.nome) + '">ⓘ</button></div>';
    card.addEventListener('click', function () { abrirPaginaCS(c.nome); });
    card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') abrirPaginaCS(c.nome); });
    card.querySelector('.info-btn').addEventListener('click', function (ev) { ev.stopPropagation(); abrirScoreModal(idxModal); });
    el.appendChild(card);
  });
  var sem = DADOS.cards.filter(function (c) { return c.estado === 'sem_dados_suficientes'; }).map(function (c) { return c.nome; });
  document.getElementById('csGridNota').textContent = sem.length
    ? 'Sem dados suficientes e fora do ranking: ' + sem.join(', ') + '. É preciso ter metas cadastradas em pelo menos ' + DADOS.minimoIndicadores + ' indicadores.'
    : '';
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
      var valor = i.semApuracao ? 'Sem apuração' : ((i.calculado === null || i.calculado === undefined) ? '—' : (i.calculado.toLocaleString('pt-BR') + unidade));
      if (i.composicao) return '<td class="num" title="' + String(i.composicao).replace(/"/g, '&quot;') + '">' + valor + '</td>';
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
// Faixas de presença (07/10/2026): FAIXAS_PRESENCA de lib/constants.ts, injetada aqui. Nenhum
// limiar escrito neste arquivo. A barra da tabela usa 3 cores (crítica e baixa juntas em vermelho).
var FAIXAS_PRESENCA_ = ${JSON.stringify(FAIXAS_PRESENCA)};
var COR_FAIXA_ = { critica: 'var(--vermelho)', baixa: '#C87A2E', atencao: 'var(--dourado)', saudavel: 'var(--verde)' };
function faixaPresenca_(taxa) {
  if (taxa === null || taxa === undefined) return null;
  for (var i = 0; i < FAIXAS_PRESENCA_.length; i++) { if (FAIXAS_PRESENCA_[i].ate === null || taxa <= FAIXAS_PRESENCA_[i].ate) return FAIXAS_PRESENCA_[i].chave; }
  return null;
}
function rotuloFaixa_(idx) {
  var f = FAIXAS_PRESENCA_[idx], ant = idx > 0 ? FAIXAS_PRESENCA_[idx - 1].ate : null;
  var faixa = f.ate === null ? 'acima de ' + ant + '%' : (ant === null ? 'até ' + f.ate + '%' : (ant + 1) + ' a ' + f.ate + '%');
  return f.rotulo + ' (' + faixa + ')';
}
function corPresenca(taxa) {
  var f = faixaPresenca_(taxa);
  if (f === null) return 'var(--cinza-apoio)';
  return f === 'critica' || f === 'baixa' ? 'var(--vermelho)' : COR_FAIXA_[f];
}
function presencaBarHTML(taxa) {
  if (taxa === null) return '<span style="color:var(--cinza-apoio)">—</span>';
  var cor = corPresenca(taxa);
  return '<div class="presenca-bar-wrap"><div class="presenca-bar-bg"><div class="presenca-bar-fill" style="width:' + taxa + '%;background:' + cor + '"></div></div>'
    + '<span class="presenca-bar-valor" style="color:' + cor + '">' + taxa + '%</span></div>';
}

var KANBAN_ORDEM = FAIXAS_PRESENCA_.map(function (f) { return f.chave; });
var KANBAN_LABELS = {};
FAIXAS_PRESENCA_.forEach(function (f, i) { KANBAN_LABELS[f.chave] = rotuloFaixa_(i); });
var kanbanCarteira_ = '__todos';
function fmtDecimos_(d) { return (d / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function healthTexto_(hb) {
  if (!hb || hb.semApuracao || hb.alcancado === null || hb.alcancado === undefined) return 'Sem apuração';
  return hb.alcancado.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

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

  renderKanbanPresenca_();
}

// Kanban de presença por membro (07/10/2026): contagem e percentual por faixa (método do maior
// resto, calculado no servidor por distribuicaoPresenca), seletor de carteira (Todos, cada CS
// ativo, Ex CS agregado) e barra empilhada por CS ativo. Tudo vem da mesma resposta da API.
function kanbanDistribuicaoAtual_() {
  var d = DADOS.visaoGeralRede.distribuicaoPresenca;
  if (kanbanCarteira_ === '__todos') return { dist: d.rede, health: null };
  if (kanbanCarteira_ === '__excs') return { dist: d.exCS, health: null };
  var linha = d.porCS.filter(function (x) { return x.cs === kanbanCarteira_; })[0];
  return linha ? { dist: linha.distribuicao, health: linha.healthBase } : { dist: d.rede, health: null };
}
function kanbanFiltroMembro_(m) {
  if (kanbanCarteira_ === '__todos') return true;
  if (kanbanCarteira_ === '__excs') return !m.cs || m.cs.length === 0;
  return (m.cs || []).indexOf(kanbanCarteira_) !== -1;
}
function renderKanbanPresenca_() {
  var rede = DADOS.visaoGeralRede;
  var dp = rede.distribuicaoPresenca;
  var sel = document.getElementById('kanbanCS');
  if (!sel.options.length) {
    sel.innerHTML = '<option value="__todos">Todos</option>'
      + dp.porCS.map(function (x) { return '<option value="' + x.cs + '">' + x.cs + '</option>'; }).join('')
      + '<option value="__excs">Ex CS (conselhos sem CS ativo)</option>';
    sel.addEventListener('change', function () { kanbanCarteira_ = sel.value; renderKanbanPresenca_(); });
  }
  sel.value = kanbanCarteira_;
  var atual = kanbanDistribuicaoAtual_();
  var dist = atual.dist;

  var healthEl = document.getElementById('kanbanHealthCS');
  if (atual.health) {
    healthEl.style.display = '';
    healthEl.textContent = 'Health da Base ' + healthTexto_(atual.health);
    healthEl.title = atual.health.composicao || '';
  } else { healthEl.style.display = 'none'; }

  document.getElementById('kanbanNota').textContent = dist.totalApurado + ' membros apurados'
    + (dist.semApuracao ? '. ' + dist.semApuracao + (dist.semApuracao === 1 ? ' membro sem apuração fica' : ' membros sem apuração ficam') + ' fora das faixas.' : '.')
    + ' Presença acumulada desde o início de cada conselho.';

  var legenda = '<div class="kanban-legenda">' + KANBAN_ORDEM.map(function (k) { return '<span><i style="background:' + COR_FAIXA_[k] + '"></i>' + KANBAN_LABELS[k] + '</span>'; }).join('') + '</div>';
  var barras = dp.porCS.map(function (x) {
    var segs = KANBAN_ORDEM.map(function (k) {
      var pct = x.distribuicao.percentuaisDecimos[k] / 10;
      return pct > 0 ? '<div class="kanban-barra-seg" style="width:' + pct + '%;background:' + COR_FAIXA_[k] + '" title="' + KANBAN_LABELS[k] + ': ' + x.distribuicao.contagens[k] + ' membros, ' + fmtDecimos_(x.distribuicao.percentuaisDecimos[k]) + '%"></div>' : '';
    }).join('');
    var aria = x.cs + ': ' + KANBAN_ORDEM.map(function (k) { return FAIXAS_PRESENCA_[KANBAN_ORDEM.indexOf(k)].rotulo + ' ' + fmtDecimos_(x.distribuicao.percentuaisDecimos[k]) + '%'; }).join(', ');
    return '<div class="kanban-barra-linha"><span class="kanban-barra-nome">' + x.cs + '</span>'
      + '<div class="kanban-barra" role="img" aria-label="' + aria + '">' + (x.distribuicao.totalApurado ? segs : '') + '</div>'
      + '<span class="kanban-barra-health" title="' + String((x.healthBase && x.healthBase.composicao) || '').replace(/"/g, '&quot;') + '">Health da Base ' + healthTexto_(x.healthBase) + '</span></div>';
  }).join('');
  document.getElementById('kanbanBarrasWrap').innerHTML = legenda + '<div class="kanban-barras">' + barras + '</div>';

  var grid = document.getElementById('kanbanGrid');
  var totalCritica = dist.contagens.critica || 0;
  document.getElementById('kanbanToggleLabel').textContent = 'Presença por membro' + (totalCritica ? ', ' + totalCritica + ' em presença crítica' : '');
  grid.innerHTML = KANBAN_ORDEM.map(function (chave) {
    var lista = (rede.kanbanPresenca[chave] || []).filter(kanbanFiltroMembro_);
    var cards = lista.length
      ? lista.map(function (m) {
          return '<div class="kanban-card"><span class="kanban-card-taxa">' + m.taxaPresenca + '%</span>'
            + '<div class="kanban-card-nome">' + m.nome + '</div><div class="kanban-card-conselho">' + m.conselho + '</div></div>';
        }).join('')
      : '<div class="gestor-empty" style="padding:8px 0;">Nenhum membro nesta faixa.</div>';
    var qtd = dist.contagens[chave];
    var pctTxt = fmtDecimos_(dist.percentuaisDecimos[chave]) + '%';
    return '<div class="kanban-col kanban-col-' + chave + '"><div class="kanban-col-head"><span>' + KANBAN_LABELS[chave] + '</span>'
      + '<span class="kanban-col-head-num" aria-label="' + qtd + ' membros, ' + pctTxt + '"><span>' + qtd + (qtd === 1 ? ' membro' : ' membros') + '</span><span class="kanban-col-pct">' + pctTxt + '</span></span></div>' + cards + '</div>';
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
    renderCardsCS();
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
// base: carteira_atual (CS ativos, sem a Comunidade) ou toda_a_rede. produtos nulo = todos.
var churnEstado_ = { granularidade: 'mes', ref: '', base: 'carteira_atual', cs: '', categoria: '', produtos: null, comunidade: false };
var churnDados_ = null;
var churnTextoBase_ = '';
var churnOpcoesMontadas_ = false;
var churnConfirmarGerar_ = false;
var churnOpcoesProdutos_ = [];
var churnReq_ = 0;
var churnAgendado_ = null;
var churnRetentouCs_ = false;
var churnOpcoesGuardadas_ = null;
var CHURN_MESES_ = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function churnEsc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function churnDataHora_(iso) {
  try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso; }
}
// Mesma seleção da API e da URL da página: base ausente = carteira atual, produtos ausente = todos,
// produtos vazio = nenhum marcado, comunidade=1 = Comunidade dentro (só em Toda a rede). Copiar o
// link reproduz a visão.
function churnParams_() {
  var p = new URLSearchParams({ granularidade: churnEstado_.granularidade, ref: churnEstado_.ref });
  if (churnEstado_.base === 'toda_a_rede') p.set('base', 'toda_a_rede');
  if (churnEstado_.cs) p.set('cs', churnEstado_.cs);
  if (churnEstado_.categoria) p.set('categoria', churnEstado_.categoria);
  if (churnEstado_.produtos !== null) p.set('produtos', churnEstado_.produtos.join(','));
  if (churnEstado_.comunidade) p.set('comunidade', '1');
  return p.toString();
}
function churnCorpo_(extra) {
  var o = {
    granularidade: churnEstado_.granularidade, ref: churnEstado_.ref, base: churnEstado_.base,
    cs: churnEstado_.cs || null, categoria: churnEstado_.categoria || null,
    produtos: churnEstado_.produtos, comunidade: churnEstado_.comunidade,
  };
  Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
  return JSON.stringify(o);
}

// Mês de referência padrão: o último mês FECHADO. O mês em andamento continua na lista, com selo.
function churnPopularRef_() {
  var sel = document.getElementById('churnRef');
  var hoje = new Date();
  var ano = hoje.getFullYear(), mes = hoje.getMonth() + 1, html = '';
  for (var i = 0; i < 24; i++) {
    var valor = ano + '-' + (mes < 10 ? '0' + mes : String(mes));
    html += '<option value="' + valor + '">' + CHURN_MESES_[mes - 1] + ' de ' + ano + (i === 0 ? ' (em andamento)' : '') + '</option>';
    mes--;
    if (mes === 0) { mes = 12; ano--; }
  }
  sel.innerHTML = html;
  sel.selectedIndex = 1;
  churnEstado_.ref = sel.value;
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
function churnSincronizarUrl_() {
  try { window.history.replaceState(null, '', window.location.pathname + '?' + churnParams_() + '#churn'); } catch (e) {}
}
// Lê a seleção da URL (mesmos nomes da API) para que um link copiado reproduza a mesma visão.
function churnLerUrl_() {
  var q = new URLSearchParams(window.location.search);
  if (!q.has('granularidade') && !q.has('ref') && !q.has('produtos') && !q.has('comunidade') && !q.has('base')) return;
  if (q.get('granularidade') === 'semana') {
    churnEstado_.granularidade = 'semana';
    document.querySelectorAll('#churnGranularidade .toggle-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.gran === 'semana'); });
  }
  var ref = q.get('ref') || '';
  if (/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(ref)) { churnGarantirOpcaoRef_(ref); churnEstado_.ref = ref; }
  churnEstado_.base = q.get('base') === 'toda_a_rede' ? 'toda_a_rede' : 'carteira_atual';
  document.getElementById('churnBase').value = churnEstado_.base;
  churnEstado_.cs = q.get('cs') || '';
  churnEstado_.categoria = q.get('categoria') || '';
  churnEstado_.produtos = q.has('produtos') ? q.get('produtos').split(',').filter(function (x) { return x; }) : null;
  churnEstado_.comunidade = churnEstado_.base === 'toda_a_rede' && q.get('comunidade') === '1';
}

function churnAtualizarRotuloProdutos_() {
  var e = churnEstado_, n = churnOpcoesProdutos_.length, txt;
  if (e.produtos === null) txt = e.comunidade ? 'Todos, com a Comunidade' : 'Todos, exceto Comunidade';
  else if (e.produtos.length === 0) txt = e.comunidade ? 'Somente a Comunidade' : 'Nenhum marcado';
  else txt = e.produtos.length + (n ? ' de ' + n : '') + ' produtos' + (e.comunidade ? ' e a Comunidade' : '');
  document.getElementById('churnProdutoBtn').textContent = txt;
}
function churnSincronizarChecks_() {
  var sel = churnEstado_.produtos;
  document.querySelectorAll('.chk-prod').forEach(function (c) { c.checked = sel === null ? true : sel.indexOf(c.value) !== -1; });
  var com = document.getElementById('chkComunidade');
  if (com) {
    // na carteira atual a Comunidade nunca entra: a opção fica visível, mas travada
    var travada = churnEstado_.base === 'carteira_atual';
    com.disabled = travada;
    com.checked = travada ? false : churnEstado_.comunidade;
    com.parentNode.title = travada ? 'Na carteira atual a Comunidade nunca entra. Troque a base para Toda a rede para incluí la.' : '';
  }
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
  churnEstado_.comunidade = !!(com && com.checked && churnEstado_.base === 'toda_a_rede');
  churnAtualizarRotuloProdutos_();
  churnAgendar_();
}
function churnAbrirProdutos_(abrir) {
  document.getElementById('churnProdutoPop').hidden = !abrir;
  document.getElementById('churnProdutoBtn').setAttribute('aria-expanded', abrir ? 'true' : 'false');
}

// CS: só ativos por pessoa; os ex CS aparecem juntos na opção agregada Ex CS, e só em Toda a rede
// (na carteira atual não há ex CS por definição).
function churnMontarCs_() {
  var op = churnOpcoesGuardadas_;
  if (!op) return;
  var html = '<option value="">Todos</option>';
  if (op.cs.length) {
    html += '<optgroup label="CS ativos">' + op.cs.map(function (x) {
      return '<option value="cs:' + churnEsc_(x.valor) + '">' + churnEsc_(x.valor) + '</option>';
    }).join('') + '</optgroup>';
  }
  if (churnEstado_.base === 'toda_a_rede' && op.categorias.length) {
    html += '<optgroup label="Histórico">' + op.categorias.map(function (c) {
      return '<option value="cat:' + churnEsc_(c.chave) + '">' + churnEsc_(c.rotulo) + '</option>';
    }).join('') + '</optgroup>';
  }
  var selCs = document.getElementById('churnCs');
  selCs.innerHTML = html;
  var valorCs = churnEstado_.cs ? 'cs:' + churnEstado_.cs : (churnEstado_.categoria ? 'cat:' + churnEstado_.categoria : '');
  selCs.value = valorCs;
  if (selCs.value !== valorCs) { selCs.value = ''; churnEstado_.cs = ''; churnEstado_.categoria = ''; }
}

function churnPopularOpcoes_(op) {
  if (churnOpcoesMontadas_ || !op) return;
  churnOpcoesMontadas_ = true;
  churnOpcoesGuardadas_ = op;
  churnMontarCs_();
  // Produtos em seleção múltipla, com Sem produto informado marcado por padrão.
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
    // a lista de auditoria aberta acompanha o filtro
    if (!document.getElementById('churnLista').hidden) churnCarregarLista_();
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

function renderComunidade_(c, textos) {
  var el = document.getElementById('churnComunidade');
  var det = '';
  if (c.totalMes) {
    det = '<div class="churn-rodape-det" id="churnComunidadeDet" hidden><table><thead><tr><th>Motivo</th><th class="num">Churns</th></tr></thead><tbody>' +
      c.porMotivo.map(function (m) {
        return '<tr><td><span style="display:inline-flex;align-items:center;gap:8px;">' + m.amostra + churnEsc_(m.rotulo) + '</span></td><td class="num">' + m.qtd + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  el.innerHTML = '<div class="churn-rodape-linha"><span>' + churnEsc_(textos.linhaComunidade) + '</span>' +
    (c.totalMes ? '<button type="button" class="churn-link" id="churnComunidadeBtn" aria-expanded="false">Ver detalhes</button>' : '') + '</div>' + det;
  var btn = document.getElementById('churnComunidadeBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      var d = document.getElementById('churnComunidadeDet');
      d.hidden = !d.hidden;
      btn.setAttribute('aria-expanded', d.hidden ? 'false' : 'true');
      btn.textContent = d.hidden ? 'Ver detalhes' : 'Ocultar detalhes';
    });
  }
}

function renderChurn_(data) {
  var t = data.textos;
  document.getElementById('churnDescricao').textContent = 'Recorte: ' + data.descricao + '. A janela do gráfico por mês tem doze meses terminando no mês de referência.';
  document.getElementById('churnInfo').title = 'Recorte: ' + data.descricao;
  document.getElementById('churnNumeros').innerHTML =
    '<div class="churn-numero"><b>' + data.totalMes + '</b><span class="rot">' + churnEsc_(t.rotuloNumero) + '</span>' +
      '<span class="def">' + churnEsc_(t.definicaoNumero) + (t.variacao ? ' ' + churnEsc_(t.variacao) + '.' : '') + '</span></div>' +
    '<div class="churn-numero"><b class="texto">' + churnEsc_(t.motivoRotulo) + '</b><span class="rot">Motivo mais citado</span>' +
      '<span class="def">' + (t.motivoFracao ? churnEsc_(t.motivoFracao) + ' churns do mês' : 'Nenhum churn neste mês neste filtro') + '</span></div>';
  document.getElementById('churnNotaRecorde').textContent = t.notaRecorde || '';
  document.getElementById('churnGrafico').innerHTML = data.temDados
    ? data.graficoSvg
    : '<div class="gestor-empty">Nenhum churn neste recorte. Troque o mês de referência ou os filtros.</div>';
  // no celular o gráfico rola na horizontal: abre já no fim, onde está o mês de referência
  var graf = document.getElementById('churnGrafico');
  graf.scrollLeft = graf.scrollWidth;
  document.getElementById('churnLegenda').innerHTML = data.temDados ? data.legenda.map(function (m) {
    return '<span class="item">' + m.amostra + churnEsc_(m.rotulo) + '</span>';
  }).join('') : '';
  var aviso = document.getElementById('churnAvisoCarteira');
  aviso.hidden = !t.avisoCarteira;
  document.getElementById('churnAvisoCarteiraTexto').textContent = t.avisoCarteira || '';
  document.getElementById('churnBtnRelatorio').href = '/gestor/churn/relatorio?' + data.query;
  var ver = document.getElementById('churnVerLista');
  ver.textContent = t.linkLista;
  renderComunidade_(data.comunidade, t);
  renderAnaliseChurn_(data.analise, data.iaDisponivel, data.temDados ? 1 : 0);
}

// Lista de auditoria: os N churns que compõem o número do mês e, à parte, quem ficou de fora.
function churnLinhaLista_(l, fora) {
  return '<tr><td>' + churnEsc_(l.data) + '</td><td>' + churnEsc_(l.membro) + '</td><td>' + churnEsc_(l.empresa) + '</td><td>' +
    churnEsc_(l.produto) + '</td><td>' + churnEsc_(l.cs) + '</td><td>' + churnEsc_(l.motivo) + '</td><td class="num">' +
    (l.nota === null || l.nota === undefined ? '' : l.nota) + '</td>' + (fora ? '<td>' + churnEsc_(l.etiqueta) + '</td>' : '') + '</tr>';
}
function churnCarregarLista_() {
  var el = document.getElementById('churnLista');
  el.innerHTML = '<div class="gestor-empty">Carregando…</div>';
  fetchJSON_(ENDPOINT_CHURN + '/itens?' + churnParams_()).then(function (d) {
    var cab = '<th>Data</th><th>Membro</th><th>Empresa</th><th>Produto</th><th>CS</th><th>Motivo</th><th class="num">Nota</th>';
    var html = '<div class="table-wrap"><div class="table-scroll"><table class="churn-tabela"><thead><tr>' + cab + '</tr></thead><tbody>' +
      (d.dentro.length ? d.dentro.map(function (l) { return churnLinhaLista_(l, false); }).join('') : '<tr><td colspan="7" class="gestor-empty">Nenhum churn neste filtro.</td></tr>') +
      '</tbody></table></div></div>';
    if (d.fora.length) {
      html += '<h4>Fora desta base, ' + d.fora.length + (d.fora.length === 1 ? ' churn' : ' churns') + ' em ' + churnEsc_(d.rotuloMes) + '</h4>' +
        '<div class="table-wrap"><div class="table-scroll"><table class="churn-tabela"><thead><tr>' + cab + '<th>Situação</th></tr></thead><tbody>' +
        d.fora.map(function (l) { return churnLinhaLista_(l, true); }).join('') + '</tbody></table></div></div>';
    }
    html += '<div class="acoes"><a href="' + ENDPOINT_CHURN + '/itens?' + churnParams_() + '&formato=csv">Exportar em planilha</a>' +
      '<span>' + d.dentro.length + ' na base, ' + d.fora.length + ' fora. Uso interno da gestão, com nome e empresa.</span></div>';
    el.innerHTML = html;
  }).catch(function (err) {
    el.innerHTML = '<div class="gestor-erro">Erro ao carregar a lista: ' + churnEsc_(err.message) + '</div>';
  });
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
    renderAnaliseChurn_(r.analise, churnDados_.iaDisponivel, churnDados_.temDados ? 1 : 0);
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
    renderAnaliseChurn_(r.analise, churnDados_.iaDisponivel, churnDados_.temDados ? 1 : 0);
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
    // Base: ao trocar, a Comunidade e o filtro de ex CS acompanham a definição da base escolhida.
    function trocarBase_(base) {
      churnEstado_.base = base;
      document.getElementById('churnBase').value = base;
      if (base === 'carteira_atual') { churnEstado_.comunidade = false; if (churnEstado_.categoria === 'cs_ex') churnEstado_.categoria = ''; }
      churnMontarCs_();
      churnSincronizarChecks_();
      carregarChurn();
    }
    document.getElementById('churnBase').addEventListener('change', function () { trocarBase_(this.value); });
    document.getElementById('churnVerRede').addEventListener('click', function () { trocarBase_('toda_a_rede'); });
    document.getElementById('churnInfo').addEventListener('click', function () {
      var d = document.getElementById('churnDescricao');
      d.hidden = !d.hidden;
    });
    document.getElementById('churnVerLista').addEventListener('click', function () {
      var el = document.getElementById('churnLista');
      el.hidden = !el.hidden;
      this.setAttribute('aria-expanded', el.hidden ? 'false' : 'true');
      if (!el.hidden) churnCarregarLista_();
    });
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


// ============ Pulso de CS (05/10/2026) ============
// Tudo que a tela mostra chega pronto de /api/gestor/pulso (lib/pulso.ts). Aqui só ficam o seletor de
// período e o desenho. Nenhum nome de respondente existe neste payload.
var pulsoCarregado_ = false;
var pulsoReq_ = 0;
var PULSO_MESES_ = ['Outubro', 'Novembro', 'Dezembro'];

function pulsoEsc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function pulsoClasseNps_(score) {
  if (score === null || score === undefined) return '';
  if (score >= 50) return 'ok';
  if (score >= 0) return 'atencao';
  return 'risco';
}
function pulsoClasseClareza_(m) {
  if (m === null || m === undefined) return '';
  if (m >= 8) return 'ok';
  if (m >= 6.5) return 'atencao';
  return 'risco';
}
function pulsoBarras_(lista, vazio) {
  if (!lista || lista.length === 0) return '<div class="pulso-vazio">' + vazio + '</div>';
  var max = Math.max.apply(null, lista.map(function (x) { return x.qtd; }).concat([1]));
  return lista.map(function (x) {
    return '<div class="pulso-barra-linha"><span>' + pulsoEsc_(x.rotulo) + '</span><div class="pulso-barra-bg"><div class="pulso-barra-fill" style="width:' + (x.qtd / max * 100) + '%"></div></div><span class="pulso-barra-num">' + x.qtd + '</span></div>';
  }).join('');
}
function pulsoTextos_(titulo, lista) {
  var corpo = (!lista || lista.length === 0)
    ? '<div class="pulso-vazio">Nenhuma resposta neste período.</div>'
    : lista.map(function (t) { return '<div class="pulso-fala">' + pulsoEsc_(t) + '</div>'; }).join('');
  return '<div class="pulso-texto-bloco"><h3>' + pulsoEsc_(titulo) + '</h3>' + corpo + '</div>';
}
function renderPulso_(d) {
  var r = d.resumo;
  var el = document.getElementById('pulsoConteudo');
  if (!r || r.respostas === 0) {
    el.innerHTML = '<div class="gestor-empty">Ainda não há respostas do Pulso de CS neste período. Elas aparecem aqui depois da próxima sincronização com o Monday.</div>';
    return;
  }
  var nps = r.nps;
  var h = '<div class="pulso-tiles">';
  h += '<div class="pulso-tile"><div class="pulso-tile-label">NPS interno</div><div class="pulso-tile-valor ' + pulsoClasseNps_(nps.score) + '">' + (nps.score === null ? 'Sem dado' : nps.score) + '</div>' +
       '<div class="pulso-tile-sub">Recomendaria trabalhar no time de CS da MOAI. ' + nps.promotores + ' promotor(es), ' + nps.neutros + ' neutro(s) e ' + nps.detratores + ' detrator(es) em ' + nps.total + ' resposta(s).</div></div>';
  h += '<div class="pulso-tile"><div class="pulso-tile-label">Clareza de prioridades</div><div class="pulso-tile-valor ' + pulsoClasseClareza_(r.clareza.media) + '">' + (r.clareza.media === null ? 'Sem dado' : String(r.clareza.media).replace('.', ',')) + '</div>' +
       '<div class="pulso-tile-sub">Média de 0 a 10. ' + r.clareza.alta + ' com nota 9 ou 10, ' + r.clareza.media_faixa + ' com 7 ou 8 e ' + r.clareza.baixa + ' com nota até 6.</div></div>';
  var adesaoTxt = d.adesao ? (d.adesao.responderam + ' de ' + d.adesao.esperados) : String(r.respostas);
  h += '<div class="pulso-tile"><div class="pulso-tile-label">Adesão</div><div class="pulso-tile-valor">' + adesaoTxt + '</div>' +
       '<div class="pulso-tile-sub">' + (d.adesao ? 'Pessoas que responderam contra CS ativos no período.' : 'Respostas somadas em todos os ciclos do Pulso.') + '</div></div>';
  h += '</div>';

  h += '<div class="pulso-grid2">';
  h += '<div class="pulso-card"><h3>Maior gargalo da operação</h3>' + pulsoBarras_(r.gargalos, 'Nenhuma resposta neste período.') + '</div>';
  h += '<div class="pulso-card"><h3>Destaque em colaboração e apoio ao time</h3>' + pulsoBarras_(r.destaques, 'Nenhuma indicação neste período.') + '</div>';
  h += '</div>';

  if (d.serie && d.serie.length > 0) {
    h += '<div class="pulso-card" style="margin-bottom:26px;"><h3>Evolução mensal</h3><table class="pulso-serie"><thead><tr><th>Mês</th><th>Respostas</th><th>NPS interno</th><th>Clareza média</th></tr></thead><tbody>';
    d.serie.forEach(function (s) {
      h += '<tr><td>' + pulsoEsc_(s.mes) + '</td><td>' + s.respostas + '</td><td>' + (s.nps === null ? 'Sem dado' : s.nps) + '</td><td>' + (s.clareza === null ? 'Sem dado' : String(s.clareza).replace('.', ',')) + '</td></tr>';
    });
    h += '</tbody></table></div>';
  }

  h += '<div class="pulso-textos">';
  h += pulsoTextos_('Uma coisa a melhorar no CS no próximo mês', r.textos.melhorar);
  h += pulsoTextos_('Começar, parar e continuar como time', r.textos.comecarPararContinuar);
  h += pulsoTextos_('Tema em que precisam de mais apoio ou desenvolvimento', r.textos.temaApoio);
  h += pulsoTextos_('O que a liderança precisa saber', r.textos.liderancaSaber);
  h += pulsoTextos_('Feedback para a liderança', r.textos.feedbackLideranca);
  h += '</div>';
  el.innerHTML = h;
}
function carregarPulso_() {
  var minha = ++pulsoReq_;
  var mes = document.getElementById('pulsoMes').value;
  document.getElementById('pulsoConteudo').innerHTML = '<div class="gestor-empty">Carregando…</div>';
  return fetchJSON_('/api/gestor/pulso?mes=' + encodeURIComponent(mes) + '&ano=' + anoAtual).then(function (d) {
    if (minha !== pulsoReq_) return;
    renderPulso_(d);
  }).catch(function (err) {
    if (minha !== pulsoReq_) return;
    document.getElementById('pulsoConteudo').innerHTML = '<div class="gestor-erro">Erro ao carregar o Pulso de CS: ' + pulsoEsc_(err.message) + '</div>';
  });
}
function inicializarPulso_() {
  var sel = document.getElementById('pulsoMes');
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; sel.appendChild(opt);
  var meses = anoAtual > 2026 ? MESES_GESTOR : PULSO_MESES_;
  meses.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; sel.appendChild(o); });
  // abre no mês corrente quando ele já é um ciclo do Pulso, senão no primeiro ciclo
  sel.value = meses.indexOf(mesAtual) !== -1 ? mesAtual : meses[0];
  sel.addEventListener('change', carregarPulso_);
  carregarPulso_();
}


// ============ Voz do liderado (05/10/2026) ============
// Insights, temas, itens e a lista do que o time quer manter chegam prontos de /api/gestor/voz
// (lib/voz.ts). Aqui ficam só os filtros de tela, o desenho do quadro e a troca de status, que é
// gravada por POST e depois relida do servidor para os números e os insights nunca divergirem.
var vozCarregado_ = false;
var vozReq_ = 0;
var vozDados_ = null;
var vozTemaAtivo_ = '';
var vozFiltrosMontados_ = false;
var vozErroCard_ = {};

function vozTextoSemAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
}
function vozFiltrar_(itens) {
  var campo = document.getElementById('vozCampo').value;
  var busca = vozTextoSemAcento_(document.getElementById('vozBusca').value.trim());
  return itens.filter(function (i) {
    if (vozTemaAtivo_ && !i.temas.some(function (t) { return t.chave === vozTemaAtivo_; })) return false;
    if (campo && i.campo !== campo) return false;
    if (busca && vozTextoSemAcento_(i.texto).indexOf(busca) === -1) return false;
    return true;
  });
}
function vozCardHtml_(i) {
  var h = '<div class="voz-card" data-id="' + pulsoEsc_(i.id) + '"><div class="voz-card-tags">';
  h += '<span class="voz-tag origem">' + pulsoEsc_(i.campoRotulo) + '</span>';
  if (i.tipo) h += '<span class="voz-tag ' + pulsoEsc_(i.tipo) + '">' + pulsoEsc_(i.tipoRotulo) + '</span>';
  i.temas.forEach(function (t) { h += '<span class="voz-tag tema">' + pulsoEsc_(t.rotulo) + '</span>'; });
  h += '<span class="voz-tag">' + pulsoEsc_(i.mes) + '</span></div>';
  h += '<div class="voz-card-texto">' + pulsoEsc_(i.texto) + '</div>';
  var meta = [];
  if (i.recorrencia >= 2) meta.push('<b>Tema citado em ' + i.recorrencia + ' respostas</b>');
  if (i.status === 'backlog' && i.diasNoBacklog !== null && i.diasNoBacklog >= 1) meta.push(i.diasNoBacklog + ' dia(s) em backlog');
  if (i.statusAlteradoEm && i.status !== 'backlog') meta.push('Atualizado em ' + new Date(i.statusAlteradoEm).toLocaleDateString('pt-BR'));
  if (meta.length) h += '<div class="voz-card-meta">' + meta.join(' · ') + '</div>';
  if (i.observacao) h += '<div class="voz-obs-lida">' + pulsoEsc_(i.observacao) + '</div>';
  h += '<div class="voz-card-acoes"><select class="pill-select" data-acao="status" aria-label="Status da sugestão">';
  vozDados_.status.forEach(function (st) { h += '<option value="' + st.chave + '"' + (st.chave === i.status ? ' selected' : '') + '>' + pulsoEsc_(st.rotulo) + '</option>'; });
  h += '</select><button type="button" class="voz-btn-link" data-acao="obs">' + (i.observacao ? 'Editar observação' : 'Observação') + '</button></div>';
  h += '<div class="voz-obs" hidden><textarea maxlength="600" placeholder="Registre a decisão ou o encaminhamento">' + pulsoEsc_(i.observacao || '') + '</textarea><button type="button" class="pill-select" data-acao="salvarObs">Salvar observação</button></div>';
  if (vozErroCard_[i.id]) h += '<div class="voz-erro">' + pulsoEsc_(vozErroCard_[i.id]) + '</div>';
  return h + '</div>';
}
function renderVoz_() {
  var d = vozDados_;
  var el = document.getElementById('vozConteudo');
  if (!d) return;
  if (d.resumo.total === 0) {
    el.innerHTML = '<div class="gestor-empty">Ainda não há sugestões neste período. Elas aparecem aqui depois que o Pulso de CS for respondido e sincronizado com o Monday.</div>';
    return;
  }
  var r = d.resumo, ps = r.porStatus;
  var h = '';
  if (d.insights && d.insights.length) {
    h += '<div class="voz-insights"><h3>O que o time está dizendo</h3>';
    d.insights.forEach(function (t) { h += '<div class="voz-insight">' + pulsoEsc_(t) + '</div>'; });
    h += '</div>';
  }
  h += '<div class="voz-tiles">' +
    '<div class="voz-tile"><div class="voz-tile-valor">' + r.total + '</div><div class="voz-tile-label">Sugestões</div></div>' +
    '<div class="voz-tile"><div class="voz-tile-valor">' + ps.backlog + '</div><div class="voz-tile-label">Em backlog</div></div>' +
    '<div class="voz-tile"><div class="voz-tile-valor" style="color:var(--dourado)">' + ps.em_andamento + '</div><div class="voz-tile-label">Em andamento</div></div>' +
    '<div class="voz-tile"><div class="voz-tile-valor" style="color:var(--verde)">' + ps.realizado + '</div><div class="voz-tile-label">Realizadas</div></div>' +
    '<div class="voz-tile"><div class="voz-tile-valor" style="color:var(--vermelho)">' + ps.rejeitado + '</div><div class="voz-tile-label">Rejeitadas</div></div>' +
    '<div class="voz-tile"><div class="voz-tile-valor">' + (r.taxaTratamento === null ? 'Sem dado' : r.taxaTratamento + '%') + '</div><div class="voz-tile-label">Com decisão</div></div>' +
    '</div>';

  var maxTema = Math.max.apply(null, d.temas.map(function (t) { return t.itens; }).concat([1]));
  h += '<div class="pulso-card" style="margin-bottom:22px;"><h3>Temas mais citados</h3>';
  d.temas.forEach(function (t) {
    var seg = function (k) { return t.porStatus[k] ? '<div class="voz-seg-' + k + '" style="width:' + (t.porStatus[k] / t.itens * 100) + '%"></div>' : ''; };
    h += '<button type="button" class="voz-temas-linha' + (vozTemaAtivo_ === t.chave ? ' ativo' : '') + '" data-acao="tema" data-tema="' + pulsoEsc_(t.chave) + '">' +
      '<span>' + pulsoEsc_(t.rotulo) + '</span>' +
      '<div class="voz-temas-barra" style="width:' + (t.itens / maxTema * 100) + '%">' + seg('backlog') + seg('em_andamento') + seg('realizado') + seg('rejeitado') + '</div>' +
      '<span class="voz-temas-num">' + t.respostas + ' resposta(s)</span></button>';
  });
  h += '<div class="voz-legenda"><span><i class="voz-seg-backlog"></i>Backlog</span><span><i class="voz-seg-em_andamento"></i>Em andamento</span><span><i class="voz-seg-realizado"></i>Realizado</span><span><i class="voz-seg-rejeitado"></i>Rejeitado</span>' +
    (vozTemaAtivo_ ? '<button type="button" class="voz-btn-link" data-acao="limparTema">Limpar filtro de tema</button>' : '<span>Clique em um tema para filtrar o quadro.</span>') + '</div></div>';

  if (d.manter && d.manter.length) {
    h += '<div class="pulso-card voz-manter"><h3>O que o time quer manter</h3><ul style="margin:0;padding-left:18px;">';
    d.manter.forEach(function (m) { h += '<li>' + pulsoEsc_(m.texto) + '</li>'; });
    h += '</ul></div>';
  }

  var visiveis = vozFiltrar_(d.itens);
  h += '<div class="voz-grid">';
  d.status.forEach(function (st) {
    var daColuna = visiveis.filter(function (i) { return i.status === st.chave; });
    h += '<div class="voz-col voz-col-' + st.chave + '"><div class="voz-col-head"><span>' + pulsoEsc_(st.rotulo) + '</span><span>' + daColuna.length + '</span></div>';
    if (daColuna.length === 0) h += '<div class="voz-col-vazio">Nada aqui' + (visiveis.length !== d.itens.length ? ' com os filtros atuais' : '') + '.</div>';
    daColuna.forEach(function (i) { h += vozCardHtml_(i); });
    h += '</div>';
  });
  h += '</div>';
  el.innerHTML = h;
}
function vozMontarFiltros_(d) {
  if (vozFiltrosMontados_) return;
  vozFiltrosMontados_ = true;
  var selT = document.getElementById('vozTema');
  d.temasDisponiveis.forEach(function (t) { var o = document.createElement('option'); o.value = t.chave; o.textContent = t.rotulo; selT.appendChild(o); });
  var selC = document.getElementById('vozCampo');
  d.campos.forEach(function (c) { var o = document.createElement('option'); o.value = c.chave; o.textContent = c.rotulo; selC.appendChild(o); });
  selT.addEventListener('change', function () { vozTemaAtivo_ = selT.value; renderVoz_(); });
  selC.addEventListener('change', renderVoz_);
  document.getElementById('vozBusca').addEventListener('input', renderVoz_);
}
function carregarVoz_(silencioso) {
  var minha = ++vozReq_;
  var mes = document.getElementById('vozMes').value;
  if (!silencioso) document.getElementById('vozConteudo').innerHTML = '<div class="gestor-empty">Carregando…</div>';
  return fetchJSON_('/api/gestor/voz?mes=' + encodeURIComponent(mes) + '&ano=' + anoAtual).then(function (d) {
    if (minha !== vozReq_) return;
    vozDados_ = d;
    vozMontarFiltros_(d);
    renderVoz_();
  }).catch(function (err) {
    if (minha !== vozReq_) return;
    document.getElementById('vozConteudo').innerHTML = '<div class="gestor-erro">Erro ao carregar a Voz do liderado: ' + pulsoEsc_(err.message) + '</div>';
  });
}
function vozSalvar_(id, status, observacao) {
  var corpo = { id: id, status: status };
  if (observacao !== undefined) corpo.observacao = observacao;
  delete vozErroCard_[id];
  return fetchJSON_('/api/gestor/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    .then(function () { return carregarVoz_(true); })
    .catch(function (err) { vozErroCard_[id] = 'Não foi possível salvar: ' + err.message; renderVoz_(); });
}
function inicializarVoz_() {
  var sel = document.getElementById('vozMes');
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; sel.appendChild(opt);
  var meses = anoAtual > 2026 ? MESES_GESTOR : PULSO_MESES_;
  meses.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; sel.appendChild(o); });
  sel.value = 'Visão Geral';
  sel.addEventListener('change', function () { carregarVoz_(false); });
  var painel = document.getElementById('vozConteudo');
  painel.addEventListener('change', function (ev) {
    var alvo = ev.target;
    if (!alvo || alvo.getAttribute('data-acao') !== 'status') return;
    var card = alvo.closest('.voz-card');
    vozSalvar_(card.getAttribute('data-id'), alvo.value);
  });
  painel.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-acao]');
    if (!alvo) return;
    var acao = alvo.getAttribute('data-acao');
    if (acao === 'tema') { vozTemaAtivo_ = vozTemaAtivo_ === alvo.getAttribute('data-tema') ? '' : alvo.getAttribute('data-tema'); document.getElementById('vozTema').value = vozTemaAtivo_; renderVoz_(); }
    else if (acao === 'limparTema') { vozTemaAtivo_ = ''; document.getElementById('vozTema').value = ''; renderVoz_(); }
    else if (acao === 'obs') { var o = alvo.closest('.voz-card').querySelector('.voz-obs'); o.hidden = !o.hidden; }
    else if (acao === 'salvarObs') {
      var card = alvo.closest('.voz-card');
      var statusAtual = card.querySelector('select[data-acao="status"]').value;
      vozSalvar_(card.getAttribute('data-id'), statusAtual, card.querySelector('textarea').value);
    }
  });
  carregarVoz_(false);
}

carregarVisaoGeral();
carregarAcoes();

// link direto /gestor#churn (usado pelo "Voltar ao painel" do relatório de churn)
if (window.location.hash === '#churn' || new URLSearchParams(window.location.search).has('granularidade')) {
  var btnAbaChurn_ = document.querySelector('.tab-btn[data-tab="churn"]');
  if (btnAbaChurn_) btnAbaChurn_.click();
}
`;
