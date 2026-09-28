// Relatório mensal de Conselhos Estratégicos (Parte G, pedido do Vitor, 28/09/2026) — página HTML
// autônoma (sem chamada nenhuma pro app depois de baixada: todo dado já vem embutido no próprio
// arquivo, igual moai_talks_relatorio_1.html, que o Vitor mandou como referência visual). Mesma
// paleta escura, tipografia (Manrope), reveal-on-scroll, contadores animados e o elemento
// "constelação" de NPS — adaptados pra um relatório de MÊS (vários conselhos, três eixos de NPS:
// conselheiro/conselho/CS) em vez de um evento único. As seções Financeiro/DRE e R360 do MOAI
// Talks não se aplicam aqui (não fazem parte do pedido da Parte G) e ficam de fora.
import type { RelatorioMensal } from './reports';

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function tituloPeriodo(dados: RelatorioMensal): string {
  return dados.periodo.geral ? `Visão Geral · ${dados.periodo.ano}` : `${dados.periodo.mes} de ${dados.periodo.ano}`;
}

export function gerarRelatorioMensalHtml(dados: RelatorioMensal): string {
  const dadosJson = JSON.stringify(dados).replace(/</g, '\\u003c');
  const periodoTexto = tituloPeriodo(dados);
  const scoreConselho = dados.nps.geral.conselho.score;
  const scoreTexto = scoreConselho === null ? '—' : (scoreConselho > 0 ? '+' : '') + scoreConselho;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório Mensal · Conselhos Estratégicos · ${esc(periodoTexto)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#F4F4F4; --ink-dim:#ADAEA5; --ink-faint:#7A7B75;
    --bg:#141414; --bg-2:#1C1C1C; --bg-3:#222222; --card:#1D1D1D; --card-border:rgba(244,244,244,0.08);
    --teal:#00A58D; --teal-soft:rgba(0,165,141,0.14); --graphite:#3D3D3D;
    --blue:#1D5DB0; --terracotta:#D56C48; --warmgray:#ADAEA5;
    --radius:20px; --ease: cubic-bezier(.16,1,.3,1);
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  html{scroll-behavior:smooth;}
  body{ background:var(--bg); color:var(--ink); font-family:'Manrope', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; line-height:1.5; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
  ::selection{ background:var(--teal); color:#0A0A0A; }
  svg.icon{ width:15px; height:15px; flex-shrink:0; stroke:currentColor; fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }

  .progress{ position:fixed; top:0; left:0; height:2px; width:0%; background:var(--teal); z-index:100; transition: width 80ms linear; }

  nav{ position:fixed; top:0; left:0; right:0; z-index:90; display:flex; align-items:center; justify-content:space-between; padding:20px clamp(20px,5vw,64px); background:rgba(20,20,20,0.55); backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%); border-bottom:1px solid var(--card-border); transform:translateY(-100%); transition: transform 420ms var(--ease); }
  nav.visible{ transform:translateY(0); }
  .nav-brand{ display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:-0.01em; font-size:15px;}
  .nav-brand .dot{ width:7px; height:7px; border-radius:50%; background:var(--teal); box-shadow:0 0 12px var(--teal);}
  .nav-links{ display:flex; gap:28px; font-size:13px; color:var(--ink-dim); }
  .nav-links a{ color:inherit; text-decoration:none; transition:color 220ms var(--ease); }
  .nav-links a:hover{ color:var(--ink); }
  @media (max-width:820px){ .nav-links{ display:none; } }

  section{ position:relative; padding:120px clamp(20px,6vw,80px); max-width:1180px; margin:0 auto; }

  .reveal{ opacity:0; transform:translateY(28px); transition:opacity 700ms var(--ease), transform 700ms var(--ease); }
  .reveal.in{ opacity:1; transform:translateY(0); }

  .hero{ min-height:90svh; display:flex; flex-direction:column; justify-content:center; padding:140px clamp(20px,6vw,80px) 80px; position:relative; overflow:visible; }
  .hero::before{ content:''; position:absolute; top:-15%; right:-12%; width:78vw; height:78vw; max-width:1000px; max-height:1000px; background:radial-gradient(circle at 55% 45%, rgba(0,165,141,0.4), rgba(0,165,141,0.16) 32%, rgba(0,165,141,0.05) 52%, transparent 72%); pointer-events:none; z-index:0; }
  .hero > *{ position:relative; z-index:1; }
  .eyebrow{ display:inline-flex; align-items:center; gap:8px; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:var(--teal); font-weight:700; margin-bottom:24px; }
  .eyebrow::before{ content:''; width:16px; height:1px; background:var(--teal); }
  h1.display{ font-size:clamp(2.4rem, 6vw, 4.8rem); font-weight:300; letter-spacing:-0.03em; line-height:1.02; max-width:920px; }
  h1.display b{ font-weight:800; color:var(--ink); }
  .hero-sub{ margin-top:26px; font-size:clamp(15px,1.6vw,18px); color:var(--ink-dim); max-width:600px; font-weight:400; }
  .hero-meta{ display:flex; flex-wrap:wrap; gap:14px; margin-top:40px; }
  .pill{ padding:9px 16px; border-radius:100px; font-size:13px; color:var(--ink-dim); border:1px solid var(--card-border); background:rgba(255,255,255,0.02); display:flex; align-items:center; gap:9px; }
  .pill b{ color:var(--ink); font-weight:700; }
  .hero-result{ margin-top:64px; display:flex; align-items:flex-end; gap:40px; flex-wrap:wrap; }
  .result-number{ font-size:clamp(3.2rem,8vw,6.4rem); font-weight:800; letter-spacing:-0.035em; color:var(--teal); line-height:0.9; }
  .result-label{ font-size:14px; color:var(--ink-dim); max-width:260px; padding-bottom:10px; }

  .sec-head{ margin-bottom:56px; }
  .sec-index{ font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:var(--teal); font-weight:700; margin-bottom:14px; }
  .sec-title{ font-size:clamp(1.8rem,3.4vw,2.6rem); font-weight:300; letter-spacing:-0.02em; max-width:680px; }
  .sec-title b{ font-weight:800; }
  .sec-desc{ margin-top:14px; color:var(--ink-dim); max-width:600px; font-size:15px; }

  .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--card-border); border:1px solid var(--card-border); border-radius:var(--radius); overflow:hidden; }
  @media (max-width:860px){ .stat-grid{ grid-template-columns:repeat(2,1fr); } }
  .stat-cell{ background:var(--card); padding:32px 24px; }
  .stat-num{ font-size:clamp(1.8rem,3vw,2.4rem); font-weight:800; letter-spacing:-0.02em; }
  .stat-label{ margin-top:8px; font-size:12.5px; color:var(--ink-dim); }

  .dim-toggle{ display:inline-flex; gap:4px; padding:4px; border-radius:100px; background:var(--card); border:1px solid var(--card-border); margin-bottom:32px; }
  .dim-btn{ font-family:'Manrope',sans-serif; font-size:12.5px; font-weight:700; padding:8px 16px; border-radius:100px; border:none; background:transparent; color:var(--ink-dim); cursor:pointer; transition:background 220ms var(--ease), color 220ms var(--ease); }
  .dim-btn.active{ background:var(--teal); color:#04211c; }

  .nps-wrap{ display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
  @media (max-width:900px){ .nps-wrap{ grid-template-columns:1fr; gap:48px; } }
  .constellation{ position:relative; aspect-ratio:1; width:100%; max-width:460px; margin:0 auto; }
  .constellation svg{ width:100%; height:100%; overflow:visible; }
  .const-node{ cursor:pointer; transition:r 220ms var(--ease), opacity 400ms var(--ease); opacity:0; }
  .const-node.show{ opacity:1; }
  .const-ring{ fill:none; stroke:var(--card-border); stroke-width:1; }
  .const-tooltip{ position:fixed; pointer-events:none; z-index:200; background:#0E0E0E; border:1px solid var(--card-border); border-radius:12px; padding:12px 14px; font-size:12.5px; max-width:240px; line-height:1.5; opacity:0; transform:translate(-50%,-120%) scale(0.95); transition:opacity 180ms ease, transform 180ms ease; box-shadow:0 20px 40px rgba(0,0,0,0.5); }
  .const-tooltip.show{ opacity:1; transform:translate(-50%,-130%) scale(1); }
  .const-tooltip .name{ font-weight:700; margin-bottom:2px; }
  .const-tooltip .score{ color:var(--teal); font-weight:800; }
  .const-legend{ display:flex; gap:18px; justify-content:center; margin-top:24px; flex-wrap:wrap;}
  .leg-item{ display:flex; align-items:center; gap:7px; font-size:12px; color:var(--ink-dim); }
  .leg-dot{ width:9px; height:9px; border-radius:50%; }

  .nps-stats{ display:flex; flex-direction:column; gap:28px; }
  .nps-score-row{ display:flex; align-items:baseline; gap:16px; }
  .nps-score{ font-size:clamp(3rem,5.6vw,4.2rem); font-weight:800; letter-spacing:-0.03em; color:var(--teal); }
  .nps-score-label{ font-size:13px; color:var(--ink-dim); max-width:200px; }
  .nps-sub-stats{ display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--card-border); border:1px solid var(--card-border); border-radius:14px; overflow:hidden; }
  .nps-sub-cell{ background:var(--card); padding:18px 20px; }
  .nps-sub-cell .n{ font-size:1.4rem; font-weight:800; }
  .nps-sub-cell .l{ font-size:12px; color:var(--ink-dim); margin-top:4px; }

  .cs-toggle-note{ margin-top:8px; font-size:12px; color:var(--ink-faint); }

  .cat-list{ margin-top:40px; display:flex; flex-direction:column; gap:1px; background:var(--card-border); border:1px solid var(--card-border); border-radius:var(--radius); overflow:hidden;}
  .cat-item{ background:var(--card); }
  .cat-head{ display:flex; align-items:center; justify-content:space-between; padding:20px 24px; cursor:pointer; user-select:none; gap:14px; flex-wrap:wrap; }
  .cat-head-left{ display:flex; align-items:center; gap:16px; flex:1; min-width:160px; }
  .cat-name{ font-weight:700; font-size:14.5px; }
  .cat-right{ display:flex; align-items:center; gap:16px; flex-shrink:0; }
  .cat-badge{ font-size:11px; font-weight:800; padding:4px 10px; border-radius:100px; background:var(--teal-soft); color:var(--teal); white-space:nowrap; }
  .cat-badge.neutro{ background:rgba(173,174,165,0.14); color:var(--ink-dim); }
  .cat-meta{ font-size:12px; color:var(--ink-faint); }
  .chev{ width:9px; height:9px; border-right:1.5px solid var(--ink-dim); border-bottom:1.5px solid var(--ink-dim); transform:rotate(45deg); transition:transform 320ms var(--ease); }
  .cat-item.open .chev{ transform:rotate(-135deg); }
  .cat-body{ max-height:0; overflow:hidden; transition:max-height 420ms var(--ease); }
  .cat-item.open .cat-body{ max-height:600px; }
  .cat-body-inner{ padding:0 24px 22px 24px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  @media (max-width:700px){ .cat-body-inner{ grid-template-columns:1fr; } }
  .cat-metric{ background:var(--bg-3); border-radius:12px; padding:14px 16px; }
  .cat-metric .t{ font-size:11px; color:var(--ink-faint); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
  .cat-metric .v{ font-size:1.3rem; font-weight:800; }
  .cat-metric .s{ font-size:11.5px; color:var(--ink-dim); margin-top:4px; }

  .op-stats{ display:grid; grid-template-columns:repeat(2,1fr); gap:1px; background:var(--card-border); border:1px solid var(--card-border); border-radius:var(--radius); overflow:hidden; margin-bottom:40px; }
  @media (max-width:700px){ .op-stats{ grid-template-columns:1fr; } }
  .op-cell{ background:var(--card); padding:32px 28px; }
  .op-num{ font-size:clamp(2rem,3.4vw,2.8rem); font-weight:800; color:var(--teal); }
  .op-label{ margin-top:8px; font-size:13px; color:var(--ink-dim); }
  .op-sub{ margin-top:4px; font-size:11.5px; color:var(--ink-faint); }

  .aspecto-list{ display:flex; flex-direction:column; gap:14px; margin-top:16px; }
  .aspecto-row{ display:grid; grid-template-columns:140px 1fr 40px; align-items:center; gap:14px; }
  .aspecto-nome{ font-size:13px; font-weight:600; }
  .aspecto-bar{ height:8px; border-radius:6px; background:var(--bg-3); overflow:hidden; }
  .aspecto-bar-fill{ height:100%; background:var(--teal); border-radius:6px; width:0%; transition:width 1s var(--ease); }
  .aspecto-n{ font-size:12.5px; color:var(--ink-dim); text-align:right; }

  .local-list{ margin-top:16px; display:flex; flex-direction:column; gap:1px; background:var(--card-border); border:1px solid var(--card-border); border-radius:16px; overflow:hidden; }
  .local-row{ background:var(--card); padding:16px 20px; display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; }
  .local-nome{ font-weight:700; font-size:13.5px; }
  .local-meta{ font-size:12px; color:var(--ink-dim); }

  .quote-grid{ margin-top:0; column-count:2; column-gap:20px; }
  @media (max-width:800px){ .quote-grid{ column-count:1; } }
  .quote-card{ break-inside:avoid; margin-bottom:20px; padding:22px 24px; border-radius:16px; background:var(--card); border:1px solid var(--card-border); display:flex; align-items:center; justify-content:space-between; gap:14px; }
  .quote-name{ font-size:14px; font-weight:700; }
  .quote-conselho{ font-size:12px; color:var(--ink-dim); margin-top:3px; }
  .quote-score-tag{ font-size:12px; font-weight:800; color:var(--teal); background:var(--teal-soft); padding:5px 12px; border-radius:100px; white-space:nowrap; }

  footer{ padding:60px clamp(20px,6vw,80px) 80px; max-width:1180px; margin:0 auto; border-top:1px solid var(--card-border); margin-top:40px; }
  .foot-row{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--ink-faint); }

  .empty-note{ font-size:13.5px; color:var(--ink-faint); padding:20px 0; }

  @media (prefers-reduced-motion: reduce){
    .reveal{ transition:opacity 200ms ease; transform:none; }
    .reveal.in{ transform:none; }
    *{ animation-duration:0.01ms !important; }
  }
</style>
</head>
<body>

<div class="progress" id="progress"></div>
<nav id="nav">
  <div class="nav-brand"><span class="dot"></span> MOAI CONSELHOS</div>
  <div class="nav-links">
    <a href="#nps">NPS</a>
    <a href="#operacional">Operacional</a>
    <a href="#destaque">Destaque</a>
  </div>
</nav>

<section class="hero">
  <div class="eyebrow reveal in">Relatório mensal · Conselhos Estratégicos</div>
  <h1 class="display reveal in">Relatório de <b>${esc(periodoTexto)}</b></h1>
  <p class="hero-sub reveal in">Pesquisa de NPS respondida ao vivo, ao final de cada conselho — visão de conselheiro, conselho e CS, dados operacionais dos encontros e quem mais se destacou.</p>
  <div class="hero-meta reveal in">
    <div class="pill"><b>${dados.nps.totalRespostas}</b>&nbsp;respostas</div>
    <div class="pill"><b>${dados.nps.porProduto.length}</b>&nbsp;produto(s)</div>
    <div class="pill"><b>${dados.nps.porCS.length}</b>&nbsp;CS avaliados</div>
    ${dados.nps.respostasSemConselhoConfirmado > 0 ? `<div class="pill">${dados.nps.respostasSemConselhoConfirmado}&nbsp;resposta(s) sem conselho confirmado</div>` : ''}
  </div>
  <div class="hero-result reveal in">
    <div class="result-number">${esc(scoreTexto)}</div>
    <div class="result-label">NPS do conselho — ${dados.nps.geral.conselho.promotores} promotor(es), ${dados.nps.geral.conselho.neutros} neutro(s), ${dados.nps.geral.conselho.detratores} detrator(es)</div>
  </div>
</section>

<section id="nps">
  <div class="sec-head reveal">
    <div class="sec-index">01 — NPS</div>
    <div class="sec-title">Três notas, <b>um retrato</b></div>
    <div class="sec-desc">Cada ponto da constelação é uma resposta real. O eixo abaixo troca entre conselheiro, conselho e CS — nota do CS combina "no mês" e "no Conselho de hoje" (a primeira só ~35% preenchida historicamente).</div>
  </div>

  <div class="dim-toggle reveal" id="dimToggle">
    <button class="dim-btn active" data-dim="conselho" type="button">Conselho</button>
    <button class="dim-btn" data-dim="conselheiro" type="button">Conselheiro</button>
    <button class="dim-btn" data-dim="cs" type="button">CS</button>
  </div>

  <div class="nps-wrap reveal">
    <div>
      <div class="constellation" id="constellation">
        <svg viewBox="0 0 400 400" id="constSvg"></svg>
      </div>
      <div class="const-legend">
        <div class="leg-item"><span class="leg-dot" style="background:#00A58D"></span> Promotor (9–10)</div>
        <div class="leg-item"><span class="leg-dot" style="background:#ADAEA5"></span> Neutro (7–8)</div>
        <div class="leg-item"><span class="leg-dot" style="background:#D56C48"></span> Detrator (0–6)</div>
      </div>
    </div>
    <div class="nps-stats" id="npsStats"></div>
  </div>

  <h3 style="margin-top:72px; font-size:1.3rem; font-weight:700;" class="reveal">Por produto</h3>
  <div class="cat-list reveal" id="cutsProduto"></div>

  <h3 style="margin-top:56px; font-size:1.3rem; font-weight:700;" class="reveal">Por CS</h3>
  <div class="cat-list reveal" id="cutsCS"></div>
</section>

<section id="operacional">
  <div class="sec-head reveal">
    <div class="sec-index">02 — Operacional</div>
    <div class="sec-title">Estrutura e <b>comida do local</b></div>
    <div class="sec-desc">Avaliação do local que recebeu cada conselho — seção separada do NPS propriamente dito.</div>
  </div>

  <div class="op-stats reveal">
    <div class="op-cell">
      <div class="op-num">${dados.operacional.mediaEstrutura === null ? '—' : dados.operacional.mediaEstrutura.toFixed(1)}</div>
      <div class="op-label">Nota média de estrutura</div>
      <div class="op-sub">${dados.operacional.totalRespostasComEstrutura} resposta(s)</div>
    </div>
    <div class="op-cell">
      <div class="op-num">${dados.operacional.mediaComida === null ? '—' : dados.operacional.mediaComida.toFixed(1)}</div>
      <div class="op-label">Nota média de comida</div>
      <div class="op-sub">${dados.operacional.totalRespostasComComida} resposta(s)</div>
    </div>
  </div>

  <h3 style="font-size:1.1rem; font-weight:700;" class="reveal">Aspectos do local mais citados</h3>
  <div class="aspecto-list reveal" id="aspectoList"></div>

  ${dados.operacional.porLocal.length ? `<h3 style="margin-top:48px; font-size:1.1rem; font-weight:700;" class="reveal">Por local</h3><div class="local-list reveal" id="localList"></div>` : ''}
</section>

<section id="destaque">
  <div class="sec-head reveal">
    <div class="sec-index">03 — Destaque</div>
    <div class="sec-title">Quem mais se <b>destacou</b></div>
    <div class="sec-desc">"Para você, qual empresário mais se destacou na reunião de hoje?" — resolvido contra o roster de cada conselho.</div>
  </div>

  <div class="quote-grid reveal" id="destaqueTop"></div>

  <h3 style="margin-top:56px; font-size:1.3rem; font-weight:700;" class="reveal">Por conselho</h3>
  <div class="cat-list reveal" id="destaquePorConselho"></div>
</section>

<footer>
  <div class="foot-row">
    <div>Relatório gerado a partir da pesquisa de NPS respondida ao vivo (board "NPS Conselhos Estratégicos 2026") — dados sincronizados do Monday.com</div>
    <div>${esc(periodoTexto)}</div>
  </div>
</footer>

<div class="const-tooltip" id="tooltip"></div>

<script>
const DADOS = ${dadosJson};

function fmtScore(s){ return s===null||s===undefined ? '—' : (s>0?'+':'')+s; }
function fmtNota(n){ return n===null||n===undefined ? '—' : (Math.round(n*10)/10).toLocaleString('pt-BR'); }

// ---------- reveal on scroll ----------
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:0.1});
revealEls.forEach(el=>io.observe(el));

// ---------- nav visibility + progress ----------
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
window.addEventListener('scroll', ()=>{
  const y = window.scrollY;
  nav.classList.toggle('visible', y>window.innerHeight*0.6);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (h>0 ? (y/h*100) : 0) + '%';
},{passive:true});

// ---------- fills (bars) ----------
function triggerFills(container){
  container.querySelectorAll('[data-fill]').forEach(el=>{
    const v = el.dataset.fill;
    requestAnimationFrame(()=>{ el.style.width = v+'%'; });
  });
}
document.querySelectorAll('section').forEach(sec=>{
  const io2 = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ triggerFills(e.target); io2.unobserve(e.target); } });
  },{threshold:0.2});
  io2.observe(sec);
});

