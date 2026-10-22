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
//
// Redesenho v3 (20/10/2026): a camada visual vem de lib/ui/tema.ts (tokens, dock, ícones e sparkline). A
// Visão da área foi reorganizada em KPIs, Mapa do time, Fila de ação e Rede de conselhos; as demais abas
// mantêm o conteúdo e ganham só o tema e o dock.

import { FAIXAS_PRESENCA, SCORE_FAIXA_SAUDAVEL, SCORE_FAIXA_ATENCAO, MAPA_RITMO_ATRASADOS_ACAO, INSIGHT_ADVERTENCIA_ALERTA_PONTOS } from '../lib/constants.ts';
import { RADAR_SVG_SCRIPT } from '../lib/radar-svg.ts';
import { TEMA_CSS, ICONES_SVG } from '../lib/ui/tema.ts';
import { GRADE_CONSELHOS_CSS, GRADE_CONSELHOS_SCRIPT } from '../lib/ui/grade-conselhos.ts';

export const GESTOR_STYLE = TEMA_CSS + GRADE_CONSELHOS_CSS + `
:root{
  /* Nomes antigos apontando para os tokens do tema v3 (lib/ui/tema.ts), para as abas ainda não redesenhadas */
  --cinza-fundo:var(--bg); --preto-tinta:var(--ink); --preto-profundo:var(--side); --grafite:var(--side);
  --branco:var(--surface); --cinza-texto:var(--ink2); --cinza-apoio:var(--ink3);
  --cinza-linha:var(--line2); --cinza-borda:var(--line2); --cinza-superficie:var(--line);
  --vermelho:var(--red); --dourado:var(--gold); --verde:var(--green);
}
.gestor-page *{box-sizing:border-box;}
.gestor-page{margin:0;color:var(--ink);font-family:'Inter',sans-serif;}
.gestor-page h1,.gestor-page h2,.gestor-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.tab-panel{display:none;}
.tab-panel.active{display:block;}
.gestor-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
.gestor-page h1,.gestor-page h2,.gestor-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1180px;margin:0 auto;padding:0 28px 80px;}

  display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);
  text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);
  background:var(--branco);
}

  font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--cinza-apoio);
  background:none;border:none;padding:12px 4px;margin-right:24px;cursor:pointer;
  border-bottom:2px solid transparent;
}
.tab-panel{display:none;}
.tab-panel.active{display:block;}

  background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),
             radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);
  pointer-events:none;}

.block{margin-top:56px;}
.block-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:22px;}
.block-head h2{font-size:22px;font-weight:700;margin:0 0 6px;}
.block-head p{font-size:13px;color:var(--cinza-texto);margin:0;max-width:520px;line-height:1.55;}
.toggle-inline{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--cinza-texto);font-weight:600;cursor:pointer;white-space:nowrap;}
.toggle-inline input{width:16px;height:16px;cursor:pointer;accent-color:var(--preto-tinta);}



.radar-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;padding:18px 18px 8px;display:flex;flex-direction:column;align-items:center;}
.radar-card-head{width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.radar-card-name{font-size:14px;font-weight:600;}
.radar-card-score{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:15px;}

.table-wrap{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:20px;overflow:hidden;}
.table-scroll{overflow-x:auto;}
.toggle-group{display:flex;background:var(--cinza-superficie);border-radius:999px;padding:3px;gap:2px;}
.toggle-btn{border:none;background:transparent;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;padding:8px 16px;border-radius:999px;cursor:pointer;color:var(--cinza-texto);}
.resolver-card{background:#fff;border:1px dashed #D8D5D5;border-radius:14px;padding:14px 16px;margin-bottom:10px}.resolver-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.resolver-nome-raw{font-weight:700;font-size:13.5px;color:#1A1A1A}.resolver-sub{font-size:11px;color:#9F9F9F;margin-top:2px}.resolver-linha{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.resolver-select{font-family:Inter,sans-serif;font-size:12.5px;padding:7px 10px;border-radius:9px;border:0.75pt solid #D8D5D5;background:#fff;color:#1A1A1A;min-width:220px}.resolver-btn{font-family:Inter,sans-serif;font-size:12px;font-weight:700;padding:7px 14px;border-radius:9px;border:none;background:#1A1A1A;color:#fff;cursor:pointer}.resolver-btn:disabled{opacity:0.5;cursor:default}.resolver-status{font-size:11.5px;margin-top:6px}.resolver-status.erro{color:#C0433D}

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

.nps-seletor{margin:4px 0 6px;}
.nps-cobertura-wrap{margin:14px 0 6px;}
.nps-cobertura{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:14px;padding:10px 16px 10px 10px;border:1px solid var(--cinza-borda);border-radius:999px;background:var(--branco);}
.nps-cobertura:focus-visible{outline:2px solid var(--preto-tinta);outline-offset:3px;}
.nps-cob-texto b{display:block;font-size:14px;}
.nps-cob-texto small{display:block;font-size:12px;color:var(--cinza-apoio);}
.nps-pontos svg{width:100%;height:auto;max-width:760px;display:block;}
.nps-pontos circle{cursor:pointer;}
.nps-prox{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--cinza-borda);font-size:13.5px;}
.nps-prox span{color:var(--cinza-texto);white-space:nowrap;}
.nps-pn-lista{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
.nps-pn{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--cinza-borda);font-size:13.5px;}
.nps-pn b{font-size:16px;font-family:'Bricolage Grotesque',sans-serif;}
.nps-grafico-corpo{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:28px;align-items:center;margin-top:10px;}
@media (max-width:760px){.nps-grafico-corpo{grid-template-columns:1fr;}}
.nps-barras{display:flex;flex-direction:column;gap:10px;}
.nps-barra-linha{all:unset;cursor:pointer;display:grid;grid-template-columns:minmax(120px,210px) minmax(0,1fr) 28px;gap:12px;align-items:center;}
.nps-barra-linha:focus-visible,.nps-div-esq:focus-visible,.nps-div-dir:focus-visible{outline:2px solid var(--preto-tinta);outline-offset:3px;border-radius:6px;}
.nps-outros{cursor:default;}
.nps-tema{font-size:12.5px;font-weight:600;}
.nps-trilha{position:relative;height:14px;border-radius:999px;background:var(--cinza-superficie);}
.nps-trilha i{display:block;height:100%;border-radius:999px;background:var(--preto-tinta);}
.nps-marca{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--dourado);}
.nps-num{font-size:12.5px;font-weight:700;text-align:right;}
.nps-anel-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.nps-anel-wrap p{margin:0;font-size:13px;}
.nps-anel-wrap span{display:block;font-size:11.5px;color:var(--cinza-apoio);}
.nps-cabecalho-div{display:grid;grid-template-columns:minmax(120px,210px) minmax(0,1fr) 28px;gap:12px;font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--cinza-apoio);margin-top:6px;}
.nps-cabecalho-div span:nth-child(2){display:flex;justify-content:space-between;}
.nps-div-linha{display:grid;grid-template-columns:minmax(120px,210px) minmax(0,1fr) 60px;gap:12px;align-items:center;margin-bottom:10px;}
.nps-div{display:grid;grid-template-columns:1fr 1fr;align-items:center;height:14px;gap:0;}
.nps-div-esq,.nps-div-dir{all:unset;cursor:pointer;position:relative;height:100%;background:var(--cinza-superficie);display:block;}
.nps-div-esq{display:flex;justify-content:flex-end;border-radius:999px 0 0 999px;}
.nps-div-dir{border-radius:0 999px 999px 0;}
.nps-div-esq i{display:block;height:100%;background:var(--vermelho);border-radius:999px 0 0 999px;}
.nps-div-dir i{display:block;height:100%;background:#4A4A4A;border-radius:0 999px 999px 0;}
.nps-div-esq .nps-marca,.nps-div-dir .nps-marca{top:-4px;bottom:-4px;}
.nps-legenda{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--cinza-texto);margin:12px 0 0;}
.nps-legenda span{display:inline-flex;align-items:center;gap:6px;}
.nps-legenda i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.nps-leg-mes{background:var(--preto-tinta);}
.nps-leg-ant{background:var(--dourado);}
.nps-leg-crit{background:var(--vermelho);}
.nps-leg-elog{background:#4A4A4A;}
.npsc-secao{margin-top:18px;}
.npsc-titulo{font-size:15px;margin:0 0 10px;}
.npsc-grade{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;}
@media (max-width:760px){.npsc-grade{grid-template-columns:1fr;}}
.npsc-col h3{font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:var(--cinza-apoio);margin:0 0 8px;}
.npsc-tema{all:unset;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;width:100%;box-sizing:border-box;padding:9px 0;border-top:1px solid var(--cinza-borda);}
.npsc-tema:focus-visible{outline:2px solid var(--preto-tinta);outline-offset:3px;border-radius:6px;}
.npsc-tema .nome{font-weight:600;font-size:13px;}
.npsc-tema .num{font-weight:700;font-size:13px;text-align:right;}
.npsc-var{grid-column:1 / -1;font-size:12px;color:var(--cinza-texto);}
.npsc-var.ruim{color:var(--vermelho);font-weight:600;}
.npsc-var.bom{color:var(--verde);font-weight:600;}
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
.matriz-input.sugerido{box-shadow:0 0 0 2px var(--dourado);}
.sg-fundo{position:fixed;inset:0;background:rgba(20,20,20,.35);z-index:80;}
.sg-fundo[hidden],.sg-painel[hidden]{display:none;}
.sg-painel{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:var(--bg);z-index:81;box-shadow:-12px 0 40px rgba(20,20,20,.18);display:flex;flex-direction:column;}
.sg-topo{padding:18px 20px 14px;border-bottom:1px solid var(--line2);background:var(--surface);}
.sg-topo h2{margin:0 0 4px;font-size:18px;}
.sg-topo p{margin:0 0 12px;font-size:12.5px;color:var(--ink2);line-height:1.5;}
.sg-acoes{display:flex;gap:8px;flex-wrap:wrap;}
.sg-corpo{flex:1;overflow:auto;padding:16px 20px 32px;display:flex;flex-direction:column;gap:14px;}
.sg-cartao{background:var(--surface);border:1px solid var(--line2);border-radius:14px;padding:14px 16px;}
.sg-cartao h3{margin:0;font-size:15px;}
.sg-cab{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.sg-cab .btn{margin-left:auto;}
.sg-nota{font-size:12.5px;color:var(--ink2);line-height:1.5;margin:6px 0 10px;}
.sg-linha{display:grid;grid-template-columns:78px 1fr;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--line);}
.sg-nome{font-size:12.5px;font-weight:600;}
.sg-b{display:grid;grid-template-columns:54px 1fr 34px;gap:8px;align-items:center;font-size:11.5px;color:var(--ink2);margin:2px 0;}
.sg-b b{color:var(--ink);text-align:right;}
.sg-b .bar{height:7px;}
.sg-det{margin-top:8px;font-size:12px;color:var(--ink2);}
.sg-det summary{cursor:pointer;font-weight:600;color:var(--ink);}
.sg-det p{margin:6px 0 0;line-height:1.5;}
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
.churn-subtitulo{font-size:14px;margin:18px 0 8px;}
.churn-acoes-lista{margin:0;padding-left:18px;}
.churn-acoes-lista li{margin:4px 0;}
.churn-tema-linha{display:grid;grid-template-columns:minmax(160px,1.2fr) minmax(120px,2fr) minmax(160px,1.4fr) auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eeeeea;font-size:13px;}
.churn-barra{display:block;height:10px;background:#eeeeea;border-radius:4px;overflow:hidden;}
.churn-barra i{display:block;height:100%;background:var(--preto-tinta);}
.churn-vencida{color:var(--vermelho);font-weight:600;}
.churn-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0;}
.churn-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--cinza-apoio);}
.churn-form input,.churn-form select,.churn-form textarea{font:inherit;font-size:13px;padding:6px 8px;border:1px solid #d9d9d4;border-radius:6px;}
.churn-detalhe{margin-top:18px;}
.churn-detalhe summary{cursor:pointer;font-weight:600;padding:6px 0;}
@media (max-width:700px){.churn-tema-linha{grid-template-columns:1fr;}}
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
  .form-inline{flex-direction:column;}
  .kanban-grid{grid-template-columns:1fr;}
  .kanban-barra-linha{grid-template-columns:80px 1fr;} .kanban-barra-health{grid-column:1/-1;text-align:left;}
  .rede-stats{flex-direction:column;align-items:stretch;}
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

/* ===== churn: o que dizem ao sair, quem voltaria e reconquista (08/10/2026) ===== */
#churnA1{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;}
.churn-relatorio-link{margin-left:auto;}
.motivos-barras{display:grid;gap:12px;}
.motivo-linha{display:grid;grid-template-columns:minmax(120px,240px) minmax(0,1fr) auto;gap:14px;align-items:center;}
.motivo-rotulo{font-size:13px;font-weight:600;}
.motivo-trilha{position:relative;height:12px;border-radius:999px;background:var(--cinza-superficie);}
.motivo-trilha i{display:block;height:100%;border-radius:999px;background:var(--preto-tinta);}
.motivo-marca{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1px;border-radius:2px;background:var(--cinza-apoio);}
.motivo-num{font-size:13px;white-space:nowrap;}
.motivo-num small{color:var(--cinza-apoio);}
.pedido-motivo{border:1px solid var(--cinza-borda);border-radius:16px;padding:16px 18px;margin-bottom:12px;background:var(--branco);}
.pedido-topo{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:14px;}
.pedido-topo span{color:var(--cinza-apoio);font-size:12.5px;}
.pedido-acao{font-size:13px;margin:10px 0;}
.rec-frase{font-size:14px;margin:6px 0 12px;}
.rec-funil{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
@media (max-width:760px){.rec-funil{grid-template-columns:repeat(2,minmax(0,1fr));}}
.rec-etapa{border:1px solid var(--cinza-borda);border-radius:14px;padding:12px;}
.rec-etapa b{display:block;font-size:20px;}
.rec-etapa span{font-size:12px;color:var(--cinza-texto);}
.recorde{color:var(--cinza-apoio);font-size:12px;display:block;margin-top:4px;}
.churn-tabela tr.massa{cursor:pointer;background:var(--cinza-superficie);}
@media (max-width:900px){ #churnA1{grid-template-columns:repeat(2,minmax(0,1fr));} }
.churn-numero b small.de{font-size:18px;color:var(--cinza-apoio);font-family:Inter,sans-serif;font-weight:600;}
.churn-numero b.alerta{color:var(--vermelho);} .churn-numero .def.alerta{color:var(--vermelho);font-weight:600;}
.saida-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
.saida-grade.dupla{grid-template-columns:repeat(2,minmax(0,1fr));}
.saida-col{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;}
.saida-col h3{font-size:15px;margin:0;}
.saida-perg{font-size:11.5px;color:var(--cinza-apoio);margin:2px 0 10px;}
.saida-insight{font-size:13px;font-weight:600;color:var(--preto-tinta);margin:0 0 10px;min-height:34px;}
.saida-insight.vazio{color:var(--cinza-apoio);font-weight:500;}
.saida-tema{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) 54px;gap:10px;align-items:center;width:100%;background:none;border:0;border-radius:8px;padding:6px 6px;margin:0 -6px;font-family:inherit;font-size:12.5px;color:inherit;text-align:left;cursor:pointer;}
.saida-tema:hover,.saida-tema:focus-visible{background:var(--cinza-fundo);outline:none;}
.saida-tema .nome{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.saida-tema .barra{display:block;height:8px;border-radius:99px;background:var(--cinza-superficie);overflow:hidden;}
.saida-tema .barra i{display:block;height:100%;background:var(--preto-tinta);border-radius:99px;}
.saida-tema .num{font-weight:700;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}
.saida-tema .num span{font-size:10.5px;font-weight:700;margin-left:2px;}
.saida-tema .sobe{color:var(--vermelho);} .saida-tema .desce{color:var(--verde);} .saida-tema .igual{color:var(--cinza-apoio);}
.saida-melhoria{margin-top:8px;align-self:flex-start;font-size:12px;}
.saida-rodape{margin:auto 0 0;padding-top:10px;font-size:11px;color:var(--cinza-apoio);}
.saida-trechos{margin-top:16px;}
.saida-trechos blockquote{margin:0 0 10px;padding:10px 14px;background:var(--branco);border-left:3px solid var(--preto-tinta);border-radius:6px;font-family:inherit;font-style:normal;font-size:13px;}
.saida-trechos cite{display:block;margin-top:4px;font-style:normal;font-size:11px;color:var(--cinza-apoio);}
.retorno-topo{display:flex;gap:32px;flex-wrap:wrap;margin-bottom:10px;}
.retorno-num b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:34px;line-height:1.05;}
.retorno-num span{font-size:12px;color:var(--cinza-texto);}
.retorno-faixa{display:flex;height:26px;border-radius:8px;overflow:hidden;margin:4px 0 12px;}
.retorno-faixa span{display:flex;align-items:center;padding:0 8px;font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;}
.retorno-faixa .v{background:var(--preto-tinta);color:#FFFFFF;} .retorno-faixa .t{background:var(--cinza-linha);color:#1A1A1A;} .retorno-faixa .n{background:var(--vermelho);color:#FFFFFF;}
.retorno-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:22px;margin-top:12px;align-items:start;}
.retorno-hist{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:12px;}
.retorno-hist svg{display:block;width:100%;height:auto;}
.retorno-motivos h3{margin-top:0;}
.retorno-mot{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1.6fr) 60px;gap:10px;align-items:center;padding:5px 0;font-size:12.5px;}
.retorno-mot .nome{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.retorno-mot .barra{display:flex;height:12px;border-radius:99px;overflow:hidden;background:var(--cinza-superficie);}
.retorno-mot .barra i{display:block;height:100%;}
.retorno-mot .barra .v{background:var(--preto-tinta);} .retorno-mot .barra .t{background:var(--cinza-linha);} .retorno-mot .barra .n{background:var(--vermelho);}
.retorno-mot .num{font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
.rcq-talvez{font-size:12.5px;display:flex;align-items:center;gap:6px;cursor:pointer;}
.rcq-filtros{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.rcq-filtro{font-family:inherit;font-size:12px;font-weight:600;color:var(--cinza-texto);background:var(--branco);border:1px solid var(--cinza-borda);border-radius:99px;padding:6px 12px;cursor:pointer;}
.rcq-filtro b{color:var(--preto-tinta);margin-left:2px;}
.rcq-filtro.ativo{background:var(--preto-tinta);border-color:var(--preto-tinta);color:#FFFFFF;} .rcq-filtro.ativo b{color:#FFFFFF;}
.rcq-filtro.alerta:not(.ativo){border-color:var(--vermelho);color:var(--vermelho);} .rcq-filtro.alerta:not(.ativo) b{color:var(--vermelho);}
.rcq-lista{display:flex;flex-direction:column;gap:8px;}
.rcq-item{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:14px;padding:10px 14px;}
.rcq-item.vencido{border-left:4px solid var(--vermelho);}
.rcq-item.encerrado{opacity:.7;}
.rcq-item.editando{border-color:var(--preto-tinta);}
.rcq-linha{display:grid;grid-template-columns:48px minmax(0,1.5fr) minmax(0,1.6fr) auto;gap:14px;align-items:center;}
.rcq-quem{display:flex;flex-direction:column;gap:1px;font-size:11.5px;color:var(--cinza-texto);min-width:0;}
.rcq-quem a{font-size:13.5px;font-weight:700;color:var(--preto-tinta);text-decoration:none;}
.rcq-quem a:hover{text-decoration:underline;}
.rcq-quem span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rcq-nota{text-align:center;}
.rcq-nota b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:24px;line-height:1;}
.rcq-nota span{font-size:10px;color:var(--cinza-apoio);}
.rcq-nota.talvez b{color:var(--cinza-texto);}
.rcq-sit{display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:0;font-size:12px;}
.rcq-pill{font-size:11px;font-weight:700;border-radius:99px;padding:3px 10px;background:var(--cinza-superficie);color:var(--preto-tinta);}
.rcq-pill.st-a_contatar{background:#F6E7C2;color:#6B4E0E;} .rcq-pill.st-voltou{background:var(--preto-tinta);color:#FFFFFF;} .rcq-pill.st-sem_interesse{background:transparent;border:1px solid var(--cinza-borda);color:var(--cinza-apoio);}
.rcq-prox{color:var(--cinza-texto);} .rcq-prox.alerta{color:var(--vermelho);font-weight:700;}
.rcq-obs-txt{color:var(--cinza-apoio);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
.rcq-editar{font-family:inherit;font-size:12px;font-weight:700;background:none;border:1px solid var(--cinza-borda);border-radius:99px;padding:7px 14px;cursor:pointer;color:var(--preto-tinta);white-space:nowrap;}
.rcq-editar:hover{border-color:var(--preto-tinta);}
.rcq-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,2fr) auto;gap:10px;align-items:end;margin-top:12px;padding-top:12px;border-top:1px solid var(--cinza-superficie);}
.rcq-campo{display:flex;flex-direction:column;gap:4px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--cinza-apoio);min-width:0;}
.rcq-campo input,.rcq-campo select{width:100%;box-sizing:border-box;font-size:12.5px;text-transform:none;letter-spacing:0;font-weight:500;}
.rcq-acoes{display:flex;flex-direction:column;gap:4px;align-items:flex-end;}
.rcq-acoes button.primario{font-family:inherit;font-size:12px;font-weight:700;background:var(--preto-tinta);color:var(--branco);border:1px solid var(--preto-tinta);border-radius:99px;padding:8px 18px;cursor:pointer;white-space:nowrap;}
.rcq-acoes button.primario:disabled{opacity:.5;cursor:default;}
.rcq-msg{font-size:10.5px;color:var(--cinza-apoio);text-align:right;max-width:160px;}
.rcq-msg.erro{color:var(--vermelho);}
@media (max-width:900px){ .rcq-linha{grid-template-columns:44px minmax(0,1fr);} .rcq-sit{grid-column:2;} .rcq-editar{grid-column:1 / -1;justify-self:start;} .rcq-form{grid-template-columns:1fr 1fr;} .rcq-form .rcq-obs,.rcq-form .rcq-acoes{grid-column:1 / -1;} .rcq-acoes{flex-direction:row;justify-content:space-between;align-items:center;} .rcq-msg{max-width:none;} }
@media (max-width:900px){ .saida-grade,.saida-grade.dupla{grid-template-columns:1fr;} .retorno-grade{grid-template-columns:1fr;} }
/* ===== avaliação dos membros e desafio, visual (08/10/2026) ===== */
.aval-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}
.aval-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:16px 18px;}
.aval-card .rot{font-size:12px;font-weight:700;color:var(--cinza-texto);text-transform:uppercase;letter-spacing:.4px;}
.aval-card .nota{font-family:'Bricolage Grotesque',sans-serif;font-size:44px;line-height:1;margin:8px 0 2px;color:var(--preto-tinta);}
.aval-card .nota small{font-size:16px;color:var(--cinza-apoio);font-family:Inter,sans-serif;font-weight:600;}
.aval-card .nota.atencao{color:var(--dourado);} .aval-card .nota.critico{color:var(--vermelho);}
.aval-card .var{font-size:12px;color:var(--cinza-texto);min-height:16px;}
.aval-card .var.pior{color:var(--vermelho);font-weight:600;}
.aval-trilho{margin:12px 0 10px;}
.aval-faixas{display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--cinza-superficie);}
.aval-faixas span{display:block;height:100%;}
.aval-faixas .alta{background:var(--preto-tinta);} .aval-faixas .media{background:var(--cinza-linha);} .aval-faixas .baixa{background:var(--vermelho);}
.aval-legenda{display:flex;justify-content:space-between;font-size:11px;color:var(--cinza-apoio);margin-top:6px;}
.aval-legenda b{color:var(--vermelho);}
.aval-mapa{margin-top:22px;}
.aval-mapa-grade{display:grid;grid-template-columns:minmax(180px,2.2fr) repeat(4,minmax(56px,1fr)) minmax(150px,1.6fr);gap:4px;align-items:center;}
.aval-mapa-grade .cab{font-size:11px;font-weight:700;color:var(--cinza-apoio);text-transform:uppercase;letter-spacing:.4px;text-align:center;padding-bottom:4px;}
.aval-mapa-grade .cab.esq{text-align:left;}
.aval-mapa-grade .cab .curto{display:none;}
.aval-mapa-grade .nome{font-size:13px;font-weight:600;color:var(--preto-tinta);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.aval-mapa-grade .nome span{display:block;font-size:11px;font-weight:500;color:var(--cinza-apoio);}
.aval-cel{height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;}
.aval-cel.n0{background:#F2F2F2;color:var(--cinza-texto);}
.aval-cel.n1{background:#F6E7C2;color:#6B4E0E;}
.aval-cel.n2{background:#E9B84E;color:#3D2A03;}
.aval-cel.n3{background:var(--vermelho);color:#FFFFFF;}
.aval-cel.nd{background:transparent;color:var(--cinza-apoio);font-weight:500;border:1px dashed var(--cinza-borda);}
.aval-acao{font-size:12px;color:var(--vermelho);font-weight:600;}
.aval-acao.ok{color:var(--cinza-apoio);font-weight:500;}
.aval-escala{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--cinza-texto);margin-top:10px;align-items:center;}
.aval-escala i{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-3px;margin-right:5px;}
.aval-mais{margin-top:10px;background:none;border:0;padding:0;font-size:13px;font-weight:700;color:var(--preto-tinta);text-decoration:underline;cursor:pointer;}
.aval-detalhe{margin-top:16px;} .aval-detalhe summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--cinza-texto);}
.desafio-barra{display:flex;height:34px;border-radius:10px;overflow:hidden;margin:6px 0 6px;}
.desafio-barra span{display:flex;align-items:center;padding:0 10px;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;}
.desafio-barra .sim{background:var(--preto-tinta);color:#FFFFFF;} .desafio-barra .partes{background:var(--dourado);color:#1A1A1A;} .desafio-barra .nao{background:var(--vermelho);color:#FFFFFF;}
.desafio-resumo{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--cinza-texto);}
.desafio-resumo b{font-size:14px;color:var(--preto-tinta);}
.desafio-dispersao{margin-top:18px;background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:12px 12px 6px;}
.desafio-dispersao svg{display:block;width:100%;max-width:860px;height:auto;margin:0 auto;}
.desafio-dispersao .eixo{font-size:11px;fill:#807E7E;font-family:Inter,sans-serif;}
.desafio-dispersao .quad{font-size:11px;fill:#9F9F9F;font-family:Inter,sans-serif;font-weight:600;}
.desafio-dispersao .rot-ponto{font-size:11px;fill:#1A1A1A;font-family:Inter,sans-serif;font-weight:700;}
.desafio-acoes{margin:14px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;}
.desafio-acoes li{background:#FBF3E2;border-left:4px solid var(--dourado);border-radius:8px;padding:10px 12px;font-size:13px;}
.desafio-acoes li b{display:block;}
@media (max-width:900px){ .aval-cards{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media (max-width:640px){
  .aval-card .nota{font-size:36px;}
  .aval-mapa-grade{grid-template-columns:minmax(120px,1.6fr) repeat(4,minmax(40px,1fr));}
  .aval-mapa-grade .col-acao{display:none;}
  .aval-cel{height:34px;font-size:12px;}
  .aval-mapa-grade .cab .longo{display:none;} .aval-mapa-grade .cab .curto{display:inline;}
  .aval-legenda{flex-direction:column;gap:2px;}
  .desafio-dispersao{overflow-x:auto;} .desafio-dispersao svg{min-width:560px;}
}

.painel-lateral{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);background:var(--branco);box-shadow:-8px 0 30px rgba(0,0,0,0.12);z-index:50;overflow:auto;padding:20px;box-sizing:border-box;}
.painel-lateral[hidden]{display:none;}
.painel-lateral-topo{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;font-size:15px;}
.painel-fechar{border:none;background:var(--preto-tinta);color:var(--branco);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;}

/* ===== Redesenho v3: página da gestão ===== */
.top-r .sel{height:34px;padding:0 12px;border-radius:10px;border:1px solid var(--line2);background:var(--surface);color:var(--ink2);font:600 12.5px 'Inter',sans-serif;cursor:pointer}
.top-r .sel:hover{border-color:var(--ink)}
.tab-panel{max-width:1312px;margin:0 auto;width:100%}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start}
.coluna{display:flex;flex-direction:column;gap:22px;min-width:0}
.mapa{overflow-x:auto}
.mrow{display:grid;grid-template-columns:minmax(150px,1.3fr) 140px repeat(5,minmax(68px,1fr));align-items:stretch;min-width:720px;border-top:1px solid var(--line)}
.mrow > *{padding:11px 12px;display:flex;align-items:center}
.mrow.head{border-top:0}
.mrow.head > *{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);padding-top:4px;padding-bottom:10px}
.mrow.head > .sort{color:var(--ink)}
a.mrow:hover{background:#FAFAF9}
.who{gap:10px}
.who .av{width:32px;height:32px;font-size:13px;overflow:hidden}
.who .av img{width:100%;height:100%;object-fit:cover}
.who b{display:block;font-size:13.5px;font-weight:600;color:var(--ink)}
.mrow.fora .who b{color:var(--ink3)}
.who span{font-size:11.5px;color:var(--ink3);white-space:nowrap}
.sc{gap:10px}
.sc b{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;width:28px}
.sc .bar{flex:1}
.med{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink);opacity:.35}
.cell{justify-content:center;font-weight:600;font-size:13px;border-left:1px solid var(--line);flex-direction:column;gap:1px;text-align:center}
.cell small{font-size:11px;font-weight:500;color:var(--ink3)}
.cell.gold{background:var(--gold-soft);color:var(--gold-ink)}
.cell.gold small{color:var(--gold-ink);opacity:.8}
.cell.red{background:var(--red-soft);color:var(--red-ink)}
.cell.red small{color:var(--red-ink);opacity:.8}
.cell.ok{color:var(--ink3);font-weight:500}
.mrow.fora{color:var(--ink3)}
.legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:12px 18px;border-top:1px solid var(--line);font-size:12px;color:var(--ink2)}
.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.spark{width:76px;height:24px}
.kpi-av{display:flex;margin-right:4px}
.kpi-av .av{width:26px;height:26px;font-size:11px;border:2px solid #fff}
.kpi-av .av + .av{margin-left:-8px}
.fila{position:sticky;top:90px}
.filtros{display:flex;gap:6px;padding:0 18px 12px;flex-wrap:wrap}
.chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:99px;border:1px solid var(--line2);background:var(--surface);color:var(--ink2);cursor:pointer}
.chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.item{display:grid;grid-template-columns:10px minmax(0,1fr);gap:4px 12px;padding:14px 18px;border-top:1px solid var(--line)}
.item .dot{margin-top:6px}
.item h3{margin:0;font-size:13.5px;font-weight:600;line-height:1.35}
.item p{margin:2px 0 0;font-size:12.5px;color:var(--ink2)}
.item-meta{grid-column:2;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--ink3)}
.item-meta .btn{margin-left:auto}
.fila-foot{padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center}
.fila-foot button.link{background:none;border:0;padding:0;cursor:pointer;font-family:inherit}
.rede{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto;gap:0;align-items:center;border-top:1px solid var(--line)}
.rede > div{padding:16px 18px;border-left:1px solid var(--line)}
.rede > div:first-child{border-left:0}
.rede b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:700;margin-top:2px}
.rede span{font-size:12px;color:var(--ink2)}
.rede button.link{background:none;border:0;cursor:pointer;font-family:inherit;padding:0 18px}
.rede-detalhe{padding:18px;border-top:1px solid var(--line)}
.rede-detalhe .rede-stats{margin-top:0}
/* Estados: carregando discreto, vazio orientador e erro isolado por seção */
.sk{display:block;border-radius:6px;background:linear-gradient(90deg,var(--line) 25%,#F6F5F5 50%,var(--line) 75%);background-size:200% 100%;animation:skbrilho 1.3s linear infinite}
@keyframes skbrilho{to{background-position:-200% 0}}
.sk-linha{height:14px;margin:10px 18px}
.sk-kpi{height:92px}
.vazio-orienta{padding:22px 18px;font-size:13px;color:var(--ink2)}
.erro-secao{padding:16px 18px;font-size:12.5px;color:var(--red-ink);background:var(--red-soft);border-radius:10px;margin:12px 18px}
.kpi.erro-kpi{color:var(--red-ink);font-size:12.5px;justify-content:center}
/* Consulta rápida: gaveta aberta pela busca do dock */
.consulta-painel.gaveta{position:fixed;z-index:60;top:84px;right:24px;width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 110px);overflow:auto;margin:0;box-shadow:0 24px 60px rgba(20,20,20,.18)}
.consulta-painel.gaveta[hidden]{display:none}
.consulta-fechar{float:right;background:none;border:0;font-size:18px;cursor:pointer;color:var(--ink2)}
@media (max-width:1180px){.layout{grid-template-columns:1fr}.fila{position:static}}
@media (max-width:700px){.rede{grid-template-columns:1fr 1fr}.rede > div:nth-child(3){border-left:0}.rede > div{border-top:1px solid var(--line)}.rede button.link{padding:14px 18px;grid-column:1 / -1}}
@media (prefers-reduced-motion:reduce){.sk{animation:none}}
`;

