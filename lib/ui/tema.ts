// Tema compartilhado v3 (redesenho aprovado em redesenho_v3/). Uso obrigatório em toda tela nova:
// tokens, ícones, dock e sparkline saem daqui e de nenhum outro lugar. Os tokens de TEMA_CSS são
// os de redesenho_v3/fonte/base.css, sem alteração.

// Tokens, dock de vidro, painéis, botões e utilitários.
export const TEMA_CSS = `
/* Sistema visual v3 do dash de CS MOAI. Marca preservada, navegação em dock de vidro no topo. */
:root{
  --bg:#F3F2F0; --surface:#FFFFFF; --ink:#1A1A1A; --ink2:#5D5D5D; --ink3:#878585;
  --line:#ECEAEA; --line2:#DAD7D7; --side:#141414;
  --gold:#C89A2E; --gold-soft:#F7EFDC; --gold-ink:#8A6410;
  --red:#C0433D; --red-soft:#FBECEA; --red-ink:#A3342F;
  --green:#3D8B5F; --green-soft:#E8F2EC;
  --r:14px; --r-s:9px;
  --glass:rgba(255,255,255,.66); --glass-strong:rgba(255,255,255,.84);
  --glass-edge:rgba(255,255,255,.75);
  --spring:cubic-bezier(.2,.9,.25,1);
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;font-size:13.5px;line-height:1.45;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;min-height:100vh;position:relative}
/* Luz ambiente da marca, para o vidro ter o que refratar */
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(900px 520px at 8% -8%,rgba(200,154,46,.16),transparent 60%),radial-gradient(800px 520px at 100% 0%,rgba(61,139,95,.10),transparent 60%),radial-gradient(700px 600px at 50% 110%,rgba(200,154,46,.08),transparent 60%)}
a{color:inherit;text-decoration:none}
button{font-family:inherit}
.disp{font-family:'Bricolage Grotesque','Inter',sans-serif;letter-spacing:-0.02em}
.muted{color:var(--ink2)} .faint{color:var(--ink3)}

/* Dock de vidro flutuante */
.dock-wrap{position:sticky;top:0;z-index:50;padding:14px 24px 0}
.dock{position:relative;isolation:isolate;max-width:1312px;margin:0 auto;height:58px;display:flex;align-items:center;gap:6px;padding:0 10px 0 12px;border-radius:20px;border:1px solid var(--glass-edge);box-shadow:0 10px 34px rgba(20,20,20,.10),0 1px 2px rgba(20,20,20,.06),inset 0 1px 0 rgba(255,255,255,.9)}
/* O vidro mora num pseudo elemento: assim o menu filho também consegue desfocar o que está atrás */
.dock::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:var(--glass);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%)}
.dock-brand{display:flex;align-items:center;gap:9px;padding:0 8px 0 2px}
.brand-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(145deg,#1F1F1F,#141414);color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.brand-txt{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px;letter-spacing:.03em}
.brand-txt small{font-family:'Inter',sans-serif;font-weight:600;font-size:11px;letter-spacing:0;color:var(--ink3);margin-left:4px}
.dock-sep{width:1px;height:24px;background:rgba(26,26,26,.1);margin:0 6px}
.dock-fill{flex:1}

.grp{position:relative}
.grp-btn{position:relative;display:flex;align-items:center;gap:0;height:40px;padding:0 10px;border:0;border-radius:12px;background:transparent;color:var(--ink2);cursor:pointer;font-size:13px;font-weight:600;transition:background .18s ease,color .18s ease,transform .1s ease-out}
.grp-btn:active{transform:scale(.96)}
.grp-btn svg{width:19px;height:19px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.grp-lbl{max-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:max-width .32s var(--spring),opacity .2s ease,margin .32s var(--spring)}
.grp:hover .grp-btn,.grp:focus-within .grp-btn{background:rgba(26,26,26,.06);color:var(--ink)}
.grp:hover .grp-lbl,.grp:focus-within .grp-lbl,.grp.on .grp-lbl{max-width:180px;opacity:1;margin-left:8px}
.grp.on .grp-btn{background:var(--ink);color:#fff;box-shadow:0 4px 14px rgba(20,20,20,.18),inset 0 1px 0 rgba(255,255,255,.12)}
.grp.on .grp-btn svg{stroke:var(--gold)}
.nbadge{position:absolute;top:3px;right:3px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:var(--red);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.grp.on .nbadge{position:static;margin-left:8px;box-shadow:none}
.nbadge.gold{background:var(--gold);color:var(--side)}

/* Menu do grupo: nasce do ícone que o abriu */
.menu{position:absolute;top:calc(100% + 12px);left:0;min-width:280px;padding:8px;border-radius:18px;background:var(--glass-strong);-webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);border:1px solid var(--glass-edge);box-shadow:0 24px 60px rgba(20,20,20,.18),0 2px 6px rgba(20,20,20,.06),inset 0 1px 0 rgba(255,255,255,.9);transform-origin:24px 0;opacity:0;visibility:hidden;transform:translateY(-6px) scale(.96);filter:blur(6px);transition:opacity .16s ease .12s,transform .3s var(--spring) .12s,filter .2s ease .12s,visibility 0s linear .42s}
.menu::before{content:"";position:absolute;left:0;right:0;top:-14px;height:14px}
.grp:hover .menu,.grp:focus-within .menu,.grp.aberto .menu{opacity:1;visibility:visible;transform:none;filter:none;transition-delay:0s}
.menu-h{display:block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);padding:8px 10px 6px}
.mi{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:11px;transition:background .15s ease}
.mi:hover{background:rgba(26,26,26,.06)}
.mi:active{transform:scale(.985)}
.mi .ico{width:34px;height:34px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(20,20,20,.08),inset 0 0 0 1px rgba(26,26,26,.06)}
.mi .ico svg{width:17px;height:17px;stroke:var(--ink);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.mi b{display:block;font-size:13.5px;font-weight:600;letter-spacing:-0.005em}
.mi small{display:block;font-size:12px;color:var(--ink2)}
.mi.on .ico{background:var(--ink)} .mi.on .ico svg{stroke:var(--gold)}
.mi .nbadge{position:static;margin-left:auto;box-shadow:none}

/* Busca que se expande */
.dsearch{display:flex;align-items:center;gap:8px;height:40px;width:40px;padding:0 11px;border-radius:12px;color:var(--ink2);cursor:text;overflow:hidden;transition:width .36s var(--spring),background .2s ease}
.dsearch svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:2}
.dsearch input{border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:var(--ink);flex:1;min-width:0;opacity:0;transition:opacity .2s ease}
.dsearch kbd{font-family:inherit;font-size:10.5px;color:var(--ink3);border:1px solid rgba(26,26,26,.14);border-radius:5px;padding:1px 5px;opacity:0}
.dsearch:hover,.dsearch:focus-within{width:300px;background:rgba(255,255,255,.75);box-shadow:inset 0 0 0 1px rgba(26,26,26,.08)}
.dsearch:hover input,.dsearch:focus-within input,.dsearch:hover kbd,.dsearch:focus-within kbd{opacity:1}
.dsync{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--ink2);padding:0 10px}
.dsync i{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(61,139,95,.2)}
.dock .av{width:34px;height:34px;font-size:13px;box-shadow:0 0 0 2px rgba(255,255,255,.9)}

/* Cabeçalho da página, abaixo do dock */
.work{padding:0 24px}
.top{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:28px 0 0;max-width:1312px;margin:0 auto;width:100%}
.crumb{font-size:12.5px;color:var(--ink3);display:flex;gap:6px;align-items:center}
.crumb a:hover{color:var(--ink)}
.top h1{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;font-weight:700;margin:2px 0 0;letter-spacing:-0.025em;line-height:1.1}
.top-r{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.content{padding:22px 0 64px;display:flex;flex-direction:column;gap:22px;max-width:1312px;margin:0 auto;width:100%}

.seg{display:inline-flex;background:rgba(26,26,26,.06);border-radius:11px;padding:3px}
.seg button{border:0;background:transparent;font-size:12.5px;font-weight:600;color:var(--ink2);padding:6px 12px;border-radius:8px;cursor:pointer;transition:background .18s ease,color .18s ease}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.1)}

/* Painéis sólidos: o conteúdo é sólido, o vidro fica para a moldura */
.panel{background:var(--surface);border:1px solid rgba(26,26,26,.06);border-radius:var(--r);box-shadow:0 1px 2px rgba(20,20,20,.04),0 6px 18px rgba(20,20,20,.03)}
.ph{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 18px 12px}
.ph h2{font-size:15px;font-weight:700;margin:0;letter-spacing:-0.01em}
.ph p{margin:2px 0 0;font-size:12.5px;color:var(--ink2)}
.ph .r{margin-left:auto;display:flex;gap:8px;align-items:center}
.pb{padding:0 18px 18px}
.count{font-size:11.5px;font-weight:700;background:var(--bg);color:var(--ink2);border-radius:99px;padding:2px 8px}

.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kpi{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.kpi-l{font-size:12px;font-weight:600;color:var(--ink2);display:flex;justify-content:space-between;gap:8px}
.kpi-v{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.kpi-n{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:32px;line-height:1;letter-spacing:-0.025em}
.kpi-n small{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--ink3);margin-left:3px;letter-spacing:0}
.kpi-f{font-size:12px;color:var(--ink2)}
.delta{white-space:nowrap;flex:none;display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;border-radius:99px;padding:2px 7px;background:var(--bg);color:var(--ink2)}
.delta.bad{background:var(--red-soft);color:var(--red-ink)}
.delta.good{background:var(--green-soft);color:var(--green)}
.kpi.alert{box-shadow:inset 0 0 0 1px #F1D3CF,0 1px 2px rgba(20,20,20,.04)}

.tag{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:7px;background:var(--bg);color:var(--ink2);white-space:nowrap}
.tag.red{background:var(--red-soft);color:var(--red-ink)}
.tag.gold{background:var(--gold-soft);color:var(--gold-ink)}
.tag.green{background:var(--green-soft);color:var(--green)}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--ink3)}
.dot.red{background:var(--red)} .dot.gold{background:var(--gold)} .dot.green{background:var(--green)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border-radius:10px;font-size:12.5px;font-weight:600;border:1px solid var(--line2);background:var(--surface);color:var(--ink);cursor:pointer;white-space:nowrap;transition:transform .1s ease-out,border-color .15s ease}
.btn:hover{border-color:var(--ink)}
.btn:active{transform:scale(.97)}
.btn.pri{background:var(--ink);border-color:var(--ink);color:#fff;box-shadow:0 4px 14px rgba(20,20,20,.16)}
.btn.gold{background:var(--gold);border-color:var(--gold);color:var(--side)}
.btn.sm{height:28px;padding:0 10px;font-size:12px;border-radius:8px}
.btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

.av{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;flex:none}
.bar{position:relative;height:6px;border-radius:99px;background:#EDEBEB;overflow:hidden}
.bar > span{position:absolute;inset:0 auto 0 0;border-radius:99px;background:var(--ink)}
.bar > span.gold{background:var(--gold)} .bar > span.red{background:var(--red)} .bar > span.green{background:var(--green)}
.pace{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink);opacity:.45}
.link{font-size:12.5px;font-weight:600;color:var(--ink2)}
.link:hover{color:var(--ink)}

@media (max-width:1100px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:820px){
  .dock-wrap{padding:10px 12px 0}
  .dock{gap:2px;padding:0 6px 0 8px;height:54px}
  .brand-txt,.dsync,.dock-sep{display:none}
  .grp.on .grp-lbl,.grp:hover .grp-lbl,.grp:focus-within .grp-lbl{max-width:0;opacity:0;margin-left:0}
  .grp{position:static}
  .menu{left:12px;right:12px;top:72px;position:fixed;min-width:0}
  .dsearch:hover,.dsearch:focus-within{width:40px;background:transparent;box-shadow:none}
  .work{padding:0 16px}
  .top h1{font-size:24px}
}
@media (max-width:560px){
  .kpis{grid-template-columns:1fr 1fr;gap:10px}
  .kpi{padding:14px}
  .kpi-n{font-size:26px}
}
@media (prefers-reduced-motion:reduce){
  *{transition-duration:.01ms!important}
  .menu{transform:none;filter:none}
}
@media (prefers-reduced-transparency:reduce){
  .dock::before,.menu{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
}
`;