// ---------- NPS score cards ----------
function renderNpsStats(){
  const g = DADOS.nps.geral;
  const wrap = document.getElementById('npsStats');
  wrap.innerHTML =
    '<div class="nps-score-row"><div class="nps-score">' + fmtScore(g.conselho.score) + '</div>' +
    '<div class="nps-score-label">NPS do conselho — ' + g.conselho.total + ' resposta(s)</div></div>' +
    '<div class="nps-sub-stats">' +
      '<div class="nps-sub-cell"><div class="n">' + fmtScore(g.conselheiro.score) + '</div><div class="l">NPS conselheiro</div></div>' +
      '<div class="nps-sub-cell"><div class="n">' + fmtScore(g.csCombinado.score) + '</div><div class="l">NPS CS (combinado)</div></div>' +
      '<div class="nps-sub-cell"><div class="n">' + fmtScore(g.csHoje.score) + '</div><div class="l">NPS CS — no Conselho de hoje</div></div>' +
      '<div class="nps-sub-cell"><div class="n">' + fmtScore(g.csMes.score) + '</div><div class="l">NPS CS — no mês (' + g.csMes.total + ' resposta(s))</div></div>' +
    '</div>' +
    '<div class="cs-toggle-note">Nota do CS "combinada" usa a nota do mês quando existe, senão a do dia — as duas ficam sempre disponíveis separadas acima.</div>';
}
renderNpsStats();

