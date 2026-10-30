// Ponto de montagem único do Vitorio (30/10/2026): botão flutuante, painel de resposta, convite de tour e os scripts.
// montarDock (lib/ui/tema.ts) anexa isto ao dock, então toda página que monta o dock ganha o Vitorio sem código próprio;
// a página /processos, que não tem dock, chama montarVitorio direto. Comportamento em public/vitorio.js, motor em public/vitorio-busca.js.
import { vitorioHtml, VITORIO_CSS, VITORIO_TAMANHOS } from './mascote.ts';

// Troque ao alterar public/vitorio.js ou public/vitorio-busca.js, para o navegador não usar a cópia antiga em cache.
export const VERSAO_SCRIPT_VITORIO = '20261030a';

export type PerfilVitorio = 'cs' | 'gestor';
const ABERTURA: Record<PerfilVitorio, string> = {
  gestor: 'Posso achar um processo, explicar um indicador ou levar você a uma tela.',
  cs: 'Posso achar um processo, explicar uma regra ou levar você à tela certa.',
};
const EXEMPLO: Record<PerfilVitorio, string> = {
  gestor: 'Exemplo: onde vejo o NPS',
  cs: 'Exemplo: quando vence o report semanal',
};

// Cores do tema (lib/ui/tema.ts) com reserva para páginas que não carregam os tokens, como /processos.
const PAINEL_CSS = `
#vitorio-raiz,.vt-tour-balao,.vt-tour-recorte{--vt-ink:var(--ink,#1A1A1A);--vt-ink2:var(--ink2,#5D5D5D);--vt-ink3:var(--ink3,#878585);--vt-gold:var(--gold,#C89A2E);--vt-gold-soft:var(--gold-soft,#F7EFDC);--vt-gold-ink:var(--gold-ink,#8A6410);--vt-line:var(--line2,#DAD7D7);--vt-bg:var(--surface,#fff)}
#vitorio-raiz,.vt-tour-balao{font-family:'Inter',system-ui,sans-serif;font-size:13.5px;line-height:1.45;color:var(--vt-ink)}
#vitorio-raiz [hidden]{display:none !important}
.vt-fab{position:fixed;right:20px;bottom:20px;z-index:70;width:68px;height:76px;padding:0;border:0;border-radius:20px;background:linear-gradient(160deg,#262626,#141414);box-shadow:0 10px 28px rgba(20,20,20,.28),inset 0 1px 0 rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;transition:transform .15s ease-out,box-shadow .15s}
.vt-fab:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(20,20,20,.34),inset 0 1px 0 rgba(255,255,255,.1)}
.vt-fab:active{transform:scale(.97)}
.vt-fab:focus-visible,.vt-painel button:focus-visible,.vt-tour-balao button:focus-visible,.vt-painel input:focus-visible,.vt-painel a:focus-visible,.vt-convite button:focus-visible,.vt-tour-balao button:focus-visible{outline:2px solid var(--vt-gold);outline-offset:2px}
.vt-fab .vitorio{margin-bottom:-6px}
.vt-fab .vitorio svg{animation-name:vt-flutua}
.vt-painel{position:fixed;right:20px;bottom:108px;z-index:75;width:min(400px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 128px));overflow:auto;background:var(--vt-bg);border:1px solid rgba(26,26,26,.08);border-radius:20px;box-shadow:0 24px 60px rgba(20,20,20,.22),0 2px 6px rgba(20,20,20,.06);display:flex;flex-direction:column}
.vt-topo{display:flex;gap:14px;align-items:flex-end;padding:18px 18px 8px;background:linear-gradient(180deg,var(--vt-gold-soft),transparent)}
.vt-topo .vitorio{margin-bottom:-4px}
.vt-fala{flex:1;min-width:0;font-size:13px;color:var(--vt-ink2);padding-bottom:10px}
.vt-fala b{display:block;font-family:'Bricolage Grotesque','Inter',sans-serif;font-size:17px;color:var(--vt-ink);letter-spacing:-.01em;margin-bottom:2px}
.vt-fechar{position:absolute;top:10px;right:10px;width:30px;height:30px;border:0;border-radius:9px;background:transparent;color:var(--vt-ink2);font-size:18px;line-height:1;cursor:pointer}
.vt-fechar:hover{background:rgba(26,26,26,.07);color:var(--vt-ink)}
.vt-form{padding:6px 18px 12px}
.vt-form label{display:block;font-size:12px;font-weight:700;color:var(--vt-ink2);margin-bottom:6px}
.vt-linha{display:flex;gap:8px}
.vt-form input{flex:1;min-width:0;height:40px;border:1px solid var(--vt-line);border-radius:11px;padding:0 12px;font:inherit;color:var(--vt-ink);background:#fff}
.vt-form input::placeholder{color:var(--vt-ink3)}
.vt-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 14px;border-radius:11px;border:1px solid var(--vt-ink);background:var(--vt-ink);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}
.vt-btn:disabled{opacity:.4;cursor:default}
.vt-btn.claro{background:#fff;color:var(--vt-ink);border-color:var(--vt-line)}
.vt-btn.claro:hover{border-color:var(--vt-ink)}
.vt-btn.sm{height:32px;padding:0 12px;font-size:12.5px;border-radius:9px}
.vt-resultado{padding:2px 18px 14px;min-height:20px}
.vt-msg{font-size:13px;color:var(--vt-ink2);padding:6px 0}
.vt-msg.erro{color:var(--red-ink,#A3342F)}
.vt-cartao{border:1px solid rgba(26,26,26,.08);border-radius:14px;padding:14px;margin-top:8px;background:#fff;box-shadow:0 1px 2px rgba(20,20,20,.04)}
.vt-origem{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--vt-gold-ink)}
.vt-cartao h3{margin:3px 0 6px;font-size:15px;font-weight:700;letter-spacing:-.01em}
.vt-trecho{margin:0 0 8px;color:var(--vt-ink2);font-size:13px}
.vt-trecho mark{background:var(--vt-gold-soft);color:var(--vt-ink);border-radius:3px;padding:0 2px;font-weight:600}
.vt-data{font-size:11.5px;color:var(--vt-ink3);margin:0 0 10px}
.vt-compacto{display:block;width:100%;text-align:left;border:1px solid rgba(26,26,26,.08);border-radius:12px;padding:10px 12px;margin-top:8px;background:#fff;color:inherit;text-decoration:none;font:inherit;cursor:pointer}
.vt-compacto:hover{border-color:var(--vt-ink)}
.vt-compacto b{display:block;font-size:13.5px}
.vt-compacto span{display:block;font-size:12.5px;color:var(--vt-ink2);margin-top:2px}
.vt-ajudou{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--vt-ink2)}
.vt-rodape{display:flex;justify-content:space-between;gap:8px;padding:10px 18px 14px;border-top:1px solid rgba(26,26,26,.06);margin-top:auto}
.vt-link{background:none;border:0;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:var(--vt-gold-ink);cursor:pointer;text-decoration:underline}
.vt-convite{position:fixed;right:20px;bottom:108px;z-index:71;width:min(300px,calc(100vw - 32px));background:#fff;border:1px solid rgba(26,26,26,.08);border-radius:16px;padding:14px;box-shadow:0 18px 44px rgba(20,20,20,.2)}
.vt-convite p{margin:0 0 10px;font-size:13px;font-weight:600}
.vt-convite div{display:flex;gap:8px}
.vt-tour-bloqueio{position:fixed;inset:0;z-index:200;background:transparent}
.vt-tour-recorte{position:fixed;z-index:201;border-radius:14px;box-shadow:0 0 0 9999px rgba(20,20,20,.62),0 0 0 2px var(--vt-gold, #C89A2E);pointer-events:none;transition:top .25s var(--spring,ease),left .25s var(--spring,ease),width .25s var(--spring,ease),height .25s var(--spring,ease)}
.vt-tour-balao{position:fixed;z-index:202;width:min(360px,calc(100vw - 24px));background:#fff;border-radius:18px;padding:14px 16px 14px;box-shadow:0 24px 60px rgba(20,20,20,.35);display:flex;gap:12px}
.vt-tour-balao .vitorio{align-self:flex-end;margin-bottom:-4px}
.vt-tour-corpo{flex:1;min-width:0}
.vt-tour-corpo h3{margin:0 0 4px;font-family:'Bricolage Grotesque','Inter',sans-serif;font-size:16px;letter-spacing:-.01em}
.vt-tour-corpo p{margin:0 0 10px;font-size:13px;color:var(--vt-ink2)}
.vt-tour-pe{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.vt-tour-pe .vt-cont{font-size:12px;font-weight:700;color:var(--vt-ink3);margin-right:auto}
@media (max-width:640px){
  .vt-fab{right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px))}
  .vt-painel{right:0;left:0;bottom:0;width:auto;max-height:86vh;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}
  .vt-convite{right:12px;bottom:calc(100px + env(safe-area-inset-bottom,0px))}
  .vt-tour-balao{left:12px !important;right:12px;top:auto !important;bottom:calc(12px + env(safe-area-inset-bottom,0px));width:auto}
}
@media (prefers-reduced-motion:reduce){.vt-fab,.vt-tour-recorte{transition:none}}
@media (prefers-reduced-transparency:reduce){.vt-topo{background:var(--vt-gold-soft)}}
`;