export const GESTOR_HTML = `
<div class="gestor-page">
${ICONES_SVG}
<!--DOCK-->
<div class="work">

  <header class="top">
    <div>
      <div class="crumb" id="topCrumb">Gestão</div>
      <h1 id="topTitulo">Visão da área</h1>
    </div>
    <div class="top-r" id="topPeriodo">
      <select class="sel" id="selMesGestor" aria-label="Mês"></select>
      <select class="sel" id="selAnoGestor" aria-label="Ano"><option>2026</option><option>2027</option></select>
    </div>
  </header>

  <section class="panel consulta-painel gaveta" id="consultaPainel" hidden aria-label="Consulta rápida">
    <button class="consulta-fechar" type="button" id="consultaFechar" aria-label="Fechar a consulta">&times;</button>
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
      <button class="consulta-chip" type="button" data-pergunta="Próximo conselho do André Soares">Próximo conselho do André Soares</button>
    </div>
    <div class="consulta-chips" id="consultaChipsRecentes"></div>
    <div id="consultaRespostaWrap"></div>
  </section>

  <main class="content">
  <div class="tab-panel active" id="tab-visaoGeral" data-tab="visaoGeral">
    <section class="kpis" id="kpisArea" aria-label="Leitura de relance">
      <div class="panel kpi"><span class="sk sk-kpi"></span></div>
      <div class="panel kpi"><span class="sk sk-kpi"></span></div>
      <div class="panel kpi"><span class="sk sk-kpi"></span></div>
      <div class="panel kpi"><span class="sk sk-kpi"></span></div>
    </section>

    <div class="layout" style="margin-top:22px">
      <div class="coluna">
        <section class="panel" id="mapa-time" aria-labelledby="h-mapa">
          <div class="ph">
            <div><h2 id="h-mapa">Mapa do time</h2><p>Uma linha por CS. A cor só aparece onde algo saiu do esperado.</p></div>
            <div class="r">
              <label class="toggle-inline" title="Também afeta os números da página">
                <input type="checkbox" id="chkExMembros">
                <span>Mostrar ex membros</span>
              </label>
              <div class="seg" role="group" aria-label="Ordenar" id="mapaOrdem"><button type="button" class="on" data-ordem="prioridade">Prioridade</button><button type="button" data-ordem="ranking">Ranking</button></div>
            </div>
          </div>
          <div class="mapa" id="mapaCorpo"><span class="sk sk-linha"></span><span class="sk sk-linha"></span><span class="sk sk-linha"></span><span class="sk sk-linha"></span></div>
          <div class="legend"><span><i style="background:var(--red-soft);box-shadow:inset 0 0 0 1px #EBC6C0"></i>Agir agora</span><span><i style="background:var(--gold-soft);box-shadow:inset 0 0 0 1px #EBD39C"></i>Acompanhar</span><span><i style="background:#fff;box-shadow:inset 0 0 0 1px var(--line2)"></i>Dentro do esperado</span><span style="margin-left:auto">Traço na barra: mediana do time</span></div>
        </section>

        <section class="panel" id="rede-conselhos" aria-labelledby="h-rede">
          <div class="ph"><div><h2 id="h-rede">Rede de conselhos</h2><p>Todos os conselhos ativos, sem recorte por CS.</p></div></div>
          <div class="rede" id="redeResumo"><div><span class="sk sk-linha" style="margin:0"></span></div></div>
          <div class="rede-detalhe" id="redeDetalhe" hidden>
            <div class="rede-stats">
              <div class="rede-stat"><span class="rede-stat-value" id="redeStatMembros">0</span><span class="rede-stat-label">Membros na rede</span></div>
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
          </div>
        </section>
      </div>

      <aside class="panel fila" id="filaAcao" aria-labelledby="h-fila">
        <div class="ph"><h2 id="h-fila">Fila de ação</h2><span class="count" id="filaTotal">0</span><div class="r"><button type="button" class="link" id="filaVerTodas" style="background:none;border:0;cursor:pointer;font-family:inherit">Ver todas</button></div></div>
        <div class="filtros" id="filaFiltros"></div>
        <div id="filaCorpo"><span class="sk sk-linha"></span><span class="sk sk-linha"></span><span class="sk sk-linha"></span></div>
        <div class="fila-foot"><span class="faint" style="font-size:12px">Gerada pelas regras do painel, sem IA</span><button type="button" class="link" id="filaMais" hidden></button></div>
      </aside>
    </div>
  </div>

  <div class="sg-fundo" id="sgFundo" hidden></div>
  <aside class="sg-painel" id="sgPainel" role="dialog" aria-modal="true" aria-labelledby="sgTitulo" hidden>
    <div class="sg-topo">
      <h2 id="sgTitulo">Sugerir metas</h2>
      <p id="sgSub">O modelo usa os últimos meses fechados, encolhe a taxa de quem tem pouco histórico para a do time e pede crescimento. Na validação de jul a set as sugestões ficaram abaixo do realizado em quase todos os casos, então revise antes de salvar. Nada é salvo sem o seu clique em Salvar alterações.</p>
      <div class="sg-acoes">
        <button class="btn pri" id="sgAplicarTudo" type="button" disabled>Aplicar à matriz</button>
        <button class="btn" id="sgFechar" type="button">Fechar</button>
      </div>
    </div>
    <div class="sg-corpo" id="sgCorpo"></div>
  </aside>

  <div class="tab-panel" id="tab-conselhos" data-tab="conselhos">
    <section class="panel" aria-labelledby="h-cons-grade">
      <div class="ph"><div><h2 id="h-cons-grade">Conselhos da rede</h2><p id="consSituacao">Carregando a situação dos conselhos.</p></div></div>
      <div class="gc-ctl" id="consCtl"></div>
      <div id="consGrade"></div>
    </section>
    <section class="panel" style="margin-top:22px" aria-labelledby="h-cons-impacto">
      <div class="ph"><div><h2 id="h-cons-impacto">Impacto dos conselhos</h2><p>Cases de sucesso mais matchmakings atribuídos a cada conselho.</p></div></div>
      <div class="gc-ctl" id="consImpCtl"></div>
      <div id="consImpacto"></div>
    </section>
  </div>

  <div class="tab-panel" id="tab-controlePerfis" data-tab="controlePerfis">
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
        <h3>Somar pontos ativos ao Health da Base</h3>
        <p class="sync-desc">Desligada, a advertência aparece como selo separado no CS e o Health é só críticos sobre carteira. Ligada, cada ponto ativo soma 1,0 ponto percentual ao Health. Exemplo: 3 críticos de 10 dá 30,0%; com 1 ponto ativo, 31,0%.</p>
        <label class="toggle-inline"><input type="checkbox" id="chkSomaAdvHealth"><span>Somar pontos ativos ao Health da Base</span></label>
        <p class="sync-desc" id="advHealthChaveStatus">Carregando…</p>
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
        <h3 id="tituloCarteiraAlertas">Carteira: cadastro e título do grupo</h3>
        <p class="sync-desc">A carteira de cada CS vem do título do grupo no Monday. Aqui aparecem os conselheiros cujo CS no cadastro diverge do título e os grupos cuja CS no título está inativa ou não cadastrada. Serve para pegar a próxima sucessão de CS.</p>
        <div id="listaCarteiraAlertas"><span class="sk sk-linha"></span></div>
      </div>
      <div class="perfis-card">
        <h3 id="tituloNaoVinculados">Detectados, ainda não vinculados</h3>
        <p class="sync-desc">Nomes de CS encontrados nos dados do Monday (conselheiros, rounds, cases, upsell/downsell, churn) que ainda não têm perfil em "CS ativos". Clique em "Vincular" para criar o perfil.</p>
        <div id="listaNaoVinculados"></div>
      </div>
    </div>
  </div>

  <div class="tab-panel" id="tab-metasDestaques" data-tab="metasDestaques">
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
          <button class="btn gold" id="btnSugerirMetas" type="button">Sugerir metas</button>
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

  <div class="tab-panel" id="tab-voz" data-tab="voz">
    <section class="block" style="margin-top:0;" id="filaLideranca">
      <div class="block-head">
        <div>
          <h2>Compromissos da liderança</h2>
          <p>O que a liderança deve ao time, de todas as 1:1, em quadro de status. Vencidos aparecem primeiro em cada coluna. Estes compromissos são nominais e não se misturam com a voz anônima do time.</p>
        </div>
      </div>
      <div class="pulso-filtros">
        <label class="churn-campo">CS <select class="pill-select" id="filaCs" data-fila="filtro"></select></label>
        <label class="churn-campo">Prioridade <select class="pill-select" id="filaPrio" data-fila="filtro"><option value="">Todas</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></label>
      </div>
      <div id="filaMsg" class="gestor-erro" hidden></div>
      <div id="filaResumo"><div class="gestor-empty">Carregando…</div></div>
      <div id="filaGranolaBloco"></div>
      <div id="filaQuadro"></div>
    </section>

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

  <div class="tab-panel" id="tab-pulso" data-tab="pulso">
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

  <div class="tab-panel" id="tab-churn" data-tab="churn">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>Churn</h2>
          <p>Por que os membros saem, o que dizem no formulário de saída, quem voltaria e se a visita de reversão funciona. Fonte: board de churn e board de visitas. O NPS dos conselhos tem aba própria.</p>
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
        <a id="churnBtnRelatorio" class="churn-link churn-relatorio-link" href="#" target="_blank" rel="noopener">Emitir relatório</a>
      </div>
      <p class="churn-descricao" id="churnDescricao" hidden></p>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Situação do mês</h2><p>Saídas da carteira, quem saiu disposto a voltar, reconquistas em aberto e pedidos de churn ainda sem desfecho.</p></div></div>
      <div class="churn-numeros" id="churnA1"><div class="gestor-empty">Carregando…</div></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>O que fazer agora</h2><p>Pendências de reversão e de reconquista que pedem ação hoje, da mais atrasada para a menos atrasada.</p></div></div>
      <div id="churnA2"><p class="gestor-empty">Carregando…</p></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Por que estão saindo</h2><p>Quantos membros saíram e por quê, segundo o formulário de saída. Base e Produtos valem para os números e o gráfico.</p></div></div>
      <div class="motivos-barras" id="churnNumeros"><div class="gestor-empty">Carregando…</div></div>
      <p class="erro-msg" id="churnErro" aria-live="polite"></p>
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
      <h3 class="churn-subtitulo">Motivo declarado versus causa raiz</h3>
      <div id="churnCruzamento"><p class="churn-nota">Carregando…</p></div>
    </section>

    <section class="block" id="blocoPedidos">
      <div class="block-head"><div><h2>O que os churns pedem para melhorar</h2><p>Para cada motivo do mês: quantos churns, o que o formulário de saída sugeriu, a ação padrão e a melhoria pronta para registrar.</p></div></div>
      <div id="churnPedidos"><div class="gestor-empty">Carregando…</div></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>O que dizem ao sair</h2><p>As três perguntas abertas do formulário de saída, lidas separadamente, nos últimos três meses contra os três anteriores. Respostas sem conteúdo e as preenchidas pelo CS ficam fora. Clique num tema para ler os trechos.</p></div></div>
      <div id="saidaPerguntas"><div class="gestor-empty">Carregando…</div></div>
      <div id="saidaTrechos"></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Quem voltaria</h2><p>Resposta à pergunta de 0 a 10 sobre voltar à MOAI, em todo o histórico do formulário: 9 e 10 voltariam, 7 e 8 talvez, 0 a 6 não.</p></div></div>
      <div id="retornoResumo"><div class="gestor-empty">Carregando…</div></div>
    </section>

    <section class="block" id="blocoReconquista">
      <div class="block-head"><div><h2>Rastreio de reconquista</h2><p>Cada ex membro que disse que voltaria vira um contato a acompanhar: status, responsável, próximo contato e observação. Só gestores veem esta lista.</p></div>
        <label class="churn-campo rcq-talvez"><input type="checkbox" id="recTalvez"> Incluir quem deu 7 ou 8</label>
      </div>
      <div id="reconquistaMes"></div>
      <div id="reconquistaPainel"><div class="gestor-empty">Carregando…</div></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>O que fazer para melhorar</h2><p>Melhorias registradas a partir dos temas da voz do membro ou das visitas. Cada uma tem responsável, prazo e status.</p></div>
        <button type="button" class="primario" id="melhoriaNova">Nova melhoria</button>
      </div>
      <div id="melhoriaFatos"></div>
      <div id="melhoriaForm" hidden></div>
      <div id="melhoriaQuadro"><div class="gestor-empty">Carregando…</div></div>
      <div id="melhoriaExcluidas"></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Visitas de reversão</h2><p>Visitas dos últimos seis meses: funil, retenção, termômetro ao sair e Índice de Efetividade da Visita.</p></div></div>
      <div id="visitasFunil"><div class="gestor-empty">Carregando…</div></div>
      <div id="visitasEficacia"></div>
      <div id="visitasCalibracao"></div>
      <div id="visitasIev"></div>
    </section>

    <details class="block churn-detalhe">
      <summary>Vale a pena visitar? (perfil)</summary>
      <div id="visitasPerfil"></div>
    </details>

    <details class="block churn-detalhe">
      <summary>Lista de visitas</summary>
      <div id="visitasLista"></div>
      <p><a id="visitasCsv" href="#">Exportar em planilha</a></p>
    </details>
  </div>

  <div class="tab-panel" id="tab-nps" data-tab="nps">
    <section class="block" style="margin-top:0;">
      <div class="block-head">
        <div>
          <h2>NPS dos conselhos</h2>
          <p>O que os membros respondem depois de cada conselho: notas de 0 a 10, evolução nos desafios e sugestões. Fonte: board NPS Conselhos Estratégicos. <span id="npsSubtitulo">Respostas do mês escolhido, comparadas ao mês anterior.</span></p>
        </div>
      </div>
      <div class="churn-filtros">
        <label class="churn-campo">Mês <select class="pill-select" id="npsRef" title="Mês de referência"></select></label>
        <label class="churn-campo">CS <select class="pill-select" id="npsCs"><option value="">Todos</option></select></label>
        <div class="toggle-group" id="npsJanela" role="group" aria-label="Período da análise"><button class="toggle-btn active" type="button" data-janela="mes">Mês</button><button class="toggle-btn" type="button" data-janela="tres">Últimos 3 meses</button></div>
      </div>
      <p class="churn-nota" id="npsBase"></p>
      <div id="npsCobertura" class="nps-cobertura-wrap"></div>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Como os membros avaliam</h2><p>Nota média de 0 a 10 no período escolhido, comparada ao período anterior de mesmo tamanho. Trocas e evolução são respondidas de 1 a 5 e aparecem multiplicadas por 2 para ficarem na mesma régua.</p></div></div>
      <div id="notasDimensoes"><div class="gestor-empty">Carregando…</div></div>
      <div class="aval-mapa">
        <h3 class="churn-subtitulo">Onde a nota cai</h3>
        <div id="notasConselhos"></div>
      </div>
      <p class="churn-nota" id="notasJustificativas"></p>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>Por que não evoluem no desafio</h2><p>Quanto os membros dizem evoluir nos desafios, e se o travamento acompanha a presença no conselho. Primeiro conselho fica fora.</p></div></div>
      <div id="desafioTabela"><div class="gestor-empty">Carregando…</div></div>
      <div id="desafioFrases"></div>
      <p class="churn-nota" id="desafioAviso"></p>
    </section>

    <section class="block">
      <div class="block-head"><div><h2>O que os membros sugerem</h2><p>Respostas abertas do NPS, separadas entre sugestões sobre o conselho e avaliação do CS. Clique num tema para ler os trechos.</p></div></div>
      <div id="npsSugestoes"><div class="gestor-empty">Carregando…</div></div>
      <div id="npsTrechos"></div>
    </section>

    <div id="npsAliasesPendentesBlock" style="display:none;margin-top:36px;">
      <div class="block-head"><div><h2>Conselhos pendentes de confirmação</h2><p>O board de NPS não amarra a resposta direto num conselho cadastrado. O texto digitado por quem respondeu ("Qual é o seu Conselho?") precisa ser confirmado contra o roster antes de entrar nos cortes por CS.</p></div></div>
      <div id="npsAliasesPendentesList"></div>
    </div>

    <section class="block" style="margin-top:36px;">
      <div class="block-head"><div><h2>Relatório mensal de Conselhos</h2><p>NPS de conselheiro, conselho e CS, dados operacionais dos encontros e ranking de destaque de um mês, num único HTML autônomo para baixar e compartilhar.</p></div></div>
      <div class="churn-filtros">
        <select class="pill-select" id="selMesRelatorio" aria-label="Mês do relatório"></select>
        <select class="pill-select" id="selAnoRelatorio" aria-label="Ano do relatório"><option>2026</option><option>2027</option></select>
        <button class="toggle-btn" type="button" onclick="preVisualizarRelatorioMensal()">Ver prévia</button>
        <button class="toggle-btn" type="button" onclick="baixarRelatorioMensal()">Baixar HTML</button>
      </div>
    </section>
  </div>

  </main>
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

// ============ abas, ligadas ao dock (redesenho v3) ============
// Cada item do dock que corresponde a uma aba aponta para /gestor?aba=<chave>. A navegação interna
// troca a aba, atualiza a URL com history.replaceState e o dock marca o item ativo; assim recarregar,
// compartilhar o link e abrir direto com ?aba= levam à aba certa.
var ABAS_ = {
  visaoGeral: { crumb: 'Gestão', titulo: 'Visão da área', dock: 'area' },
  controlePerfis: { crumb: 'Sistema', titulo: 'Controle de perfis', dock: 'perfis' },
  conselhos: { crumb: 'Gestão', titulo: 'Conselhos', dock: 'conselhos' },
  metasDestaques: { crumb: 'Gestão', titulo: 'Metas e destaques', dock: 'metas' },
  churn: { crumb: 'Saúde da base', titulo: 'Churn e reconquista', dock: 'churn' },
  nps: { crumb: 'Saúde da base', titulo: 'NPS dos conselhos', dock: 'nps' },
  pulso: { crumb: 'Saúde da base', titulo: 'Pulso de CS', dock: 'pulso' },
  voz: { crumb: 'Saúde da base', titulo: 'Fila da liderança', dock: 'voz' }
};

var abaAtiva_ = 'visaoGeral';
function abrirAba(chave, opcoes) {
  if (!ABAS_[chave]) chave = 'visaoGeral';
  var cfg = ABAS_[chave];
  abaAtiva_ = chave;
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-tab') === chave); });
  document.getElementById('topCrumb').textContent = cfg.crumb;
  document.getElementById('topTitulo').textContent = cfg.titulo;
  document.getElementById('topPeriodo').style.display = (chave === 'visaoGeral' || chave === 'conselhos') ? '' : 'none';
  document.title = cfg.titulo + ' · MOAI CS';
  if (typeof dockMarcarAtivo === 'function') dockMarcarAtivo(cfg.dock);
  if (!(opcoes && opcoes.semUrl)) {
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('aba', chave);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* sem history API: a aba abre do mesmo jeito */ }
  }
  if (chave === 'conselhos') carregarConselhos_();
  if (chave === 'controlePerfis') { carregarGestores(); carregarCSRoster(); carregarConfigRevelar(); carregarVinculosCS(); carregarAdvertenciaTipos(); carregarCarteiraAlertas_(); }
  if (chave === 'metasDestaques' && !metasDestaquesCarregado) { metasDestaquesCarregado = true; inicializarMetasDestaques(); }
  if (chave === 'churn' && !churnCarregado) { churnCarregado = true; inicializarChurn(); }
  if (chave === 'nps' && !npsCarregado_) { npsCarregado_ = true; inicializarNps_(); }
  if (chave === 'pulso' && !pulsoCarregado_) { pulsoCarregado_ = true; inicializarPulso_(); }
  if (chave === 'voz' && !vozCarregado_) { vozCarregado_ = true; inicializarVoz_(); inicializarFila_(); }
}

document.querySelectorAll('.dock a.mi').forEach(function (a) {
  a.addEventListener('click', function (ev) {
    var u;
    try { u = new URL(a.href); } catch (e) { return; }
    var aba = u.searchParams.get('aba');
    if (u.pathname !== '/gestor' || !aba) return;
    ev.preventDefault();
    abrirAba(aba);
    if (u.hash === '#rede-conselhos') abrirRedeDetalhe_(true);
    if (u.hash) { var alvo = document.getElementById(u.hash.slice(1)); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
});


${RADAR_SVG_SCRIPT}

// ============ Visão da área (redesenho v3) ============
// Três níveis de leitura: KPIs (relance), Mapa do time e Fila de ação (diagnóstico) e Rede de
// conselhos (detalhe). Nada é calculado aqui: pontuação, posição, mediana, série, ritmo, GTD, críticos,
// advertência e status de report chegam prontos do servidor. Cada seção tem estado de carregando,
// vazio e erro próprios, e uma seção quebrada não derruba as outras.
var SCORE_FAIXA_SAUDAVEL_ = ${SCORE_FAIXA_SAUDAVEL};
var SCORE_FAIXA_ATENCAO_ = ${SCORE_FAIXA_ATENCAO};
var MAPA_RITMO_ATRASADOS_ACAO_ = ${MAPA_RITMO_ATRASADOS_ACAO};
var ADV_LIMITE_PONTOS_ = ${INSIGHT_ADVERTENCIA_ALERTA_PONTOS};

var DADOS = null;
var ACOES_ = null;
var SAUDE_ = { estado: 'carregando', lista: null, erro: null };
var REPORT_ = { estado: 'carregando', lista: null, erro: null };
var mapaOrdem_ = 'prioridade';
var filaFiltro_ = 'semana';
var filaExpandida_ = false;
var FILA_LIMITE_ = 5;

function escCS_(t) { return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function corDoNome_(nome) {
  var cores = ['#8A6D1C', '#3D8B5F', '#C0433D', '#2F6F8F', '#6B4E9B', '#B5651D', '#4A7A4A'];
  var h = 0; String(nome || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  return cores[h % cores.length];
}
function dmAcoes_(iso) { if (!iso) return 'sem data'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
function dmaAcoes_(iso) { if (!iso) return 'sem data'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function trimPonto_(t) { t = String(t || '').trim(); while (t.length && t.charAt(t.length - 1) === '.') t = t.slice(0, -1); return t; }
function listaNomes_(nomes) {
  if (nomes.length <= 1) return nomes.join('');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}
function abrirPaginaCS(nome) {
  window.location.href = '/gestor/cs/' + encodeURIComponent(nome) + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual);
}
function erroSecaoHtml_(prefixo, err) {
  return '<div class="erro-secao" role="alert">' + escCS_(prefixo) + ': ' + escCS_(err && err.message ? err.message : err) + '</div>';
}

// Faixa visual da pontuação (limiares em lib/constants.ts). Não recalcula: só escolhe a cor do número que veio pronto.
function classificarScore(score) {
  if (score === null || score === undefined) return { nivel: 'sem_dado', classe: '', cor: 'var(--ink3)' };
  if (score >= SCORE_FAIXA_SAUDAVEL_) return { nivel: 'ok', classe: 'green', cor: 'var(--ink)' };
  if (score >= SCORE_FAIXA_ATENCAO_) return { nivel: 'atencao', classe: '', cor: 'var(--ink)' };
  return { nivel: 'risco', classe: 'red', cor: 'var(--red)' };
}

// Painel lateral usado pelo churn (conselhos do mês e detalhes).
function painelLateralAbrir_(titulo, corpo) {
  var p = document.getElementById('painelLateral');
  if (!p) {
    p = document.createElement('aside');
    p.id = 'painelLateral';
    p.className = 'painel-lateral';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'false');
    p.addEventListener('click', function (ev) { if (ev.target.closest('[data-fechar]')) painelLateralFechar_(); });
    document.body.appendChild(p);
  }
  p.innerHTML = '<div class="painel-lateral-topo"><b>' + escCS_(titulo) + '</b><button type="button" class="painel-fechar" data-fechar="1" aria-label="Fechar">Fechar</button></div>' +
    '<div class="painel-lateral-corpo">' + corpo + '</div>';
  p.hidden = false;
}
function painelLateralFechar_() { var p = document.getElementById('painelLateral'); if (p) p.hidden = true; }
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') painelLateralFechar_(); });


// ---------- nível 1: KPIs ----------
function kpiHtml_(o) {
  return '<div class="panel kpi' + (o.alerta ? ' alert' : '') + '"><div class="kpi-l">' + o.rotulo +
    (o.delta ? ' <span class="delta ' + o.delta.cls + '">' + o.delta.txt + '</span>' : '') + '</div>' +
    '<div class="kpi-v"><span class="kpi-n"' + (o.cor ? ' style="color:' + o.cor + '"' : '') + '>' + o.num + (o.small ? '<small>' + o.small + '</small>' : '') + '</span>' +
    (o.spark ? '<svg class="spark" data-v="' + o.spark.join(',') + '"' + (o.sparkRuim ? ' data-bad="1"' : '') + ' aria-hidden="true"></svg>' : '') + (o.lado || '') + '</div>' +
    '<div class="kpi-f">' + o.foot + '</div></div>';
}
function deltaNum_(atual, anterior, bomQuandoSobe) {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined) return null;
  var d = atual - anterior;
  if (d === 0) return null;
  var sobe = d > 0;
  return { txt: (sobe ? '&#9650; ' : '&#9660; ') + Math.abs(d), cls: (sobe === bomQuandoSobe) ? 'good' : 'bad' };
}
function pontosSerieArea_() {
  var s = DADOS.serieArea;
  return s && s.pontos && s.pontos.length ? s.pontos : [];
}
function renderKpis_() {
  var el = document.getElementById('kpisArea');
  try {
    var ativos = DADOS.porCS.filter(function (c) { return c.ativo && !c.ex; });
    var pts = pontosSerieArea_();
    var atual = pts.length ? pts[pts.length - 1].scoreMedio : null;
    var anterior = pts.length > 1 ? pts[pts.length - 2].scoreMedio : null;
    var mediana = pts.length ? pts[pts.length - 1].mediana : null;
    // Visão Geral (sem série mensal): a média das pontuações já calculadas que a API entrega no ranking.
    if (atual === null) {
      var notas = DADOS.ranking.map(function (r) { return r.scoreReal; }).filter(function (v) { return v !== null && v !== undefined; });
      atual = notas.length ? Math.round(notas.reduce(function (a, b) { return a + b; }, 0) / notas.length) : null;
    }
    var serie = pts.map(function (p) { return p.scoreMedio; }).filter(function (v) { return v !== null && v !== undefined; });
    var serieAviso = DADOS.serieArea && DADOS.serieArea.erro ? ' · histórico indisponível' : '';
    var k1 = kpiHtml_({
      rotulo: 'Score médio da área', delta: deltaNum_(atual, anterior, true),
      num: atual === null ? 'Sem dado' : atual, small: atual === null ? '' : '/100',
      spark: serie.length > 1 ? serie : null,
      foot: 'Mediana ' + (mediana === null || mediana === undefined ? 'sem dado' : mediana) + ' · ' + DADOS.ranking.length + ' CS no ranking' + escCS_(serieAviso)
    });

    var risco = ativos.filter(function (c) { return c.temIndicadorAbaixoDaMeta; });
    var avs = risco.slice(0, 3).map(function (c) { return '<span class="av" style="background:' + corDoNome_(c.nomeCompleto || c.nome) + '" title="' + escCS_(c.nome) + '">' + escCS_((c.nome || '?').charAt(0).toUpperCase()) + '</span>'; }).join('');
    var k2 = kpiHtml_({
      rotulo: 'CS em risco', alerta: risco.length > 0,
      num: risco.length, small: 'de ' + ativos.length, cor: risco.length ? 'var(--red)' : '',
      lado: avs ? '<span class="kpi-av">' + avs + '</span>' : '',
      foot: risco.length ? escCS_(listaNomes_(risco.map(function (c) { return c.nome; }))) + ', com indicador abaixo da meta' : 'Nenhum CS com indicador abaixo da meta'
    });

    var ca = DADOS.criticosArea;
    var refs = ativos.map(function (c) { return c.indicadores && c.indicadores.healthDaBase ? c.indicadores.healthDaBase.meta : null; }).filter(function (v) { return v !== null && v !== undefined; });
    var k3;
    if (!ca || ca.erro || ca.percentualDecimos === null || ca.percentualDecimos === undefined) {
      k3 = kpiHtml_({ rotulo: 'Membros críticos', num: 'Sem dado', foot: escCS_(ca && ca.erro ? 'Não foi possível apurar: ' + ca.erro : 'Sem report suficiente para apurar') });
    } else {
      k3 = kpiHtml_({
        rotulo: 'Membros críticos', num: fmtDecimos_(ca.percentualDecimos) + '%',
        foot: (refs.length ? 'Referência ' + Number(refs[0]).toLocaleString('pt-BR') + '% · ' : '') + ca.criticos + ' de ' + ca.base + ' membros'
      });
    }

    var divs = ativos.map(function (c) { return c.indiceDivergencia || 0; });
    var divMedia = divs.length ? Math.round(divs.reduce(function (a, b) { return a + b; }, 0) / divs.length) : null;
    var k4 = kpiHtml_({
      rotulo: 'Real × autodeclarado', num: divMedia === null ? 'Sem dado' : divMedia, small: divMedia === null ? '' : 'pts',
      foot: 'Divergência média, quanto menor melhor'
    });
    el.innerHTML = k1 + k2 + k3 + k4;
    sparkDesenhar(el);
  } catch (e) {
    el.innerHTML = '<div class="panel kpi erro-kpi" style="grid-column:1/-1">' + erroSecaoHtml_('Não foi possível montar os indicadores', e) + '</div>';
  }
}

// ---------- nível 2: Mapa do time ----------
var RITMO_STATUS_CLASSE_ = { abaixo_da_meta: 'red', no_limite: 'gold' };
function celulaHtml_(c) { return '<span class="cell ' + c.cls + '"' + (c.titulo ? ' title="' + escCS_(c.titulo) + '"' : '') + '>' + escCS_(c.txt) + (c.small ? '<small>' + escCS_(c.small) + '</small>' : '') + '</span>'; }
function celulaRitmo_(l) {
  if (!DADOS.ritmo) return { cls: 'ok', txt: 'n/d', small: 'só no mês atual' };
  if (!l) return { cls: 'ok', txt: 'Sem dado' };
  var comMeta = 0, atras = [];
  DADOS.ritmo.indicadoresOrdem.forEach(function (k) { var i = l.itens[k]; if (i.status !== 'sem_meta') comMeta++; if (i.status === 'atras') atras.push(k); });
  if (!comMeta) return { cls: 'ok', txt: 'Sem meta' };
  if (!atras.length) return { cls: 'ok', txt: 'No ritmo' };
  return { cls: atras.length >= MAPA_RITMO_ATRASADOS_ACAO_ ? 'red' : 'gold', txt: atras.length + ' atrás', small: atras.length === 1 ? (DADOS.labelsIndicador[atras[0]] || atras[0]) : 'de ' + comMeta };
}
function celulaGtd_(c) {
  var g = c && c.indicadores ? c.indicadores.cumprimentoGtd : null;
  if (!g || g.calculado === null || g.calculado === undefined) return { cls: 'ok', txt: 'Sem dado' };
  var cls = RITMO_STATUS_CLASSE_[g.status] || 'ok';
  return { cls: cls, txt: Math.round(g.calculado) + '%', small: cls !== 'ok' && g.meta ? 'meta ' + Math.round(g.meta) + '%' : '' };
}
var SAUDE_MOTIVOS_ = { sem_report: 'Sem report', sem_apuracao: 'Sem apuração', inconsistente: 'Inconsistente' };
function celulaCriticos_(c, s) {
  if (SAUDE_.estado === 'carregando') return { cls: 'ok', txt: '…' };
  if (SAUDE_.estado === 'erro') return { cls: 'ok', txt: 'Erro', titulo: SAUDE_.erro };
  if (!s || s.valor_decimos === null || s.valor_decimos === undefined) return { cls: 'ok', txt: SAUDE_MOTIVOS_[s && s.motivo] || 'Sem apuração' };
  var h = c && c.indicadores ? c.indicadores.healthDaBase : null;
  return { cls: (h && RITMO_STATUS_CLASSE_[h.status]) || 'ok', txt: fmtDecimos_(s.valor_decimos) + '%' };
}
function celulaAdvertencia_(s) {
  if (SAUDE_.estado === 'carregando') return { cls: 'ok', txt: '…' };
  if (SAUDE_.estado === 'erro') return { cls: 'ok', txt: 'Erro', titulo: SAUDE_.erro };
  if (!s || s.pontos_ativos === null || s.pontos_ativos === undefined) return { cls: 'ok', txt: 'Sem dado' };
  var p = Number(s.pontos_ativos);
  if (p > ADV_LIMITE_PONTOS_) return { cls: 'red', txt: p + ' pts', small: 'limite ' + ADV_LIMITE_PONTOS_ };
  if (p === ADV_LIMITE_PONTOS_) return { cls: 'gold', txt: p + ' pts', small: 'no limite' };
  return { cls: 'ok', txt: p === 1 ? '1 pt' : String(p) };
}
function celulaReport_(r) {
  if (REPORT_.estado === 'carregando') return { cls: 'ok', txt: '…' };
  if (REPORT_.estado === 'erro') return { cls: 'ok', txt: 'Erro', titulo: REPORT_.erro };
  if (!r) return { cls: 'ok', txt: 'Sem cobrança' };
  if (r.estado === 'pendente') return { cls: 'gold', txt: 'Pendente' };
  if (r.estado === 'atrasado') return { cls: 'red', txt: 'Atrasado' };
  if (r.estado === 'enviado_com_atraso') return { cls: 'gold', txt: 'Enviado', small: 'com atraso' };
  return { cls: 'ok', txt: 'Enviado' };
}
function gravidadeLinha_(l) { return l.celulas.reduce(function (s, c) { return s + (c.cls === 'red' ? 2 : c.cls === 'gold' ? 1 : 0); }, 0); }

function linhasMapa_() {
  var porNome = {}, ritmo = {}, saude = {}, rep = {}, vari = {};
  DADOS.porCS.forEach(function (c) { porNome[c.nome] = c; });
  if (DADOS.ritmo) DADOS.ritmo.linhas.forEach(function (l) { ritmo[l.nome] = l; });
  (SAUDE_.lista || []).forEach(function (r) { saude[r.cs_nome] = r; });
  (REPORT_.lista || []).forEach(function (r) { rep[r.cs_nome] = r; });
  DADOS.ranking.forEach(function (r) { vari[r.nome] = r.variacao; });
  return DADOS.cards.map(function (card) {
    var c = porNome[card.nome];
    var l = { card: card, cs: c, variacao: vari[card.nome] || null };
    l.celulas = [celulaRitmo_(ritmo[card.nome]), celulaGtd_(c), celulaCriticos_(c, saude[card.nome]), celulaAdvertencia_(saude[card.nome]), celulaReport_(rep[card.nome])];
    l.fora = card.posicao === null || card.posicao === undefined;
    return l;
  });
}

function subLinhaMapa_(l) {
  if (l.fora) return 'Fora do ranking';
  var v = l.variacao, t = l.card.posicao + 'º';
  if (!v) return t;
  if (v.pontos === 0) return t + ' · estável no mês';
  return t + ' · ' + (v.pontos > 0 ? '&#9650; ' : '&#9660; ') + Math.abs(v.pontos) + ' no mês';
}
function linhaMapaHtml_(l, mediana, escala) {
  var card = l.card;
  var foto = card.fotoUrl
    ? '<span class="av"><img loading="lazy" src="' + escCS_(card.fotoUrl) + '" alt="Foto de ' + escCS_(card.nome) + '"></span>'
    : '<span class="av" style="background:' + corDoNome_(card.nomeCompleto || card.nome) + '">' + escCS_((card.nome || '?').charAt(0).toUpperCase()) + '</span>';
  var sub = l.fora ? escCS_(subLinhaMapa_(l)) : subLinhaMapa_(l);
  var pont;
  if (l.fora) {
    pont = '<span class="sc" style="font-size:12px" title="' + escCS_(card.estado === 'sem_meta' ? 'Sem meta cadastrada em indicadores suficientes' : 'Sem dados suficientes') + '">' + escCS_(card.elegiveis + ' de ' + DADOS.minimoIndicadores + ' metas mínimas') + '</span>';
  } else {
    var f = classificarScore(card.pontuacao);
    var larg = Math.min(card.pontuacao / escala * 100, 100).toFixed(0);
    var marca = mediana === null || mediana === undefined ? '' : '<i class="med" style="left:' + Math.min(mediana / escala * 100, 100).toFixed(1) + '%"></i>';
    pont = '<span class="sc"><b style="color:' + f.cor + '">' + card.pontuacao + '</b><span class="bar"><span class="' + f.classe + '" style="width:' + larg + '%"></span>' + marca + '</span></span>';
  }
  var href = '/gestor/cs/' + encodeURIComponent(card.nome) + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual);
  return '<a class="mrow' + (l.fora ? ' fora' : '') + '" href="' + href + '"><span class="who">' + foto + '<span><b>' + escCS_(card.nome) + '</b><span>' + sub + '</span></span></span>' + pont +
    l.celulas.map(celulaHtml_).join('') + '</a>';
}

function renderMapa_() {
  var el = document.getElementById('mapaCorpo');
  try {
    var linhas = linhasMapa_();
    if (!linhas.length) {
      el.innerHTML = '<div class="vazio-orienta">Nenhum CS ativo neste período. Confira os vínculos em Controle de perfis.</div>';
      return;
    }
    var pts = pontosSerieArea_();
    var mediana = pts.length ? pts[pts.length - 1].mediana : null;
    var maxNota = Math.max.apply(null, linhas.map(function (l) { return l.fora ? 0 : l.card.pontuacao; }).concat([100]));
    // Quem está sem dados suficientes vai sempre para o fim, fora do ranking.
    var comNota = linhas.filter(function (l) { return !l.fora; }), semNota = linhas.filter(function (l) { return l.fora; });
    if (mapaOrdem_ === 'prioridade') comNota.sort(function (a, b) { return gravidadeLinha_(b) - gravidadeLinha_(a) || a.card.posicao - b.card.posicao; });
    else comNota.sort(function (a, b) { return a.card.posicao - b.card.posicao; });
    var html = '<div class="mrow head"><span>CS</span><span class="sort">Pontuação</span><span class="cell">Ritmo</span><span class="cell">GTD</span><span class="cell">Críticos</span><span class="cell">Advert.</span><span class="cell">Report</span></div>' +
      comNota.concat(semNota).map(function (l) { return linhaMapaHtml_(l, mediana, maxNota); }).join('');
    var avisos = '';
    if (SAUDE_.estado === 'erro') avisos += erroSecaoHtml_('Críticos e advertências indisponíveis', SAUDE_.erro);
    if (REPORT_.estado === 'erro') avisos += erroSecaoHtml_('Report da semana indisponível', REPORT_.erro);
    el.innerHTML = html + avisos;
  } catch (e) {
    el.innerHTML = erroSecaoHtml_('Não foi possível montar o mapa do time', e);
  }
}

// ---------- nível 2: Fila de ação ----------
function itensFila_() {
  var itens = [], erros = [];
  if (!ACOES_) return { itens: itens, erros: erros };
  var nomesCS = {};
  if (DADOS) DADOS.cards.forEach(function (c) { nomesCS[c.nome] = true; });
  var u = ACOES_.urgencias;
  if (u && u.erro) erros.push('Urgências indisponíveis: ' + u.erro);
  if (u && u.dado) {
    var r = u.dado.report;
    if (r.pendentes.length) {
      itens.push({ tipo: 'semana', cor: 'gold', titulo: 'Report da semana pendente', texto: listaNomes_(r.pendentes) + '. Prazo sexta, 19h.',
        quem: r.pendentes.length + ' CS', quando: 'sex ' + dmAcoes_(r.prazo), acao: { rotulo: 'Cobrar', href: REPORT_MONDAY_BOARD_URL, externo: true } });
    }
    u.dado.gtd.porCS.forEach(function (c) {
      if (c.atrasadas > 0) {
        itens.push({ tipo: 'semana', cor: 'red', titulo: c.cs + ': ' + c.atrasadas + (c.atrasadas === 1 ? ' etapa de GTD atrasada' : ' etapas de GTD atrasadas'),
          texto: 'Maior atraso: ' + c.maiorAtrasoDias + (c.maiorAtrasoDias === 1 ? ' dia.' : ' dias.') + (c.aVencer ? ' ' + c.aVencer + (c.aVencer === 1 ? ' vence' : ' vencem') + ' nos próximos 7 dias.' : ''),
          quem: c.cs, quando: 'GTD', acao: { rotulo: 'Ver CS', href: '/gestor/cs/' + encodeURIComponent(c.cs) + '#secGtd' } });
      } else if (c.aVencer > 0) {
        itens.push({ tipo: 'semana', cor: 'gold', titulo: c.cs + ': ' + c.aVencer + (c.aVencer === 1 ? ' etapa de GTD vence' : ' etapas de GTD vencem') + ' em 7 dias',
          texto: 'Nenhuma etapa atrasada até agora.', quem: c.cs, quando: 'GTD', acao: { rotulo: 'Ver CS', href: '/gestor/cs/' + encodeURIComponent(c.cs) + '#secGtd' } });
      }
    });
  }
  var ins = ACOES_.insights;
  if (ins && ins.erro) erros.push('Insights indisponíveis: ' + ins.erro);
  if (ins && ins.dado) {
    ins.dado.visiveis.concat(ins.dado.restantes).forEach(function (i) {
      var resp = i.responsaveis || [];
      var texto = [i.numero, i.referencia].filter(function (t) { return t; }).map(trimPonto_).join('. ');
      if (texto) texto += '.';
      if (i.acao) texto += ' ' + i.acao;
      itens.push({ tipo: 'insight', cor: i.severidade === 'alta' ? 'red' : (i.severidade === 'media' ? 'gold' : ''), titulo: i.oQue, texto: texto,
        quem: resp.length ? resp.join(', ') : 'Área', quando: '', acao: resp.length === 1 && nomesCS[resp[0]] ? { rotulo: 'Ver CS', href: '/gestor/cs/' + encodeURIComponent(resp[0]) } : null });
    });
  }
  return { itens: itens, erros: erros };
}
function itemFilaHtml_(i) {
  var acao = i.acao ? '<a class="btn sm' + (i.cor === 'red' ? ' pri' : '') + '" href="' + escCS_(i.acao.href) + '"' + (i.acao.externo ? ' target="_blank" rel="noopener"' : '') + '>' + escCS_(i.acao.rotulo) + '</a>' : '';
  return '<div class="item"><span class="dot ' + i.cor + '"></span><div><h3>' + escCS_(i.titulo) + '</h3>' + (i.texto ? '<p>' + escCS_(i.texto) + '</p>' : '') + '</div>' +
    '<div class="item-meta"><span>' + escCS_(i.quem) + '</span>' + (i.quando ? '<span>·</span><span>' + escCS_(i.quando) + '</span>' : '') + acao + '</div></div>';
}
function renderFilaAcao_() {
  var corpo = document.getElementById('filaCorpo');
  try {
    var f = itensFila_();
    var semana = f.itens.filter(function (i) { return i.tipo === 'semana'; });
    var criticas = f.itens.filter(function (i) { return i.cor === 'red'; });
    var visiveis = filaFiltro_ === 'semana' ? semana : (filaFiltro_ === 'criticas' ? criticas : f.itens);
    document.getElementById('filaTotal').textContent = String(f.itens.length);
    var chips = [['semana', 'Esta semana', semana.length], ['criticas', 'Críticas', criticas.length], ['todas', 'Todas', f.itens.length]];
    var filtros = document.getElementById('filaFiltros');
    filtros.innerHTML = chips.map(function (c) { return '<button type="button" class="chip' + (filaFiltro_ === c[0] ? ' on' : '') + '" data-filtro="' + c[0] + '">' + c[1] + ' ' + c[2] + '</button>'; }).join('');
    filtros.onclick = function (ev) { var b = ev.target.closest('button[data-filtro]'); if (!b) return; filaFiltro_ = b.getAttribute('data-filtro'); filaExpandida_ = false; renderFilaAcao_(); };
    var mostrar = filaExpandida_ ? visiveis : visiveis.slice(0, FILA_LIMITE_);
    var html = f.erros.map(function (m) { return '<div class="erro-secao" role="alert">' + escCS_(m) + '</div>'; }).join('');
    html += mostrar.length ? mostrar.map(itemFilaHtml_).join('') : '<div class="vazio-orienta">Nada pede ação neste filtro. A fila se atualiza com o relatório da semana e o GTD.</div>';
    corpo.innerHTML = html;
    var mais = document.getElementById('filaMais');
    var resto = visiveis.length - FILA_LIMITE_;
    mais.hidden = resto <= 0;
    mais.textContent = filaExpandida_ ? 'Mostrar menos' : 'Mais ' + resto + ' →';
    if (typeof dockDefinirBadge === 'function') dockDefinirBadge('urgencias', semana.length);
  } catch (e) {
    corpo.innerHTML = erroSecaoHtml_('Não foi possível montar a fila de ação', e);
  }
}
function carregarAcoes() {
  fetchJSON_('/api/gestor/visao-geral/acoes').then(function (data) {
    ACOES_ = data;
    renderFilaAcao_();
    var snap = data.carimbos && data.carimbos.gtdSnapshot;
    if (snap && typeof dockDefinirSync === 'function') dockDefinirSync(dmAcoes_(snap), 'Posição do GTD de ' + dmaAcoes_(snap) + '. Clique para sincronizar agora.');
  }).catch(function (err) {
    document.getElementById('filaCorpo').innerHTML = erroSecaoHtml_('Não foi possível carregar a fila de ação', err);
  });
}

// ---------- nível 3: Rede de conselhos ----------
function abrirRedeDetalhe_(abrir) {
  var d = document.getElementById('redeDetalhe');
  var btn = document.getElementById('redeAbrir');
  d.hidden = !abrir;
  if (btn) btn.textContent = abrir ? 'Fechar conselhos' : 'Abrir conselhos →';
}
function renderRedeResumo_() {
  var el = document.getElementById('redeResumo');
  try {
    var rede = DADOS.visaoGeralRede;
    if (!rede) { el.innerHTML = '<div class="vazio-orienta" style="grid-column:1/-1">Sem dados da rede neste período.</div>'; return; }
    var cons = rede.presencaConselhos || [];
    var pres = 0, ag = 0, abaixo = 0;
    cons.forEach(function (c) {
      var crit = c.criterioPresenca || {};
      pres += crit.presentesContados || 0; ag += crit.encontrosContados || 0;
      if (c.presenca && c.presenca.taxa !== null && c.presenca.taxa !== undefined && c.presenca.taxa < (crit.limiarAtencaoPct || 0)) abaixo++;
    });
    var aberto = !document.getElementById('redeDetalhe').hidden;
    el.innerHTML = '<div><span>Conselhos ativos</span><b>' + cons.length + '</b></div>' +
      '<div><span>Membros na rede</span><b>' + rede.totalMembros + '</b></div>' +
      '<div><span>Presença acumulada</span><b>' + (ag > 0 ? Math.round(pres / ag * 100) + '%' : 'Sem dado') + '</b></div>' +
      '<div><span>Abaixo do limite de presença</span><b' + (abaixo ? ' style="color:var(--gold-ink)"' : '') + '>' + abaixo + '</b></div>' +
      '<button type="button" class="link" id="redeAbrir">' + (aberto ? 'Fechar conselhos' : 'Abrir conselhos →') + '</button>';
    document.getElementById('redeAbrir').addEventListener('click', function () { abrirRedeDetalhe_(document.getElementById('redeDetalhe').hidden); });
  } catch (e) {
    el.innerHTML = '<div style="grid-column:1/-1">' + erroSecaoHtml_('Não foi possível montar a rede de conselhos', e) + '</div>';
  }
}

// ---------- ligação entre as seções ----------
document.getElementById('mapaOrdem').addEventListener('click', function (ev) {
  var b = ev.target.closest('button[data-ordem]');
  if (!b) return;
  mapaOrdem_ = b.getAttribute('data-ordem');
  document.querySelectorAll('#mapaOrdem button').forEach(function (x) { x.classList.toggle('on', x === b); });
  if (DADOS) renderMapa_();
});
document.getElementById('filaVerTodas').addEventListener('click', function () { filaFiltro_ = 'todas'; filaExpandida_ = true; renderFilaAcao_(); });
document.getElementById('filaMais').addEventListener('click', function () { filaExpandida_ = !filaExpandida_; renderFilaAcao_(); });

dockLigarSync(function () { carregarVisaoGeral(); carregarAcoes(); carregarComplementos_(); });

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

// ============ report da semana e Health da Base na Visão da área (etapa 3, report via Monday) ============
var ENDPOINT_REPORT_SEMANA_AREA = '/api/gestor/report-semana';
var ENDPOINT_HEALTH_BASE = '/api/gestor/health-base';
var ENDPOINT_ADV_SOMA_HEALTH = '/api/gestor/advertencia-soma-health';
var REPORT_MONDAY_BOARD_URL = 'https://monday.com/boards/18394181332';

function escRA_(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtHorasArea_(h) { h = Number(h || 0); if (h >= 48) return Math.floor(h / 24) + ' dias'; return Math.round(h) + ' h'; }

// Críticos, advertência e report da semana por CS: duas chamadas isoladas, cada uma refaz só o mapa.
function carregarComplementos_() {
  SAUDE_ = { estado: 'carregando', lista: null, erro: null };
  REPORT_ = { estado: 'carregando', lista: null, erro: null };
  fetchJSON_(ENDPOINT_HEALTH_BASE).then(function (d) {
    SAUDE_ = { estado: 'ok', lista: d.cs || [], erro: null };
  }).catch(function (err) {
    SAUDE_ = { estado: 'erro', lista: null, erro: err.message };
  }).then(function () { if (DADOS) renderMapa_(); });
  fetchJSON_(ENDPOINT_REPORT_SEMANA_AREA).then(function (d) {
    REPORT_ = { estado: 'ok', lista: d.cs || [], erro: null };
  }).catch(function (err) {
    REPORT_ = { estado: 'erro', lista: null, erro: err.message };
  }).then(function () { if (DADOS) renderMapa_(); });
}


function renderAdvHealthChave_(ligado) {
  document.getElementById('chkSomaAdvHealth').checked = ligado;
  document.getElementById('advHealthChaveStatus').textContent = ligado ? 'Ligada: os pontos ativos entram no Health da Base.' : 'Desligada: a advertência aparece como selo separado no CS.';
}
function carregarAdvHealthChave_() {
  fetchJSON_(ENDPOINT_ADV_SOMA_HEALTH).then(function (d) { renderAdvHealthChave_(!!d.ligado); }).catch(function (err) {
    document.getElementById('advHealthChaveStatus').textContent = 'Erro ao carregar: ' + err.message;
  });
}
function alternarAdvHealthChave_(ev) {
  var ligado = ev.target.checked;
  fetchJSON_(ENDPOINT_ADV_SOMA_HEALTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ligado: ligado }) })
    .then(function (d) { renderAdvHealthChave_(!!d.ligado); })
    .catch(function (err) { ev.target.checked = !ligado; document.getElementById('advHealthChaveStatus').textContent = 'Erro ao salvar: ' + err.message; });
}
document.getElementById('chkSomaAdvHealth').addEventListener('change', alternarAdvHealthChave_);
carregarAdvHealthChave_();

function carregarVisaoGeral() {
  fetchJSON_(ENDPOINT_VISAO_GERAL + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual) + '&incluirExMembros=' + incluirExMembros).then(function (data) {
    DADOS = data;
    renderKpis_();
    renderMapa_();
    renderRedeResumo_();
    // O detalhe da rede tem erro isolado: se quebrar, o resumo e as demais seções seguem.
    try { renderVisaoRede(); } catch (e) { document.getElementById('redeDetalhe').innerHTML = erroSecaoHtml_('Não foi possível montar o detalhe dos conselhos', e); }
    renderFilaAcao_();
    var primeiro = data.ranking && data.ranking.length ? data.ranking[0].nome : null;
    if (primeiro && typeof dockDefinirTime === 'function') dockDefinirTime(primeiro);
  }).catch(function (err) {
    var msg = erroSecaoHtml_('Não foi possível carregar a visão da área', err);
    document.getElementById('kpisArea').innerHTML = '<div class="panel kpi erro-kpi" style="grid-column:1/-1">' + msg + '</div>';
    document.getElementById('mapaCorpo').innerHTML = msg;
    document.getElementById('redeResumo').innerHTML = '<div style="grid-column:1/-1">' + msg + '</div>';
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
  if (abaAtiva_ === 'conselhos') carregarConselhos_();
}
inicializarSeletorPeriodoGestor();

// ============ aba Conselhos (22/10/2026) ============
// Cartões dos conselheiros e impacto dos conselhos, que o redesenho das homes tirou da interface.
// Tudo vem pronto de /api/conselhos-grade (montarAbaConselhos); aqui só se desenha, cada seção com o seu erro.
var conselhosSeq_ = 0;
function carregarConselhos_() {
  var seq = ++conselhosSeq_;
  var mes = mesAtual, ano = anoAtual;
  document.getElementById('consSituacao').textContent = 'Carregando a situação dos conselhos.';
  document.getElementById('consCtl').innerHTML = '';
  document.getElementById('consImpCtl').innerHTML = '';
  gcSkeleton('consGrade');
  document.getElementById('consImpacto').innerHTML = '<span class="sk sk-linha"></span><span class="sk sk-linha"></span><span class="sk sk-linha"></span>';
  fetchJSON_('/api/conselhos-grade?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(function (d) {
    if (seq !== conselhosSeq_) return;
    if (d.grade) {
      document.getElementById('consSituacao').textContent = d.situacao || '';
      gcIniciar({ raizId: 'consGrade', ctlId: 'consCtl', grade: d.grade, mes: mes, ano: ano, comCS: true });
    } else {
      document.getElementById('consSituacao').textContent = '';
      gcErro('consGrade', d.gradeErro || 'erro sem mensagem');
    }
    if (d.impacto) gcImpactoIniciar({ raizId: 'consImpacto', ctlId: 'consImpCtl', impacto: d.impacto, mes: mes, ano: ano });
    else gcErro('consImpacto', d.impactoErro || 'erro sem mensagem');
  }).catch(function (err) {
    if (seq !== conselhosSeq_) return;
    document.getElementById('consSituacao').textContent = '';
    gcErro('consGrade', err && err.message ? err.message : err);
    gcErro('consImpacto', err && err.message ? err.message : err);
  });
}
${GRADE_CONSELHOS_SCRIPT}

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

function carregarCarteiraAlertas_() {
  var el = document.getElementById('listaCarteiraAlertas');
  fetchJSON_('/api/gestor/carteira-alertas').then(function (d) {
    var n = d.cadastro.length + d.semCS.length;
    document.getElementById('tituloCarteiraAlertas').textContent = 'Carteira: cadastro e título do grupo' + (n ? ' (' + n + ')' : '');
    if (!n) { el.innerHTML = '<div class="vazio-orienta">Nenhuma divergência. Título do grupo e cadastro dos conselheiros concordam.</div>'; return; }
    var motivo = { inativo: 'CS inativa', nao_cadastrado: 'CS não cadastrada' };
    el.innerHTML = d.semCS.map(function (g) {
      return '<div class="lista-item"><div><div class="lista-item-nome">' + escCS_(g.titulo) + '</div><div class="lista-item-sub">' + escCS_(motivo[g.motivo]) + ': ' + escCS_(g.csNoTitulo) + '. O conselho fica sem dono ativo na plataforma.</div></div></div>';
    }).join('') + d.cadastro.map(function (c) {
      return '<div class="lista-item"><div><div class="lista-item-nome">' + escCS_(c.conselheiro) + '</div><div class="lista-item-sub">O título do grupo diz ' + escCS_(c.csNoTitulo) + ' e o cadastro do conselheiro diz ' + escCS_(c.csNoCadastro) + '. A plataforma segue o título.</div></div></div>';
    }).join('');
  }).catch(function (err) { el.innerHTML = erroSecaoHtml_('Não foi possível ler a carteira', err); });
}

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

function consultaAbrir_(texto) {
  var p = document.getElementById('consultaPainel');
  if (!p) return;
  p.hidden = false;
  if (texto) consultaExecutar_(texto); else { var i = document.getElementById('consultaInput'); if (i) i.focus(); }
}
function consultaFechar_() { var p = document.getElementById('consultaPainel'); if (p) p.hidden = true; }
document.addEventListener('dock-busca', function (ev) { consultaAbrir_(ev.detail && ev.detail.texto); });
document.getElementById('consultaFechar').addEventListener('click', consultaFechar_);
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') consultaFechar_(); });

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

// ============ sugerir metas (22/10/2026) ============
// Painel lateral com o modelo de lib/metas-sugestao.ts (via /api/gestor/metas/sugestao). Só preenche os campos
// da matriz, marcados com contorno dourado; a gravação continua sendo o botão Salvar alterações.
var SUGESTAO_ = null;
function abrirSugestaoMetas_() {
  var mes = matrizMesAtual_();
  if (!mes) return;
  document.getElementById('sgFundo').hidden = false;
  document.getElementById('sgPainel').hidden = false;
  document.getElementById('sgAplicarTudo').disabled = true;
  document.getElementById('sgCorpo').innerHTML = '<span class="sk sk-kpi"></span><span class="sk sk-kpi"></span><span class="sk sk-kpi"></span>';
  fetchJSON_('/api/gestor/metas/sugestao?mes=' + encodeURIComponent(mes)).then(function (d) {
    SUGESTAO_ = d;
    renderSugestaoMetas_();
  }).catch(function (err) {
    document.getElementById('sgCorpo').innerHTML = erroSecaoHtml_('Não foi possível gerar as sugestões', err);
  });
}
function fecharSugestaoMetas_() {
  document.getElementById('sgFundo').hidden = true;
  document.getElementById('sgPainel').hidden = true;
}
function sgNum_(v) { return v === null || v === undefined ? 'sem' : String(Math.round(v * 10) / 10).replace('.', ','); }
function sgBarra_(rotulo, valor, max, classe) {
  var pct = valor === null || valor === undefined || !max ? 0 : Math.min(100, Math.round(valor / max * 100));
  return '<div class="sg-b"><span>' + rotulo + '</span><span class="bar"><span class="' + (classe || '') + '" style="width:' + pct + '%"></span></span><b>' + sgNum_(valor) + '</b></div>';
}
function renderSugestaoMetas_() {
  var d = SUGESTAO_;
  var nomes = Object.keys(d.indicadores.length ? d.indicadores[0].vigente.porCS : {});
  var algum = false;
  var html = d.indicadores.map(function (ind) {
    if (ind.semModelo) {
      return '<div class="sg-cartao"><div class="sg-cab"><h3>' + escCS_(ind.rotulo) + '</h3><span class="tag">Por política</span></div><p class="sg-nota">' + escCS_(ind.semModelo) + '</p></div>';
    }
    var valores = [ind.vigente.time, ind.mediaRealizada.time, ind.time && ind.time.sugerido];
    nomes.forEach(function (n) { valores.push(ind.vigente.porCS[n], ind.mediaRealizada.porCS[n], ind.porCS[n] && ind.porCS[n].sugerido); });
    var max = Math.max.apply(null, valores.filter(function (v) { return v !== null && v !== undefined; }).concat([1]));
    var tem = (ind.time && ind.time.sugerido !== null) || nomes.some(function (n) { return ind.porCS[n] && ind.porCS[n].sugerido !== null; });
    if (tem) algum = true;
    var linhas = '<div class="sg-linha"><span class="sg-nome">Time</span><div>' +
      sgBarra_('Meta', ind.vigente.time, max) + sgBarra_('Média', ind.mediaRealizada.time, max) + sgBarra_('Sugestão', ind.time && ind.time.sugerido, max, 'gold') + '</div></div>';
    nomes.forEach(function (n) {
      var s = ind.porCS[n];
      linhas += '<div class="sg-linha"><span class="sg-nome">' + escCS_(n) + '</span><div>' +
        sgBarra_('Meta', ind.vigente.porCS[n], max) + sgBarra_('Média', ind.mediaRealizada.porCS[n], max) + sgBarra_('Sugestão', s && s.sugerido, max, 'gold') + '</div></div>';
    });
    var det = '<details class="sg-det"><summary>Como cada número foi calculado</summary>' +
      (ind.time ? '<p><b>Time.</b> ' + escCS_(ind.time.explicacao) + '</p>' : '') +
      nomes.map(function (n) { return ind.porCS[n] ? '<p><b>' + escCS_(n) + '.</b> ' + escCS_(ind.porCS[n].explicacao) + '</p>' : ''; }).join('') + '</details>';
    return '<div class="sg-cartao"><div class="sg-cab"><h3>' + escCS_(ind.rotulo) + '</h3><span class="tag">' + (ind.direcao === 'max' ? 'Quanto menos melhor' : 'Quanto mais melhor') + '</span>' +
      '<button class="btn sm" type="button" data-sg-ind="' + escCS_(ind.chave) + '"' + (tem ? '' : ' disabled') + '>Aplicar só este indicador</button></div>' +
      (ind.time ? '<p class="sg-nota">' + escCS_(ind.time.explicacao) + '</p>' : '') + linhas + det + '</div>';
  }).join('');
  document.getElementById('sgCorpo').innerHTML = html;
  document.getElementById('sgAplicarTudo').disabled = !algum;
  document.querySelectorAll('[data-sg-ind]').forEach(function (b) { b.addEventListener('click', function () { aplicarSugestao_(b.getAttribute('data-sg-ind')); }); });
}
// Preenche os campos da matriz pelo mesmo caminho da digitação, para entrarem nas alterações pendentes.
function aplicarSugestao_(chaveInd) {
  var aplicados = 0, fora = 0;
  function preencher(indicador, escopo, cs, valor) {
    if (valor === null || valor === undefined) return;
    var input = document.querySelector('.matriz-input[data-chave="' + matrizChave_(indicador, escopo, cs) + '"]');
    if (!input) { fora++; return; }
    input.value = valor;
    input.classList.add('sugerido');
    onMatrizInputMudou_(input);
    aplicados++;
  }
  SUGESTAO_.indicadores.forEach(function (ind) {
    if (ind.semModelo || (chaveInd && ind.chave !== chaveInd)) return;
    if (ind.time) preencher(ind.chave, 'time', null, ind.time.sugerido);
    Object.keys(ind.porCS).forEach(function (n) { preencher(ind.chave, 'cs', n, ind.porCS[n].sugerido); });
  });
  document.getElementById('statusMatriz').textContent = aplicados + ' sugestão(ões) aplicada(s), em contorno dourado. ' + (fora ? fora + ' ficaram fora porque o indicador está oculto. ' : '') + 'Nada foi salvo.';
  fecharSugestaoMetas_();
}

function inicializarMetasDestaques() {
  try {
    document.getElementById('btnSugerirMetas').addEventListener('click', abrirSugestaoMetas_);
    document.getElementById('sgFechar').addEventListener('click', fecharSugestaoMetas_);
    document.getElementById('sgFundo').addEventListener('click', fecharSugestaoMetas_);
    document.getElementById('sgAplicarTudo').addEventListener('click', function () { aplicarSugestao_(null); });
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
var churnOpcoesMontadas_ = false;
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
  churnDados_ = null;
  churnTelaErro_ = null;
  carregarChurnBlocos_();
  return fetchJSON_(ENDPOINT_CHURN + '?' + churnParams_()).then(function (data) {
    if (minha !== churnReq_) return;
    churnDados_ = data;
    churnPopularOpcoes_(data.opcoes);
    renderChurn_(data);
    churnRenderA1Atual_();
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
    churnDados_ = null;
    churnTelaErro_ = err;
    var botaoProdutos = document.getElementById('churnProdutoBtn');
    if (botaoProdutos && botaoProdutos.textContent === 'Carregando…') botaoProdutos.textContent = 'Indisponível';
    document.getElementById('churnGrafico').innerHTML = '<div class="gestor-erro">Erro ao carregar o churn: ' + churnEsc_(err.message) + '</div>';
    document.getElementById('churnNumeros').innerHTML = '';
    document.getElementById('churnNotaRecorde').textContent = '';
    document.getElementById('churnLegenda').innerHTML = '';
    document.getElementById('churnComunidade').innerHTML = '';
    document.getElementById('churnErro').textContent = 'Não foi possível carregar os números do churn: ' + (err.message || 'erro desconhecido') + '.';
    churnRenderA1Atual_();
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
  churnRenderMotivosBarras_(data);
  churnRenderPedidos_(data.pedidosMelhoria);
  // O recorde histórico agora aparece sob o número de churns da situação do mês (K1)
  document.getElementById('churnNotaRecorde').textContent = '';
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

// ---- churn e voz do membro (onda 2, 08/10/2026): situação, pendências, voz, melhorias, notas, desafio, visitas ----
var ENDPOINT_VOZ_MEMBRO = '/api/gestor/membro/voz';
var ENDPOINT_VISITAS = '/api/gestor/visitas';
var ENDPOINT_NPS_CONSELHOS = '/api/gestor/nps-conselhos';
var ENDPOINT_RECONQUISTA = '/api/gestor/reconquista';
var ENDPOINT_MELHORIAS = '/api/gestor/membro/melhorias';
var CHURN_ETAPAS_ORIGEM = ['Comercial', 'Onboarding', 'Conselho e conselheiro', 'CS', 'Eventos e operação', 'Financeiro', 'Fora da MOAI'];
var CHURN_STATUS_MELHORIA = [['backlog', 'Backlog'], ['em_andamento', 'Em andamento'], ['realizado', 'Realizado'], ['rejeitado', 'Rejeitado']];
var churnVozDados_ = null;
var churnVisitasDados_ = null;
var churnMelhorias_ = null;
var churnMelhoriaId_ = null;
var churnMelhoriasExcluidasAbertas_ = false;
var churnBlocosReq_ = 0;

function churnPct_(v) { return v === null || v === undefined ? 'amostra pequena' : String(v).replace('.', ',') + '%'; }
function churnNum_(v) { return v === null || v === undefined ? '-' : String(v).replace('.', ','); }
function churnMoeda_(v) { return v === null || v === undefined ? '-' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function churnDataBR_(iso) { return iso ? iso.split('-').reverse().join('/') : '-'; }
function churnSeta_(d) { if (!d) return '='; return d > 0 ? '▲ +' + d : '▼ ' + d; }
function churnTabela_(cabecalho, linhas) {
  if (!linhas.length) return '<p class="gestor-empty">Sem dados neste período.</p>';
  return '<div class="table-wrap"><div class="table-scroll"><table class="churn-tabela"><thead><tr>' +
    cabecalho.map(function (c) { return '<th>' + churnEsc_(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    linhas.map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div></div>';
}

// Carrega os blocos que dependem do mês e dos filtros (voz, visitas e melhorias). Cada fonte é
// independente: falha em uma não prende as outras, e não depende da rota de churn ter respondido.
// Cada render roda protegido, e um erro vira mensagem no próprio bloco em vez de "Carregando…" eterno.
// A ordem de resposta é checada pelo contador, para que um mês antigo nunca sobrescreva o atual.
var CHURN_IDS_VOZ_ = ['saidaPerguntas', 'retornoResumo'];
var CHURN_IDS_VISITAS_ = ['churnCruzamento', 'visitasFunil', 'visitasPerfil', 'visitasLista', 'melhoriaFatos'];
var churnVozErro_ = null;
var churnRecDados_ = null;
var churnRecErro_ = null;
var churnRecTalvez_ = false;
var churnRecFiltro_ = 'abertos';
var churnRecLimite_ = 8;
var churnRecEditando_ = null;
var churnRecReq_ = 0;
var churnVisitasErro_ = null;
var churnTelaErro_ = null;

function churnErroEm_(ids, err) {
  var texto = err && err.message ? err.message : String(err || 'erro desconhecido');
  var msg = '<div class="gestor-erro">Não foi possível carregar este bloco: ' + churnEsc_(texto) + '. Tente atualizar a página.</div>';
  ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.innerHTML = msg; });
}

function churnRenderSeguro_(ids, fn) {
  try { fn(); } catch (err) {
    console.error('Erro ao montar bloco do churn:', err);
    churnErroEm_(ids, err);
  }
}

function churnRenderA1Atual_() {
  churnRenderSeguro_(['churnA1'], function () { churnRenderA1_(churnVisitasDados_, churnVozDados_, churnDados_, churnRecDados_); });
  churnRenderSeguro_(['churnA2'], churnRenderA2Atual_);
}

function carregarChurnBlocos_() {
  var minha = ++churnBlocosReq_;
  var ref = churnEstado_.ref;
  var cs = churnEstado_.cs || '';
  churnVozDados_ = null;
  churnVisitasDados_ = null;
  churnVozErro_ = null;
  churnVisitasErro_ = null;
  CHURN_IDS_VOZ_.concat(['churnCruzamento', 'visitasFunil']).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="gestor-empty">Carregando…</div>';
  });
  document.getElementById('saidaTrechos').innerHTML = '';
  churnRenderA1Atual_();

  // Formulário de saída (board de churn): as três perguntas abertas e a disposição para voltar
  fetchJSON_(ENDPOINT_VOZ_MEMBRO + '?ref=' + encodeURIComponent(ref) + '&cs=' + encodeURIComponent(cs)).then(function (v) {
    if (minha !== churnBlocosReq_) return;
    churnVozDados_ = v;
    churnRenderSeguro_(['saidaPerguntas'], function () { churnRenderSaida_(v); });
    churnRenderSeguro_(['retornoResumo'], function () { churnRenderRetorno_(v.retorno); });
    churnRenderA1Atual_();
  }).catch(function (err) {
    if (minha !== churnBlocosReq_) return;
    churnVozErro_ = err;
    churnErroEm_(CHURN_IDS_VOZ_, err);
    churnRenderA1Atual_();
  });

  fetchJSON_(ENDPOINT_VISITAS + '?ref=' + encodeURIComponent(ref)).then(function (v) {
    if (minha !== churnBlocosReq_) return;
    churnVisitasDados_ = v;
    churnRenderSeguro_(['visitasFunil', 'visitasPerfil', 'visitasLista'], function () { churnRenderVisitas_(v); });
    churnRenderSeguro_(['churnCruzamento'], function () { churnRenderCruzamento_(v.c1.cruzamento); });
    churnRenderSeguro_(['melhoriaFatos'], function () { churnRenderFatosMelhoria_(v.b3); });
    churnRenderA1Atual_();
  }).catch(function (err) {
    if (minha !== churnBlocosReq_) return;
    churnVisitasErro_ = err;
    churnErroEm_(CHURN_IDS_VISITAS_, err);
    churnRenderA1Atual_();
  });

  // O rastreio de reconquista não depende do mês: só recarrega se ainda não veio
  if (!churnRecDados_) churnCarregarReconquista_();
  churnCarregarMelhorias_();
}

/// Cada cartão aceita a fonte nula: enquanto carrega mostra "Carregando…", se a fonte falhou mostra
// "Sem dado" com o motivo, e nunca derruba os outros cartões.
// Situação do mês (revisão out/2026, K1): churns do mês contra o mês anterior e contra a média dos meses
// anteriores, e pedidos de churn em aberto com o MRR em risco. O recorde histórico vai como linha discreta
// sob o número de churns. MRR perdido no mês não tem coluna no board, então não entra.
function churnComparaTexto_(d, referencia) {
  if (d > 0) return d + ' a mais ' + referencia;
  if (d < 0) return (-d) + ' a menos ' + referencia;
  return 'igual ' + referencia;
}
function churnRenderA1_(visitas, voz, tela, rec) {
  var vazio = function (rotulo, erro) {
    return '<div class="churn-numero"><b class="texto">Sem dado</b><span class="rot">' + rotulo + '</span><span class="def">' +
      (erro ? 'Não foi possível carregar: ' + churnEsc_(erro.message || String(erro)) : 'Carregando…') + '</span></div>';
  };
  var h;
  if (tela && tela.situacao) {
    var s = tela.situacao;
    var partes = [];
    if (s.churnsMesAnterior !== null && s.churnsMesAnterior !== undefined) partes.push(churnComparaTexto_(s.churnsMes - s.churnsMesAnterior, 'que no mês anterior (' + s.churnsMesAnterior + ')'));
    partes.push(s.mediaSeisMeses !== null ? 'média de ' + churnNum_(s.mediaSeisMeses) + ' nos últimos ' + s.mesesNaMedia + ' meses' : 'sem histórico suficiente para a média');
    h = '<div class="churn-numero"><b>' + s.churnsMes + '</b><span class="rot">Churns no mês</span><span class="def">' + churnEsc_(partes.join('; ')) + '.</span>' +
      (tela.textos && tela.textos.notaRecorde ? '<span class="def recorde">' + churnEsc_(tela.textos.notaRecorde) + '</span>' : '') + '</div>';
  } else {
    h = vazio('Churns no mês', churnTelaErro_);
  }
  if (visitas) {
    var pend = visitas.cartoes.pedidosEmAberto;
    h += '<div class="churn-numero"><b>' + pend.quantidade + '</b><span class="rot">Pedidos de churn em aberto</span><span class="def">MRR em risco ' + churnMoeda_(pend.mrr) + (pend.semMrr ? ', ' + pend.semMrr + ' sem MRR informado' : '') + '</span></div>';
  } else {
    h += vazio('Pedidos de churn em aberto', churnVisitasErro_);
  }
  document.getElementById('churnA1').innerHTML = h;
  churnRenderReconquistaMes_();
}

// Reconquista (K5): a frase do mês e o funil acumulado. A frase substitui o "6 de 18" que estava na situação.
function churnRenderReconquistaMes_() {
  var el = document.getElementById('reconquistaMes');
  if (!el) return;
  var m = churnVozDados_ && churnVozDados_.retorno ? churnVozDados_.retorno.mes : null;
  var r = churnRecDados_ ? churnRecDados_.resumo : null;
  var frase = m ? m.voltaria + ' das ' + m.base + ' respostas do formulário de saída deste mês deram nota 9 ou 10 para voltar.' : '';
  var etapas = r ? [
    ['Disseram que voltariam', r.total],
    ['Contatados', Math.max(r.total - r.semContato, 0)],
    ['Em negociação', Math.max(r.abertos - r.semContato, 0)],
    ['Voltaram', r.voltaram],
  ] : [];
  el.innerHTML = (frase ? '<p class="rec-frase">' + churnEsc_(frase) + '</p>' : '')
    + (etapas.length ? '<div class="rec-funil">' + etapas.map(function (p) {
      return '<div class="rec-etapa"><b>' + p[1] + '</b><span>' + churnEsc_(p[0]) + '</span></div>';
    }).join('') + '</div>' : '');
}

var CHURN_TIPO_PENDENCIA_ = { visita: 'Reversão', acompanhamento: 'Reversão', causa: 'Reversão', reconquista: 'Reconquista', reconquista_massa: 'Reconquista' };
var churnA2Todas_ = false;
// O que fazer agora (K2): tabela com no máximo dez linhas, da mais atrasada para a menos atrasada. As
// pendências em massa de reconquista ficam uma linha por CS, no fim, e levam à seção de reconquista.
function churnRenderA2_(itens) {
  var el = document.getElementById('churnA2');
  var ordenados = itens.slice().sort(function (a, b) { return (a.massa - b.massa) || (b.diasParado - a.diasParado); });
  var mostrados = churnA2Todas_ ? ordenados : ordenados.slice(0, 10);
  var linhas = mostrados.map(function (i) {
    var tipo = CHURN_TIPO_PENDENCIA_[i.tipo] || 'Pendência';
    var dias = i.massa ? '-' : (i.diasParado + (i.diasParado === 1 ? ' dia' : ' dias'));
    return '<tr' + (i.massa ? ' class="massa" data-ch="verRec" title="Ver a lista de reconquista"' : '') + '><td>' + churnEsc_(tipo) + '</td><td>' + churnEsc_(i.membro) +
      '</td><td>' + churnEsc_(i.cs) + '</td><td class="num">' + dias + '</td><td>' + churnEsc_(i.proximoPasso) + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="table-wrap"><div class="table-scroll"><table class="churn-tabela"><thead><tr><th>Tipo</th><th>Membro</th><th>CS</th>' +
    '<th class="num">Dias parado</th><th>Próximo passo</th></tr></thead><tbody>' + linhas + '</tbody></table></div></div>' +
    (ordenados.length > 10 ? '<p class="churn-nota"><button type="button" class="churn-link" data-ch="a2Todas">' +
      (churnA2Todas_ ? 'Mostrar só as dez primeiras' : 'Ver todas as ' + ordenados.length + ' pendências') + '</button></p>' : '');
  el.onclick = function (ev) {
    var b = ev.target.closest('[data-ch]');
    if (!b) return;
    if (b.getAttribute('data-ch') === 'a2Todas') { churnA2Todas_ = !churnA2Todas_; churnRenderA2_(itens); }
    else if (b.getAttribute('data-ch') === 'verRec') document.getElementById('blocoReconquista').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
// Pendências de reversão (visitas) e de reconquista juntas. Enquanto uma das duas fontes não chega, mostra
// o que já veio; se as duas falharem, o erro aparece no bloco.
function churnRenderA2Atual_() {
  var el = document.getElementById('churnA2');
  if (!churnVisitasDados_ && !churnRecDados_) {
    if (churnVisitasErro_ && churnRecErro_) churnErroEm_(['churnA2'], churnVisitasErro_);
    else el.innerHTML = '<p class="gestor-empty">Carregando…</p>';
    return;
  }
  var itens = [];
  if (churnVisitasDados_) itens = itens.concat((churnVisitasDados_.a2Detalhe || []).map(function (a) {
    return { tipo: a.tipo, membro: a.membro, cs: a.cs, diasParado: a.diasParado, proximoPasso: a.proximoPasso, massa: false };
  }));
  if (churnRecDados_) itens = itens.concat((churnRecDados_.pendenciasDetalhe || []).map(function (p) {
    return { tipo: p.tipo, membro: p.membro, cs: p.cs, diasParado: p.diasParado, proximoPasso: p.proximoPasso, massa: p.tipo === 'reconquista_massa' };
  }));
  if (!itens.length) { el.innerHTML = '<p class="gestor-empty">Nenhuma pendência de reversão ou reconquista hoje.</p>'; return; }
  churnRenderA2_(itens);
}
// Por que estão saindo (K3): barras horizontais por motivo do mês. A barra é o número do mês de referência e
// a marca escura é o mês anterior, para comparação. O motivo mais citado fica no topo.
function churnRenderMotivosBarras_(data) {
  var el = document.getElementById('churnNumeros');
  var lista = data.motivosMes || [];
  if (!lista.length) { el.innerHTML = '<p class="gestor-empty">Nenhum churn neste mês neste filtro.</p>'; return; }
  var max = Math.max.apply(null, lista.map(function (m) { return Math.max(m.atual, m.anterior); }).concat([1]));
  el.innerHTML = lista.map(function (m) {
    var largura = Math.round(m.atual / max * 100);
    var marca = Math.round(m.anterior / max * 100);
    return '<div class="motivo-linha"><span class="motivo-rotulo">' + churnEsc_(m.rotulo) + '</span>' +
      '<span class="motivo-trilha"><i style="width:' + largura + '%"></i><b class="motivo-marca" style="left:' + marca + '%"></b></span>' +
      '<span class="motivo-num"><b>' + m.atual + '</b> <small>mês anterior ' + m.anterior + '</small></span></div>';
  }).join('');
}

// O que os churns pedem para melhorar (K4): por motivo do mês, quantos churns, até três trechos do formulário
// de saída (anonimizados), a ação sugerida e o botão que abre a melhoria já preenchida.
var churnPedidos_ = [];
function churnRenderPedidos_(lista) {
  var el = document.getElementById('churnPedidos');
  churnPedidos_ = lista || [];
  if (!churnPedidos_.length) { el.innerHTML = '<p class="gestor-empty">Nenhum churn neste mês neste filtro.</p>'; return; }
  el.innerHTML = churnPedidos_.map(function (p, idx) {
    var trechos = p.trechos.length
      ? p.trechos.map(function (t) { return '<blockquote>' + churnEsc_(t) + '</blockquote>'; }).join('')
      : '<p class="churn-nota">Nenhum trecho sugerido neste motivo.</p>';
    return '<div class="pedido-motivo"><div class="pedido-topo"><b>' + churnEsc_(p.rotulo) + '</b><span>' + p.qtd + (p.qtd === 1 ? ' churn' : ' churns') + '</span></div>' +
      trechos +
      '<p class="pedido-acao"><b>Ação sugerida:</b> ' + churnEsc_(p.acao) + '</p>' +
      '<button type="button" class="primario pedido-criar" data-pedido="' + idx + '">Criar melhoria</button></div>';
  }).join('');
  el.onclick = function (ev) {
    var b = ev.target.closest('[data-pedido]');
    if (!b) return;
    var p = churnPedidos_[Number(b.getAttribute('data-pedido'))];
    churnAbrirFormMelhoria_({ titulo: 'Melhorar: ' + p.rotulo, observacao: p.acao + '. Churns de origem: ' + p.ids.join(', ') + '.' }, null, null);
    document.getElementById('melhoriaForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
function churnRenderCruzamento_(c) {
  var el = document.getElementById('churnCruzamento');
  if (!c || c.ligadas < 5) {
    el.innerHTML = '<p class="churn-nota">Ainda são ' + (c ? c.ligadas : 0) + ' visitas com formulário ligado; o cruzamento aparece a partir de 5.</p>';
    return;
  }
  el.innerHTML = churnTabela_(['Motivo declarado'].concat(c.causas), c.motivos.map(function (m, i) {
    return [churnEsc_(m)].concat(c.matriz[i].map(function (n) { return churnEsc_(n); }));
  }));
}

// ===== O que dizem ao sair (08/10/2026) =====
// Três colunas, uma por pergunta aberta do formulário de saída. Cada coluna mostra a frase do tema mais
// citado e os cinco temas com mais respostas, com a variação contra o período anterior.
var SAIDA_TEMAS_POR_PERGUNTA_ = 5;
function temasColunaHtml_(p, grupoAttr, grupoValor, comMelhoria) {
  var linhas = p.ranking.slice(0, SAIDA_TEMAS_POR_PERGUNTA_);
  var max = Math.max.apply(null, linhas.map(function (l) { return l.textos; }).concat([1]));
  var h = '<div class="saida-col"><h3>' + churnEsc_(p.rotulo) + '</h3>' + (p.pergunta ? '<p class="saida-perg">' + churnEsc_(p.pergunta) + '</p>' : '');
  h += p.insights.length ? '<p class="saida-insight">' + churnEsc_(p.insights[0]) + '</p>' : '<p class="saida-insight vazio">Nenhum tema apareceu nas respostas deste período.</p>';
  linhas.forEach(function (l) {
    var delta = l.delta > 0 ? '<span class="sobe">▲ ' + l.delta + '</span>' : (l.delta < 0 ? '<span class="desce">▼ ' + Math.abs(l.delta) + '</span>' : '<span class="igual">=</span>');
    h += '<button type="button" class="saida-tema" data-' + grupoAttr + '="trechos" data-grupo="' + churnEsc_(grupoValor) + '" data-tema="' + churnEsc_(l.chave) + '" title="Ler os trechos deste tema">' +
      '<span class="nome">' + churnEsc_(l.rotulo) + '</span>' +
      '<span class="barra"><i style="width:' + Math.round(l.textos / max * 100) + '%"></i></span>' +
      '<span class="num">' + l.textos + ' ' + delta + '</span></button>';
  });
  if (comMelhoria && linhas[0]) {
    h += '<button type="button" class="churn-link saida-melhoria" data-ch="criarMelhoria" data-tema="' + churnEsc_(linhas[0].chave) + '" data-rotulo="' + churnEsc_(linhas[0].rotulo) + '">Criar melhoria sobre ' + churnEsc_(linhas[0].rotulo) + '</button>';
  }
  h += '<p class="saida-rodape">' + churnEsc_(p.rodape) + '</p></div>';
  return h;
}
function churnRenderSaida_(v) {
  document.getElementById('saidaPerguntas').innerHTML = '<div class="saida-grade">' +
    v.b2.perguntas.map(function (p) { return temasColunaHtml_(p, 'ch', p.chave, true); }).join('') + '</div>' +
    '<p class="churn-nota">O número ao lado de cada tema é de respostas no período; a seta compara com os três meses anteriores.</p>';
}
function trechosHtml_(titulo, lista) {
  return '<div class="saida-trechos"><h3 class="churn-subtitulo">' + churnEsc_(titulo) + '</h3>' +
    (lista.length ? lista.map(function (t) {
      return '<blockquote>' + churnEsc_(t.texto) + '<cite>' + churnEsc_(t.mes.split('-').reverse().join('/')) + '</cite></blockquote>';
    }).join('') : '<p class="churn-nota">Nenhum trecho com conteúdo neste tema.</p>') + '</div>';
}
function churnMostrarTrechos_(pergunta, chave) {
  var p = ((churnVozDados_ && churnVozDados_.b2.perguntas) || []).filter(function (x) { return x.chave === pergunta; })[0];
  if (!p) return;
  var tema = p.ranking.filter(function (l) { return l.chave === chave; })[0];
  var el = document.getElementById('saidaTrechos');
  el.innerHTML = trechosHtml_(p.rotulo + ': ' + (tema ? tema.rotulo : '') + ', trechos anonimizados', (p.trechos || {})[chave] || []);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== Quem voltaria (08/10/2026) =====
// Histograma da nota de 0 a 10 e, ao lado, a proporção de quem voltaria por motivo da saída.
function retornoHistogramaSvg_(dist) {
  var W = 420, H = 190, ml = 8, mr = 8, mt = 18, mb = 30, n = 11, gap = 6;
  var bw = (W - ml - mr - gap * (n - 1)) / n;
  var max = Math.max.apply(null, dist.concat([1]));
  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Quantas pessoas deram cada nota de 0 a 10 para voltar">';
  dist.forEach(function (q, i) {
    var x = ml + i * (bw + gap), alt = (q / max) * (H - mt - mb), y = H - mb - alt;
    var cor = i >= 9 ? '#1A1A1A' : (i >= 7 ? '#C6C4C4' : '#C0433D');
    h += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(alt, q ? 2 : 0) + '" rx="3" fill="' + cor + '"><title>Nota ' + i + ': ' + q + '</title></rect>';
    if (q) h += '<text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#5D5D5D" font-family="Inter,sans-serif">' + q + '</text>';
    h += '<text x="' + (x + bw / 2) + '" y="' + (H - mb + 14) + '" text-anchor="middle" font-size="10" fill="#807E7E" font-family="Inter,sans-serif">' + i + '</text>';
  });
  h += '<text x="' + (W / 2) + '" y="' + (H - 2) + '" text-anchor="middle" font-size="10" fill="#9F9F9F" font-family="Inter,sans-serif">Nota para voltar à MOAI</text>';
  return h + '</svg>';
}
function churnRenderRetorno_(r) {
  var hst = r.historico;
  if (!hst.base) { document.getElementById('retornoResumo').innerHTML = '<p class="gestor-empty">Nenhuma nota de retorno registrada no formulário de saída.</p>'; return; }
  var f = hst.faixas;
  var p = function (x) { return Math.round(x / hst.base * 100); };
  var h = '<div class="retorno-topo">' +
    '<div class="retorno-num"><b>' + f.voltaria + '</b><span>voltariam (9 e 10)</span></div>' +
    '<div class="retorno-num"><b>' + f.talvez + '</b><span>talvez (7 e 8)</span></div>' +
    '<div class="retorno-num"><b>' + f.nao + '</b><span>não voltariam (0 a 6)</span></div>' +
    '<div class="retorno-num"><b>' + churnNum_(hst.media) + '</b><span>nota média, em ' + hst.base + ' respostas</span></div></div>';
  h += '<div class="retorno-faixa"><span class="v" style="width:' + p(f.voltaria) + '%">' + p(f.voltaria) + '%</span><span class="t" style="width:' + p(f.talvez) + '%">' + p(f.talvez) + '%</span><span class="n" style="width:' + p(f.nao) + '%">' + p(f.nao) + '%</span></div>';
  h += (r.frases || []).map(function (t) { return '<div class="voz-insight">' + churnEsc_(t) + '</div>'; }).join('');
  h += '<div class="retorno-grade"><div class="retorno-hist">' + retornoHistogramaSvg_(hst.distribuicao) + '</div><div class="retorno-motivos"><h3 class="churn-subtitulo">Quem voltaria, por motivo da saída</h3>';
  hst.porMotivo.forEach(function (m) {
    var w = function (x) { return m.base ? (x / m.base * 100) : 0; };
    h += '<div class="retorno-mot" title="' + m.voltaria + ' voltariam, ' + m.talvez + ' talvez, ' + m.nao + ' não, em ' + m.base + ' respostas">' +
      '<span class="nome">' + churnEsc_(m.rotulo) + '</span>' +
      '<span class="barra"><i class="v" style="width:' + w(m.voltaria) + '%"></i><i class="t" style="width:' + w(m.talvez) + '%"></i><i class="n" style="width:' + w(m.nao) + '%"></i></span>' +
      '<span class="num">' + (m.pctVoltaria === null ? m.voltaria + ' de ' + m.base : churnPct_(m.pctVoltaria)) + '</span></div>';
  });
  h += '<p class="churn-nota">Escuro: voltariam. Cinza: talvez. Vermelho: não voltariam. O percentual é de quem deu 9 ou 10.</p></div></div>';
  var extras = [];
  if (hst.preenchidosPeloCs) extras.push(hst.preenchidosPeloCs + ' formulários preenchidos pelo CS ficaram fora');
  if (hst.semNota) extras.push(hst.semNota + ' sem nota');
  h += '<p class="churn-nota">Respostas desde ' + churnEsc_(hst.desde ? hst.desde.split('-').reverse().join('/') : 'o início') + (extras.length ? '; ' + extras.join(' e ') : '') + '. A lista nominal está no rastreio de reconquista, logo abaixo.</p>';
  document.getElementById('retornoResumo').innerHTML = h;
}

// ===== Rastreio de reconquista (08/10/2026) =====
function churnCarregarReconquista_() {
  var minha = ++churnRecReq_;
  churnRecErro_ = null;
  return fetchJSON_(ENDPOINT_RECONQUISTA + (churnRecTalvez_ ? '?talvez=1' : '')).then(function (d) {
    if (minha !== churnRecReq_) return;
    churnRecDados_ = d;
    churnRenderSeguro_(['reconquistaPainel'], churnRenderReconquista_);
    churnRenderA1Atual_();
  }).catch(function (err) {
    if (minha !== churnRecReq_) return;
    churnRecErro_ = err;
    churnErroEm_(['reconquistaPainel'], err);
    churnRenderA1Atual_();
  });
}
function recStatusRotulo_(chave) {
  var s = ((churnRecDados_ && churnRecDados_.status) || []).filter(function (x) { return x.chave === chave; })[0];
  return s ? s.rotulo : chave;
}
function churnRenderReconquista_() {
  var d = churnRecDados_, r = d.resumo;
  var el = document.getElementById('reconquistaPainel');
  if (!r.total) { el.innerHTML = '<p class="gestor-empty">Nenhum ex membro com nota ' + (d.incluirTalvez ? '7 ou mais' : '9 ou 10') + ' para voltar.</p>'; return; }
  var filtros = [{ chave: 'abertos', rotulo: 'Em aberto', n: r.abertos }, { chave: 'vencidos', rotulo: 'Contato vencido', n: r.vencidos }]
    .concat(d.status.map(function (s) { return { chave: s.chave, rotulo: s.rotulo, n: r.porStatus[s.chave] }; }))
    .concat([{ chave: 'todos', rotulo: 'Todos', n: r.total }]);
  var h = '<div class="rcq-filtros" role="group" aria-label="Filtrar por situação">' + filtros.map(function (f) {
    return '<button type="button" class="rcq-filtro' + (churnRecFiltro_ === f.chave ? ' ativo' : '') + (f.chave === 'vencidos' && f.n ? ' alerta' : '') + '" data-ch="recFiltro" data-filtro="' + f.chave + '">' + churnEsc_(f.rotulo) + ' <b>' + f.n + '</b></button>';
  }).join('') + '</div>';
  var lista = d.itens.filter(function (i) {
    if (churnRecFiltro_ === 'todos') return true;
    if (churnRecFiltro_ === 'abertos') return i.aberto;
    if (churnRecFiltro_ === 'vencidos') return i.vencido;
    return i.status === churnRecFiltro_;
  });
  if (!lista.length) { h += '<p class="gestor-empty">Ninguém nesta situação.</p>'; el.innerHTML = h; return; }
  var opcoes = function (atual) { return d.status.map(function (s) { return '<option value="' + s.chave + '"' + (s.chave === atual ? ' selected' : '') + '>' + churnEsc_(s.rotulo) + '</option>'; }).join(''); };
  h += '<div class="rcq-lista">';
  lista.slice(0, churnRecLimite_).forEach(function (i) {
    var editando = churnRecEditando_ === i.churnId;
    var proximo = i.proximoContato ? (i.vencido ? 'Contato venceu há ' + i.diasVencido + (i.diasVencido === 1 ? ' dia' : ' dias') : 'Próximo contato em ' + churnDataBR_(i.proximoContato)) : 'Sem próximo contato';
    h += '<div class="rcq-item' + (i.vencido ? ' vencido' : '') + (i.aberto ? '' : ' encerrado') + (editando ? ' editando' : '') + '" data-churn="' + i.churnId + '">' +
      '<div class="rcq-linha">' +
        '<div class="rcq-nota' + (i.faixa === 'voltaria' ? '' : ' talvez') + '" title="Nota para voltar à MOAI"><b>' + i.nota + '</b><span>de 10</span></div>' +
        '<div class="rcq-quem"><a href="' + churnEsc_(i.link) + '" target="_blank" rel="noopener" title="Abrir no Monday">' + churnEsc_(i.membro) + '</a>' +
          '<span>' + churnEsc_([i.empresa, i.cs ? 'CS ' + i.cs : null].filter(Boolean).join(', ')) + '</span>' +
          '<span>Saiu em ' + churnDataBR_(i.dataSaida) + '. Motivo: ' + churnEsc_(i.motivoRotulo) + '</span></div>' +
        '<div class="rcq-sit"><span class="rcq-pill st-' + i.status + '">' + churnEsc_(recStatusRotulo_(i.status)) + '</span>' +
          '<span class="rcq-prox' + (i.vencido ? ' alerta' : '') + '">' + churnEsc_(proximo) + (i.responsavel ? ', com ' + churnEsc_(i.responsavel) : '') + '</span>' +
          (i.observacao ? '<span class="rcq-obs-txt" title="' + churnEsc_(i.observacao) + '">' + churnEsc_(i.observacao) + '</span>' : '') + '</div>' +
        '<button type="button" class="rcq-editar" data-ch="recEditar" aria-expanded="' + (editando ? 'true' : 'false') + '">' + (editando ? 'Fechar' : 'Registrar contato') + '</button>' +
      '</div>';
    if (editando) {
      h += '<div class="rcq-form">' +
        '<label class="rcq-campo">Situação<select class="pill-select" data-rec="status">' + opcoes(i.status) + '</select></label>' +
        '<label class="rcq-campo">Responsável<input type="text" class="pill-select" data-rec="responsavel" maxlength="80" value="' + churnEsc_(i.responsavel || '') + '" placeholder="Quem vai falar"></label>' +
        '<label class="rcq-campo">Próximo contato<input type="date" class="pill-select" data-rec="proximo" value="' + churnEsc_(i.proximoContato || '') + '"></label>' +
        '<label class="rcq-campo rcq-obs">Observação<input type="text" class="pill-select" data-rec="observacao" maxlength="600" value="' + churnEsc_(i.observacao || '') + '" placeholder="O que foi conversado"></label>' +
        '<div class="rcq-acoes"><button type="button" class="primario" data-ch="recSalvar">Salvar</button>' +
          '<span class="rcq-msg">' + (i.atualizadoEm ? 'Último registro em ' + churnDataBR_(i.atualizadoEm.slice(0, 10)) + (i.atualizadoPor ? ' por ' + churnEsc_(i.atualizadoPor.split('@')[0]) : '') : 'Ainda sem registro') + '</span></div>' +
        '</div>';
    }
    h += '</div>';
  });
  h += '</div>';
  if (lista.length > churnRecLimite_) h += '<button type="button" class="aval-mais" data-ch="recMais">Ver mais ' + Math.min(8, lista.length - churnRecLimite_) + ' (faltam ' + (lista.length - churnRecLimite_) + ')</button>';
  if (r.preenchidosPeloCs) h += '<p class="churn-nota">' + r.preenchidosPeloCs + ' formulários preenchidos pelo CS no lugar do membro não entram nesta lista.</p>';
  el.innerHTML = h;
}
function churnSalvarReconquista_(card) {
  var churnId = Number(card.getAttribute('data-churn'));
  var val = function (k) { var x = card.querySelector('[data-rec="' + k + '"]'); return x ? x.value : ''; };
  var corpo = { churnId: churnId, status: val('status'), responsavel: val('responsavel') || null, proximoContato: val('proximo') || null, observacao: val('observacao') || null };
  var msg = card.querySelector('.rcq-msg');
  var btn = card.querySelector('[data-ch="recSalvar"]');
  btn.disabled = true; msg.textContent = 'Salvando…';
  return fetchJSON_(ENDPOINT_RECONQUISTA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    .then(function () { churnRecEditando_ = null; return churnCarregarReconquista_(); })
    .catch(function (err) { btn.disabled = false; msg.textContent = 'Não foi possível salvar: ' + err.message; msg.classList.add('erro'); });
}

// ===== Como os membros avaliam (08/10/2026) =====
// Régua única de 0 a 10. Cor só para exceção: média abaixo de 9 em âmbar, abaixo de 8 em vermelho.
function avalNivel_(m) { if (m === null || m === undefined) return 'nd'; if (m >= 9.5) return 'n0'; if (m >= 9) return 'n1'; if (m >= 8) return 'n2'; return 'n3'; }
function avalNum_(m) { return m === null || m === undefined ? '-' : Number(m).toFixed(1).replace('.', ','); }
function avalTrilhoSvg_(media, anterior) {
  // Régua de 6 a 10: abaixo de 6 a média encosta no início. Na escala inteira de 0 a 10 todas as
  // médias reais (perto de 9,5) ficariam no mesmo ponto e a régua não diria nada.
  var W = 240, H = 26, x = function (v) { return 6 + ((Math.max(6, Math.min(10, v)) - 6) / 4) * (W - 12); };
  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aval-trilho" role="img" aria-label="Posição da média na régua de 6 a 10">';
  h += '<rect x="6" y="11" width="' + (W - 12) + '" height="4" rx="2" fill="#E9E9E9"/>';
  h += '<rect x="' + x(9) + '" y="11" width="' + (x(10) - x(9)) + '" height="4" fill="#C6C4C4"/>';
  [6, 7, 8, 9, 10].forEach(function (t) { h += '<text x="' + x(t) + '" y="26" text-anchor="middle" font-size="9" fill="#9F9F9F" font-family="Inter,sans-serif">' + t + '</text>'; });
  if (anterior !== null && anterior !== undefined) h += '<circle cx="' + x(anterior) + '" cy="13" r="5" fill="#FFFFFF" stroke="#9F9F9F" stroke-width="1.5"><title>Período anterior: ' + avalNum_(anterior) + '</title></circle>';
  if (media !== null && media !== undefined) h += '<circle cx="' + x(media) + '" cy="13" r="6" fill="#1A1A1A"><title>Média atual: ' + avalNum_(media) + '</title></circle>';
  return h + '</svg>';
}
function churnRenderNotas_(b4) {
  var cards = b4.dimensoes.map(function (d) {
    var cls = d.media === null ? '' : (d.media < 8 ? ' critico' : (d.media < 9 ? ' atencao' : ''));
    var v = d.variacaoMedia;
    var varTxt = v === null ? (d.mediaAnterior === null ? 'Sem período anterior para comparar' : '') :
      (v === 0 ? 'Igual ao período anterior' : (v > 0 ? '▲ ' : '▼ ') + avalNum_(Math.abs(v)) + ' em relação ao período anterior');
    var tot = d.faixas.alta + d.faixas.media + d.faixas.baixa;
    var seg = function (k) { return tot ? '<span class="' + k + '" style="width:' + (d.faixas[k] / tot * 100) + '%"></span>' : ''; };
    var corteAlto = d.escala === 5 ? 'nota 5' : '9 e 10';
    return '<div class="aval-card">' +
      '<div class="rot">' + churnEsc_(d.curto) + '</div>' +
      '<div class="nota' + cls + '">' + avalNum_(d.media) + ' <small>de 10</small></div>' +
      '<div class="var' + (v !== null && v < 0 ? ' pior' : '') + '">' + churnEsc_(varTxt) + '</div>' +
      avalTrilhoSvg_(d.media, d.mediaAnterior) +
      '<div class="aval-faixas" title="' + d.faixas.alta + ' altas, ' + d.faixas.media + ' médias, ' + d.faixas.baixa + ' baixas">' + seg('alta') + seg('media') + seg('baixa') + '</div>' +
      '<div class="aval-legenda"><span>' + (tot ? Math.round(d.faixas.alta / tot * 100) : 0) + '% deram ' + corteAlto + '</span><span><b>' + d.baixas + '</b> notas baixas de ' + d.respostas + '</span></div>' +
      '</div>';
  }).join('');
  document.getElementById('notasDimensoes').innerHTML = '<div class="aval-cards">' + cards + '</div>';
  avalRenderMapa_(b4, false);
  var j = b4.justificativas;
  document.getElementById('notasJustificativas').textContent = 'O que dizem os que deram nota baixa: ' + (j.temaSugestoes ? 'o tema mais citado nas sugestões é ' + j.temaSugestoes + '. ' : '') +
    (j.temaAvaliacoesCs ? 'Nas avaliações de CS, o mais citado é ' + j.temaAvaliacoesCs + '. ' : '') + j.frase;
}
// Mapa de calor: conselhos (linhas) por dimensão (colunas), da menor média geral para a maior.
// Mostra os 8 primeiros; o resto fica a um clique. A tabela completa continua no detalhe.
var AVAL_LINHAS_INICIAIS_ = 8;
function avalNomeCurto_(titulo) {
  // "Executivo | Adriana Soares (Mateus)" vira "Adriana Soares". Sem regex de propósito: dentro deste
  // template string as barras invertidas somem e quebram a expressão.
  var t = String(titulo || '');
  var partes = t.split('|');
  if (partes.length < 2) return t;
  var meio = partes[1];
  var abre = meio.indexOf('(');
  return (abre >= 0 ? meio.slice(0, abre) : meio).trim() || t;
}
// ===== NPS: período, cobertura e "Onde a nota cai" em pontos (revisão out/2026, rodada 2, Fase 6) =====
// O mês escolhido governa a página. "Últimos 3 meses" é opcional. A cobertura é um anel no cabeçalho; os
// conselhos ainda por acontecer aparecem só no painel lateral, sem nota. "Onde a nota cai" é um gráfico de
// pontos: uma faixa por dimensão, um ponto por conselho, eixo de 6 a 10 compartilhado.
var NPS_JANELA_ = 'mes';
function npsPeriodoTexto_(ref) {
  var m = Number(ref.slice(5, 7)) - 1, ano = Number(ref.slice(0, 4));
  if (NPS_JANELA_ === 'mes') return CHURN_MESES_[m].toLowerCase() + ' de ' + ano;
  var im = m - 2, ai = ano;
  if (im < 0) { im += 12; ai--; }
  return CHURN_MESES_[im].toLowerCase() + (ai === ano ? '' : ' de ' + ai) + ' a ' + CHURN_MESES_[m].toLowerCase() + ' de ' + ano;
}
function npsDataCurta_(iso) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}
function npsRenderCobertura_(c, ref) {
  var el = document.getElementById('npsCobertura');
  if (!el) return;
  var prop = c.realizados ? c.avaliados / c.realizados : 0;
  var r = 30, cc = 2 * Math.PI * r;
  var anel = '<svg class="nps-anel" width="78" height="78" viewBox="0 0 78 78" role="img" aria-label="' + c.avaliados + ' de ' + c.realizados + ' conselhos realizados já avaliados">' +
    '<circle cx="39" cy="39" r="' + r + '" fill="none" stroke="var(--cinza-superficie)" stroke-width="9"/>' +
    (prop > 0 ? '<circle cx="39" cy="39" r="' + r + '" fill="none" stroke="var(--verde)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (prop * cc) + ' ' + cc + '" transform="rotate(-90 39 39)"/>' : '') +
    '</svg>';
  el.innerHTML = '<button type="button" class="nps-cobertura" data-nps="cobertura">' + anel +
    '<span class="nps-cob-texto"><b>' + c.avaliados + ' de ' + c.realizados + ' conselhos realizados já avaliados</b>' +
    '<small>' + c.previstos + ' previstos em ' + CHURN_MESES_[Number(ref.slice(5, 7)) - 1].toLowerCase() + '</small></span></button>';
}
function npsAbrirCobertura_() {
  var c = npsDados_ && npsDados_.sugestoes && npsDados_.sugestoes.cobertura;
  if (!c) return;
  var realizados = (c.detalhe || []).map(function (d) {
    return '<div class="nps-prox"><b>' + churnEsc_(d.conselheiro) + '</b><span>' +
      (d.avaliado ? 'avaliado, ' + d.respostas + (d.respostas === 1 ? ' resposta' : ' respostas') : 'sem resposta ainda') + '</span></div>';
  }).join('');
  var futuros = (c.proximos || []).map(function (p) {
    return '<div class="nps-prox"><b>' + churnEsc_(p.conselheiro) + '</b><span>acontece em ' + churnEsc_(npsDataCurta_(p.dataIso).slice(0, 5)) + '</span></div>';
  }).join('');
  painelLateralAbrir_('Conselhos do mês', '<p class="churn-nota">Realizados até agora, com o estado da resposta do NPS.</p>' +
    (realizados || '<p class="churn-nota">Nenhum conselho realizado no mês até agora.</p>') +
    (futuros ? '<p class="churn-nota">Ainda por acontecer. Não têm nota.</p>' + futuros : ''));
}
// Textos do período (Parte B): subtítulo do bloco e linha de base com média por conselho realizado
function npsRenderTextosPeriodo_(d, ref) {
  var m = d.mediaPorConselho;
  var sub = document.getElementById('npsSubtitulo');
  if (sub) sub.textContent = NPS_JANELA_ === 'mes'
    ? 'Respostas do mês escolhido, comparadas ao mês anterior.'
    : 'Respostas de ' + npsPeriodoTexto_(ref) + ', comparadas aos três meses anteriores.';
  var txt = NPS_JANELA_ === 'mes' ? d.respostas.janela + ' respostas de ' + m.mes.conselhos + ' conselhos em ' + npsPeriodoTexto_(ref) + ', média de ' + String(m.mes.media === null ? '-' : m.mes.media).replace('.', ',') + ' por conselho.' + (m.anterior.media === null ? '' : ' O mês anterior teve ' + String(m.anterior.media).replace('.', ',') + ' por conselho.')
    : d.respostas.janela + ' respostas de ' + npsPeriodoTexto_(ref) + ', de ' + m.mes.conselhos + ' conselhos.';
  document.getElementById('npsBase').textContent = txt;
}
function avalRenderMapa_(b4, todos) {
  var el = document.getElementById('notasConselhos');
  if (!b4.conselhos.length) { el.innerHTML = '<p class="gestor-empty">Nenhum conselho com respostas suficientes nesta janela.</p>'; return; }
  var dims = b4.dimensoesRotulos;
  var ordem = b4.conselhos.slice().sort(function (a, b) {
    var x = a.mediaGeral === null ? 99 : a.mediaGeral, y = b.mediaGeral === null ? 99 : b.mediaGeral;
    return x - y || b.percentual - a.percentual;
  });
  var visiveis = todos ? ordem : ordem.slice(0, AVAL_LINHAS_INICIAIS_);
  var h = '<div class="aval-mapa-grade"><div class="cab esq">Conselho</div>' +
    dims.map(function (d) { return '<div class="cab"><span class="longo">' + churnEsc_(d.curto) + '</span><span class="curto">' + churnEsc_(d.curto.slice(0, 4)) + '</span></div>'; }).join('') + '<div class="cab esq col-acao">Próximo passo</div>';
  visiveis.forEach(function (c) {
    h += '<div class="nome" title="' + churnEsc_(c.conselho) + '">' + churnEsc_(avalNomeCurto_(c.conselho)) + '<span>CS ' + churnEsc_(c.cs || 'não informado') + ', ' + c.respostas + ' respostas</span></div>';
    dims.forEach(function (d) {
      var m = c.medias[d.chave];
      h += '<div class="aval-cel ' + avalNivel_(m) + '" title="' + churnEsc_(d.curto) + ': ' + avalNum_(m) + ' de 10">' + (m === null ? 'sem dado' : avalNum_(m)) + '</div>';
    });
    var acao = c.fraseConversa ? 'Conversar com ' + c.cs : (c.percentual > 0 ? c.baixas + ' nota' + (c.baixas === 1 ? '' : 's') + ' baixa' + (c.baixas === 1 ? '' : 's') : 'Sem nota baixa');
    var dica = (c.temaSugestoes ? 'Tema das sugestões: ' + c.temaSugestoes + '. ' : '') + 'Dimensão que mais pesa: ' + c.dimensaoMaisPesa + '.';
    h += '<div class="aval-acao col-acao' + (c.fraseConversa ? '' : ' ok') + '" title="' + churnEsc_(dica) + '">' + churnEsc_(acao) + '</div>';
  });
  h += '</div>';
  h += '<div class="aval-escala"><span><i style="background:#F2F2F2"></i>9,5 ou mais</span><span><i style="background:#F6E7C2"></i>9 a 9,4</span><span><i style="background:#E9B84E"></i>8 a 8,9</span><span><i style="background:#C0433D"></i>abaixo de 8</span><span>Passe o mouse sobre o próximo passo para ver o tema das sugestões.</span></div>';
  if (ordem.length > AVAL_LINHAS_INICIAIS_) {
    h += '<button type="button" class="aval-mais" id="avalMais">' + (todos ? 'Mostrar só os ' + AVAL_LINHAS_INICIAIS_ + ' com menor nota' : 'Ver os ' + ordem.length + ' conselhos') + '</button>';
  }
  h += '<details class="aval-detalhe"><summary>Ver a tabela completa</summary>' +
    churnTabela_(['Conselho', 'CS', 'Respostas', 'Notas baixas', 'Percentual', 'Dimensão que mais pesa', 'Tema das sugestões', 'Ação'],
      b4.conselhos.map(function (c) {
        return [churnEsc_(c.conselho), churnEsc_(c.cs || '-'), churnEsc_(c.respostas), churnEsc_(c.baixas), churnPct_(c.percentual), churnEsc_(c.dimensaoMaisPesa), churnEsc_(c.temaSugestoes || '-'), churnEsc_(c.fraseConversa || '-')];
      })) + '</details>';
  el.innerHTML = h;
  var btn = document.getElementById('avalMais');
  if (btn) btn.addEventListener('click', function () { avalRenderMapa_(b4, !todos); });
}

// ===== Por que não evoluem no desafio (08/10/2026) =====
// Barra única da resposta de continuidade e dispersão presença por travados, um ponto por conselho.
function desafioBarraHtml_(c) {
  if (!c || !c.base) return '<p class="gestor-empty">Sem respostas de continuidade nesta janela.</p>';
  var p = function (n) { return Math.round(n / c.base * 1000) / 10; };
  var seg = function (cls, n, rot) { var w = n / c.base * 100; return n ? '<span class="' + cls + '" style="width:' + w + '%" title="' + rot + ': ' + n + ' (' + String(p(n)).replace('.', ',') + '%)">' + (w >= 9 ? String(p(n)).replace('.', ',') + '%' : '') + '</span>' : ''; };
  return '<div class="desafio-barra">' + seg('sim', c.sim, 'Sentem bastante evolução') + seg('partes', c.partes, 'Em partes, ainda travados') + seg('nao', c.naoVejo, 'Não veem evolução') + '</div>';
}
function desafioDispersaoSvg_(tabela) {
  var pts = tabela.filter(function (l) { return l.presencaPercentual !== null; });
  if (!pts.length) return '<p class="gestor-empty">Nenhum conselho com presença apurada no mês de referência.</p>';
  var W = 680, H = 320, ml = 48, mr = 16, mt = 16, mb = 42;
  var x = function (v) { return ml + (v / 100) * (W - ml - mr); };
  var y = function (v) { return mt + (1 - v / 100) * (H - mt - mb); };
  var maxR = Math.max.apply(null, pts.map(function (l) { return l.respostas; }));
  var r = function (n) { return 5 + Math.sqrt(n / maxR) * 9; };
  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Presença no mês por percentual de travados, um ponto por conselho">';
  h += '<rect x="' + ml + '" y="' + mt + '" width="' + (x(70) - ml) + '" height="' + (y(40) - mt) + '" fill="#FBEDEC"/>';
  h += '<rect x="' + x(70) + '" y="' + mt + '" width="' + (W - mr - x(70)) + '" height="' + (y(40) - mt) + '" fill="#FBF3E2"/>';
  [0, 25, 50, 75, 100].forEach(function (t) {
    h += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="#EEECEC"/>';
    h += '<text class="eixo" x="' + (ml - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '%</text>';
    h += '<text class="eixo" x="' + x(t) + '" y="' + (H - mb + 16) + '" text-anchor="middle">' + t + '%</text>';
  });
  h += '<line x1="' + x(70) + '" x2="' + x(70) + '" y1="' + mt + '" y2="' + (H - mb) + '" stroke="#C6C4C4" stroke-dasharray="4 4"/>';
  h += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(40) + '" y2="' + y(40) + '" stroke="#C6C4C4" stroke-dasharray="4 4"/>';
  h += '<text class="quad" x="' + (ml + 8) + '" y="' + (mt + 14) + '">Pouca presença e muitos travados: atacar presença</text>';
  h += '<text class="quad" x="' + (W - mr - 8) + '" y="' + (mt + 14) + '" text-anchor="end">Boa presença e muitos travados: rever a condução</text>';
  h += '<text class="eixo" x="' + ((ml + W - mr) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Presença no mês de referência</text>';
  h += '<text class="eixo" transform="rotate(-90)" x="' + (-(mt + H - mb) / 2) + '" y="12" text-anchor="middle">Membros travados</text>';
  var rotulos = '';
  pts.slice().sort(function (a, b) { return b.respostas - a.respostas; }).forEach(function (l) {
    var alerta = l.percentualTravados >= 40;
    var dica = l.conselho + '. CS ' + (l.cs || 'não informado') + '. ' + String(l.percentualTravados).replace('.', ',') + '% travados em ' + l.respostas + ' respostas. Presença ' + String(l.presencaPercentual).replace('.', ',') + '%.' +
      (l.ganhosPercentual !== null ? ' Ganhos na ata ' + String(l.ganhosPercentual).replace('.', ',') + '%.' : '') + (l.temaTravados ? ' Tema dos travados: ' + l.temaTravados + '.' : '');
    h += '<circle cx="' + x(l.presencaPercentual) + '" cy="' + y(l.percentualTravados) + '" r="' + r(l.respostas) + '" fill="' + (alerta ? '#C89A2E' : '#1A1A1A') + '" fill-opacity="' + (alerta ? '0.95' : '0.35') + '" stroke="#FFFFFF" stroke-width="1.5"><title>' + churnEsc_(dica) + '</title></circle>';
    if (alerta) {
      var lx = x(l.presencaPercentual), anc = lx > W - 160 ? 'end' : 'start', dx = anc === 'end' ? -(r(l.respostas) + 4) : r(l.respostas) + 4;
      // rótulos vão numa segunda camada para nenhum círculo ficar por cima do texto
      rotulos += '<text class="rot-ponto" x="' + (lx + dx) + '" y="' + (y(l.percentualTravados) + 4) + '" text-anchor="' + anc + '" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">' + churnEsc_(avalNomeCurto_(l.conselho)) + '</text>';
    }
  });
  return h + rotulos + '</svg>';
}
function churnRenderDesafio_(b5) {
  var c = b5.continuidade ? b5.continuidade.atual : null;
  var ant = b5.continuidade ? b5.continuidade.anterior : null;
  var h = '';
  if (c && c.base) {
    var travados = c.partes + c.naoVejo;
    var antTxt = ant && ant.pctTravados !== null ? String(ant.pctTravados).replace('.', ',') + '%' : null;
    var comp = antTxt === null || c.pctTravados === null ? 'sem período anterior para comparar' :
      (c.pctTravados > ant.pctTravados ? 'acima dos ' + antTxt + ' do período anterior' : (c.pctTravados < ant.pctTravados ? 'abaixo dos ' + antTxt + ' do período anterior' : 'igual ao período anterior'));
    h += '<div class="desafio-resumo"><span><b>' + String(c.pctTravados === null ? '-' : c.pctTravados).replace('.', ',') + '% se dizem travados</b> (' + travados + ' de ' + c.base + ' respostas), ' + comp + '.</span>' +
      '<span>Escuro: sentem evolução. Âmbar: em partes. Vermelho: não veem evolução.</span></div>';
  }
  h += desafioBarraHtml_(c);
  h += '<div class="desafio-dispersao">' + desafioDispersaoSvg_(b5.tabela) + '</div>';
  var semPres = b5.semPresenca || 0;
  if (semPres) h += '<p class="churn-nota">' + semPres + ' conselho' + (semPres === 1 ? '' : 's') + ' com respostas suficientes não aparece' + (semPres === 1 ? '' : 'm') + ' no gráfico por não ter presença apurada no mês.</p>';
  var acoes = b5.tabela.filter(function (l) { return l.fraseRevisao; }).slice(0, 3);
  if (acoes.length) {
    h += '<ul class="desafio-acoes">' + acoes.map(function (l) {
      return '<li><b>' + churnEsc_(l.fraseRevisao) + '</b>' + churnEsc_(avalNomeCurto_(l.conselho)) + ': ' + String(l.percentualTravados).replace('.', ',') + '% travados' +
        (l.presencaPercentual !== null ? ', presença de ' + String(l.presencaPercentual).replace('.', ',') + '%' : '') + (l.temaTravados ? '. Os travados falam de ' + churnEsc_(l.temaTravados).toLowerCase() : '') + '.</li>';
    }).join('') + '</ul>';
  }
  h += '<details class="aval-detalhe"><summary>Ver a tabela completa por conselho</summary>' +
    churnTabela_(['Conselho', 'CS', 'Respostas', 'Travados', 'Presença no mês', 'Ganhos na ata', 'Qualidade das trocas', 'Tema dos travados', 'Ação'],
      b5.tabela.map(function (l) {
        return [churnEsc_(l.conselho), churnEsc_(l.cs || '-'), churnEsc_(l.respostas), churnPct_(l.percentualTravados), churnPct_(l.presencaPercentual), churnPct_(l.ganhosPercentual), churnNum_(l.qualidadeMedia), churnEsc_(l.temaTravados || '-'), churnEsc_(l.fraseRevisao || '-')];
      })) + '</details>';
  document.getElementById('desafioTabela').innerHTML = h;
  document.getElementById('desafioFrases').innerHTML = b5.frases.map(function (t) { return '<div class="voz-insight">' + churnEsc_(t) + '</div>'; }).join('');
  document.getElementById('desafioAviso').textContent = b5.aviso;
}

function churnRenderVisitas_(v) {
  var f = v.c1.funil;
  var linha = function (rot, val) { return '<div class="churn-numero"><b>' + val + '</b><span class="rot">' + churnEsc_(rot) + '</span></div>'; };
  document.getElementById('visitasFunil').innerHTML = '<div class="churn-numeros">' +
    linha('Pedidos', f.pedidos) + linha('Visitados', f.visitados) + linha('Em acompanhamento', f.emAcompanhamento) + linha('Revertidos', f.revertidos) + linha('Perdidos', f.perdidos) +
    linha('Cobertura', churnPct_(f.cobertura)) + linha('Tempo médio até a visita (dias)', churnNum_(f.tempoMedioVisitaDias)) +
    linha('Retenção imediata', churnPct_(f.retencaoImediata)) + linha('Retenção em 30 dias', churnPct_(f.retencao30.pct)) + linha('Retenção em 90 dias', churnPct_(f.retencao90.pct)) +
    linha('Retenção em 180 dias', churnPct_(f.retencao180.pct)) + linha('MRR em risco', churnMoeda_(f.mrrEmRisco)) + linha('MRR preservado em 90 dias', churnMoeda_(f.mrrPreservado)) +
    linha('Tempo médio até novo risco (dias)', churnNum_(f.tempoMedioNovoRiscoDias)) + '</div>' +
    '<p class="churn-nota">Dentro da fidelidade a saída tem multa, então parte da reversão pode ser pela multa e não pela visita. Retenção imediata dentro da fidelidade: ' +
    churnPct_(f.retencaoImediataDentroFidelidade.pct) + ' (' + f.retencaoImediataDentroFidelidade.base + ' casos). Fora: ' + churnPct_(f.retencaoImediataForaFidelidade.pct) + ' (' + f.retencaoImediataForaFidelidade.base + ' casos). Em maturação em 180 dias: ' + f.retencao180.emMaturacao + ' visitas.</p>';
  document.getElementById('visitasEficacia').innerHTML = '<h3 class="churn-subtitulo">Eficácia por ação principal</h3>' +
    churnTabela_(['Ação principal', 'Visitas', 'Revertidos', 'Retenção em 90 dias', 'Base'], v.c1.eficaciaAcao.map(function (l) {
      return [churnEsc_(l.chave), churnEsc_(l.visitas), churnEsc_(l.revertidos), churnPct_(l.retencao90), churnEsc_(l.base90)];
    })) +
    '<h3 class="churn-subtitulo">Eficácia por causa raiz</h3>' +
    churnTabela_(['Causa raiz', 'Visitas', 'Revertidos', 'Retenção em 90 dias', 'Base'], v.c1.eficaciaCausa.map(function (l) {
      return [churnEsc_(l.chave), churnEsc_(l.visitas), churnEsc_(l.revertidos), churnPct_(l.retencao90), churnEsc_(l.base90)];
    }));
  document.getElementById('visitasCalibracao').innerHTML = '<h3 class="churn-subtitulo">Termômetro ao sair e resultado em 90 dias</h3>' +
    churnTabela_(['Termômetro', 'Retidos', 'Perdidos', 'Em maturação'], v.c1.calibracao.map(function (c) {
      return [churnEsc_(c.termometro), churnEsc_(c.retido), churnEsc_(c.perdido), churnEsc_(c.emMaturacao)];
    }));
  document.getElementById('visitasIev').innerHTML = '<h3 class="churn-subtitulo">Índice de Efetividade da Visita por safra</h3>' +
    churnTabela_(['Safra (mês da visita)', 'Visitas', 'IEV médio (0 a 6)', 'Situação'], v.c1.iev.map(function (s) {
      return [churnEsc_(s.safra), churnEsc_(s.visitas), churnNum_(s.iev), churnEsc_(s.status)];
    }));
  document.getElementById('visitasPerfil').innerHTML = [['Produto', v.c2.produto], ['Local', v.c2.local], ['Duração', v.c2.duracao], ['Quem visitou', v.c2.visitantes]].map(function (p) {
    return '<h3 class="churn-subtitulo">' + p[0] + '</h3>' + churnTabela_(['Faixa', 'Maturadas', 'Retenção em 90 dias', 'Dentro da fidelidade', 'Fora da fidelidade'], p[1].map(function (l) {
      return [churnEsc_(l.faixa), churnEsc_(l.maturadas), churnPct_(l.retencao90), churnPct_(l.dentroFidelidade), churnPct_(l.foraFidelidade)];
    }));
  }).join('');
  document.getElementById('visitasLista').innerHTML = churnTabela_(['Membro', 'CS', 'Etapa', 'Pedido', 'Visita', 'Dias até a visita', 'MRR', 'Ação principal', 'Causa raiz', 'Termômetro', 'Retenção em 90 dias', 'IEV', 'Monday'],
    v.c3.linhas.map(function (l) {
      return [churnEsc_(l.membro || '-'), churnEsc_(l.cs || '-'), churnEsc_(l.etapa), churnEsc_(churnDataBR_(l.dataPedido)), churnEsc_(churnDataBR_(l.dataVisita)), churnEsc_(l.diasAteVisita === null ? '-' : l.diasAteVisita), churnEsc_(churnMoeda_(l.mrr)),
        churnEsc_(l.acaoPrincipal || '-'), churnEsc_(l.causaRaiz || '-'), churnEsc_(l.termometro || '-'), churnEsc_(l.retido90), churnEsc_(l.iev === null ? 'em maturação' : l.iev),
        '<a href="' + churnEsc_(l.link) + '" target="_blank" rel="noopener">Abrir</a>'];
    })) + '<p class="churn-nota">' + v.c3.total + ' visitas no período. Uso interno da gestão, com nome do membro.</p>';
  document.getElementById('visitasCsv').href = ENDPOINT_VISITAS + '?ref=' + encodeURIComponent(v.ref) + '&formato=csv';
}

// ---- b3: melhorias ----
function churnRenderFatosMelhoria_(b3) {
  var topo = b3.etapaOrigemMaisApontada;
  document.getElementById('melhoriaFatos').innerHTML = '<p class="churn-nota">' +
    (topo ? 'Etapa de origem mais apontada: ' + churnEsc_(topo.etapa) + ' (' + topo.visitas + ' visitas). ' : 'Sem etapa de origem informada nas visitas. ') +
    (b3.respondidasEvitavel
      ? 'Em ' + b3.evitaveis + ' de ' + b3.respondidasEvitavel + ' visitas a causa era evitável; em ' + b3.identificaveisAntes + ' dava para identificar antes.'
      : 'As visitas ainda não registram etapa de origem nem causa evitável.') + '</p>';
}

function churnCarregarMelhorias_() {
  return fetchJSON_(ENDPOINT_MELHORIAS).then(function (d) {
    churnMelhorias_ = d;
    churnRenderMelhorias_();
  }).catch(function (err) {
    document.getElementById('melhoriaQuadro').innerHTML = '<div class="gestor-erro">Não foi possível carregar a fila de melhorias: ' + churnEsc_(err.message) + '</div>';
  });
}

function churnRotuloTema_(chave) {
  var t = churnVozDados_ && churnVozDados_.b2 && (churnVozDados_.b2.temas || []).filter(function (x) { return x.chave === chave; })[0];
  return t ? t.rotulo : chave || '-';
}

function churnRenderMelhorias_() {
  var d = churnMelhorias_;
  if (!d) return;
  // Sem melhoria ativa, o quadro inteiro vira uma linha em vez de quatro colunas vazias (K6)
  if (!d.ativas.length) {
    document.getElementById('melhoriaQuadro').innerHTML = '<p class="gestor-empty">Nenhuma melhoria registrada. Crie a primeira a partir de um motivo de saída acima.</p>';
    return;
  }
  var hoje = new Date().toISOString().slice(0, 10);
  var html = '<div class="voz-grid">';
  CHURN_STATUS_MELHORIA.forEach(function (c) {
    var itens = d.ativas.filter(function (m) { return m.status === c[0]; });
    html += '<div class="voz-col voz-col-' + c[0] + '"><div class="voz-col-head"><span>' + c[1] + '</span><span>' + itens.length + '</span></div>';
    if (!itens.length) html += '<div class="voz-col-vazio">Nada aqui.</div>';
    itens.sort(function (x, y) { return (x.prazo || '9999') < (y.prazo || '9999') ? -1 : 1; }).forEach(function (m) {
      var vencida = m.prazo && m.prazo < hoje && m.status !== 'realizado';
      var origem = m.origem === 'tema' ? 'Tema: ' + churnRotuloTema_(m.tema_chave) : 'Visita: ' + (m.etapa_origem || '-');
      html += '<div class="voz-card" data-id="' + churnEsc_(m.id) + '"><div class="voz-card-tags"><span class="voz-tag origem">' + churnEsc_(origem) + '</span></div>' +
        '<div class="voz-card-texto">' + churnEsc_(m.titulo) + '</div>' +
        '<div class="voz-card-meta">' + churnEsc_(m.responsavel || 'Sem responsável') + ' · prazo ' + (m.prazo ? '<span' + (vencida ? ' class="churn-vencida"' : '') + '>' + churnEsc_(churnDataBR_(m.prazo)) + '</span>' : 'não definido') + '</div>' +
        (m.observacao ? '<div class="voz-obs-lida">' + churnEsc_(m.observacao) + '</div>' : '') +
        '<div class="voz-card-acoes"><select class="pill-select" data-ch="status" aria-label="Status da melhoria">' +
        CHURN_STATUS_MELHORIA.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === m.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') +
        '</select><button type="button" class="voz-btn-link" data-ch="editar">Editar</button><button type="button" class="voz-btn-link" data-ch="excluir">Excluir</button></div></div>';
    });
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('melhoriaQuadro').innerHTML = html;
  var ex = d.excluidas;
  document.getElementById('melhoriaExcluidas').innerHTML = '<button type="button" class="churn-link" data-ch="verExcluidas">Excluídas (' + ex.length + ')</button>' +
    (churnMelhoriasExcluidasAbertas_ ? (ex.length ? ex.map(function (m) {
      return '<div class="voz-card" data-id="' + churnEsc_(m.id) + '"><div class="voz-card-texto">' + churnEsc_(m.titulo) + '</div><div class="voz-card-acoes"><button type="button" class="voz-btn-link" data-ch="restaurar">Restaurar</button></div></div>';
    }).join('') : '<p class="churn-nota">Nenhuma melhoria excluída.</p>') : '');
}

function churnTemaOpcoes_(sel) {
  var temas = (churnVozDados_ && churnVozDados_.b2 && churnVozDados_.b2.temas) || [];
  return temas.map(function (t) { return '<option value="' + churnEsc_(t.chave) + '"' + (t.chave === sel ? ' selected' : '') + '>' + churnEsc_(t.rotulo) + '</option>'; }).join('');
}

function churnAbrirFormMelhoria_(m, temaChave, temaRotulo) {
  var f = document.getElementById('melhoriaForm');
  var ed = m || {};
  churnMelhoriaId_ = ed.id || null;
  var origem = ed.origem || (temaChave ? 'tema' : 'visita');
  f.hidden = false;
  f.innerHTML = '<h3 class="churn-subtitulo">' + (ed.id ? 'Editar melhoria' : 'Nova melhoria') + '</h3>' +
    '<div class="churn-form">' +
    '<label>Título <input id="melhoriaTitulo" maxlength="160" value="' + churnEsc_(ed.titulo || (temaRotulo ? 'Melhorar: ' + temaRotulo : '')) + '"></label>' +
    '<label>Origem <select id="melhoriaOrigem"><option value="tema"' + (origem === 'tema' ? ' selected' : '') + '>Tema da voz do membro</option><option value="visita"' + (origem === 'visita' ? ' selected' : '') + '>Visita</option></select></label>' +
    '<label>Tema <select id="melhoriaTema">' + churnTemaOpcoes_(ed.tema_chave || temaChave) + '</select></label>' +
    '<label>Etapa de origem <select id="melhoriaEtapa">' + CHURN_ETAPAS_ORIGEM.map(function (e) { return '<option' + (e === ed.etapa_origem ? ' selected' : '') + '>' + churnEsc_(e) + '</option>'; }).join('') + '</select></label>' +
    '<label>Responsável <input id="melhoriaResp" maxlength="80" value="' + churnEsc_(ed.responsavel || '') + '"></label>' +
    '<label>Prazo <input type="date" id="melhoriaPrazo" value="' + churnEsc_(ed.prazo || '') + '"></label>' +
    '<label>Status <select id="melhoriaStatus">' + CHURN_STATUS_MELHORIA.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === (ed.status || 'backlog') ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
    '<label>Observação <textarea id="melhoriaObs" maxlength="600">' + churnEsc_(ed.observacao || '') + '</textarea></label>' +
    '</div><div class="churn-acoes"><button type="button" class="primario" id="melhoriaSalvar">Salvar melhoria</button><button type="button" id="melhoriaCancelar">Cancelar</button></div>' +
    '<p class="erro-msg" id="melhoriaErro"></p>';
  document.getElementById('melhoriaSalvar').addEventListener('click', function () { churnSalvarMelhoria_(null); });
  document.getElementById('melhoriaCancelar').addEventListener('click', function () { churnFecharFormMelhoria_(); });
}

function churnFecharFormMelhoria_() {
  var f = document.getElementById('melhoriaForm');
  f.hidden = true;
  f.innerHTML = '';
  churnMelhoriaId_ = null;
}

// Salva a melhoria pelo formulário, ou muda só o status de um cartão (sobrescrito por campos)
function churnSalvarMelhoria_(sobrescrever) {
  var erro = document.getElementById('melhoriaErro');
  var corpo;
  if (sobrescrever) {
    corpo = sobrescrever;
  } else {
    corpo = {
      titulo: document.getElementById('melhoriaTitulo').value.trim(),
      origem: document.getElementById('melhoriaOrigem').value,
      tema_chave: document.getElementById('melhoriaTema').value,
      etapa_origem: document.getElementById('melhoriaEtapa').value,
      responsavel: document.getElementById('melhoriaResp').value.trim(),
      prazo: document.getElementById('melhoriaPrazo').value || null,
      status: document.getElementById('melhoriaStatus').value,
      observacao: document.getElementById('melhoriaObs').value.trim(),
    };
    if (corpo.origem === 'tema') corpo.etapa_origem = null; else corpo.tema_chave = null;
  }
  corpo.acao = 'salvar';
  corpo.id = churnMelhoriaId_ || corpo.id || null;
  fetchJSON_(ENDPOINT_MELHORIAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    .then(function () { churnFecharFormMelhoria_(); return churnCarregarMelhorias_(); })
    .catch(function (err) { if (erro) erro.textContent = err.message; else alert(err.message); });
}

function churnAcaoMelhoria_(id, acao) {
  if (acao === 'excluir' && !confirm('Excluir esta melhoria? Ela sai da fila e pode ser restaurada depois.')) return;
  fetchJSON_(ENDPOINT_MELHORIAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: acao, id: id }) })
    .then(function () { return churnCarregarMelhorias_(); })
    .catch(function (err) { alert(err.message); });
}

function churnMelhoriaPorId_(id) {
  var todas = (churnMelhorias_ && churnMelhorias_.ativas) || [];
  for (var i = 0; i < todas.length; i++) if (todas[i].id === id) return todas[i];
  return null;
}

// Ligações dos blocos novos. Um único ouvinte no painel cuida dos botões e selects gerados.
function churnLigarBlocos_() {
  document.getElementById('recTalvez').addEventListener('change', function () {
    churnRecTalvez_ = this.checked; churnRecLimite_ = 8; churnCarregarReconquista_();
  });
  document.getElementById('melhoriaNova').addEventListener('click', function () { churnAbrirFormMelhoria_(null, '', ''); });
  var painel = document.getElementById('tab-churn');
  painel.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-ch]');
    if (!alvo) return;
    var acao = alvo.getAttribute('data-ch');
    if (acao === 'trechos') churnMostrarTrechos_(alvo.getAttribute('data-grupo'), alvo.getAttribute('data-tema'));
    else if (acao === 'recFiltro') { churnRecFiltro_ = alvo.getAttribute('data-filtro'); churnRecLimite_ = 8; churnRecEditando_ = null; churnRenderReconquista_(); }
    else if (acao === 'recEditar') { var idRec = Number(alvo.closest('.rcq-item').getAttribute('data-churn')); churnRecEditando_ = churnRecEditando_ === idRec ? null : idRec; churnRenderReconquista_(); }
    else if (acao === 'recMais') { churnRecLimite_ += 8; churnRenderReconquista_(); }
    else if (acao === 'recSalvar') churnSalvarReconquista_(alvo.closest('.rcq-item'));
    else if (acao === 'criarMelhoria') churnAbrirFormMelhoria_(null, alvo.getAttribute('data-tema'), alvo.getAttribute('data-rotulo'));
    else if (acao === 'verExcluidas') { churnMelhoriasExcluidasAbertas_ = !churnMelhoriasExcluidasAbertas_; churnRenderMelhorias_(); }
    else if (acao === 'excluir' || acao === 'restaurar' || acao === 'editar') {
      var card = alvo.closest('.voz-card');
      var id = card ? card.getAttribute('data-id') : null;
      if (acao === 'restaurar') churnAcaoMelhoria_(id, 'restaurar');
      else if (acao === 'excluir') churnAcaoMelhoria_(id, 'excluir');
      else { var m = churnMelhoriaPorId_(id); if (m) churnAbrirFormMelhoria_(m, '', ''); }
    }
  });
  painel.addEventListener('change', function (ev) {
    var alvo = ev.target;
    if (!alvo || alvo.getAttribute('data-ch') !== 'status') return;
    var m = churnMelhoriaPorId_(alvo.closest('.voz-card').getAttribute('data-id'));
    if (m) churnSalvarMelhoria_(Object.assign({}, m, { status: alvo.value, tema_chave: m.tema_chave, etapa_origem: m.etapa_origem, prazo: m.prazo, observacao: m.observacao, responsavel: m.responsavel }));
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
    churnLigarBlocos_();
    carregarChurn();
  } catch (err) {
    console.error('Erro ao iniciar Churn:', err);
    churnErroEm_(['churnA1', 'churnNumeros', 'churnGrafico'].concat(CHURN_IDS_VOZ_, CHURN_IDS_VISITAS_, ['melhoriaQuadro']), err);
  }
}


// ============ NPS dos conselhos (08/10/2026) ============
// Aba própria para o board de NPS, separada do churn. Reaproveita os renderizadores das notas
// (churnRenderNotas_) e do desafio (churnRenderDesafio_), que escrevem nos mesmos ids, agora dentro
// desta aba. Filtros próprios de mês e CS; a lista de CS vem do próprio NPS (CS do título do conselho).
var npsCarregado_ = false;
var npsReq_ = 0;
var npsDados_ = null;
var npsCsMontado_ = false;
var NPS_IDS_ = ['notasDimensoes', 'desafioTabela', 'npsSugestoes'];
function npsPopularRef_() {
  var sel = document.getElementById('npsRef');
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
}
function npsMontarCs_(lista) {
  if (npsCsMontado_) return;
  npsCsMontado_ = true;
  var sel = document.getElementById('npsCs');
  (lista || []).forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}
function npsRenderSugestoes_(sg) {
  document.getElementById('npsSugestoes').innerHTML = '<div class="saida-grade dupla">' +
    temasColunaHtml_({ rotulo: 'Sobre o conselho', pergunta: 'Sugestões deixadas depois do encontro', ranking: sg.conselho.ranking, insights: sg.conselho.insights, rodape: sg.conselho.rodape }, 'nps', 'conselho', false) +
    temasColunaHtml_({ rotulo: 'Sobre o CS', pergunta: 'Como avalia o CS', ranking: sg.cs.ranking, insights: sg.cs.insights, rodape: sg.cs.rodape }, 'nps', 'cs', false) +
    '</div>';
  document.getElementById('npsTrechos').innerHTML = '';
}
function npsMostrarTrechos_(grupo, chave) {
  if (!npsDados_) return;
  var g = npsDados_.sugestoes[grupo];
  var tema = g.ranking.filter(function (l) { return l.chave === chave; })[0];
  var el = document.getElementById('npsTrechos');
  el.innerHTML = trechosHtml_((grupo === 'cs' ? 'Sobre o CS' : 'Sobre o conselho') + ': ' + (tema ? tema.rotulo : '') + ', trechos anonimizados', (g.trechos || {})[chave] || []);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function carregarNps_() {
  var minha = ++npsReq_;
  var ref = document.getElementById('npsRef').value;
  var cs = document.getElementById('npsCs').value;
  NPS_IDS_.forEach(function (id) { document.getElementById(id).innerHTML = '<div class="gestor-empty">Carregando…</div>'; });
  ['notasConselhos', 'notasJustificativas', 'desafioFrases', 'desafioAviso', 'npsTrechos', 'npsBase'].forEach(function (id) { document.getElementById(id).innerHTML = ''; });
  fetchJSON_(ENDPOINT_NPS_CONSELHOS + '?ref=' + encodeURIComponent(ref) + '&cs=' + encodeURIComponent(cs) + '&janela=' + encodeURIComponent(NPS_JANELA_)).then(function (d) {
    if (minha !== npsReq_) return;
    npsDados_ = d;
    npsMontarCs_(d.csDisponiveis);
    npsRenderTextosPeriodo_(d, ref);
    npsRenderCobertura_(d.sugestoes.cobertura, ref);
    churnRenderSeguro_(['notasDimensoes'], function () { churnRenderNotas_(d.b4); });
    churnRenderSeguro_(['desafioTabela'], function () { churnRenderDesafio_(d.b5); });
    churnRenderSeguro_(['npsSugestoes'], function () { npsRenderSugestoes_(d.sugestoes); });
  }).catch(function (err) {
    if (minha !== npsReq_) return;
    churnErroEm_(NPS_IDS_, err);
  });
}
var npsRosterAtual_ = [];
var npsPendentesAtual_ = [];
function carregarNpsAliasesPendentes_() {
  fetchJSON_('/api/gestor/nps/aliases-pendentes').then(function (d) {
    npsRosterAtual_ = d.roster || [];
    npsPendentesAtual_ = d.pendentes || [];
    renderNpsAliasesPendentes_();
  }).catch(function () { /* bloco opcional nesta aba: sem a lista, nada aparece e o resto da aba segue */ });
}
function renderNpsAliasesPendentes_() {
  var bloco = document.getElementById('npsAliasesPendentesBlock');
  var lista = npsPendentesAtual_;
  bloco.style.display = lista.length ? 'block' : 'none';
  if (!lista.length) return;
  var opcoes = '<option value="">Selecionar do roster…</option>' +
    npsRosterAtual_.map(function (g) { return '<option value="' + escCS_(g.groupId) + '">' + escCS_(g.titulo) + '</option>'; }).join('');
  document.getElementById('npsAliasesPendentesList').innerHTML = lista.map(function (p, idx) {
    var sugestao = p.groupIdSugerido
      ? '<div class="resolver-sub">Sugestão automática: ' + escCS_(p.nomeGrupoSugerido || p.groupIdSugerido) + '</div>'
      : '<div class="resolver-sub">Sem sugestão automática, escolha manualmente.</div>';
    return '<div class="resolver-card"><div class="resolver-head"><div><span class="resolver-nome-raw">' + escCS_(p.conselhoRaw) + '</span>' + sugestao + '</div></div>' +
      '<div class="resolver-linha"><select class="resolver-select" id="npsAliasSelect' + idx + '">' + opcoes + '</select>' +
      '<button class="resolver-btn" id="npsAliasBtn' + idx + '" type="button" onclick="confirmarNpsAlias(' + idx + ')">Confirmar</button></div>' +
      '<div class="resolver-status" id="npsAliasStatus' + idx + '"></div></div>';
  }).join('');
  lista.forEach(function (p, idx) {
    var sel = document.getElementById('npsAliasSelect' + idx);
    if (sel && p.groupIdSugerido) sel.value = p.groupIdSugerido;
  });
}
function confirmarNpsAlias(idx) {
  var p = npsPendentesAtual_[idx];
  var sel = document.getElementById('npsAliasSelect' + idx);
  var btn = document.getElementById('npsAliasBtn' + idx);
  var status = document.getElementById('npsAliasStatus' + idx);
  var groupId = sel ? sel.value : '';
  if (!groupId) { status.textContent = 'Escolha um conselho do roster.'; status.className = 'resolver-status erro'; return; }
  btn.disabled = true; status.textContent = 'Confirmando…'; status.className = 'resolver-status';
  fetchJSON_('/api/gestor/nps/aliases-pendentes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conselhoRaw: p.conselhoRaw, groupId: groupId }),
  }).then(function () {
    npsPendentesAtual_ = npsPendentesAtual_.filter(function (x) { return x.conselhoRaw !== p.conselhoRaw; });
    renderNpsAliasesPendentes_();
  }).catch(function (err) {
    btn.disabled = false;
    status.textContent = 'Erro: ' + err.message;
    status.className = 'resolver-status erro';
  });
}
// O arquivo baixado é autônomo: o seletor só escolhe qual relatório baixar.
function iniciarRelatorioMensal_() {
  var sel = document.getElementById('selMesRelatorio');
  if (!sel || sel.options.length) return;
  var optGeral = document.createElement('option'); optGeral.textContent = 'Visão Geral'; sel.appendChild(optGeral);
  MESES_GESTOR.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; sel.appendChild(o); });
  var agora = new Date();
  sel.value = MESES_GESTOR[agora.getMonth()];
  document.getElementById('selAnoRelatorio').value = String(agora.getFullYear());
}
function urlRelatorioMensal_(preview) {
  var mes = document.getElementById('selMesRelatorio').value;
  var ano = document.getElementById('selAnoRelatorio').value;
  return '/api/gestor/relatorio-mensal?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano) + (preview ? '&preview=1' : '');
}
function preVisualizarRelatorioMensal() { window.open(urlRelatorioMensal_(true), '_blank'); }
function baixarRelatorioMensal() { window.open(urlRelatorioMensal_(false), '_blank'); }
function inicializarNps_() {
  try {
    carregarNpsAliasesPendentes_();
    iniciarRelatorioMensal_();
    npsPopularRef_();
    document.getElementById('npsRef').addEventListener('change', carregarNps_);
    document.getElementById('npsCs').addEventListener('change', carregarNps_);
    document.getElementById('tab-nps').addEventListener('click', function (ev) {
      var alvo = ev.target.closest('[data-nps="trechos"]');
      if (alvo) npsMostrarTrechos_(alvo.getAttribute('data-grupo'), alvo.getAttribute('data-tema'));
      if (ev.target.closest('[data-nps="cobertura"]')) npsAbrirCobertura_();
      var jan = ev.target.closest('[data-janela]');
      if (jan) {
        NPS_JANELA_ = jan.getAttribute('data-janela');
        document.querySelectorAll('#npsJanela .toggle-btn').forEach(function (b) { b.classList.toggle('active', b === jan); });
        carregarNps_();
      }
    });
    carregarNps_();
  } catch (err) {
    console.error('Erro ao iniciar NPS dos conselhos:', err);
    churnErroEm_(NPS_IDS_, err);
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


// ============ Fila da liderança (08/10/2026) ============
// Compromissos nominais da liderança, de todas as 1:1, em quadro de status (os mesmos status da Voz).
// Vem de /api/gestor/lideranca já ordenado: vencidos primeiro. Também lista as gravações do Granola
// sem CS identificado, para o gestor vincular ou ignorar. Nada aqui é anônimo.
var filaDados_ = null;
var filaReq_ = 0;
function inicializarFila_() {
  var painel = document.getElementById('filaLideranca');
  painel.addEventListener('change', function (ev) {
    var alvo = ev.target;
    if (!alvo || !alvo.getAttribute) return;
    var tipo = alvo.getAttribute('data-fila');
    if (tipo === 'status') filaAcao_({ acao: 'status', id: alvo.getAttribute('data-id'), status: alvo.value });
    else if (tipo === 'filtro') renderFila_();
  });
  painel.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-fila]');
    if (!b) return;
    var acao = b.getAttribute('data-fila'), id = b.getAttribute('data-id');
    if (acao === 'vincular') {
      var sel = document.getElementById('gsel_' + id);
      if (!sel.value) { filaMensagem_('Escolha o CS antes de vincular esta gravação.'); return; }
      filaAcao_({ acao: 'vincular_granola', noteId: id, cs: sel.value });
    } else if (acao === 'ignorar') {
      filaAcao_({ acao: 'vincular_granola', noteId: id, cs: null });
    } else if (acao === 'expandir-granola') {
      var lista = document.getElementById('filaGranola');
      lista.hidden = !lista.hidden;
    }
  });
  carregarFila_();
}
function filaMensagem_(texto) {
  var m = document.getElementById('filaMsg');
  m.hidden = !texto;
  m.textContent = texto || '';
}
function filaData_(iso) {
  var p = String(iso || '').slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : 'sem data';
}
function filaDataHora_(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'sem data';
}
function filaFetch_(url, opts) {
  opts = opts || {};
  opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    return res.json().then(function (d) {
      if (!res.ok) throw new Error(d.error || ('Erro ' + res.status));
      return d;
    });
  });
}
function carregarFila_() {
  var req = ++filaReq_;
  filaFetch_('/api/gestor/lideranca').then(function (d) {
    if (req !== filaReq_) return;
    filaDados_ = d;
    renderFila_();
  }).catch(function (err) {
    document.getElementById('filaResumo').innerHTML = '<div class="gestor-erro">Não foi possível carregar esta seção: ' + pulsoEsc_(err.message) + '.</div>';
  });
}
function filaAcao_(corpo) {
  filaMensagem_('');
  filaFetch_('/api/gestor/lideranca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    .then(carregarFila_)
    .catch(function (err) { filaMensagem_('Erro: ' + err.message); });
}
function filaCardHtml_(i, d) {
  var meta = '';
  if (i.prioridade === 'alta') meta += '<span style="color:#C89A2E;font-weight:700;">Prioridade alta</span> ';
  if (i.prazo) {
    meta += i.vencido
      ? '<span style="color:#C0433D;font-weight:700;">vencido há ' + i.diasVencido + (i.diasVencido === 1 ? ' dia' : ' dias') + '</span> '
      : '<span>prazo ' + filaData_(i.prazo) + '</span> ';
  }
  var opcoes = d.statusOpcoes.map(function (s) {
    return '<option value="' + s.chave + '"' + (s.chave === i.status ? ' selected' : '') + '>' + pulsoEsc_(s.rotulo) + '</option>';
  }).join('');
  return '<div class="voz-card">'
    + '<div class="voz-card-tags"><span class="voz-tag origem">' + pulsoEsc_(i.csNome) + '</span>'
    + (i.visibilidade === 'privado_gestor' ? '<span class="voz-tag">Só a liderança</span>' : '') + '</div>'
    + '<div class="voz-card-texto">' + pulsoEsc_(i.texto) + '</div>'
    + '<div class="voz-card-meta">' + meta + '<br>1:1 de ' + filaData_(i.dataOrigem) + ' · <a href="/gestor/cs/' + encodeURIComponent(i.csNome) + '#secUmAUm">Abrir 1:1</a></div>'
    + '<div class="voz-card-acoes" style="margin-top:8px;"><select class="pill-select" data-fila="status" data-id="' + pulsoEsc_(i.id) + '" aria-label="Status do compromisso">' + opcoes + '</select></div>'
    + '</div>';
}
function renderFila_() {
  var d = filaDados_;
  if (!d) return;
  var csSel = document.getElementById('filaCs');
  if (!csSel.options.length) {
    var todos = document.createElement('option'); todos.value = ''; todos.textContent = 'Todos os CS'; csSel.appendChild(todos);
    d.csOpcoes.forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = n; csSel.appendChild(o); });
  }
  var csAtual = csSel.value, prioAtual = document.getElementById('filaPrio').value;
  var r = d.resumo;
  document.getElementById('filaResumo').innerHTML = '<p class="pulso-aviso">' + (r.liderancaAbertos === 0
    ? 'Nenhum compromisso da liderança em aberto.'
    : r.liderancaAbertos + (r.liderancaAbertos === 1 ? ' compromisso aberto' : ' compromissos abertos') + ' · ' + r.liderancaVencidos + ' vencidos · ' + r.prioridadeAlta + ' de prioridade alta') + '</p>';

  var pend = d.granolaPendentes || [];
  var csOpts = d.csOpcoes.map(function (n) { return '<option value="' + pulsoEsc_(n) + '">' + pulsoEsc_(n) + '</option>'; }).join('');
  document.getElementById('filaGranolaBloco').innerHTML = pend.length
    ? '<div class="pulso-aviso" style="margin-top:12px;">' + pend.length + (pend.length === 1 ? ' gravação do Granola sem CS identificado' : ' gravações do Granola sem CS identificado')
      + ' <button class="pill-select" data-fila="expandir-granola">Ver</button></div>'
      + '<div id="filaGranola" hidden>' + pend.map(function (g) {
        return '<div class="voz-card"><div class="voz-card-texto">' + filaDataHora_(g.dataReuniao) + ' · ' + pulsoEsc_(g.titulo || 'Sem título') + '</div>'
          + '<div class="voz-card-acoes" style="margin-top:8px;">'
          + '<select class="pill-select" id="gsel_' + pulsoEsc_(g.noteId) + '" aria-label="CS da gravação"><option value="">Escolher CS</option>' + csOpts + '</select> '
          + '<button class="pill-select" data-fila="vincular" data-id="' + pulsoEsc_(g.noteId) + '">Vincular</button> '
          + '<button class="pill-select" data-fila="ignorar" data-id="' + pulsoEsc_(g.noteId) + '">Ignorar</button>'
          + (g.webUrl ? ' <a href="' + pulsoEsc_(g.webUrl) + '" target="_blank" rel="noopener">Abrir no Granola</a>' : '')
          + '</div></div>';
      }).join('') + '</div>'
    : '';

  var filtrados = d.itens.filter(function (i) {
    return (!csAtual || i.csNome === csAtual) && (!prioAtual || i.prioridade === prioAtual);
  });
  var html = '<div class="voz-grid">';
  d.statusOpcoes.forEach(function (st) {
    var daColuna = filtrados.filter(function (i) { return i.status === st.chave; });
    html += '<div class="voz-col voz-col-' + st.chave + '"><div class="voz-col-head"><span>' + pulsoEsc_(st.rotulo) + '</span><span>' + daColuna.length + '</span></div>';
    if (!daColuna.length) html += '<div class="voz-col-vazio">Nada aqui' + (filtrados.length !== d.itens.length ? ' com os filtros atuais' : '') + '.</div>';
    daColuna.forEach(function (i) { html += filaCardHtml_(i, d); });
    html += '</div>';
  });
  document.getElementById('filaQuadro').innerHTML = html + '</div>';
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
var vozMostrarExcluidas_ = false;

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
  h += '</select><button type="button" class="voz-btn-link" data-acao="obs">' + (i.observacao ? 'Editar observação' : 'Observação') + '</button>' +
    '<button type="button" class="voz-btn-link" data-acao="excluir">Excluir</button></div>';
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
  h += vozExcluidasHtml_(d.excluidas || []);
  el.innerHTML = h;
}
function vozExcluidasHtml_(lista) {
  var h = '<div class="voz-excluidas"><button type="button" class="voz-btn-link" data-acao="verExcluidas">Excluídas (' + lista.length + ')</button>';
  if (!vozMostrarExcluidas_) return h + '</div>';
  if (lista.length === 0) return h + '<div class="voz-col-vazio">Nenhuma sugestão excluída.</div></div>';
  lista.forEach(function (e) {
    h += '<div class="voz-card" data-id="' + pulsoEsc_(e.id) + '"><div class="voz-card-tags"><span class="voz-tag origem">' + pulsoEsc_(e.campoRotulo) + '</span><span class="voz-tag">' + pulsoEsc_(e.mes) + '</span></div>' +
      '<div class="voz-card-texto">' + pulsoEsc_(e.texto) + '</div>' +
      '<div class="voz-card-acoes"><button type="button" class="voz-btn-link" data-acao="restaurar">Restaurar</button></div></div>';
  });
  return h + '</div>';
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
function vozAcaoExclusao_(id, acao) {
  delete vozErroCard_[id];
  return fetchJSON_('/api/gestor/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, acao: acao }) })
    .then(function () { return carregarVoz_(true); })
    .catch(function (err) { vozErroCard_[id] = 'Não foi possível ' + (acao === 'excluir' ? 'excluir' : 'restaurar') + ': ' + err.message; renderVoz_(); });
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
    else if (acao === 'excluir') {
      if (!confirm('Excluir esta sugestão? Ela some do quadro e dos números, e pode ser restaurada depois.')) return;
      vozAcaoExclusao_(alvo.closest('.voz-card').getAttribute('data-id'), 'excluir');
    }
    else if (acao === 'restaurar') { vozAcaoExclusao_(alvo.closest('.voz-card').getAttribute('data-id'), 'restaurar'); }
    else if (acao === 'verExcluidas') { vozMostrarExcluidas_ = !vozMostrarExcluidas_; renderVoz_(); }
    else if (acao === 'salvarObs') {
      var card = alvo.closest('.voz-card');
      var statusAtual = card.querySelector('select[data-acao="status"]').value;
      vozSalvar_(card.getAttribute('data-id'), statusAtual, card.querySelector('textarea').value);
    }
  });
  carregarVoz_(false);
}

carregarVisaoGeral();
carregarComplementos_();
carregarAcoes();

// Aba inicial: ?aba=<chave> (links do dock e links compartilhados) ou o link antigo /gestor#churn.
(function abaInicial_() {
  var q = new URLSearchParams(window.location.search);
  var aba = q.get('aba');
  var antigoChurn = window.location.hash === '#churn' || q.has('granularidade');
  if (!aba && antigoChurn) aba = 'churn';
  abrirAba(aba || 'visaoGeral', { semUrl: !aba });
  if (window.location.hash === '#rede-conselhos') {
    abrirRedeDetalhe_(true);
    var alvo = document.getElementById('rede-conselhos');
    if (alvo) alvo.scrollIntoView({ block: 'start' });
  }
})();
`;