// ---------- cortes (produto / CS) ----------
function renderCutsList(containerId, lista, labelKey){
  const el = document.getElementById(containerId);
  if (!lista.length){ el.innerHTML = '<div class="empty-note">Sem respostas suficientes neste período.</div>'; return; }
  el.innerHTML = '';
  lista.forEach((c)=>{
    const item = document.createElement('div');
    item.className = 'cat-item';
    const badgeClass = (c.conselho.score===null) ? 'neutro' : (c.conselho.score>=0 ? '' : 'neutro');
    item.innerHTML =
      '<div class="cat-head">' +
        '<div class="cat-head-left"><div class="cat-name">' + (c[labelKey]||'—').toString().replace(/</g,'&lt;') + '</div></div>' +
        '<div class="cat-right">' +
          '<span class="cat-meta">' + c.totalRespostas + ' resposta(s)</span>' +
          '<span class="cat-badge ' + badgeClass + '">NPS conselho ' + fmtScore(c.conselho.score) + '</span>' +
          '<div class="chev"></div>' +
        '</div>' +
      '</div>' +
      '<div class="cat-body"><div class="cat-body-inner">' +
        '<div class="cat-metric"><div class="t">Conselheiro</div><div class="v">' + fmtScore(c.conselheiro.score) + '</div><div class="s">' + c.conselheiro.total + ' resposta(s)</div></div>' +
        '<div class="cat-metric"><div class="t">CS combinado</div><div class="v">' + fmtScore(c.csCombinado.score) + '</div><div class="s">' + c.csCombinado.total + ' resposta(s)</div></div>' +
        '<div class="cat-metric"><div class="t">CS no mês</div><div class="v">' + fmtScore(c.csMes.score) + '</div><div class="s">' + c.csMes.total + ' resposta(s)</div></div>' +
      '</div></div>';
    item.querySelector('.cat-head').addEventListener('click', ()=>{
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('#' + containerId + ' .cat-item.open').forEach(o=>o.classList.remove('open'));
      if(!wasOpen) item.classList.add('open');
    });
    el.appendChild(item);
  });
}
renderCutsList('cutsProduto', DADOS.nps.porProduto, 'produto');
renderCutsList('cutsCS', DADOS.nps.porCS, 'cs');