export const VITORIO_ESTILO = VITORIO_CSS + PAINEL_CSS;
// Folga no fim do conteúdo rolável em celular: altura do botão (76) mais a margem de baixo (12) e uma respiração (12), para o botão
// nunca cobrir a última linha. Vale para toda página que monta o Vitorio; /processos (corpo de altura fixa) pede folga: false.
export const FOLGA_CELULAR_CSS = '@media (max-width:640px){body{padding-bottom:calc(100px + env(safe-area-inset-bottom,0px))}}';

export function montarVitorio(perfil: PerfilVitorio, opcoes: { folga?: boolean } = {}): string {
  const v = '?v=' + VERSAO_SCRIPT_VITORIO;
  return '<style id="vitorioCss">' + VITORIO_ESTILO + (opcoes.folga === false ? '' : FOLGA_CELULAR_CSS) + '</style>' +
    '<div id="vitorio-raiz" data-perfil="' + perfil + '">' +
    '<button type="button" class="vt-fab" id="vtFab" data-tour="vitorio" aria-label="Pergunte ao Vitorio" aria-haspopup="dialog" aria-expanded="false" aria-controls="vtPainel">' + vitorioHtml('vtfab', VITORIO_TAMANHOS.botao) + '</button>' +
    '<div class="vt-convite" id="vtConvite" role="group" aria-label="Convite para o tour" hidden><p id="vtConviteTxt"></p><div><button type="button" class="vt-btn sm" id="vtConviteSim">Começar o tour</button><button type="button" class="vt-btn sm claro" id="vtConviteNao">Agora não</button></div></div>' +
    '<section class="vt-painel" id="vtPainel" role="dialog" aria-modal="true" aria-labelledby="vtTitulo" hidden>' +
    '<button type="button" class="vt-fechar" id="vtFechar" aria-label="Fechar">&times;</button>' +
    '<div class="vt-topo" id="vtTopo">' + vitorioHtml('vtpainel', VITORIO_TAMANHOS.painel) + '<div class="vt-fala"><b id="vtTitulo">Vitorio</b>' + ABERTURA[perfil] + '</div></div>' +
    '<form class="vt-form" id="vtForm" autocomplete="off"><label for="vtPergunta">Pergunte ao Vitorio</label><div class="vt-linha"><input type="text" id="vtPergunta" maxlength="200" placeholder="' + EXEMPLO[perfil] + '"><button type="submit" class="vt-btn">Buscar</button></div></form>' +
    '<div class="vt-resultado" id="vtResultado" aria-live="polite"></div>' +
    '<div class="vt-rodape"><button type="button" class="vt-link" id="vtRefazer">Refazer o tour desta página</button></div>' +
    '</section>' +
    '<template id="vtTourModelo">' + vitorioHtml('vttour', VITORIO_TAMANHOS.painel, 'apresentando') + '</template>' +
    '</div>' +
    '<script src="/vitorio-busca.js' + v + '" defer></script><script src="/vitorio.js' + v + '" defer></script>';
}
