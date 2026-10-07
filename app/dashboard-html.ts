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
import { GTD_CHECKLIST_STYLE, GTD_CHECKLIST_SCRIPT } from '@/lib/gtd-checklist';
import { SEMAFORO_CONFIRMADOS, AGENDA_PASSADO_COR, SEMAFORO_NEUTRO, AGENDA_DURACAO_CONSELHO_MIN } from '@/lib/constants';

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
.sync-wrap { display:flex; align-items:center; gap:8px; }
.sync-btn { font-family:'Inter',sans-serif; font-size:11px; font-weight:700; color:#1A1A1A; background:#fff; border:0.75pt solid #D8D5D5; border-radius:8px; padding:7px 12px; cursor:pointer; transition: border-color .15s, background .15s; }
.sync-btn:hover { border-color:#1A1A1A; }
.sync-btn:disabled { opacity:0.55; cursor:not-allowed; }
.sync-status-topbar { font-size:10.5px; color:#807E7E; max-width:180px; }
.sync-status-topbar.ok { color:#3D8B5F; }
.sync-status-topbar.erro { color:#C0433D; }
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
.jornada-photo-wrap { position:relative; width:130px; height:130px; flex-shrink:0; }
.jornada-photo-editar { position:absolute; bottom:-6px; right:-6px; width:32px; height:32px; border-radius:50%; background:#fff; color:#1A1A1A; border:2px solid #111111; align-items:center; justify-content:center; font-size:14px; cursor:pointer; }
.jornada-photo-editar:hover { background:#F5F5F5; }
/* editor de foto com recorte (brainstorm 29/09/2026) — canvas simples, sem biblioteca externa */
.foto-crop-canvas-wrap { width:280px; height:280px; border-radius:50%; overflow:hidden; margin:0 auto 18px; background:#F5F5F5; border:1px dashed #D8D5D5; cursor:grab; touch-action:none; }
.foto-crop-canvas-wrap.arrastando { cursor:grabbing; }
.foto-crop-canvas-wrap canvas { width:100%; height:100%; display:block; }
.foto-crop-picker { margin-bottom:18px; }
.foto-crop-zoom-row { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.foto-crop-zoom-row input[type=range] { flex:1; }
.foto-crop-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; align-items:center; }
.foto-crop-status { font-size:12px; color:#9F9F9F; }
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
.kpi-recorde-badge { display:inline-flex; align-items:center; gap:3px; border-radius:99px; padding:3px 9px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.3px; background:rgba(251,191,36,0.16); color:#fbbf24; margin-left:6px; white-space:nowrap; }
.kpi-recorde-linha { font-size:10.5px; color:#fbbf24; margin-top:4px; }
.c-g{color:#6ee7b7;}.c-y{color:#fbbf24;}.c-r{color:#f87171;}.c-gray{color:#807E7E;}
/* Parte B (25/09/2026): linha de contexto do time dentro do card individual, blur configurável pelo gestor */
.kpi-time-linha { font-size: 11px; color:#7A7878; margin-top:7px; }
.kpi-time-valor { font-weight:800; color:#B7B5B5; }
.kpi-blur .kpi-time-valor { filter: blur(4px); user-select:none; }
/* notinha clicável de pontuação/critério (Parte A/C, 25/09/2026) */
.info-btn { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.14); color:#e5e5e5; font-size:10px; font-weight:800; border:none; cursor:pointer; margin-left:6px; flex-shrink:0; font-family:'Inter',sans-serif; line-height:1; padding:0; }
.info-btn:hover { background:rgba(255,255,255,0.28); }
.info-btn.dark { background:#E9E9E9; color:#5D5D5D; }
.info-btn.dark:hover { background:#D8D5D5; }
.score-detalhe-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:0.75pt solid #EEECEC; font-size:12px; color:#5D5D5D; }
.score-detalhe-row:last-child { border-bottom:none; }
.score-detalhe-label { flex:1; color:#3a3a3a; font-weight:600; }
.score-detalhe-peso { color:#9F9F9F; font-size:11px; }
.score-detalhe-valor { color:#9F9F9F; white-space:nowrap; }
.score-detalhe-pontos { font-weight:800; color:#1A1A1A; white-space:nowrap; min-width:56px; text-align:right; }
.meta-aviso { font-size:10px; font-weight:600; color:#C89A2E; background:rgba(200,154,46,0.12); border-radius:999px; padding:2px 8px; white-space:nowrap; margin-left:8px; }
/* posição/top3 na home restrita do CS comum (Parte A, 25/09/2026) */
.minha-posicao-badge { display:inline-flex; align-items:center; gap:8px; background:#fff; border:0.75pt solid #D8D5D5; border-radius:99px; padding:10px 18px; font-size:12.5px; font-weight:700; color:#1A1A1A; margin-top:6px; }
.perfil-vazio { max-width:480px; margin:0 auto; text-align:center; padding:120px 24px; color:#5D5D5D; }
.perfil-vazio h2 { font-size:20px; color:#1A1A1A; margin-bottom:10px; }
.perfil-vazio p { font-size:13px; line-height:1.6; }

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

/* ===== 1:1 gestor↔CS (Parte A, 28/09/2026) ===== */
.ultimo-umaum { display:inline-flex; flex-direction:column; gap:2px; margin-top:10px; background:rgba(255,255,255,0.08); border:0.75pt solid rgba(255,255,255,0.14); border-radius:16px; padding:10px 16px; font-size:12px; color:#e5e5e5; max-width:540px; }
.ultimo-umaum-titulo { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#D4AF37; }
.ultimo-umaum-data { font-size:11px; color:#9F9F9F; margin-top:2px; }
.ultimo-umaum-combinados { font-size:12.5px; color:#fff; margin-top:4px; line-height:1.5; }
.umaum-form-card { background:#1A1A1A; border-radius:24px; padding:20px 24px; margin-bottom:20px; color:#fff; }
.umaum-form-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.umaum-form-row label { display:flex; flex-direction:column; gap:6px; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#9F9F9F; flex:1; min-width:180px; }
.umaum-form-row input[type=date] { background:#0F0F0F; border:0.75pt solid #3A3A3A; border-radius:10px; color:#fff; font-size:13px; padding:9px 10px; font-family:'Inter',sans-serif; }
.umaum-form-row textarea { background:#0F0F0F; border:0.75pt solid #3A3A3A; border-radius:10px; color:#fff; font-size:13px; padding:10px 12px; font-family:'Inter',sans-serif; resize:vertical; min-height:64px; width:100%; }
.umaum-form-actions { display:flex; align-items:center; gap:12px; }
.umaum-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:18px 20px; margin-bottom:12px; }
.umaum-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.umaum-card-data { font-size:13px; font-weight:800; color:#1A1A1A; }
.umaum-card-gestor { font-size:11px; color:#9F9F9F; }
.umaum-status-pill { font-size:10px; font-weight:800; padding:4px 11px; border-radius:999px; color:#fff; white-space:nowrap; }
.umaum-status-select { font-family:'Inter',sans-serif; font-size:10.5px; font-weight:700; padding:4px 8px; border-radius:999px; border:1.25pt solid; background:#fff; cursor:pointer; }
.umaum-card-campo { font-size:12.5px; color:#5D5D5D; line-height:1.6; margin-bottom:8px; }
.umaum-card-campo:last-child { margin-bottom:0; }
.umaum-card-campo b { color:#1A1A1A; font-weight:700; display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
.umaum-card-editar { font-size:11px; font-weight:700; color:#5D5D5D; background:none; border:0.75pt solid #D8D5D5; border-radius:999px; padding:5px 12px; cursor:pointer; }
.umaum-card-editar:hover { background:#F5F5F5; }
.umaum-card-excluir { font-size:11px; font-weight:700; color:#C0392B; background:none; border:0.75pt solid #EBC6C0; border-radius:999px; padding:5px 12px; cursor:pointer; margin-left:6px; }
.umaum-card-excluir:hover { background:#FBEEEC; }
.advertencia-resumo { display:inline-flex; flex-direction:column; align-items:flex-start; gap:2px; margin-bottom:20px; padding:14px 20px; border-radius:16px; background:#F5F5F5; border:0.75pt solid #D8D5D5; }
.advertencia-resumo-num { font-family:'Bricolage Grotesque',sans-serif; font-size:32px; font-weight:800; color:#1A1A1A; line-height:1; }
.advertencia-resumo-label { font-size:11.5px; color:#807E7E; margin-top:4px; }
.advertencia-resumo.destaque { background:#FBEEEC; border-color:#EBC6C0; }
.advertencia-resumo.destaque .advertencia-resumo-num { color:#C0433D; }
.advertencia-resumo.destaque .advertencia-resumo-label { color:#C0433D; font-weight:700; }

/* ===== agenda visual (Parte C, 28/09/2026) ===== */
.agenda-toolbar { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:16px; }
.agenda-nav { display:flex; align-items:center; gap:10px; }
.agenda-nav-btn { width:32px; height:32px; border-radius:50%; border:0.75pt solid #D8D5D5; background:#fff; color:#1A1A1A; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
.agenda-nav-btn:hover { background:#F5F5F5; }
.agenda-periodo-label { font-size:13px; font-weight:800; color:#1A1A1A; min-width:150px; text-transform:capitalize; }
.agenda-hoje-btn { font-size:11px; font-weight:700; color:#5D5D5D; background:#fff; border:0.75pt solid #D8D5D5; border-radius:999px; padding:6px 14px; cursor:pointer; }
.agenda-hoje-btn:hover { background:#F5F5F5; }
.agenda-view-toggle { display:flex; gap:6px; background:#EEECEC; border-radius:999px; padding:3px; }
.agenda-view-btn { font-size:11.5px; font-weight:700; color:#5D5D5D; background:none; border:none; border-radius:999px; padding:7px 16px; cursor:pointer; }
.agenda-view-btn.active { background:#1A1A1A; color:#fff; }

.agenda-semana-sem-itens { text-align:center; padding:40px 20px; color:#9F9F9F; font-size:12.5px; background:#fff; border:0.75pt dashed #D8D5D5; border-radius:16px; }

/* visão em lista (de volta em 29/09/2026, opção lado a lado com a grade — não substitui) */
.agenda-semana-list { display:flex; flex-direction:column; gap:10px; }
.agenda-item-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:16px; padding:13px 16px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; transition: transform .2s, box-shadow .2s; }
.agenda-item-card.clicavel { cursor:pointer; }
.agenda-item-card.clicavel:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); border-color:#1A1A1A; }
.agenda-item-data { width:50px; flex-shrink:0; text-align:center; }
.agenda-item-dia { font-family:'Bricolage Grotesque',sans-serif; font-size:19px; font-weight:800; color:#1A1A1A; line-height:1.1; }
.agenda-item-hora { font-size:10.5px; color:#807E7E; font-weight:700; }
.agenda-item-corpo { flex:1; min-width:160px; }
.agenda-item-tipo { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#807E7E; margin-bottom:2px; }
.agenda-item-nome { font-size:13.5px; font-weight:700; color:#1A1A1A; }
.agenda-item-sub { font-size:11.5px; color:#807E7E; margin-top:2px; }
.agenda-pill { font-size:10px; font-weight:800; padding:5px 11px; border-radius:99px; color:#fff; white-space:nowrap; flex-shrink:0; }
.agenda-presenca-mini { display:flex; gap:4px; flex-wrap:wrap; max-width:220px; }
.agenda-presenca-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }

/* grade de horário da semana (Parte 3, redesign 28/09/2026; janela estendida 29/09/2026) —
   colunas por dia, eixo de horário fixo 07:00–23:00, cada encontro como bloco posicionado no
   horário real (estilo Google Calendar Semana), lado a lado com a visão em lista acima. */
.agenda-semana-grid-wrap { overflow-x:auto; }
.agenda-semana-grid-inner { min-width:600px; }
.agenda-semana-header { display:flex; }
.agenda-semana-header-eixo { width:42px; flex-shrink:0; }
.agenda-semana-header-dias { flex:1; display:grid; grid-template-columns:repeat(7,1fr); }
.agenda-semana-cab-dia { text-align:center; font-size:10px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.4px; padding-bottom:8px; }
.agenda-semana-cab-dia.hoje { color:#1A1A1A; }
.agenda-semana-cab-num { font-family:'Bricolage Grotesque',sans-serif; font-size:13px; }
.agenda-semana-corpo { display:flex; }
.agenda-semana-eixo { width:42px; flex-shrink:0; position:relative; height:800px; }
.agenda-semana-eixo-hora { position:absolute; right:8px; transform:translateY(-50%); font-size:9px; font-weight:700; color:#9F9F9F; white-space:nowrap; }
.agenda-semana-dias { flex:1; position:relative; height:800px; display:grid; grid-template-columns:repeat(7,1fr); border:0.75pt solid #D8D5D5; border-radius:12px; background:#fff; overflow:hidden; }
.agenda-semana-linhas { position:absolute; inset:0; grid-column:1/-1; grid-row:1/-1; z-index:0; }
.agenda-semana-linha { position:absolute; left:0; right:0; border-top:0.75pt solid #EEECEC; }
.agenda-semana-coluna { position:relative; z-index:1; border-left:0.75pt solid #EEECEC; }
.agenda-semana-coluna:first-child { border-left:none; }
.agenda-semana-coluna.hoje { background:rgba(26,26,26,0.025); }
.agenda-semana-bloco { position:absolute; border-radius:7px; padding:3px 6px; color:#fff; overflow:hidden; cursor:pointer; box-sizing:border-box; margin:0 2px; transition: box-shadow .15s; }
.agenda-semana-bloco:hover { box-shadow:0 4px 14px rgba(0,0,0,0.18); z-index:2; }
.agenda-semana-bloco-hora { font-size:8.5px; font-weight:800; opacity:0.9; line-height:1.2; }
.agenda-semana-bloco-nome { font-size:10px; font-weight:700; line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.agenda-semana-bloco-sub { font-size:8.5px; opacity:0.85; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.agenda-semana-bloco-selo { position:absolute; top:2px; right:3px; font-size:8px; font-weight:800; background:rgba(255,255,255,0.88); color:#1A1A1A; border-radius:99px; padding:1px 5px; line-height:1.4; }
.agenda-semana-mais { position:absolute; left:4px; right:4px; text-align:center; font-size:8.5px; font-weight:700; color:#9F9F9F; background:#F5F5F5; border-radius:6px; padding:2px 0; z-index:1; }
.agenda-semana-mais-antes { top:3px; }
.agenda-semana-mais-depois { bottom:3px; }
@media (max-width:700px){ .agenda-semana-eixo, .agenda-semana-header-eixo { width:32px; } .agenda-semana-bloco-sub { display:none; } }

/* Sáb/Dom raramente têm conselho ou round (checado nos dados reais em 28/09/2026 — nenhum item
   cai em dow 0/6) — colunas mais estreitas ganham espaço de leitura pros dias úteis, Parte 4. */
.agenda-mes-grid { display:grid; grid-template-columns:repeat(5,1fr) 0.62fr 0.62fr; gap:6px; }
.agenda-mes-cab { text-align:center; font-size:10px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.4px; padding-bottom:4px; }
.agenda-mes-cab.fim-semana { color:#C6C4C4; }
.agenda-mes-dia { background:#fff; border:0.75pt solid #D8D5D5; border-radius:12px; padding:6px; min-height:78px; max-height:94px; overflow:hidden; display:flex; flex-direction:column; gap:3px; }
.agenda-mes-dia.fora-do-mes { background:#FAFAFA; border-color:#EEECEC; }
.agenda-mes-dia.fim-semana { background:#FCFCFC; }
.agenda-mes-dia.hoje { border-color:#1A1A1A; border-width:1.5pt; }
.agenda-mes-dia-num { font-size:10.5px; font-weight:800; color:#5D5D5D; }
.agenda-mes-dia.fora-do-mes .agenda-mes-dia-num { color:#C6C4C4; }
.agenda-mes-chip { position:relative; font-size:9px; font-weight:700; border-radius:5px; padding:2px 5px 2px 5px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
.agenda-mes-chip.com-dot { padding-left:12px; }
.agenda-mes-chip-dot { position:absolute; top:50%; left:5px; width:6px; height:6px; border-radius:50%; transform:translateY(-50%); box-shadow:0 0 0 1px rgba(255,255,255,0.6); }
.agenda-mes-mais { font-size:8.5px; font-weight:700; color:#9F9F9F; padding:1px 5px; }
/* semáforo de confirmações (07/10/2026): fundo do bloco = faixa de confirmados; nível vira ponto */
.agenda-nivel-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle; flex-shrink:0; box-shadow:0 0 0 1.5px currentColor; }
.agenda-legenda { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; margin:-6px 0 14px; font-size:10.5px; font-weight:700; color:#5D5D5D; }
.agenda-legenda-titulo { color:#807E7E; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; font-size:9.5px; }
.agenda-legenda-item { display:inline-flex; align-items:center; gap:5px; }
.agenda-legenda-cor { width:12px; height:12px; border-radius:4px; display:inline-block; }
@media (max-width:700px){ .agenda-mes-dia{ min-height:56px; max-height:70px; } .agenda-mes-chip{ font-size:8px; } }

/* ===== resolver de aliases de NPS (Parte D, 28/09/2026) ===== */
.resolver-card { background:#fff; border:1px dashed #D8D5D5; border-radius:14px; padding:14px 16px; margin-bottom:10px; }
.resolver-head { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.resolver-nome-raw { font-weight:700; font-size:13.5px; color:#1A1A1A; }
.resolver-sub { font-size:11px; color:#9F9F9F; margin-top:2px; }
.resolver-linha { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.resolver-select { font-family:'Inter',sans-serif; font-size:12.5px; padding:7px 10px; border-radius:9px; border:0.75pt solid #D8D5D5; background:#fff; color:#1A1A1A; min-width:220px; }
.resolver-btn { font-family:'Inter',sans-serif; font-size:12px; font-weight:700; padding:7px 14px; border-radius:9px; border:none; background:#1A1A1A; color:#fff; cursor:pointer; }
.resolver-btn:disabled { opacity:0.5; cursor:default; }
.resolver-status { font-size:11.5px; margin-top:6px; }
.resolver-status.ok { color:#3D8B5F; }
.resolver-status.erro { color:#C0433D; }

.empty-state { text-align:center; padding:60px 20px; color:#9F9F9F; font-size:12.5px; }
${GTD_CHECKLIST_STYLE}
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
    <div class="section-title">Agenda<div class="line"></div></div>
    <div class="agenda-toolbar">
      <div class="agenda-nav">
        <button class="agenda-nav-btn" type="button" onclick="agendaNavegar(-1)">&lsaquo;</button>
        <div class="agenda-periodo-label" id="agendaPeriodoLabel">&nbsp;</div>
        <button class="agenda-nav-btn" type="button" onclick="agendaNavegar(1)">&rsaquo;</button>
        <button class="agenda-hoje-btn" type="button" onclick="agendaIrParaHoje()">Hoje</button>
      </div>
      <div class="agenda-view-toggle">
        <button class="agenda-view-btn active" type="button" id="agendaViewSemanaBtn" onclick="agendaMudarVisao('semana')">Semana</button>
        <button class="agenda-view-btn" type="button" id="agendaViewListaBtn" onclick="agendaMudarVisao('lista')">Lista</button>
        <button class="agenda-view-btn" type="button" id="agendaViewMesBtn" onclick="agendaMudarVisao('mes')">Mês</button>
      </div>
    </div>
    <div class="agenda-legenda" id="agendaLegenda"></div>
    <div id="agendaBody"><div class="empty-state">Carregando…</div></div>
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
    <div id="npsAliasesPendentesBlock" style="display:none;margin-top:36px;">
      <div class="section-title">NPS — conselhos pendentes de confirmação<div class="line"></div></div>
      <p class="fb-intro">O board de NPS não amarra a resposta direto num conselho cadastrado — o texto digitado por quem respondeu ("Qual é o seu Conselho?") precisa ser confirmado contra o roster abaixo antes de entrar nos cortes por CS.</p>
      <div id="npsAliasesPendentesList"></div>
    </div>
    <div style="margin-top:36px;">
      <div class="section-title">Relatório mensal de Conselhos<div class="line"></div></div>
      <p class="fb-intro">NPS de conselheiro/conselho/CS, dados operacionais dos encontros e ranking de destaque de um mês, num único HTML autônomo pra baixar e compartilhar.</p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;">
        <select class="pickmes" id="selMesRelatorio"></select>
        <select class="pickmes" id="selAnoRelatorio"><option>2026</option><option>2027</option></select>
        <button class="resolver-btn" type="button" onclick="preVisualizarRelatorioMensal()">Pré-visualizar</button>
        <button class="resolver-btn" type="button" onclick="baixarRelatorioMensal()">Baixar HTML</button>
      </div>
    </div>
  </div>
</div>

<div id="screenPessoa">
  <div class="jornada-hero">
    <div class="jornada-hero-inner">
      <div class="jornada-photo-wrap">
        <div class="jornada-photo skel" id="pessoaFotoSkel" style="display:none;"></div>
        <img class="jornada-photo" id="pessoaFoto" style="display:none;">
        <div class="jornada-photo-fallback" id="pessoaFotoFallback" style="display:none;"></div>
        <button class="jornada-photo-editar" id="pessoaFotoEditarBtn" type="button" onclick="abrirEditorFotoCS()" style="display:none;" title="Trocar foto">✎</button>
      </div>
      <div>
        <div class="jornada-eyebrow">Jornada individual</div>
        <div class="jornada-nome" id="pessoaNome"></div>
        <div class="jornada-sub" id="pessoaSub"></div>
        <div class="jornada-meta" id="pessoaMeta"></div>
        <div id="pessoaProximoConselho"></div>
        <div id="pessoaUltimoUmAUm"></div>
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
  <div id="restritoExtras" style="display:none;padding:0 28px;max-width:1040px;margin:0 auto 30px;">
    <div class="section-title">CS Top 3<div class="line"></div></div>
    <div id="restritoTop3"></div>
    <div id="restritoPosicao"></div>
  </div>
  <div class="tabs">
    <div class="tab active" onclick="showTab('indicadores',event)">Indicadores</div>
    <div class="tab" onclick="showTab('semanal',event)">Cases de Sucesso</div>
    <div class="tab" onclick="showTab('conselhos',event)">Conselhos</div>
    <div class="tab" onclick="showTab('umaum',event)">1:1</div>
    <div class="tab" onclick="showTab('advertencias',event)">Pontos tomados</div>
    <div class="tab" onclick="showTab('feedbacks',event)">Feedbacks</div>
  </div>
  <div class="pessoa-conteudo">
    <div id="indicadores" class="panel active"></div>
    <div id="semanal" class="panel"></div>
    <div id="conselhos" class="panel"></div>
    <div id="umaum" class="panel"></div>
    <div id="advertencias" class="panel"></div>
    <div id="feedbacks" class="panel"></div>
  </div>
</div>

<script>
${GTD_CHECKLIST_SCRIPT}
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
// Semáforo de confirmações (07/10/2026): as faixas e cores vêm de SEMAFORO_CONFIRMADOS em
// lib/constants.ts, injetadas aqui na montagem da página. Nenhum limiar escrito neste arquivo;
// semaforoConfirmados_ espelha semaforoConfirmados de lib/indicadores-base.ts percorrendo a lista.
var SEMAFORO_CONFIRMADOS_ = ${JSON.stringify(SEMAFORO_CONFIRMADOS)};
var SEMAFORO_NEUTRO_ = ${JSON.stringify(SEMAFORO_NEUTRO)};
var AGENDA_PASSADO_COR_ = ${JSON.stringify(AGENDA_PASSADO_COR)};
function intervaloSemaforo_(f){ return f.ate === null ? f.de + ' ou mais' : 'de ' + f.de + ' a ' + f.ate; }
function semaforoConfirmados_(n){
  if (typeof n !== 'number' || n < 0 || Math.floor(n) !== n) return { chave:'neutro', corFundo:SEMAFORO_NEUTRO_.corFundo, corTexto:SEMAFORO_NEUTRO_.corTexto, rotulo:'sem faixa', intervalo:'' };
  for (var i = 0; i < SEMAFORO_CONFIRMADOS_.length; i++) {
    var f = SEMAFORO_CONFIRMADOS_[i];
    if (n >= f.de && (f.ate === null || n <= f.ate)) return { chave:f.chave, corFundo:f.corFundo, corTexto:f.corTexto, rotulo:f.rotulo, intervalo:intervaloSemaforo_(f) };
  }
}
function corConfirmacao(qtd){ return semaforoConfirmados_(qtd).corFundo; }
function corTextoConfirmacao(qtd){ return semaforoConfirmados_(qtd).corTexto; }
function legendaSemaforoTexto_(){
  return 'Confirmados: ' + SEMAFORO_CONFIRMADOS_.map(function(f){ return intervaloSemaforo_(f) + ' ' + f.rotulo; }).join(' · ');
}
function legendaSemaforoHtml_(){
  return '<span class="agenda-legenda-titulo">Confirmados</span>' + SEMAFORO_CONFIRMADOS_.map(function(f){
    return '<span class="agenda-legenda-item"><span class="agenda-legenda-cor" style="background:'+f.corFundo+';"></span>'+(f.ate === null ? f.de + ' ou mais' : f.de + ' a ' + f.ate)+'</span>';
  }).join('') + '<span class="agenda-legenda-item"><span class="agenda-legenda-cor" style="background:'+AGENDA_PASSADO_COR_.corFundo+';"></span>Encerrado</span>';
}
function iniciais(nome){ nome=String(nome||'').trim(); if(!nome) return '?'; var p=nome.split(/\\s+/); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }

var MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
// BUG FIX (28/09/2026 — achado junto com a correção de fuso da Parte B): esta função extraía os
// dígitos literais do ISO por regex, ignorando o offset de fuso — só "funcionava" porque
// data_iso vinha gravado sem indicar fuso nenhum (14h de Brasília salva como se fosse 14h UTC).
// Agora que sync-monday grava o instante UTC correto (offset -03:00 explícito, ver
// dataHoraBRParaISO na Edge Function), interpretar o ISO como instante de verdade — new Date(iso)
// — e ler getDate()/getHours() (hora LOCAL do navegador) é o jeito certo: quem abre o dashboard
// está no Brasil, então essas horas locais já saem em horário de Brasília, sem regex nenhuma.
// Mesmo princípio que dataHoraBR já usa em app/conselho-html.ts.
function parseDataIsoLocal_(iso){
  if (!iso) return null;
  var d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
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

var cachePessoa = {}, cacheEquipe = {}, cacheFotos = null, cacheResumo = {};
var requestSeq = 0;
var pendingCount = 0;
function chaveP(nome, mes, ano){ return nome + '|' + mes + '|' + ano; }
function chaveE(mes, ano){ return mes + '|' + ano; }
function pendingInc(){ pendingCount++; document.getElementById('progressBar').classList.add('ativo'); }
function pendingDec(){ pendingCount = Math.max(0, pendingCount-1); if (pendingCount===0) document.getElementById('progressBar').classList.remove('ativo'); }

// Preenchido de forma assíncrona por inicializarSessao() — os dois abaixo são só conveniência
// visual (o que a topbar mostra, se o grid do time aparece); quem decide de verdade o que cada
// rota devolve é o servidor (requireMoaiUser + isGestor/csNome em cada /api/*, nunca confia em
// nada vindo do client). Parte A (25/09/2026): souGestor já existia; meuCSNome e modoRestritoCS
// são novos — um CS comum (souGestor=false) sem vínculo nenhum (meuCSNome=null) não tem "os
// próprios números" pra mostrar, então cai no estado vazio de mostrarPerfilNaoVinculado().
var souGestor = false;
var meuCSNome = null;
var modoRestritoCS = false;
var configRevelarIndicadoresTime = false;

function inicializarSessao(){
  fetch('/api/perfil', { cache: 'no-store' }).then(function(r){ return r.json(); })
    .then(function(perfil){
      souGestor = !!perfil.isGestor;
      meuCSNome = perfil.csNome || null;
      modoRestritoCS = !souGestor;
      renderTopbar();
      if (souGestor) { iniciarHomeGestor(); return; }
      if (!meuCSNome) { mostrarPerfilNaoVinculado(); return; }
      fetch('/api/config', { cache: 'no-store' }).then(function(r){ return r.json(); })
        .then(function(cfg){ configRevelarIndicadoresTime = !!cfg.revelarIndicadoresEquipe; })
        .catch(function(){})
        .then(function(){ abrirPessoa(meuCSNome); });
    })
    .catch(function(){});
}
function iniciarHomeGestor(){
  var grid = document.getElementById('teamGrid');
  for (var i=0;i<5;i++){
    var s = document.createElement('div'); s.className = 'team-card';
    s.innerHTML = '<div class="skel" style="border-radius:50%;width:104px;height:104px;margin:0 auto 16px;"></div><div class="skel" style="height:10px;border-radius:5px;width:70%;margin:0 auto 6px;"></div><div class="skel" style="height:7px;border-radius:5px;width:45%;margin:0 auto;"></div>';
    grid.appendChild(s);
  }
  carregarFotosTime();
  renderSkeletonEquipe();
  carregarEquipe(currentMes, currentAno);
  carregarAgendaVisual();
  carregarNpsAliasesPendentes();
  iniciarSeletorRelatorioMensal_();
}
// Parte A (25/09/2026): CS logado sem vínculo ainda em cs_usuarios — não existe "os próprios
// números" pra mostrar, então a home fica nesse estado vazio até o gestor vincular em Controle de
// Perfis (nenhuma chamada a /api/cs, /api/equipe ou /api/home-resumo acontece daqui).
function mostrarPerfilNaoVinculado(){
  document.getElementById('screenHome').innerHTML =
    '<div class="perfil-vazio"><h2>Perfil ainda não vinculado</h2>' +
    '<p>Seu login ainda não está associado a um perfil de CS. Fale com seu gestor pra vincular seu e-mail em Controle de Perfis — assim que isso acontecer, seus indicadores aparecem aqui.</p></div>';
}

function renderTopbar(){
  var isPessoa = currentCS !== null && !modoRestritoCS;
  var html = (isPessoa ? '<span class="back-link" onclick="showHome()">' + ICONS.arrowleft + 'Time</span>' : '') +
    '<select class="pickmes" id="selMes" onchange="onFiltroChange()"></select>' +
    '<select class="pickmes" id="selAno" onchange="onFiltroChange()"><option>2026</option><option>2027</option></select>' +
    '<span class="live-label"><span class="live-dot"></span>ao vivo</span>' +
    '<span class="sync-wrap"><button class="sync-btn" id="btnSyncTopbar" onclick="sincronizarAgora()">Sincronizar agora</button><span class="sync-status-topbar" id="syncStatusTopbar"></span></span>' +
    (souGestor ? '<a class="gestor-topbar-link" href="/gestor">Visão da área</a>' : '') +
    '<a class="logout-link" href="/auth/signout">Sair</a>';
  document.getElementById('topbarRight').innerHTML = html;
  var selMes = document.getElementById('selMes');
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; selMes.appendChild(opt);
  MESES.forEach(function(m){ var o=document.createElement('option'); o.textContent=m; selMes.appendChild(o); });
  selMes.value = currentMes;
  document.getElementById('selAno').value = currentAno;
}

// Botão "Sincronizar agora" (movido pra cá em 25-26/09/2026: antes vivia só na Controle de perfis
// do gestor, agora aparece pra qualquer usuário moai autenticado — /api/sync-agora só exige
// requireMoaiUser(), não é mais restrito a gestor). Sempre sincroniza todos os boards de uma vez
// (sem seletor de board, pra caber na topbar ao lado do filtro de mês/ano).
var sincronizandoAgora = false;
function sincronizarAgora(){
  if (sincronizandoAgora) return;
  sincronizandoAgora = true;
  var btn = document.getElementById('btnSyncTopbar');
  var status = document.getElementById('syncStatusTopbar');
  if (btn) btn.disabled = true;
  if (status) { status.textContent = 'Sincronizando…'; status.className = 'sync-status-topbar'; }
  fetchJSON_('/api/sync-agora', { method: 'POST' })
    .then(function (data) {
      var boards = Object.keys(data);
      var comErro = boards.filter(function (b) { return data[b].status === 'erro'; });
      var status2 = document.getElementById('syncStatusTopbar');
      if (status2) {
        status2.textContent = comErro.length ? (comErro.length + ' de ' + boards.length + ' board(s) com erro.') : 'Sincronizado.';
        status2.className = 'sync-status-topbar ' + (comErro.length ? 'erro' : 'ok');
      }
    })
    .catch(function (err) {
      var status3 = document.getElementById('syncStatusTopbar');
      if (status3) { status3.textContent = 'Erro: ' + err.message; status3.className = 'sync-status-topbar erro'; }
    })
    .then(function () {
      sincronizandoAgora = false;
      var btn2 = document.getElementById('btnSyncTopbar');
      if (btn2) btn2.disabled = false;
    });
}

function onFiltroChange(){
  currentMes = document.getElementById('selMes').value;
  currentAno = Number(document.getElementById('selAno').value);
  if (currentCS) {
    var chave = chaveP(currentCS, currentMes, currentAno);
    var chaveR = chaveE(currentMes, currentAno);
    if (cachePessoa[chave] && (!modoRestritoCS || cacheResumo[chaveR])) {
      renderDashboard(cachePessoa[chave], modoRestritoCS ? cacheResumo[chaveR] : undefined);
      animarMFills();
    } else renderSkeletonPessoa();
    if (modoRestritoCS) carregarRelatorioRestrito(currentCS, currentMes, currentAno);
    else carregarRelatorio(currentCS, currentMes, currentAno);
  } else {
    carregarEquipe(currentMes, currentAno);
  }
}

renderTopbar();
inicializarSessao();

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
// (grid de cards do time + carregarEquipe iniciais movidos pra iniciarHomeGestor() — só rodam
// depois de confirmar souGestor via inicializarSessao(), Parte A 25/09/2026)

function showHome(){
  if (modoRestritoCS) return; // CS comum não tem home de equipe pra voltar (Parte A, 25/09/2026)
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
  document.getElementById('restritoExtras').style.display = modoRestritoCS ? 'block' : 'none';
  var chave = chaveP(nome, currentMes, currentAno);
  var chaveR = chaveE(currentMes, currentAno);
  if (cachePessoa[chave] && (!modoRestritoCS || cacheResumo[chaveR])) {
    renderDashboard(cachePessoa[chave], modoRestritoCS ? cacheResumo[chaveR] : undefined);
    animarMFills();
  } else {
    renderSkeletonPessoa();
  }
  if (modoRestritoCS) carregarRelatorioRestrito(nome, currentMes, currentAno);
  else carregarRelatorio(nome, currentMes, currentAno);
  atualizarBadgeDestaque(nome);
  umAUmEditandoId_ = null;
  umAUmAtual_ = [];
  document.getElementById('pessoaUltimoUmAUm').innerHTML = '';
  document.getElementById('umaum').innerHTML = '<div class="empty-state">Carregando...</div>';
  carregarUmAUm(nome);
  document.getElementById('advertencias').innerHTML = '<div class="empty-state">Carregando...</div>';
  carregarAdvertencias(nome);
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
// Home restrita do CS comum (Parte A, 25/09/2026): além do próprio relatório, busca em paralelo
// /api/home-resumo (indicadores agregados do time sem nome de ninguém + Top 3 nomeado + própria
// posição) — nunca chama /api/equipe, que agora é exclusivo de gestor.
function carregarRelatorioRestrito(nome, mes, ano){
  var meuSeq = ++requestSeq;
  pendingInc();
  var chaveR = chaveE(mes, ano);
  Promise.all([
    fetchJSON_('/api/cs/' + encodeURIComponent(nome) + '?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)),
    cacheResumo[chaveR] ? Promise.resolve(cacheResumo[chaveR]) : fetchJSON_('/api/home-resumo?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)),
  ]).then(function(res){
    pendingDec();
    var data = res[0], resumo = res[1];
    cachePessoa[chaveP(nome, mes, ano)] = data;
    cacheResumo[chaveR] = resumo;
    if (meuSeq === requestSeq && currentCS === nome && currentMes === mes && currentAno === ano) {
      renderDashboard(data, resumo);
      animarMFills();
    }
  }).catch(function(err){
    pendingDec();
    if (meuSeq === requestSeq && currentCS === nome) {
      var msgErro = '<div class="empty-state">Erro ao consultar: ' + err.message + '</div>';
      document.getElementById('indicadores').innerHTML = msgErro;
      document.getElementById('semanal').innerHTML = msgErro;
      document.getElementById('conselhos').innerHTML = msgErro;
      document.getElementById('feedbacks').innerHTML = msgErro;
      document.getElementById('destaquesGrid').innerHTML = '';
    }
  });
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
// timeInd/blurTime (Parte B, 25/09/2026): quando o card representa também um dado do TIME (não
// só pessoal do CS), timeInd é o indicador agregado da equipe pro mesmo período — mostrado numa
// linha própria embaixo do valor individual, com a parte numérica borrada por CSS quando
// blurTime=true (configuracoes_globais.revelar_indicadores_equipe desligado). O "M" (m-fill-liquid
// acima) nunca reflete o time, sempre o progresso REAL do indicador individual — nunca borrado.
// Parte G (29/09/2026): "ago/2026" a partir de um ISO 'YYYY-MM-DD' — usado só no selo de recorde.
function formatarMesAbrevAno(iso){
  if (!iso) return '';
  var partes = iso.split('-');
  return MESES_ABREV[Number(partes[1])-1] + '/' + partes[0];
}
// Health da Base (07/10/2026) vem calculado com uma casa decimal e a composição pronta do servidor
// (calcularHealthBase em lib/indicadores-base.ts): aqui só formata, nunca recalcula. Sem nenhum
// membro apurado mostra "Sem apuração", nunca zero. Não há recorde calculado para ele (o histórico
// de recorde no banco era do valor manual), então o selo de recorde é omitido.
function valorKpiTexto_(ind, unidade){
  if (ind.semApuracao) return 'Sem apuração';
  if (ind.alcancado===null||ind.alcancado===undefined) return '—';
  if (ind.composicao) return ind.alcancado.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + '%';
  return unidade==='R$' ? 'R$ '+ind.alcancado.toLocaleString('pt-BR') : ind.alcancado;
}
function kpiCard(label, ind, unidade, timeInd, blurTime, recorde){
  var c = calcIndicador(ind);
  if (ind.semApuracao) { c.pctLabel = 'Sem apuração'; c.pillLabel = 'Sem apuração'; }
  if (ind.composicao) recorde = null;
  var valorMostrado = valorKpiTexto_(ind, unidade);
  var metaMostrada = (ind.meta===null||ind.meta===undefined) ? '—' : ind.meta;
  var fonteHtml = ind.fonte ? '<span class="kpi-fonte'+(ind.fonte==='manual'?' manual':'')+'"><span class="kpi-fonte-dot"></span>'+(ind.fonte==='manual'?'Validado no Monday':'Calculado automático')+'</span>' : '';
  var subLabel = modoGeralAtual ? c.pctLabel : ('meta '+metaMostrada+' · '+c.pctLabel);
  var timeHtml = '';
  if (timeInd) {
    var valorTime = valorKpiTexto_(timeInd, unidade);
    timeHtml = '<div class="kpi-time-linha'+(blurTime?' kpi-blur':'')+'">Time: <span class="kpi-time-valor">'+valorTime+'</span></div>';
  }
  // Selo de recorde (Parte G, 29/09/2026): só quando o indicador está batendo o recorde efetivo
  // dos meses fechados (ou o manual, se melhor) — recorde_efetivo/metas_time_mensal no banco.
  var recordeBadge = (recorde && recorde.emRecorde) ? '<span class="kpi-recorde-badge">Recorde</span>' : '';
  var recordeLinha = (recorde && recorde.recordeValor !== null && recorde.recordeValor !== undefined)
    ? '<div class="kpi-recorde-linha">recorde '+recorde.recordeValor+' em '+formatarMesAbrevAno(recorde.recordeMes)+'</div>' : '';
  var composicaoAttr = ind.composicao ? ' title="'+String(ind.composicao).replace(/"/g,'&quot;')+'" aria-label="'+label+': '+String(ind.composicao).replace(/"/g,'&quot;')+'"' : '';
  var composicaoLinha = ind.composicao && !ind.semApuracao ? '<div class="kpi-recorde-linha">'+ind.composicao+'</div>' : '';
  return '<div class="kpi"'+composicaoAttr+'><div class="kpi-top"><div class="kpi-label-wrap"><div class="kpi-label">'+label+'</div>'+fonteHtml+'</div><span class="kpi-pill '+c.pill+'">'+c.pillLabel+'</span>'+recordeBadge+'</div>' +
    '<div class="kpi-body"><div class="m-fill-wrap"><div class="m-fill-liquid '+c.cor+'" style="height:0%;" data-target="'+c.pct+'"></div></div>' +
    '<div class="kpi-value-block"><div class="kpi-realizado num '+c.corTxt+'">'+valorMostrado+'</div><div class="kpi-sub">'+subLabel+'</div>'+timeHtml+recordeLinha+composicaoLinha+'</div></div></div>';
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
  // Botão de trocar foto (brainstorm 29/09/2026): visível só pro gestor ou pro próprio CS dono do perfil.
  document.getElementById('pessoaFotoEditarBtn').style.display = (souGestor || data.cs.nome === meuCSNome) ? 'flex' : 'none';
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
  } else if (data.pulso && data.pulso.falas && data.pulso.falas.length) {
    // Pulso de CS (05/10/2026): a partir de outubro a fala vem do pulso.
    var textoPulso = data.pulso.falas[0];
    destaqueFb = textoPulso.length > 90 ? textoPulso.slice(0,90) + '…' : textoPulso;
  }

  document.getElementById('destaquesGrid').innerHTML =
    destaqueCard('Ponto de atenção', pontoAtencao) +
    destaqueCard('Maior conquista do mês', conquista) +
    destaqueCard('Mais próximo da meta', compromisso) +
    destaqueCard('Destaque em feedback', destaqueFb);
}

// resumo (Parte A/B, 25/09/2026): só existe quando modoRestritoCS=true (payload de
// /api/home-resumo) — indicadoresTime alimenta a linha "Time:" de cada card (Parte B), top3/
// minhaPosicao alimentam os blocos sempre visíveis da Parte A. Ausente pra gestor navegando o
// perfil de qualquer CS (comportamento de sempre, sem nenhuma dessas seções extras).
function renderDashboard(data, resumo){
  modoGeralAtual = !!data.periodo.geral;
  renderJornadaHero(data);
  renderDestaques(data);
  renderIndicadores(data, resumo); renderSemanal(data); renderConselhos(data); renderFeedback(data);
  if (modoRestritoCS && resumo) {
    renderCSTop(resumo.top3, 'restritoTop3');
    renderMinhaPosicao(resumo);
  }
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
// Parte G (29/09/2026): selo de recorde individual — recordesIndividuais vem junto de /api/cs/[nome]
// (metas_cs_mensal_completo), null em "Visão Geral" (recorde só faz sentido pra um mês concreto).
function recordeIndividualMapa_(data){
  var mapa = {};
  (data.recordesIndividuais || []).forEach(function(l){
    mapa[l.indicador] = { emRecorde: l.em_recorde, recordeValor: l.recorde_valor, recordeMes: l.recorde_mes };
  });
  return mapa;
}
function renderIndicadores(data, resumo){
  var ind = data.indicadores;
  var t = resumo ? resumo.indicadoresTime : null;
  var blur = modoRestritoCS && !configRevelarIndicadoresTime;
  var rec = recordeIndividualMapa_(data);
  document.getElementById('indicadores').innerHTML =
    '<div class="grid3">'+kpiCard('Churn', ind.churn, null, t&&t.churn, blur, rec.churn)+kpiCard('Revenue Churn', ind.revenueChurn, 'R$', t&&t.revenueChurn, blur, rec.revenue_churn)+kpiCard('Cases de Sucesso', ind.casesSucesso, null, t&&t.casesSucesso, blur, rec.cases)+'</div>' +
    '<div class="grid3">'+kpiCard('Matchmakings', ind.matchmakings, null, t&&t.matchmakings, blur, rec.matchmakings)+kpiCard('Rounds', ind.rounds, null, t&&t.rounds, blur, rec.rounds)+kpiCard('Indicações', ind.indicacoes, null, t&&t.indicacoes, blur, rec.indicacoes)+'</div>' +
    '<div class="grid3">'+kpiCard('Health da Base', ind.healthDaBase, null, t&&t.healthDaBase, blur, rec.health_base)+kpiCard('Upsell', ind.upsell, null, t&&t.upsell, blur, rec.upsell)+kpiCard('Downsell', ind.downsell, null, t&&t.downsell, blur, rec.downsell)+'</div>' +
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
          ? '<span class="confirm-badge" style="background:'+corConfirmacao(qtdConf)+';color:'+corTextoConfirmacao(qtdConf)+';">'+ICONS.check+qtdConf+' confirmado(s)' +
            '<span class="confirm-tooltip">'+legendaSemaforoTexto_()+'</span></span>'
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
        ? '<span class="confirm-badge" style="background:'+corConfirmacao(qtdConfReal)+';color:'+corTextoConfirmacao(qtdConfReal)+';margin-top:12px;">'+ICONS.check+qtdConfReal+' confirmado(s)' +
          '<span class="confirm-tooltip">'+legendaSemaforoTexto_()+'</span></span>'
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
    // Componente único do checklist (lib/gtd-checklist.ts), somente leitura, com antes e depois.
    html += '<div class="case-modal-campo"><div class="case-modal-label">GTD do conselho</div>' + gtdCicloHtml_(c.gtd) + '</div>';
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
  var pulso = data.pulso || null;
  var modo = pulso ? pulso.modo : 'legado';
  var vezesAtual = data.cs.vezesDestaque || 0;
  var html = '<div class="destaque-form-card">' +
    '<div class="destaque-form-label">'+ICONS.trophy+'CS Destaque</div>' +
    '<div class="destaque-form-desc">Quantas vezes '+data.cs.nomeCompleto+' já foi reconhecido(a) como CS Destaque. Aparece como emblema no topo da página individual.</div>' +
    '<input type="number" min="0" step="1" class="destaque-form-input" id="destaqueInput" value="'+vezesAtual+'">' +
    '<button class="destaque-form-btn" id="destaqueSalvarBtn" onclick="salvarVezesDestaque()">Salvar</button>' +
    '<span class="destaque-form-status" id="destaqueStatus"></span>' +
  '</div>';
  // Pulso de CS (05/10/2026): de outubro de 2026 em diante vale o pulso. Até setembro vale a avaliação
  // entre pares antiga. Visão Geral mostra as duas, cada uma na sua seção.
  if (modo === 'pulso' || modo === 'ambos') html += feedbackPulsoHtml_(pulso);
  if (modo === 'ambos') html += '<div class="fb-line-wrap" style="margin-top:30px;"><span style="color:#807E7E">Histórico anterior ao Pulso, até setembro</span><div class="fb-line"></div></div>';
  if (modo === 'legado' || modo === 'ambos') html += feedbackLegadoHtml_(fb);
  document.getElementById('feedbacks').innerHTML = html;
  setTimeout(function(){ document.querySelectorAll('.voto-row-bar-fill').forEach(function(el){ el.style.width = el.getAttribute('data-w')+'%'; }); }, 50);
}

// Pulso de CS: o que os colegas escreveram sobre este CS e quantos o indicaram como destaque em
// colaboração. Nada identifica quem respondeu, e a autoavaliação já vem excluída pelo banco.
function feedbackPulsoHtml_(p){
  var h = '<p class="fb-intro">Pulso de CS · respostas anônimas do time · '+(p ? p.respostas : 0)+' resposta(s) neste período. As observações abaixo são as falas originais dos colegas sobre este CS, embaralhadas para preservar o anonimato.</p>';
  if (!p) return h + '<div class="empty-state" style="padding:20px;">O Pulso de CS não está disponível para este período.</div>';
  if (p.erro) return h + '<div class="empty-state" style="padding:20px;">Não foi possível carregar o Pulso de CS: '+escHtml_(p.erro)+'</div>';
  if (p.respostas === 0) {
    return h + '<div class="no-feedback"><div class="no-feedback-title">Sem respostas do Pulso neste período</div><div class="no-feedback-sub">As respostas aparecem aqui assim que o formulário mensal do Pulso de CS for preenchido pelo time.</div></div>';
  }
  h += '<div class="votos-bar-card"><div class="dark-label">'+ICONS.trophy+'Reconhecimento no Pulso</div>' +
    '<div class="voto-row"><div class="voto-row-label">Colegas que deixaram uma observação sobre este CS</div><div class="voto-row-num num">'+p.avaliadores+'</div></div>' +
    '<div class="voto-row"><div class="voto-row-label">Colegas que o indicaram como destaque em colaboração e apoio ao time</div><div class="voto-row-num num">'+p.destaques+'</div></div>' +
  '</div>';
  h += '<div class="fb-line-wrap"><span style="color:#3D8B5F">'+ICONS.check+'O que o time disse</span><div class="fb-line"></div></div>';
  if (!p.falas || p.falas.length === 0) {
    h += '<div class="empty-state" style="padding:20px;">Nenhum colega deixou observação sobre este CS neste período.</div>';
  } else {
    p.falas.slice(0, MAX_QUOTES_VISIVEIS * 2).forEach(function(f){ h += '<div class="quote-block"><span class="quote-mark">"</span><div class="quote-text" style="white-space:pre-line;">'+escHtml_(f)+'</div></div>'; });
    if (p.falas.length > MAX_QUOTES_VISIVEIS * 2) h += '<div class="fb-mais">+ '+(p.falas.length-MAX_QUOTES_VISIVEIS*2)+' outra(s) observação(ões) neste período.</div>';
  }
  return h;
}

function feedbackLegadoHtml_(fb){
  var html = '';
  html += '<p class="fb-intro">Avaliação de pares · anônima · '+fb.avaliadores+' avaliador(es) neste ciclo. As observações abaixo são as falas originais dos colegas, selecionadas e embaralhadas para preservar o anonimato.</p>';
  if (fb.avaliadores === 0 && fb.positivos.length === 0 && fb.construtivos.length === 0) {
    html += '<div class="no-feedback"><div class="no-feedback-title">Sem feedbacks neste ciclo</div><div class="no-feedback-sub">Este CS não aparece na rodada deste período — nem como avaliador, nem como avaliado.</div></div>';
    return html;
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
  return html;
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

// ============ 1:1 gestor ↔ CS (Parte A, 28/09/2026) ============
// Visível igual pro gestor e pro CS (mesma lista, sem separar visão) — só o gestor tem o
// formulário de registrar/editar (souGestor, já preenchido por inicializarSessao()); o CS comum
// vê só o histórico. Carregado à parte de carregarRelatorio/carregarRelatorioRestrito pra não
// misturar com o payload já grande de /api/cs/[nome].
var umAUmAtual_ = [];
var umAUmEditandoId_ = null;
function escUmAUm_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}
function dataBRUmAUm_(iso){
  if (!iso) return '';
  var p = String(iso).slice(0,10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : String(iso);
}
function carregarUmAUm(nome){
  return fetchJSON_('/api/cs/' + encodeURIComponent(nome) + '/um-a-um').then(function(d){
    if (currentCS !== nome) return;
    umAUmAtual_ = d.registros || [];
    renderUltimoUmAUm();
    renderAbaUmAUm();
  }).catch(function(err){
    if (currentCS !== nome) return;
    document.getElementById('pessoaUltimoUmAUm').innerHTML = '';
    document.getElementById('umaum').innerHTML = '<div class="empty-state">Erro ao carregar 1:1: ' + escUmAUm_(err.message) + '</div>';
  });
}
function renderUltimoUmAUm(){
  var el = document.getElementById('pessoaUltimoUmAUm');
  if (!umAUmAtual_.length) { el.innerHTML = ''; return; }
  var u = umAUmAtual_[0];
  el.innerHTML = '<div class="ultimo-umaum"><div class="ultimo-umaum-titulo">Último 1:1</div>' +
    '<div class="ultimo-umaum-data">' + dataBRUmAUm_(u.data) + '</div>' +
    (u.combinados ? '<div class="ultimo-umaum-combinados"><b>Combinados:</b> ' + escUmAUm_(u.combinados) + '</div>' : '') +
    '</div>';
}
function formularioUmAUmHtml_(){
  var editando = !!umAUmEditandoId_;
  var registro = null;
  if (editando) { for (var i=0;i<umAUmAtual_.length;i++) { if (umAUmAtual_[i].id === umAUmEditandoId_) { registro = umAUmAtual_[i]; break; } } }
  var dataVal = registro ? String(registro.data).slice(0,10) : '';
  var faladoVal = registro ? (registro.oQueFoiFalado || '') : '';
  var combinVal = registro ? (registro.combinados || '') : '';
  return '<div class="umaum-form-card">' +
    '<div class="destaque-form-label" style="margin-bottom:14px;">' + (editando ? 'Editar 1:1' : 'Registrar novo 1:1') + '</div>' +
    '<div class="umaum-form-row"><label>Data<input type="date" id="umaumData" value="' + escUmAUm_(dataVal) + '"></label></div>' +
    '<div class="umaum-form-row"><label style="flex:1 1 100%;">O que foi falado<textarea id="umaumFalado" placeholder="Resumo da conversa...">' + escUmAUm_(faladoVal) + '</textarea></label></div>' +
    '<div class="umaum-form-row"><label style="flex:1 1 100%;">Combinados<textarea id="umaumCombinados" placeholder="O que ficou combinado...">' + escUmAUm_(combinVal) + '</textarea></label></div>' +
    '<div class="umaum-form-actions">' +
      '<button class="destaque-form-btn" id="umaumSalvarBtn" onclick="salvarUmAUm()">' + (editando ? 'Salvar edição' : 'Registrar') + '</button>' +
      (editando ? '<button class="destaque-form-btn" style="background:#3A3A3A;color:#fff;" onclick="cancelarEdicaoUmAUm()">Cancelar</button>' : '') +
      '<span class="destaque-form-status" id="umaumStatus"></span>' +
    '</div></div>';
}
// Status do 1:1 (brainstorm 29/09/2026): pendente/cumprido/não cumprido — decidido em bater
// simples, um status por registro (não por item dentro de "combinados"). Só gestor muda, via
// <select> no card; CS comum vê como pílula fixa.
var UMAUM_STATUS_LABEL_ = { pendente:'Pendente', cumprido:'Cumprido', nao_cumprido:'Não cumprido' };
var UMAUM_STATUS_COR_ = { pendente:'#9F9F9F', cumprido:'#3D8B5F', nao_cumprido:'#C0433D' };
function umaumStatusHtml_(r){
  var status = r.status || 'pendente';
  if (!souGestor) {
    return '<span class="umaum-status-pill" style="background:'+(UMAUM_STATUS_COR_[status]||'#9F9F9F')+';">'+(UMAUM_STATUS_LABEL_[status]||status)+'</span>';
  }
  return '<select class="umaum-status-select" style="border-color:'+(UMAUM_STATUS_COR_[status]||'#9F9F9F')+';color:'+(UMAUM_STATUS_COR_[status]||'#9F9F9F')+';" onchange="mudarStatusUmAUm(\\'' + r.id + '\\', this.value)">' +
    ['pendente','cumprido','nao_cumprido'].map(function(s){
      return '<option value="'+s+'"'+(s===status?' selected':'')+'>'+UMAUM_STATUS_LABEL_[s]+'</option>';
    }).join('') +
  '</select>';
}
function mudarStatusUmAUm(id, status){
  var url = '/api/cs/' + encodeURIComponent(currentCS) + '/um-a-um/' + encodeURIComponent(id) + '/status';
  fetchJSON_(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status }) })
    .then(function(){ return carregarUmAUm(currentCS); })
    .catch(function(err){ window.alert('Erro ao marcar status: ' + err.message); renderAbaUmAUm(); });
}
function listaUmAUmHtml_(){
  if (!umAUmAtual_.length) return '<div class="empty-state">Nenhum registro de 1:1 ainda.</div>';
  return umAUmAtual_.map(function(r){
    return '<div class="umaum-card">' +
      '<div class="umaum-card-head"><span class="umaum-card-data">' + dataBRUmAUm_(r.data) + '</span>' +
        umaumStatusHtml_(r) +
        '<span class="umaum-card-gestor">' + escUmAUm_(r.gestorEmail) + (souGestor ? ' <button class="umaum-card-editar" onclick="editarUmAUmClick(\\'' + r.id + '\\')">Editar</button> <button class="umaum-card-excluir" onclick="excluirUmAUmClick(\\'' + r.id + '\\')">Excluir</button>' : '') + '</span></div>' +
      (r.oQueFoiFalado ? '<div class="umaum-card-campo"><b>O que foi falado</b>' + escUmAUm_(r.oQueFoiFalado) + '</div>' : '') +
      (r.combinados ? '<div class="umaum-card-campo"><b>Combinados</b>' + escUmAUm_(r.combinados) + '</div>' : '') +
    '</div>';
  }).join('');
}
function renderAbaUmAUm(){
  var el = document.getElementById('umaum');
  el.innerHTML = (souGestor ? formularioUmAUmHtml_() : '') + listaUmAUmHtml_();
}
function editarUmAUmClick(id){
  umAUmEditandoId_ = id;
  renderAbaUmAUm();
  var formCard = document.querySelector('#umaum .umaum-form-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function cancelarEdicaoUmAUm(){
  umAUmEditandoId_ = null;
  renderAbaUmAUm();
}
function excluirUmAUmClick(id){
  if (!window.confirm('Excluir este registro de 1:1? Essa ação não pode ser desfeita.')) return;
  var url = '/api/cs/' + encodeURIComponent(currentCS) + '/um-a-um/' + encodeURIComponent(id);
  fetchJSON_(url, { method: 'DELETE' }).then(function(){
    if (umAUmEditandoId_ === id) umAUmEditandoId_ = null;
    return carregarUmAUm(currentCS);
  }).catch(function(err){
    window.alert('Erro ao excluir: ' + err.message);
  });
}
function salvarUmAUm(){
  var data = document.getElementById('umaumData').value;
  var falado = document.getElementById('umaumFalado').value.trim();
  var combinados = document.getElementById('umaumCombinados').value.trim();
  var btn = document.getElementById('umaumSalvarBtn');
  var status = document.getElementById('umaumStatus');
  if (!data) { status.style.color = '#C0392B'; status.textContent = 'Escolha uma data.'; return; }
  btn.disabled = true; status.style.color = '#9F9F9F'; status.textContent = 'Salvando...';
  var editando = umAUmEditandoId_;
  var url = '/api/cs/' + encodeURIComponent(currentCS) + '/um-a-um' + (editando ? ('/' + encodeURIComponent(editando)) : '');
  fetchJSON_(url, {
    method: editando ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data, oQueFoiFalado: falado || null, combinados: combinados || null }),
  }).then(function(){
    umAUmEditandoId_ = null;
    return carregarUmAUm(currentCS);
  }).catch(function(err){
    btn.disabled = false;
    status.style.color = '#C0392B';
    status.textContent = 'Erro: ' + err.message;
  });
}

// ============ pontos tomados (antes, aba Advertências; 07/10/2026) ============
// Somente leitura nas duas visões. A aplicação, a edição e a exclusão de advertência moram na
// página do CS na visão do gestor (/gestor/cs/[nome]); aqui o CS vê o ponto que tomou e o efeito no
// Health da Base, e o gestor ganha só o atalho para a página. O destaque visual acima de 3 pontos
// ativos continua. Carregado à parte via /api/cs/[nome]/advertencias (que já devolve o efeito).
var advertenciasAtual_ = [];
var advertenciaPontuacaoAtiva_ = 0;
var advertenciaEfeito_ = null;
var LIMIAR_ADVERTENCIA_DESTAQUE_ = 3;

function dataHoraBRAdvertencia_(iso){
  if (!iso) return '';
  var d = new Date(iso);
  return isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function carregarAdvertencias(nome){
  return fetchJSON_('/api/cs/' + encodeURIComponent(nome) + '/advertencias').then(function(d){
    if (currentCS !== nome) return;
    advertenciasAtual_ = d.registros || [];
    advertenciaPontuacaoAtiva_ = d.pontuacaoAtiva || 0;
    advertenciaEfeito_ = d.efeito || null;
    renderAbaAdvertencias();
  }).catch(function(err){
    if (currentCS !== nome) return;
    document.getElementById('advertencias').innerHTML = '<div class="empty-state">Erro ao carregar os pontos tomados: ' + escUmAUm_(err.message) + '</div>';
  });
}
function advertenciaResumoHtml_(){
  var destaque = advertenciaPontuacaoAtiva_ > LIMIAR_ADVERTENCIA_DESTAQUE_;
  return '<div class="advertencia-resumo' + (destaque ? ' destaque' : '') + '">' +
    '<div class="advertencia-resumo-num">' + advertenciaPontuacaoAtiva_ + '</div>' +
    '<div class="advertencia-resumo-label">' + (advertenciaPontuacaoAtiva_ === 1 ? 'ponto ativo' : 'pontos ativos') + (destaque ? ', acima do limite de ' + LIMIAR_ADVERTENCIA_DESTAQUE_ : '') + '</div>' +
  '</div>';
}
function advertenciaEfeitoHtml_(){
  var e = advertenciaEfeito_;
  if (!e) return '';
  var fmt = function(d){ return (d/10).toFixed(1).replace('.', ',') + '%'; };
  if (e.semApuracao || e.comPontosDecimos === null || e.comPontosDecimos === undefined) {
    return '<div class="umaum-card-campo" style="margin-bottom:14px;"><b>Efeito no Health da Base</b>Sem apuração: nenhum membro da carteira com presença registrada.</div>';
  }
  return '<div class="umaum-card-campo" style="margin-bottom:14px;"><b>Efeito no Health da Base</b>' +
    'Com os pontos ativos: ' + fmt(e.comPontosDecimos) + '. Sem eles: ' + fmt(e.semPontosDecimos) + '.</div>';
}
function advertenciaAtalhoGestorHtml_(){
  if (!souGestor) return '';
  return '<div style="margin-bottom:14px;"><a class="destaque-form-btn" style="display:inline-block;text-decoration:none;" href="/gestor/cs/' + encodeURIComponent(currentCS) +
    '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno) + '">Aplicar, editar ou excluir na página do CS</a></div>';
}
function advertenciaListaHtml_(){
  if (!advertenciasAtual_.length) return '<div class="empty-state">Nenhum ponto tomado até agora.</div>';
  return advertenciasAtual_.map(function(r){
    return '<div class="umaum-card">' +
      '<div class="umaum-card-head"><span class="umaum-card-data">' + escUmAUm_(r.tipoNome) + '</span>' +
        '<span class="umaum-status-pill" style="background:' + (r.ativa ? '#C0433D' : '#9F9F9F') + ';">' + r.pontos + (r.pontos !== 1 ? ' pontos' : ' ponto') + (r.ativa ? ', ativa' : ', vencida') + '</span>' +
        '<span class="umaum-card-gestor">Aplicada por ' + escUmAUm_(r.aplicadoPor) + ' em ' + dataHoraBRAdvertencia_(r.aplicadoEm) + ', validade de ' + r.validadeMeses + (r.validadeMeses !== 1 ? ' meses' : ' mês') + '</span></div>' +
      (r.observacao ? '<div class="umaum-card-campo"><b>Observação</b>' + escUmAUm_(r.observacao) + '</div>' : '') +
    '</div>';
  }).join('');
}
function renderAbaAdvertencias(){
  var el = document.getElementById('advertencias');
  el.innerHTML = advertenciaResumoHtml_() + advertenciaAtalhoGestorHtml_() + advertenciaEfeitoHtml_() + advertenciaListaHtml_();
}

// ============ agenda visual (Parte C, 28/09/2026) ============
// Substitui a antiga "Próximos conselhos" (só a próxima data de cada conselho, sem Rounds) por
// uma agenda de verdade — semana (com navegação e presença nas semanas já passadas) e mês (grade
// compacta) — conselhos + Rounds juntos, usando /api/gestor/agenda (generateAgendaVisual em
// lib/reports.ts). Reaproveita o mesmo #conselhoModalOverlay/#conselhoModalBody de sempre.
function escAgenda_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}
var agendaVisao_ = 'semana';
var agendaAncora_ = new Date();
var agendaItensClique_ = [];
var agendaReqSeq_ = 0;

function agendaZerarHora_(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function agendaAddDias_(d, n){ var r = new Date(d); r.setDate(r.getDate() + n); return r; }
function agendaInicioSemana_(d){
  var base = agendaZerarHora_(d);
  var dia = base.getDay(); // 0=Dom..6=Sáb
  var offset = dia === 0 ? -6 : (1 - dia); // volta pra segunda-feira
  return agendaAddDias_(base, offset);
}
function agendaFmtYYYYMMDD_(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
// Lista (voltou em 29/09/2026, opção lado a lado com a grade, não substituindo) usa o mesmo
// período/navegação/rótulo da semana — só o desenho final muda (cards em vez de grade).
function agendaEhPeriodoDeSemana_(){ return agendaVisao_ === 'semana' || agendaVisao_ === 'lista'; }
function agendaRangeAtual_(){
  if (agendaEhPeriodoDeSemana_()) {
    var inicio = agendaInicioSemana_(agendaAncora_);
    return { inicio: inicio, fim: agendaAddDias_(inicio, 7) };
  }
  var inicio = new Date(agendaAncora_.getFullYear(), agendaAncora_.getMonth(), 1);
  var fim = new Date(agendaAncora_.getFullYear(), agendaAncora_.getMonth()+1, 1);
  return { inicio: inicio, fim: fim };
}
function agendaAtualizarLabel_(range){
  var el = document.getElementById('agendaPeriodoLabel');
  if (agendaEhPeriodoDeSemana_()) {
    var fimIncl = agendaAddDias_(range.fim, -1);
    var mesmoMes = range.inicio.getMonth() === fimIncl.getMonth();
    el.textContent = range.inicio.getDate() + (mesmoMes ? '' : ' '+MESES_ABREV[range.inicio.getMonth()]) +
      ' – ' + fimIncl.getDate() + ' ' + MESES_ABREV[fimIncl.getMonth()] + ' ' + fimIncl.getFullYear();
  } else {
    el.textContent = MESES[agendaAncora_.getMonth()] + ' ' + agendaAncora_.getFullYear();
  }
}
function agendaNavegar(direcao){
  agendaAncora_ = agendaEhPeriodoDeSemana_() ? agendaAddDias_(agendaAncora_, direcao*7)
    : new Date(agendaAncora_.getFullYear(), agendaAncora_.getMonth()+direcao, 1);
  carregarAgendaVisual();
}
function agendaIrParaHoje(){ agendaAncora_ = new Date(); carregarAgendaVisual(); }
function agendaMudarVisao(v){
  if (agendaVisao_ === v) return;
  agendaVisao_ = v;
  document.getElementById('agendaViewSemanaBtn').classList.toggle('active', v === 'semana');
  document.getElementById('agendaViewListaBtn').classList.toggle('active', v === 'lista');
  document.getElementById('agendaViewMesBtn').classList.toggle('active', v === 'mes');
  carregarAgendaVisual();
}

var ROUND_STATUS_COR_ = { 'Confirmado':'#fdab3d', 'Realizado':'#00c875', 'Cancelado':'#df2f4a', 'Agd. confirmação':'#007eb5', 'Adiado':'#9d50dd', 'A Planejar':'#757575' };
function corStatusRound_(status){ return ROUND_STATUS_COR_[status] || '#9F9F9F'; }
function corStatusPresenca_(status){
  if (status === 'Presente') return '#3D8B5F';
  if (status === 'Ausente' || status === 'Não vai') return '#C0433D';
  if (status === 'Reposição') return '#7dd3fc';
  return '#D8D5D5';
}
// "Setorial" é rótulo antigo do Monday — os dois conselhos que ainda carregam esse nível
// (Tarso, Pedro Prado) são Executivo na prática (confirmado com o Vitor em 25/09/2026).
// Corrigido aqui na exibição da agenda; fora de escopo mexer em parseTituloConselho.
function nivelExibicao_(nivel){ return nivel === 'Setorial' ? 'Executivo' : nivel; }
// Paleta categórica por nível (Parte 1, redesign 28/09/2026) — nenhuma dessas cores pode coincidir
// com corConfirmacao/corStatusRound_ (vermelho/dourado/verde de status da marca), senão a cor do
// chip fica ambígua entre "isso é tal nível" e "isso precisa de atenção".
var NIVEL_COR_ = {
  'Fast Track': '#93C5FD',
  'Executivo': '#A78BFA',
  'C-Level': '#F472B6',
  'C-Level+': '#818CF8',
  'High End': '#475569',
};
function corNivel_(nivel){ return NIVEL_COR_[nivel] || '#9F9F9F'; }
// Estilo do item na agenda (07/10/2026). Conselho aberto: fundo pelo semáforo de confirmados.
// Conselho encerrado (término já passou, ver item.passado no servidor): neutro, com a presença.
// Round: inalterado, cor do status. A cor do nível vira um ponto antes do título.
function agendaNivelTexto_(nivel){ return String(nivel || 'Nível desconhecido').replace(/-/g, ' '); }
function agendaEstiloItem_(item){
  if (item.tipo === 'round') return { corFundo: corStatusRound_(item.statusLabel), corTexto: '#fff', selo: '', descricao: 'Round, ' + (item.statusLabel || 'sem status') };
  var base = agendaNivelTexto_(item.nivel) + ', CS ' + (item.sub || 'não informado');
  if (item.passado) {
    var lista = item.presencaPorMembro || [];
    var presentes = lista.filter(function(p){ return p.status === 'Presente'; }).length;
    var pres = lista.length ? presentes + ' de ' + lista.length + ' presentes' : 'sem presença registrada';
    return { corFundo: AGENDA_PASSADO_COR_.corFundo, corTexto: AGENDA_PASSADO_COR_.corTexto,
      selo: lista.length ? presentes + '/' + lista.length : '', descricao: base + ', encerrado, ' + pres };
  }
  var n = (item.confirmados || []).length;
  var s = semaforoConfirmados_(n);
  return { corFundo: s.corFundo, corTexto: s.corTexto, selo: n + '✓',
    descricao: base + ', ' + n + ' confirmado' + (n === 1 ? '' : 's') + ', faixa ' + s.rotulo + ' ' + s.intervalo };
}
function agendaTecla_(ev, idx){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); agendaAbrirModal_(idx); } }
function agendaNivelDotHtml_(item){
  return item.tipo === 'conselho' ? '<span class="agenda-nivel-dot" style="background:'+corNivel_(item.nivel)+';"></span>' : '';
}
function agendaItensUnificados_(d){
  var itens = [];
  (d.conselhos||[]).forEach(function(c){
    itens.push({ tipo:'conselho', dataIso:c.dataIso, nome:c.nomeGrupo, sub:c.cs, statusLabel:c.statusAgenda,
      nivel: nivelExibicao_(c.nivel), passado:c.passado, presencaPorMembro:c.presencaPorMembro, confirmados:c.confirmados, groupId:c.groupId });
  });
  (d.rounds||[]).forEach(function(r){
    if (!r.inicio) return;
    itens.push({ tipo:'round', dataIso:r.inicio, termino:r.termino, nome:r.nome, sub:r.local || r.cs || '', statusLabel:r.status, passado:false });
  });
  itens.sort(function(a,b){ return new Date(a.dataIso) - new Date(b.dataIso); });
  return itens;
}

function carregarAgendaVisual(){
  var legendaEl = document.getElementById('agendaLegenda');
  if (legendaEl && !legendaEl.innerHTML) legendaEl.innerHTML = legendaSemaforoHtml_();
  var range = agendaRangeAtual_();
  agendaAtualizarLabel_(range);
  var meuSeq = ++agendaReqSeq_;
  document.getElementById('agendaBody').innerHTML = '<div class="empty-state">Carregando…</div>';
  fetchJSON_('/api/gestor/agenda?inicio='+agendaFmtYYYYMMDD_(range.inicio)+'&fim='+agendaFmtYYYYMMDD_(range.fim)).then(function(d){
    if (meuSeq !== agendaReqSeq_) return;
    if (agendaVisao_ === 'semana') renderAgendaSemana_(d);
    else if (agendaVisao_ === 'lista') renderAgendaLista_(d);
    else renderAgendaMes_(d, range);
  }).catch(function(err){
    if (meuSeq !== agendaReqSeq_) return;
    document.getElementById('agendaBody').innerHTML = '<div class="empty-state">Erro ao carregar agenda: '+escAgenda_(err.message)+'</div>';
  });
}

// ===== grade de horário da semana (Parte 3, redesign 28/09/2026; ajustes 29/09/2026) =====
// Janela fixa pra manter a grade estável e comparável de uma semana pra outra (não calculada a
// partir dos itens — ver combinado com o Vitor). Estendida de 07:00–21:00 pra 07:00–23:00 (ajuste
// 29/09/2026): duração fixa de conselho (4h) faz um encontro às 19h terminar às 23h, e a janela
// original cortava esse bloco.
var AGENDA_SEMANA_INICIO_MIN_ = 7 * 60;
var AGENDA_SEMANA_FIM_MIN_ = 23 * 60;
var AGENDA_SEMANA_JANELA_MIN_ = AGENDA_SEMANA_FIM_MIN_ - AGENDA_SEMANA_INICIO_MIN_;
// Duração fixa pra desenhar o bloco, sempre a partir do horário real de início — não é o dado real
// (conselho nunca teve duração registrada; round já não usa mais o término real aqui, ajuste
// 29/09/2026, só pro tamanho do bloco — o término sincronizado continua existindo em item.termino
// e aparece normal no modal ao clicar).
var AGENDA_SEMANA_DURACAO_CONSELHO_MIN_ = ${AGENDA_DURACAO_CONSELHO_MIN};
var AGENDA_SEMANA_DURACAO_ROUND_MIN_ = 120;

function agendaSemanaMinutosDoDia_(dt){ return dt.getHours() * 60 + dt.getMinutes(); }

// "Lanes" no estilo Google Calendar: agrupa itens que se cruzam em clusters e atribui cada um à
// primeira lane livre (sem conflito de horário); largura do bloco = 100% / lanes do cluster.
function agendaSemanaCalcularLanes_(eventos){
  eventos.sort(function(a, b){ return a.inicioMin - b.inicioMin; });
  var cluster = [], clusterFimMax = -Infinity;
  function fecharCluster(){
    if (!cluster.length) return;
    var lanesFim = [];
    cluster.forEach(function(ev){
      var lane = lanesFim.findIndex(function(fim){ return fim <= ev.inicioMin; });
      if (lane === -1) { lane = lanesFim.length; lanesFim.push(ev.fimMin); } else { lanesFim[lane] = ev.fimMin; }
      ev.lane = lane;
    });
    cluster.forEach(function(ev){ ev.lanes = lanesFim.length; });
    cluster = []; clusterFimMax = -Infinity;
  }
  eventos.forEach(function(ev){
    if (cluster.length && ev.inicioMin >= clusterFimMax) fecharCluster();
    cluster.push(ev);
    clusterFimMax = Math.max(clusterFimMax, ev.fimMin);
  });
  fecharCluster();
  return eventos;
}

function agendaSemanaBlocoHtml_(ev){
  var item = ev.item;
  var topPct = (ev.inicioMin - AGENDA_SEMANA_INICIO_MIN_) / AGENDA_SEMANA_JANELA_MIN_ * 100;
  var alturaPct = Math.max(2, (ev.fimMin - ev.inicioMin) / AGENDA_SEMANA_JANELA_MIN_ * 100);
  var larguraPct = 100 / ev.lanes;
  var esquerdaPct = ev.lane * larguraPct;
  var est = agendaEstiloItem_(item);
  var selo = est.selo ? '<span class="agenda-semana-bloco-selo" aria-hidden="true">'+est.selo+'</span>' : '';
  var hora = String(new Date(item.dataIso).getHours()).padStart(2,'0')+':'+String(new Date(item.dataIso).getMinutes()).padStart(2,'0');
  var rotulo = hora + ', ' + (item.nome||'Sem nome') + ', ' + est.descricao;
  return '<div class="agenda-semana-bloco" role="button" tabindex="0" aria-label="'+escAgenda_(rotulo)+'" style="top:'+topPct+'%;height:'+alturaPct+'%;left:'+esquerdaPct+'%;width:'+larguraPct+'%;background:'+est.corFundo+';color:'+est.corTexto+';" ' +
    'onclick="agendaAbrirModal_('+ev.idx+')" onkeydown="agendaTecla_(event,'+ev.idx+')" title="'+escAgenda_(rotulo)+'">' +
    selo +
    '<div class="agenda-semana-bloco-hora">'+hora+'</div>' +
    '<div class="agenda-semana-bloco-nome">'+agendaNivelDotHtml_(item)+escAgenda_(item.nome||'—')+'</div>' +
    (item.sub ? '<div class="agenda-semana-bloco-sub">'+escAgenda_(item.sub)+'</div>' : '') +
  '</div>';
}

function agendaSemanaColunaHtml_(idxs, hoje){
  var antes = 0, depois = 0, dentro = [];
  idxs.forEach(function(idx){
    var item = agendaItensClique_[idx];
    var dt = new Date(item.dataIso);
    var inicioMin = agendaSemanaMinutosDoDia_(dt);
    var duracaoMin = item.tipo === 'round' ? AGENDA_SEMANA_DURACAO_ROUND_MIN_ : AGENDA_SEMANA_DURACAO_CONSELHO_MIN_;
    var fimMin = inicioMin + duracaoMin;
    if (inicioMin < AGENDA_SEMANA_INICIO_MIN_) { antes++; return; }
    if (inicioMin >= AGENDA_SEMANA_FIM_MIN_) { depois++; return; }
    dentro.push({ idx:idx, item:item, inicioMin:inicioMin, fimMin:Math.min(fimMin, AGENDA_SEMANA_FIM_MIN_) });
  });
  agendaSemanaCalcularLanes_(dentro);
  var html = '<div class="agenda-semana-coluna'+(hoje?' hoje':'')+'">';
  if (antes > 0) html += '<div class="agenda-semana-mais agenda-semana-mais-antes">+'+antes+' antes</div>';
  html += dentro.map(agendaSemanaBlocoHtml_).join('');
  if (depois > 0) html += '<div class="agenda-semana-mais agenda-semana-mais-depois">+'+depois+' depois</div>';
  html += '</div>';
  return html;
}

function renderAgendaSemana_(d){
  agendaItensClique_ = agendaItensUnificados_(d);
  var el = document.getElementById('agendaBody');
  if (!agendaItensClique_.length) { el.innerHTML = '<div class="agenda-semana-sem-itens">Nenhum conselho ou round nesta semana.</div>'; return; }

  var inicioSemana = agendaInicioSemana_(agendaAncora_);
  var hojeChave = agendaFmtYYYYMMDD_(new Date());
  var diaLabels = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  var porDia = [[],[],[],[],[],[],[]];
  agendaItensClique_.forEach(function(item, idx){
    var diaIdx = Math.round((agendaZerarHora_(new Date(item.dataIso)) - inicioSemana) / 86400000);
    if (diaIdx >= 0 && diaIdx < 7) porDia[diaIdx].push(idx);
  });

  var cabDiasHtml = '', colunasHtml = '';
  for (var k = 0; k < 7; k++) {
    var diaData = agendaAddDias_(inicioSemana, k);
    var ehHoje = agendaFmtYYYYMMDD_(diaData) === hojeChave;
    cabDiasHtml += '<div class="agenda-semana-cab-dia'+(ehHoje?' hoje':'')+'">'+diaLabels[k]+' <span class="agenda-semana-cab-num">'+String(diaData.getDate()).padStart(2,'0')+'</span></div>';
    colunasHtml += agendaSemanaColunaHtml_(porDia[k], ehHoje);
  }

  var eixoHtml = '', linhasHtml = '';
  for (var h = 7; h <= 23; h++) {
    var pct = (h*60 - AGENDA_SEMANA_INICIO_MIN_) / AGENDA_SEMANA_JANELA_MIN_ * 100;
    linhasHtml += '<div class="agenda-semana-linha" style="top:'+pct+'%;"></div>';
    if ((h - 7) % 2 === 0) eixoHtml += '<div class="agenda-semana-eixo-hora" style="top:'+pct+'%;">'+String(h).padStart(2,'0')+':00</div>';
  }

  el.innerHTML =
    '<div class="agenda-semana-grid-wrap"><div class="agenda-semana-grid-inner">' +
      '<div class="agenda-semana-header"><div class="agenda-semana-header-eixo"></div><div class="agenda-semana-header-dias">'+cabDiasHtml+'</div></div>' +
      '<div class="agenda-semana-corpo">' +
        '<div class="agenda-semana-eixo">'+eixoHtml+'</div>' +
        '<div class="agenda-semana-dias"><div class="agenda-semana-linhas">'+linhasHtml+'</div>'+colunasHtml+'</div>' +
      '</div>' +
    '</div></div>';
}

// ===== visão em lista (de volta em 29/09/2026, opção lado a lado com a grade de semana, não
// substituindo — o Vitor quer as duas) — mesmo card vertical de antes do redesign de 28/09/2026
// (resgatado do histórico do git), com uma faixa colorida de 4px na esquerda (cor do nível do
// conselho ou do status do round, mesma paleta já usada no mês e na grade) pra ficar visualmente
// consistente com as outras duas visões. Mesmo período/navegação da semana (agendaEhPeriodoDeSemana_).
function agendaItemCardHtml_(item, i){
  var dt = new Date(item.dataIso);
  var dia = String(dt.getDate()).padStart(2,'0');
  var hora = String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
  var est = agendaEstiloItem_(item);
  var corFaixa = est.corFundo;
  var pill = '';
  if (item.tipo === 'round') {
    pill = '<span class="agenda-pill" style="background:'+corStatusRound_(item.statusLabel)+';">'+escAgenda_(item.statusLabel||'—')+'</span>';
  } else if (item.passado) {
    var lista = item.presencaPorMembro || [];
    var presentes = lista.filter(function(p){ return p.status === 'Presente'; }).length;
    if (lista.length) pill = '<span class="agenda-pill" style="background:'+est.corFundo+';color:'+est.corTexto+';">'+presentes+'/'+lista.length+' presentes</span>';
  } else {
    var qtd = (item.confirmados||[]).length;
    pill = '<span class="agenda-pill" style="background:'+est.corFundo+';color:'+est.corTexto+';">'+qtd+' confirmado'+(qtd===1?'':'s')+'</span>';
  }
  var presencaMini = '';
  if (item.passado && (item.presencaPorMembro||[]).length) {
    presencaMini = '<div class="agenda-presenca-mini">' + item.presencaPorMembro.map(function(p){
      return '<span class="agenda-presenca-dot" style="background:'+corStatusPresenca_(p.status)+';" title="'+escAgenda_(p.nome)+' · '+escAgenda_(p.status||'—')+'"></span>';
    }).join('') + '</div>';
  }
  var rotuloCard = (item.nome||'Sem nome') + ', ' + est.descricao;
  return '<div class="agenda-item-card clicavel" role="button" tabindex="0" aria-label="'+escAgenda_(rotuloCard)+'" title="'+escAgenda_(rotuloCard)+'" style="border-left:6px solid '+corFaixa+';" onclick="agendaAbrirModal_('+i+')" onkeydown="agendaTecla_(event,'+i+')">' +
    '<div class="agenda-item-data"><div class="agenda-item-dia">'+dia+'</div><div class="agenda-item-hora">'+MESES_ABREV[dt.getMonth()]+' · '+hora+'</div></div>' +
    '<div class="agenda-item-corpo"><div class="agenda-item-tipo">'+(item.tipo==='round'?'Round':'Conselho')+'</div>' +
      '<div class="agenda-item-nome">'+agendaNivelDotHtml_(item)+escAgenda_(item.nome||'—')+'</div>' +
      (item.sub ? '<div class="agenda-item-sub">'+escAgenda_(item.sub)+'</div>' : '') +
      presencaMini +
    '</div>' + pill +
  '</div>';
}
function renderAgendaLista_(d){
  agendaItensClique_ = agendaItensUnificados_(d);
  var el = document.getElementById('agendaBody');
  if (!agendaItensClique_.length) { el.innerHTML = '<div class="agenda-semana-sem-itens">Nenhum conselho ou round nesta semana.</div>'; return; }
  el.innerHTML = '<div class="agenda-semana-list">' + agendaItensClique_.map(agendaItemCardHtml_).join('') + '</div>';
}

function renderAgendaMes_(d, range){
  var itens = agendaItensUnificados_(d);
  agendaItensClique_ = itens;
  var porDia = {};
  itens.forEach(function(item, i){
    var chave = agendaFmtYYYYMMDD_(new Date(item.dataIso));
    if (!porDia[chave]) porDia[chave] = [];
    porDia[chave].push(i);
  });

  var diaSemanaPrimeiro = range.inicio.getDay();
  var offsetSeg = diaSemanaPrimeiro === 0 ? 6 : diaSemanaPrimeiro - 1;
  var inicioGrade = agendaAddDias_(range.inicio, -offsetSeg);
  var hojeChave = agendaFmtYYYYMMDD_(new Date());
  var mesAlvo = agendaAncora_.getMonth();

  var html = '<div class="agenda-mes-grid">';
  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].forEach(function(rotulo, ridx){ html += '<div class="agenda-mes-cab'+(ridx>=5?' fim-semana':'')+'">'+rotulo+'</div>'; });
  for (var c=0; c<42; c++) {
    var diaCel = agendaAddDias_(inicioGrade, c);
    var chave = agendaFmtYYYYMMDD_(diaCel);
    var foraDoMes = diaCel.getMonth() !== mesAlvo;
    var ehFimDeSemana = c % 7 >= 5;
    var idxs = porDia[chave] || [];
    html += '<div class="agenda-mes-dia'+(foraDoMes?' fora-do-mes':'')+(chave===hojeChave?' hoje':'')+(ehFimDeSemana?' fim-semana':'')+'"><div class="agenda-mes-dia-num">'+diaCel.getDate()+'</div>';
    idxs.slice(0,2).forEach(function(idx){
      var item = itens[idx];
      var est = agendaEstiloItem_(item);
      var dot = item.tipo === 'conselho' ? '<span class="agenda-mes-chip-dot" style="background:'+corNivel_(item.nivel)+';"></span>' : '';
      var dt = new Date(item.dataIso);
      var horaChip = String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
      var rotuloChip = horaChip + ', ' + (item.nome||'Sem nome') + ', ' + est.descricao;
      var seloChip = est.selo ? ' · ' + est.selo : '';
      html += '<div class="agenda-mes-chip'+(dot?' com-dot':'')+'" role="button" tabindex="0" aria-label="'+escAgenda_(rotuloChip)+'" style="background:'+est.corFundo+';color:'+est.corTexto+';" onclick="agendaAbrirModal_('+idx+')" onkeydown="agendaTecla_(event,'+idx+')" title="'+escAgenda_(rotuloChip)+'">'+dot+horaChip+' '+escAgenda_(item.nome)+seloChip+'</div>';
    });
    if (idxs.length > 2) html += '<div class="agenda-mes-mais">+'+(idxs.length-2)+' mais</div>';
    html += '</div>';
  }
  html += '</div>';
  document.getElementById('agendaBody').innerHTML = html;
}

function agendaAbrirModal_(i){
  var item = agendaItensClique_[i];
  if (!item) return;
  var dt = new Date(item.dataIso);
  var dataTxt = String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+' às '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
  var html = '<div class="case-modal-header"><div><div class="case-modal-nome">'+escAgenda_(item.nome||'—')+'</div>' +
    (item.sub ? '<div class="case-modal-empresa">'+escAgenda_(item.sub)+'</div>' : '') + '</div></div>';
  html += '<div class="case-modal-campo"><div class="case-modal-label">'+(item.tipo==='round'?'Round':'Encontro')+'</div>' +
    '<div class="case-modal-texto">'+dataTxt+(item.statusLabel?' · '+escAgenda_(item.statusLabel):'')+'</div></div>';

  if (item.tipo === 'round') {
    document.getElementById('conselhoModalBody').innerHTML = html;
    document.getElementById('conselhoModalOverlay').classList.add('ativo');
    return;
  }
  if (item.passado) {
    var lista = item.presencaPorMembro || [];
    html += '<div class="case-modal-campo"><div class="case-modal-label">Presença</div><div>';
    if (!lista.length) html += '<div class="empty-state" style="padding:16px 0;">Sem registro de presença pra este mês.</div>';
    else lista.forEach(function(p){
      html += '<span class="confirmado-chip"><span class="confirmado-avatar" style="background:'+corStatusPresenca_(p.status)+'">'+iniciais(p.nome)+'</span>'+escAgenda_(p.nome)+
        ' <span class="confirmado-mes">· '+escAgenda_(p.status||'—')+(p.reposicao?' (reposição)':'')+'</span></span>';
    });
    html += '</div></div>';
  } else {
    var confirmados = item.confirmados || [];
    html += '<div class="case-modal-campo"><div class="case-modal-label">Confirmados</div><div>';
    if (!confirmados.length) html += '<div class="empty-state" style="padding:16px 0;">Ninguém confirmado ainda.</div>';
    else confirmados.forEach(function(cf){
      html += '<span class="confirmado-chip"><span class="confirmado-avatar" style="background:'+corPara(cf.nome)+'">'+iniciais(cf.nome)+'</span>'+escAgenda_(cf.nome)+'</span>';
    });
    html += '</div></div>';
  }
  if (item.groupId) html += '<div class="case-modal-campo"><a href="/conselho/'+encodeURIComponent(item.groupId)+'" style="font-size:12px;font-weight:700;color:#1A1A1A;">Ver conselho completo →</a></div>';
  document.getElementById('conselhoModalBody').innerHTML = html;
  document.getElementById('conselhoModalOverlay').classList.add('ativo');
}

// ============ NPS — resolver de aliases (Parte D, 28/09/2026) ============
// Mesmo espírito do resolver de Big Deal sem membro (app/conselho-html.ts): mostra quem não bateu
// automático contra o roster de conselhos ativos, gestor escolhe/confirma, some da lista.
var npsRosterAtual_ = [];
var npsPendentesAtual_ = [];
function carregarNpsAliasesPendentes(){
  fetchJSON_('/api/gestor/nps/aliases-pendentes').then(function(d){
    npsRosterAtual_ = d.roster || [];
    npsPendentesAtual_ = d.pendentes || [];
    renderNpsAliasesPendentes_();
  }).catch(function(){
    // silencioso — não é uma seção crítica da home, não deve travar o resto da tela por causa dela
  });
}
function renderNpsAliasesPendentes_(){
  var bloco = document.getElementById('npsAliasesPendentesBlock');
  var lista = npsPendentesAtual_;
  bloco.style.display = lista.length ? 'block' : 'none';
  if (!lista.length) return;
  var opcoes = '<option value="">Selecionar do roster…</option>' +
    npsRosterAtual_.map(function(g){ return '<option value="'+escAgenda_(g.groupId)+'">'+escAgenda_(g.titulo)+'</option>'; }).join('');
  document.getElementById('npsAliasesPendentesList').innerHTML = lista.map(function(p, idx){
    var sugestao = p.groupIdSugerido ? '<div class="resolver-sub">Sugestão automática: '+escAgenda_(p.nomeGrupoSugerido || p.groupIdSugerido)+'</div>' : '<div class="resolver-sub">Sem sugestão automática — escolha manualmente.</div>';
    var selecaoInicial = p.groupIdSugerido || '';
    return '<div class="resolver-card"><div class="resolver-head">' +
        '<div><span class="resolver-nome-raw">'+escAgenda_(p.conselhoRaw)+'</span>'+sugestao+'</div>' +
      '</div>' +
      '<div class="resolver-linha">' +
        '<select class="resolver-select" id="npsAliasSelect'+idx+'">'+opcoes+'</select>' +
        '<button class="resolver-btn" id="npsAliasBtn'+idx+'" type="button" onclick="confirmarNpsAlias('+idx+')">Confirmar</button>' +
      '</div>' +
      '<div class="resolver-status" id="npsAliasStatus'+idx+'"></div></div>';
  }).join('');
  lista.forEach(function(p, idx){
    var sel = document.getElementById('npsAliasSelect'+idx);
    if (sel && p.groupIdSugerido) sel.value = p.groupIdSugerido;
  });
}
function confirmarNpsAlias(idx){
  var p = npsPendentesAtual_[idx];
  var sel = document.getElementById('npsAliasSelect'+idx);
  var btn = document.getElementById('npsAliasBtn'+idx);
  var status = document.getElementById('npsAliasStatus'+idx);
  var groupId = sel ? sel.value : '';
  if (!groupId) { status.textContent = 'Escolha um conselho do roster.'; status.className = 'resolver-status erro'; return; }
  btn.disabled = true; status.textContent = 'Confirmando…'; status.className = 'resolver-status';
  fetchJSON_('/api/gestor/nps/aliases-pendentes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conselhoRaw: p.conselhoRaw, groupId: groupId }),
  }).then(function(){
    npsPendentesAtual_ = npsPendentesAtual_.filter(function(x){ return x.conselhoRaw !== p.conselhoRaw; });
    renderNpsAliasesPendentes_();
  }).catch(function(err){
    btn.disabled = false;
    status.textContent = 'Erro: ' + err.message;
    status.className = 'resolver-status erro';
  });
}

// ============ Relatório mensal (Parte G, 28/09/2026) ============
// Seletor de mês/ano só escolhe QUAL relatório baixar — o arquivo baixado é sempre autônomo (todo
// dado já embutido nele, ver gerarRelatorioMensalHtml), sem nenhuma chamada de volta pro app.
function iniciarSeletorRelatorioMensal_(){
  var sel = document.getElementById('selMesRelatorio');
  if (!sel || sel.options.length) return;
  var optGeral = document.createElement('option'); optGeral.textContent = 'Visão Geral'; sel.appendChild(optGeral);
  MESES.forEach(function(m){ var o=document.createElement('option'); o.textContent=m; sel.appendChild(o); });
  sel.value = MESES[agoraGlobal_().getMonth()];
  document.getElementById('selAnoRelatorio').value = String(agoraGlobal_().getFullYear());
}
function agoraGlobal_(){ return new Date(); }
function urlRelatorioMensal_(preview){
  var mes = document.getElementById('selMesRelatorio').value;
  var ano = document.getElementById('selAnoRelatorio').value;
  return '/api/gestor/relatorio-mensal?mes='+encodeURIComponent(mes)+'&ano='+encodeURIComponent(ano)+(preview?'&preview=1':'');
}
function preVisualizarRelatorioMensal(){ window.open(urlRelatorioMensal_(true), '_blank'); }
function baixarRelatorioMensal(){ window.open(urlRelatorioMensal_(false), '_blank'); }

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
// Parte G (29/09/2026): cards da home vêm de config_home_indicadores (visível/ordem definidos
// pelo gestor na Matriz de metas), não mais fixos. Mapa só de rótulo/unidade/chave em
// data.indicadores — indicadores sem cálculo pra equipe hoje (carteira, presenca, suspensoes,
// critico) ficam de fora de propósito, mesmo que um dia sejam marcados visíveis por engano.
var INDICADOR_HOME_INFO = {
  churn: { label: 'Churn', unidade: null, chave: 'churn' },
  revenue_churn: { label: 'Revenue Churn', unidade: 'R$', chave: 'revenueChurn' },
  cases: { label: 'Cases de Sucesso', unidade: null, chave: 'casesSucesso' },
  matchmakings: { label: 'Matchmakings', unidade: null, chave: 'matchmakings' },
  rounds: { label: 'Rounds', unidade: null, chave: 'rounds' },
  health_base: { label: 'Health da Base', unidade: null, chave: 'healthDaBase' },
  indicacoes: { label: 'Indicações', unidade: null, chave: 'indicacoes' },
  upsell: { label: 'Upsell', unidade: null, chave: 'upsell' },
  downsell: { label: 'Downsell', unidade: null, chave: 'downsell' },
};
// Limites conhecidos do histórico espelhado (conferido direto no banco em 29/09/2026) — o recorde
// só é calculado dentro dessa janela; antes dela, o gestor pode registrar um recorde manual na
// tela de Metas e destaques.
function renderLegendaJanelaHistorico(){
  return '<div class="legenda-janela-historico" style="font-size:10.5px;color:#6E6C6C;margin-top:14px;line-height:1.6;">'+
    'Recorde calculado só dentro do histórico espelhado: cases desde julho de 2025, indicações desde janeiro de 2026, '+
    'matchmakings desde abril de 2026, rounds e churn desde maio de 2026. Fora dessa janela, use o recorde manual na tela do gestor.'+
    '</div>';
}
function renderEquipe(data){
  modoGeralAtual = !!data.periodo.geral;
  renderEquipeSecao_('equipeIndicadores', function(){
    var ind = data.indicadores;
    var cfgHome = (data.configHomeIndicadores || []).filter(function(c){ return c.visivel && INDICADOR_HOME_INFO[c.indicador] && ind[INDICADOR_HOME_INFO[c.indicador].chave]; })
      .sort(function(a,b){ return a.ordem - b.ordem; });
    var cards = cfgHome.map(function(c){
      var info = INDICADOR_HOME_INFO[c.indicador];
      var recordeInfo = c.exibir_recorde && data.recordes ? data.recordes[info.chave] : null;
      return kpiCard(info.label, ind[info.chave], info.unidade, null, false, recordeInfo);
    });
    var linhasHtml = '';
    for (var i = 0; i < cards.length; i += 3) { linhasHtml += '<div class="grid3">' + cards.slice(i, i + 3).join('') + '</div>'; }
    if (!cards.length) linhasHtml = '<div class="empty-state">Nenhum indicador visível na home — configure em Controle de Perfis, Metas e destaques.</div>';
    document.getElementById('equipeIndicadores').innerHTML = linhasHtml + renderChurnOrfao(data.churnOrfao) + (modoGeralAtual ? '' : renderLegendaJanelaHistorico());
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
    html += '<a class="cons-card' + (c.congelado ? ' congelado' : '') + '" href="/conselho/' + encodeURIComponent(c.groupId) + qs + '">' +
      '<div class="cons-foto-wrap">' + foto + selo + health +
        '<div class="cons-over"><div class="cons-nome">' + escHtml_(c.conselheiro) + '</div><div class="cons-nivel">' + escHtml_(c.nivel) + '</div></div>' +
      '</div>' +
      '<div class="cons-body">' +
        '<div class="cons-linha">CS responsável: <b style="color:#fff;">' + escHtml_(c.csResponsavel) + '</b></div>' +
        proxima +
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

// SCORE_MODAL_DATA_/registrarScoreModal_/abrirScoreModal (Parte A/C, pedido do Vitor 25/09/2026):
// notinha clicável reaproveitada em qualquer lugar que mostre a pontuação ponderada de um CS —
// Top 3 da home, própria posição — reaproveitando o modal de case/conselho já existente
// (#caseModalOverlay), sempre com o detalhamento item a item que já vem pronto do servidor
// (detalharScoreCS em lib/reports.ts, mesma fórmula/pesos de sempre, nunca inventados aqui).
var SCORE_MODAL_DATA_ = [];
function registrarScoreModal_(nome, score, detalhamento){
  SCORE_MODAL_DATA_.push({ nome: nome, score: score, detalhamento: detalhamento || [] });
  return SCORE_MODAL_DATA_.length - 1;
}
function abrirScoreModal(idx){
  var d = SCORE_MODAL_DATA_[idx];
  if (!d) return;
  var linhas = d.detalhamento.map(function(item){
    var val = (item.valorAlcancado===null||item.valorAlcancado===undefined) ? '—' : item.valorAlcancado;
    var meta = (item.meta===null||item.meta===undefined) ? '—' : item.meta;
    var ach = (item.achievementPct===null||item.achievementPct===undefined) ? '—' : item.achievementPct+'%';
    var semMeta = !!item.semMeta;
    var avisoMeta = semMeta ? '<span class="meta-aviso" title="Sem meta cadastrada: o indicador fica fora da média.">sem meta</span>' : '';
    return '<div class="score-detalhe-row">' +
      '<span class="score-detalhe-label">'+item.label+avisoMeta+'</span>' +
      '<span class="score-detalhe-peso">peso '+item.peso+'</span>' +
      '<span class="score-detalhe-valor">'+(semMeta ? val+' · sem meta' : val+' / '+meta+' · '+ach)+'</span>' +
      '<span class="score-detalhe-pontos">'+((semMeta||item.pontos===null||item.pontos===undefined) ? 'fora da média' : item.pontos+' pts')+'</span>' +
    '</div>';
  }).join('');
  document.getElementById('caseModalBody').innerHTML =
    '<div class="case-modal-header"><div><div class="case-modal-nome">'+d.nome+'</div>' +
    '<div class="case-modal-empresa">Pontuação: '+(d.score===null?'—':d.score)+'</div></div></div>' +
    '<div class="case-modal-campo"><div class="case-modal-label">Como a pontuação foi composta</div>' + linhas +
    '<div class="case-modal-texto" style="margin-top:12px;color:#9F9F9F;">Pontos = peso × aproveitamento de cada indicador na meta. Indicador sem meta cadastrada fica fora da média e os pesos dos demais são redistribuídos. A pontuação final vai de 0 a 100.</div></div>';
  document.getElementById('caseModalOverlay').classList.add('ativo');
}

function renderCSTop(csTop, targetId){
  var el = document.getElementById(targetId || 'csTop');
  if (!csTop || csTop.length === 0) { el.innerHTML = '<div class="empty-state">Sem dados suficientes pra calcular o Top 3 neste período.</div>'; return; }
  var medalhas = ['1º lugar','2º lugar','3º lugar'];
  var html = '<div class="cstop-grid">';
  csTop.forEach(function(c, i){
    var fotoHtml = c.fotoUrl ? '<img class="cstop-foto" src="'+c.fotoUrl+'">' : '<div class="cstop-foto-fallback" style="background:'+corPara(c.nomeCompleto||c.nome)+'">'+iniciais(c.nomeCompleto||c.nome)+'</div>';
    var idxModal = registrarScoreModal_(c.nome, c.score, c.detalhamento);
    html += '<div class="cstop-card pos'+(i+1)+'"><div class="cstop-medalha">'+(medalhas[i]||((i+1)+'º lugar'))+'</div>' +
      fotoHtml + '<div class="cstop-nome">'+c.nome+'</div>' +
      '<div class="cstop-score num">'+c.score+'<button class="info-btn" onclick="abrirScoreModal('+idxModal+')" title="Como essa pontuação foi composta">ⓘ</button></div><div class="cstop-score-lbl">pontos</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// Exceção 2 da Parte A (25/09/2026): só a PRÓPRIA posição no ranking geral, nunca a lista inteira
// de nomes/posições dos colegas.
function renderMinhaPosicao(resumo){
  var el = document.getElementById('restritoPosicao');
  if (!el) return;
  if (resumo.minhaPosicao === null || resumo.minhaPosicao === undefined) { el.innerHTML = ''; return; }
  var idxModal = registrarScoreModal_(currentCS, resumo.meuScore, resumo.meuDetalhamento);
  el.innerHTML = '<div class="minha-posicao-badge">Você está em <strong>'+resumo.minhaPosicao+'º lugar</strong> geral' +
    (resumo.totalRankeados ? ' de '+resumo.totalRankeados : '') +
    (resumo.meuScore !== null && resumo.meuScore !== undefined ? ' · '+resumo.meuScore+' pontos' : '') +
    '<button class="info-btn dark" onclick="abrirScoreModal('+idxModal+')" title="Como essa pontuação foi composta">ⓘ</button></div>';
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

// ============ foto de perfil com recorte (brainstorm 29/09/2026) ============
// Canvas simples, sem biblioteca externa (mesma filosofia zero-dependência do resto do arquivo):
// escolhe uma imagem, arrasta pra reposicionar, régua pra dar zoom, salva um recorte quadrado de
// 480×480 (resolução interna do canvas já é 480×480 — o círculo é só recorte visual via CSS no
// wrapper, o que é salvo é o quadrado inteiro). Botão só aparece pro próprio CS ou pro gestor
// (ver renderJornadaHero). Foto customizada tem prioridade sobre a estática em qualquer lugar do
// app que mostra foto de CS — resolvido no servidor (resolverFotoUrl em lib/reports.ts), nada
// disso precisa ser replicado aqui.
var FOTO_CROP_TAM_ = 480;
var fotoCropImg_ = null;
var fotoCropOffsetX_ = 0, fotoCropOffsetY_ = 0;
var fotoCropZoom_ = 1;
var fotoCropBaseScale_ = 1;
var fotoCropArrastando_ = false;
var fotoCropUltimoX_ = 0, fotoCropUltimoY_ = 0;

function abrirEditorFotoCS(){
  fotoCropImg_ = null;
  fotoCropOffsetX_ = 0; fotoCropOffsetY_ = 0; fotoCropZoom_ = 1;
  document.getElementById('fotoCropInput').value = '';
  document.getElementById('fotoCropZoomRange').value = '1';
  document.getElementById('fotoCropZoomRange').disabled = true;
  document.getElementById('fotoCropSalvarBtn').disabled = true;
  document.getElementById('fotoCropStatus').textContent = '';
  var ctx = document.getElementById('fotoCropCanvas').getContext('2d');
  ctx.clearRect(0, 0, FOTO_CROP_TAM_, FOTO_CROP_TAM_);
  document.getElementById('fotoCropModalOverlay').classList.add('ativo');
}
function fecharEditorFotoCS(){
  document.getElementById('fotoCropModalOverlay').classList.remove('ativo');
}
function fotoCropArquivoSelecionado_(e){
  var arquivo = e.target.files && e.target.files[0];
  if (!arquivo) return;
  var status = document.getElementById('fotoCropStatus');
  var leitor = new FileReader();
  leitor.onload = function(){
    var img = new Image();
    img.onload = function(){
      fotoCropImg_ = img;
      fotoCropBaseScale_ = Math.max(FOTO_CROP_TAM_ / img.width, FOTO_CROP_TAM_ / img.height);
      fotoCropZoom_ = 1;
      fotoCropOffsetX_ = 0; fotoCropOffsetY_ = 0;
      document.getElementById('fotoCropZoomRange').value = '1';
      document.getElementById('fotoCropZoomRange').disabled = false;
      document.getElementById('fotoCropSalvarBtn').disabled = false;
      status.textContent = '';
      fotoCropDesenhar_();
    };
    img.onerror = function(){ status.style.color = '#C0392B'; status.textContent = 'Não foi possível abrir essa imagem.'; };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}
function fotoCropClampOffsets_(){
  if (!fotoCropImg_) return;
  var s = fotoCropBaseScale_ * fotoCropZoom_;
  var maxX = Math.max(0, (fotoCropImg_.width * s - FOTO_CROP_TAM_) / 2);
  var maxY = Math.max(0, (fotoCropImg_.height * s - FOTO_CROP_TAM_) / 2);
  fotoCropOffsetX_ = Math.max(-maxX, Math.min(maxX, fotoCropOffsetX_));
  fotoCropOffsetY_ = Math.max(-maxY, Math.min(maxY, fotoCropOffsetY_));
}
function fotoCropDesenhar_(){
  var canvas = document.getElementById('fotoCropCanvas');
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, FOTO_CROP_TAM_, FOTO_CROP_TAM_);
  if (!fotoCropImg_) return;
  fotoCropClampOffsets_();
  var s = fotoCropBaseScale_ * fotoCropZoom_;
  var w = fotoCropImg_.width * s, h = fotoCropImg_.height * s;
  var cx = FOTO_CROP_TAM_/2 + fotoCropOffsetX_, cy = FOTO_CROP_TAM_/2 + fotoCropOffsetY_;
  ctx.drawImage(fotoCropImg_, cx - w/2, cy - h/2, w, h);
}
function fotoCropZoomMudou_(){
  fotoCropZoom_ = Number(document.getElementById('fotoCropZoomRange').value) || 1;
  fotoCropDesenhar_();
}
function fotoCropPontoEvento_(e){
  var t = (e.touches && e.touches[0]) || e;
  return { x: t.clientX, y: t.clientY };
}
function fotoCropPointerDown_(e){
  if (!fotoCropImg_) return;
  e.preventDefault();
  fotoCropArrastando_ = true;
  document.getElementById('fotoCropCanvasWrap').classList.add('arrastando');
  var p = fotoCropPontoEvento_(e);
  fotoCropUltimoX_ = p.x; fotoCropUltimoY_ = p.y;
}
function fotoCropPointerMove_(e){
  if (!fotoCropArrastando_) return;
  e.preventDefault();
  var p = fotoCropPontoEvento_(e);
  var rect = document.getElementById('fotoCropCanvas').getBoundingClientRect();
  var escala = FOTO_CROP_TAM_ / rect.width; // canvas interno é maior que o display (280px) — converte delta de tela pra px de canvas
  fotoCropOffsetX_ += (p.x - fotoCropUltimoX_) * escala;
  fotoCropOffsetY_ += (p.y - fotoCropUltimoY_) * escala;
  fotoCropUltimoX_ = p.x; fotoCropUltimoY_ = p.y;
  fotoCropDesenhar_();
}
function fotoCropPointerUp_(){
  fotoCropArrastando_ = false;
  document.getElementById('fotoCropCanvasWrap').classList.remove('arrastando');
}
(function iniciarFotoCropEventos_(){
  var wrap = document.getElementById('fotoCropCanvasWrap');
  wrap.addEventListener('mousedown', fotoCropPointerDown_);
  window.addEventListener('mousemove', fotoCropPointerMove_);
  window.addEventListener('mouseup', fotoCropPointerUp_);
  wrap.addEventListener('touchstart', fotoCropPointerDown_, { passive:false });
  wrap.addEventListener('touchmove', fotoCropPointerMove_, { passive:false });
  wrap.addEventListener('touchend', fotoCropPointerUp_);
})();
function fotoCsUrlComCacheBust_(nome){ return '/cs-foto/' + encodeURIComponent(nome) + '?v=' + Date.now(); }
function salvarFotoCS(){
  if (!fotoCropImg_) return;
  var btn = document.getElementById('fotoCropSalvarBtn');
  var status = document.getElementById('fotoCropStatus');
  btn.disabled = true; status.style.color = '#9F9F9F'; status.textContent = 'Salvando...';
  var dataUri = document.getElementById('fotoCropCanvas').toDataURL('image/jpeg', 0.85);
  fetchJSON_('/api/cs/' + encodeURIComponent(currentCS) + '/foto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fotoBase64: dataUri }),
  }).then(function(){
    fecharEditorFotoCS();
    var fotoImg = document.getElementById('pessoaFoto'), fotoFallback = document.getElementById('pessoaFotoFallback');
    fotoImg.src = fotoCsUrlComCacheBust_(currentCS);
    fotoImg.style.display = 'block';
    fotoFallback.style.display = 'none';
  }).catch(function(err){
    btn.disabled = false; status.style.color = '#C0392B'; status.textContent = 'Erro: ' + err.message;
  });
}
function removerFotoCSClick(){
  if (!window.confirm('Remover a foto customizada? Volta pra foto padrão (ou iniciais).')) return;
  var status = document.getElementById('fotoCropStatus');
  status.style.color = '#9F9F9F'; status.textContent = 'Removendo...';
  fetchJSON_('/api/cs/' + encodeURIComponent(currentCS) + '/foto', { method: 'DELETE' }).then(function(){
    fecharEditorFotoCS();
    // Volta pro fallback estático/iniciais resolvido no servidor — recarrega o perfil em vez de
    // tentar replicar FOTOS_CS aqui (única fonte de verdade fica em lib/reports.ts).
    if (modoRestritoCS) carregarRelatorioRestrito(currentCS, currentMes, currentAno);
    else carregarRelatorio(currentCS, currentMes, currentAno);
  }).catch(function(err){
    status.style.color = '#C0392B'; status.textContent = 'Erro: ' + err.message;
  });
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
<div class="case-modal-overlay" id="fotoCropModalOverlay" onclick="if(event.target===this) fecharEditorFotoCS()">
  <div class="case-modal" style="max-width:420px;">
    <div class="case-modal-close" onclick="fecharEditorFotoCS()">✕</div>
    <div class="case-modal-header"><div><div class="case-modal-nome">Trocar foto</div></div></div>
    <div class="foto-crop-picker"><input type="file" id="fotoCropInput" accept="image/*" onchange="fotoCropArquivoSelecionado_(event)"></div>
    <div class="foto-crop-canvas-wrap" id="fotoCropCanvasWrap"><canvas id="fotoCropCanvas" width="480" height="480"></canvas></div>
    <div class="foto-crop-zoom-row">
      <span style="font-size:11px;color:#9F9F9F;">Zoom</span>
      <input type="range" id="fotoCropZoomRange" min="1" max="3" step="0.01" value="1" oninput="fotoCropZoomMudou_()" disabled>
    </div>
    <div class="foto-crop-actions">
      <button class="destaque-form-btn" style="background:#3A3A3A;color:#fff;" onclick="removerFotoCSClick()">Remover foto atual</button>
      <div style="display:flex;gap:10px;align-items:center;">
        <span class="foto-crop-status" id="fotoCropStatus"></span>
        <button class="destaque-form-btn" id="fotoCropSalvarBtn" onclick="salvarFotoCS()" disabled>Salvar</button>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