// ---------- operacional ----------
function renderAspectos(){
  const el = document.getElementById('aspectoList');
  const lista = DADOS.operacional.aspectosMaisCitados;
  if (!lista.length){ el.innerHTML = '<div class="empty-note">Sem respostas com aspecto marcado neste período.</div>'; return; }
  const max = Math.max(...lista.map(a=>a.votos));
  el.innerHTML = lista.map(a =>
    '<div class="aspecto-row">' +
      '<div class="aspecto-nome">' + a.aspecto.replace(/</g,'&lt;') + '</div>' +
      '<div class="aspecto-bar"><div class="aspecto-bar-fill" data-fill="' + Math.round(a.votos/max*100) + '"></div></div>' +
      '<div class="aspecto-n">' + a.votos + '</div>' +
    '</div>'
  ).join('');
}
renderAspectos();

function renderLocais(){
  const el = document.getElementById('localList');
  if (!el) return;
  el.innerHTML = DADOS.operacional.porLocal.map(l =>
    '<div class="local-row">' +
      '<div><div class="local-nome">' + l.local.replace(/</g,'&lt;') + '</div><div class="local-meta">' + l.totalRespostas + ' resposta(s)</div></div>' +
      '<div class="local-meta">Estrutura ' + fmtNota(l.mediaEstrutura) + ' · Comida ' + fmtNota(l.mediaComida) + '</div>' +
    '</div>'
  ).join('');
}
renderLocais();

