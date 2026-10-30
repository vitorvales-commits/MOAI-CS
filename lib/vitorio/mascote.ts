// Mascote Vitorio (30/10/2026): moai dourado em busto. A geometria é a de docs/vitorio/vitorio-referencia.svg, sem alterar a
// silhueta. Mudanças em relação à referência: as três faixas planas de luz da cabeça viram um gradiente horizontal suave
// (mesmas cores), os ids ficam prefixados por idUnico para haver várias instâncias na mesma página, e os alvos de animação
// são classes (vt-*) em vez de ids.
//
// Estados por atributo no elemento raiz: <span class="vitorio" data-estado="neutro|respondendo|nada|apresentando">.
export type EstadoVitorio = 'neutro' | 'respondendo' | 'nada' | 'apresentando';
export const VITORIO_TAMANHOS = { botao: 56, painel: 112 } as const;
const LARGURA = 200;
const ALTURA = 262;

export function vitorioSvg(idUnico: string): string {
  const id = idUnico.replace(/[^A-Za-z0-9_-]/g, '');
  const cabeca = 'M66 42 C66 30 74 26 100 26 C126 26 134 30 134 42 L138 150 L140 200 C140 214 128 220 100 220 C72 220 60 214 60 200 L62 150 Z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + LARGURA + ' ' + ALTURA + '" focusable="false" aria-hidden="true">' +
    '<defs><clipPath id="' + id + '-clip"><path d="' + cabeca + '"/></clipPath>' +
    '<linearGradient id="' + id + '-luz" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#BE8E1E"/><stop offset=".22" stop-color="#C99822"/><stop offset=".5" stop-color="#E6BA44"/>' +
    '<stop offset=".72" stop-color="#C39320"/><stop offset="1" stop-color="#A87A16"/></linearGradient></defs>' +
    '<g class="vt-corpo">' +
    '<path d="M26 254 C24 222 30 196 52 189 C65 185 73 191 75 199 L125 199 C127 191 135 185 148 189 C170 196 176 222 174 254 Z" fill="#B8861C"/>' +
    '<path d="M34 230 C34 206 42 196 54 193 C46 202 42 214 42 230 Z" fill="#D9AA34"/>' +
    '<path d="M160 230 C160 210 156 200 148 194 C162 198 168 212 168 230 Z" fill="#9A6E12"/>' +
    '<ellipse cx="100" cy="222" rx="42" ry="6" fill="#7A5410"/>' +
    '<g class="vt-cabeca">' +
    '<polygon points="51,74 62,70 64,162 53,166" fill="#C4931F"/><polygon points="51,74 55,73 57,164 53,166" fill="#E2B440"/>' +
    '<polygon points="138,70 149,74 147,166 136,162" fill="#9A6E12"/>' +
    '<path d="' + cabeca + '" fill="#D2A02A"/>' +
    '<g clip-path="url(#' + id + '-clip)"><rect x="56" y="20" width="90" height="210" fill="url(#' + id + '-luz)"/>' +
    '<polygon class="vt-brilho" points="52,0 66,0 30,262 16,262" fill="#FFF0BE"/></g>' +
    '<path d="M66 42 C66 30 74 26 100 26 C126 26 134 30 134 42 C118 37 82 37 66 42 Z" fill="#ECC659"/>' +
    '<g class="vt-sobr"><ellipse cx="80" cy="101" rx="13" ry="7" fill="#8C6210"/><ellipse cx="120" cy="101" rx="13" ry="7" fill="#7E570E"/>' +
    '<path d="M65 86 C80 80 120 80 135 86 L135 95 C120 91 80 91 65 95 Z" fill="#EFC75A"/>' +
    '<path d="M65 95 C80 91 120 91 135 95 L134 99 C120 95 80 95 66 99 Z" fill="#9A6E12"/></g>' +
    '<path d="M94 94 L106 94 L109 126 C120 128 125 136 121 142 C115 149 85 149 79 142 C75 136 80 128 91 126 Z" fill="#C99620"/>' +
    '<path d="M94 94 L98 94 L96 128 L91 127 Z" fill="#EDC456"/>' +
    '<path d="M82 133 C84 129 90 127 94 128" fill="none" stroke="#E6BA44" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="92" cy="141" rx="5" ry="3" fill="#6E4A0C"/><ellipse cx="108" cy="141" rx="5" ry="3" fill="#6E4A0C"/>' +
    '<path d="M82 158 C92 152 108 152 118 158 C108 162 92 162 82 158 Z" fill="#B88A1C"/>' +
    '<ellipse class="vt-boca" cx="100" cy="159" rx="13" ry="1.6" fill="#6E4A0C"/>' +
    '<path d="M64 203 C76 212 124 212 136 203" fill="none" stroke="#EAC255" stroke-width="2.5" stroke-linecap="round"/>' +
    '</g></g>' +
    '<g class="vt-balao"><rect x="148" y="10" width="46" height="26" rx="13" fill="#1A1A1A"/>' +
    '<circle class="vt-ponto" cx="160" cy="23" r="3" fill="#F5D273"/><circle class="vt-ponto" cx="171" cy="23" r="3" fill="#F5D273"/><circle class="vt-ponto" cx="182" cy="23" r="3" fill="#F5D273"/></g>' +
    '<text class="vt-interr" x="156" y="58" font-size="32" font-weight="800" font-family="Bricolage Grotesque,Inter,sans-serif" fill="#D2A02A">?</text>' +
    '</svg>';
}

