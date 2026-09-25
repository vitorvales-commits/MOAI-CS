// Front-end adaptado do doc "Index" (Apps Script HtmlService) original do projeto MOAI.
// CSS e JS mantidos quase idênticos ao original — a única mudança estrutural é o bloco
// RUNTIME_SHIM logo no início do <script>, que substitui google.script.run por chamadas
// fetch() às rotas /api/* deste app Next.js. Todos os pontos de chamada no resto do arquivo
// (google.script.run.withSuccessHandler(...).withFailureHandler(...).getX(...)) ficam
// EXATAMENTE como no original, sem precisar tocar em cada um — o shim implementa a mesma
// interface.
//
// Logo MOAI (topo, .brand-logo) e emblema "CS Destaque" (.jornada-badge-img-wrap img) vêm de
// arquivos estáticos em public/logo/ e public/badges/ (ver lib/constants.ts, FOTOS_CS, e o
// próprio <img src="/logo/..."> abaixo) — não mais em base64 embutido aqui. Isso evita o risco
// de corrupção que já aconteceu neste arquivo com base64 grande colado à mão (ver
// claude/migracao_vercel_supabase.md, lição sobre assets de imagem). A máscara --m-white abaixo
// é a exceção: continua em base64 porque é usada como mask-image em CSS, não como <img>.
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@700;800&display=swap" rel="stylesheet">
<style>
:root {
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
.brand-logo { height: 24px; width: auto; display:block; }
.topbar-right { display:flex; align-items:center; gap:10px; }
.live-dot { width:7px; height:7px; border-radius:50%; background:#3D8B5F; display:inline-block; margin-right:6px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }

/* barra de progresso indeterminada enquanto busca dados no Postgres */
.progress-bar { position:sticky; top:0; z-index:30; height:2.5px; background:transparent; overflow:hidden; display:none; }
.progress-bar.ativo { display:block; }
.progress-bar-fill { height:100%; width:40%; background:linear-gradient(90deg,#008F72,#00A58D); animation: progresso 1.1s ease-in-out infinite; }
@keyframes progresso { 0%{ transform:translateX(-100%); } 100%{ transform:translateX(350%); } }
.live-label { font-size: 10.5px; color:#807E7E; font-weight:600; }
.logout-link { font-size: 11px; font-weight:700; color:#9F9F9F; text-decoration:none; padding:6px 10px; border-radius:8px; transition: color .15s, background .15s; }
.logout-link:hover { color:#1A1A1A; background:#E9E9E9; }
.gestor-topbar-link { font-size: 11px; font-weight:800; color:#C89A2E; text-decoration:none; padding:6px 10px; border-radius:8px; transition: color .15s, background .15s; }
.gestor-topbar-link:hover { color:#1A1A1A; background:#F0E4C8; }
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
.presenca-modal-flex { display:flex; align-items:center; gap:20px; flex-wrap:wrap; margin:10px 0 18px; }
.legenda-modal { display:flex; flex-direction:column; gap:6px; font-size:12.5px; color:#5D5D5D; }
.legenda-modal-item { display:flex; align-items:center; gap:7px; }
.legenda-modal-dot { width:9px; height:9px; border-radius:50%; display:inline-block; flex-shrink:0; }
.legenda-modal-item b { color:#1A1A1A; }
.legenda-modal-obs { font-size:10.5px; color:#9F9F9F; max-width:240px; margin-top:2px; }

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
.home-tabs { display:flex; justify-content:center; gap:6px; margin:-28px 0 34px; }
.home-tab { padding:9px 22px; border-radius:99px; font-size:12px; font-weight:800; letter-spacing:0.3px; color:#807E7E; background:#fff; border:0.75pt solid #D8D5D5; cursor:pointer; transition:all .2s; }
.home-tab:hover { color:#1A1A1A; border-color:#1A1A1A; }
.home-tab.active { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
#homeAbaConselhos { text-align:left; }
.cons-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:16px; }
.cons-card { position:relative; border-radius:22px; overflow:hidden; background:#1A1A1A; color:#fff; text-decoration:none; display:flex; flex-direction:column; transition:transform .2s, box-shadow .2s; }
.cons-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px rgba(0,0,0,0.18); }
.cons-card.congelado .cons-foto, .cons-card.congelado .cons-foto-fallback { filter:grayscale(1); opacity:0.55; }
.cons-foto-wrap { position:relative; aspect-ratio: 1 / 1; background:#242424; }
.cons-foto { width:100%; height:100%; object-fit:cover; display:block; }
.cons-foto-fallback { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:44px; color:#C89A2E; }
.cons-foto-wrap::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(26,26,26,0) 45%, rgba(26,26,26,0.92) 100%); }
.cons-over { position:absolute; left:14px; right:14px; bottom:12px; z-index:1; }
.cons-nome { font-family:'Bricolage Grotesque',sans-serif; font-size:17px; font-weight:800; line-height:1.15; }
.cons-nivel { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; color:#C89A2E; margin-top:3px; }
.cons-selo { position:absolute; top:12px; left:12px; z-index:1; font-size:9px; font-weight:800; letter-spacing:0.7px; text-transform:uppercase; padding:4px 9px; border-radius:99px; }
.cons-selo.congelado { background:#007eb5; color:#fff; }
.cons-selo.atencao { background:#C89A2E; color:#1A1A1A; }
.cons-health { position:absolute; top:12px; right:12px; z-index:1; background:rgba(20,20,20,0.75); border:0.75pt solid rgba(200,154,46,0.6); color:#e8c574; font-size:10px; font-weight:800; padding:4px 9px; border-radius:99px; }
.cons-body { padding:12px 14px 14px; display:flex; flex-direction:column; gap:6px; }
.cons-linha { font-size:11px; color:#9F9F9F; display:flex; align-items:center; gap:6px; }
.cons-linha svg { width:12px; height:12px; flex-shrink:0; }
.cons-pag { margin-top:2px; }
.cons-pag-bar { display:flex; height:6px; border-radius:99px; overflow:hidden; background:#2A2A2A; }
.cons-pag-seg-pagante { background:#3D8B5F; }
.cons-pag-seg-permuta { background:#7dd3fc; }
.cons-pag-legend { display:flex; gap:12px; font-size:10px; color:#9F9F9F; margin-top:6px; }
.cons-pag-vazio { font-size:10px; color:#807E7E; font-style:italic; }
.cons-rodape { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; border-top:0.75pt solid #2A2A2A; padding-top:9px; margin-top:4px; font-size:11px; color:#C6C4C4; }
.cons-var { font-weight:800; font-size:12px; }
.cons-var.alta { color:#5fbf86; } .cons-var.queda { color:#e0645e; } .cons-var.neutra { color:#9F9F9F; }
.ranking-health { font-size:9.5px; font-weight:800; color:#e8c574; border:0.75pt solid rgba(200,154,46,0.5); border-radius:99px; padding:2px 7px; margin-left:6px; }
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
  <div class="brand" onclick="showHome()"><img class="brand-logo" src="/logo/moai-logo-black.png" alt="MOAI"></div>
  <div class="topbar-right" id="topbarRight"></div>
</div>

<div id="screenHome" class="screen">
  <div class="home-title">Time de CS</div>
  <div class="home-sub">Selecione um CS para ver os indicadores, em tempo real.</div>
  <div class="team-grid" id="teamGrid"></div>
  <div class="home-tabs">
    <div class="home-tab active" id="homeTabIndicadores" onclick="mostrarAbaHome('indicadores')">Indicadores</div>
    <div class="home-tab" id="homeTabConselhos" onclick="mostrarAbaHome('conselhos')">Conselhos</div>
  </div>
  <div id="homeAbaConselhos" style="display:none;">
    <div class="section-title">Conselhos<div class="line"></div></div>
    <div id="gradeConselhosOrdenacao" style="margin-bottom:14px;"></div>
    <div id="equipeGradeConselhos"></div>
    <div class="section-title" style="margin-top:36px;">Impacto dos conselhos<div class="line"></div></div>
    <div id="equipeImpactoConselhos"></div>
  </div>
  <div id="equipeSection">
    <div class="section-title">Próximos conselhos<div class="line"></div></div>
    <div id="equipeProximosConselhos"></div>
    <div class="section-title" style="margin-top:36px;">Indicadores gerais da área<div class="line"></div></div>
    <div id="equipeIndicadores"></div>
    <div class="section-title" style="margin-top:36px;">Cases de sucesso do time<div class="line"></div></div>
    <div id="equipeSemanal"></div>
    <div class="section-title" style="margin-top:36px;">Conselhos — visão consolidada<div class="line"></div></div>
    <div id="equipeConselhos"></div>
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
          <img src="/badges/cs-destaque.png">
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
function iniciais(nome){ nome=String(nome||'').trim(); if(!nome) return '?'; var p=nome.split(/\\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }

var MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function parseDataIsoLocal_(iso){
  var m = String(iso||'').match(/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/);
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

// Preenchido de forma assíncrona por verificarGestor() — o link abaixo é só conveniência visual;
// quem decide de verdade se a rota abre é o servidor em app/gestor/page.tsx e em
// /api/gestor/visao-geral, que checam isGestor de novo e nunca confiam em nada vindo do client.
var souGestor = false;
function verificarGestor(){
  fetch('/api/gestor/check', { cache: 'no-store' }).then(function(r){ return r.json(); })
    .then(function(d){ souGestor = !!d.isGestor; renderTopbar(); })
    .catch(function(){});
}

function renderTopbar(){
  var isPessoa = currentCS !== null;
  var html = (isPessoa ? '<span class="back-link" onclick="showHome()">' + ICONS.arrowleft + 'Time</span>' : '') +
    '<select class="pickmes" id="selMes" onchange="onFiltroChange()"></select>' +
    '<select class="pickmes" id="selAno" onchange="onFiltroChange()"><option>2026</option><option>2027</option></select>' +
    '<span class="live-label"><span class="live-dot"></span>ao vivo</span>' +
    (souGestor ? '<a class="gestor-topbar-link" href="/gestor">Visão da área</a>' : '') +
    '<a class="logout-link" href="/auth/signout">Sair</a>';
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
verificarGestor();

// Mensagem de quem tentou abrir /gestor sem ser gestor e foi redirecionado de volta pra cá pelo
// servidor (ver app/gestor/page.tsx) — só um aviso, o bloqueio de verdade já aconteceu antes de
// qualquer HTML da área de gestor ser servido.
(function avisarAcessoRestrito(){
  var params = new URLSearchParams(location.search);
  if (params.get('erro') === 'acesso_restrito') {
    alert('Esta área é restrita a gestores.');
    history.replaceState(null, '', location.pathname);
  }
})();

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
  document.getElementById('equipeGradeConselhos').innerHTML = '<div class="cons-grid">'+Array(8).fill('<div class="cons-card skel" style="height:300px;"></div>').join('')+'</div>';
  document.getElementById('equipeImpactoConselhos').innerHTML = '<div class="chart-card skel" style="height:180px;"></div>';
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
    document.getElementById('equipeGradeConselhos').innerHTML = msgErro;
    document.getElementById('equipeImpactoConselhos').innerHTML = msgErro;
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
  nome = String(nome||'');
  var m = nome.match(/^(.*?)\\s*\\|\\s*(.*?)\\s*\\((.*?)\\)\\s*$/);
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

  // Números do período selecionado + resumo rápido por membro (desafio/compromisso do mês) +
  // link pra página completa — carregados à parte (assíncrono) porque vêm de uma rota nova
  // (/api/conselho/[grupo]), diferente do relatório que já preencheu o resto do modal.
  if (c.groupId) {
    html += '<div class="case-modal-campo" id="conselhoPeriodoWrap"><div class="case-modal-label">Impacto no período selecionado</div>' +
      '<div class="empty-state" style="padding:12px 0;">Carregando…</div></div>';
  }

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
  if (c.groupId) carregarImpactoPeriodoModal(c.groupId);
}
function fecharConselhoModal(){ document.getElementById('conselhoModalOverlay').classList.remove('ativo'); }

// Resumo rápido do modal: números do período + desafio/compromisso do mês corrente por membro
// (só os dois campos "de relance", os outros três só na página completa) + link pra lá. Sempre
// busca um MÊS específico (nunca "Visão Geral") — se o filtro geral do dashboard estiver em
// "Visão Geral", usa o mês corrente de verdade (hoje), já que um resumo rápido de card não faz
// sentido como agregado do ano inteiro; a "Visão Geral" de verdade fica na página completa.
// mesma técnica de app/conselho-html.ts (pizzaPresencaSVG/legendaPresenca) — duplicada aqui de
// propósito: cada página deste dashboard é um script vanilla autossuficiente, sem módulo
// compartilhado entre dashboard-html.ts e conselho-html.ts.
function pizzaPresencaModalSVG(p){
  var r = 40, c = 2 * Math.PI * r;
  var fatias = [
    { valor: p.presente, cor: '#3D8B5F' },
    { valor: p.noShow, cor: '#C0433D' },
    { valor: p.faltouSemConfirmacaoRegistrada, cor: '#C89A2E' },
  ].filter(function(f){ return f.valor > 0; });
  var offset = 0;
  var circulos = fatias.map(function(f){
    var comprimento = (f.valor / p.totalAgendados) * c;
    var svg = '<circle cx="52" cy="52" r="'+r+'" fill="none" stroke="'+f.cor+'" stroke-width="14" ' +
      'stroke-dasharray="'+comprimento+' '+(c-comprimento)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 52 52)"></circle>';
    offset += comprimento;
    return svg;
  }).join('');
  var label = p.taxaPresenca === null ? '—' : (p.taxaPresenca + '%');
  return '<svg width="104" height="104" viewBox="0 0 104 104">' + circulos +
    '<text x="52" y="58" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-size="17" font-weight="700" fill="#1A1A1A">' + label + '</text></svg>';
}
function legendaPresencaModal(p){
  var itens = [
    { label: 'Presente', valor: p.presente, cor: '#3D8B5F' },
    { label: 'No-show', valor: p.noShow, cor: '#C0433D' },
    { label: 'Faltou', valor: p.faltouSemConfirmacaoRegistrada, cor: '#C89A2E' },
  ];
  var html = itens.map(function(i){
    return '<div class="legenda-modal-item"><span class="legenda-modal-dot" style="background:'+i.cor+'"></span>'+i.label+' <b>'+i.valor+'</b></div>';
  }).join('');
  html += '<div class="legenda-modal-obs">No-show só a partir de 23/set/2026.</div>';
  return html;
}

function carregarImpactoPeriodoModal(groupId){
  var mesResumo = (currentMes === 'Visão Geral') ? MESES[new Date().getMonth()] : currentMes;
  fetchJSON_('/api/conselho/' + encodeURIComponent(groupId) + '?mes=' + encodeURIComponent(mesResumo) + '&ano=' + encodeURIComponent(currentAno)).then(function(d){
    var el = document.getElementById('conselhoPeriodoWrap');
    if (!el) return; // modal já foi fechado/trocado enquanto carregava
    var m = d.metricas;
    var presencaTxt = d.encontros.length ? (d.encontros[0].presentes + ' de ' + d.encontros[0].agendados) : '—';
    var html = '<div class="case-modal-label">Impacto em ' + mesResumo + '/' + currentAno + '</div>' +
      '<div class="mini-stats" style="display:flex;gap:14px;margin:10px 0 18px;">' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings</div><div class="dark-value num">'+m.totalMatchmakings+'</div></div>' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Cases de sucesso</div><div class="dark-value num">'+m.totalCases+'</div></div>' +
      '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Presença</div><div class="dark-value num">'+presencaTxt+'</div></div>' +
      '</div>';

    if (d.presencaMes && d.presencaMes.totalAgendados) {
      html += '<div class="case-modal-label">Taxa de presença geral em ' + d.presencaMes.mes + '</div>' +
        '<div class="presenca-modal-flex">' + pizzaPresencaModalSVG(d.presencaMes) + '<div class="legenda-modal">' + legendaPresencaModal(d.presencaMes) + '</div></div>';
    }

    html += '<div class="case-modal-label" style="margin-bottom:8px;">Desafio e compromisso do mês, por membro</div>';
    if (!d.membros.length) {
      html += '<div class="empty-state" style="padding:8px 0;">Nenhum membro neste conselho.</div>';
    } else {
      d.membros.forEach(function(mb){
        // mes_ata vem sem acento ("Marco") — compara normalizado, nunca por igualdade crua.
        var semAcento = function(s){ return String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase(); };
        var ata = (mb.atas || []).find(function(a){ return semAcento(a.mesAta) === semAcento(mesResumo); });
        html += '<div style="margin-bottom:12px;"><div style="font-weight:700;font-size:12.5px;color:#1A1A1A;margin-bottom:3px;">'+mb.nome+'</div>';
        if (!ata) {
          html += '<div style="font-size:12px;color:#9F9F9F;font-style:italic;">ata ainda não processada</div>';
        } else {
          if (ata.desafio) html += '<div style="font-size:12.5px;color:#3a3a3a;"><b>Desafio:</b> '+ata.desafio+'</div>';
          if (ata.compromisso) html += '<div style="font-size:12.5px;color:#3a3a3a;"><b>Compromisso:</b> '+ata.compromisso+'</div>';
          if (!ata.desafio && !ata.compromisso) html += '<div style="font-size:12px;color:#9F9F9F;font-style:italic;">sem desafio/compromisso registrado</div>';
        }
        html += '</div>';
      });
    }

    html += '<a href="/conselho/'+encodeURIComponent(groupId)+'?mes='+encodeURIComponent(currentMes)+'&ano='+currentAno+'" class="destaque-form-btn" style="display:inline-block;text-decoration:none;margin-top:4px;">Ver histórico completo do conselho</a>';
    el.innerHTML = html;
  }).catch(function(err){
    var el = document.getElementById('conselhoPeriodoWrap');
    if (el) el.innerHTML = '<div class="case-modal-label">Impacto no período selecionado</div><div class="empty-state" style="padding:8px 0;">Erro ao carregar: '+err.message+'</div>';
  });
}

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
function renderEquipeSecao_(id, fn){
  // Isola cada seção da tela de equipe: se uma seção tiver um dado inesperado e o render dela
  // falhar, só ELA mostra o erro (com a mensagem real do JavaScript, pra facilitar o diagnóstico)
  // e as outras continuam normais — antes, uma falha em qualquer seção apagava as cinco de uma vez
  // com o mesmo texto genérico "Erro ao consultar", escondendo qual seção era a culpada de fato.
  try {
    fn();
  } catch (e) {
    console.error('Erro ao renderizar seção ' + id + ':', e);
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="empty-state">Erro ao exibir esta seção: ' + (e && e.message ? e.message : e) + '</div>';
  }
}
function renderEquipe(data){
  modoGeralAtual = !!data.periodo.geral;
  renderEquipeSecao_('equipeProximosConselhos', function(){
    renderProximosConselhosEquipe(data.proximosConselhos);
  });
  renderEquipeSecao_('equipeIndicadores', function(){
    var ind = data.indicadores;
    document.getElementById('equipeIndicadores').innerHTML =
      '<div class="grid3">'+kpiCard('Churn', ind.churn)+kpiCard('Revenue Churn', ind.revenueChurn, 'R$')+kpiCard('Cases de Sucesso', ind.casesSucesso)+'</div>' +
      '<div class="grid3">'+kpiCard('Matchmakings', ind.matchmakings)+kpiCard('Rounds', ind.rounds)+kpiCard('Health da Base (média)', ind.healthDaBase)+'</div>' +
      renderChurnOrfao(data.churnOrfao);
    animarMFills(document.getElementById('equipeIndicadores'));
  });

  renderEquipeSecao_('equipeSemanal', function(){
    if (data.casesPorCS && data.casesPorCS.length > 0) {
      var pontosCases = data.casesPorCS.map(function(c){ return { v: c.qtd, lbl: c.nome }; });
      document.getElementById('equipeSemanal').innerHTML = '<div class="chart-card"><div class="chart-title">'+ICONS.calendar+'Cases de sucesso registrados por CS ('+data.membrosIncluidos.length+' incluídos)</div>' + barChart(pontosCases, '#fbbf24') + '</div>';
    } else {
      document.getElementById('equipeSemanal').innerHTML = '<div class="empty-state">Nenhum case de sucesso registrado neste período.</div>';
    }
  });

  renderEquipeSecao_('equipeConselhos', function(){
    var a = agregarConselhos(data.conselhos);
    var mediaGeral = a.totalRegistros ? Math.round(a.totalPresente/a.totalRegistros*100) : 0;
    document.getElementById('equipeConselhos').innerHTML = '<div class="hero-grid">' +
      '<div class="dark-card" style="display:flex;align-items:center;gap:20px;">' + donutChart(a.totalPresente, a.totalAusente, a.totalReposicao, 130) +
        '<div><div class="dark-label">Presença média — toda a operação</div><div class="dark-value num '+(mediaGeral>=60?'c-g':'c-r')+'">'+mediaGeral+'%</div><div class="dark-sub">'+a.total+' conselhos · '+a.totalMembros+' membros</div></div></div>' +
      '<div class="mini-stats" style="display:flex;flex-direction:column;gap:14px;">' +
        '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Conselhos abaixo de 60%</div><div class="dark-value num c-r">'+a.atencao.length+'</div></div>' +
        '<div class="mini-stat" style="background:#1A1A1A;flex:1;display:flex;flex-direction:column;justify-content:center;"><div class="dark-label">Congelados</div><div class="dark-value num c-y">'+a.congelados+'</div></div>' +
      '</div></div>';
  });

  // BUG FIX (24/09/2026): antes passava data.impactoConselhos (o alias, que é só o objeto do
  // histórico) pra uma função que lê .impactoConselhosHistorico/.impactoConselhosPeriodo dele —
  // os dois vinham undefined e a seção sempre mostrava "Sem dados de impacto disponíveis".
  renderEquipeSecao_('equipeGradeConselhos', function(){ renderGradeConselhos(data); });
  renderEquipeSecao_('equipeImpactoConselhos', function(){ renderImpactoConselhosEquipe(data); });
  renderEquipeSecao_('csTop', function(){ renderCSTop(data.csTop); });
  renderEquipeSecao_('equipeRanking', function(){ renderRankingEquipe(data.ranking); });
}

// Home da equipe em duas abas (pedido do Vitor, 24/09/2026): "Indicadores" (tudo que já existia)
// e "Conselhos" (grade de conselheiros + impacto dos conselhos). A aba escolhida fica guardada
// no navegador só como conveniência — a tela funciona igual sem isso.
function mostrarAbaHome(aba){
  var conselhos = aba === 'conselhos';
  document.getElementById('homeAbaConselhos').style.display = conselhos ? 'block' : 'none';
  document.getElementById('equipeSection').style.display = conselhos ? 'none' : 'block';
  document.getElementById('homeTabConselhos').classList.toggle('active', conselhos);
  document.getElementById('homeTabIndicadores').classList.toggle('active', !conselhos);
  try { localStorage.setItem('moaiHomeAba', aba); } catch (e) {}
}
(function restaurarAbaHome(){
  var aba = null;
  try { aba = localStorage.getItem('moaiHomeAba'); } catch (e) {}
  if (aba === 'conselhos') mostrarAbaHome('conselhos');
})();

function escHtml_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}

// Grade de conselhos: um cartão por conselho. Ordem padrão é por produto (nivelOrdem, já vem
// calculado do servidor a partir do próprio nome do grupo — Setorial e afins sempre por último);
// um controle visível deixa trocar pra "Próximo encontro" (padrão antigo) sem pedir nada de novo
// ao servidor — mesmo padrão do toggle de impacto dos conselhos, reordena em memória. Clique no
// cartão abre a visão combinada conselheiro + conselho (/conselho/[grupo]), já no mesmo período
// selecionado aqui.
var gradeConselhosAtual_ = null;
var gradeConselhosOrdenacao_ = 'produto';
function renderGradeConselhos(data){
  gradeConselhosAtual_ = data.gradeConselhos;
  if (!data.gradeConselhos) {
    document.getElementById('gradeConselhosOrdenacao').innerHTML = '';
    document.getElementById('equipeGradeConselhos').innerHTML = '<div class="empty-state">Não foi possível montar a grade de conselhos' + (data.gradeConselhosErro ? ': ' + escHtml_(data.gradeConselhosErro) : '.') + '</div>';
    return;
  }
  renderGradeOrdenacaoControl_();
  desenharGradeConselhos_();
}
function mudarGradeOrdenacaoProduto(){ gradeConselhosOrdenacao_ = 'produto'; renderGradeOrdenacaoControl_(); desenharGradeConselhos_(); }
function mudarGradeOrdenacaoProximo(){ gradeConselhosOrdenacao_ = 'proximo'; renderGradeOrdenacaoControl_(); desenharGradeConselhos_(); }
function renderGradeOrdenacaoControl_(){
  var estiloAtivo = 'background:#C89A2E;color:#1A1A1A;border:none;';
  var estiloInativo = 'background:#1A1A1A;color:#9F9F9F;border:0.75pt solid #2A2A2A;';
  document.getElementById('gradeConselhosOrdenacao').innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '<span style="font-size:11px;color:#807E7E;font-weight:700;">Ordenar por</span>' +
      '<button class="destaque-form-btn" style="'+(gradeConselhosOrdenacao_==='produto'?estiloAtivo:estiloInativo)+'" onclick="mudarGradeOrdenacaoProduto()">Produto</button>' +
      '<button class="destaque-form-btn" style="'+(gradeConselhosOrdenacao_==='proximo'?estiloAtivo:estiloInativo)+'" onclick="mudarGradeOrdenacaoProximo()">Próximo encontro</button>' +
    '</div>';
}
function desenharGradeConselhos_(){
  var el = document.getElementById('equipeGradeConselhos');
  var cards = (gradeConselhosAtual_ && gradeConselhosAtual_.cards || []).slice();
  if (!cards.length) { el.innerHTML = '<div class="empty-state">Nenhum conselho ativo encontrado.</div>'; return; }
  if (gradeConselhosOrdenacao_ === 'proximo') {
    var tempo = function(c){ return c.proximaData && c.proximaDataEhFutura ? new Date(c.proximaData).getTime() : Number.MAX_SAFE_INTEGER; };
    cards.sort(function(a,b){ return tempo(a) - tempo(b) || a.conselheiro.localeCompare(b.conselheiro); });
  } else {
    cards.sort(function(a,b){ return a.nivelOrdem - b.nivelOrdem || a.conselheiro.localeCompare(b.conselheiro); });
  }
  var qs = '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno);
  var html = '<div class="cons-grid">';
  cards.forEach(function(c){
    var foto = c.fotoUrl
      ? '<img class="cons-foto" loading="lazy" src="' + escHtml_(c.fotoUrl) + '" alt="">'
      : '<div class="cons-foto-fallback">' + escHtml_(iniciais(c.conselheiro)) + '</div>';
    var selo = c.congelado ? '<div class="cons-selo congelado">Congelado</div>' : (c.atencao ? '<div class="cons-selo atencao">Atenção</div>' : '');
    var health = (c.healthscore !== null && c.healthscore !== undefined) ? '<div class="cons-health" title="Healthscore do conselho no período">♥ ' + c.healthscore + '</div>' : '';
    var proxima = '';
    if (c.proximaData && c.proximaDataEhFutura) {
      var f = formatarDataConselho(c.proximaData);
      if (f) proxima = '<div class="cons-linha">' + ICONS.calendar + 'Próximo: ' + escHtml_(f.texto) + '</div>';
    }
    if (!proxima) proxima = '<div class="cons-linha">' + ICONS.clock + 'Sem próximo encontro na agenda</div>';
    var variacao = '<span class="cons-var neutra">sem presença registrada</span>';
    if (c.presenca) {
      var v = c.presenca.variacaoPp;
      var seta = v === null ? '' : (v > 0 ? '▲ ' : (v < 0 ? '▼ ' : '= '));
      var classe = v === null ? 'neutra' : (v > 0 ? 'alta' : (v < 0 ? 'queda' : 'neutra'));
      var comp = v === null ? '' : ' · ' + seta + Math.abs(v) + ' p.p. vs ' + c.presenca.mesAnterior.slice(0,3);
      variacao = '<span class="cons-var ' + classe + '" title="Presença em ' + escHtml_(c.presenca.mes) + ' comparada ao encontro anterior">' + c.presenca.taxa + '%' + comp + '</span>';
    }
    var perfilLinhas = '';
    if (c.segmentoAtuacao) perfilLinhas += '<div class="cons-linha">Segmento: ' + escHtml_(c.segmentoAtuacao) + '</div>';
    if (c.especialidadeConselheiro) perfilLinhas += '<div class="cons-linha">Especialidade: ' + escHtml_(c.especialidadeConselheiro) + '</div>';
    var pagamento = '<div class="cons-pag-vazio">Sem status de pagamento classificado</div>';
    if (c.pagamento) {
      var pctPag = Math.round(c.pagamento.pagante / c.pagamento.total * 100);
      pagamento = '<div class="cons-pag-bar"><div class="cons-pag-seg-pagante" style="width:' + pctPag + '%;"></div><div class="cons-pag-seg-permuta" style="width:' + (100-pctPag) + '%;"></div></div>' +
        '<div class="cons-pag-legend"><span><span class="legend-dot" style="background:#3D8B5F;"></span>' + c.pagamento.pagante + ' pagante(s)</span>' +
        '<span><span class="legend-dot" style="background:#7dd3fc;"></span>' + c.pagamento.permuta + ' permuta</span></div>';
    }
    html += '<a class="cons-card' + (c.congelado ? ' congelado' : '') + '" href="/conselho/' + encodeURIComponent(c.groupId) + qs + '">' +
      '<div class="cons-foto-wrap">' + foto + selo + health +
        '<div class="cons-over"><div class="cons-nome">' + escHtml_(c.conselheiro) + '</div><div class="cons-nivel">' + escHtml_(c.nivel) + '</div></div>' +
      '</div>' +
      '<div class="cons-body">' +
        '<div class="cons-linha">CS responsável: <b style="color:#fff;">' + escHtml_(c.csResponsavel) + '</b></div>' +
        perfilLinhas +
        proxima +
        '<div class="cons-pag">' + pagamento + '</div>' +
        '<div class="cons-rodape"><span>' + c.membros + ' membros</span>' + variacao + '</div>' +
      '</div></a>';
  });
  html += '</div>';
  el.innerHTML = html;
}
function healthscoreDoGrupo_(groupId){
  if (!gradeConselhosAtual_ || !groupId) return null;
  var c = (gradeConselhosAtual_.cards || []).find(function(x){ return x.groupId === groupId; });
  return c ? c.healthscore : null;
}

// Duas visões, nunca uma substituindo a outra (decisão confirmada com o Vitor): histórico
// completo (todos os meses, sempre) e período selecionado no dashboard — guardadas as duas de
// uma vez quando o relatório da equipe chega, o toggle só troca qual delas está em tela, sem
// pedir nada de novo pro servidor.
var impactoConselhosDados_ = null;
var impactoConselhosModo_ = 'historico';
function renderImpactoConselhosEquipe(dataEquipe){
  impactoConselhosDados_ = { historico: dataEquipe.impactoConselhosHistorico, periodo: dataEquipe.impactoConselhosPeriodo };
  impactoConselhosModo_ = 'historico';
  desenharImpactoConselhosEquipe_();
}
function mudarImpactoConselhosHistorico(){ impactoConselhosModo_ = 'historico'; desenharImpactoConselhosEquipe_(); }
function mudarImpactoConselhosPeriodo(){ impactoConselhosModo_ = 'periodo'; desenharImpactoConselhosEquipe_(); }

function desenharImpactoConselhosEquipe_(){
  var el = document.getElementById('equipeImpactoConselhos');
  var imp = impactoConselhosDados_ ? impactoConselhosDados_[impactoConselhosModo_] : null;
  var estiloAtivo = 'background:#C89A2E;color:#1A1A1A;border:none;';
  var estiloInativo = 'background:#1A1A1A;color:#9F9F9F;border:0.75pt solid #2A2A2A;';
  var toggleHtml = '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
    '<button class="destaque-form-btn" style="'+(impactoConselhosModo_==='historico'?estiloAtivo:estiloInativo)+'" onclick="mudarImpactoConselhosHistorico()">Histórico completo</button>' +
    '<button class="destaque-form-btn" style="'+(impactoConselhosModo_==='periodo'?estiloAtivo:estiloInativo)+'" onclick="mudarImpactoConselhosPeriodo()">Período selecionado</button>' +
  '</div>';

  if (!imp) { el.innerHTML = toggleHtml + '<div class="empty-state">Sem dados de impacto disponíveis.</div>'; return; }

  var html = toggleHtml + '<div class="mini-stats" style="display:flex;gap:14px;">' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Cases de sucesso</div><div class="dark-value num">'+imp.totalCases+'</div></div>' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings</div><div class="dark-value num">'+imp.totalMatchmakings+'</div></div>' +
    '<div class="mini-stat" style="background:#1A1A1A;flex:1;"><div class="dark-label">Matchmakings sem resultado</div><div class="dark-value num '+(imp.matchmakingsSemResultado>0?'c-r':'')+'">'+imp.matchmakingsSemResultado+'</div></div>' +
  '</div>';

  if (imp.topConselhos && imp.topConselhos.length > 0) {
    var maxTotal = Math.max.apply(null, imp.topConselhos.map(function(t){ return t.total; }).concat([1]));
    html += '<div class="chart-card ranking-card" style="margin-top:14px;"><div class="ranking-title" style="display:flex;align-items:center;gap:6px;">'+ICONS.trophy+'Conselhos com mais impacto (cases + matchmakings)</div>';
    imp.topConselhos.forEach(function(t, i){
      var contato = parseConselhoNome(t.nome).contato;
      var pct = Math.round(t.total / maxTotal * 100);
      var linkAbre = t.groupId ? (' onclick="window.location.href=\\'/conselho/'+encodeURIComponent(t.groupId)+'?mes='+encodeURIComponent(currentMes)+'&ano='+currentAno+'\\'"') : '';
      html += '<div class="ranking-row"'+(t.groupId?' style="cursor:pointer;"'+linkAbre:'')+'>' +
        '<span class="ranking-pos">'+(i+1)+'º</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="ranking-nome" style="white-space:normal;">'+contato+' <span style="color:#9F9F9F;font-weight:500;">· '+t.cs+'</span>' +
            (healthscoreDoGrupo_(t.groupId) !== null ? '<span class="ranking-health" title="Healthscore do conselho no período">♥ '+healthscoreDoGrupo_(t.groupId)+'</span>' : '') + '</div>' +
          '<div style="height:5px;background:#2A2A2A;border-radius:99px;overflow:hidden;margin-top:5px;"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#C89A2E,#e8c574);border-radius:99px;"></div></div>' +
        '</div>' +
        '<span class="ranking-valor num">'+t.total+'</span></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="empty-state">Nenhum case ou matchmaking atribuído a um conselho '+(impactoConselhosModo_==='periodo'?'neste período':'ainda')+'.</div>';
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