// Sprite de ícones (ids i-home, i-area, i-users, i-layers, i-target, i-shield, i-pulse, i-flag,
// i-gear, i-cal, i-file, i-search, i-arrow, i-plus, i-check, i-warn). Entra uma vez por página.
export const ICONES_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" xmlns:c2pa="http://c2pa.org/manifest">
<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></symbol>
<symbol id="i-area" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 4.9"/></symbol>
<symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/></symbol>
<symbol id="i-pulse" viewBox="0 0 24 24"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></symbol>
<symbol id="i-flag" viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></symbol>
<symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></symbol>
<symbol id="i-cal" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5v.5"/></symbol>
</svg>`;

// Google Fonts já liberado no CSP.
export const FONTES_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Comportamento do dock (abre por hover, foco e toque; fecha com Esc ou clique fora; Ctrl K foca a
// busca) e função de sparkline. Script de navegador, sem dependências. Expõe:
//  dockDefinirSync(texto), dockDefinirTime(nome), dockDefinirBadge(chave, n), sparkDesenhar(raiz).
// A busca dispara o evento "dock-busca" (detail.texto) quando o usuário aperta Enter.
export const DOCK_SCRIPT = `
function sparkDesenhar(raiz) {
  (raiz || document).querySelectorAll('svg.spark').forEach(function (s) {
    var v = String(s.getAttribute('data-v') || '').split(',').map(Number).filter(function (x) { return isFinite(x); });
    if (v.length < 2) { s.style.display = 'none'; return; }
    var W = 76, H = 24, p = 3, mn = Math.min.apply(0, v), mx = Math.max.apply(0, v), r = (mx - mn) || 1;
    var pts = v.map(function (x, i) { return [p + i * (W - 2 * p) / (v.length - 1), H - p - (x - mn) / r * (H - 2 * p)]; });
    var cor = s.getAttribute('data-bad') ? 'var(--red)' : 'var(--ink)', l = pts[pts.length - 1];
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    s.innerHTML = '<polyline fill="none" style="stroke:' + cor + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="' +
      pts.map(function (q) { return q.join(','); }).join(' ') + '"/><circle cx="' + l[0] + '" cy="' + l[1] + '" r="2.4" style="fill:' + cor + '"/>';
  });
}
function dockDefinirSync(texto) {
  var el = document.getElementById('dockSync'); if (!el) return;
  el.lastChild.nodeValue = texto || 'sem sincronização';
  el.title = texto ? 'Monday sincronizado às ' + texto : 'Sem registro de sincronização';
}
function dockDefinirTime(nome) {
  var a = document.getElementById('dockTime'); if (!a || !nome) return;
  a.setAttribute('href', '/gestor/cs/' + encodeURIComponent(nome));
}
function dockDefinirBadge(chave, n) {
  var a = document.querySelector('[data-badge="' + chave + '"]'); if (!a) return;
  var mostrar = n !== null && n !== undefined && Number(n) > 0;
  a.querySelectorAll('.nbadge').forEach(function (b) { b.parentNode.removeChild(b); });
  if (!mostrar) return;
  var b = document.createElement('span'); b.className = 'nbadge' + (a.getAttribute('data-badge-tom') === 'gold' ? ' gold' : ''); b.textContent = String(n);
  a.appendChild(b);
}
(function () {
  var grps = [].slice.call(document.querySelectorAll('.grp'));
  function fechar(ex) { grps.forEach(function (g) { if (g !== ex) { g.classList.remove('aberto'); g.querySelector('.grp-btn').setAttribute('aria-expanded', 'false'); } }); }
  grps.forEach(function (g) {
    var b = g.querySelector('.grp-btn');
    g.addEventListener('mouseenter', function () { b.setAttribute('aria-expanded', 'true'); });
    g.addEventListener('mouseleave', function () { if (!g.classList.contains('aberto')) b.setAttribute('aria-expanded', 'false'); });
    b.addEventListener('click', function (e) { e.stopPropagation(); var abre = !g.classList.contains('aberto'); fechar(g); g.classList.toggle('aberto', abre); b.setAttribute('aria-expanded', String(abre)); });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.grp')) fechar(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { fechar(); if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.dock')) document.activeElement.blur(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { var i = document.querySelector('.dsearch input'); if (i) { e.preventDefault(); i.focus(); } }
  });
  var busca = document.querySelector('.dsearch input');
  if (busca) busca.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && busca.value.trim()) document.dispatchEvent(new CustomEvent('dock-busca', { detail: { texto: busca.value.trim() } }));
  });
  sparkDesenhar(document);
})();
`;

export type PerfilDock = 'gestor' | 'cs';
// Chaves de página ativa. Gestor: area, time, conselhos, metas, churn, nps, pulso, voz, perfis.
// CS: inicio, agenda, meus-conselhos, indicadores, pontos, report, gestor.
export type BadgesDock = {
  // Urgências da semana (fonte: /api/gestor/visao-geral/acoes). Omitido ou zero: sem badge.
  urgencias?: number | null;
  // Report semanal do CS ainda pendente: badge dourado em Report.
  reportPendente?: boolean;
};
export type OpcoesDock = {
  inicial?: string; // inicial do avatar
  horaSync?: string | null; // horário real do último sync (HH:MM), nulo se não houver registro
  rotuloAtivo?: string; // substitui o rótulo do grupo ativo, por exemplo "Time · Amanda"
  tambemGestor?: boolean; // CS que is_gestor() aprovou no servidor: libera o item Gestor
  primeiroCS?: string | null; // primeiro CS do ranking, destino do item Time
  placeholderBusca?: string;
};

type Item = { chave: string; href: string; icone: string; titulo: string; sub: string; badge?: 'urgencias' | 'report' };
type Grupo = { icone: string; rotulo: string; titulo: string; itens: Item[] };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function gruposGestor(o: OpcoesDock): Grupo[] {
  const time = o.primeiroCS ? '/gestor/cs/' + encodeURIComponent(o.primeiroCS) : '/gestor?aba=visaoGeral#mapa-time';
  return [
    { icone: 'i-area', rotulo: 'Gestão', titulo: 'Gestão', itens: [
      { chave: 'area', href: '/gestor?aba=visaoGeral', icone: 'i-area', titulo: 'Visão da área', sub: 'Situação e fila de ação', badge: 'urgencias' },
      { chave: 'time', href: time, icone: 'i-users', titulo: 'Time', sub: 'Página de cada CS' },
      { chave: 'conselhos', href: '/gestor?aba=visaoGeral#rede-conselhos', icone: 'i-layers', titulo: 'Conselhos', sub: 'Rede, presença e GTD' },
      { chave: 'metas', href: '/gestor?aba=metasDestaques', icone: 'i-target', titulo: 'Metas e destaques', sub: 'Metas do mês e recordes' },
    ] },
    { icone: 'i-shield', rotulo: 'Saúde', titulo: 'Saúde da base', itens: [
      { chave: 'churn', href: '/gestor?aba=churn', icone: 'i-shield', titulo: 'Churn e reconquista', sub: 'Saídas, motivos e retorno' },
      { chave: 'nps', href: '/gestor?aba=nps', icone: 'i-pulse', titulo: 'NPS dos conselhos', sub: 'Voz do membro' },
      { chave: 'pulso', href: '/gestor?aba=pulso', icone: 'i-pulse', titulo: 'Pulso de CS', sub: 'Voz do time' },
      { chave: 'voz', href: '/gestor?aba=voz', icone: 'i-flag', titulo: 'Fila da liderança', sub: 'Pedidos para a liderança' },
    ] },
    { icone: 'i-gear', rotulo: 'Sistema', titulo: 'Sistema', itens: [
      { chave: 'perfis', href: '/gestor?aba=controlePerfis', icone: 'i-gear', titulo: 'Controle de perfis', sub: 'Vínculos e permissões' },
    ] },
  ];
}

function gruposCS(o: OpcoesDock): Grupo[] {
  const g: Grupo[] = [
    { icone: 'i-home', rotulo: 'Início', titulo: 'Meu trabalho', itens: [
      { chave: 'inicio', href: '/', icone: 'i-home', titulo: 'Início', sub: 'Seu dia e seu mês' },
      { chave: 'agenda', href: '/?aba=agenda', icone: 'i-cal', titulo: 'Agenda', sub: 'Conselhos e rounds' },
      { chave: 'meus-conselhos', href: '/?aba=conselhos', icone: 'i-layers', titulo: 'Meus conselhos', sub: 'Membros, presença e GTD' },
    ] },
    { icone: 'i-target', rotulo: 'Desempenho', titulo: 'Desempenho', itens: [
      { chave: 'indicadores', href: '/?aba=indicadores', icone: 'i-target', titulo: 'Meus indicadores', sub: 'Metas contra o realizado' },
      { chave: 'pontos', href: '/?aba=advertencias', icone: 'i-shield', titulo: 'Pontos tomados', sub: 'Advertências ativas' },
    ] },
    { icone: 'i-file', rotulo: 'Report', titulo: 'Report', itens: [
      { chave: 'report', href: '/?aba=report', icone: 'i-file', titulo: 'Report semanal', sub: 'Vence sexta às 19h', badge: 'report' },
    ] },
  ];
  // O item Gestor só existe para quem is_gestor() aprova no servidor; a página decide e passa a opção.
  if (o.tambemGestor) g.push({ icone: 'i-area', rotulo: 'Gestor', titulo: 'Gestor', itens: [
    { chave: 'gestor', href: '/gestor', icone: 'i-area', titulo: 'Visão da área', sub: 'Área de gestão' },
  ] });
  return g;
}

function itemHtml(i: Item, ativo: string, b: BadgesDock): string {
  const n = i.badge === 'urgencias' ? b.urgencias : null;
  let selo = '';
  let marca = '';
  if (i.badge === 'urgencias') {
    marca = ' data-badge="urgencias"';
    if (n && n > 0) selo = '<span class="nbadge">' + n + '</span>';
  } else if (i.badge === 'report') {
    marca = ' data-badge="report" data-badge-tom="gold"';
    if (b.reportPendente) selo = '<span class="nbadge gold">1</span>';
  }
  const id = i.chave === 'time' ? ' id="dockTime"' : '';
  return '<a' + id + ' class="mi' + (i.chave === ativo ? ' on' : '') + '" href="' + esc(i.href) + '" role="menuitem"' + marca + '><span class="ico"><svg><use href="#' + i.icone + '"/></svg></span><span><b>' +
    esc(i.titulo) + '</b><small>' + esc(i.sub) + '</small></span>' + selo + '</a>';
}

// Gera o HTML do dock. perfil escolhe os grupos; ativo é a chave da página atual; badges traz
// os contadores reais (urgências da semana e report pendente).
export function montarDock(perfil: PerfilDock, ativo: string, badges: BadgesDock = {}, opcoes: OpcoesDock = {}): string {
  const grupos = perfil === 'gestor' ? gruposGestor(opcoes) : gruposCS(opcoes);
  const marcaSync = opcoes.horaSync ? esc(opcoes.horaSync) : 'sem sincronização';
  const titSync = opcoes.horaSync ? 'Monday sincronizado às ' + esc(opcoes.horaSync) : 'Sem registro de sincronização';
  const busca = esc(opcoes.placeholderBusca || (perfil === 'gestor' ? 'Pergunte ou busque' : 'Buscar conselho ou membro'));
  const partes = grupos.map((g) => {
    const itemAtivo = g.itens.find((i) => i.chave === ativo);
    const on = !!itemAtivo;
    const rotulo = on ? (opcoes.rotuloAtivo || itemAtivo!.titulo) : g.rotulo;
    const icone = on ? itemAtivo!.icone : g.icone;
    // Badge do botão: aparece quando algum item do grupo tem contador.
    const temUrg = g.itens.some((i) => i.badge === 'urgencias') && badges.urgencias && badges.urgencias > 0;
    const temRep = g.itens.some((i) => i.badge === 'report') && badges.reportPendente;
    const seloBtn = temUrg ? '<span class="nbadge">' + badges.urgencias + '</span>' : temRep ? '<span class="nbadge gold">1</span>' : '';
    return '<div class="grp' + (on ? ' on' : '') + '"><button type="button" class="grp-btn" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(g.titulo) + '">' +
      '<svg aria-hidden="true"><use href="#' + icone + '"/></svg><span class="grp-lbl">' + esc(rotulo) + '</span>' + seloBtn + '</button>' +
      '<div class="menu" role="menu"><span class="menu-h">' + esc(g.titulo) + '</span>' + g.itens.map((i) => itemHtml(i, ativo, badges)).join('') + '</div></div>';
  });
  return '<header class="dock-wrap"><nav class="dock" aria-label="Navegação principal">' +
    '<a class="dock-brand" href="' + (perfil === 'gestor' ? '/gestor' : '/') + '"><span class="brand-mark">M</span><span class="brand-txt">MOAI<small>CS</small></span></a><span class="dock-sep"></span>' +
    partes.join('') +
    '<span class="dock-fill"></span><label class="dsearch"><svg aria-hidden="true"><use href="#i-search"/></svg><input type="text" id="dockBusca" aria-label="' + busca + '" placeholder="' + busca + '"><kbd>Ctrl K</kbd></label>' +
    '<span class="dsync" id="dockSync" title="' + titSync + '"><i></i>' + marcaSync + '</span>' +
    '<span class="av" style="background:var(--gold);color:var(--side)" aria-label="Perfil">' + esc((opcoes.inicial || '?').slice(0, 1).toUpperCase()) + '</span></nav></header>';
}