// ---------- destaque ----------
function renderDestaqueTop(){
  const el = document.getElementById('destaqueTop');
  const lista = DADOS.destaque.topGeral;
  if (!lista.length){ el.innerHTML = '<div class="empty-note">Sem votos de destaque resolvidos neste período.</div>'; return; }
  el.innerHTML = lista.map(d =>
    '<div class="quote-card">' +
      '<div><div class="quote-name">' + d.membro.replace(/</g,'&lt;') + '</div><div class="quote-conselho">' + (d.conselho||'').replace(/</g,'&lt;') + '</div></div>' +
      '<div class="quote-score-tag">' + d.votos + (d.votos===1?' voto':' votos') + '</div>' +
    '</div>'
  ).join('');
}
renderDestaqueTop();

function renderDestaquePorConselho(){
  const el = document.getElementById('destaquePorConselho');
  const lista = DADOS.destaque.porConselho;
  if (!lista.length){ el.innerHTML = '<div class="empty-note">Sem votos de destaque resolvidos neste período.</div>'; return; }
  el.innerHTML = '';
  lista.forEach((c)=>{
    const item = document.createElement('div');
    item.className = 'cat-item';
    const top = c.ranking[0];
    item.innerHTML =
      '<div class="cat-head">' +
        '<div class="cat-head-left"><div class="cat-name">' + c.conselho.replace(/</g,'&lt;') + '</div></div>' +
        '<div class="cat-right"><span class="cat-badge">' + (top?top.membro:'') + ' · ' + (top?top.votos:0) + (top&&top.votos===1?' voto':' votos') + '</span><div class="chev"></div></div>' +
      '</div>' +
      '<div class="cat-body"><div class="cat-body-inner" style="grid-template-columns:1fr;">' +
        c.ranking.map(r => '<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--card-border);font-size:13.5px;"><span>' + r.membro.replace(/</g,'&lt;') + '</span><span style="color:var(--ink-dim);">' + r.votos + (r.votos===1?' voto':' votos') + '</span></div>').join('') +
      '</div></div>';
    item.querySelector('.cat-head').addEventListener('click', ()=>{
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('#destaquePorConselho .cat-item.open').forEach(o=>o.classList.remove('open'));
      if(!wasOpen) item.classList.add('open');
    });
    el.appendChild(item);
  });
}
renderDestaquePorConselho();

