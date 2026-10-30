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
import { GTD_CHECKLIST_STYLE, GTD_CHECKLIST_SCRIPT } from '../lib/gtd-checklist.ts';
import {
  SEMAFORO_CONFIRMADOS, AGENDA_PASSADO_COR, SEMAFORO_NEUTRO, AGENDA_DURACAO_CONSELHO_MIN,
  REPORT_COMO_FOI_SEMANA, REPORT_STATUS_CHECKLIST, REPORT_CHECKLISTS, REPORT_VALIDADE_DIAS,
} from '../lib/constants.ts';
import { casaBusca } from '../lib/indicadores-base.ts';
import { TEMA_CSS, ICONES_SVG, DOCK_SCRIPT } from '../lib/ui/tema.ts';
import { GRADE_CONSELHOS_CSS, GRADE_CONSELHOS_SCRIPT } from '../lib/ui/grade-conselhos.ts';
import { RELATORIO_CSS, RELATORIO_PAINEL_HTML, RELATORIO_SCRIPT } from '../lib/ui/relatorio-conselho-ui.ts';
import { REDESENHO_CS_CSS, REDESENHO_CS_SCRIPT } from '../lib/ui/redesenho-cs-ui.ts';
import { LIMIAR_PRESENCA_ATENCAO } from '../lib/constants.ts';
import { AGENDA_CSS, agendaConfigJson } from '../lib/agenda-ui.ts';

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
${TEMA_CSS}
${GRADE_CONSELHOS_CSS}
${RELATORIO_CSS}
${REDESENHO_CS_CSS}
:root {
  /* M da MOAI usado como máscara do "M líquido" nos cards de KPI — valor real, copiado do doc "Index". */
  --m-white: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABiCAYAAACvUNYzAAAC70lEQVR42u2dMWtUQRSFzyz+An+AKVJZpQgWsUiVJlumSyeKpBEsIph/EBBttLHYFdLY2bqFlQS0iZDKSgKm9zeMzUCCqGyWO3PPnTkHAtns2zv33I839828xyblnCH5aaISCIAASFwAZgDyDX42Bq7fxg1rNatxBpwPDOC8xhmwika8lDLxbNkDvg9UfDOvlgDuAtgfoPj7xSvlVdD7AQCYeqxxGdpzPzD3NomSaI/Fr70QO+6o+NW81ARw1BGAo4gAepmKqnqYRDcQPfdWm3EfAxa/Sc6tAOwC2ApU/K2SczcAAOBLIADNcm19PyBCP2iao8cNmZ/ExW+emweAOwAOCIt/UHLrHgAAvCUE4JKT5z1hpn7glstkVOMsOTA8FfFm0LFpADwZdGwaAF7TAEUPYnowK49WfDYAAPC5kzHCAtgGsFMx/k4ZQwD+o09BY3cDoNYcTbkRaA1gbhjrF2msOfsZ8MAozm0AhwZxDkssJm9VAZwAuDSK9ZIkBoqnkyg9YI1k7s6knpo04eQMIZN6aXoVdM+p+c1JPTQHcAZgYRTrIYD1JY5bL8daaFE8hF4HTA1j/TA6xiN314VYq34QYt73WglbGjpb8m/UxffYinhhFGcTwN6113uEOVICeG4Y68Mfv28S5kgHoEY/CDfvewNwMcqak+d29COi4rvl4gngHYALguJflFyGA4AlV7Zd58BwRywNOjYNAAC4P8iYtAC+wm7TbhktypgCcE3TTscKA6DVnEy1BmF8LCWNUnxWAADwKkjMbgE8CxKzWwDW00ViNcn+vaGp5+JHAAAAj50+KwBFM6z2pN0l/vJFqQKwmtYafUYAjObyFMVUtC/v3jY6RgBW1Cn+vWn3rbx3KgB1NV3xPQGo3A9SRCO3EFcJV4+kpKgmIgMAgNfB8w8P4Gl0APofMgIgAJIACIAkAAIgCYAASAIgAJIACIAkAAIgCYAASAIgAJIACIAkAAIgVVDKOasKOgMEQJLG1G93i33gLv0k4gAAAABJRU5ErkJggg==);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: #5D5D5D; font-size: 13px; -webkit-font-smoothing:antialiased; }
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
.processos-topbar-link { font-size: 11px; font-weight:800; color:#1A1A1A; text-decoration:none; padding:6px 10px; border-radius:8px; border:0.75pt solid #D8D5D5; background:#fff; }
.processos-topbar-link:hover { border-color:#1A1A1A; }
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
.jornada-hero { background:#111111; color:#fff; padding: 28px 28px 26px; margin-bottom: 0; }
.jornada-hero-inner { max-width:1040px; margin:0 auto; display:flex; gap:24px; align-items:center; }
.jornada-txt { min-width:0; }
.jornada-eyebrow { font-size: 10.5px; font-weight: 800; color:#9F9F9F; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:14px; }
.jornada-photo { width:92px; height:92px; border-radius:22px; object-fit:cover; background:#242424; flex-shrink:0; }
.jornada-photo-fallback { width:92px; height:92px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-size:38px; font-weight:800; color:#fff; flex-shrink:0; }
.jornada-photo-wrap { position:relative; width:92px; height:92px; flex-shrink:0; }
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
.jornada-nome { font-family:'Bricolage Grotesque', sans-serif; font-weight:800; font-size: 34px; line-height:1.05; letter-spacing:-0.6px; color:#fff; margin-bottom:6px; }
.jornada-sub { font-size: 13.5px; color:#B7B5B5; margin-bottom:4px; }
.jornada-meta { font-size: 11px; color:#7A7878; margin-top:8px; }
.jornada-proximo { display:inline-flex; align-items:center; gap:8px; margin-top:14px; background:rgba(255,255,255,0.08); border:0.75pt solid rgba(255,255,255,0.14); border-radius:99px; padding:8px 16px 8px 8px; font-size:12px; font-weight:700; color:#e5e5e5; }
.jornada-badge { margin-left:auto; flex-shrink:0; display:none; flex-direction:column; align-items:center; padding-top:4px; }
.jornada-badge-img-wrap { position:relative; width:76px; }
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

/* ===== leitura de relance da página do CS (13/10/2026) ===== */
.pessoa-faixa { max-width:1040px; margin:0 auto; padding:22px 28px 26px; display:grid; grid-template-columns: minmax(0,1.6fr) minmax(0,1fr); gap:16px; align-items:start; }
.pend-bloco, .mes-bloco { background:#fff; border:0.75pt solid #E3E1E1; border-radius:20px; padding:18px 20px; }
.pend-cab { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:10px; }
.pend-titulo { font-family:'Bricolage Grotesque',sans-serif; font-size:18px; font-weight:800; color:#1A1A1A; }
.pend-sub { font-size:11px; font-weight:700; color:#9F9F9F; }
.pend-lista { display:flex; flex-direction:column; }
.pend-item { display:flex; align-items:center; gap:12px; padding:11px 0; border-top:0.75pt solid #EFEDED; }
.pend-item:first-child { border-top:none; }
.pend-tag { flex:0 0 92px; font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; border-radius:99px; padding:3px 6px; text-align:center; }
#aba-acompanhamento .empty-state, #aba-reconhecimento .empty-state { padding:18px 20px; text-align:left; }
.pend-item.atrasado .pend-tag { background:#FBEEEC; color:#C0433D; }
.pend-item.breve .pend-tag { background:#F4EBD3; color:#7A5C14; }
.pend-item.info .pend-tag { background:#EFEDED; color:#807E7E; }
.pend-txt { flex:1; min-width:0; }
.pend-item-tit { font-size:13px; font-weight:700; color:#1A1A1A; line-height:1.35; overflow-wrap:anywhere; }
.pend-item-det { font-size:11.5px; color:#807E7E; margin-top:2px; line-height:1.4; }
.pend-acao { flex:0 0 auto; font-family:'Inter',sans-serif; font-size:11px; font-weight:800; color:#1A1A1A; background:#F5F5F5; border:0.75pt solid #D8D5D5; border-radius:8px; padding:7px 11px; cursor:pointer; text-decoration:none; white-space:nowrap; }
.pend-acao:hover { border-color:#1A1A1A; }
.pend-vazio { font-size:12.5px; color:#9F9F9F; padding:10px 0; }
.pend-vazio.ok { color:#3D8B5F; font-weight:700; }
.pend-mais { background:none; border:none; font-family:'Inter',sans-serif; font-size:11.5px; font-weight:800; color:#7A5C14; cursor:pointer; padding:8px 0 0; text-align:left; }
.mes-eyebrow { font-size:10.5px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.8px; }
.mes-frase { font-size:14px; color:#5D5D5D; margin:8px 0 10px; }
.mes-frase .num { font-size:30px; color:#1A1A1A; margin-right:4px; }
.mes-frase.pequeno { font-size:12.5px; }
.mes-barra { display:flex; gap:3px; height:8px; border-radius:99px; overflow:hidden; background:#EFEDED; margin-bottom:12px; }
.mes-seg.g { background:#3D8B5F; } .mes-seg.y { background:#C89A2E; } .mes-seg.r { background:#C0433D; }
.mes-linha { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:8px; }
.mes-rot { font-size:10.5px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.5px; width:100%; }
.mes-rot.ok { color:#3D8B5F; text-transform:none; letter-spacing:0; font-size:12px; }
.mes-chip { font-family:'Inter',sans-serif; font-size:11.5px; font-weight:600; border-radius:99px; padding:5px 10px; cursor:pointer; border:0.75pt solid transparent; }
.mes-chip.r { background:#FBEEEC; color:#8E2F2A; border-color:#EBC6C0; }
.mes-chip.y { background:#F7F0DE; color:#7A5C14; border-color:#EADBB4; }
.mes-chip:hover { border-color:#1A1A1A; }
.tab-badge { display:inline-block; margin-left:6px; min-width:18px; padding:1px 6px; border-radius:99px; background:#C0433D; color:#fff; font-size:10px; font-weight:800; text-align:center; }
.tab-badge[hidden] { display:none; }
@media (max-width: 820px) {
  .pessoa-faixa { grid-template-columns: 1fr; padding:18px 16px 20px; }
  .pend-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px 10px; align-items:center; }
  .pend-tag { grid-column:1 / -1; justify-self:start; flex:none; }
  .pend-txt { grid-column:1; }
  .pend-acao { grid-column:2; grid-row:2; }
  .topbar { padding:12px 16px; }
  .topbar-right { flex-wrap:wrap; }
  .jornada-hero { padding:22px 16px; }
  .jornada-hero-inner { gap:16px; }
  .jornada-photo, .jornada-photo-fallback, .jornada-photo-wrap { width:68px; height:68px; }
  .jornada-badge-img-wrap { width:52px; }
  .jornada-badge-label { display:none; }
  .tabs { overflow-x:auto; padding:0 16px; }
  .tab { white-space:nowrap; }
  .jornada-nome { font-size:26px; }
}

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
.kpi-cobertura { font-size:10.5px; color:#6E6C6C; margin-top:4px; }
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
.umaum-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:18px 20px; margin-bottom:12px; }
.umaum-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.umaum-card-data { font-size:13px; font-weight:800; color:#1A1A1A; }
.umaum-card-gestor { font-size:11px; color:#9F9F9F; }
.umaum-status-pill { font-size:10px; font-weight:800; padding:4px 11px; border-radius:999px; color:#fff; white-space:nowrap; }
.umaum-card-campo { font-size:12.5px; color:#5D5D5D; line-height:1.6; margin-bottom:8px; }
.umaum-card-campo:last-child { margin-bottom:0; }
.umaum-card-campo b { color:#1A1A1A; font-weight:700; display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
.advertencia-resumo { display:inline-flex; flex-direction:column; align-items:flex-start; gap:2px; margin-bottom:20px; padding:14px 20px; border-radius:16px; background:#F5F5F5; border:0.75pt solid #D8D5D5; }
.advertencia-resumo-num { font-family:'Bricolage Grotesque',sans-serif; font-size:32px; font-weight:800; color:#1A1A1A; line-height:1; }
.advertencia-resumo-label { font-size:11.5px; color:#807E7E; margin-top:4px; }
.advertencia-resumo.destaque { background:#FBEEEC; border-color:#EBC6C0; }
.advertencia-resumo.destaque .advertencia-resumo-num { color:#C0433D; }
/* ===== aba Report, report individual semanal (07/10/2026) ===== */
.report-reg-linha { display:flex; flex-wrap:wrap; gap:4px; }
.report-reg { display:inline-block; width:18px; height:18px; border-radius:4px; }
.report-reg-ok { background:#3D8B5F; }
.report-reg-atraso { background:#C89A2E; }
.report-reg-falta { background:#C0433D; }
.report-reg-pendente { background:#C6C4C4; }
.report-topo { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
.report-semana-nav { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.report-semana-label { font-size:13px; font-weight:800; color:#1A1A1A; }
.agenda-nav-btn:disabled { opacity:0.35; cursor:default; }
.report-selo { font-size:10px; font-weight:800; padding:4px 11px; border-radius:999px; white-space:nowrap; }
.report-selo.ok { background:#3A845A; color:#fff; }
.report-selo.pendente { background:#E9C23B; color:#1A1A1A; }
.report-selo.alerta { background:#E8833A; color:#1A1A1A; }
.report-selo.neutro { background:#EEECEC; color:#5D5D5D; }
.report-health { display:inline-flex; align-items:center; gap:10px; background:#1A1A1A; color:#fff; border-radius:16px; padding:10px 16px; }
.report-health-label { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:#D4AF37; }
.report-health-valor { font-family:'Bricolage Grotesque',sans-serif; font-size:22px; font-weight:800; line-height:1; }
.report-form { display:block; }
.report-secao { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:18px 20px; margin-bottom:16px; }
.report-secao h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:15px; font-weight:800; color:#1A1A1A; margin-bottom:12px; }
.report-ajuda { font-size:11.5px; color:#807E7E; line-height:1.6; margin:4px 0 10px; }
.report-erro-texto { color:#C0433D; font-weight:700; }
.report-linha { display:flex; gap:12px; flex-wrap:wrap; }
.report-campo { display:flex; flex-direction:column; gap:6px; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#5D5D5D; flex:1 1 160px; margin-bottom:12px; }
.report-campo-largo { flex:1 1 100%; }
.report-campo input, .report-campo select, .report-campo textarea { font-family:'Inter',sans-serif; font-size:13px; font-weight:500; text-transform:none; letter-spacing:0; color:#1A1A1A; background:#fff; border:0.75pt solid #C6C4C4; border-radius:10px; padding:9px 11px; width:100%; }
.report-campo textarea { min-height:70px; resize:vertical; }
.report-campo input:focus, .report-campo select:focus, .report-campo textarea:focus { outline:2px solid #1A1A1A; outline-offset:1px; }
.report-campo input.invalido { border-color:#C0433D; }
.report-erro { font-size:11px; font-weight:700; text-transform:none; letter-spacing:0; color:#C0433D; min-height:0; }
.report-opcoes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.report-opcao { position:relative; cursor:pointer; }
.report-opcao input { position:absolute; opacity:0; width:1px; height:1px; }
.report-opcao span { display:inline-block; font-size:12px; font-weight:700; padding:8px 16px; border-radius:999px; border:0.75pt solid #C6C4C4; color:#5D5D5D; background:#fff; }
.report-opcao input:focus-visible + span { outline:2px solid #1A1A1A; outline-offset:2px; }
.report-opcao-fluindo input:checked + span { background:#3A845A; border-color:#3A845A; color:#fff; }
.report-opcao-atencao input:checked + span { background:#E9C23B; border-color:#E9C23B; color:#1A1A1A; }
.report-opcao-critica input:checked + span { background:#C0433D; border-color:#C0433D; color:#fff; }
.report-rastreio { display:flex; gap:12px; flex-wrap:wrap; }
.report-rastreio > .report-campo { flex:1 1 220px; }
.report-combo-wrap { position:relative; }
.report-combo-wrap label { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#5D5D5D; }
.report-lista { display:none; position:absolute; left:0; right:0; top:100%; z-index:5; list-style:none; margin:4px 0 0; padding:4px; background:#fff; border:0.75pt solid #C6C4C4; border-radius:12px; box-shadow:0 10px 28px rgba(0,0,0,0.12); max-height:260px; overflow-y:auto; text-transform:none; letter-spacing:0; }
.report-opt { display:flex; flex-direction:column; gap:1px; padding:8px 10px; border-radius:8px; cursor:pointer; }
.report-opt.ativo, .report-opt:hover { background:#F1EFEF; }
.report-opt-nome { font-size:13px; font-weight:600; color:#1A1A1A; }
.report-opt-conselho { font-size:10.5px; font-weight:500; color:#807E7E; }
.report-lista-vazia { padding:10px; font-size:12px; color:#807E7E; font-weight:500; }
.report-contador { font-size:13px; font-weight:800; color:#1A1A1A; margin:2px 0 10px; }
.report-chips { margin-bottom:12px; }
.report-chip-grupo { margin-bottom:8px; }
.report-chip-conselho { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#9F9F9F; margin-bottom:5px; }
.report-chip { display:inline-flex; align-items:center; gap:6px; background:#FBEEEC; border:0.75pt solid #EBC6C0; color:#1A1A1A; border-radius:999px; padding:5px 6px 5px 12px; font-size:12px; font-weight:600; margin:0 6px 6px 0; }
.report-chip button { border:none; background:#C0433D; color:#fff; width:20px; height:20px; border-radius:50%; font-size:13px; line-height:1; cursor:pointer; }
.report-chip button:focus-visible { outline:2px solid #1A1A1A; outline-offset:1px; }
.report-btn-sec { font-family:'Inter',sans-serif; font-size:11.5px; font-weight:700; color:#1A1A1A; background:#fff; border:0.75pt solid #C6C4C4; border-radius:999px; padding:7px 14px; cursor:pointer; margin-bottom:14px; }
.report-btn-sec:hover { background:#F5F5F5; }
.report-acoes { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:24px; }
.report-status { font-size:12px; font-weight:700; color:#5D5D5D; }
.report-status.ok { color:#3A845A; }
.report-status.erro { color:#C0433D; }
.report-leitura { background:#fff; border:0.75pt solid #D8D5D5; border-radius:18px; padding:18px 20px; margin-bottom:16px; }
.report-atuais { list-style:none; padding:0; margin:0; }
.report-atuais li { display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; padding:8px 0; border-bottom:0.75pt solid #EEECEC; }
.report-atuais li:last-child { border-bottom:none; }
.report-atual-nome { font-size:13px; font-weight:700; color:#1A1A1A; }
.report-atual-conselho { font-size:11px; color:#807E7E; }
.report-atual-tempo { font-size:11px; font-weight:700; color:#C0433D; margin-left:auto; }
.report-grafico { margin-bottom:12px; background:#1A1A1A; border-radius:16px; padding:10px 12px; }
.report-hist-wrap { overflow-x:auto; }
.report-hist { width:100%; border-collapse:collapse; font-size:12px; }
.report-hist th { text-align:left; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#9F9F9F; padding:6px 8px; border-bottom:0.75pt solid #D8D5D5; }
.report-hist td { padding:8px; border-bottom:0.75pt solid #EEECEC; color:#1A1A1A; white-space:nowrap; }
.report-hist .num { text-align:right; }
.report-hist-linha { cursor:pointer; }
.report-hist-linha:hover, .report-hist-linha:focus { background:#F7F6F6; outline:none; }
.report-tag { font-size:9px; font-weight:800; color:#807E7E; background:#EEECEC; border-radius:999px; padding:2px 7px; margin-left:4px; }
.report-como { font-size:10.5px; font-weight:800; padding:3px 9px; border-radius:999px; }
.report-como-fluindo { background:#3A845A; color:#fff; }
.report-como-atencao { background:#E9C23B; color:#1A1A1A; }
.report-como-critica { background:#C0433D; color:#fff; }
.report-check { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:3px; background:#D8D5D5; }
.report-check-feito { background:#3A845A; }
.report-check-em_andamento { background:#E9C23B; }
.report-check-parado { background:#C0433D; }
@media (max-width:700px){ .report-health { width:100%; justify-content:space-between; } .report-atual-tempo { margin-left:0; } }

.advertencia-resumo.destaque .advertencia-resumo-label { color:#C0433D; font-weight:700; }

.agenda-nav-btn { width:32px; height:32px; border-radius:50%; border:0.75pt solid #D8D5D5; background:#fff; color:#1A1A1A; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
.agenda-nav-btn:hover { background:#F5F5F5; }
${AGENDA_CSS}

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
.farol-bloco { margin: 0 0 18px; }
.farol-titulo { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.farol-resumo { margin: 0 0 10px; color: #5d5d5d; font-size: 13px; }
.farol-linha { display: flex; gap: 12px; overflow-x: auto; padding: 4px 2px 8px; }
.farol-card { display: flex; align-items: flex-start; gap: 10px; min-width: 250px; max-width: 280px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.farol-card:focus-visible { outline: 2px solid #1d1d1b; outline-offset: 2px; }
.farol-lampada { width: 26px; height: 26px; border-radius: 50%; flex: 0 0 26px; margin-top: 2px; }
.farol-numero { font-size: 22px; font-weight: 700; min-width: 28px; line-height: 1.1; }
.farol-info { display: flex; flex-direction: column; gap: 2px; font-size: 12px; min-width: 0; }
.farol-data { color: #5d5d5d; }
.farol-nome { font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
.farol-cs, .farol-pend { color: #5d5d5d; }
.farol-acao { margin-top: 4px; color: #1d1d1b; font-weight: 600; }
.farol-encerrados { color: #777; font-size: 12px; margin: 8px 0 0; }

/* ===== Redesenho v3: início do CS ===== */
body{background:var(--bg);}
.topbar{background:transparent;border-bottom:0;position:static;justify-content:flex-end;padding:10px 28px 0;backdrop-filter:none;}
.topbar .brand{display:none;}
#screenInicio{display:none;}
#screenInicio .top h1,#screenInicio .crumb{color:var(--ink)}
#screenInicio .crumb{color:var(--ink3)}
#screenInicio h2,#screenInicio h3{color:var(--ink)}
#screenInicio .gh-escuro h2{color:#fff}
.pn{background:var(--surface);border:1px solid rgba(26,26,26,.06);border-radius:var(--r);box-shadow:0 1px 2px rgba(20,20,20,.04),0 6px 18px rgba(20,20,20,.03);text-align:left;}
.pn .ph h2{font-family:'Bricolage Grotesque',sans-serif;}
.mes{position:relative;overflow:hidden;border-radius:16px;background:linear-gradient(135deg,#141414,#1A1A1A 50%,#272727);color:#fff;display:grid;grid-template-columns:minmax(0,1.3fr) repeat(3,minmax(0,1fr));align-items:stretch;text-align:left}
.mes::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 8% -20%,rgba(200,154,46,.4),transparent 55%),radial-gradient(circle at 100% 120%,rgba(61,139,95,.3),transparent 55%)}
.mes > *{position:relative;padding:22px 24px}
.mes > * + *{border-left:1px solid rgba(255,255,255,.1)}
.mes-ey{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.mes h2{font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:700;line-height:1.25;margin:8px 0 0;letter-spacing:-0.01em;color:#fff}
.mes h2 em{font-style:normal;color:var(--gold)}
.mes-l{font-size:12px;color:#B5B2B2;font-weight:600}
.mes-n{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:34px;font-weight:700;line-height:1;margin:8px 0 6px}
.mes-n small{font-family:'Inter',sans-serif;font-size:13px;color:#9F9F9F;margin-left:3px}
.mes-f{font-size:12px;color:#B5B2B2}
.mes-prog{height:4px;border-radius:99px;background:rgba(255,255,255,.14);margin-top:10px;overflow:hidden}
.mes-prog span{display:block;height:100%;background:var(--gold)}
.mes .erro-secao{margin:18px;grid-column:1 / -1}
.in-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;align-items:start}
.in-col{display:flex;flex-direction:column;gap:22px;min-width:0}
.meta{padding:13px 18px;border-top:1px solid var(--line)}
.meta-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}
.meta-top b{font-size:13.5px;font-weight:600}
.meta-top span{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:16px}
.meta-top span small{font-family:'Inter',sans-serif;font-size:12px;font-weight:500;color:var(--ink3)}
.meta-dica{font-size:12px;color:var(--ink2);margin-top:7px}
.meta-dica.atras{color:var(--gold-ink);font-weight:600}
.carteira{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:0 18px 18px}
.cons{border:1px solid var(--line);border-radius:10px;padding:13px 14px;display:flex;flex-direction:column;gap:9px}
.cons:hover{border-color:var(--ink)}
.cons-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cons-top b{font-size:13.5px;font-weight:600}
.cons-l{display:flex;justify-content:space-between;font-size:12px;color:var(--ink2)}
.cons-l strong{color:var(--ink);font-weight:600}
.cons.alerta{border-color:#EBC6C0;background:#FFFCFB}
.in-vazio{padding:18px;font-size:13px;color:var(--ink2)}
.in-sk{display:block;height:14px;margin:12px 18px;border-radius:6px;background:linear-gradient(90deg,var(--line) 25%,#F6F5F5 50%,var(--line) 75%);background-size:200% 100%;animation:inbrilho 1.3s linear infinite}
@keyframes inbrilho{to{background-position:-200% 0}}
#screenInicio .work{padding-bottom:40px}
#screenInicio .gtdx-seletor{padding:0}
.perfil-vazio{max-width:520px;margin:60px auto;text-align:left}
.perfil-vazio .ico{width:44px;height:44px;border-radius:12px;background:var(--gold-soft);display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.perfil-vazio .ico svg{width:22px;height:22px;stroke:var(--gold-ink);fill:none;stroke-width:1.8}
@media (max-width:1100px){.mes{grid-template-columns:1fr 1fr}.mes > :first-child{grid-column:1 / -1}.mes > :nth-child(2){border-left:0}.mes > :nth-child(n+2){border-top:1px solid rgba(255,255,255,.1)}.in-grid{grid-template-columns:1fr}}
@media (max-width:560px){.mes > *{padding:18px}.mes > :nth-child(4){grid-column:1 / -1;border-left:0}.topbar{padding:8px 16px 0}}
@media (prefers-reduced-motion:reduce){.in-sk{animation:none}}

/* ===== Homes v4 (20/10/2026): gestor (gh-) e CS (ch-). Cores só na exceção; tokens do tema. ===== */
.gh-work{max-width:1312px;margin:0 auto;padding:0 24px 48px}
.gh-saud{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:30px 0 6px}
.gh-saud small{display:block;font-size:13px;font-weight:600;color:var(--ink3);margin-bottom:6px}
.gh-saud h1{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:44px;font-weight:700;letter-spacing:-0.035em;line-height:1.02}
.gh-saud h1 span{display:block;color:var(--ink3);font-size:30px;margin-top:8px;letter-spacing:-0.02em}
.gh-saud-r{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.gh-btn{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;color:var(--ink);background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:9px 16px;cursor:pointer;transition:border-color .15s}
.gh-btn:hover{border-color:var(--ink)}
.gh-btn.claro{background:#fff;color:var(--ink);border-color:#fff}
.gh-btn.vidro{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.22)}
.gh-btn.pri{background:var(--ink);color:#fff;border-color:var(--ink)}
.gh-periodo{display:flex;gap:8px}
.gh-bento{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;margin-top:18px}
.gh-w{background:var(--surface);border:1px solid rgba(26,26,26,.06);border-radius:22px;box-shadow:0 1px 2px rgba(20,20,20,.04),0 10px 30px rgba(20,20,20,.04);padding:20px;display:flex;flex-direction:column;gap:14px;min-width:0;text-align:left}
.gh-w-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.gh-w-t{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--ink2)}
.gh-w-t svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.gh-link{font-size:12px;font-weight:700;color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.gh-ajuda{font-size:11.5px;color:var(--ink3);line-height:1.5}
.gh-c4{grid-column:span 4}.gh-c5{grid-column:span 5}.gh-c6{grid-column:span 6}.gh-c7{grid-column:span 7}.gh-c8{grid-column:span 8}.gh-c12{grid-column:span 12}
.gh-tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;background:var(--line);color:var(--ink2)}
.gh-tag.red{background:var(--red-soft);color:var(--red-ink)}
.gh-tag.gold{background:var(--gold-soft);color:var(--gold-ink)}
.gh-tag.green{background:var(--green-soft);color:#2F6E4A}
.gh-sk{height:120px;border-radius:14px;background:linear-gradient(90deg,var(--line) 25%,#F6F5F5 50%,var(--line) 75%);background-size:200% 100%;animation:inbrilho 1.3s linear infinite}
.gh-erro{font-size:12.5px;color:var(--red-ink);background:var(--red-soft);border-radius:12px;padding:12px 14px}
.gh-vazio{font-size:12.5px;color:var(--ink2);padding:10px 0}
.gh-sw{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
.gh-sw.red{background:var(--red)}.gh-sw.gold{background:var(--gold)}.gh-sw.green{background:var(--green)}.gh-sw.blue{background:#3B6FD8}
.gh-legenda{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--ink3);margin-top:auto}
.gh-legenda span{display:inline-flex;align-items:center}
.gh-glass{background:rgba(255,255,255,.08);-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.gh-escuro{position:relative;overflow:hidden;background:linear-gradient(140deg,#141414 0%,#1C1C1C 45%,#262626 100%);color:#fff;border:0}
.gh-escuro::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 320px at 0% 0%,rgba(200,154,46,.42),transparent 60%),radial-gradient(460px 300px at 100% 100%,rgba(61,139,95,.32),transparent 60%)}
.gh-escuro > *{position:relative}
.gh-escuro .gh-w-t{color:var(--gold)}
.gh-escuro h2{color:#fff;margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:700;letter-spacing:-0.03em;line-height:1.12;max-width:660px}
.gh-escuro p{margin:8px 0 0;color:#CFCBCB;font-size:14px;max-width:620px}
.gh-escuro .gh-tag{background:rgba(255,255,255,.1);color:#fff}
.gh-mini-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.gh-mini{padding:13px 15px;display:flex;flex-direction:column;gap:4px}
.gh-mini span{font-size:11.5px;color:#B5B2B2;font-weight:600}
.gh-mini b{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em}
.gh-mini small{font-size:12px;color:#CFCBCB}
.gh-mini b.al{color:#F0B9B5}.gh-mini b.at{color:#EDCB7E}
.gh-acoes{display:flex;gap:10px;flex-wrap:wrap}
/* Time */
.gh-time-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 6px}
.gh-pessoa{display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 4px;border-radius:16px;text-align:center;transition:background .15s ease}
.gh-pessoa:hover{background:var(--bg)}
.gh-av{position:relative;width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;box-shadow:0 4px 12px rgba(20,20,20,.12);overflow:visible}
.gh-av img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.gh-ring{position:absolute;inset:-4px;border-radius:50%;pointer-events:none}
.gh-ring.red{box-shadow:0 0 0 2.5px var(--red)}
.gh-ring.gold{box-shadow:0 0 0 2.5px var(--gold)}
.gh-pessoa b{font-size:12.5px;font-weight:600;color:var(--ink)}
.gh-pessoa small{font-size:11px;color:var(--ink3);margin-top:-5px}
/* Indicadores com o M da marca */
.gh-grupo{display:flex;flex-direction:column;gap:10px}
.gh-grupo-lbl{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);display:flex;align-items:center;gap:10px}
.gh-grupo-lbl::after{content:"";flex:1;height:1px;background:var(--line)}
.gh-inds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gh-inds.gh-tres{grid-template-columns:repeat(3,minmax(0,1fr))}
.gh-ind{border-radius:18px;background:var(--bg);padding:16px;display:grid;grid-template-columns:52px minmax(0,1fr);gap:4px 14px;align-items:center}
.gh-ind > svg.gh-m{width:52px;height:52px;grid-row:span 2}
.gh-ind-top{display:flex;justify-content:space-between;align-items:center;gap:6px}
.gh-ind-top b{font-size:12.5px;font-weight:700}
.gh-ind-v{font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:700;letter-spacing:-0.025em;line-height:1}
.gh-ind-v small{font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:var(--ink3);margin-left:3px;letter-spacing:0}
.gh-ind-foot{grid-column:1 / -1;display:flex;flex-direction:column;gap:7px;margin-top:8px}
.gh-bar{position:relative;height:8px;border-radius:99px;background:#E3E1E1;overflow:visible}
.gh-bar > span{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--red)}
.gh-bar > span.gold{background:var(--gold)}
.gh-bar > span.green{background:var(--green)}
.gh-bar > i.pace{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink);border-radius:2px}
.gh-ind-txt{font-size:12px;color:var(--ink2);line-height:1.45}
.gh-ind-txt em{font-style:normal;color:var(--gold-ink);font-weight:600}
.gh-ind-txt strong{color:var(--red-ink);font-weight:600}
/* Pódio */
.gh-podio-w{position:relative;overflow:hidden;background:linear-gradient(160deg,#141414 0%,#1C1C1C 55%,#232323 100%);color:#fff;border:0}
.gh-podio-w::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(420px 260px at 50% 30%,rgba(200,154,46,.35),transparent 65%),radial-gradient(360px 220px at 100% 100%,rgba(61,139,95,.25),transparent 60%)}
.gh-podio-w > *{position:relative}
.gh-podio-w .gh-w-t{color:var(--gold)}
.gh-podio-w .gh-link{color:#CFCBCB}
.gh-podio{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:12px;align-items:end;padding-top:6px}
.gh-pod{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;color:#fff;animation:gh-sobe .7s var(--spring) both}
.gh-pod.p1{animation-delay:.15s}.gh-pod.p3{animation-delay:.08s}
@keyframes gh-sobe{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.gh-pod b{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.01em}
.gh-pod-dest{font-size:12px;color:#B5B2B2;line-height:1.35;min-height:32px;max-width:180px}
.gh-pod .gh-av{width:64px;height:64px;font-size:24px;box-shadow:0 0 0 3px rgba(255,255,255,.15),0 10px 24px rgba(0,0,0,.35);margin-bottom:4px}
.gh-pod.p1 .gh-av{width:84px;height:84px;font-size:32px;box-shadow:0 0 0 3px #C89A2E,0 0 0 8px rgba(200,154,46,.18),0 14px 34px rgba(0,0,0,.45)}
.gh-medalha{position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12px;font-weight:800;color:#1A1A1A;border:2px solid #1A1A1A}
.gh-medalha.ouro{background:linear-gradient(145deg,#F2D27A,#C89A2E)}
.gh-medalha.prata{background:linear-gradient(145deg,#F1F3F5,#AEB4BB)}
.gh-medalha.bronze{background:linear-gradient(145deg,#E3B48C,#A86F45)}
.gh-coroa{width:40px;height:24px;margin-bottom:-2px;filter:drop-shadow(0 4px 10px rgba(200,154,46,.5))}
.gh-degrau{width:100%;display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:12px;border-radius:16px 16px 6px 6px;background:rgba(255,255,255,.07);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);margin-top:6px}
.gh-pod.p2 .gh-degrau{height:88px}
.gh-pod.p3 .gh-degrau{height:68px}
.gh-pod.p1 .gh-degrau{height:118px;background:linear-gradient(180deg,rgba(200,154,46,.32),rgba(200,154,46,.08));border-color:rgba(200,154,46,.45)}
.gh-pod-n{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;font-weight:800;line-height:1}
.gh-pod.p1 .gh-pod-n{font-size:40px;color:#F2D27A}
.gh-degrau small{font-size:11.5px;color:#CFCBCB;font-weight:600}
.gh-pod-foot{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.gh-pod-foot .gh-tag{background:rgba(255,255,255,.1);color:#CFCBCB}
.gh-pod-foot .gh-tag.ouro{background:rgba(200,154,46,.18);color:#EDCB7E}
/* Cases e conselhos */
.gh-grande{font-family:'Bricolage Grotesque',sans-serif;font-size:36px;font-weight:700;letter-spacing:-0.03em;line-height:1}
.gh-grande small{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--ink3);margin-left:4px;letter-spacing:0}
.gh-case{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid var(--line);align-items:center}
.gh-case:first-of-type{border-top:0}
.gh-case .gh-av{width:34px;height:34px;font-size:13px;box-shadow:none}
.gh-case b{display:block;font-size:13.5px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
.gh-case small{font-size:12px;color:var(--ink2)}
.gh-rede{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.gh-rv{padding:14px;border-radius:16px;background:var(--bg)}
.gh-rv span{display:block;font-size:12px;color:var(--ink2);font-weight:600}
.gh-rv b{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.02em}
/* Home do CS */
.ch-foco-row{display:grid;grid-template-columns:auto repeat(3,minmax(0,1fr));gap:12px;align-items:stretch}
.ch-anel{display:flex;align-items:center;gap:12px;padding:12px 16px 12px 12px}
.ch-anel svg{width:56px;height:56px;flex:none}
.ch-anel b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:20px;line-height:1}
.ch-anel span{font-size:12px;color:#CFCBCB}
.ch-mini{padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.ch-mini span{font-size:11.5px;color:#B5B2B2;font-weight:600}
.ch-mini b{font-size:14px;font-weight:700}
.ch-mini b.alerta{color:#F0B9B5}
.ch-score{display:flex;align-items:center;gap:18px}
.ch-score svg{width:112px;height:112px;flex:none}
.ch-score-txt b{display:block;font-size:15px;font-weight:700;margin-bottom:4px}
.ch-score-txt span{display:block;font-size:12.5px;color:var(--ink2);line-height:1.6}
.ch-pts{margin-top:auto;padding-top:16px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.ch-cont{height:6px;border-radius:99px;background:#EDEBEB;overflow:hidden}
.ch-cont span{display:block;height:100%;background:var(--gold);border-radius:99px}
.ch-semana{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.ch-dia{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0 12px;border-radius:14px}
.ch-dia small{font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em}
.ch-dia b{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:700;line-height:1}
.ch-dia i{display:flex;gap:3px;height:6px}
.ch-dia i em{width:6px;height:6px;border-radius:50%;background:var(--ink)}
.ch-dia.hoje{background:var(--ink);color:#fff}
.ch-dia.hoje small{color:var(--gold)}
.ch-dia.fds{opacity:.5}
.ch-prox{display:flex;flex-direction:column;gap:8px}
.ch-ev{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--bg)}
.ch-ev small{font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase}
.ch-ev b{display:block;font-size:13.5px;font-weight:600}
.ch-meta{display:grid;grid-template-columns:96px minmax(0,1fr) 84px;gap:12px;align-items:center}
.ch-meta b{font-size:13px;font-weight:600}
.ch-meta span{font-size:12.5px;font-weight:700;text-align:right}
.ch-meta span small{font-weight:500;color:var(--ink3)}
.ch-meta.atras b,.ch-meta.atras span{color:var(--gold-ink)}
.ch-dica{margin-top:auto;font-size:12.5px;color:var(--gold-ink);background:var(--gold-soft);border-radius:12px;padding:10px 12px;line-height:1.45}
@media (max-width:1100px){
  .gh-c4,.gh-c5,.gh-c6,.gh-c7,.gh-c8{grid-column:span 6}
  .gh-c12{grid-column:span 12}
  .gh-inds{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gh-rede{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ch-foco-row{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:700px){
  .gh-work{padding:0 16px 40px}
  .gh-bento{grid-template-columns:1fr}
  .gh-c4,.gh-c5,.gh-c6,.gh-c7,.gh-c8,.gh-c12{grid-column:auto}
  .gh-saud h1{font-size:32px}
  .gh-saud h1 span{font-size:22px}
  .gh-escuro h2{font-size:24px}
  .gh-mini-row{grid-template-columns:1fr}
  .gh-inds,.gh-inds.gh-tres{grid-template-columns:1fr}
  .gh-time-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gh-podio{gap:6px}
  .gh-pod .gh-av{width:52px;height:52px}
  .gh-pod.p1 .gh-av{width:66px;height:66px}
  .gh-pod-dest{display:none}
  .ch-semana{gap:2px}
  .ch-meta{grid-template-columns:80px minmax(0,1fr) 70px}
}
@media (prefers-reduced-motion:reduce){.gh-pod{animation:none}}
</style>
</head>
<body>
${ICONES_SVG}
<!--DOCK-->
<div class="progress-bar" id="progressBar"><div class="progress-bar-fill"></div></div>
<div class="topbar">
  <div class="brand" onclick="showHome()"><img class="brand-logo" src="/logo/moai-logo-black.png" alt="MOAI"></div>
  <div class="topbar-right" id="topbarRight"></div>
</div>

<div id="screenInicio" class="screen">
  <div class="gh-work">
    <header class="gh-saud">
      <div>
        <small id="inData">&nbsp;</small>
        <h1 id="inSaudacao">Olá<span id="inFrase"></span></h1>
      </div>
      <div class="gh-saud-r">
        <span class="gh-tag" id="inPrazo"></span>
        <div id="inAcaoTopo"></div>
      </div>
    </header>
    <div class="gh-bento">
      <section class="gh-w gh-escuro gh-c8" id="inFoco" aria-labelledby="inFocoTit"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c4" id="inPontuacao" aria-labelledby="inPontTit"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c5" id="inMetas" aria-labelledby="h-metas"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c7" id="inSemana" aria-labelledby="inSemanaTit"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c5 pn" id="inTarefas" aria-labelledby="h-tar"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c7 pn" id="inCarteira" aria-labelledby="h-cart"><div class="gh-sk"></div></section>
    </div>
  </div>
</div>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><path id="gh-mglyph" d="M2 50V4h11l13 20 13-20h11v46H38V26L26 43 14 26v24Z"/></defs></svg>
<div id="screenHome" class="screen">
  <div class="gh-work">
    <header class="gh-saud">
      <div>
        <small id="ghData">&nbsp;</small>
        <h1 id="ghSaudacao">Olá<span id="ghFrase"></span></h1>
      </div>
      <div class="gh-saud-r">
        <div class="gh-periodo" id="ghPeriodo"></div>
        <button type="button" class="gh-btn" onclick="ghSincronizar()">Sincronizar agora</button>
      </div>
    </header>
    <div class="gh-bento">
      <section class="gh-w gh-escuro gh-c8" id="ghFoco" aria-labelledby="ghFocoTit"><div class="gh-sk"></div></section>
      <section class="gh-w gh-c4" aria-labelledby="ghTimeTit">
        <div class="gh-w-h"><span class="gh-w-t" id="ghTimeTit">Time de CS</span><a class="gh-link gh-link-periodo" href="/gestor?aba=visaoGeral#mapa-time">Mapa do time</a></div>
        <div id="ghTime"><div class="gh-sk"></div></div>
        <div class="gh-legenda" id="ghTimeLegenda"><span><i class="gh-sw red"></i>Em risco</span><span><i class="gh-sw gold"></i>Acompanhar</span><span>Número: pontuação do mês</span></div>
      </section>
      <section class="gh-w gh-c12" aria-labelledby="ghIndsTit">
        <div class="gh-w-h">
          <span class="gh-w-t" id="ghIndsTit">Indicadores da área</span>
          <span class="gh-ajuda" id="ghIndsAjuda">O M enche conforme a meta. O traço na barra marca onde o time deveria estar hoje.</span>
        </div>
        <div class="gh-grupo"><span class="gh-grupo-lbl">Crescimento, quanto mais, melhor</span><div class="gh-inds" id="ghCrescimento"><div class="gh-sk"></div></div></div>
        <div class="gh-grupo"><span class="gh-grupo-lbl" id="ghRetencaoLbl">Retenção, limite máximo do mês</span><div class="gh-inds gh-tres" id="ghRetencao"><div class="gh-sk"></div></div></div>
        <div id="ghChurnOrfao"></div>
        <div class="gh-ajuda" id="ghJanelaHistorico"></div>
      </section>
      <section class="gh-w gh-c12" aria-labelledby="ghAgendaTit">
        <div class="gh-w-h"><span class="gh-w-t" id="ghAgendaTit">Agenda da equipe</span></div>
        <div id="agendaHome"></div>
        <div class="gh-w-h" style="margin-top:4px"><div id="farolSemana" class="gh-ajuda" aria-live="polite"></div></div>
      </section>
      <section class="gh-w gh-podio-w gh-c7" aria-labelledby="ghPodioTit">
        <div class="gh-w-h"><span class="gh-w-t" id="ghPodioTit">Top 3 do mês</span><a class="gh-link gh-link-periodo" href="/gestor?aba=visaoGeral#mapa-time">Ranking completo</a></div>
        <div id="ghPodio"><div class="gh-sk"></div></div>
        <div id="ghPodioRodape"></div>
      </section>
      <section class="gh-w gh-c5" id="ghCasos" aria-labelledby="ghCasosTit">
        <div class="gh-w-h"><span class="gh-w-t" id="ghCasosTit">Cases de sucesso do time</span><a class="gh-link gh-link-periodo" href="/gestor?aba=visaoGeral">Visão da área</a></div>
        <div id="ghCases"><div class="gh-sk"></div></div>
      </section>
      <section class="gh-w gh-c12" aria-labelledby="ghRedeTit">
        <div class="gh-w-h"><span class="gh-w-t" id="ghRedeTit">Conselhos, visão consolidada</span><a class="gh-link" href="/gestor?aba=visaoGeral#rede-conselhos">Abrir conselhos</a></div>
        <div id="ghConselhos"><div class="gh-sk"></div></div>
      </section>
    </div>
  </div>
</div>

<div id="screenPessoa">
  <div class="jornada-hero">
    <div class="jornada-hero-inner">
      <div class="jornada-photo-wrap">
        <div class="jornada-photo skel" id="pessoaFotoSkel" style="display:none;"></div>
        <img class="jornada-photo" id="pessoaFoto" style="display:none;" alt="">
        <div class="jornada-photo-fallback" id="pessoaFotoFallback" style="display:none;"></div>
        <button class="jornada-photo-editar" id="pessoaFotoEditarBtn" type="button" onclick="abrirEditorFotoCS()" style="display:none;" title="Trocar foto" aria-label="Trocar foto">✎</button>
      </div>
      <div class="jornada-txt">
        <div class="jornada-nome" id="pessoaNome"></div>
        <div class="jornada-sub" id="pessoaSub"></div>
        <div class="jornada-meta" id="pessoaMeta"></div>
      </div>
      <div class="jornada-badge" id="pessoaBadgeDestaque">
        <div class="jornada-badge-img-wrap">
          <img src="/badges/cs-destaque.png" alt="">
          <div class="jornada-badge-count" id="pessoaBadgeCount"></div>
        </div>
        <div class="jornada-badge-label">CS Destaque</div>
      </div>
    </div>
  </div>
  <div class="pessoa-faixa">
    <section class="pend-bloco" aria-labelledby="pendTitulo">
      <div class="pend-cab"><h2 class="pend-titulo" id="pendTitulo">O que fazer agora</h2><span class="pend-sub" id="pendSub"></span></div>
      <div class="pend-lista" id="pendLista"><div class="pend-vazio">Carregando suas pendências…</div></div>
    </section>
  </div>
  <div class="tabs" role="tablist">
    <div class="tab active" role="tab" data-aba="aba-mes" onclick="showTab('aba-mes',event)">Meu mês</div>
    <div class="tab" role="tab" data-aba="aba-conselhos" onclick="showTab('aba-conselhos',event)">Conselhos e agenda</div>
    <div class="tab" role="tab" data-aba="aba-acompanhamento" onclick="showTab('aba-acompanhamento',event)">Acompanhamento<span class="tab-badge" id="tabBadgeAcomp" hidden></span></div>
    <div class="tab" role="tab" data-aba="aba-reconhecimento" onclick="showTab('aba-reconhecimento',event)">Reconhecimento</div>
  </div>
  <div class="pessoa-conteudo">
    <div id="aba-mes" class="panel active">
      <div class="rd-stack">
        <section id="mesResumo" aria-label="Resumo das metas do mês"></section>
        <div id="indicadores"></div>
        <div id="semanal"></div>
      </div>
    </div>
    <div id="aba-conselhos" class="panel">
      <div class="rd-stack">
        <div id="consAbertura"></div>
        <div id="consAtencao"></div>
        <section class="rd-card" aria-labelledby="agendaTit"><h2 id="agendaTit">Agenda</h2><p class="rd-sub">Os encontros da semana, com navegação por semana ou mês.</p><div id="agendaPessoa"></div></section>
        <section class="rd-card" id="consGradeCS" hidden aria-labelledby="gradeTit">
          <h2 id="gradeTit">Meus conselhos</h2>
          <div class="gc-ctl" id="consGradeCtl"></div>
          <div id="consGradeCorpo"></div>
        </section>
        <div id="conselhos"></div>
      </div>
    </div>
    <div id="aba-acompanhamento" class="panel">
      <div class="rd-stack">
        <div id="rdAbertura"></div>
        <div id="rdRitmo"></div>
        <div class="rd-grid rd-g2">
          <div id="report" class="rd-slot"></div>
          <div id="reportHist" class="rd-slot"></div>
        </div>
        <div class="rd-grid rd-g3">
          <div id="umaum" class="rd-slot"></div>
          <div id="advertencias" class="rd-slot"></div>
          <div id="rdRelatorios" class="rd-slot"></div>
        </div>
      </div>
    </div>
    <div id="aba-reconhecimento" class="panel">
      <div class="rd-stack">
        <div id="restritoExtras" style="display:none;">
          <div class="rd-pos">
            <div id="restritoPosicao"></div>
            <div id="restritoTop3"></div>
          </div>
        </div>
        <div id="feedbacks"></div>
      </div>
    </div>
  </div>
</div>

${RELATORIO_PAINEL_HTML}
<script>${DOCK_SCRIPT}</script>
<script>window.AGENDA_CFG = ${agendaConfigJson()};</script>
<script src="/agenda-cs.js"></script>
<script>
${GTD_CHECKLIST_SCRIPT}
${RELATORIO_SCRIPT}
${REDESENHO_CS_SCRIPT}
// Depois de salvar um relatório, a home recalcula o foco (o relatório pendente sai da frente) e a aba Acompanhamento relê o report.
window.rcAoSalvar_ = function () { if (typeof carregarInicio_ === 'function') carregarInicio_(); if (typeof currentCS !== 'undefined' && currentCS) carregarReport(currentCS); };
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
    // Só faz o parse se a resposta for JSON. Uma página HTML (redirect, 404 ou erro da plataforma) vira uma mensagem
    // orientadora, nunca o erro cru do JSON.parse.
    var tipo = res.headers.get('content-type') || '';
    if (tipo.indexOf('application/json') === -1) {
      throw new Error('o servidor respondeu sem dados (status ' + res.status + '). Recarregue a página e, se continuar, avise o time de dados');
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
var souNomeGestor = null;
var meuCSNome = null;
var modoRestritoCS = false;
var configRevelarIndicadoresTime = false;

function inicializarSessao(){
  var abaUrl = new URLSearchParams(window.location.search).get('aba');
  // fetchJSON_ manda 401 e 403 para o /login e lança o erro real dos demais (um 500 não vira "perfil não vinculado")
  fetchJSON_('/api/perfil')
    .then(function(perfil){
      souGestor = !!perfil.isGestor;
      souNomeGestor = perfil.nome || null;
      meuCSNome = perfil.csNome || null;
      modoRestritoCS = !souGestor;
      renderTopbar();
      // Gestor sem perfil de CS segue na home do time; quem tem perfil de CS (gestor ou não) abre o início do CS.
      if (souGestor && !meuCSNome) { iniciarHomeGestor(); return; }
      if (!meuCSNome) { mostrarPerfilNaoVinculado(); return; }
      // O Início não depende da configuração: começa já; só a página do CS (aberta por ?aba=) espera por ela.
      var configP = fetch('/api/config', { cache: 'no-store' }).then(function(r){ return r.json(); })
        .then(function(cfg){ configRevelarIndicadoresTime = !!cfg.revelarIndicadoresEquipe; })
        .catch(function(){});
      iniciarInicioCS();
      if (abaUrl && ABAS_CS_HOME_[abaUrl]) configP.then(function(){ abrirSecaoCS_(abaUrl, true); });
    })
    .catch(function(err){ mostrarErroPerfil_(err); });
}
function iniciarHomeGestor(){
  var agora = new Date(), h = agora.getHours();
  var dataTxt = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '');
  var diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  document.getElementById('ghData').textContent = dataTxt.charAt(0).toUpperCase() + dataTxt.slice(1) + ' · dia ' + agora.getDate() + ' de ' + diasNoMes + ' do mês';
  document.getElementById('ghSaudacao').firstChild.nodeValue = (h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite')) + (souNomeGestor ? ', ' + souNomeGestor : '') + '.';
  renderTopbar();
  carregarFotosTime();
  renderSkeletonEquipe();
  carregarEquipe(currentMes, currentAno);
  agendaMontar('agendaHome', {});
  carregarFarolSemana_();
}

// Parte A (25/09/2026): CS logado sem vínculo ainda em cs_usuarios — não existe "os próprios
// números" pra mostrar, então a home fica nesse estado vazio até o gestor vincular em Controle de
// Perfis (nenhuma chamada a /api/cs, /api/equipe ou /api/home-resumo acontece daqui).
function mostrarPerfilNaoVinculado(){
  document.querySelector('.topbar').style.display = 'none';
  document.getElementById('screenHome').style.display = 'block';
  document.getElementById('screenHome').innerHTML =
    '<div class="perfil-vazio"><div class="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></div>' +
    '<h2 style="font-family:Bricolage Grotesque,sans-serif;font-size:24px;color:var(--ink);margin-bottom:8px">Perfil ainda não vinculado</h2>' +
    '<p style="font-size:14px;line-height:1.6;color:var(--ink2)">Seu login ainda não está associado a um perfil de CS. Peça ao seu gestor para vincular o seu email em Controle de perfis. Assim que isso acontecer, o seu mês, as suas metas e a sua carteira aparecem aqui.</p></div>';
}
// Erro real ao carregar o perfil (por exemplo, um 500 do servidor): mostra a mensagem do erro, nunca o estado de perfil não vinculado.
function mostrarErroPerfil_(err){
  document.querySelector('.topbar').style.display = 'none';
  document.getElementById('screenHome').style.display = 'block';
  document.getElementById('screenHome').innerHTML =
    '<div class="perfil-vazio"><h2 style="font-family:Bricolage Grotesque,sans-serif;font-size:24px;color:var(--ink);margin-bottom:8px">Não foi possível carregar o seu perfil</h2>' +
    '<div class="erro-secao" role="alert" style="margin:12px 0">' + gtdEsc_(err && err.message ? err.message : err) + '</div>' +
    '<button class="btn" type="button" onclick="window.location.reload()">Tentar de novo</button></div>';
}

function renderTopbar(){
  var inicio = document.getElementById('screenInicio');
  var emInicio = !!inicio && inicio.style.display === 'block';
  var emHome = !emInicio && currentCS === null && document.getElementById('screenHome').style.display !== 'none';
  var isPessoa = currentCS !== null && !(modoRestritoCS || meuCSNome);
  var seletores = '<select class="pickmes" id="selMes" onchange="onFiltroChange()"></select>' +
    '<select class="pickmes" id="selAno" onchange="onFiltroChange()">' + anosOpcoesHtml('historico') + '</select>';
  document.getElementById('topbarRight').innerHTML = (emInicio || emHome) ? '' :
    ((isPessoa ? '<span class="back-link" onclick="showHome()">' + ICONS.arrowleft + 'Time</span>' : '') + seletores);
  document.getElementById('ghPeriodo').innerHTML = emHome ? seletores : '';
  document.querySelector('.topbar').style.display = (emInicio || emHome) ? 'none' : '';
  var selMes = document.getElementById('selMes');
  if (!selMes) return;
  var opt = document.createElement('option'); opt.textContent = 'Visão Geral'; selMes.appendChild(opt);
  MESES.forEach(function(m){ var o=document.createElement('option'); o.textContent=m; selMes.appendChild(o); });
  selMes.value = currentMes;
  document.getElementById('selAno').value = currentAno;
}

// O botão "Sincronizar agora" agora é o indicador de sincronização do dock (dockLigarSync em lib/ui/tema.ts).

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
    if (document.getElementById('aba-conselhos').classList.contains('active')) carregarGradeCS_();
  } else {
    carregarEquipe(currentMes, currentAno);
  }
}

// ============ Início do CS (redesenho v3) ============
// Três níveis: a faixa do mês (relance), tarefas, agenda e metas (o que fazer) e a carteira (detalhe).
// Nada é calculado aqui: pontuação, mediana, ritmo, falta por semana e pontos tomados vêm de
// /api/home-resumo (campo inicio); conselhos e GTD vêm de /api/cs/[nome]. O CS vê só a própria posição
// em relação à mediana, nunca a lista de colegas. Cada seção tem carregando, vazio e erro próprios.
var LIMIAR_PRESENCA_ATENCAO_ = ${LIMIAR_PRESENCA_ATENCAO};
var inCS_ = null;
var inOrdemCarteira_ = 'atencao';
var inGtdLista_ = [];

function inErro_(prefixo, err) {
  return '<div class="erro-secao" role="alert">' + gtdEsc_(prefixo) + ': ' + gtdEsc_(err && err.message ? err.message : err) + '</div>';
}
function inNum_(v) { return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
function inDM_(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
function inPrimeiroNome_(n) { return String(n || '').split(' ')[0]; }


function iniciarInicioCS() {
  document.getElementById('screenHome').style.display = 'none';
  document.getElementById('screenPessoa').style.display = 'none';
  document.getElementById('screenInicio').style.display = 'block';
  var agora = new Date(), h = agora.getHours();
  document.getElementById('inSaudacao').firstChild.nodeValue = (h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite')) + ', ' + inPrimeiroNome_(meuCSNome) + '.';
  var dataTxt = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '');
  document.getElementById('inData').textContent = dataTxt.charAt(0).toUpperCase() + dataTxt.slice(1);
  currentCS = null;
  renderTopbar();
  carregarInicio_();
}

function carregarInicio_() {
  var nome = encodeURIComponent(meuCSNome), per = '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno);
  fetchJSON_('/api/home-resumo' + per + '&so=inicio').then(function (d) {
    var ini = d.inicio || { dado: null, erro: 'Sem dados da home neste período.' };
    renderInCabecalho_(ini);
    renderInFoco_(ini);
    renderInPontuacao_(ini);
    renderInMetas_(ini);
    renderInSemana_(ini);
  }).catch(function (err) {
    ['inFoco', 'inPontuacao', 'inMetas', 'inSemana'].forEach(function (id) {
      document.getElementById(id).innerHTML = inErro_('Não foi possível carregar esta seção', err);
    });
  });
  fetchJSON_('/api/cs/' + nome + per).then(function (d) {
    inCS_ = d;
    try { renderInTarefas_(d); } catch (e) { document.getElementById('inTarefas').innerHTML = inErro_('Não foi possível montar as tarefas', e); }
    try { renderInCarteira_(); } catch (e2) { document.getElementById('inCarteira').innerHTML = inErro_('Não foi possível montar a carteira', e2); }
  }).catch(function (err) {
    document.getElementById('inTarefas').innerHTML = inErro_('Não foi possível carregar as tarefas', err);
    document.getElementById('inCarteira').innerHTML = inErro_('Não foi possível carregar a carteira', err);
  });
  fetchJSON_('/api/cs/' + nome + '/report').then(function (d) {
    var est = d.estado && d.estado.estado;
    var pendente = est === 'pendente' || est === 'atrasado';
    document.getElementById('inAcaoTopo').innerHTML = pendente
      ? '<a class="gh-btn pri" href="' + REPORT_MONDAY_URL_ + '" target="_blank" rel="noopener">Enviar report da semana</a>' : '';
    if (typeof dockDefinirBadge === 'function') dockDefinirBadge('report', pendente ? 1 : 0);
  }).catch(function () { /* o report não bloqueia a home: sem o selo, nada aparece */ });
}

function renderInCabecalho_(ini) {
  var d = ini.dado;
  var prazo = document.getElementById('inPrazo'), frase = document.getElementById('inFrase');
  if (!d) { prazo.textContent = ''; frase.textContent = ''; return; }
  var dias = d.periodo.diasRestantes;
  prazo.textContent = dias === null || dias === undefined ? '' : dias + (dias === 1 ? ' dia para fechar o mês' : ' dias para fechar o mês');
  frase.textContent = d.fraseSituacao ? ' ' + d.fraseSituacao : '';
}

// Foco de hoje: o título, a explicação e os números já vêm prontos de focoHoje (lib/home-regras.ts).
function renderInFoco_(ini) {
  var el = document.getElementById('inFoco');
  if (ini.erro || !ini.dado) { el.innerHTML = inErro_('Não foi possível montar o foco de hoje', ini.erro || 'sem dados'); return; }
  var f = ini.dado.focoHoje;
  var anel = '';
  if (f.anel && f.anel.total) {
    var circ = 2 * Math.PI * 22, frac = Math.min(1, f.anel.valor / f.anel.total);
    anel = '<div class="gh-glass ch-anel"><svg viewBox="0 0 56 56" role="img" aria-label="' + f.anel.valor + ' de ' + f.anel.total + ' confirmados">' +
      '<circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/>' +
      '<circle cx="28" cy="28" r="22" fill="none" stroke="#C89A2E" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (circ * frac).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 28 28)"/></svg>' +
      '<div><b>' + f.anel.valor + ' de ' + f.anel.total + '</b><span>confirmados</span></div></div>';
  }
  var minis = (f.numeros || []).map(function (n) {
    return '<div class="gh-glass ch-mini"><span>' + escHtml_(n.rotulo) + '</span><b' + (n.alerta ? ' class="alerta"' : '') + '>' + escHtml_(n.valor) + '</b></div>';
  }).join('');
  var linha = anel || minis ? '<div class="ch-foco-row">' + anel + minis + '</div>' : '';
  el.innerHTML = '<div class="gh-w-h"><span class="gh-w-t">Foco de hoje</span></div>' +
    '<div><h2>' + escHtml_(f.titulo) + '</h2><p>' + escHtml_(f.texto) + '</p></div>' + linha +
    (f.tipo === 'relatorio' && f.relatorio
      ? '<div class="gh-acoes"><button type="button" class="gh-btn claro" data-rc-abrir="1" data-rc-grupo="' + escHtml_(f.relatorio.groupId) + '" data-rc-data="' + escHtml_(f.relatorio.dataEncontro) + '">Preencher relatório</button>' +
        '<a class="gh-btn vidro" href="/conselho/' + encodeURIComponent(f.relatorio.groupId) + '#relatorios">Ver relatórios do conselho</a></div>'
      : '<div class="gh-acoes"><a class="gh-btn claro" href="/?aba=conselhos" data-aba-cs="conselhos">Abrir checklist do conselho</a>' +
        '<a class="gh-btn vidro" href="/?aba=conselhos" data-aba-cs="conselhos">Ver quem não confirmou</a></div>');
}

// Sua pontuação: anel com a mediana do time em dourado, a frase de simulação e os pontos tomados embutidos.
function renderInPontuacao_(ini) {
  var el = document.getElementById('inPontuacao');
  var cab = '<div class="gh-w-h"><span class="gh-w-t" id="inPontTit">Sua pontuação</span>';
  if (ini.erro || !ini.dado) { el.innerHTML = cab + '</div>' + inErro_('Não foi possível ler a pontuação', ini.erro || 'sem dados'); return; }
  var d = ini.dado, p = d.pontuacao, pt = d.pontosTomados;
  var nota = p.nota, med = p.mediana;
  var circ = 2 * Math.PI * 46;
  var arco = nota === null || nota === undefined ? '' : '<circle cx="56" cy="56" r="46" fill="none" stroke="#1A1A1A" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (circ * Math.min(100, nota) / 100).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 56 56)"/>';
  var marca = med === null || med === undefined ? '' : '<line x1="56" y1="4" x2="56" y2="18" stroke="#C89A2E" stroke-width="3" transform="rotate(' + (med / 100 * 360).toFixed(1) + ' 56 56)"/>';
  var svg = '<svg viewBox="0 0 112 112" role="img" aria-label="' + (nota === null ? 'Sem nota' : nota + ' de 100 pontos') + '">' +
    '<circle cx="56" cy="56" r="46" fill="none" stroke="#EDEBEB" stroke-width="10"/>' + arco + marca +
    '<text x="56" y="60" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="' + (nota === null ? 12 : 30) + '" fill="#1A1A1A">' + (nota === null ? 'Sem nota' : nota) + '</text>' +
    '<text x="56" y="78" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="11" fill="#878585">de 100</text></svg>';
  var cont = p.contraMediana === 'acima' ? 'Acima da mediana do time' : (p.contraMediana === 'abaixo' ? 'Abaixo da mediana do time' : (p.contraMediana === 'na' ? 'Na mediana do time' : 'Sem comparação ainda'));
  var linhaMed = med === null || med === undefined ? '' : 'Mediana ' + med + ', marcada em dourado.';
  var sim = p.simulacao ? '<br>' + p.simulacao.unidades + ' a mais levam você a ' + p.simulacao.patamar + '.' : '';
  var txt = '<div class="ch-score-txt"><b>' + cont + '</b><span>' + escHtml_(linhaMed) + sim + '</span></div>';
  var delta = p.variacaoPontos ? '<span class="gh-tag ' + (p.variacaoPontos > 0 ? 'green' : 'red') + '">' + (p.variacaoPontos > 0 ? '▲ ' : '▼ ') + Math.abs(p.variacaoPontos) + '</span>' : '';
  var limite = LIMIAR_ADVERTENCIA_DESTAQUE_;
  var pts = '';
  if (!pt) pts = '<div class="ch-pts">' + inErro_('Não foi possível ler os pontos tomados', { message: 'sem dados' }) + '</div>';
  else {
    var ativos = pt.ativos;
    pts = '<div class="ch-pts"><div class="gh-w-h"><span class="gh-w-t">Pontos tomados</span>' +
      '<span class="gh-tag ' + (ativos > limite ? 'gold' : '') + '">' + ativos + (ativos === 1 ? ' ponto ativo' : ' pontos ativos') + (ativos > limite ? ', acima do limite de ' + limite : '') + '</span></div>' +
      '<div class="ch-cont" aria-hidden="true"><span style="width:' + Math.min(100, ativos / limite * 100).toFixed(0) + '%"></span></div>' +
      '<span class="gh-ajuda">' + (pt.proximoVencimento ? 'Próximo vence em ' + inDM_(pt.proximoVencimento) + '.' : 'Nenhum ponto a vencer.') + '</span></div>';
  }
  el.innerHTML = cab + delta + '</div><div class="ch-score">' + svg + txt + '</div>' + pts;
}

// Ritmo do mês: metas com barra e traço do esperado até hoje, e a dica do atraso. Sem meta não aparece como zero.
function renderInMetas_(ini) {
  var el = document.getElementById('inMetas');
  var cab = '<div class="gh-w-h"><span class="gh-w-t" id="h-metas">Ritmo de ' + escHtml_(String(currentMes).toLowerCase()) + '</span><a class="gh-link" href="/?aba=indicadores" data-aba-cs="indicadores">Detalhar</a></div>';
  if (ini.erro || !ini.dado) { el.innerHTML = cab + inErro_('Não foi possível carregar as metas', ini.erro || 'sem dados'); return; }
  var d = ini.dado;
  var linhas = d.metas.filter(function (m) { return m.status !== 'sem_meta'; }).map(function (m) {
    var pct = m.meta ? Math.min((m.realizado || 0) / m.meta * 100, 100) : 0;
    var pace = m.meta && m.previsto !== null && m.previsto !== undefined ? Math.min(m.previsto / m.meta * 100, 100) : null;
    var atras = m.status === 'atras' || m.status === 'atencao';
    return '<div class="ch-meta' + (m.status === 'atras' ? ' atras' : '') + '"><b>' + escHtml_(m.label) + '</b>' +
      '<div class="gh-bar"><span class="' + (atras ? 'gold' : 'green') + '" style="width:' + pct.toFixed(0) + '%"></span>' + (pace !== null ? '<i class="pace" style="left:' + pace.toFixed(0) + '%"></i>' : '') + '</div>' +
      '<span>' + inNum_(m.realizado || 0) + '<small>/' + inNum_(m.meta) + '</small></span></div>';
  }).join('');
  var dica = d.dica ? '<div class="ch-dica">' + escHtml_(d.dica) + '</div>' : '';
  el.innerHTML = cab + (linhas || '<div class="gh-vazio">Nenhuma meta cadastrada para este mês. Fale com seu gestor para cadastrar as metas.</div>') + dica;
}

// Sua semana: sete dias a partir da segunda, com a marca de cada conselho e do prazo do report, e os próximos compromissos.
function renderInSemana_(ini) {
  var el = document.getElementById('inSemana');
  var cab = '<div class="gh-w-h"><span class="gh-w-t" id="inSemanaTit">Sua semana</span><a class="gh-link" href="/?aba=agenda" data-aba-cs="agenda">Agenda completa</a></div>';
  if (ini.erro || !ini.dado || !ini.dado.semana) { el.innerHTML = cab + inErro_('Não foi possível montar a semana', ini.erro || 'sem dados'); return; }
  var s = ini.dado.semana;
  var faixa = '<div class="ch-semana" aria-hidden="true">' + s.dias.map(function (x) {
    var marcas = '';
    for (var i = 0; i < Math.min(x.marcas, 3); i++) marcas += '<em></em>';
    return '<div class="ch-dia' + (x.hoje ? ' hoje' : '') + (x.fimDeSemana ? ' fds' : '') + '"><small>' + x.rotulo + '</small><b>' + x.dia + '</b><i>' + marcas + '</i></div>';
  }).join('') + '</div>';
  var prox = s.proximos.length
    ? '<div class="ch-prox">' + s.proximos.map(function (p) {
      var aba = p.tipo === 'report' ? 'report' : 'agenda';
      return '<a class="ch-ev" href="/?aba=' + aba + '" data-aba-cs="' + aba + '"><small>' + escHtml_(p.rotulo) + '</small><span><b>' + escHtml_(p.titulo) + '</b></span></a>';
    }).join('') + '</div>'
    : '<div class="gh-vazio">Nenhum compromisso marcado nos próximos dias.</div>';
  el.innerHTML = cab + faixa + prox;
}

// Tarefas do GTD: o componente único de lib/gtd-checklist.ts, um conselho por vez, o que mais pede atenção primeiro.
function renderInTarefas_(d) {
  var el = document.getElementById('inTarefas');
  var lista = (d.conselhos || []).filter(function (c) { return c.gtd; });
  lista.sort(function (a, b) {
    return (b.gtd.etapasAtrasadas || []).length - (a.gtd.etapasAtrasadas || []).length || (a.gtd.taxa === null ? 101 : a.gtd.taxa) - (b.gtd.taxa === null ? 101 : b.gtd.taxa);
  });
  inGtdLista_ = lista;
  var atrasadas = lista.reduce(function (s, c) { return s + (c.gtd.etapasAtrasadas || []).length; }, 0);
  var cab = '<div class="ph"><div><h2 id="h-tar">Tarefas do GTD</h2><p>Das etapas dos seus conselhos, do que mais pede atenção para o que menos pede.</p></div>' + (atrasadas ? '<span class="count">' + atrasadas + '</span>' : '') + '</div>';
  if (!lista.length) { el.innerHTML = cab + '<div class="in-vazio">Nenhum ciclo de GTD em aberto para os seus conselhos. Quando um conselho entrar na agenda, as etapas aparecem aqui.</div>'; return; }
  var opcoes = lista.map(function (c, i) {
    return '<option value="' + i + '">' + gtdEsc_(nomeCurtoConselho_(c)) + (c.gtd.etapasAtrasadas && c.gtd.etapasAtrasadas.length ? ' (' + c.gtd.etapasAtrasadas.length + ' atrasadas)' : '') + '</option>';
  }).join('');
  el.innerHTML = cab + '<div class="pb"><div class="gtdx-seletor"><label for="inGtdSel">Conselho</label><select id="inGtdSel">' + opcoes + '</select></div><div id="inGtdCorpo">' + gtdCicloHtml_(lista[0].gtd) + '</div></div>';
  document.getElementById('inGtdSel').addEventListener('change', function (ev) {
    document.getElementById('inGtdCorpo').innerHTML = gtdCicloHtml_(inGtdLista_[Number(ev.target.value)].gtd);
  });
}

// Minha carteira: um cartão por conselho, ordenado por atenção, próximo encontro ou produto.
function inCartoes_() {
  var lista = (inCS_ && inCS_.conselhos) || [];
  return lista.map(function (c) {
    var atrasadas = c.gtd && c.gtd.etapasAtrasadas ? c.gtd.etapasAtrasadas.length : 0;
    var pres = c.registros ? Math.round(c.presente / c.registros * 100) : null;
    var cor = atrasadas > 0 ? 'red' : (pres !== null && pres < LIMIAR_PRESENCA_ATENCAO_ ? 'gold' : 'green');
    var nivel = parseConselhoNome(c.nome).nivel || '';
    return { c: c, atrasadas: atrasadas, pres: pres, cor: cor, nivel: nivel, ord: cor === 'red' ? 0 : (cor === 'gold' ? 1 : 2), prox: c.proximaData && c.proximaDataEhFutura ? String(c.proximaData) : '9999' };
  });
}
function renderInCarteira_() {
  var el = document.getElementById('inCarteira');
  var cards = inCartoes_();
  var cab = function (n, seg) { return '<div class="ph"><div><h2 id="h-cart">Minha carteira</h2><p>' + n + (n === 1 ? ' conselho' : ' conselhos') + ', ' + (inOrdemCarteira_ === 'atencao' ? 'os que pedem atenção primeiro.' : (inOrdemCarteira_ === 'proximo' ? 'pelo próximo encontro.' : 'por produto.')) + '</p></div>' + seg + '</div>'; };
  if (!cards.length) { el.innerHTML = cab(0, '') + '<div class="in-vazio">Nenhum conselho na sua carteira neste período.</div>'; return; }
  var ord = cards.slice();
  if (inOrdemCarteira_ === 'proximo') ord.sort(function (a, b) { return a.prox < b.prox ? -1 : (a.prox > b.prox ? 1 : 0); });
  else if (inOrdemCarteira_ === 'produto') ord.sort(function (a, b) { return a.nivel.localeCompare(b.nivel, 'pt-BR'); });
  else ord.sort(function (a, b) { return a.ord - b.ord || (a.pres === null ? 101 : a.pres) - (b.pres === null ? 101 : b.pres); });
  var seg = '<div class="r"><div class="seg" id="inSegCarteira">' + [['atencao', 'Atenção'], ['proximo', 'Próximo encontro'], ['produto', 'Produto']].map(function (o) {
    return '<button type="button" data-ordem="' + o[0] + '"' + (inOrdemCarteira_ === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>';
  }).join('') + '</div></div>';
  var visiveis = ord.slice(0, 5);
  var html = visiveis.map(function (x) {
    var c = x.c, f = c.proximaData && c.proximaDataEhFutura ? formatarDataConselho(c.proximaData) : null;
    var gtd = c.gtd ? c.gtd.feitas + ' de ' + c.gtd.total : 'sem ciclo';
    return '<a class="cons' + (x.cor === 'red' ? ' alerta' : '') + '" href="/conselho/' + encodeURIComponent(c.groupId) + '?mes=' + encodeURIComponent(currentMes) + '&ano=' + currentAno + '">'
      + '<div class="cons-top"><b>' + gtdEsc_(nomeCurtoConselho_(c)) + '</b><span class="dot ' + x.cor + '"></span></div>'
      + '<div class="cons-l"><span>Presença</span><strong>' + (x.pres === null ? 'sem registro' : x.pres + '%') + '</strong></div>'
      + '<div class="cons-l"><span>GTD</span><strong' + (x.atrasadas ? ' style="color:var(--red)"' : '') + '>' + gtdEsc_(gtd) + '</strong></div>'
      + '<div class="cons-l"><span>Próximo</span><strong>' + (f ? f.dia + '/' + String(new Date(c.proximaData).getMonth() + 1).padStart(2, '0') : 'sem data') + '</strong></div></a>';
  }).join('');
  if (ord.length > 5) html += '<a class="cons" href="/?aba=conselhos" data-aba-cs="conselhos" style="justify-content:center;align-items:center;color:var(--ink2);font-weight:600;border-style:dashed">Mais ' + (ord.length - 5) + ' conselhos &rarr;</a>';
  el.innerHTML = cab(ord.length, seg) + '<div class="carteira">' + html + '</div>';
  document.getElementById('inSegCarteira').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-ordem]');
    if (!b) return;
    inOrdemCarteira_ = b.getAttribute('data-ordem');
    renderInCarteira_();
  });
}

// ---------- navegação do dock para o CS: ?aba= abre a seção certa sem recarregar ----------
// inicio mostra a home v3; as demais chaves abrem a página do próprio CS na aba e no bloco correspondentes.
var ABAS_CS_HOME_ = {
  agenda: { aba: 'aba-conselhos', alvo: 'agendaPessoa', dock: 'agenda' },
  conselhos: { aba: 'aba-conselhos', alvo: 'conselhos', dock: 'meus-conselhos' },
  indicadores: { aba: 'aba-mes', alvo: 'indicadores', dock: 'indicadores' },
  advertencias: { aba: 'aba-acompanhamento', alvo: 'advertencias', dock: 'pontos' },
  report: { aba: 'aba-acompanhamento', alvo: 'report', dock: 'report' }
};
function abrirSecaoCS_(chave, semUrl) {
  if (!meuCSNome) return;
  var cfg = ABAS_CS_HOME_[chave];
  if (!cfg) {
    document.getElementById('screenPessoa').style.display = 'none';
    document.getElementById('screenInicio').style.display = 'block';
    currentCS = null; renderTopbar();
    if (typeof dockMarcarAtivo === 'function') dockMarcarAtivo('inicio');
  } else {
    document.getElementById('screenInicio').style.display = 'none';
    if (currentCS !== meuCSNome) abrirPessoa(meuCSNome);
    else document.getElementById('screenPessoa').style.display = 'block';
    showTab(cfg.aba);
    var alvo = document.getElementById(cfg.alvo);
    if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof dockMarcarAtivo === 'function') dockMarcarAtivo(cfg.dock);
  }
  if (!semUrl) {
    try { var u = new URL(window.location.href); if (cfg) u.searchParams.set('aba', chave); else u.searchParams.delete('aba'); window.history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { /* a seção abre do mesmo jeito */ }
  }
  window.scrollTo(0, 0);
}
document.addEventListener('click', function (ev) {
  var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
  if (!a || !meuCSNome || !document.getElementById('screenInicio')) return;
  var u;
  try { u = new URL(a.href); } catch (e) { return; }
  if (u.origin !== window.location.origin || u.pathname !== '/') return;
  var chave = u.searchParams.get('aba');
  if (chave && !ABAS_CS_HOME_[chave]) return;
  ev.preventDefault();
  abrirSecaoCS_(chave || null);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
});

renderTopbar();
dockLigarSync(function(){ if (meuCSNome && document.getElementById('screenInicio').style.display === 'block') carregarInicio_(); });
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
  agendaMontar('agendaPessoa', { csNome: nome });
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
  umAUmVisao_ = null; advertenciasCarregadas_ = false; reportEstadoAtual_ = null;
  renderPendencias();
  document.getElementById('umaum').innerHTML = rdMsgCartao_('1:1 com a liderança', 'Carregando', 'Buscando o histórico da 1:1.', false);
  carregarUmAUm(nome);
  document.getElementById('advertencias').innerHTML = rdMsgCartao_('Pontos tomados', 'Carregando', 'Buscando os pontos de advertência.', false);
  carregarAdvertencias(nome);
  reportDados_ = null;
  renderAcompanhamentoTopo_();
  document.getElementById('reportHist').innerHTML = rdMsgCartao_('Críticos ao longo do tempo', 'Carregando', 'Buscando o histórico de críticos.', false);
  carregarReport(nome);
}
function atualizarBadgeDestaque(nome){
  google.script.run.withSuccessHandler(function(vezes){
    if (currentCS !== nome) return;
    var elBadge = document.getElementById('pessoaBadgeDestaque');
    if (vezes > 0) { document.getElementById('pessoaBadgeCount').textContent = vezes; elBadge.style.display = 'flex'; }
    else { elBadge.style.display = 'none'; }
  }).withFailureHandler(function(){}).getVezesDestaquePublico(nome);
}

function skelKpi(){ return '<div class="kpi skel"><div style="height:100%;"></div></div>'; }
function renderSkeletonPessoa(){
  document.getElementById('pessoaFoto').style.display='none';
  document.getElementById('pessoaFotoFallback').style.display='none';
  document.getElementById('pessoaFotoSkel').style.display='block';
  document.getElementById('pessoaNome').textContent = currentCS;
  document.getElementById('pessoaSub').textContent = 'Customer Success';
  document.getElementById('pessoaMeta').textContent = 'Carregando ' + currentMes + '/' + currentAno + '...';
  document.getElementById('mesResumo').innerHTML = '<div class="skel" style="height:150px;border-radius:24px;"></div>';
  document.getElementById('consAbertura').innerHTML = '<div class="skel" style="height:150px;border-radius:24px;"></div>';
  document.getElementById('consAtencao').innerHTML = '';
  document.getElementById('indicadores').innerHTML = '<div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div><div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div><div class="grid3">'+skelKpi()+skelKpi()+skelKpi()+'</div>';
  document.getElementById('semanal').innerHTML = '<div class="chart-card skel" style="height:180px;"></div><div class="week-grid">'+Array(4).fill('<div class="week-card skel" style="height:90px;"></div>').join('')+'</div>';
  document.getElementById('conselhos').innerHTML = '<div class="council-grid">'+Array(3).fill('<div class="council-card skel" style="height:150px;"></div>').join('')+'</div>';
  document.getElementById('feedbacks').innerHTML = '<div class="votos-bar-card skel" style="height:120px;"></div><div class="quote-block skel" style="height:60px;"></div>';
}

function ghFmt_(n){ return n === null || n === undefined ? 'Sem dado' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
function ghSincronizar(){ var b = document.getElementById('dockSync'); if (b) b.click(); }
var GH_TOM_ = { nenhum_ainda: 'red', acelerar: 'red', quase_no_ritmo: 'gold', no_ritmo: 'green' };
var GH_HEX_ = { red: '#C0433D', gold: '#C89A2E', green: '#3D8B5F', neutro: '#6E6E6E' };
var ghClipN_ = 0;
var GH_SECOES_ = ['ghFoco', 'ghTime', 'ghCrescimento', 'ghRetencao', 'ghPodio', 'ghCases', 'ghConselhos'];
function renderSkeletonEquipe(){
  GH_SECOES_.forEach(function (id) { document.getElementById(id).innerHTML = '<div class="gh-sk"></div>'; });
}
function ghErroTudo_(msg){
  GH_SECOES_.forEach(function (id) { document.getElementById(id).innerHTML = '<div class="gh-erro" role="alert">' + escHtml_(msg) + '</div>'; });
}
function carregarFotosTime(){
  if (cacheFotos) return;
  pendingInc();
  fetchJSON_('/api/equipe-fotos').then(function (equipe) {
    pendingDec();
    cacheFotos = equipe;
    var atual = cacheEquipe[chaveE(currentMes, currentAno)];
    if (atual && currentCS === null) renderEquipeSecao_('ghTime', function () { renderGhTime_(atual.homeGestor || {}); });
  }).catch(function () { pendingDec(); });
}
function carregarEquipe(mes, ano){
  var chave = chaveE(mes, ano);
  if (cacheEquipe[chave]) renderEquipe(cacheEquipe[chave]); else renderSkeletonEquipe();
  pendingInc();
  fetchJSON_('/api/equipe?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(function (data) {
    pendingDec();
    cacheEquipe[chave] = data;
    if (currentCS === null && currentMes === mes && currentAno === ano) renderEquipe(data);
  }).catch(function (err) {
    pendingDec();
    ghErroTudo_(err.message);
  });
}
// Home do gestor: cada bloco vem pronto de /api/equipe (campo homeGestor). Aqui só se desenha.
function renderEquipe(data){
  modoGeralAtual = !!data.periodo.geral;
  var h = data.homeGestor || {};
  if (h.erro) { ghErroTudo_(h.erro); return; }
  var fechado = h.fechado || null;
  document.getElementById('ghFrase').textContent = fechado ? ' ' + fechado.saudacao : (h.resumo ? ' ' + h.resumo.saudacao : '');
  ghAjustarTextosFechado_(!!fechado);
  ghLinksDoPeriodo_();
  renderEquipeSecao_('ghFoco', function () { renderGhFoco_(data, h); });
  renderEquipeSecao_('ghTime', function () { renderGhTime_(h); });
  renderEquipeSecao_('ghCrescimento', function () { renderGhCrescimento_(h); });
  renderEquipeSecao_('ghRetencao', function () { renderGhRetencao_(h); });
  renderEquipeSecao_('ghPodio', function () { renderGhPodio_(h); });
  renderEquipeSecao_('ghCases', function () { renderGhCases_(h); });
  renderEquipeSecao_('ghConselhos', function () { renderGhConselhos_(h); });
  document.getElementById('ghChurnOrfao').innerHTML = renderChurnOrfao(data.churnOrfao);
  document.getElementById('ghJanelaHistorico').innerHTML = (modoGeralAtual || fechado) ? '' : renderLegendaJanelaHistorico();
  animarMFills(document.getElementById('ghCrescimento'));
  animarMFills(document.getElementById('ghRetencao'));
}
// Mês fechado sem metas (30/10/2026): a home mostra como o mês fechou, comparado ao anterior, sem falar em
// ritmo, meta ou pontuação. Os textos fixos que explicam meta e ritmo trocam junto, e voltam no mês com metas.
var GH_TEXTOS_PADRAO_ = null;
function ghAjustarTextosFechado_(fechado){
  var ids = ['ghTimeLegenda', 'ghIndsAjuda', 'ghRetencaoLbl'];
  if (!GH_TEXTOS_PADRAO_) { GH_TEXTOS_PADRAO_ = {}; ids.forEach(function (id) { var e = document.getElementById(id); if (e) GH_TEXTOS_PADRAO_[id] = e.innerHTML; }); }
  var alt = {
    ghTimeLegenda: '<span>Sob a foto: churns e cases do CS no mês</span>',
    ghIndsAjuda: 'Mês fechado sem metas cadastradas. Cada número vem comparado ao mês anterior.',
    ghRetencaoLbl: 'Retenção, quanto menos, melhor',
  };
  ids.forEach(function (id) { var e = document.getElementById(id); if (e) e.innerHTML = fechado ? alt[id] : GH_TEXTOS_PADRAO_[id]; });
}
// Os atalhos da home abrem a Visão da área no mesmo mês e ano escolhidos aqui.
function ghLinksDoPeriodo_(){
  document.querySelectorAll('a.gh-link-periodo, a.gh-btn-periodo').forEach(function (a) {
    var base = a.getAttribute('data-base') || a.getAttribute('href');
    a.setAttribute('data-base', base);
    var partes = base.split('#');
    var sep = partes[0].indexOf('?') >= 0 ? '&' : '?';
    a.setAttribute('href', partes[0] + sep + 'mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno) + (partes[1] ? '#' + partes[1] : ''));
  });
}
function ghReceitaTexto_(rc){
  if (!rc.total) return 'Nenhum churn no mês';
  if (rc.semValor >= rc.total) return 'Receita perdida sem apuração: produto não informado';
  return 'Receita perdida aprox. R$ ' + ghFmt_(rc.valor) + (rc.semValor ? ', sem ' + rc.semValor + ' sem produto' : '');
}
function ghLinhaFechadoHtml_(l){
  var piorou = l.variacao !== null && l.variacao !== 0 && ((l.variacao > 0) === l.menorMelhor);
  var tag = l.variacao === null || l.variacao === 0 ? '' : '<span class="gh-tag ' + (piorou ? 'red' : 'green') + '">' + (l.variacao > 0 ? '▲ ' : '▼ ') + Math.abs(l.variacao) + '</span>';
  var ref = Math.max(l.valor, l.anterior || 0);
  var frac = ref > 0 ? l.valor / ref : 0;
  return '<div class="gh-ind">' + ghM_(piorou ? 'red' : 'neutro', frac, 'ghClip' + (++ghClipN_)) +
    '<div class="gh-ind-top"><b>' + escHtml_(l.label) + '</b>' + tag + '</div>' +
    '<div class="gh-ind-v">' + ghFmt_(l.valor) + '<small>no mês</small></div>' +
    '<div class="gh-ind-foot"><span class="gh-ind-txt">' + escHtml_(l.texto || 'Sem mês anterior para comparar') + '</span></div></div>';
}
function renderGhFocoFechado_(data, f){
  var el = document.getElementById('ghFoco');
  var churn = f.retencao.filter(function (x) { return x.chave === 'churn'; })[0];
  var cases = f.crescimento.filter(function (x) { return x.chave === 'casesSucesso'; })[0];
  var up = f.crescimento.filter(function (x) { return x.chave === 'upsell'; })[0];
  var down = f.retencao.filter(function (x) { return x.chave === 'downsell'; })[0];
  var churnPiorou = churn.variacao !== null && churn.variacao > 0;
  el.innerHTML = '<div class="gh-w-h"><span class="gh-w-t">' + escHtml_(data.periodo.mes) + ' fechado</span><span class="gh-tag">Mês encerrado</span></div>' +
    '<div><h2 id="ghFocoTit">' + escHtml_(f.frase) + '</h2><p>' + escHtml_(f.apoio) + '</p></div>' +
    '<div class="gh-mini-row">' +
      '<div class="gh-glass gh-mini"><span>Churn no mês</span><b class="' + (churnPiorou ? 'at' : '') + '">' + ghFmt_(churn.valor) + '</b><small>' + escHtml_(ghReceitaTexto_(f.receita)) + '</small></div>' +
      '<div class="gh-glass gh-mini"><span>Cases de sucesso</span><b>' + ghFmt_(cases.valor) + '</b><small>' + escHtml_(cases.texto) + '</small></div>' +
      '<div class="gh-glass gh-mini"><span>Upsell e downsell</span><b>' + ghFmt_(up.valor) + ' e ' + ghFmt_(down.valor) + '</b><small>' + escHtml_(up.texto ? 'Upsell ' + up.texto : '') + '</small></div>' +
    '</div>' +
    '<div class="gh-acoes"><a class="gh-btn claro gh-btn-periodo" href="/gestor?aba=visaoGeral#mapa-time">Ver o mapa do mês</a><a class="gh-btn vidro" href="#ghCasos">Ver cases do mês</a></div>';
  ghLinksDoPeriodo_();
}
function renderGhFoco_(data, h){
  var el = document.getElementById('ghFoco');
  if (h.fechado) { renderGhFocoFechado_(data, h.fechado); return; }
  if (!h.resumo) {
    el.innerHTML = '<div class="gh-w-h"><span class="gh-w-t">Visão Geral</span></div><div><h2>Acumulado do ano</h2><p>Escolha um mês no topo para ver o que está no ritmo.</p></div>';
    return;
  }
  var r = h.resumo, p = h.periodo;
  var pct = p.diasNoMes ? Math.round(p.diasDecorridos / p.diasNoMes * 100) : 0;
  var churn = r.retencao.filter(function (x) { return x.chave === 'churn'; })[0];
  var crit = r.retencao.filter(function (x) { return x.chave === 'healthDaBase'; })[0];
  var metasCls = r.metasNoRitmo < r.totalMetas ? 'al' : '';
  var churnVal = churn ? ghFmt_(churn.projecao !== null ? churn.projecao : churn.realizado) + ' de ' + ghFmt_(churn.limite) : 'Sem dado';
  var churnCls = churn && churn.status === 'atencao' ? 'at' : '';
  var churnLbl = churn && churn.projecao !== null ? 'Churn projetado no mês' : 'Churn no mês';
  var critVal = crit ? ghFmt_(crit.realizado) + ' de ' + ghFmt_(crit.limite) : 'Sem dado';
  var critCls = crit && crit.status !== 'sob_controle' ? 'at' : '';
  var critSmall = crit && crit.percentualBase !== null && crit.percentualBase !== undefined ? ghFmt_(crit.percentualBase) + '% de ' + ghFmt_(crit.membrosTotal) + ' membros' : '';
  el.innerHTML = '<div class="gh-w-h"><span class="gh-w-t">' + escHtml_(data.periodo.mes) + ' até aqui</span><span class="gh-tag">' + pct + '% do mês corrido</span></div>' +
    '<div><h2 id="ghFocoTit">' + escHtml_(r.frase) + '</h2><p>' + escHtml_(r.apoio) + '</p></div>' +
    '<div class="gh-mini-row">' +
      '<div class="gh-glass gh-mini"><span>Metas de crescimento no ritmo</span><b class="' + metasCls + '">' + r.metasNoRitmo + ' de ' + r.totalMetas + '</b><small>Dia ' + p.diasDecorridos + ' de ' + p.diasNoMes + ' do mês</small></div>' +
      '<div class="gh-glass gh-mini"><span>' + churnLbl + '</span><b class="' + churnCls + '">' + churnVal + '</b><small>' + (churn ? ghFmt_(churn.realizado) + ' até hoje, limite ' + ghFmt_(churn.limite) : '') + '</small></div>' +
      '<div class="gh-glass gh-mini"><span>Membros críticos</span><b class="' + critCls + '">' + critVal + '</b><small>' + escHtml_(critSmall) + '</small></div>' +
    '</div>' +
    '<div class="gh-acoes"><a class="gh-btn claro" href="/gestor?aba=visaoGeral">Abrir a fila de ação</a><a class="gh-btn vidro" href="#ghCasos">Ver cases do mês</a></div>';
}
function ghRotuloPessoa_(p){
  if (p.realizado) return p.realizado.churn + (p.realizado.churn === 1 ? ' churn' : ' churns') + ' · ' + p.realizado.casesSucesso + (p.realizado.casesSucesso === 1 ? ' case' : ' cases');
  return p.score === null || p.score === undefined ? 'sem dados' : String(p.score);
}
function renderGhTime_(h){
  var el = document.getElementById('ghTime');
  var lista = h.time || [];
  if (!lista.length) { el.innerHTML = '<div class="gh-vazio">Nenhum CS ativo neste período.</div>'; return; }
  el.innerHTML = '<div class="gh-time-grid">' + lista.map(function (p) {
    var foto = p.fotoUrl || (cacheFotos ? (cacheFotos.filter(function (x) { return x.nome === p.nome; })[0] || {}).fotoUrl : null);
    var anel = p.faixa === 'em_risco' ? ' red' : (p.faixa === 'acompanhar' ? ' gold' : '');
    var miolo = foto ? '<img src="' + escHtml_(foto) + '" alt="">' : escHtml_(iniciais(p.nome));
    var fundo = foto ? '' : ' style="background:' + corPara(p.nomeCompleto || p.nome) + '"';
    return '<a class="gh-pessoa" href="/gestor/cs/' + encodeURIComponent(p.nome) + '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno) + '">' +
      '<span class="gh-av"' + fundo + '>' + miolo + (anel ? '<i class="gh-ring' + anel + '"></i>' : '') + '</span>' +
      '<b>' + escHtml_(p.nome) + '</b><small>' + escHtml_(ghRotuloPessoa_(p)) + '</small></a>';
  }).join('') + '</div>';
}
function ghM_(tom, frac, id){
  return '<svg class="gh-m" viewBox="0 0 52 52" aria-hidden="true"><use href="#gh-mglyph" fill="#E3E1E1"/><clipPath id="' + id + '"><rect x="0" y="' + (52 - 52 * frac).toFixed(1) + '" width="52" height="' + (52 * frac).toFixed(1) + '"/></clipPath><use href="#gh-mglyph" fill="' + GH_HEX_[tom] + '" clip-path="url(#' + id + ')"/></svg>';
}
function renderGhCrescimento_(h){
  var el = document.getElementById('ghCrescimento');
  if (h.fechado) { el.innerHTML = h.fechado.crescimento.map(ghLinhaFechadoHtml_).join(''); return; }
  if (!h.resumo) { el.innerHTML = '<div class="gh-vazio">Escolha um mês para ver as metas de crescimento.</div>'; return; }
  var rec = h.recordes || {};
  var html = h.resumo.crescimento.map(function (l) {
    var tom = GH_TOM_[l.status];
    var frac = l.meta > 0 ? Math.min(1, l.realizado / l.meta) : 0;
    var pace = l.meta > 0 ? Math.min(100, l.esperado / l.meta * 100) : 0;
    var r = rec[l.chave];
    var recordeTxt = r && r.recordeValor !== null && r.recordeValor !== undefined ? 'Recorde: ' + ghFmt_(r.recordeValor) + (r.recordeMes ? ' em ' + formatarMesAbrevAno(r.recordeMes) : '') : '';
    var txt = tom === 'red' ? '<strong>' + escHtml_(l.textoDeficit) + '</strong>' : (tom === 'gold' ? '<em>' + escHtml_(l.textoDeficit) + '</em>' : escHtml_(l.textoDeficit));
    return '<div class="gh-ind">' + ghM_(tom, frac, 'ghClip' + (++ghClipN_)) +
      '<div class="gh-ind-top"><b>' + escHtml_(l.label) + '</b><span class="gh-tag ' + tom + '">' + escHtml_(l.rotuloStatus) + '</span></div>' +
      '<div class="gh-ind-v">' + ghFmt_(l.realizado) + '<small>de ' + ghFmt_(l.meta) + '</small></div>' +
      '<div class="gh-ind-foot"><div class="gh-bar"><span class="' + (tom === 'green' ? 'green' : (tom === 'gold' ? 'gold' : '')) + '" style="width:' + (frac * 100).toFixed(0) + '%"></span><i class="pace" style="left:' + pace.toFixed(1) + '%"></i></div>' +
      '<span class="gh-ind-txt">' + txt + (recordeTxt ? '<br>' + escHtml_(recordeTxt) : '') + '</span></div></div>';
  }).join('');
  el.innerHTML = html || '<div class="gh-vazio">Nenhuma meta de crescimento cadastrada para este mês.</div>';
}
function renderGhRetencao_(h){
  var el = document.getElementById('ghRetencao');
  if (h.fechado) { el.innerHTML = h.fechado.retencao.map(ghLinhaFechadoHtml_).join(''); return; }
  if (!h.resumo) { el.innerHTML = '<div class="gh-vazio">Escolha um mês para ver a retenção.</div>'; return; }
  var fracMes = h.periodo.diasNoMes ? Math.min(100, h.periodo.diasDecorridos / h.periodo.diasNoMes * 100) : 0;
  el.innerHTML = h.resumo.retencao.map(function (l) {
    var tom = l.status === 'sob_controle' ? 'green' : 'gold';
    var moeda = l.chave === 'revenueChurn' ? 'R$ ' : '';
    var frac = l.limite > 0 ? Math.min(1, l.realizado / l.limite) : 0;
    var rodape = l.chave === 'healthDaBase' && l.percentualBase !== null && l.percentualBase !== undefined
      ? ghFmt_(l.percentualBase) + '% da base de ' + ghFmt_(l.membrosTotal) + ' membros'
      : l.textoProjecao;
    return '<div class="gh-ind">' + ghM_(tom, frac, 'ghClip' + (++ghClipN_)) +
      '<div class="gh-ind-top"><b>' + escHtml_(l.label) + '</b><span class="gh-tag ' + tom + '">' + escHtml_(l.rotuloStatus) + '</span></div>' +
      '<div class="gh-ind-v">' + moeda + ghFmt_(l.realizado) + '<small>de ' + moeda + ghFmt_(l.limite) + ' no limite</small></div>' +
      '<div class="gh-ind-foot"><div class="gh-bar"><span class="' + tom + '" style="width:' + (frac * 100).toFixed(0) + '%"></span><i class="pace" style="left:' + fracMes.toFixed(1) + '%"></i></div>' +
      '<span class="gh-ind-txt">' + escHtml_(rodape) + '</span></div></div>';
  }).join('') || '<div class="gh-vazio">Nenhum indicador de retenção com limite cadastrado.</div>';
}
function renderGhPodio_(h){
  var el = document.getElementById('ghPodio'), rod = document.getElementById('ghPodioRodape');
  var p = (h.podio && h.podio.pessoas) || [];
  if (!p.length) { el.innerHTML = '<div class="gh-vazio">' + (h.fechado ? 'Sem metas cadastradas neste mês, então não há ranking.' : 'Sem CS com dados suficientes para o ranking deste período.') + '</div>'; rod.innerHTML = ''; return; }
  var ordem = [{ i: 1, cls: 'p2', med: 'prata', n: 2 }, { i: 0, cls: 'p1', med: 'ouro', n: 1 }, { i: 2, cls: 'p3', med: 'bronze', n: 3 }];
  el.innerHTML = '<div class="gh-podio">' + ordem.filter(function (o) { return p[o.i]; }).map(function (o) {
    var x = p[o.i];
    var miolo = x.fotoUrl ? '<img src="' + escHtml_(x.fotoUrl) + '" alt="">' : escHtml_(iniciais(x.nomeCompleto || x.nome));
    var fundo = x.fotoUrl ? '' : ' style="background:' + corPara(x.nomeCompleto || x.nome) + '"';
    var v = x.variacaoPontos;
    var varTxt = v === null || v === undefined ? '' : (v > 0 ? '▲ ' + v + ' no mês' : (v < 0 ? '▼ ' + Math.abs(v) + ' no mês' : 'estável no mês'));
    var coroa = o.cls === 'p1' ? '<svg class="gh-coroa" viewBox="0 0 40 24" aria-hidden="true"><path d="M3 21h34l2-16-10 7-9-10-9 10L1 5l2 16Z" fill="#C89A2E"/></svg>' : '';
    return '<a class="gh-pod ' + o.cls + '" href="/gestor/cs/' + encodeURIComponent(x.nome) + '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno) + '">' + coroa +
      '<span class="gh-av"' + fundo + '>' + miolo + '<i class="gh-medalha ' + o.med + '">' + o.n + '</i></span>' +
      '<b>' + escHtml_(x.nome) + '</b><span class="gh-pod-dest">' + escHtml_(x.frase || '') + '</span>' +
      '<span class="gh-degrau"><span class="gh-pod-n">' + escHtml_(x.score) + '</span><small>' + escHtml_(varTxt) + '</small></span></a>';
  }).join('') + '</div>';
  var tags = [];
  if (h.podio.maiorAlta) tags.push('<span class="gh-tag ouro">▲ Maior alta: ' + escHtml_(h.podio.maiorAlta.nome) + ', ' + h.podio.maiorAlta.pontos + (h.podio.maiorAlta.pontos === 1 ? ' ponto' : ' pontos') + '</span>');
  if (h.podio.distanciaPrimeiroQuarto !== null && h.podio.distanciaPrimeiroQuarto !== undefined) tags.push('<span class="gh-tag">Distância do 1º para o 4º: ' + h.podio.distanciaPrimeiroQuarto + ' pontos</span>');
  rod.innerHTML = tags.length ? '<div class="gh-pod-foot">' + tags.join('') + '</div>' : '';
}
function renderGhCases_(h){
  var el = document.getElementById('ghCases');
  var c = h.cases || { total: 0, recentes: [] };
  var html = '<div class="gh-w-h"><span class="gh-grande">' + c.total + '<small>no período</small></span></div>';
  if (!c.recentes.length) html += '<div class="gh-vazio">Nenhum case de sucesso registrado neste período.</div>';
  else html += c.recentes.map(function (x) {
    return '<div class="gh-case"><span class="gh-av" style="background:' + corPara(x.cs) + '">' + escHtml_(iniciais(x.cs)) + '</span>' +
      '<span><b>' + escHtml_(x.nome) + '</b><small>' + escHtml_(x.cs) + (x.produto ? ' · ' + escHtml_(x.produto) : '') + '</small></span></div>';
  }).join('');
  el.innerHTML = html;
}
function renderGhConselhos_(h){
  var el = document.getElementById('ghConselhos');
  var c = h.conselhos;
  if (!c) { el.innerHTML = '<div class="gh-vazio">Sem dados de conselhos neste período.</div>'; return; }
  var rv = function (rotulo, valor, cls) { return '<div class="gh-rv"><span>' + escHtml_(rotulo) + '</span><b class="' + (cls || '') + '">' + escHtml_(valor) + '</b></div>'; };
  el.innerHTML = '<div class="gh-rede">' +
    rv('Conselhos ativos', ghFmt_(c.ativos)) +
    rv('Membros', ghFmt_(c.membros)) +
    rv('Presença acumulada', c.presencaAcumulada === null ? 'Sem dado' : c.presencaAcumulada + '%') +
    rv('Abaixo de ' + c.limiteAbaixo + '% de presença', ghFmt_(c.abaixoDoLimite), c.abaixoDoLimite ? 'gold' : '') +
  '</div>';
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
      document.getElementById('consAbertura').innerHTML = ''; document.getElementById('consAtencao').innerHTML = ''; document.getElementById('mesResumo').innerHTML = '';
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
      document.getElementById('consAbertura').innerHTML = ''; document.getElementById('consAtencao').innerHTML = ''; document.getElementById('mesResumo').innerHTML = '';
    }
  });
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
  if (ind.statusReport === 'sem_report') return 'Sem report';
  if (ind.semApuracao) return 'Sem apuração';
  if (ind.alcancado===null||ind.alcancado===undefined) return 'Sem dado';
  if (ind.composicao && ind.unidade === '%') return ind.alcancado.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + '%';
  return unidade==='R$' ? 'R$ '+ind.alcancado.toLocaleString('pt-BR') : rdNum_(ind.alcancado);
}
function kpiCard(label, ind, unidade, timeInd, blurTime, recorde, idDom){
  var c = calcIndicador(ind);
  if (ind.statusReport === 'sem_report') { c.pctLabel = 'Sem report'; c.pillLabel = 'Sem report'; }
  else if (ind.semApuracao) { c.pctLabel = 'Sem apuração'; c.pillLabel = 'Sem apuração'; }
  else if (ind.statusReport === 'desatualizado') { c.pillLabel = 'Desatualizado'; c.pill = 'py'; }
  if (ind.composicao) recorde = null;
  var valorMostrado = valorKpiTexto_(ind, unidade);
  var metaMostrada = (ind.meta===null||ind.meta===undefined) ? 'sem meta' : rdNum_(ind.meta);
  var fonteHtml = ind.fonte ? '<span class="kpi-fonte'+(ind.fonte==='manual'?' manual':'')+'"><span class="kpi-fonte-dot"></span>'+(ind.fonte==='manual'?'Validado no Monday':'Calculado automático')+'</span>' : '';
  var subLabel = modoGeralAtual ? c.pctLabel : (ind.meta==null ? '' : 'meta '+metaMostrada+' · ') + c.pctLabel;
  var timeHtml = '';
  if (timeInd) {
    var valorTime = valorKpiTexto_(timeInd, unidade);
    if (timeInd.alcancado !== null && timeInd.alcancado !== undefined) timeHtml = '<div class="kpi-time-linha'+(blurTime?' kpi-blur':'')+'">Time: <span class="kpi-time-valor">'+valorTime+'</span></div>';
  }
  // Selo de recorde (Parte G, 29/09/2026): só quando o indicador está batendo o recorde efetivo
  // dos meses fechados (ou o manual, se melhor) — recorde_efetivo/metas_time_mensal no banco.
  var recordeBadge = (recorde && recorde.emRecorde) ? '<span class="kpi-recorde-badge">Recorde</span>' : '';
  var recordeLinha = (recorde && recorde.recordeValor !== null && recorde.recordeValor !== undefined)
    ? '<div class="kpi-recorde-linha">recorde '+rdNum_(recorde.recordeValor)+' em '+formatarMesAbrevAno(recorde.recordeMes)+'</div>' : '';
  // Tooltip: composição por CS (nome, críticos, carteira, percentual), do maior percentual para o menor, quando
  // o indicador traz detalheCS; senão, a composição resumida. Dentro desta template literal o separador de linha é &#10;.
  var tooltipCard = (ind.detalheCS && ind.detalheCS.length)
    ? ind.detalheCS.slice().sort(function(a,b){ return b.percentual - a.percentual; }).map(function(c){
        return c.nome+': '+c.criticos+' de '+c.carteira+' ('+c.percentual.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })+'%)';
      }).join('&#10;')
    : String(ind.composicao||'');
  var composicaoAttr = tooltipCard ? ' title="'+tooltipCard.replace(/"/g,'&quot;')+'" aria-label="'+label+': '+tooltipCard.replace(/"/g,'&quot;')+'"' : '';
  // Terceira linha, no lugar do recorde: sem valor, a observação do indicador; com cobertura incompleta, a cobertura;
  // com percentual da base, '7,0% da base de 256 membros' na cor neutra da segunda linha.
  var semValor = ind.statusReport === 'sem_report' || ind.alcancado===null || ind.alcancado===undefined;
  var terceiraLinha = (semValor && ind.observacaoSemValor) ? '<div class="kpi-sub">'+ind.observacaoSemValor+'</div>'
    : ind.cobertura ? '<div class="kpi-cobertura">'+ind.cobertura+'</div>'
    : (ind.percentualBase!==null && ind.percentualBase!==undefined) ? '<div class="kpi-sub">'+ind.percentualBase.toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })+'% da base de '+ind.membrosTotal+' membros</div>'
    : recordeLinha;
  return '<div class="kpi"'+(idDom?' id="'+idDom+'"':'')+composicaoAttr+'><div class="kpi-top"><div class="kpi-label-wrap"><div class="kpi-label">'+label+'</div>'+fonteHtml+'</div><span class="kpi-pill '+c.pill+'">'+c.pillLabel+'</span>'+recordeBadge+'</div>' +
    '<div class="kpi-body"><div class="m-fill-wrap"><div class="m-fill-liquid '+c.cor+'" style="height:0%;" data-target="'+c.pct+'"></div></div>' +
    '<div class="kpi-value-block"><div class="kpi-realizado num '+c.corTxt+'">'+valorMostrado+'</div><div class="kpi-sub">'+subLabel+'</div>'+timeHtml+terceiraLinha+'</div></div>'+barraMeta_(ind, c)+'</div>';
}
// Barra do cartão com o traço do esperado até hoje (ritmo linear do mês, só para meta de mínimo no mês corrente).
function esperadoPct_(ind){
  var p = periodoMes_;
  if (!p || p.geral || ind.tipoMeta !== 'min' || !(ind.meta > 0)) return null;
  var hj = new Date();
  if (String(p.mes) !== MESES[hj.getMonth()] || Number(p.ano) !== hj.getFullYear()) return null;
  return Math.round(hj.getDate() / new Date(hj.getFullYear(), hj.getMonth() + 1, 0).getDate() * 100);
}
function barraMeta_(ind, c){
  if (modoGeralAtual || ind.meta === null || ind.meta === undefined || ind.alcancado === null || ind.alcancado === undefined || ind.semApuracao) return '';
  var esp = esperadoPct_(ind);
  return '<div class="rd-mb" role="img" aria-label="'+c.pctLabel+(esp === null ? '' : ', esperado até hoje '+esp+'% da meta')+'"><i class="'+c.cor+'" style="width:'+c.pct+'%"></i>'+(esp === null ? '' : '<u style="left:'+esp+'%" title="Esperado até hoje"></u>')+'</div>';
}
var periodoMes_ = null;
function animarMFills(scopeEl){
  (scopeEl||document).querySelectorAll('.m-fill-liquid[data-target]').forEach(function(el, i){
    var target = el.getAttribute('data-target');
    setTimeout(function(){ el.style.height = target + '%'; }, 60 + i*40);
  });
}

function lineChart(pontos, corLinha, dim){
  corLinha = corLinha || '#6ee7b7';
  if (pontos.length < 2) return '<div style="color:#807E7E;font-size:11.5px;padding:20px 0;">Poucos pontos pra desenhar uma linha ainda.</div>';
  var w = dim ? dim.w : 720, h = dim ? dim.h : 130, pad = 20;
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
  return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:'+(dim ? 'auto' : '130px')+';overflow:visible;">' +
    '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+corLinha+'" stop-opacity="0.25"/><stop offset="100%" stop-color="'+corLinha+'" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="'+areaD+'" fill="url(#'+gradId+')"/><path d="'+pathD+'" fill="none" stroke="'+corLinha+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' + dots + labels + '</svg>';
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
  var nCons = (data.conselhos || []).length;
  document.getElementById('pessoaSub').textContent = 'Customer Success · Conselho ' + data.cs.apelidoConselho + ' · ' + nCons + (nCons === 1 ? ' conselho' : ' conselhos') + ' na carteira';
  var periodoTxt = data.periodo.geral ? 'Visão Geral · ' + data.periodo.ano : data.periodo.mes + '/' + data.periodo.ano;
  document.getElementById('pessoaMeta').textContent = periodoTxt + ' · dados de ' + new Date(data.periodo.geradoEm).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });


}
// ============ página do CS: leitura de relance (13/10/2026) ============
// Duas peças acima das abas. "O que fazer agora" junta, por urgência, o que hoje estava espalhado em
// quatro abas (report, 1:1, GTD dos conselhos, confirmações e pontos). "Resumo do mês" troca os quatro
// cartões de texto por uma única leitura: quantas metas estão no alvo e quais precisam de atenção.
// Nada é recalculado aqui: tudo vem dos payloads que a página já carrega.
var umAUmVisao_ = null;
var advertenciasCarregadas_ = false;
var reportEstadoAtual_ = null;
var PEND_VISIVEIS_ = 5;
var pendExpandida_ = false;
var INDICADORES_MES_ = [
  { k:'churn', l:'Churn', rec:'churn' }, { k:'revenueChurn', l:'Revenue Churn', rec:'revenue_churn', u:'R$' },
  { k:'casesSucesso', l:'Cases de Sucesso', rec:'cases' }, { k:'matchmakings', l:'Matchmakings', rec:'matchmakings' },
  { k:'rounds', l:'Rounds', rec:'rounds' }, { k:'indicacoes', l:'Indicações', rec:'indicacoes' },
  { k:'healthDaBase', l:'Críticos', rec:'health_base' }, { k:'upsell', l:'Upsell', rec:'upsell' }, { k:'downsell', l:'Downsell', rec:'downsell' }
];
function hojeIsoLocal_(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function diasEntreIso_(a, b){ return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
function nomeCurtoConselho_(c){ return parseConselhoNome(c.nome).contato || c.nome; }

function coletarPendencias_(){
  var itens = [];
  var hoje = hojeIsoLocal_();
  var data = currentCS ? cachePessoa[chaveP(currentCS, currentMes, currentAno)] : null;
  var proprio = currentCS === meuCSNome;
  // Report da semana (prazo sexta às 19h) e semana anterior não enviada.
  var r = reportEstadoAtual_;
  if (r && r.estado) {
    if (r.estado.estado === 'atrasado') itens.push({ g:0, ord:0, titulo:'Report desta semana atrasado', det:'Atrasado há ' + fmtHorasR_(r.estado.horas_atraso) + '. O Health da Base fica sem apuração até o envio.', acao:'<a class="pend-acao" href="' + REPORT_MONDAY_URL_ + '" target="_blank" rel="noopener">Enviar no Monday</a>' });
    else if (r.estado.estado === 'pendente') itens.push({ g:1, ord:0, titulo:'Enviar o report da semana', det:'Prazo: sexta até 19h, no board de report do Monday.', acao:'<a class="pend-acao" href="' + REPORT_MONDAY_URL_ + '" target="_blank" rel="noopener">Abrir no Monday</a>' });
  }
  if (r && r.relatoriosPendentes) r.relatoriosPendentes.forEach(function(x){
    var atras = x.estado === 'atrasado';
    var quando = atras
      ? (x.diasRestantes >= 0 ? 'O prazo venceu hoje.' : 'Atrasado há ' + (-x.diasRestantes) + (x.diasRestantes === -1 ? ' dia.' : ' dias.'))
      : (x.estado === 'vence_hoje' ? 'O prazo vence hoje, às 23h59.' : 'Vence em ' + x.diasRestantes + (x.diasRestantes === 1 ? ' dia.' : ' dias.'));
    itens.push({ g: atras || x.diasRestantes <= 2 ? 0 : 1, ord:1.5 + x.diasRestantes / 1000, cons:1, conselho:x.conselho, mot:'Relatório do encontro de ' + dataCurtaR_(x.dataEncontro) + ' por preencher', titulo:'Relatório do conselho ' + x.conselho, det:'Encontro de ' + dataCurtaR_(x.dataEncontro) + '. ' + quando,
      acao:'<button type="button" class="pend-acao" data-rc-abrir="1" data-rc-grupo="' + escHtml_(x.groupId) + '" data-rc-data="' + escHtml_(x.dataEncontro) + '">Preencher</button>' });
  });
  if (r && r.regularidade) {
    var anterior = somarDiasR_(r.semana, -7);
    var regAnt = r.regularidade.filter(function(x){ return String(x.semana_inicio).slice(0,10) === anterior; })[0];
    if (regAnt && regAnt.estado === 'atrasado') itens.push({ g:0, ord:1, titulo:'Report da semana passada não enviado', det:rotuloSemanaR_(anterior) + '.', acao:'<a class="pend-acao" href="' + REPORT_MONDAY_URL_ + '" target="_blank" rel="noopener">Enviar no Monday</a>' });
  }
  // Etapas do GTD atrasadas nos ciclos abertos e conselhos dos próximos 7 dias com poucos confirmados.
  if (data && data.conselhos) {
    data.conselhos.forEach(function(c, i){
      var nome = nomeCurtoConselho_(c);
      if (c.gtd && c.gtd.atual && c.gtd.etapasAtrasadas && c.gtd.etapasAtrasadas.length) {
        var n = c.gtd.etapasAtrasadas.length;
        itens.push({ g:0, ord:2, cons:1, conselho:nome, mot:n + (n === 1 ? ' etapa do GTD atrasada' : ' etapas do GTD atrasadas'), titulo:'GTD de ' + nome + ': ' + n + (n === 1 ? ' etapa atrasada' : ' etapas atrasadas'),
          det:c.gtd.etapasAtrasadas.slice(0,2).map(function(e){ return String(e).replace(/^\\s*D\\s*[+\\-]\\s*\\d+\\s*/i, ''); }).join(' · ') + (n > 2 ? ' · e mais ' + (n-2) : ''),
          acao:'<button type="button" class="pend-acao" onclick="abrirConselhoModal(' + i + ')">Ver etapas</button>' });
      }
      if (c.proximaData && c.proximaDataEhFutura && !c.congelado) {
        var dias = diasEntreIso_(hoje, String(c.proximaData).slice(0,10));
        var qtd = c.confirmadosFuturos ? c.confirmadosFuturos.length : 0;
        var faixa = semaforoConfirmados_(qtd).chave;
        if (dias >= 0 && dias <= 7 && (faixa === 'vermelho' || faixa === 'laranja')) {
          var f = formatarDataConselho(c.proximaData);
          itens.push({ g: dias <= 2 ? 0 : 1, ord:3 + dias / 10, cons:1, conselho:nome, mot:'Poucos confirmados para o próximo encontro', titulo:'Confirmar presença no conselho ' + nome,
            det:(f ? f.texto + ' · ' : '') + (qtd === 0 ? 'nenhum confirmado ainda' : qtd + (qtd === 1 ? ' confirmado' : ' confirmados')) + '.',
            acao:'<button type="button" class="pend-acao" onclick="abrirConselhoModal(' + i + ')">Ver conselho</button>' });
        }
      }
    });
  }
  // Próximos passos da 1:1 que cabem ao CS.
  var v = umAUmVisao_;
  if (v && v.passosLiderado && v.passosLiderado.length) {
    var abertosSemUrgencia = 0;
    v.passosLiderado.forEach(function(it){
      if (it.vencido) itens.push({ g:0, ord:4, titulo:it.texto, det:'Passo da 1:1 vencido há ' + it.diasVencido + (it.diasVencido === 1 ? ' dia.' : ' dias.'), acao:'<button type="button" class="pend-acao" onclick="irParaAba(&#39;aba-acompanhamento&#39;)">Ver 1:1</button>' });
      else if (it.prazo && diasEntreIso_(hoje, String(it.prazo).slice(0,10)) <= 7) itens.push({ g:1, ord:4, titulo:it.texto, det:'Passo da 1:1 com prazo em ' + dataBRUmAUm_(it.prazo) + '.', acao:'<button type="button" class="pend-acao" onclick="irParaAba(&#39;aba-acompanhamento&#39;)">Ver 1:1</button>' });
      else abertosSemUrgencia++;
    });
    if (abertosSemUrgencia) itens.push({ g:2, ord:5, titulo:abertosSemUrgencia + (abertosSemUrgencia === 1 ? ' passo da 1:1 em aberto' : ' passos da 1:1 em aberto'), det:'Sem prazo nos próximos 7 dias.', acao:'<button type="button" class="pend-acao" onclick="irParaAba(&#39;aba-acompanhamento&#39;)">Ver 1:1</button>' });
  }
  if (advertenciasCarregadas_ && advertenciaPontuacaoAtiva_ > LIMIAR_ADVERTENCIA_DESTAQUE_) {
    itens.push({ g:1, ord:6, titulo:advertenciaPontuacaoAtiva_ + ' pontos ativos, acima do limite de ' + LIMIAR_ADVERTENCIA_DESTAQUE_, det:'Converse com a liderança sobre o plano para reduzir.', acao:'<button type="button" class="pend-acao" onclick="irParaAba(&#39;aba-acompanhamento&#39;,&#39;advertencias&#39;)">Ver pontos</button>' });
  }
  itens.sort(function(a, b){ return a.g - b.g || a.ord - b.ord; });
  return { itens: itens, proprio: proprio, carregando: !data || umAUmVisao_ === null || reportEstadoAtual_ === null || !advertenciasCarregadas_ };
}

function renderPendencias(){
  var lista = document.getElementById('pendLista');
  if (!lista) return;
  var r = coletarPendencias_();
  var nomeCurto = currentCS || '';
  document.getElementById('pendTitulo').textContent = r.proprio || modoRestritoCS ? 'O que fazer agora' : 'Pendências de ' + nomeCurto;
  var urgentes = r.itens.filter(function(x){ return x.g === 0; }).length;
  document.getElementById('pendSub').textContent = r.itens.length
    ? (urgentes ? urgentes + (urgentes === 1 ? ' urgente' : ' urgentes') + ' · ' : '') + r.itens.length + ' no total'
    : '';
  renderAtencaoConselhos_();
  gcDefinirPend_(relatoriosPorGrupo_());
  var badge = document.getElementById('tabBadgeAcomp');
  var nAcomp = r.itens.filter(function(x){ return x.g < 2 && (x.ord === 0 || Math.floor(x.ord) === 1 || x.ord === 4 || x.ord === 6); }).length;
  if (badge) { badge.hidden = !nAcomp; badge.textContent = nAcomp; }
  if (!r.itens.length) {
    lista.innerHTML = r.carregando
      ? '<div class="pend-vazio">Carregando pendências…</div>'
      : '<div class="pend-vazio ok">Nada pendente agora: report, GTD, confirmações e passos da 1:1 estão em dia.</div>';
    return;
  }
  var mostrar = pendExpandida_ ? r.itens : r.itens.slice(0, PEND_VISIVEIS_);
  lista.innerHTML = mostrar.map(function(x){
    var cls = x.g === 0 ? 'atrasado' : (x.g === 1 ? 'breve' : 'info');
    var rot = x.g === 0 ? 'Urgente' : (x.g === 1 ? 'Esta semana' : 'Em aberto');
    return '<div class="pend-item ' + cls + '"><span class="pend-tag">' + rot + '</span>' +
      '<div class="pend-txt"><div class="pend-item-tit">' + escHtml_(x.titulo) + '</div><div class="pend-item-det">' + escHtml_(x.det) + '</div></div>' + (x.acao || '') + '</div>';
  }).join('') + (r.itens.length > PEND_VISIVEIS_
    ? '<button type="button" class="pend-mais" onclick="pendExpandida_=!pendExpandida_;renderPendencias();">' + (pendExpandida_ ? 'Mostrar menos' : 'Ver mais ' + (r.itens.length - PEND_VISIVEIS_)) + '</button>' : '') +
    (r.carregando ? '<div class="pend-vazio">Ainda carregando parte das informações…</div>' : '');
}

function renderResumoMes(data){
  var el = document.getElementById('mesResumo');
  var ind = data.indicadores;
  if (data.periodo.geral) {
    el.innerHTML = '<div class="rd-hero rd-hero1"><div><span class="rd-lab">Visão geral de ' + data.periodo.ano + '</span><h2>Acumulado do ano, sem comparação com meta. Escolha um mês no topo para ver o que está no alvo.</h2></div></div>';
    return;
  }
  var lidos = INDICADORES_MES_.map(function(x){ return { l:x.l, k:x.k, ind:ind[x.k], c:calcIndicador(ind[x.k]) }; })
    .filter(function(x){ return x.ind && x.ind.meta !== null && x.ind.meta !== undefined && x.ind.alcancado !== null && x.ind.alcancado !== undefined && !x.ind.semApuracao; });
  var noAlvo = lidos.filter(function(x){ return x.c.pill === 'pg'; });
  var andamento = lidos.filter(function(x){ return x.c.pill === 'py'; });
  var atencao = lidos.filter(function(x){ return x.c.pill === 'pr'; }).sort(function(a, b){ return a.c.pct - b.c.pct; });
  var total = lidos.length;
  var seg = function(n, cls){ return n ? '<span class="mes-seg ' + cls + '" style="flex:' + n + '"></span>' : ''; };
  // Meta de mínimo mostra o quanto foi atingido; meta de máximo (churn, críticos) mostra valor contra o limite.
  var chip = function(x, cls){
    var v = x.ind.tipoMeta === 'max' ? valorKpiTexto_(x.ind, x.k === 'revenueChurn' ? 'R$' : null) + ' para limite de ' + (x.k === 'revenueChurn' ? 'R$ ' + Number(x.ind.meta).toLocaleString('pt-BR') : x.ind.meta + (x.ind.composicao ? '%' : '')) : x.c.pctLabel.replace(' da meta','');
    return '<button type="button" class="mes-chip ' + cls + '" onclick="irParaAba(&#39;aba-mes&#39;,&#39;kpi-' + x.k + '&#39;)">' + x.l + ' <b>' + v + '</b></button>';
  };
  var partes = [];
  if (andamento.length) partes.push(andamento.length + ' em andamento');
  if (atencao.length) partes.push(atencao.length + (atencao.length === 1 ? ' pede atenção' : ' pedem atenção'));
  var frase = !total ? 'Ainda sem metas com dado neste mês.'
    : (!partes.length ? 'Todas as ' + total + ' metas com dado estão no alvo.' : noAlvo.length + ' de ' + total + ' metas no alvo, ' + partes.join(' e ') + '.');
  var hj = new Date();
  var noMesAtual = String(data.periodo.mes) === MESES[hj.getMonth()] && Number(data.periodo.ano) === hj.getFullYear();
  var faltam = new Date(hj.getFullYear(), hj.getMonth() + 1, 0).getDate() - hj.getDate();
  var ritmo = noMesAtual ? (faltam === 0 ? 'Hoje é o último dia do mês. ' : 'Faltam ' + faltam + (faltam === 1 ? ' dia' : ' dias') + ' para fechar o mês. ') + 'Em cada cartão, o traço marca o esperado até hoje.' : '';
  el.innerHTML = '<div class="rd-hero rd-hero1"><div><span class="rd-lab">Metas de ' + String(data.periodo.mes).toLowerCase() + '</span><h2>' + frase + '</h2>' +
    (ritmo ? '<p class="rd-hero-sub">' + ritmo + '</p>' : '') +
    (total ? '<div class="mes-barra" role="img" aria-label="' + noAlvo.length + ' no alvo, ' + andamento.length + ' em andamento, ' + atencao.length + ' precisam de atenção">' + seg(noAlvo.length,'g') + seg(andamento.length,'y') + seg(atencao.length,'r') + '</div>' +
      (atencao.length ? '<div class="mes-linha"><span class="mes-rot">Precisam de atenção</span>' + atencao.map(function(x){ return chip(x,'r'); }).join('') + '</div>' : '') +
      (andamento.length ? '<div class="mes-linha"><span class="mes-rot">Em andamento</span>' + andamento.map(function(x){ return chip(x,'y'); }).join('') + '</div>' : '') : '') +
    '</div></div>';
}

// resumo (Parte A/B, 25/09/2026): só existe quando modoRestritoCS=true (payload de
// /api/home-resumo) — indicadoresTime alimenta a linha "Time:" de cada card (Parte B), top3/
// minhaPosicao alimentam os blocos sempre visíveis da Parte A. Ausente pra gestor navegando o
// perfil de qualquer CS (comportamento de sempre, sem nenhuma dessas seções extras).
function renderDashboard(data, resumo){
  modoGeralAtual = !!data.periodo.geral;
  renderJornadaHero(data);
  renderResumoMes(data);
  renderIndicadores(data, resumo); renderSemanal(data); renderConselhos(data); renderFeedback(data);
  if (modoRestritoCS && resumo) {
    renderCSTop(resumo.top3, 'restritoTop3');
    renderMinhaPosicao(resumo);
  }
  renderPendencias();
  animarMFills();
}
function gtdCard(ind){
  var alcancado = ind.alcancado;
  var semDado = alcancado === null || alcancado === undefined;
  var pct = semDado ? 0 : Math.max(0, Math.min(100, Math.round(alcancado)));
  return '<div class="rd-card kpi-gtd" id="kpi-gtd"><div class="kpi-top"><div class="kpi-label">'+ICONS.check+' GTD de conselho</div><span class="rd-pill neutro">'+(semDado?'Sem ciclo em aberto':'Média das 9 etapas')+'</span></div>' +
    '<div class="rd-big num">'+(semDado?'Sem dado':pct+'%')+'</div>' +
    '<div class="rd-mb" role="img" aria-label="Cumprimento do GTD '+pct+'%"><i class="y" style="width:'+pct+'%"></i></div>' +
    '<p class="rd-nota">Média das etapas de acompanhamento (confirmação, jornada, encaminhamentos, matchmaking, upsell) nos conselhos do ciclo atual.</p>' +
    '<div style="margin-top:12px"><button type="button" class="rd-btn" onclick="irParaAba(&#39;aba-conselhos&#39;)">Ver conselhos</button></div></div>';
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
// Ordem dos cartões: primeiro o que precisa de atenção, depois em andamento, por fim no alvo e sem meta,
// para que a leitura do mês comece pelo que pede ação (13/10/2026). Visão Geral mantém a ordem fixa.
function renderIndicadores(data, resumo){
  var ind = data.indicadores;
  var t = resumo ? resumo.indicadoresTime : null;
  var blur = modoRestritoCS && !configRevelarIndicadoresTime;
  var rec = recordeIndividualMapa_(data);
  var PESO_ = { pr:0, py:1, pg:2, pgray:3 };
  periodoMes_ = data.periodo;
  var lista = INDICADORES_MES_.filter(function(x){ return x.k !== 'casesSucesso'; }).map(function(x, i){ return { x:x, i:i, peso: modoGeralAtual ? 0 : (PESO_[calcIndicador(ind[x.k]).pill] === undefined ? 3 : PESO_[calcIndicador(ind[x.k]).pill]) }; })
    .sort(function(a, b){ return a.peso - b.peso || a.i - b.i; });
  var html = '<div class="rd-grid rd-g3">' + lista.map(function(o){
    return kpiCard(o.x.l, ind[o.x.k], o.x.u || null, t && t[o.x.k], blur, rec[o.x.rec], 'kpi-' + o.x.k);
  }).join('') + gtdCard(ind.cumprimentoGtd) + '</div>';
  document.getElementById('indicadores').innerHTML = html;
}
function renderSemanal(data){
  var ind = data.indicadores.casesSucesso;
  var c = calcIndicador(ind);
  var lista = data.casesRegistrados || [];
  casesAtuais = lista;
  periodoMes_ = data.periodo;
  var meta = ind.meta === null || ind.meta === undefined ? 'sem meta' : 'meta ' + rdNum_(ind.meta);
  var cab = '<div class="rd-cases-cab"><div class="m-fill-wrap"><div class="m-fill-liquid '+c.cor+'" style="height:0%;" data-target="'+c.pct+'"></div></div>' +
    '<div><div class="rd-big num '+c.corTxt+'">'+(ind.alcancado === null || ind.alcancado === undefined ? 'Sem dado' : rdNum_(ind.alcancado))+(modoGeralAtual ? '' : '<small>'+meta+'</small>')+'</div>' +
    '<div style="margin-top:8px"><span class="kpi-pill '+c.pill+'">'+c.pillLabel+'</span></div></div></div>' +
    barraMeta_(ind, c);
  var corpo;
  if (lista.length === 0) {
    corpo = rdAviso_('Nenhum case registrado neste período', 'Os cases de sucesso registrados no período aparecem aqui, e cada um abre com o desafio, a decisão e o resultado.');
  } else {
    corpo = '<div class="rd-div" style="margin-top:20px">Registrados no período: ' + lista.length + '. Toque para ler o case completo</div><div class="rd-cases">' + lista.map(function(item, i){
      return '<button type="button" class="rd-case" onclick="abrirCaseModal('+i+')">' +
        (item.produto ? '<span class="rd-lab">'+rdEsc_(item.produto)+'</span>' : '') +
        '<b>'+rdEsc_(item.nome)+'</b>' + (item.empresa ? '<span>'+rdEsc_(item.empresa)+'</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  var el = document.getElementById('semanal');
  el.innerHTML = '<section class="rd-card" id="kpi-casesSucesso"><h2>Cases de sucesso</h2><p class="rd-sub">O que você levou de resultado para os membros no período.</p>' + cab + corpo + '</section>';
  animarMFills(el);
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
// Exceções da carteira por urgência: as pendências que são de um conselho (relatório, GTD, confirmação) mais a presença baixa.
function excecoesConselhos_(data){
  var itens = coletarPendencias_().itens.filter(function(x){ return x.cons; });
  (data.conselhos || []).forEach(function(c, i){
    if (c.status !== 'realizado' || c.congelado) return;
    var reg = c.registros || (c.presente + c.ausente + c.reposicao);
    var pct = reg ? Math.round(c.presente / reg * 100) : 0;
    if (pct < 60) itens.push({ g:1, ord:2.5, cons:1, conselho:nomeCurtoConselho_(c), mot:'Presença abaixo de 60%',
      det:'Presença de ' + pct + '% no último encontro realizado. Vale falar com os membros ausentes.',
      acao:'<button type="button" class="pend-acao" onclick="abrirConselhoModal(' + i + ')">Ver membros</button>' });
  });
  return itens.sort(function(a, b){ return a.g - b.g || a.ord - b.ord; });
}
function relatoriosPorGrupo_(){
  var mapa = {};
  var r = reportEstadoAtual_;
  if (r && r.relatoriosPendentes) r.relatoriosPendentes.forEach(function(x){ if (!mapa[x.groupId]) mapa[x.groupId] = x; });
  return mapa;
}
// Abertura da aba (frase da carteira e presença) e cartões de exceção. Lê o payload já carregado da página.
function renderAtencaoConselhos_(){
  var ab = document.getElementById('consAbertura'), ex = document.getElementById('consAtencao');
  var data = currentCS ? cachePessoa[chaveP(currentCS, currentMes, currentAno)] : null;
  if (!ab || !ex || !data) return;
  var lista = data.conselhos || [];
  if (!lista.length) {
    ab.innerHTML = rdMsgCartao_('Conselhos', 'Nenhum conselho na carteira', 'Não há conselho ativo neste período. Confira se o título do grupo no Monday traz o CS entre parênteses.', false);
    ex.innerHTML = '';
    return;
  }
  var a = agregarConselhos(lista);
  var media = a.totalRegistros ? Math.round(a.totalPresente / a.totalRegistros * 100) : 0;
  var r = coletarPendencias_();
  var itens = excecoesConselhos_(data);
  var nomes = {}; itens.forEach(function(x){ nomes[x.conselho] = 1; });
  var nExc = Object.keys(nomes).length;
  var quem = currentCS === meuCSNome ? 'Sua carteira tem ' : 'A carteira de ' + currentCS + ' tem ';
  var frase = quem + a.total + (a.total === 1 ? ' conselho' : ' conselhos') + (a.totalRegistros ? ', com presença média de ' + media + '%' : ', sem encontro realizado no período') +
    (nExc ? ' e ' + nExc + (nExc === 1 ? ' pede atenção.' : ' pedem atenção.') : (r.carregando ? '.' : ' e nenhum pede atenção.'));
  var sub = a.totalMembros + ' membros ativos' + (a.congelados ? ' · ' + a.congelados + (a.congelados === 1 ? ' conselho congelado' : ' conselhos congelados') : '') + ' · presença direta, sem reposições';
  ab.innerHTML = '<section class="rd-hero" aria-label="Situação da carteira"><div><span class="rd-lab">Conselhos e agenda</span><h2>' + rdEsc_(frase) + '</h2><p class="rd-hero-sub">' + rdEsc_(sub) + '</p></div>' +
    '<div class="rd-donut">' + donutChart(a.totalPresente, a.totalAusente, a.totalReposicao, 130) + '</div></section>';
  if (!itens.length) { ex.innerHTML = ''; return; }
  ex.innerHTML = rdCartao_('Pontos de atenção', 'Ordenados por urgência. Cada cartão traz o motivo e o próximo passo.',
    '<div class="rd-ex-l">' + itens.map(function(x){
      return '<div class="rd-ex g' + x.g + '"><span class="rd-pill ' + (x.g === 0 ? 'red' : 'gold') + '">' + (x.g === 0 ? 'Urgente' : 'Esta semana') + '</span><b>' + rdEsc_(x.conselho) + '</b><p>' + rdEsc_(x.mot) + '</p><p>' + rdEsc_(x.det) + '</p>' + (x.acao || '') + '</div>';
    }).join('') + '</div>');
}
function renderConselhos(data){
  conselhosAtuais = data.conselhos || [];
  renderAtencaoConselhos_();
  if (conselhosAtuais.length === 0) { document.getElementById('conselhos').innerHTML = ''; return; }
  var html = '<section class="rd-card"><h2>Conselhos da carteira</h2><p class="rd-sub">Toque num conselho para ver a presença por membro e as etapas do GTD.</p><div class="council-grid">';
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
    '<span><span class="legend-dot" style="background:#7dd3fc;"></span>Reposição</span></div></section>';
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
  var html = !souGestor ? '' : '<div class="destaque-form-card">' +
    '<div class="destaque-form-label">'+ICONS.trophy+'CS Destaque</div>' +
    '<div class="destaque-form-desc">Quantas vezes '+data.cs.nomeCompleto+' já foi reconhecido(a) como CS Destaque. Aparece como emblema no topo da página individual.</div>' +
    '<input type="number" min="0" step="1" class="destaque-form-input" id="destaqueInput" value="'+vezesAtual+'">' +
    '<button class="destaque-form-btn" id="destaqueSalvarBtn" onclick="salvarVezesDestaque()">Salvar</button>' +
    '<span class="destaque-form-status" id="destaqueStatus"></span>' +
  '</div>';
  // Pulso de CS (05/10/2026): de outubro de 2026 em diante vale o pulso. Até setembro vale a avaliação
  // entre pares antiga. Visão Geral mostra as duas, cada uma na sua seção.
  var corpo = '';
  if (modo === 'pulso' || modo === 'ambos') corpo += feedbackPulsoHtml_(pulso);
  if (modo === 'ambos') corpo += '<div class="rd-div">Histórico anterior ao Pulso, até setembro</div>';
  if (modo === 'legado' || modo === 'ambos') corpo += feedbackLegadoHtml_(fb);
  html += rdCartao_('O que o time diz', modo === 'legado' ? '' : 'Pulso de CS, respostas anônimas do time neste período. As falas são as originais dos colegas.', corpo);
  document.getElementById('feedbacks').innerHTML = html;
  setTimeout(function(){ document.querySelectorAll('.voto-row-bar-fill').forEach(function(el){ el.style.width = el.getAttribute('data-w')+'%'; }); }, 50);
}

// Pulso de CS: o que os colegas escreveram sobre este CS e quantos o indicaram como destaque em
// colaboração. Nada identifica quem respondeu, e a autoavaliação já vem excluída pelo banco.
function feedbackPulsoHtml_(p){
  if (!p) return rdAviso_('Pulso de CS indisponível', 'O Pulso de CS não está disponível para este período.');
  if (p.erro) return rdAviso_('Não foi possível carregar o Pulso de CS', p.erro, true);
  if (p.respostas === 0) return rdAviso_('Sem respostas do Pulso neste período', 'As respostas aparecem aqui assim que o formulário mensal do Pulso de CS for preenchido pelo time.');
  var h = '<div class="rd-pulso-res"><div class="rd-big">' + p.respostas + '<small>' + (p.respostas === 1 ? 'resposta' : 'respostas') + '</small></div>' +
    '<div class="rd-big">' + p.destaques + '<small>' + (p.destaques === 1 ? 'colega o indicou' : 'colegas o indicaram') + ' como destaque em colaboração e apoio ao time</small></div></div>';
  if (!p.falas || p.falas.length === 0) return h + rdAviso_('Nenhuma observação neste período', 'Nenhum colega deixou observação sobre este CS neste período.');
  h += '<div class="rd-falas">' + p.falas.slice(0, MAX_QUOTES_VISIVEIS * 2).map(function(f){ return '<div class="rd-fala"><p>' + escHtml_(f) + '</p></div>'; }).join('') + '</div>';
  if (p.falas.length > MAX_QUOTES_VISIVEIS * 2) h += '<div class="rd-mais">+ ' + (p.falas.length - MAX_QUOTES_VISIVEIS * 2) + ' outra(s) observação(ões) neste período.</div>';
  return h + '<p class="rd-nota">As falas são embaralhadas e não identificam quem respondeu.</p>';
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

// ============ 1:1 (08/10/2026): só leitura nesta tela ============
// A 1:1 é conduzida e editada só na página do CS na visão do gestor (/gestor/cs/[nome], bloco 1:1).
// Aqui, CS e gestor veem a mesma visão compartilhada, que a API já devolve ordenada e sem ponto de
// atenção, notas privadas ou dados do Granola. Carregada à parte, para não misturar com o payload de /api/cs/[nome].
var UMAUM_PRIO_LABEL_ = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
function escUmAUm_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}
function dataBRUmAUm_(iso){
  if (!iso) return 'sem data';
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function carregarUmAUm(nome){
  return fetchJSON_('/api/cs/' + encodeURIComponent(nome) + '/um-a-um').then(function(d){
    umAUmVisao_ = d;
    renderUltimoUmAUm();
    renderAbaUmAUm();
  }).catch(function(err){
    umAUmVisao_ = { erro: true, registros: [], passosLiderado: [], compromissosLideranca: [] };
    renderPendencias();
    document.getElementById('umaum').innerHTML = rdMsgCartao_('1:1 com a liderança', 'Não foi possível carregar', err.message, true);
  });
}
// O resumo da última 1:1 saiu do topo (13/10/2026): os passos em aberto entram em "O que fazer agora".
function renderUltimoUmAUm(){ renderPendencias(); }
function umItemLinhaHtml_(i){
  var meta = '';
  if (i.prioridade === 'alta') meta += '<span class="rd-alta">Prioridade alta</span> ';
  if (i.prazo) {
    meta += i.vencido
      ? '<span class="rd-venc">vencido há ' + i.diasVencido + (i.diasVencido === 1 ? ' dia' : ' dias') + '</span>'
      : '<span>prazo ' + dataBRUmAUm_(i.prazo) + '</span>';
  }
  return '<div class="rd-item"><div>' + escUmAUm_(i.texto) + '</div>' + (meta ? '<div class="rd-meta">' + meta + '</div>' : '') + '</div>';
}
function renderAbaUmAUm(){
  var el = document.getElementById('umaum');
  var v = umAUmVisao_;
  if (!v) return;
  var titulo = '1:1 com a liderança', sub = 'Conversa individual para destravar o que está difícil.';
  var link = souGestor && currentCS
    ? '<p class="rd-linkgestor">Para registrar ou editar, conduza a 1:1 na <a href="/gestor/cs/' + encodeURIComponent(currentCS) + '#secUmAUm">página do CS</a>.</p>'
    : '';
  if (!v.registros.length) {
    el.innerHTML = rdCartao_(titulo, sub, link + rdAviso_('Nenhuma 1:1 registrada', 'Combine a primeira com a liderança. Depois dela, os combinados aparecem aqui.'));
    return;
  }
  var passos = v.passosLiderado.length
    ? v.passosLiderado.map(umItemLinhaHtml_).join('')
    : '<p class="rd-nota" style="margin-top:4px;">Nenhum passo seu em aberto.</p>';
  var compromissos = v.compromissosLideranca.length
    ? v.compromissosLideranca.map(umItemLinhaHtml_).join('')
    : '<p class="rd-nota" style="margin-top:4px;">Nenhum compromisso da liderança em aberto.</p>';
  var historico = v.registros.map(function(r){
    return '<div class="rd-item"><b>' + dataBRUmAUm_(r.data) + '</b>' +
      (r.resumoCompartilhado ? '<div style="white-space:pre-wrap;">' + escUmAUm_(r.resumoCompartilhado) + '</div>' : '<div class="rd-meta">Sem resumo compartilhado.</div>') + '</div>';
  }).join('');
  el.innerHTML = rdCartao_(titulo, sub, link +
    '<div class="rd-bloco" style="margin-top:0;"><span class="rd-lab">Meus próximos passos</span>' + passos + '</div>' +
    '<div class="rd-bloco"><span class="rd-lab">O que a liderança se comprometeu</span>' + compromissos + '</div>' +
    '<details class="rd-det"><summary>Histórico, ' + v.registros.length + (v.registros.length === 1 ? ' registro' : ' registros') + '</summary>' + historico + '</details>');
}

// ============ pontos tomados (antes, aba Advertências; 07/10/2026) ============
// Somente leitura nas duas visões. A aplicação, a edição e a exclusão de advertência moram na
// página do CS na visão do gestor (/gestor/cs/[nome]); aqui o CS vê o ponto que tomou e o efeito no
// Health da Base, e o gestor ganha só o atalho para a página. O destaque visual acima de 3 pontos
// ativos continua. Carregado à parte via /api/cs/[nome]/advertencias (que já devolve o efeito).
var advertenciasAtual_ = [];
var advertenciaPontuacaoAtiva_ = 0;
var advertenciaTotais_ = { totalHistorico: 0, desde: null, proximoVencimento: null };
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
    advertenciaTotais_ = { totalHistorico: d.totalHistorico || 0, desde: d.desde || null, proximoVencimento: d.proximoVencimento || null };
    advertenciaEfeito_ = d.efeito || null;
    advertenciasCarregadas_ = true;
    renderAbaAdvertencias();
    renderPendencias();
  }).catch(function(err){
    if (currentCS !== nome) return;
    document.getElementById('advertencias').innerHTML = rdMsgCartao_('Pontos tomados', 'Não foi possível carregar', err.message, true);
  });
}
function advertenciaResumoHtml_(){
  var destaque = advertenciaPontuacaoAtiva_ > LIMIAR_ADVERTENCIA_DESTAQUE_;
  var t = advertenciaTotais_;
  var bolas = '';
  for (var k = 0; k < LIMIAR_ADVERTENCIA_DESTAQUE_; k++) bolas += '<i class="' + (k < advertenciaPontuacaoAtiva_ ? 'on' : '') + '"></i>';
  return '<div class="rd-pts" role="img" aria-label="' + advertenciaPontuacaoAtiva_ + ' de ' + LIMIAR_ADVERTENCIA_DESTAQUE_ + ' pontos ativos">' + bolas + '</div>' +
    '<div class="rd-big">' + advertenciaPontuacaoAtiva_ + ' de ' + LIMIAR_ADVERTENCIA_DESTAQUE_ + '<small>' + (advertenciaPontuacaoAtiva_ === 1 ? 'ponto ativo' : 'pontos ativos') + (destaque ? ', acima do limite' : '') + '</small></div>' +
    '<p class="rd-nota">Total histórico: ' + t.totalHistorico + (t.desde ? ', desde ' + dataHoraBRAdvertencia_(t.desde) : '') +
    (t.proximoVencimento ? '. O próximo ponto vence em ' + dataHoraBRAdvertencia_(t.proximoVencimento) : '') + '.</p>';
}
function advertenciaEfeitoHtml_(){
  var e = advertenciaEfeito_;
  if (!e) return '';
  if (e.semApuracao || e.comPontosDecimos === null || e.comPontosDecimos === undefined) return '<p class="rd-nota">Efeito no Health da Base: sem apuração, falta um report com críticos e base.</p>';
  if (e.comPontosDecimos === e.semPontosDecimos) return '<p class="rd-nota">Nenhum efeito no Health da Base: ' + rdPct_(e.comPontosDecimos) + ' com pontos e ' + rdPct_(e.semPontosDecimos) + ' sem.</p>';
  return '<p class="rd-nota">Efeito no Health da Base: ' + rdPct_(e.comPontosDecimos) + ' com os pontos ativos e ' + rdPct_(e.semPontosDecimos) + ' sem eles.</p>';
}
function advertenciaAtalhoGestorHtml_(){
  if (!souGestor) return '';
  return '<div style="margin-top:12px;"><a class="rd-btn" href="/gestor/cs/' + encodeURIComponent(currentCS) +
    '?mes=' + encodeURIComponent(currentMes) + '&ano=' + encodeURIComponent(currentAno) + '">Aplicar, editar ou excluir na página do CS</a></div>';
}
function advertenciaListaHtml_(){
  if (!advertenciasAtual_.length) return '';
  var itens = advertenciasAtual_.map(function(r){
    var anulada = !!r.anuladaEm;
    var situacao = anulada ? 'anulada' : (r.ativa ? 'ativa' : 'vencida');
    return '<div class="rd-item"' + (anulada ? ' style="opacity:.7;"' : '') + '><div><b' + (anulada ? ' style="text-decoration:line-through;"' : '') + '>' + escUmAUm_(r.tipoNome) + '</b> ' +
      '<span class="rd-pill ' + (r.ativa && !anulada ? 'red' : 'neutro') + '">' + r.pontos + (r.pontos !== 1 ? ' pontos' : ' ponto') + ', ' + situacao + '</span></div>' +
      '<div class="rd-meta">' + (r.origem === 'sistema' ? 'Automático' : 'Aplicado por ' + escUmAUm_(r.aplicadoPor)) + ' em ' + dataHoraBRAdvertencia_(r.aplicadoEm) + ', válida até ' + dataHoraBRAdvertencia_(r.validoAte) + '</div>' +
      (r.observacao ? '<div class="rd-meta">Observação: ' + escUmAUm_(r.observacao) + '</div>' : '') +
      (anulada ? '<div class="rd-meta">Anulada: ' + escUmAUm_(r.motivoAnulacao || '') + '</div>' : '') + '</div>';
  }).join('');
  return '<details class="rd-det"><summary>Ver os ' + advertenciasAtual_.length + (advertenciasAtual_.length === 1 ? ' registro' : ' registros') + '</summary>' + itens + '</details>';
}
function renderAbaAdvertencias(){
  var el = document.getElementById('advertencias');
  el.innerHTML = rdCartao_('Pontos tomados', 'Pontos de advertência ativos e o efeito deles no Health da Base.', advertenciaResumoHtml_() + advertenciaEfeitoHtml_() + advertenciaAtalhoGestorHtml_() +
    advertenciaListaHtml_());
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
var agendaItensClique_ = [];

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
// Estilo do item na agenda (07/10/2026). Conselho aberto: fundo pelo semáforo de confirmados.
// Conselho encerrado (término já passou, ver item.passado no servidor): neutro, com a presença.
// Round: inalterado, cor do status. A cor do nível vira um ponto antes do título.
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


// Farol da semana: virou o resumo do rodapé da agenda (prompt 5.5.10). Os cards saem; a contagem vem da agenda.
function carregarFarolSemana_(){
  var el = document.getElementById('farolSemana');
  if (!el) return;
  el.textContent = 'Carregando o resumo da semana…';
  var inicio = agendaInicioSemana_(agendaZerarHora_(new Date()));
  var fim = agendaAddDias_(inicio, 7);
  fetchJSON_('/api/gestor/agenda?inicio=' + agendaFmtYYYYMMDD_(inicio) + '&fim=' + agendaFmtYYYYMMDD_(fim)).then(function (d) {
    renderFarolSemana_(d);
  }).catch(function (err) {
    el.innerHTML = '<span class="gh-erro">Não foi possível carregar o resumo da semana: ' + escAgenda_(err.message) + '.</span>';
  });
}
function renderFarolSemana_(d){
  var el = document.getElementById('farolSemana');
  var conselhos = d.conselhos || [];
  var rounds = (d.rounds || []).length;
  var atencao = conselhos.filter(function (c) { return !c.passado && (c.confirmados || []).length <= 3; }).length;
  el.textContent = conselhos.length + (conselhos.length === 1 ? ' conselho' : ' conselhos') + ' e ' + rounds + (rounds === 1 ? ' round' : ' rounds') +
    ' na semana · ' + atencao + ' com 3 confirmados ou menos';
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
// Limites conhecidos do histórico espelhado (conferido direto no banco em 29/09/2026) — o recorde
// só é calculado dentro dessa janela; antes dela, o gestor pode registrar um recorde manual na
// tela de Metas e destaques.
function renderLegendaJanelaHistorico(){
  return '<div class="legenda-janela-historico" style="font-size:10.5px;color:#6E6C6C;margin-top:14px;line-height:1.6;">'+
    'Recorde calculado só dentro do histórico espelhado: cases desde julho de 2025, indicações desde janeiro de 2026, '+
    'matchmakings desde abril de 2026, rounds e churn desde maio de 2026. Fora dessa janela, use o recorde manual na tela do gestor.'+
    '</div>';
}
function escHtml_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
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
    var avisoMeta = semMeta ? '<span class="meta-aviso" title="Sem meta cadastrada: o indicador fica fora da média.">sem meta</span>' : (item.semPontos ? '<span class="meta-aviso" title="A carteira não dá pontos: mede alocação, não desempenho.">sem pontos</span>' : '');
    var alem = (item.alemDaMetaPct > 0) ? ', ' + item.alemDaMetaPct + '% além da meta' : '';
    return '<div class="score-detalhe-row">' +
      '<span class="score-detalhe-label">'+item.label+avisoMeta+'</span>' +
      '<span class="score-detalhe-peso">peso '+item.peso+'</span>' +
      '<span class="score-detalhe-valor">'+(semMeta ? val+' · sem meta' : val+' / '+meta+' · '+ach+alem)+'</span>' +
      '<span class="score-detalhe-pontos">'+(item.semPontos ? 'sem pontos' : ((semMeta||item.pontos===null||item.pontos===undefined) ? 'fora da média' : item.pontos+' pts'))+'</span>' +
    '</div>';
  }).join('');
  document.getElementById('caseModalBody').innerHTML =
    '<div class="case-modal-header"><div><div class="case-modal-nome">'+d.nome+'</div>' +
    '<div class="case-modal-empresa">Pontuação: '+(d.score===null?'—':d.score)+'</div></div></div>' +
    '<div class="case-modal-campo"><div class="case-modal-label">Como a pontuação foi composta</div>' + linhas +
    '<div class="case-modal-texto" style="margin-top:12px;color:#9F9F9F;">Pontos = peso × aproveitamento de cada indicador na meta. Indicador sem meta cadastrada fica fora da média e os pesos dos demais são redistribuídos. A carteira não dá pontos. Quem supera a meta passa de 100.</div></div>';
  document.getElementById('caseModalOverlay').classList.add('ativo');
}

// Pódio do mês (2º, 1º, 3º). Só desenha o top3 que /api/home-resumo já devolve; o nome do próprio CS ganha o selo Você.
function renderCSTop(csTop, targetId){
  var el = document.getElementById(targetId || 'csTop');
  var sub = 'Pontuação do mês corrente, com as regras do ranking.';
  if (!csTop || csTop.length === 0) { el.innerHTML = rdCartao_('CS Top 3 do mês', sub, rdAviso_('Sem dados suficientes', 'Ainda não há pontuação para montar o Top 3 neste período.')); return; }
  var cartoes = [1, 0, 2].filter(function(i){ return csTop[i]; }).map(function(i){
    var c = csTop[i];
    var eu = c.nome === currentCS;
    var inicial = String(c.nomeCompleto || c.nome || '?').trim().charAt(0).toUpperCase();
    var av = c.fotoUrl ? '<img src="' + escHtml_(c.fotoUrl) + '" alt="">' : escHtml_(inicial);
    var idxModal = registrarScoreModal_(c.nome, c.score, c.detalhamento);
    return '<div class="rd-pd' + (i === 0 ? ' p1' : '') + (eu ? ' eu' : '') + '"><span class="rd-md">' + (i + 1) + 'º</span><div class="rd-av">' + av + '</div>' +
      '<b class="rd-nm">' + escHtml_(c.nome) + (eu ? ' <span class="rd-pill neutro" style="padding:1px 8px;font-size:11px;">Você</span>' : '') + '</b>' +
      '<div class="rd-n">' + rdNum_(c.score) + '<button class="info-btn" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta" aria-label="Como essa pontuação foi composta">ⓘ</button></div><span class="rd-l">pontos</span></div>';
  }).join('');
  el.innerHTML = rdCartao_('CS Top 3 do mês', sub, '<div class="rd-podio">' + cartoes + '</div>');
}

// Exceção 2 da Parte A (25/09/2026): só a PRÓPRIA posição no ranking geral, nunca a lista inteira
// de nomes/posições dos colegas. A comparação usa as pontuações do pódio que a própria aba já mostra.
function renderMinhaPosicao(resumo){
  var el = document.getElementById('restritoPosicao');
  if (!el) return;
  var pai = el.parentNode;
  if (resumo.minhaPosicao === null || resumo.minhaPosicao === undefined) { el.innerHTML = ''; pai.className = 'rd-pos so1'; return; }
  pai.className = 'rd-pos';
  var idxModal = registrarScoreModal_(currentCS, resumo.meuScore, resumo.meuDetalhamento);
  var pos = resumo.minhaPosicao;
  var tem = resumo.meuScore !== null && resumo.meuScore !== undefined;
  var top = (resumo.top3 || []).map(function(c){ return Number(c.score); });
  var larg = tem && top.length && top[0] > 0 ? Math.max(0, Math.min(100, Number(resumo.meuScore) / top[0] * 100)) : (pos === 1 ? 100 : 0);
  var info = '<button class="info-btn dark" onclick="abrirScoreModal(' + idxModal + ')" title="Como essa pontuação foi composta" aria-label="Como essa pontuação foi composta">ⓘ</button>';
  el.innerHTML = '<section class="rd-pos-card" aria-label="Sua posição"><span class="rd-lab">Sua posição no time</span>' +
    '<div class="rd-pos-n">' + pos + 'º' + (resumo.totalRankeados ? '<small>de ' + resumo.totalRankeados + ' CS</small>' : '') + '</div>' +
    (tem ? '<p>' + rdNum_(resumo.meuScore) + ' pontos no mês.' + (pos > 1 && top.length ? ' O 1º lugar tem ' + rdNum_(top[0]) + '.' : '') + info + '</p>' +
      '<div class="rd-prog" role="img" aria-label="' + rdNum_(resumo.meuScore) + (top.length ? ' de ' + rdNum_(top[0]) + ' pontos' : ' pontos') + '"><i style="width:' + larg.toFixed(0) + '%"></i></div>' +
      (top.length ? '<p>' + rdEsc_(rdFrasePosicao_(pos, Number(resumo.meuScore), top)) + '</p>' : '')
      : '<p>Sem pontuação neste período.</p>') + '</section>';
}

function showTab(id, e){
  document.querySelectorAll('#screenPessoa .panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('#screenPessoa .tab').forEach(function(t){
    var ativa = t.getAttribute('data-aba') === id;
    t.classList.toggle('active', ativa);
    t.setAttribute('aria-selected', ativa ? 'true' : 'false');
  });
  var painel = document.getElementById(id);
  if (painel) painel.classList.add('active');
  if (id === 'aba-conselhos') carregarGradeCS_();
}

// Grade de cartões da carteira do próprio CS (22/10/2026). O recorte é feito no servidor
// (/api/conselhos-grade?meus=1): só vem o que tem o apelido dele no título do grupo.
var gradeCSChave_ = null;
function carregarGradeCS_(){
  var bloco = document.getElementById('consGradeCS');
  var lista = document.getElementById('conselhos');
  if (!bloco || !meuCSNome || currentCS !== meuCSNome) { if (bloco) bloco.hidden = true; if (lista) lista.hidden = false; return; }
  var chave = currentMes + '|' + currentAno;
  if (gradeCSChave_ === chave) return;
  gradeCSChave_ = chave;
  var mes = currentMes, ano = currentAno;
  bloco.hidden = false;
  if (lista) lista.hidden = true; // o mesmo conselho não aparece duas vezes: a grade substitui a lista
  document.getElementById('consGradeCtl').innerHTML = '';
  gcSkeleton('consGradeCorpo');
  fetchJSON_('/api/conselhos-grade?meus=1&mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(function(d){
    if (d.grade) gcIniciar({ raizId: 'consGradeCorpo', ctlId: 'consGradeCtl', grade: d.grade, mes: mes, ano: ano, comCS: false });
    else { gcErro('consGradeCorpo', d.gradeErro || 'erro sem mensagem'); if (lista) lista.hidden = false; }
    gcDefinirPend_(relatoriosPorGrupo_());
  }).catch(function(err){ gradeCSChave_ = null; if (lista) lista.hidden = false; gcErro('consGradeCorpo', err && err.message ? err.message : err); });
}
${GRADE_CONSELHOS_SCRIPT}
// Atalho das pendências e do resumo do mês: troca de aba e rola até o alvo.
function irParaAba(id, alvoId){
  showTab(id);
  var alvo = alvoId ? document.getElementById(alvoId) : document.querySelector('#screenPessoa .tabs');
  if (alvo) alvo.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ============ aba Report da página do CS (somente leitura) ============
// Mostra os reports que o CS envia no board do Monday (18394181332). A plataforma não grava nada
// aqui: o report nasce no Monday e a aba só lê. Dados vêm de /api/cs/:nome/report.
var REPORT_COMO_FOI_ = ${JSON.stringify(REPORT_COMO_FOI_SEMANA)};
var REPORT_CHECKLISTS_ = ${JSON.stringify(REPORT_CHECKLISTS)};
var REPORT_VALIDADE_DIAS_ = ${REPORT_VALIDADE_DIAS};
var REPORT_MONDAY_URL_ = 'https://monday.com/boards/18394181332';

var reportCS_ = null, reportSemana_ = null, reportDados_ = null, reportReq_ = 0;

function escR_(s){ return String(s === null || s === undefined ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDecR_(d){ return d === null || d === undefined ? null : (d / 10).toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 }); }
function dataCurtaR_(iso){ if (!iso) return ''; var p = String(iso).slice(0,10).split('-'); return p[2] + '/' + p[1]; }
function somarDiasR_(iso, n){ var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); }
function rotuloSemanaR_(seg){ var fim = somarDiasR_(seg, 6); return 'Semana de ' + dataCurtaR_(seg) + ' a ' + dataCurtaR_(fim) + '/' + fim.slice(0,4); }

function carregarReport(nome, semana){
  var meu = ++reportReq_;
  reportCS_ = nome;
  var el = document.getElementById('report');
  if (!reportDados_ || reportDados_.cs !== nome) el.innerHTML = rdMsgCartao_('Report da semana', 'Carregando', 'Buscando o report da semana.', false);
  var url = '/api/cs/' + encodeURIComponent(nome) + '/report' + (semana ? '?semana=' + encodeURIComponent(semana) : '');
  return fetchJSON_(url).then(function(d){
    if (meu !== reportReq_ || currentCS !== nome) return;
    reportDados_ = d;
    reportSemana_ = d.semana;
    if (d.semana === d.semanaAtual) reportEstadoAtual_ = { estado: d.estado || null, semana: d.semana, regularidade: d.regularidade || [], regularidadeRelatorio: d.regularidadeRelatorio || [], relatoriosPendentes: d.relatoriosPendentes || null, health: d.health || null };
    renderAbaReport();
    renderPendencias();
  }).catch(function(err){
    if (meu !== reportReq_) return;
    el.innerHTML = rdMsgCartao_('Report da semana', 'Não foi possível carregar o report', err.message, true);
    if (!reportEstadoAtual_) [['rdAbertura', 'Sua semana'], ['rdRitmo', 'Seu ritmo nas últimas 8 semanas'], ['reportHist', 'Críticos ao longo do tempo'], ['rdRelatorios', 'Relatórios do conselho']].forEach(function(x){
      document.getElementById(x[0]).innerHTML = rdMsgCartao_(x[1], 'Não foi possível carregar', err.message, true);
    });
  });
}

function renderAbaReport(){
  var d = reportDados_; if (!d) return;
  document.getElementById('report').innerHTML = rdReportCartao_(d, REPORT_COMO_FOI_, REPORT_MONDAY_URL_);
  document.getElementById('reportHist').innerHTML = rdHistoricoCartao_(d, lineChart);
  renderAcompanhamentoTopo_();
}
// Abertura, ritmo e relatórios do conselho dependem só da semana corrente: não mudam ao navegar entre semanas.
function renderAcompanhamentoTopo_(){
  var b = reportEstadoAtual_;
  document.getElementById('rdAbertura').innerHTML = rdAbertura_(b, REPORT_MONDAY_URL_);
  document.getElementById('rdRitmo').innerHTML = rdRitmo_(b);
  document.getElementById('rdRelatorios').innerHTML = b ? rdRelatoriosCartao_(b) : rdMsgCartao_('Relatórios do conselho', 'Carregando', 'Buscando os relatórios por preencher.', false);
}

function fmtHorasR_(h){ h = Number(h || 0); if (h >= 48) return Math.floor(h / 24) + ' dias'; return Math.round(h) + ' h'; }

// Um só ouvinte no painel inteiro: os chips de semana do cartão de críticos ficam fora do cartão do report.
function instalarEventosReport_(){
  var raiz = document.getElementById('aba-acompanhamento'); if (!raiz || raiz.getAttribute('data-eventos')) return;
  raiz.setAttribute('data-eventos', '1');
  raiz.addEventListener('click', function(ev){
    var alvo = ev.target.closest ? ev.target.closest('[data-report-acao="semana"]') : null;
    if (alvo && !alvo.disabled) carregarReport(reportCS_, alvo.getAttribute('data-semana'));
  });
}
if (document.getElementById('aba-acompanhamento')) instalarEventosReport_(); else document.addEventListener('DOMContentLoaded', instalarEventosReport_);

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
// Correção 13/10/2026: este script roda antes do HTML do modal de foto (que fica no fim do body), então
// o elemento ainda não existia, a chamada lançava erro e o arrasto do recorte nunca era ligado. Agora
// espera o documento terminar de carregar quando o modal ainda não está no DOM.
(function iniciarFotoCropEventos_(){
  var wrap = document.getElementById('fotoCropCanvasWrap');
  if (!wrap) { document.addEventListener('DOMContentLoaded', iniciarFotoCropEventos_); return; }
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