// Elemento raiz já com o tamanho (px de largura) e o estado inicial.
export function vitorioHtml(idUnico: string, tamanho: number, estado: EstadoVitorio = 'neutro'): string {
  return '<span class="vitorio" data-estado="' + estado + '" style="--vt-l:' + tamanho + 'px;--vt-u:' + (LARGURA / tamanho).toFixed(3) + '">' + vitorioSvg(idUnico) + '</span>';
}

// Tudo em unidades do desenho (user units); --vt-u converte px reais em unidades, então 6 px na tela são 6 px em qualquer tamanho.
export const VITORIO_CSS = `
.vitorio{display:inline-block;width:var(--vt-l,56px);line-height:0;flex:none}
.vitorio svg{width:100%;height:auto;display:block;overflow:visible}
.vitorio .vt-cabeca,.vitorio .vt-sobr,.vitorio .vt-boca,.vitorio .vt-ponto,.vitorio .vt-interr{transform-box:view-box}
.vitorio .vt-boca{transform-box:fill-box;transform-origin:center}
.vitorio .vt-balao,.vitorio .vt-interr{opacity:0}
.vitorio .vt-brilho{opacity:.4;transform:translateX(-90px)}
@keyframes vt-flutua{from{transform:translateY(0)}to{transform:translateY(-6px)}}
@keyframes vt-reflexo{0%,62%{transform:translateX(-90px)}100%{transform:translateX(190px)}}
@keyframes vt-fala{0%,100%{transform:scaleY(1)}50%{transform:scaleY(4.5)}}
@keyframes vt-sobe{from{transform:translateY(0)}to{transform:translateY(calc(var(--vt-u) * -2px))}}
@keyframes vt-ponto{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
@keyframes vt-inclina{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes vt-interr{from{transform:translateY(0)}to{transform:translateY(-6px)}}
@keyframes vt-aceno-a{0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(5px) rotate(2deg)}}
@keyframes vt-aceno-b{0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(5px) rotate(2deg)}}
.vitorio .vt-cabeca{transform-origin:100px 200px}
.vitorio[data-estado=neutro] svg,.vitorio[data-estado=apresentando] svg,.vitorio[data-estado=respondendo] svg{animation:vt-flutua 3.4s ease-in-out infinite alternate}
.vitorio[data-estado=neutro] .vt-brilho,.vitorio[data-estado=apresentando] .vt-brilho{animation:vt-reflexo 5.5s ease-in-out infinite}
.vitorio[data-estado=respondendo] .vt-boca{animation:vt-fala .6s ease-in-out infinite}
.vitorio[data-estado=respondendo] .vt-sobr{animation:vt-sobe .3s ease-out forwards}
.vitorio[data-estado=respondendo] .vt-balao{opacity:1}
.vitorio[data-estado=respondendo] .vt-ponto{animation:vt-ponto 1s ease-in-out infinite}
.vitorio[data-estado=respondendo] .vt-ponto:nth-of-type(2){animation-delay:.15s}
.vitorio[data-estado=respondendo] .vt-ponto:nth-of-type(3){animation-delay:.3s}
.vitorio[data-estado=nada] .vt-cabeca{animation:vt-inclina 3.6s ease-in-out infinite alternate}
.vitorio[data-estado=nada] .vt-interr{opacity:1;animation:vt-interr 2.2s ease-in-out infinite alternate}
.vitorio[data-estado=apresentando][data-aceno="1"] .vt-cabeca{animation:vt-aceno-a .7s ease-in-out}
.vitorio[data-estado=apresentando][data-aceno="2"] .vt-cabeca{animation:vt-aceno-b .7s ease-in-out}
@media (prefers-reduced-motion:reduce){
  .vitorio svg,.vitorio .vt-cabeca,.vitorio .vt-brilho,.vitorio .vt-boca,.vitorio .vt-sobr,.vitorio .vt-ponto,.vitorio .vt-interr{animation:none !important}
}
`;