// ---------- constelação (eixo trocável) ----------
const svg = document.getElementById('constSvg');
const tooltip = document.getElementById('tooltip');
const cx=200, cy=200;
const colorFor = s => s===null||s===undefined ? '#3D3D3D' : (s>=9 ? '#00A58D' : (s>=7 ? '#ADAEA5' : '#D56C48'));
const sizeFor = s => s===null||s===undefined ? 4 : 6 + (s/10)*7;
const campoPorEixo = { conselho:'conselhoNota', conselheiro:'conselheiroNota', cs:'csNota' };
const labelPorEixo = { conselho:'Nota do Conselho', conselheiro:'Nota do Conselheiro', cs:'Nota do CS' };

function renderConstellation(eixo){
  svg.innerHTML = '';
  const pontos = DADOS.pontos.filter(p => p[campoPorEixo[eixo]] !== null && p[campoPorEixo[eixo]] !== undefined);

  [60,105,150].forEach(r=>{
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',r);
    c.setAttribute('class','const-ring');
    svg.appendChild(c);
  });
  const centerText = document.createElementNS('http://www.w3.org/2000/svg','text');
  centerText.setAttribute('x',cx); centerText.setAttribute('y',cy-4);
  centerText.setAttribute('text-anchor','middle'); centerText.setAttribute('fill','#F4F4F4');
  centerText.setAttribute('font-size','26'); centerText.setAttribute('font-weight','800');
  centerText.textContent = String(pontos.length);
  svg.appendChild(centerText);
  const centerLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
  centerLabel.setAttribute('x',cx); centerLabel.setAttribute('y',cy+18);
  centerLabel.setAttribute('text-anchor','middle'); centerLabel.setAttribute('fill','#ADAEA5'); centerLabel.setAttribute('font-size','10');
  centerLabel.textContent = labelPorEixo[eixo];
  svg.appendChild(centerLabel);

  pontos.forEach((p,i)=>{
    const nota = p[campoPorEixo[eixo]];
    const angle = (i/pontos.length)*Math.PI*2 - Math.PI/2;
    const radius = 95 + (nota/10)*55;
    const x = cx + Math.cos(angle)*radius;
    const y = cy + Math.sin(angle)*radius;
    const node = document.createElementNS('http://www.w3.org/2000/svg','circle');
    node.setAttribute('cx',x); node.setAttribute('cy',y);
    node.setAttribute('r', sizeFor(nota));
    node.setAttribute('fill', colorFor(nota));
    node.setAttribute('class','const-node');
    node.style.transitionDelay = (Math.min(i,60)*20)+'ms';

    const showTip = (evX,evY)=>{
      tooltip.innerHTML = '<div class="name">' + (p.respondente||'Anônimo').replace(/</g,'&lt;') + '</div>' +
        '<div class="score">Nota ' + nota + '</div>' +
        (p.conselho ? '<div style="margin-top:4px;color:#ADAEA5;">' + p.conselho.replace(/</g,'&lt;') + (p.produto?' · '+p.produto.replace(/</g,'&lt;'):'') + '</div>' : '');
      tooltip.style.left = evX + 'px'; tooltip.style.top = evY + 'px';
      tooltip.classList.add('show');
      node.setAttribute('r', sizeFor(nota)+3);
    };
    const hideTip = ()=>{ tooltip.classList.remove('show'); node.setAttribute('r', sizeFor(nota)); };
    node.addEventListener('mouseenter', ()=>{
      const rect = document.getElementById('constellation').getBoundingClientRect();
      showTip(rect.left+(x/400)*rect.width, rect.top+(y/400)*rect.height);
    });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('touchstart', (e)=>{
      e.preventDefault();
      const rect = document.getElementById('constellation').getBoundingClientRect();
      showTip(rect.left+(x/400)*rect.width, rect.top+(y/400)*rect.height);
      setTimeout(hideTip, 2600);
    },{passive:false});
    svg.appendChild(node);
  });

  requestAnimationFrame(()=>{
    document.querySelectorAll('.const-node').forEach((n,i)=>{ setTimeout(()=>n.classList.add('show'), Math.min(i,60)*20); });
  });
}
renderConstellation('conselho');

document.getElementById('dimToggle').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dim-btn');
  if (!btn) return;
  document.querySelectorAll('.dim-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderConstellation(btn.dataset.dim);
});
</script>
</body>
</html>
`;
}
