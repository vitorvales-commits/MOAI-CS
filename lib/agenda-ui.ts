// Estilo e configuração do componente único da agenda de conselhos (13/10/2026). O comportamento fica em
// public/agenda-cs.js, que é o único script da agenda: a home (app/dashboard-html.ts), a visão do CS
// dentro da home e a página do CS aberta pelo gestor (app/gestor/cs/[nome]) carregam esse mesmo
// arquivo. Este módulo não repete limiares: as faixas vêm de SEMAFORO_CONFIRMADOS e os turnos de
// AGENDA_TURNOS em lib/constants.ts.
import { SEMAFORO_CONFIRMADOS, AGENDA_TURNOS, AGENDA_COR_MODO, ROUND_STATUS_COR, AGENDA_PASSADO_COR } from './constants';

// Config lida pelo script do cliente. JSON escapado para caber dentro de <script>.
export function agendaConfigJson(): string {
  const cfg = {
    faixas: SEMAFORO_CONFIRMADOS,
    turnos: AGENDA_TURNOS,
    roundCor: ROUND_STATUS_COR,
    corModo: AGENDA_COR_MODO,
    passadoCor: AGENDA_PASSADO_COR,
  };
  return JSON.stringify(cfg).replace(/</g, '\\u003c');
}

// Cor da faixa de exceção: vermelho e laranja são as únicas que pintam o cartão de alerta.
export const AGENDA_CSS = `
.ag-bloco { font-family:'Inter',sans-serif; color:#1A1A1A; text-align:left; }
.ag-cab { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
.ag-rotulo { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:12px; font-weight:600; letter-spacing:0.4px; color:#14213D; text-transform:uppercase; }
.ag-controles { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.ag-btn { font:inherit; font-size:11.5px; font-weight:700; color:#1A1A1A; background:#fff; border:0.75pt solid #D8D5D5; border-radius:999px; padding:6px 12px; cursor:pointer; line-height:1.2; }
.ag-btn:hover { background:#F5F5F5; }
.ag-btn[aria-pressed="true"] { background:#14213D; border-color:#14213D; color:#fff; }
.ag-btn:disabled { opacity:0.4; cursor:default; }
.ag-btn:focus-visible, .ag-card:focus-visible, .ag-modal-fechar:focus-visible { outline:2px solid #F4A21B; outline-offset:2px; }
.ag-seletor { display:inline-flex; gap:4px; background:#EEECEC; border-radius:999px; padding:3px; }
.ag-seletor .ag-btn { border:0; background:transparent; }
.ag-seletor .ag-btn[aria-pressed="true"] { background:#14213D; color:#fff; }
.ag-resumo { font-size:13px; color:#3A3A3A; margin:4px 0 12px; line-height:1.5; overflow-wrap:anywhere; }
.ag-legenda { display:flex; flex-wrap:wrap; gap:6px 14px; font-size:11px; color:#5D5D5D; margin-bottom:12px; }
.ag-legenda-item { display:inline-flex; align-items:center; gap:6px; }
.ag-lamp { display:inline-block; width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.ag-grade { display:grid; grid-template-columns:76px repeat(var(--ag-dias,5), minmax(0,1fr)); border:0.75pt dashed #C6C4C4; border-radius:12px; background:#fff; overflow:hidden; }
.ag-cab-dia { padding:8px 6px; text-align:center; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; font-weight:600; color:#5D5D5D; border-bottom:0.75pt dashed #C6C4C4; min-width:0; }
.ag-cab-dia.hoje { background:#FFF6E5; color:#8A5A00; }
.ag-eixo { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; font-weight:600; color:#5D5D5D; padding:8px 6px; border-top:0.75pt dashed #C6C4C4; border-right:0.75pt dashed #C6C4C4; text-transform:uppercase; }
.ag-celula { min-height:64px; padding:6px; border-top:0.75pt dashed #C6C4C4; border-left:0.75pt dashed #C6C4C4; display:flex; flex-direction:column; gap:6px; min-width:0; }
.ag-celula.hoje { background:rgba(244,162,27,0.07); }
.ag-card { font:inherit; font-size:12px; text-align:left; width:100%; display:block; min-width:0; background:#fff; color:#1A1A1A; border:0.75pt solid #D8D5D5; border-radius:10px; padding:8px 9px; cursor:pointer; transition:box-shadow .15s; }
.ag-card:hover { box-shadow:0 6px 16px rgba(20,33,61,0.10); }
.ag-card.alerta { border-color:var(--ag-faixa); background:var(--ag-fundo); }
.ag-card.semaforo { background:var(--ag-faixa); color:var(--ag-texto); border-color:var(--ag-faixa); }
.ag-card.semaforo .ag-sub, .ag-card.semaforo .ag-cobranca { color:inherit; opacity:0.92; }
.ag-card.passado .ag-sub { color:#64748B; }
.ag-card.passado .ag-nome { color:#3A3A3A; }
.ag-card.round { border-left:4px solid #14213D; }
.ag-topo { display:flex; align-items:center; justify-content:space-between; gap:6px; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; font-weight:600; }
.ag-direita { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.ag-corpo-card { display:flex; gap:8px; align-items:center; margin-top:6px; min-width:0; }
.ag-foto { width:30px; height:30px; border-radius:50%; object-fit:cover; flex-shrink:0; background:#EEECEC; display:block; }
.ag-iniciais { width:30px; height:30px; border-radius:50%; border:1px dashed #9F9F9F; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#5D5D5D; flex-shrink:0; }
.ag-texto { min-width:0; flex:1; }
.ag-nome { font-size:12.5px; font-weight:700; line-height:1.3; overflow-wrap:anywhere; }
.ag-sub { font-size:10.5px; color:#5D5D5D; line-height:1.35; margin-top:2px; overflow-wrap:anywhere; }
.ag-cobranca { font-size:10.5px; font-weight:800; margin-top:4px; color:var(--ag-faixa-texto,#8A2A24); }
.ag-pill { font-size:9.5px; font-weight:800; padding:2px 8px; border-radius:99px; color:#fff; display:inline-block; white-space:nowrap; }
.ag-lista { display:flex; flex-direction:column; gap:14px; }
.ag-lista-dia-titulo { font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11.5px; font-weight:600; color:#14213D; text-transform:uppercase; margin-bottom:6px; }
.ag-lista-itens { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr)); gap:8px; }
.ag-vazio { text-align:center; padding:36px 16px; color:#807E7E; font-size:12.5px; background:#fff; border:0.75pt dashed #D8D5D5; border-radius:16px; }
.ag-erro { color:#8A2A24; }
.ag-modal-fundo { position:fixed; inset:0; background:rgba(20,33,61,0.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:999; }
.ag-modal { background:#fff; color:#1A1A1A; border-radius:16px; max-width:440px; width:100%; max-height:85vh; overflow:auto; padding:20px 22px; box-sizing:border-box; font-family:'Inter',sans-serif; }
.ag-modal h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:18px; margin:0 0 4px; overflow-wrap:anywhere; }
.ag-modal dl { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; font-size:12.5px; margin:12px 0; }
.ag-modal dt { color:#807E7E; font-weight:700; }
.ag-modal dd { margin:0; overflow-wrap:anywhere; }
.ag-modal ul { margin:4px 0 0; padding-left:18px; font-size:12.5px; }
.ag-modal-fechar { font:inherit; font-size:12px; font-weight:700; color:#fff; background:#14213D; border:0; border-radius:999px; padding:8px 16px; cursor:pointer; margin-top:8px; }
@media (max-width:700px) {
  .ag-grade { display:none; }
  .ag-seletor-visao { display:none; }
  .ag-cab { flex-direction:column; align-items:stretch; }
  .ag-lista-itens { grid-template-columns:minmax(0,1fr); }
  .ag-lista, .ag-lista > div, .ag-bloco { min-width:0; max-width:100%; }
}
`;
