// Front-end adaptado do doc "Index" (Apps Script HtmlService) original do projeto MOAI.
// CSS e JS mantidos quase idênticos ao original — a única mudança estrutural é o bloco
// RUNTIME_SHIM logo no início do <script>, que substitui google.script.run por chamadas
// fetch() às rotas /api/* deste app Next.js. Todos os pontos de chamada no resto do arquivo
// (google.script.run.withSuccessHandler(...).withFailureHandler(...).getX(...)) ficam
// EXATAMENTE como no original, sem precisar tocar em cada um — o shim implementa a mesma
// interface.
//
// PENDÊNCIA (ver claude/migracao_vercel_supabase.md): --logo-black continua sem valor real —
// o próprio doc "Index" do projeto MOAI só tem um placeholder "COLE_AQUI_O_VALOR_ORIGINAL" ali,
// o base64 do logo preto nunca foi capturado em lugar nenhum a que eu tenha acesso. Por isso o
// topo mostra o texto "MOAI" como respaldo (ver .brand-logo) em vez da imagem do logo — pra
// corrigir de vez, preciso que o Vitor me passe o arquivo/base64 original do logo. A imagem do
// emblema "CS Destaque" (.jornada-badge-img-wrap img) e a máscara --m-white foram atualizadas
// abaixo com os valores reais, copiados do doc "Index".
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@700;800&display=swap" rel="stylesheet">
<style>
:root {
  /* PENDÊNCIA: base64 real do logo MOAI preto do topo ainda não disponível — ver comentário
     no topo deste arquivo. Placeholder = pixel transparente 1x1, escondido via .brand-logo. */
  --logo-black: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=);
  /* M da MOAI usado como máscara do "M líquido" nos cards de KPI — valor real, copiado do doc "Index". */
  --m-white: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABiCAYAAACvUNYzAAAC70lEQVR42u2dMWtUQRSFzyz+An+AKVJZpQgWsUiVJlumSyeKpBEsIph/EBBttLHYFdLY2bqFlQS0iZDKSgKm9zeMzUCCqGyWO3PPnTkHAtns2zv33I839828xyblnCH5aaISCIAASFwAZgDyDX42Bq7fxg1rNatxBpwPDOC8xhmwika8lDLxbNkDvg9UfDOvlgDuAtgfoPj7xSvlVdD7AQCYeqxxGdpzPzD3NomSaI/Fr70QO+6o+NW81ARw1BGAo4gAepmKqnqYRDcQPfdWm3EfAxa/Sc6tAOwC2ApU/K2SczcAAOBLIADNcm19PyBCP2iao8cNmZ/ExW+emweAOwAOCIt/UHLrHgAAvCUE4JKT5z1hpn7glstkVOMsOTA8FfFm0LFpADwZdGwaAF7TAEUPYnowK49WfDYAAPC5kzHCAtgGsFMx/k4ZQwD+o09BY3cDoNYcTbkRaA1gbhjrF2msOfsZ8MAozm0AhwZxDkssJm9VAZwAuDSK9ZIkBoqnkyg9YI1k7s6knpo04eQMIZN6aXoVdM+p+c1JPTQHcAZgYRTrIYD1JY5bL8daaFE8hF4HTA1j/TA6xiN314VYq34QYt73WglbGjpb8m/UxffYinhhFGcTwN6113uEOVICeG4Y68Mfv28S5kgHoEY/CDfvewNwMcqak+d29COi4rvl4gngHYALguJflFyGA4AlV7Zd58BwRywNOjYNAAC4P8iYtAC+wm7TbhktypgCcE3TTscKA6DVnEy1BmF8LCWNUnxWAADwKkjMbgE8CxKzWwDW00ViNcn+vaGp5+JHAAAAj50+KwBFM6z2pN0l/vJFqQKwmtYafUYAjObyFMVUtC/v3jY6RgBW1Cn+vWn3rbx3KgB1NV3xPQGo3A9SRCO3EFcJV4+kpKgmIgMAgNfB8w8P4Gl0APofMgIgAJIACIAkAAIgCYAASAIgAJIACIAkAAIgCYAASAIgAJIACIAkAAIgVVDKOasKOgMEQJLG1G93i33gLv0k4gAAAABJRU5ErkJggg==);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: #F5F5F5; color: #5D5D5D; font-size: 13px; -webkit-font-smoothing:antialiased; }
