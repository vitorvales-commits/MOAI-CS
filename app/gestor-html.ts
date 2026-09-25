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
.lista-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--cinza-linha);}
.lista-item:last-child{border-bottom:none;}
.lista-item-nome{font-size:13px;font-weight:600;}
.lista-item-sub{font-size:11px;color:var(--cinza-apoio);}
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

footer.footnote{margin-top:60px;padding-top:20px;border-top:1px solid var(--cinza-linha);font-size:11.5px;color:var(--cinza-apoio);}

@media (max-width:640px){
  .hero{padding:38px 24px 34px;} .hero h1{font-size:26px;} .hero-stats{gap:26px;}
  .rank-row{grid-template-columns:24px 1fr 44px;} .rank-bar-wrap{display:none;}
  .form-inline{flex-direction:column;}
  .kanban-grid{grid-template-columns:1fr;}
  .rede-stats{flex-direction:column;align-items:stretch;}
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
      <span class="pill" id="pillMes"></span>
      <span class="pill">Acesso restrito a gestores</span>
    </div>
  </header>

  <div class="tabs">
    <button class="tab-btn active" data-tab="visaoGeral">Visão geral</button>
    <button class="tab-btn" data-tab="controlePerfis">Controle de perfis</button>
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
        <h2>Ranking ponderado</h2>
        <p>Pontuação única por CS (score real, já calculado no servidor), só com valor calculado.</p>
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
        <table>
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
        <h3>CS ativos</h3>
        <div id="listaCS"></div>
      </div>
      <div class="perfis-card">
        <h3 id="tituloNaoVinculados">Detectados, ainda não vinculados</h3>
        <p class="sync-desc">Nomes de CS encontrados nos dados do Monday (conselheiros, rounds, cases, upsell/downsell, churn) que ainda não têm perfil em "CS ativos". Clique em "Vincular" para criar o perfil.</p>
        <div id="listaNaoVinculados"></div>
      </div>
    </div>
  </div>

  <footer class="footnote">Visão restrita a gestores · valores calculados pelo sistema, sem a máscara do autodeclarado.</footer>
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

// ============ tabs ============

document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'controlePerfis') { carregarGestores(); carregarCSRoster(); }
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
  document.getElementById('pillMes').textContent = DADOS.periodo.geral ? ('Visão Geral · ' + DADOS.periodo.ano) : (DADOS.periodo.mes + '/' + DADOS.periodo.ano);
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
    return '<div class="rank-row"><span class="rank-pos">' + (i + 1) + '</span>'
      + '<div class="rank-name-wrap"><span class="status-dot" style="background:' + status.cor + '"></span><span class="rank-name">' + r.nome + '</span></div>'
      + '<div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:' + pct.toFixed(0) + '%"></div></div></div>'
      + '<span class="rank-score">' + (r.scoreReal === null || r.scoreReal === undefined ? '—' : r.scoreReal) + '</span></div>';
  }).join('');
}

function renderRadares() {
  var el = document.getElementById('radarGrid');
  el.innerHTML = '';
  DADOS.porCS.forEach(function (cs, idx) {
    var status = classificarScore(cs.scoreReal);
    var card = document.createElement('div'); card.className = 'radar-card';
    card.innerHTML = '<div class="radar-card-head"><span class="radar-card-name">' + cs.nome + '</span><span class="radar-card-score" style="color:' + status.cor + '">' + (cs.scoreReal === null || cs.scoreReal === undefined ? '—' : cs.scoreReal) + '</span></div>'
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
    body.innerHTML += '<tr><td class="name">' + cs.nome + '</td>' + celulas + '<td class="num" style="color:' + status.cor + ';font-weight:700;">' + (cs.scoreReal === null || cs.scoreReal === undefined ? '—' : cs.scoreReal) + '</td></tr>';
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

function statusConselhoLabel(c) {
  if (c.congelado) return 'Congelado';
  if (c.atencao) return 'Em atenção';
  return '—';
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
      var presenca = (c.presenca && c.presenca.taxa !== null && c.presenca.taxa !== undefined) ? (c.presenca.taxa + '%') : '—';
      return '<tr><td class="name">' + (c.conselheiro || '—') + '</td><td>' + (c.nivel || '—') + '</td>'
        + '<td class="num">' + c.membros + '</td><td class="num">' + presenca + '</td><td>' + statusConselhoLabel(c) + '</td></tr>';
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

function carregarVisaoGeral() {
  fetchJSON_(ENDPOINT_VISAO_GERAL + '?mes=' + encodeURIComponent(mesAtual) + '&ano=' + encodeURIComponent(anoAtual)).then(function (data) {
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

var MESES_GESTOR = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var agoraGestor = new Date();
var mesAtual = MESES_GESTOR[agoraGestor.getMonth()];
var anoAtual = agoraGestor.getFullYear();

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

function renderCSRoster(lista) {
  var el = document.getElementById('listaCS');
  if (!lista.length) { el.innerHTML = '<div class="gestor-empty">Nenhum CS cadastrado.</div>'; return; }
  el.innerHTML = lista.map(function (c) {
    var checked = c.ativo ? 'checked' : '';
    return '<div class="lista-item"><div><div class="lista-item-nome">' + c.nome + '</div><div class="lista-item-sub">' + c.nomeCompleto + '</div></div>'
      + '<label class="switch"><input type="checkbox" ' + checked + ' data-nome="' + c.nome + '"><span class="switch-track"></span></label></div>';
  }).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(function (chk) {
    chk.addEventListener('change', function () {
      var nome = chk.dataset.nome, novoAtivo = chk.checked;
      fetchJSON_(ENDPOINT_CS_ROSTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, ativo: novoAtivo }) })
        .then(function (data) { renderCSRoster(data.roster || []); })
        .catch(function (err) { chk.checked = !novoAtivo; window.alert('Não foi possível alterar: ' + err.message); });
    });
  });
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

carregarVisaoGeral();
`;