.num { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; }
svg.icon { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vertical-align: -3px; margin-right: 5px; }
.section-title { font-size: 11px; font-weight: 800; color: #9F9F9F; text-transform: uppercase; letter-spacing: 0.8px; margin: 6px 0 14px; display:flex; align-items:center; gap:8px; }
.section-title .line { flex:1; height:0.75pt; background:#C6C4C4; }

/* ===== topo fixo ===== */
.topbar { display:flex; align-items:center; justify-content:space-between; padding: 16px 28px; background:rgba(245,245,245,0.85); backdrop-filter: blur(10px); border-bottom: 0.75pt solid #C6C4C4; position: sticky; top:0; z-index:20; flex-wrap:wrap; gap:10px; }
.brand { display:flex; align-items:center; gap:12px; cursor:pointer; }
.brand-logo { height: 20px; min-width: 60px; width: auto; overflow: visible; white-space: nowrap; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:17px; letter-spacing:0.5px; color:#1A1A1A; display:flex; align-items:center; }
.topbar-right { display:flex; align-items:center; gap:10px; }
.live-dot { width:7px; height:7px; border-radius:50%; background:#3D8B5F; display:inline-block; margin-right:6px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }

/* barra de progresso indeterminada enquanto busca dados no Postgres */
.progress-bar { position:sticky; top:0; z-index:30; height:2.5px; background:transparent; overflow:hidden; display:none; }
.progress-bar.ativo { display:block; }
.progress-bar-fill { height:100%; width:40%; background:linear-gradient(90deg,#008F72,#00A58D); animation: progresso 1.1s ease-in-out infinite; }
@keyframes progresso { 0%{ transform:translateX(-100%); } 100%{ transform:translateX(350%); } }
.live-label { font-size: 10.5px; color:#807E7E; font-weight:600; }
select.pickmes { background:#fff; color:#1A1A1A; border: 0.75pt solid #D8D5D5; border-radius: 10px; padding: 7px 12px; font-family:'Inter',sans-serif; font-size: 12px; font-weight: 700; cursor:pointer; transition: border-color .2s; }
select.pickmes:hover { border-color:#1A1A1A; }
.back-link { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#5D5D5D; cursor:pointer; transition: color .15s; }
.back-link:hover { color:#1A1A1A; }

.screen { animation: fadeIn .45s cubic-bezier(.22,1,.36,1); }
@keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none; } }

/* ===== home ===== */
#screenHome { padding: 56px 28px 80px; max-width: 1040px; margin: 0 auto; text-align:center; }
.home-title { font-size: 30px; font-weight:800; color:#1A1A1A; letter-spacing:-0.5px; margin-bottom:6px; }
.home-sub { font-size: 13.5px; color:#807E7E; margin-bottom:40px; }
.team-grid { display:flex; flex-wrap:wrap; justify-content:center; gap:24px; margin-bottom: 64px; }
.team-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:26px; padding:26px 22px; cursor:pointer; transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .25s; width: 178px; }
.team-card:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 16px 32px rgba(0,0,0,0.08); border-color:#1A1A1A; }
.team-photo { width:104px; height:104px; border-radius:50%; object-fit:cover; margin: 0 auto 16px; display:block; background:#E9E9E9; transition: transform .25s; }
.team-card:hover .team-photo { transform: scale(1.05); }
.team-photo-fallback { width:104px; height:104px; border-radius:50%; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:800; color:#fff; }
.team-name { font-size: 14.5px; font-weight: 800; color:#1A1A1A; }
.team-role { font-size: 10.5px; color:#9F9F9F; margin-top:3px; text-transform:uppercase; letter-spacing:0.5px; }
#equipeSection { text-align:left; }

.skel { position:relative; overflow:hidden; background:#E9E9E9; }
.skel::after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: shimmer 1.3s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }

/* ===== próximos conselhos (home) ===== */
.proximos-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:12px; }
.proximo-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:15px 18px; display:flex; align-items:center; gap:12px; transition: transform .2s, box-shadow .2s; }
.proximo-card.clicavel { cursor:pointer; }
.proximo-card.clicavel:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color:#1A1A1A; }
.proximo-data-badge { display:flex; flex-direction:column; align-items:center; justify-content:center; width:52px; height:52px; border-radius:14px; background:#1A1A1A; color:#fff; flex-shrink:0; }
.proximo-data-dia { font-size:18px; font-weight:800; font-family:'Bricolage Grotesque',sans-serif; line-height:1; }
.proximo-data-mes { font-size:8.5px; font-weight:700; text-transform:uppercase; color:#9F9F9F; margin-top:2px; }
.proximo-info { flex:1; min-width:0; }
.proximo-nome { font-size:12.5px; font-weight:800; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.proximo-sub { font-size:10.5px; color:#9F9F9F; margin-top:2px; }

/* ===== pessoa ===== */
#screenPessoa { display:none; }
.pessoa-conteudo { padding: 0 28px 40px; max-width:1040px; margin:0 auto; }

/* hero escuro, estilo "jornada individual" */
.jornada-hero { background:#111111; color:#fff; padding: 40px 28px 34px; margin-bottom: 28px; }
.jornada-hero-inner { max-width:1040px; margin:0 auto; display:flex; gap:34px; align-items:flex-start; }
.jornada-eyebrow { font-size: 10.5px; font-weight: 800; color:#9F9F9F; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:14px; }
.jornada-photo { width:130px; height:130px; border-radius:22px; object-fit:cover; background:#242424; flex-shrink:0; }
.jornada-photo-fallback { width:130px; height:130px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-size:38px; font-weight:800; color:#fff; flex-shrink:0; }
.jornada-nome { font-family:'Bricolage Grotesque', sans-serif; font-weight:800; font-size: 46px; line-height:1.05; letter-spacing:-1px; color:#fff; margin-bottom:12px; }
.jornada-sub { font-size: 13.5px; color:#B7B5B5; margin-bottom:4px; }
.jornada-meta { font-size: 11px; color:#7A7878; margin-top:16px; }
.jornada-proximo { display:inline-flex; align-items:center; gap:8px; margin-top:14px; background:rgba(255,255,255,0.08); border:0.75pt solid rgba(255,255,255,0.14); border-radius:99px; padding:8px 16px 8px 8px; font-size:12px; font-weight:700; color:#e5e5e5; }
.jornada-badge { margin-left:auto; flex-shrink:0; display:none; flex-direction:column; align-items:center; padding-top:4px; }
.jornada-badge-img-wrap { position:relative; width:104px; }
.jornada-badge-img-wrap img { width:100%; height:auto; display:block; filter:drop-shadow(0 6px 18px rgba(212,175,55,0.4)); }
.jornada-badge-count { position:absolute; bottom:-2px; right:-6px; min-width:26px; height:26px; padding:0 6px; border-radius:99px; background:#111; border:2px solid #D4AF37; color:#F5D273; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.jornada-badge-label { font-size:9.5px; font-weight:800; color:#D4AF37; text-transform:uppercase; letter-spacing:1px; margin-top:8px; text-align:center; }
.jornada-proximo .proximo-data-badge { width:34px; height:34px; border-radius:10px; background:#3D8B5F; }
.jornada-proximo .proximo-data-dia { font-size:13px; }
.jornada-proximo .proximo-data-mes { font-size:6.5px; color:rgba(255,255,255,0.75); }

.destaques-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; padding: 22px 28px 0; max-width:1040px; margin:0 auto 30px; }
.destaque-card { background:#1A1A1A; border-radius:20px; padding:18px 18px; color:#fff; min-height:110px; display:flex; flex-direction:column; justify-content:space-between; }
.destaque-label { font-size: 10px; font-weight: 800; color: #9F9F9F; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom:10px; }
.destaque-valor { font-size: 14.5px; font-weight:700; color:#fff; line-height:1.4; }
.destaque-valor.vazio { color:#6E6C6C; font-style:italic; font-weight:500; }

.tabs { display: flex; border-bottom: 0.75pt solid #C6C4C4; margin-bottom: 22px; gap: 4px; padding: 0 28px; max-width:1040px; margin-left:auto; margin-right:auto; }
.tab { padding: 10px 4px; margin-right:22px; font-size: 12px; font-weight: 700; color: #9F9F9F; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
.tab:hover { color: #5D5D5D; }
.tab.active { color: #1A1A1A; border-bottom-color: #1A1A1A; }
.panel { display: none; animation: fadeIn .35s cubic-bezier(.22,1,.36,1); }
.panel.active { display: block; }

/* ===== KPI cards com M líquido ===== */
.grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 14px; }
.kpi { background: #1A1A1A; border-radius: 24px; padding: 20px 20px 24px; color:#fff; display:flex; flex-direction:column; min-height: 220px; transition: transform .2s; position:relative; }
.kpi:hover { transform: translateY(-2px); }
.kpi-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px; }
.kpi-label-wrap { display:flex; flex-direction:column; gap:5px; }
.kpi-label { font-size: 12px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 0.6px; }
.kpi-fonte { font-size: 8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#6E6C6C; display:flex; align-items:center; gap:4px; }
.kpi-fonte.manual { color:#7fe3ac; }
.kpi-fonte-dot { width:5px; height:5px; border-radius:50%; background:currentColor; display:inline-block; }
.kpi-pill { display: inline-flex; align-items:center; gap:4px; border-radius: 99px; padding: 4px 10px; font-size: 9.5px; font-weight: 800; white-space:nowrap; flex-shrink:0; }
.pg { background: rgba(61,139,95,0.22); color:#7fe3ac; }
.py { background: rgba(200,154,46,0.22); color:#f0c869; }
.pr { background: rgba(192,67,61,0.22); color:#f0918c; }
.pgray { background: rgba(255,255,255,0.1); color:#9F9F9F; }
.kpi-body { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; flex:1; gap:10px; padding-top:4px; }
.m-fill-wrap { width:76px; height:76px; flex-shrink:0; position:relative; -webkit-mask-image: var(--m-white); mask-image: var(--m-white); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position:center; mask-position:center; background: rgba(255,255,255,0.12); }
.m-fill-liquid { position:absolute; left:0; right:0; bottom:0; height:0%; transition: height 1.1s cubic-bezier(.16,1,.3,1); }
.m-fill-liquid.g { background: linear-gradient(180deg,#6ee7b7,#059669); }
.m-fill-liquid.y { background: linear-gradient(180deg,#fbbf24,#d97706); }
.m-fill-liquid.r { background: linear-gradient(180deg,#f87171,#dc2626); }
.m-fill-liquid.gray { background: linear-gradient(180deg,#666,#444); }
.kpi-value-block { width:100%; }
.kpi-realizado { font-size: 44px; line-height:1; }
.kpi-sub { font-size: 11.5px; color:#9F9F9F; margin-top:8px; }
.c-g{color:#6ee7b7;}.c-y{color:#fbbf24;}.c-r{color:#f87171;}.c-gray{color:#807E7E;}

.gtd-card { background:#1A1A1A; border-radius:24px; padding:22px 24px 20px; color:#fff; margin-top:2px; }
.gtd-card-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.gtd-card-label { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#D4AF37; display:flex; align-items:center; gap:8px; }
.gtd-card-valor { font-size:22px; font-weight:800; color:#F5D273; }
.gtd-card-bar-bg { height:12px; background:#2A2A2A; border-radius:99px; overflow:hidden; }
.gtd-card-bar-fill { height:100%; background:linear-gradient(90deg,#8a6d1c,#D4AF37,#F5D273); border-radius:99px; transition: width 1s cubic-bezier(.16,1,.3,1); }
.gtd-card-sub { font-size:11px; color:#807E7E; margin-top:10px; line-height:1.5; }

.dark-card { background:#1A1A1A; border-radius:24px; padding:22px 24px; color:#fff; }
.dark-label { font-size: 10.5px; font-weight: 800; color: #9F9F9F; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
.dark-value { font-size: 34px; color:#fff; line-height:1; }
.dark-sub { font-size: 10.5px; color:#807E7E; margin-top:6px; }
.hero-grid { display:grid; grid-template-columns: 1.3fr 1fr; gap:14px; margin-bottom:18px; align-items:stretch; }
.hero-grid .dark-card { display:flex; flex-direction:column; justify-content:center; }
.mini-stats { display:grid; grid-template-columns:1fr 1fr; gap: 14px; }
.mini-stat { background:#242424; border-radius:16px; padding:14px 16px; }

.diag { background:#fff; border:0.75pt solid #D8D5D5; border-radius:20px; padding:18px 20px; }
.diag-title { font-size: 10.5px; font-weight: 800; color: #9F9F9F; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
.diag-line { font-size: 12.5px; color:#5D5D5D; padding: 6px 0; border-bottom: 0.75pt solid #E9E9E9; display:flex; align-items:center; }
.diag-line:last-child { border-bottom:none; }
.diag-line strong { color:#1A1A1A; }

/* ===== semanal ===== */
.chart-card { background:#1A1A1A; border-radius: 24px; padding:22px 24px; margin-bottom:16px; color:#fff; }
.chart-title { font-size: 10.5px; font-weight: 800; color: #9F9F9F; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 16px; }
.week-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:12px; }
.week-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:16px 18px; transition: transform .2s; }
.week-card:hover { transform: translateY(-2px); }
.week-date { font-size:10.5px; font-weight:700; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:12px; display:flex; align-items:center; }
.week-stats { display:flex; gap:10px; }
.week-stat { flex:1; text-align:center; }
.week-stat .val { font-size:22px; }
.week-stat .lbl { font-size:9.5px; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.5px; margin-top:3px; }

.cases-hero-card { display:flex !important; flex-direction:row !important; flex-wrap:nowrap; align-items:center; justify-content:flex-start; gap:24px; text-align:left; }
.cases-hero-text { flex:1; min-width:0; text-align:left; }
.case-card { cursor:pointer; transition: transform .2s, box-shadow .2s; }
.case-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color:#1A1A1A; }

.case-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:100; align-items:center; justify-content:center; padding:24px; }
.case-modal-overlay.ativo { display:flex; }
.case-modal { background:#fff; border-radius:26px; max-width:640px; width:100%; max-height:85vh; overflow-y:auto; padding:32px; position:relative; animation: fadeIn .25s cubic-bezier(.22,1,.36,1); }
.case-modal-close { position:absolute; top:20px; right:20px; width:32px; height:32px; border-radius:50%; background:#F5F5F5; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; color:#5D5D5D; transition: background .15s; }
.case-modal-close:hover { background:#E9E9E9; }
.case-modal-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:24px; padding-right:36px; }
.case-modal-nome { font-family:'Bricolage Grotesque', sans-serif; font-weight:800; font-size:24px; color:#1A1A1A; }
.case-modal-empresa { font-size:13px; color:#807E7E; margin-top:2px; }
.case-modal-tags { font-size:11px; color:#9F9F9F; margin-top:8px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; }
.case-modal-impacto { font-size:14px; color:#C89A2E; white-space:nowrap; }
.case-modal-campo { margin-bottom:20px; }
.case-modal-campo:last-child { margin-bottom:0; }
.case-modal-label { font-size:10.5px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px; }
.case-modal-texto { font-size:13px; color:#3a3a3a; line-height:1.7; white-space:pre-line; }

.membro-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:0.75pt solid #E9E9E9; }
.membro-row:last-child { border-bottom:none; }
.membro-avatar { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11.5px; color:#fff; flex-shrink:0; }
.membro-nome { flex:1; font-size:12.5px; font-weight:700; color:#1A1A1A; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.membro-bar-bg { width:100px; height:6px; background:#E9E9E9; border-radius:99px; overflow:hidden; flex-shrink:0; }
.membro-bar-fill { height:100%; border-radius:99px; }
.membro-taxa { width:38px; text-align:right; font-size:12.5px; font-weight:800; flex-shrink:0; }
.membro-detalhe { font-size:10px; color:#9F9F9F; flex-shrink:0; white-space:nowrap; }
.confirmado-chip { display:inline-flex; align-items:center; gap:6px; background:#F5F5F5; border:0.75pt solid #D8D5D5; border-radius:99px; padding:6px 12px 6px 6px; font-size:11.5px; font-weight:700; color:#1A1A1A; margin:0 8px 8px 0; }
.confirmado-avatar { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; color:#fff; }
.confirmado-mes { color:#807E7E; font-weight:600; }
.gtd-etapa-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:0.75pt solid #EEECEC; font-size:12.5px; color:#807E7E; }
.gtd-etapa-row:last-child { border-bottom:none; }
.gtd-etapa-row.feito { color:#3D8B5F; font-weight:600; }
.gtd-etapa-row.feito .gtd-etapa-label { color:#1A1A1A; }
.gtd-etapa-check { display:flex; flex-shrink:0; }

.ranking-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:14px; }
.ranking-card { background:#1A1A1A; border-radius:22px; padding:20px 22px; color:#fff; }
.ranking-title { font-size:11px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:16px; }
.ranking-row { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:0.75pt solid #2A2A2A; }
.ranking-row:last-child { border-bottom:none; }
.ranking-pos { width:20px; font-size:12px; font-weight:800; color:#6E6C6C; flex-shrink:0; }
.ranking-row:nth-child(1) .ranking-pos { color:#f0c869; }
.ranking-nome { flex:1; font-size:12.5px; color:#e5e5e5; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ranking-valor { font-size:14px; font-weight:800; color:#fff; flex-shrink:0; }
.ranking-empty { font-size:11.5px; color:#6E6C6C; font-style:italic; }

.cstop-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
.cstop-card { background:#1A1A1A; border-radius:24px; padding:24px 20px; color:#fff; text-align:center; position:relative; overflow:hidden; }
.cstop-card.pos1 { background:linear-gradient(160deg,#1A1A1A,#2b2410); border:0.75pt solid #f0c869; }
.cstop-medalha { font-size:11px; font-weight:800; color:#f0c869; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; }
.cstop-card.pos2 .cstop-medalha { color:#cfcfcf; }
.cstop-card.pos3 .cstop-medalha { color:#c89a6a; }
.cstop-foto { width:64px; height:64px; border-radius:50%; object-fit:cover; margin:0 auto 12px; display:block; background:#333; }
.cstop-foto-fallback { width:64px; height:64px; border-radius:50%; margin:0 auto 12px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:#fff; }
.cstop-nome { font-size:14.5px; font-weight:800; color:#fff; margin-bottom:6px; }
.cstop-score { font-size:30px; }
.cstop-score-lbl { font-size:9.5px; color:#807E7E; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px; }

.attention-box { background: #fff; border: 0.75pt solid #C0433D; border-radius: 18px; padding: 16px 20px; margin-bottom: 20px; }
.attention-title { font-size: 11px; font-weight: 800; color: #C0433D; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; display:flex; align-items:center; }
.attention-box ul { list-style: none; }
.attention-box li { font-size: 12.5px; color: #5D5D5D; padding: 4px 0; padding-left: 14px; position: relative; }
.attention-box li::before { content: '—'; position: absolute; left: 0; color: #C0433D; }
.attention-desc { font-size: 12.5px; color:#5D5D5D; padding-left:14px; line-height:1.6; }
.council-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px,1fr)); gap:14px; }
.council-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:20px; padding:18px; position:relative; transition: transform .2s; }
.council-card.clicavel { cursor:pointer; }
.council-card.clicavel:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color:#1A1A1A; }
.council-card.congelado { opacity: 0.55; }
.avatar { width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; color:#fff; margin-bottom:14px; }
.avatar-foto { width:44px; height:44px; border-radius:14px; object-fit:cover; margin-bottom:14px; display:block; background:#242424; }
.modal-avatar-foto { width:52px; height:52px; border-radius:16px; object-fit:cover; flex-shrink:0; background:#242424; }
.badge-congelado { position:absolute; top:14px; right:14px; background:#E9E9E9; color:#807E7E; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; padding:3px 8px; border-radius:99px; }
.council-name { font-size:13.5px; font-weight:800; color:#1A1A1A; margin-bottom:1px; }
.council-sub { font-size:10.5px; color:#9F9F9F; margin-bottom:14px; }
.council-gtd-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(212,175,55,0.16); border:0.75pt solid rgba(212,175,55,0.5); color:#D4AF37; font-size:10px; font-weight:800; padding:4px 10px; border-radius:99px; margin-bottom:12px; }
.council-gtd-badge svg { width:11px; height:11px; }
.council-pct-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:9px; }
.council-pct { font-size:24px; }
.council-members { font-size:10.5px; color:#9F9F9F; }
.council-bar { display:flex; height:6px; border-radius:99px; overflow:hidden; background:#E9E9E9; }
.seg-presente { background:#3D8B5F; transition: width .8s cubic-bezier(.16,1,.3,1); }
.seg-ausente { background:#C0433D; transition: width .8s cubic-bezier(.16,1,.3,1); }
.seg-reposicao { background:#7dd3fc; transition: width .8s cubic-bezier(.16,1,.3,1); }
.council-legend { display:flex; gap:18px; font-size:10.5px; color:#807E7E; margin:18px 0; }
.legend-dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:5px; vertical-align:middle; }
.council-pending { font-size:11px; color:#C89A2E; font-style:italic; margin-top:2px; display:flex; align-items:center; }
.confirm-badge { position:relative; display:inline-flex; align-items:center; gap:6px; color:#fff; font-size:10.5px; font-weight:800; padding:6px 12px; border-radius:99px; cursor:default; }
.confirm-badge .icon { margin-right:0; }
.confirm-tooltip { display:none; position:absolute; bottom:calc(100% + 9px); left:50%; transform:translateX(-50%); background:#1A1A1A; color:#e5e5e5; font-size:10px; font-weight:600; font-style:normal; white-space:nowrap; padding:9px 13px; border-radius:10px; box-shadow:0 10px 24px rgba(0,0,0,0.28); z-index:5; }
.confirm-tooltip::after { content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%); border:5px solid transparent; border-top-color:#1A1A1A; }
.confirm-badge:hover .confirm-tooltip { display:block; }
.council-proxima { font-size:11px; color:#5D5D5D; margin-top:12px; display:flex; align-items:center; font-weight:700; }
.council-proxima.futura { color:#3D8B5F; }
.council-proxima.passada { color:#9F9F9F; font-weight:600; font-style:italic; }

.destaque-form-card { background:#1A1A1A; border-radius:24px; padding:20px 24px; margin-bottom:20px; color:#fff; display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.destaque-form-label { font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#D4AF37; display:flex; align-items:center; gap:8px; }
.destaque-form-desc { font-size:11px; color:#9F9F9F; flex:1; min-width:180px; }
.destaque-form-input { width:64px; background:#0F0F0F; border:0.75pt solid #3A3A3A; border-radius:10px; color:#fff; font-size:14px; font-weight:700; text-align:center; padding:8px 6px; }
.destaque-form-btn { background:#D4AF37; color:#1A1A1A; border:none; border-radius:10px; padding:9px 16px; font-size:12px; font-weight:800; cursor:pointer; }
.destaque-form-btn:disabled { opacity:0.6; cursor:default; }
.destaque-form-status { font-size:11px; font-weight:700; color:#3D8B5F; }
.votos-bar-card { background:#1A1A1A; border-radius:24px; padding:22px 24px; margin-bottom:20px; color:#fff; }
.voto-row { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.voto-row:last-child { margin-bottom:0; }
.voto-row-label { width:230px; font-size:11.5px; color:#e5e5e5; flex-shrink:0; }
.voto-row-bar-bg { flex:1; height:8px; background:#333; border-radius:99px; overflow:hidden; }
.voto-row-bar-fill { height:100%; background: linear-gradient(90deg,#059669,#6ee7b7); border-radius:99px; width:0%; transition: width 1s cubic-bezier(.16,1,.3,1); }
.voto-row-num { width:24px; text-align:right; font-size:13px; font-weight:800; }
.fb-intro { font-size:11.5px; color:#807E7E; margin-bottom:14px; line-height:1.6; max-width:640px; }
.fb-line-wrap { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.fb-line-wrap span { font-size:11px; font-weight:800; white-space:nowrap; text-transform: uppercase; letter-spacing: 0.4px; display:flex; align-items:center; color:#1A1A1A; }
.fb-line { flex:1; height:0.75pt; background:#C6C4C4; }
.quote-block { background:#fff; border:0.75pt solid #D8D5D5; border-radius:16px; padding:18px 20px; margin-bottom:9px; position:relative; }
.quote-mark { font-family:'Bricolage Grotesque', sans-serif; font-size:34px; font-weight:800; color:#E9E9E9; position:absolute; top:2px; left:14px; line-height:1; }
.quote-text { font-size:12.5px; color:#5D5D5D; line-height:1.75; font-style:italic; padding-left:14px; }
.fb-mais { font-size:11px; color:#9F9F9F; padding:8px 4px; font-style:italic; }
.no-feedback { background:#fff; border:0.75pt solid #D8D5D5; border-radius:20px; padding:32px; text-align:center; }
.no-feedback-title { font-size:14px; font-weight: 800; color: #1A1A1A; margin-bottom:8px; }
.no-feedback-sub { font-size: 11.5px; color: #807E7E; line-height:1.7; max-width:520px; margin:0 auto; }

.empty-state { text-align:center; padding:60px 20px; color:#9F9F9F; font-size:12.5px; }
</style>
</head>
<body>

<div class="progress-bar" id="progressBar"><div class="progress-bar-fill"></div></div>
<div class="topbar">
  <div class="brand" onclick="showHome()"><div class="brand-logo">MOAI</div></div>
  <div class="topbar-right" id="topbarRight"></div>
</div>

<div id="screenHome" class="screen">
  <div class="home-title">Time de CS</div>
  <div class="home-sub">Selecione um CS para ver os indicadores, em tempo real.</div>
  <div class="team-grid" id="teamGrid"></div>
  <div id="equipeSection">
    <div class="section-title">Próximos conselhos<div class="line"></div></div>
    <div id="equipeProximosConselhos"></div>
    <div class="section-title" style="margin-top:36px;">Indicadores gerais da área<div class="line"></div></div>
    <div id="equipeIndicadores"></div>
    <div class="section-title" style="margin-top:36px;">Cases de sucesso do time<div class="line"></div></div>
    <div id="equipeSemanal"></div>
    <div class="section-title" style="margin-top:36px;">Conselhos — visão consolidada<div class="line"></div></div>
    <div id="equipeConselhos"></div>
    <div class="section-title" style="margin-top:36px;">Impacto dos conselhos<div class="line"></div></div>
    <div id="equipeImpactoConselhos"></div>
    <div class="section-title" style="margin-top:36px;">CS Top 3<div class="line"></div></div>
    <div id="csTop"></div>
    <div class="section-title" style="margin-top:36px;">Ranking do time<div class="line"></div></div>
    <div id="equipeRanking"></div>
  </div>
</div>

<div id="screenPessoa">
  <div class="jornada-hero">
    <div class="jornada-hero-inner">
      <div class="jornada-photo skel" id="pessoaFotoSkel" style="display:none;"></div>
      <img class="jornada-photo" id="pessoaFoto" style="display:none;">
      <div class="jornada-photo-fallback" id="pessoaFotoFallback" style="display:none;"></div>
      <div>
        <div class="jornada-eyebrow">Jornada individual</div>
        <div class="jornada-nome" id="pessoaNome"></div>
        <div class="jornada-sub" id="pessoaSub"></div>
        <div class="jornada-meta" id="pessoaMeta"></div>
        <div id="pessoaProximoConselho"></div>
      </div>
      <div class="jornada-badge" id="pessoaBadgeDestaque">
        <div class="jornada-badge-img-wrap">
          <img src="data:image/png;base64,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">
          <div class="jornada-badge-count" id="pessoaBadgeCount"></div>
        </div>
        <div class="jornada-badge-label">CS Destaque</div>
      </div>
    </div>
  </div>
  <div class="destaques-grid" id="destaquesGrid"></div>
  <div class="tabs">
    <div class="tab active" onclick="showTab('indicadores',event)">Indicadores</div>
    <div class="tab" onclick="showTab('semanal',event)">Cases de Sucesso</div>
    <div class="tab" onclick="showTab('conselhos',event)">Conselhos</div>
    <div class="tab" onclick="showTab('feedbacks',event)">Feedbacks</div>
  </div>
  <div class="pessoa-conteudo">
    <div id="indicadores" class="panel active"></div>
    <div id="semanal" class="panel"></div>
    <div id="conselhos" class="panel"></div>
    <div id="feedbacks" class="panel"></div>
  </div>
</div>

<script>
// ============ RUNTIME_SHIM ============
// Substitui google.script.run (Apps Script) por chamadas fetch() às rotas /api/* deste app
// Next.js. Implementa a mesma interface encadeada (withSuccessHandler/withFailureHandler +
// nome da função) usada em todo o resto deste arquivo, então nenhuma chamada de
// google.script.run.withSuccessHandler(...).withFailureHandler(...).getX(...) precisou mudar.
function fetchJSON_(url, opts) {
  // cache:'no-store' força o navegador a nunca servir uma resposta cacheada dessas rotas /api/*
  // (mesmo sem essa opção o Next.js já marca as rotas como force-dynamic no servidor, mas o
  // fetch() do navegador podia ficar com uma cópia antiga em cache HTTP local — foi isso que
  // fez o time de CS errado (roster antigo) continuar aparecendo mesmo depois do hard refresh).
  opts = opts || {};
  opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
      return data;
    });
  });
}
var API_MAP_ = {
  getEquipeComFotos: function () { return fetchJSON_('/api/equipe-fotos'); },
  getReportPublico: function (nome, mes, ano) {
    return fetchJSON_('/api/cs/' + encodeURIComponent(nome) + '?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano));
  },
  getEquipeReportPublico: function (mes, ano) {
    return fetchJSON_('/api/equipe?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano));
  },
  getCaseDetalhePublico: function (itemId) { return fetchJSON_('/api/case/' + encodeURIComponent(itemId)); },
  getVezesDestaquePublico: function (nome) {
    return fetchJSON_('/api/destaque/' + encodeURIComponent(nome)).then(function (r) { return r.vezes; });
  },
  setVezesDestaquePublico: function (nome, vezes) {
    return fetchJSON_('/api/destaque/' + encodeURIComponent(nome), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vezes: vezes }),
    }).then(function (r) { return r.vezes; });
  },
};
function makeRunner_() {
  var successHandler = function () {}, failureHandler = function () {};
  var runner = {
    withSuccessHandler: function (fn) { successHandler = fn; return runner; },
    withFailureHandler: function (fn) { failureHandler = fn; return runner; },
  };
  Object.keys(API_MAP_).forEach(function (name) {
    runner[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      API_MAP_[name].apply(null, args).then(function (data) { successHandler(data); }).catch(function (err) { failureHandler(err); });
    };
  });
  return runner;
}
var google = { script: { get run() { return makeRunner_(); } } };
// ============ fim do RUNTIME_SHIM — daqui pra baixo é o Index original, inalterado ============

var ICONS = {
  calendar: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  warning: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  clock: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  trophy: '<svg class="icon" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3a2 2 0 0 1-2 4M7 5H4a2 2 0 0 0 2 4"/></svg>',
  arrowleft: '<svg class="icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  target: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>'
};
var AVATAR_PALETTE = ['#3D8B5F','#7dd3fc','#C89A2E','#a78bfa','#f472b6','#C0433D','#60a5fa','#34d399'];
function corPara(nome){ var h=0; for (var i=0;i<nome.length;i++) h=nome.charCodeAt(i)+((h<<5)-h); return AVATAR_PALETTE[Math.abs(h)%AVATAR_PALETTE.length]; }
function corConfirmacao(qtd){
  if (qtd <= 1) return '#C0433D';
  if (qtd <= 3) return '#E8833A';
  if (qtd <= 5) return '#fbbf24';
  if (qtd <= 7) return '#3D8B5F';
  return '#3B82F6';
}
function iniciais(nome){ var p=nome.trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }

var MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function parseDataIsoLocal_(iso){
  var m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]));
}
function formatarDataConselho(iso){
  var d = parseDataIsoLocal_(iso);
  if (!d) return null;
  var dia = String(d.getDate()).padStart(2,'0');
  var mes = MESES_ABREV[d.getMonth()];
  var hora = String(d.getHours()).padStart(2,'0') + 'h' + (d.getMinutes() ? String(d.getMinutes()).padStart(2,'0') : '');
  return { dia: dia, mes: mes, hora: hora, texto: dia + '/' + String(d.getMonth()+1).padStart(2,'0') + ' às ' + hora };
}

var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var currentCS = null, currentMes = MESES[new Date().getMonth()], currentAno = new Date().getFullYear();

var cachePessoa = {}, cacheEquipe = {}, cacheFotos = null;
var requestSeq = 0;
var pendingCount = 0;
function chaveP(nome, mes, ano){ return nome + '|' + mes + '|' + ano; }
function chaveE(mes, ano){ return mes + '|' + ano; }
function pendingInc(){ pendingCount++; document.getElementById('progressBar').classList.add('ativo'); }
function pendingDec(){ pendingCount = Math.max(0, pendingCount-1); if (pendingCount===0) document.getElementById('progressBar').classList.remove('ativo'); }

function renderTopbar(){
  var isPessoa = currentCS !== null;
  var html = (isPessoa ? '<span class="back-link" onclick="showHome()">' + ICONS.arrowleft + 'Time</span>' : '') +
    '<select class="pickmes" id="selMes" onchange="onFiltroChange()"></select>' +
    '<select class="pickmes" id="selAno" onchange="onFiltroChange()"><option>2026</option><option>2027</option></select>' +
    '<span class="live-label"><span class="live-dot"></span>ao vivo</span>';
  document.getElementById('topbarRight').innerHTML = html;
  var selMes = document.getElementById('selMes');
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; selMes.appendChild(opt);
  MESES.forEach(function(m){ var o=document.createElement('option'); o.textContent=m; selMes.appendChild(o); });
  selMes.value = currentMes;
  document.getElementById('selAno').value = currentAno;
}

function onFiltroChange(){
  currentMes = document.getElementById('selMes').value;
  currentAno = Number(document.getElementById('selAno').value);
  if (currentCS) {
    var chave = chaveP(currentCS, currentMes, currentAno);
    if (cachePessoa[chave]) { renderDashboard(cachePessoa[chave]); animarMFills(); }
    else renderSkeletonPessoa();
    carregarRelatorio(currentCS, currentMes, currentAno);
  } else {
    carregarEquipe(currentMes, currentAno);
  }
}

renderTopbar();
function carregarFotosTime(){
  var grid = document.getElementById('teamGrid');
  if (cacheFotos) { pintarTeamGrid(cacheFotos); return; }
  pendingInc();
  google.script.run.withSuccessHandler(function(equipe){
    pendingDec();
    cacheFotos = equipe;
    pintarTeamGrid(equipe);
  }).withFailureHandler(function(){ pendingDec(); }).getEquipeComFotos();
}
function pintarTeamGrid(equipe){
  var grid = document.getElementById('teamGrid');
  grid.innerHTML = '';
  equipe.forEach(function(p, idx){
    var card = document.createElement('div'); card.className = 'team-card';
    card.style.animation = 'fadeIn .4s cubic-bezier(.22,1,.36,1) ' + (idx*0.05) + 's both';
    card.onclick = function(){ abrirPessoa(p.nome); };
    var fotoHtml = p.fotoUrl ? '<img class="team-photo" src="'+p.fotoUrl+'">' : '<div class="team-photo-fallback" style="background:'+corPara(p.nomeCompleto)+'">'+iniciais(p.nomeCompleto)+'</div>';
    card.innerHTML = fotoHtml + '<div class="team-name">'+p.nome+'</div><div class="team-role">Customer Success</div>';
    grid.appendChild(card);
  });
}
(function(){
  var grid = document.getElementById('teamGrid');
  for (var i=0;i<5;i++){
    var s = document.createElement('div'); s.className = 'team-card';
    s.innerHTML = '<div class="skel" style="border-radius:50%;width:104px;height:104px;margin:0 auto 16px;"></div><div class="skel" style="height:10px;border-radius:5px;width:70%;margin:0 auto 6px;"></div><div class="skel" style="height:7px;border-radius:5px;width:45%;margin:0 auto;"></div>';
    grid.appendChild(s);
  }
})();
carregarFotosTime();
renderSkeletonEquipe();
carregarEquipe(currentMes, currentAno);

function showHome(){
  document.getElementById('screenHome').style.display = 'block';
  document.getElementById('screenPessoa').style.display = 'none';
  currentCS = null;
  requestSeq++;
  renderTopbar();
  carregarEquipe(currentMes, currentAno);
}
function abrirPessoa(nome){
  currentCS = nome;
  document.getElementById('screenHome').style.display = 'none';
  document.getElementById('screenPessoa').style.display = 'block';
  renderTopbar();
  document.getElementById('pessoaBadgeDestaque').style.display = 'none';
  var chave = chaveP(nome, currentMes, currentAno);
  if (cachePessoa[chave]) {
    renderDashboard(cachePessoa[chave]);
    animarMFills();
  } else {
    renderSkeletonPessoa();
  }
  carregarRelatorio(nome, currentMes, currentAno);
  atualizarBadgeDestaque(nome);
}
function atualizarBadgeDestaque(nome){
  google.script.run.withSuccessHandler(function(vezes){
    if (currentCS !== nome) return;
    var elBadge = document.getElementById('pessoaBadgeDestaque');
    if (vezes > 0) { document.getElementById('pessoaBadgeCount').textContent = vezes; elBadge.style.display = 'flex'; }
    else { elBadge.style.display = 'none'; }
  }).withFailureHandler(function(){}).getVezesDestaquePublico(nome);
}

function skelKpi(){ return '<div class="kpi skel" style="background:#1A1A1A;"><div style="height:100%;"></div></div>'; }
function renderSkeletonPessoa(){
  document.getElementById('pessoaFoto').style.display='none';
  document.getElementById('pessoaFotoFallback').style.display='none';
  document.getElementById('pessoaFotoSkel').style.display='block';
  document.getElementById('pessoaNome').textContent = currentCS;
  document.getElementById('pessoaSub').textContent = 'Customer Success';
  document.getElementById('pessoaMeta').textContent = 'Carregando ' + currentMes + '/' + currentAno + '...';
  document.getElementById('pessoaProximoConselho').innerHTML = '';
  document.getElementById('destaquesGrid').innerHTML = Array(4).fill('<div class="destaque-card skel" style="height:110px;"></div>').join('');
  document.getElementById('indicadores').innerHTML = '<div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div><div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div><div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div>';
  document.getElementById('semanal').innerHTML = '<div class="chart-card skel" style="height:180px;"></div><div class="week-grid">'+Array(4).fill('<div class="week-card skel" style="height:90px;"></div>').join('')+'</div>';
  document.getElementById('conselhos').innerHTML = '<div class="council-grid">'+Array(3).fill('<div class="council-card skel" style="height:150px;"></div>').join('')+'</div>';
  document.getElementById('feedbacks').innerHTML = '<div class="votos-bar-card skel" style="height:120px;"></div><div class="quote-block skel" style="height:60px;"></div>';
}
function renderSkeletonEquipe(){
  document.getElementById('equipeProximosConselhos').innerHTML = '<div class="proximos-grid">'+Array(3).fill('<div class="proximo-card skel" style="height:60px;"></div>').join('')+'</div>';
  document.getElementById('equipeIndicadores').innerHTML = '<div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div>';
  document.getElementById('equipeSemanal').innerHTML = '<div class="chart-card skel" style="height:180px;"></div>';
  document.getElementById('equipeConselhos').innerHTML = '<div class="hero-grid"><div class="dark-card skel" style="height:160px;"></div><div class="dark-card skel" style="height:160px;"></div></div>';
  document.getElementById('csTop').innerHTML = '<div class="cstop-grid">'+Array(3).fill('<div class="cstop-card skel" style="height:180px;"></div>').join('')+'</div>';
  document.getElementById('equipeRanking').innerHTML = '<div class="ranking-grid">'+Array(6).fill('<div class="ranking-card skel" style="height:180px;"></div>').join('')+'</div>';
}

function carregarRelatorio(nome, mes, ano){
  var meuSeq = ++requestSeq;
  pendingInc();
  google.script.run.withSuccessHandler(function(data){
    pendingDec();
    cachePessoa[chaveP(nome, mes, ano)] = data;
    if (meuSeq === requestSeq && currentCS === nome && currentMes === mes && currentAno === ano) {
      renderDashboard(data);
      animarMFills();
    }
  }).withFailureHandler(function(err){
    pendingDec();
    if (meuSeq === requestSeq && currentCS === nome) {
      var msgErro = '<div class="empty-state">Erro ao consultar: ' + err.message + '</div>';
      document.getElementById('indicadores').innerHTML = msgErro;
      document.getElementById('semanal').innerHTML = msgErro;
      document.getElementById('conselhos').innerHTML = msgErro;
      document.getElementById('feedbacks').innerHTML = msgErro;
      document.getElementById('destaquesGrid').innerHTML = '';
    }
  }).getReportPublico(nome, mes, ano);
}
function carregarEquipe(mes, ano){
  var meuSeq = ++requestSeq;
  var chave = chaveE(mes, ano);
  if (cacheEquipe[chave]) { renderEquipe(cacheEquipe[chave]); animarMFills(document.getElementById('equipeIndicadores')); }
  else renderSkeletonEquipe();
  pendingInc();
  google.script.run.withSuccessHandler(function(data){
    pendingDec();
    cacheEquipe[chave] = data;
    if (currentCS === null && currentMes === mes && currentAno === ano) { renderEquipe(data); animarMFills(document.getElementById('equipeIndicadores')); }
  }).withFailureHandler(function(err){
    pendingDec();
    var msgErro = '<div class="empty-state">Erro ao consultar: ' + err.message + '</div>';
    document.getElementById('equipeIndicadores').innerHTML = msgErro;
    document.getElementById('equipeSemanal').innerHTML = msgErro;
    document.getElementById('equipeConselhos').innerHTML = msgErro;
    document.getElementById('csTop').innerHTML = msgErro;
    document.getElementById('equipeRanking').innerHTML = msgErro;
  }).getEquipeReportPublico(mes, ano);
}

var modoGeralAtual = false;
function calcIndicador(ind){
  var meta = modoGeralAtual ? null : ind.meta, alc = ind.alcancado, tipo = ind.tipoMeta;
  if (alc === null || alc === undefined) return { pct:0, cor:'gray', corTxt:'c-gray', pctLabel:'Sem registro', pill:'pgray', pillLabel:'Pendente' };
  if (meta === null || meta === undefined) return { pct: alc>0?60:0, cor:'y', corTxt:'c-y', pctLabel: modoGeralAtual ? 'Acumulado no ano' : 'Sem meta definida', pill:'py', pillLabel:'Acompanhar' };
  if (tipo === 'min') {
    var pctReal = meta>0 ? (alc/meta*100) : (alc>0?100:0);
    var pctVisual = Math.min(100, pctReal);
    if (alc >= meta) return { pct: pctVisual, cor:'g', corTxt:'c-g', pctLabel: Math.round(pctReal) + '% da meta', pill:'pg', pillLabel:'Meta batida' };
    if (pctReal >= 50) return { pct: pctVisual, cor:'y', corTxt:'c-y', pctLabel: Math.round(pctReal) + '% da meta', pill:'py', pillLabel:'Em andamento' };
    return { pct: pctVisual, cor:'r', corTxt:'c-r', pctLabel: (pctReal===0?'0% da meta':Math.round(pctReal)+'% da meta'), pill:'pr', pillLabel: pctReal===0?'Nenhum ainda':'Precisa acelerar' };
  } else {
    if (meta === 0) return alc===0
      ? { pct:100, cor:'g', corTxt:'c-g', pctLabel:'0% da meta', pill:'pg', pillLabel:'Zerado' }
      : { pct:100, cor:'r', corTxt:'c-r', pctLabel:'Fora da meta', pill:'pr', pillLabel:'Acima do limite' };
    var pctUso = (alc/meta*100);
    if (alc <= meta) return { pct: Math.min(100,pctUso), cor:'g', corTxt:'c-g', pctLabel: Math.round(pctUso) + '% da meta', pill:'pg', pillLabel:'Sob controle' };
    return { pct:100, cor:'r', corTxt:'c-r', pctLabel: Math.round(pctUso) + '% da meta', pill:'pr', pillLabel:'Acima do limite' };
  }
}
function kpiCard(label, ind, unidade){
  var c = calcIndicador(ind);
  var valorMostrado = (ind.alcancado===null||ind.alcancado===undefined) ? '—' : (unidade==='R$' ? 'R$ '+ind.alcancado.toLocaleString('pt-BR') : ind.alcancado);
  var metaMostrada = (ind.meta===null||ind.meta===undefined) ? '—' : ind.meta;
  var fonteHtml = ind.fonte ? '<span class="kpi-fonte'+(ind.fonte==='manual'?' manual':'')+'"><span class="kpi-fonte-dot"></span>'+(ind.fonte==='manual'?'Validado no Monday':'Calculado automático')+'</span>' : '';
  var subLabel = modoGeralAtual ? c.pctLabel : ('meta '+metaMostrada+' · '+c.pctLabel);
  return '<div class="kpi"><div class="kpi-top"><div class="kpi-label-wrap"><div class="kpi-label">'+label+'</div>'+fonteHtml+'</div><span class="kpi-pill '+c.pill+'">'+c.pillLabel+'</span></div>' +
    '<div class="kpi-body"><div class="m-fill-wrap"><div class="m-fill-liquid '+c.cor+'" style="height:0%;" data-target="'+c.pct+'"></div></div>' +
    '<div class="kpi-value-block"><div class="kpi-realizado num '+c.corTxt+'">'+valorMostrado+'</div><div class="kpi-sub">'+subLabel+'</div></div></div></div>';
}
function animarMFills(scopeEl){
  (scopeEl||document).querySelectorAll('.m-fill-liquid[data-target]').forEach(function(el, i){
    var target = el.getAttribute('data-target');
    setTimeout(function(){ el.style.height = target + '%'; }, 60 + i*40);
  });
}

function lineChart(pontos, corLinha){
  corLinha = corLinha || '#6ee7b7';
  if (pontos.length < 2) return '<div style="color:#807E7E;font-size:11.5px;padding:20px 0;">Poucos pontos pra desenhar uma linha ainda.</div>';
  var w = 720, h = 130, pad = 20;
  var vals = pontos.map(function(p){return p.v;});
  var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
  if (max === min) { max += 1; min -= 1; }
  var stepX = (w - pad*2) / (pontos.length - 1);
  var coords = pontos.map(function(p,i){ return { x: pad+i*stepX, y: h-pad-((p.v-min)/(max-min))*(h-pad*2), v:p.v, lbl:p.lbl }; });
  var pathD = coords.map(function(c,i){ return (i===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1); }).join(' ');
  var areaD = pathD + ' L'+coords[coords.length-1].x.toFixed(1)+','+(h-pad)+' L'+coords[0].x.toFixed(1)+','+(h-pad)+' Z';
  var dots = coords.map(function(c){ return '<circle cx="'+c.x.toFixed(1)+'" cy="'+c.y.toFixed(1)+'" r="4" fill="'+corLinha+'" stroke="#1A1A1A" stroke-width="2"/>'; }).join('');
  var showEvery = Math.ceil(coords.length / 10);
  var labels = coords.map(function(c,i){ return i%showEvery===0 ? '<text x="'+c.x.toFixed(1)+'" y="'+(h-2)+'" font-size="9" fill="#807E7E" text-anchor="middle" font-family="Inter">'+c.lbl+'</text>' : ''; }).join('');
  var gradId = 'grad'+Math.random().toString(36).slice(2);
  return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:130px;overflow:visible;">' +
    '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+corLinha+'" stop-opacity="0.25"/><stop offset="100%" stop-color="'+corLinha+'" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="'+areaD+'" fill="url(#'+gradId+')"/><path d="'+pathD+'" fill="none" stroke="'+corLinha+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' + dots + labels + '</svg>';
}
function barChart(pontos, corBarra){
  corBarra = corBarra || '#7dd3fc';
  if (pontos.length === 0) return '<div style="color:#807E7E;font-size:11.5px;padding:20px 0;">Sem dados ainda.</div>';
  var w = 720, h = 110, pad = 20, gap = 6;
  var max = Math.max.apply(null, pontos.map(function(p){return p.v;})) || 1;
  var bw = (w - pad*2) / pontos.length - gap;
  var bars = pontos.map(function(p,i){
    var bh = (p.v/max) * (h - pad*2);
    var x = pad + i*((w-pad*2)/pontos.length);
    var y = h - pad - bh;
    return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="4" fill="'+corBarra+'"/>' +
      '<text x="'+(x+bw/2).toFixed(1)+'" y="'+(h-4)+'" font-size="9" fill="#807E7E" text-anchor="middle" font-family="Inter">'+p.lbl+'</text>';
  }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:110px;">'+bars+'</svg>';
}
function donutChart(presente, ausente, reposicao, tamanho){
  tamanho = tamanho || 150;
  var total = presente + ausente + reposicao;
  var r = 46, cx = 60, cy = 60, circ = 2*Math.PI*r;
  if (total === 0) return '<div style="color:#807E7E;font-size:11.5px;padding:20px;">Sem dados de presença ainda.</div>';
  var segs = [ {v:presente, cor:'#3D8B5F'}, {v:reposicao, cor:'#7dd3fc'}, {v:ausente, cor:'#C0433D'} ];
  var offset = 0, circles = '';
  segs.forEach(function(s){
    var frac = s.v/total, len = frac*circ;
    circles += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.cor+'" stroke-width="16" stroke-dasharray="'+len.toFixed(1)+' '+(circ-len).toFixed(1)+'" stroke-dashoffset="'+(-offset).toFixed(1)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';
    offset += len;
  });
  var pct = Math.round(presente/total*100);
  return '<svg viewBox="0 0 120 120" style="width:'+tamanho+'px;height:'+tamanho+'px;">' + circles +
    '<text x="60" y="57" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="Bricolage Grotesque">'+pct+'%</text>' +
    '<text x="60" y="75" text-anchor="middle" font-size="9" fill="#9F9F9F" font-family="Inter">presença</text></svg>';
}

function renderJornadaHero(data){
  document.getElementById('pessoaFotoSkel').style.display='none';
  var fotoImg = document.getElementById('pessoaFoto'), fotoFallback = document.getElementById('pessoaFotoFallback');
  if (data.cs.fotoUrl) { fotoImg.src = data.cs.fotoUrl; fotoImg.style.display='block'; fotoFallback.style.display='none'; }
  else { fotoFallback.style.background = corPara(data.cs.nomeCompleto); fotoFallback.textContent = iniciais(data.cs.nomeCompleto); fotoFallback.style.display='flex'; fotoImg.style.display='none'; }
  document.getElementById('pessoaNome').textContent = data.cs.nomeCompleto;
  document.getElementById('pessoaSub').textContent = 'Customer Success · Conselho ' + data.cs.apelidoConselho;
  var periodoTxt = data.periodo.geral ? 'Visão Geral · ' + data.periodo.ano : data.periodo.mes + '/' + data.periodo.ano;
  document.getElementById('pessoaMeta').textContent = periodoTxt.toUpperCase() + ' · ATUALIZADO EM ' + new Date(data.periodo.geradoEm).toLocaleString('pt-BR');

  var elProx = document.getElementById('pessoaProximoConselho');
  var prox = data.cs.proximoConselho;
  if (prox && prox.dataIso) {
    var f = formatarDataConselho(prox.dataIso);
    elProx.innerHTML = f ? ('<div class="jornada-proximo">' + ICONS.calendar.replace('icon','icon') +
      '<span>Próximo conselho: <strong>' + prox.nome + '</strong> — ' + f.texto + '</span></div>') : '';
  } else {
    elProx.innerHTML = '<div class="jornada-proximo" style="opacity:0.6;">'+ICONS.clock+'<span>Sem próxima data confirmada na agenda</span></div>';
  }
}
function destaqueCard(label, valor){
  return '<div class="destaque-card"><div class="destaque-label">'+label+'</div><div class="destaque-valor'+(valor?'':' vazio')+'">'+(valor||'Sem informações')+'</div></div>';
}
function renderDestaques(data){
  var ind = data.indicadores;
  var chaves = [
    {k:'churn', l:'Churn'}, {k:'casesSucesso', l:'Cases de Sucesso'}, {k:'matchmakings', l:'Matchmakings'},
    {k:'rounds', l:'Rounds'}, {k:'upsell', l:'Upsell'}, {k:'downsell', l:'Downsell'}, {k:'healthDaBase', l:'Health da Base'}
  ];
  var calculados = chaves.map(function(c){ return { l:c.l, ind: ind[c.k], calc: calcIndicador(ind[c.k]) }; })
    .filter(function(x){ return x.ind.alcancado !== null && x.ind.alcancado !== undefined && x.ind.meta !== null && x.ind.meta !== undefined; });

  var pontoAtencao = null, conquista = null, compromisso = null;
  if (!modoGeralAtual) {
    var piores = calculados.filter(function(x){ return x.calc.pill==='pr'; }).sort(function(a,b){ return a.calc.pct-b.calc.pct; });
    pontoAtencao = piores.length ? piores[0].l + ' está ' + piores[0].calc.pctLabel.toLowerCase() : null;

    var melhores = calculados.filter(function(x){ return x.calc.pill==='pg'; }).sort(function(a,b){ return b.ind.alcancado-a.ind.alcancado; });
    conquista = melhores.length ? melhores[0].l + ' com meta batida (' + melhores[0].ind.alcancado + ')' : null;

    var proximos = calculados.filter(function(x){ return x.ind.tipoMeta==='min' && x.calc.pill==='py'; }).sort(function(a,b){ return b.calc.pct-a.calc.pct; });
    compromisso = proximos.length ? proximos[0].l + ' em ' + proximos[0].calc.pctLabel.toLowerCase() : null;
  }

  var fb = data.feedback;
  var destaqueFb = null;
  if (fb && fb.positivos && fb.positivos.length) {
    var texto = fb.positivos[0];
    destaqueFb = texto.length > 90 ? texto.slice(0,90) + '…' : texto;
  }

  document.getElementById('destaquesGrid').innerHTML =
    destaqueCard('Ponto de atenção', pontoAtencao) +
    destaqueCard('Maior conquista do mês', conquista) +
    destaqueCard('Mais próximo da meta', compromisso) +
    destaqueCard('Destaque em feedback', destaqueFb);
}

function renderDashboard(data){
  modoGeralAtual = !!data.periodo.geral;
  renderJornadaHero(data);
  renderDestaques(data);
  renderIndicadores(data); renderSemanal(data); renderConselhos(data); renderFeedback(data);
  animarMFills();
}
function gtdCard(ind){
  var alcancado = ind.alcancado;
  var semDado = alcancado === null || alcancado === undefined;
  var pct = semDado ? 0 : Math.max(0, Math.min(100, Math.round(alcancado)));
  return '<div class="gtd-card">' +
    '<div class="gtd-card-top"><div class="gtd-card-label">'+ICONS.check+'Cumprimento do GTD de conselho</div>' +
    '<div class="gtd-card-valor">'+(semDado?'Sem ciclo em aberto':pct+'%')+'</div></div>' +
    '<div class="gtd-card-bar-bg"><div class="gtd-card-bar-fill" style="width:'+pct+'%;"></div></div>' +
    '<div class="gtd-card-sub">Média das 9 etapas de acompanhamento (confirmação, jornada, encaminhamentos, matchmaking, upsell...) nos conselhos do ciclo atual. Clique em um conselho na aba Conselhos pra ver o detalhe etapa a etapa.</div>' +
  '</div>';
}
function renderIndicadores(data){
  var ind = data.indicadores;
  document.getElementById('indicadores').innerHTML =
    '<div class="grid3">'+kpiCard('Churn', ind.churn)+kpiCard('Revenue Churn', ind.revenueChurn, 'R$')+kpiCard('Cases de Sucesso', ind.casesSucesso)+'</div>' +
    '<div class="grid3">'+kpiCard('Matchmakings', ind.matchmakings)+kpiCard('Rounds', ind.rounds)+kpiCard('Indicações', ind.indicacoes)+'</div>' +
    '<div class="grid3">'+kpiCard('Health da Base', ind.healthDaBase)+kpiCard('Upsell', ind.upsell)+kpiCard('Downsell', ind.downsell)+'</div>' +
    gtdCard(ind.cumprimentoGtd);
}
function renderSemanal(data){
  var ind = data.indicadores.casesSucesso;
  var c = calcIndicador(ind);
  var lista = data.casesRegistrados || [];
  casesAtuais = lista;

  var subLabel = modoGeralAtual ? c.pctLabel : ('meta '+(ind.meta==null?'—':ind.meta)+' · '+c.pctLabel);
  var html = '<div class="hero-grid">' +
    '<div class="dark-card cases-hero-card">' +
      '<div class="m-fill-wrap" style="width:90px;height:90px;flex-shrink:0;"><div class="m-fill-liquid '+c.cor+'" style="height:0%;" data-target="'+c.pct+'"></div></div>' +
      '<div class="cases-hero-text"><div class="dark-label">Cases de sucesso</div><div class="dark-value num '+c.corTxt+'" style="font-size:44px;">'+(ind.alcancado==null?'—':ind.alcancado)+'</div><div class="dark-sub">'+subLabel+'</div></div>' +
    '</div>' +
    '<div class="mini-stats" style="display:flex;flex-direction:column;gap:14px;">' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Status</div><span class="kpi-pill '+c.pill+'" style="width:fit-content;">'+c.pillLabel+'</span></div>' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Registrados no período</div><div class="dark-value num">'+lista.length+'</div></div>' +
    '</div></div>';

  html += '<div class="section-title" style="margin-top:8px;">Cases registrados <span style="font-weight:600;text-transform:none;letter-spacing:0;color:#9F9F9F;">· clique pra ler o case completo</span><div class="line"></div></div>';
  if (lista.length === 0) {
    html += '<div class="empty-state">Nenhum case de sucesso registrado neste período.</div>';
  } else {
    html += '<div class="week-grid">';
    lista.forEach(function(item, i){
      html += '<div class="week-card case-card" onclick="abrirCaseModal('+i+')">' +
        (item.produto ? '<div class="week-date">'+ICONS.calendar+item.produto+'</div>' : '') +
        '<div style="font-size:12.5px;font-weight:700;color:#1A1A1A;line-height:1.4;">'+item.nome+'</div>' +
        (item.empresa ? '<div style="font-size:10.5px;color:#9F9F9F;margin-top:3px;">'+item.empresa+'</div>' : '') +
      '</div>';
    });
    html += '</div>';
  }
  document.getElementById('semanal').innerHTML = html;
  animarMFills(document.getElementById('semanal'));
}

var casesAtuais = [];
function campoModal(label, texto){
  if (!texto) return '';
  return '<div class="case-modal-campo"><div class="case-modal-label">'+label+'</div><div class="case-modal-texto">'+texto+'</div></div>';
}
function abrirCaseModal(i){
  var item = casesAtuais[i];
  if (!item) return;
  document.getElementById('caseModalBody').innerHTML =
    '<div class="case-modal-header"><div><div class="case-modal-nome">'+item.nome+'</div>' +
    (item.empresa ? '<div class="case-modal-empresa">'+item.empresa+'</div>' : '') + '</div></div>' +
    '<div class="empty-state" style="padding:30px 0;">Carregando o case completo...</div>';
  document.getElementById('caseModalOverlay').classList.add('ativo');
  google.script.run.withSuccessHandler(function(detalhe){
    if (!detalhe) { document.getElementById('caseModalBody').innerHTML = '<div class="empty-state">Case não encontrado.</div>'; return; }
    var tags = [item.produto, detalhe.segmento, detalhe.ondeAconteceu].filter(Boolean).join(' · ');
    var estrelas = detalhe.impacto ? '<span class="case-modal-impacto">' + '★'.repeat(detalhe.impacto) + '<span style="color:#3a3a3a;">' + '★'.repeat(Math.max(0,5-detalhe.impacto)) + '</span></span>' : '';
    document.getElementById('caseModalBody').innerHTML =
      '<div class="case-modal-header"><div><div class="case-modal-nome">'+detalhe.nome+'</div>' +
      (item.empresa ? '<div class="case-modal-empresa">'+item.empresa+'</div>' : '') +
      (tags ? '<div class="case-modal-tags">'+tags+'</div>' : '') + '</div>' + estrelas + '</div>' +
      campoModal('Qual era o desafio?', detalhe.desafio) +
      campoModal('O que foi sugerido', detalhe.sugestao) +
      campoModal('Qual decisão ele tomou', detalhe.decisao) +
      campoModal('Qual foi o resultado', detalhe.resultado);
  }).withFailureHandler(function(err){
    document.getElementById('caseModalBody').innerHTML = '<div class="empty-state">Erro ao carregar: '+err.message+'</div>';
  }).getCaseDetalhePublico(item.id);
}
function fecharCaseModal(){ document.getElementById('caseModalOverlay').classList.remove('ativo'); }
function parseConselhoNome(nome){
  var m = nome.match(/^(.*?)\s*\|\s*(.*?)\s*\((.*?)\)\s*$/);
  if (!m) return { tipo:'', contato:nome, apelido:'' };
  return { tipo:m[1].trim(), contato:m[2].trim(), apelido:m[3].trim() };
}
function agregarConselhos(lista){
  var totalMembros=0, totalPresente=0, totalAusente=0, totalReposicao=0, totalRegistros=0, realizados=0, congelados=0, atencao=[];
  lista.forEach(function(c){
    if (c.congelado) congelados++;
    if (c.status === 'realizado') {
      realizados++; totalMembros+=c.membros; totalPresente+=c.presente; totalAusente+=c.ausente; totalReposicao+=c.reposicao;
      var registros = c.registros || (c.presente+c.ausente+c.reposicao);
      totalRegistros += registros;
      var pct = registros ? Math.round(c.presente/registros*100) : 0;
      if (pct < 60 && !c.congelado) atencao.push(parseConselhoNome(c.nome).contato + ' (' + pct + '%)');
    }
  });
  return {totalMembros:totalMembros, totalPresente:totalPresente, totalAusente:totalAusente, totalReposicao:totalReposicao, totalRegistros:totalRegistros, realizados:realizados, congelados:congelados, atencao:atencao, total:lista.length};
}
var conselhosAtuais = [];
function avatarConselhoHtml_(c, p){
  if (c.fotoConselheiro) return '<img class="avatar-foto" src="'+c.fotoConselheiro+'">';
  return '<div class="avatar" style="background:'+corPara(p.contato)+'">'+iniciais(p.contato)+'</div>';
}
function gtdBadgeHtml_(c){
  if (!c.gtd || c.gtd.taxaCumprimento === null || c.gtd.taxaCumprimento === undefined) return '';
  var pct = Math.round(c.gtd.taxaCumprimento);
  return '<span class="council-gtd-badge">'+ICONS.check+'GTD '+pct+'%</span>';
}
function proximoConselhoHtml_(c){
  if (!c.proximaData) return '';
  var f = formatarDataConselho(c.proximaData);
  if (!f) return '';
  var classe = c.proximaDataEhFutura ? 'futura' : 'passada';
  var rotulo = c.proximaDataEhFutura ? 'Próximo: ' : 'Último registrado: ';
  return '<div class="council-proxima '+classe+'">'+ICONS.calendar+rotulo+f.texto+'</div>';
}
function renderConselhos(data){
  conselhosAtuais = data.conselhos || [];
  if (data.conselhos.length === 0) { document.getElementById('conselhos').innerHTML = '<div class="empty-state">Nenhum conselho encontrado.</div>'; return; }
  var a = agregarConselhos(data.conselhos);
  var mediaGeral = a.totalRegistros ? Math.round(a.totalPresente/a.totalRegistros*100) : 0;

  var html = '<div class="hero-grid">' +
    '<div class="dark-card" style="display:flex;align-items:center;gap:20px;">' + donutChart(a.totalPresente, a.totalAusente, a.totalReposicao, 130) +
      '<div><div class="dark-label">Presença média</div><div class="dark-value num '+(mediaGeral>=60?'c-g':'c-r')+'">'+mediaGeral+'%</div><div class="dark-sub">direta, sem reposições</div></div></div>' +
    '<div class="mini-stats" style="display:flex;flex-direction:column;gap:14px;">' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Conselhos'+(a.congelados>0?' · '+a.congelados+' congelado(s)':'')+'</div><div class="dark-value num">'+a.total+'</div></div>' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Membros ativos</div><div class="dark-value num">'+a.totalMembros+'</div></div>' +
    '</div></div>';

  if (a.atencao.length > 0) {
    html += '<div class="attention-box"><div class="attention-title">'+ICONS.warning+'Pontos de atenção</div><ul>';
    a.atencao.forEach(function(x){ html += '<li>Presença abaixo de 60%: '+x+'</li>'; });
    html += '</ul></div>';
  }

  html += '<div class="council-grid">';
  data.conselhos.forEach(function(c, i){
    var p = parseConselhoNome(c.nome);
    if (c.status !== 'realizado') {
      var temConfirmados = c.confirmadosFuturos && c.confirmadosFuturos.length > 0;
      var qtdConf = temConfirmados ? c.confirmadosFuturos.length : 0;
      var clicavel = temConfirmados || !!c.gtd;
      html += '<div class="council-card'+(clicavel?' clicavel':'')+'"'+(clicavel?' onclick="abrirConselhoModal('+i+')"':'')+'>' + avatarConselhoHtml_(c, p) +
        (c.congelado?'<div class="badge-congelado">Congelado</div>':'') +
        '<div class="council-name">'+p.contato+'</div><div class="council-sub">'+p.tipo+' · CS: '+p.apelido+'</div>' +
        gtdBadgeHtml_(c) +
        (temConfirmados
          ? '<span class="confirm-badge" style="background:'+corConfirmacao(qtdConf)+';">'+ICONS.check+qtdConf+' confirmado(s)' +
            '<span class="confirm-tooltip">Confirmados: 0–1 vermelho · 2–3 laranja · 4–5 amarelo · 6–7 verde · 8+ azul</span></span>'
          : '<div class="council-pending">'+ICONS.clock+'Aguardando confirmação</div>') +
        proximoConselhoHtml_(c) +
        '</div>';
      return;
    }
    var registros = c.registros || (c.presente+c.ausente+c.reposicao);
    var pct = registros ? Math.round(c.presente/registros*100) : 0;
    var corPct = pct>=75?'c-g':(pct>=60?'c-y':'c-r');
    var pP=c.membros?(c.presente/c.membros*100):0, pA=c.membros?(c.ausente/c.membros*100):0, pR=c.membros?(c.reposicao/c.membros*100):0;
    var temConfirmadosReal = c.confirmadosFuturos && c.confirmadosFuturos.length > 0;
    var qtdConfReal = temConfirmadosReal ? c.confirmadosFuturos.length : 0;
    html += '<div class="council-card clicavel'+(c.congelado?' congelado':'')+'" onclick="abrirConselhoModal('+i+')">' + avatarConselhoHtml_(c, p) +
      (c.congelado?'<div class="badge-congelado">Congelado</div>':'') +
      '<div class="council-name">'+p.contato+'</div><div class="council-sub">'+p.tipo+' · CS: '+p.apelido+'</div>' +
      gtdBadgeHtml_(c) +
      '<div class="council-pct-row"><span class="council-pct num '+corPct+'">'+pct+'%</span><span class="council-members">'+c.membros+' membros</span></div>' +
      '<div class="council-bar"><div class="seg-presente" style="width:0%" data-w="'+pP+'"></div><div class="seg-ausente" style="width:0%" data-w="'+pA+'"></div><div class="seg-reposicao" style="width:0%" data-w="'+pR+'"></div></div>' +
      (temConfirmadosReal
        ? '<span class="confirm-badge" style="background:'+corConfirmacao(qtdConfReal)+';margin-top:12px;">'+ICONS.check+qtdConfReal+' confirmado(s)' +
          '<span class="confirm-tooltip">Confirmados: 0–1 vermelho · 2–3 laranja · 4–5 amarelo · 6–7 verde · 8+ azul</span></span>'
        : '') +
      proximoConselhoHtml_(c) +
      '</div>';
  });
  html += '</div><div class="council-legend">' +
    '<span><span class="legend-dot" style="background:#3D8B5F;"></span>Presente</span>' +
    '<span><span class="legend-dot" style="background:#C0433D;"></span>Ausente</span>' +
    '<span><span class="legend-dot" style="background:#7dd3fc;"></span>Reposição</span></div>';
  document.getElementById('conselhos').innerHTML = html;
  setTimeout(function(){ document.querySelectorAll('#conselhos .council-bar > div[data-w]').forEach(function(el){ el.style.width = el.getAttribute('data-w') + '%'; }); }, 50);
}

function impactoConselhoHtml_(c){
  var imp = c.impacto;
  if (!imp) return '';
  var html = '<div class="case-modal-campo"><div class="case-modal-label">Impacto do conselho ' +
    '<span style="font-weight:600;text-transform:none;letter-spacing:0;color:#9F9F9F;">· histórico completo, todos os meses</span></div>';

  html += '<div class="mini-stats" style="display:flex;gap:14px;margin:10px 0 16px;">' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Cases de sucesso</div><div class="dark-value num">'+imp.totalCases+'</div></div>' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings</div><div class="dark-value num">'+imp.totalMatchmakings+'</div></div>' +
  '</div>';

  if (imp.matchmakingsSemResultado > 0) {
    html += '<div class="attention-box" style="margin-bottom:16px;"><div class="attention-title">'+ICONS.warning+'Matchmakings sem resultado registrado</div>' +
      '<div class="attention-desc">'+imp.matchmakingsSemResultado+' matchmaking(s) deste conselho ainda sem o campo "Resultado" preenchido no Monday.</div></div>';
  }

  if (imp.topConselhos && false) {} // reservado

  html += '</div>';
  return html;
}
function abrirConselhoModal(i){
  var c = conselhosAtuais[i];
  if (!c) return;
  var p = parseConselhoNome(c.nome);
  var fotoHtml = c.fotoConselheiro ? '<img class="modal-avatar-foto" src="'+c.fotoConselheiro+'">' : '';
  var html = '<div class="case-modal-header">' + fotoHtml + '<div><div class="case-modal-nome">'+p.contato+'</div>' +
    '<div class="case-modal-empresa">'+p.tipo+' · CS: '+p.apelido+'</div></div></div>';

  if (c.proximaData) {
    var f = formatarDataConselho(c.proximaData);
    if (f) {
      html += '<div class="case-modal-campo"><div class="case-modal-label">'+(c.proximaDataEhFutura?'Próximo encontro':'Último encontro registrado na agenda')+'</div>' +
        '<div class="case-modal-texto">'+f.texto+(c.proximaDataStatus?' · '+c.proximaDataStatus:'')+'</div></div>';
    }
  }

  var membros = c.membrosDetalhe || [];
  var temPresencaRealizada = membros.some(function(m){ return m.taxa !== null && m.taxa !== undefined; });
  if (temPresencaRealizada) {
  html += '<div class="case-modal-campo"><div class="case-modal-label">Presença individual dos membros</div>';
  if (membros.length === 0) {
    html += '<div class="empty-state" style="padding:16px 0;">Sem registros de presença ainda.</div>';
  } else {
    membros.forEach(function(m){
      var temTaxa = m.taxa !== null && m.taxa !== undefined;
      var cor = !temTaxa ? '#807E7E' : (m.taxa>=75?'#3D8B5F':(m.taxa>=60?'#C89A2E':'#C0433D'));
      html += '<div class="membro-row">' +
        '<div class="membro-avatar" style="background:'+corPara(m.nome)+'">'+iniciais(m.nome)+'</div>' +
        '<div class="membro-nome">'+m.nome+'</div>' +
        (m.reposicao ? '<div class="membro-detalhe">'+m.reposicao+' repos.</div>' : '') +
        '<div class="membro-bar-bg"><div class="membro-bar-fill" style="width:'+(temTaxa?m.taxa:0)+'%;background:'+cor+';"></div></div>' +
        '<div class="membro-taxa num" style="color:'+cor+';">'+(temTaxa?m.taxa+'%':'—')+'</div>' +
      '</div>';
    });
  }
  html += '</div>';
  }

  var confirmados = c.confirmadosFuturos || [];
  if (confirmados.length > 0) {
    html += '<div class="case-modal-campo"><div class="case-modal-label">Confirmados pra próximas reuniões</div><div>';
    confirmados.forEach(function(cf){
      html += '<span class="confirmado-chip"><span class="confirmado-avatar" style="background:'+corPara(cf.nome)+'">'+iniciais(cf.nome)+'</span>'+cf.nome+' <span class="confirmado-mes">· '+cf.mes+'</span></span>';
    });
    html += '</div></div>';
  }

  html += impactoConselhoHtml_(c);

  if (c.gtd) {
    var pctGtd = (c.gtd.taxaCumprimento !== null && c.gtd.taxaCumprimento !== undefined) ? Math.round(c.gtd.taxaCumprimento) : null;
    html += '<div class="case-modal-campo"><div class="case-modal-label">GTD do conselho'+(pctGtd!==null?' · '+pctGtd+'% cumprido':'')+'</div>';
    (c.gtd.etapas || []).forEach(function(et){
      html += '<div class="gtd-etapa-row'+(et.feito?' feito':'')+'">' +
        '<span class="gtd-etapa-check">'+(et.feito?ICONS.check:ICONS.clock)+'</span>' +
        '<span class="gtd-etapa-label">'+et.label+'</span>' +
      '</div>';
    });
    html += '</div>';
  }

  document.getElementById('conselhoModalBody').innerHTML = html;
  document.getElementById('conselhoModalOverlay').classList.add('ativo');
}
function fecharConselhoModal(){ document.getElementById('conselhoModalOverlay').classList.remove('ativo'); }

var MAX_QUOTES_VISIVEIS = 4;
function renderFeedback(data){
  var fb = data.feedback;
  var vezesAtual = data.cs.vezesDestaque || 0;
  var html = '<div class="destaque-form-card">' +
    '<div class="destaque-form-label">'+ICONS.trophy+'CS Destaque</div>' +
    '<div class="destaque-form-desc">Quantas vezes '+data.cs.nomeCompleto+' já foi reconhecido(a) como CS Destaque. Aparece como emblema no topo da página individual.</div>' +
    '<input type="number" min="0" step="1" class="destaque-form-input" id="destaqueInput" value="'+vezesAtual+'">' +
    '<button class="destaque-form-btn" id="destaqueSalvarBtn" onclick="salvarVezesDestaque()">Salvar</button>' +
    '<span class="destaque-form-status" id="destaqueStatus"></span>' +
  '</div>';
  html += '<p class="fb-intro">Avaliação de pares · anônima · '+fb.avaliadores+' avaliador(es) neste ciclo. As observações abaixo são as falas originais dos colegas, selecionadas e embaralhadas para preservar o anonimato.</p>';
  if (fb.avaliadores === 0 && fb.positivos.length === 0 && fb.construtivos.length === 0) {
    html += '<div class="no-feedback"><div class="no-feedback-title">Sem feedbacks neste ciclo</div><div class="no-feedback-sub">Este CS não aparece na rodada deste período — nem como avaliador, nem como avaliado.</div></div>';
    document.getElementById('feedbacks').innerHTML = html; return;
  }
  var maxVoto = Math.max.apply(null, fb.votos.map(function(v){return v.qtd;}).concat([1]));
  html += '<div class="votos-bar-card"><div class="dark-label">'+ICONS.trophy+'Reconhecimentos por votação</div>';
  fb.votos.forEach(function(v){
    html += '<div class="voto-row"><div class="voto-row-label">'+v.categoria+'</div><div class="voto-row-bar-bg"><div class="voto-row-bar-fill" data-w="'+(v.qtd/maxVoto*100)+'"></div></div><div class="voto-row-num num">'+v.qtd+'</div></div>';
  });
  html += '</div>';

  html += '<div class="fb-line-wrap"><span style="color:#3D8B5F">'+ICONS.check+'O que o time reconhece</span><div class="fb-line"></div></div>';
  if (fb.positivos.length === 0) html += '<div class="empty-state" style="padding:20px;">Nenhum feedback positivo registrado.</div>';
  else {
    fb.positivos.slice(0, MAX_QUOTES_VISIVEIS).forEach(function(p){ html += '<div class="quote-block"><span class="quote-mark">"</span><div class="quote-text">'+p+'</div></div>'; });
    if (fb.positivos.length > MAX_QUOTES_VISIVEIS) html += '<div class="fb-mais">+ '+(fb.positivos.length-MAX_QUOTES_VISIVEIS)+' outra(s) observação(ões) na mesma linha.</div>';
  }

  html += '<div class="fb-line-wrap" style="margin-top:22px;"><span style="color:#C89A2E">'+ICONS.target+'Oportunidades de evolução</span><div class="fb-line"></div></div>';
  if (fb.construtivos.length === 0) html += '<div class="empty-state" style="padding:20px;">Nenhum feedback construtivo registrado.</div>';
  else {
    fb.construtivos.slice(0, MAX_QUOTES_VISIVEIS).forEach(function(c){ html += '<div class="quote-block"><span class="quote-mark">"</span><div class="quote-text">'+c+'</div></div>'; });
    if (fb.construtivos.length > MAX_QUOTES_VISIVEIS) html += '<div class="fb-mais">+ '+(fb.construtivos.length-MAX_QUOTES_VISIVEIS)+' outra(s) observação(ões) na mesma linha.</div>';
  }
  document.getElementById('feedbacks').innerHTML = html;
  setTimeout(function(){ document.querySelectorAll('.voto-row-bar-fill').forEach(function(el){ el.style.width = el.getAttribute('data-w')+'%'; }); }, 50);
}
function salvarVezesDestaque(){
  if (!currentCS) return;
  var input = document.getElementById('destaqueInput');
  var btn = document.getElementById('destaqueSalvarBtn');
  var status = document.getElementById('destaqueStatus');
  var valor = parseInt(input.value, 10);
  if (isNaN(valor) || valor < 0) { status.style.color = '#C0392B'; status.textContent = 'Valor inválido'; return; }
  btn.disabled = true; status.style.color = '#9F9F9F'; status.textContent = 'Salvando...';
  google.script.run.withSuccessHandler(function(valorSalvo){
    btn.disabled = false; status.style.color = '#3D8B5F'; status.textContent = 'Salvo!';
    setTimeout(function(){ status.textContent=''; }, 2500);
    var elBadge = document.getElementById('pessoaBadgeDestaque');
    if (valorSalvo > 0) { document.getElementById('pessoaBadgeCount').textContent = valorSalvo; elBadge.style.display = 'flex'; }
    else { elBadge.style.display = 'none'; }
  }).withFailureHandler(function(err){
    btn.disabled = false; status.style.color = '#C0392B'; status.textContent = 'Erro ao salvar';
    console.error(err);
  }).setVezesDestaquePublico(currentCS, valor);
}

var proximosConselhosAtuais = [];
function renderProximosConselhosEquipe(lista){
  proximosConselhosAtuais = lista || [];
  var el = document.getElementById('equipeProximosConselhos');
  if (!lista || lista.length === 0) { el.innerHTML = '<div class="empty-state">Nenhum conselho com data futura confirmada na agenda.</div>'; return; }
  var html = '<div class="proximos-grid">';
  lista.forEach(function(item, i){
    var f = formatarDataConselho(item.dataIso);
    if (!f) return;
    var qtdConf = (item.confirmadosFuturos || []).length;
    var temConf = qtdConf > 0;
    html += '<div class="proximo-card'+(temConf?' clicavel':'')+'"'+(temConf?' onclick="abrirProximoConselhoModal('+i+')"':'')+'>' +
      '<div class="proximo-data-badge" style="background:'+corPara(item.nome)+';"><div class="proximo-data-dia">'+f.dia+'</div><div class="proximo-data-mes">'+f.mes+'</div></div>' +
      '<div class="proximo-info"><div class="proximo-nome">'+item.nome+'</div><div class="proximo-sub">'+item.cs+' · '+f.hora+'</div></div>' +
      (temConf ? '<span class="confirm-badge" style="background:'+corConfirmacao(qtdConf)+';flex-shrink:0;">'+ICONS.check+qtdConf+
        '<span class="confirm-tooltip">Confirmados: 0–1 vermelho · 2–3 laranja · 4–5 amarelo · 6–7 verde · 8+ azul</span></span>' : '') +
    '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}
function abrirProximoConselhoModal(i){
  var c = proximosConselhosAtuais[i];
  if (!c) return;
  var html = '<div class="case-modal-header"><div><div class="case-modal-nome">'+c.nome+'</div>' +
    '<div class="case-modal-empresa">'+c.cs+'</div></div></div>';
  var f = formatarDataConselho(c.dataIso);
  if (f) {
    html += '<div class="case-modal-campo"><div class="case-modal-label">Próximo encontro</div>' +
      '<div class="case-modal-texto">'+f.texto+(c.proximaDataStatus?' · '+c.proximaDataStatus:'')+'</div></div>';
  }
  var confirmados = c.confirmadosFuturos || [];
  html += '<div class="case-modal-campo"><div class="case-modal-label">Confirmados pra próximas reuniões</div><div>';
  if (confirmados.length === 0) {
    html += '<div class="empty-state" style="padding:16px 0;">Ninguém confirmado ainda.</div>';
  } else {
    confirmados.forEach(function(cf){
      html += '<span class="confirmado-chip"><span class="confirmado-avatar" style="background:'+corPara(cf.nome)+'">'+iniciais(cf.nome)+'</span>'+cf.nome+' <span class="confirmado-mes">· '+cf.mes+'</span></span>';
    });
  }
  html += '</div></div>';
  document.getElementById('conselhoModalBody').innerHTML = html;
  document.getElementById('conselhoModalOverlay').classList.add('ativo');
}
function renderChurnOrfao(churnOrfao){
  if (!churnOrfao || !churnOrfao.qtd) return '';
  var detalheTxt = (churnOrfao.detalhe || []).map(function(d){ return d.nome+' ('+d.qtd+')'; }).join(', ');
  return '<div class="attention-box" style="margin-top:14px;"><div class="attention-title">'+ICONS.warning+'Churn sem CS identificado</div>' +
    '<div class="attention-desc">'+churnOrfao.qtd+' churn(s) neste período com um nome no campo "Quem é o seu CS?" que não existe mais na configuração atual' +
    (detalheTxt ? ' — ' + detalheTxt : '') + '. Não entram na nota de nenhum CS, mas também não desaparecem do total. Vale corrigir o dropdown no board de Churn.</div></div>';
}
function renderEquipe(data){
  modoGeralAtual = !!data.periodo.geral;
  renderProximosConselhosEquipe(data.proximosConselhos);
  var ind = data.indicadores;
  document.getElementById('equipeIndicadores').innerHTML =
    '<div class="grid3">'+kpiCard('Churn', ind.churn)+kpiCard('Revenue Churn', ind.revenueChurn, 'R$')+kpiCard('Cases de Sucesso', ind.casesSucesso)+'</div>' +
    '<div class="grid3">'+kpiCard('Matchmakings', ind.matchmakings)+kpiCard('Rounds', ind.rounds)+kpiCard('Health da Base (média)', ind.healthDaBase)+'</div>' +
    renderChurnOrfao(data.churnOrfao);
  animarMFills(document.getElementById('equipeIndicadores'));

  if (data.casesPorCS && data.casesPorCS.length > 0) {
    var pontosCases = data.casesPorCS.map(function(c){ return { v: c.qtd, lbl: c.nome }; });
    document.getElementById('equipeSemanal').innerHTML = '<div class="chart-card"><div class="chart-title">'+ICONS.calendar+'Cases de sucesso registrados por CS ('+data.membrosIncluidos.length+' incluídos)</div>' + barChart(pontosCases, '#fbbf24') + '</div>';
  } else {
    document.getElementById('equipeSemanal').innerHTML = '<div class="empty-state">Nenhum case de sucesso registrado neste período.</div>';
  }

  var a = agregarConselhos(data.conselhos);
  var mediaGeral = a.totalRegistros ? Math.round(a.totalPresente/a.totalRegistros*100) : 0;
  document.getElementById('equipeConselhos').innerHTML = '<div class="hero-grid">' +
    '<div class="dark-card" style="display:flex;align-items:center;gap:20px;">' + donutChart(a.totalPresente, a.totalAusente, a.totalReposicao, 130) +
      '<div><div class="dark-label">Presença média — toda a operação</div><div class="dark-value num '+(mediaGeral>=60?'c-g':'c-r')+'">'+mediaGeral+'%</div><div class="dark-sub">'+a.total+' conselhos · '+a.totalMembros+' membros</div></div></div>' +
    '<div class="mini-stats" style="display:flex;flex-direction:column;gap:14px;">' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Conselhos abaixo de 60%</div><div class="dark-value num c-r">'+a.atencao.length+'</div></div>' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Congelados</div><div class="dark-value num c-y">'+a.congelados+'</div></div>' +
    '</div></div>';

  renderImpactoConselhosEquipe(data.impactoConselhos);
  renderCSTop(data.csTop);
  renderRankingEquipe(data.ranking);
}

function renderImpactoConselhosEquipe(imp){
  var el = document.getElementById('equipeImpactoConselhos');
  if (!imp) { el.innerHTML = '<div class="empty-state">Sem dados de impacto disponíveis.</div>'; return; }
  var html = '<div class="mini-stats" style="display:flex;gap:14px;">' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Cases de sucesso (histórico)</div><div class="dark-value num">'+imp.totalCases+'</div></div>' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings (histórico)</div><div class="dark-value num">'+imp.totalMatchmakings+'</div></div>' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings sem resultado</div><div class="dark-value num '+(imp.matchmakingsSemResultado>0?'c-r':'')+'">'+imp.matchmakingsSemResultado+'</div></div>' +
  '</div>';

  if (imp.topConselhos && imp.topConselhos.length > 0) {
    html += '<div class="chart-card" style="margin-top:14px;"><div class="chart-title">'+ICONS.trophy+'Conselhos com mais impacto (cases + matchmakings)</div>';
    imp.topConselhos.forEach(function(t, i){
      var contato = parseConselhoNome(t.nome).contato;
      html += '<div class="ranking-row"><span class="ranking-pos">'+(i+1)+'º</span>' +
        '<span class="ranking-nome">'+contato+' <span style="color:#9F9F9F;font-weight:500;">· '+t.cs+'</span></span>' +
        '<span class="ranking-valor num">'+t.total+'</span></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="empty-state">Nenhum case ou matchmaking atribuído a um conselho ainda.</div>';
  }
  el.innerHTML = html;
}

function renderCSTop(csTop){
  var el = document.getElementById('csTop');
  if (!csTop || csTop.length === 0) { el.innerHTML = '<div class="empty-state">Sem dados suficientes pra calcular o Top 3 neste período.</div>'; return; }
  var medalhas = ['1º lugar','2º lugar','3º lugar'];
  var html = '<div class="cstop-grid">';
  csTop.forEach(function(c, i){
    var fotoHtml = c.fotoUrl ? '<img class="cstop-foto" src="'+c.fotoUrl+'">' : '<div class="cstop-foto-fallback" style="background:'+corPara(c.nomeCompleto||c.nome)+'">'+iniciais(c.nomeCompleto||c.nome)+'</div>';
    html += '<div class="cstop-card pos'+(i+1)+'"><div class="cstop-medalha">'+(medalhas[i]||((i+1)+'º lugar'))+'</div>' +
      fotoHtml + '<div class="cstop-nome">'+c.nome+'</div>' +
      '<div class="cstop-score num">'+c.score+'</div><div class="cstop-score-lbl">pontos</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function rankingCard(titulo, lista, sufixo){
  sufixo = sufixo || '';
  if (!lista || lista.length === 0) return '<div class="ranking-card"><div class="ranking-title">'+titulo+'</div><div class="ranking-empty">Sem dados no período.</div></div>';
  var html = '<div class="ranking-card"><div class="ranking-title">'+titulo+'</div>';
  lista.slice(0,5).forEach(function(item, i){
    html += '<div class="ranking-row"><span class="ranking-pos">'+(i+1)+'º</span><span class="ranking-nome">'+item.nome+'</span><span class="ranking-valor num">'+item.valor+sufixo+'</span></div>';
  });
  html += '</div>';
  return html;
}
function renderRankingEquipe(ranking){
  if (!ranking) { document.getElementById('equipeRanking').innerHTML = '<div class="empty-state">Sem dados de ranking neste período.</div>'; return; }
  var html = '<div class="ranking-grid">' +
    rankingCard('Mais Matchmakings', ranking.matchmakings) +
    rankingCard('Mais Indicações', ranking.indicacoes) +
    rankingCard('Mais Rounds', ranking.rounds) +
    rankingCard('Mais Upsell', ranking.upsell) +
    rankingCard('Mais Cases de Sucesso', ranking.casesSucesso) +
    rankingCard('Mais Downsell', ranking.downsellMais) +
    rankingCard('Menos Downsell', ranking.downsellMenos) +
    rankingCard('Mais Churn', ranking.churnMais) +
  '</div>';
  document.getElementById('equipeRanking').innerHTML = html;
}

function showTab(id, e){
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  e.target.classList.add('active');
}
</script>
<div class="case-modal-overlay" id="caseModalOverlay" onclick="if(event.target===this) fecharCaseModal()">
  <div class="case-modal">
    <div class="case-modal-close" onclick="fecharCaseModal()">✕</div>
    <div id="caseModalBody"></div>
  </div>
</div>
<div class="case-modal-overlay" id="conselhoModalOverlay" onclick="if(event.target===this) fecharConselhoModal()">
  <div class="case-modal">
    <div class="case-modal-close" onclick="fecharConselhoModal()">✕</div>
    <div id="conselhoModalBody"></div>
  </div>
</div>

</body>
</html>`;
