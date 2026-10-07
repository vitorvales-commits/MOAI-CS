// Radar SVG feito à mão, sem lib externa. Componente ÚNICO: a visão da área e a página do CS na
// visão do gestor injetam este mesmo script (as páginas do projeto são strings sem módulo
// compartilhado em tempo de execução). Sem crase, interpolação nem barra invertida no JS, para ser
// embutido em outra template literal sem escapes.
export const RADAR_SVG_SCRIPT = `
// ============ radar SVG (feito à mão, sem lib externa) ============
// Eixos e valores (escala 0-150, 100 = bateu a meta, capado em 150) vêm prontos do back-end em
// data.radarEixos / cs.radar — este código só desenha, nunca recalcula.

function polarPonto(cx, cy, r, i, total) {
  var a = (Math.PI * 2 * i / total) - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
// Valor null no eixo = sem meta (ou sem dado): o vértice é pulado no polígono e o eixo ganha um
// marcador vazio no anel de 100 por cento, com o rótulo "sem meta". Nunca desenhado como zero
// (07/10/2026). viewBox mais largo que o gráfico: os rótulos longos (Matchmakings, Indicações) não
// são mais cortados nas bordas do card.
function radarSVG(labels, valores, gradId, largura) {
  var W = 380, H = 280, cx = W / 2, cy = 134, rMax = 86, total = labels.length;
  var svg = '<svg width="' + (largura || 300) + '" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:100%;height:auto" role="img" aria-label="Radar dos indicadores">';
  [{ f: 50 / 150, dash: '3,3' }, { f: 100 / 150, dash: '0' }, { f: 1, dash: '3,3' }].forEach(function (anel) {
    var pts = '';
    for (var i = 0; i < total; i++) { var p = polarPonto(cx, cy, rMax * anel.f, i, total); pts += p.x + ',' + p.y + ' '; }
    svg += '<polygon points="' + pts + '" fill="none" stroke="#D8D5D5" stroke-width="1" stroke-dasharray="' + anel.dash + '"/>';
  });
  for (var i = 0; i < total; i++) {
    var p = polarPonto(cx, cy, rMax, i, total);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x + '" y2="' + p.y + '" stroke="#D8D5D5" stroke-width="1"/>';
    var lp = polarPonto(cx, cy, rMax + 14, i, total);
    var anchor = 'middle'; if (lp.x > cx + 4) anchor = 'start'; else if (lp.x < cx - 4) anchor = 'end';
    var semMeta = valores[i] === null || valores[i] === undefined;
    svg += '<text x="' + lp.x + '" y="' + lp.y + '" font-size="9.5" fill="' + (semMeta ? '#B5B1B1' : '#6F6C6C') + '" font-family="Inter,sans-serif" text-anchor="' + anchor + '" dominant-baseline="middle">' + labels[i] + (semMeta ? ' (sem meta)' : '') + '</text>';
  }
  var pts = '', marcadores = '';
  for (var i = 0; i < total; i++) {
    if (valores[i] === null || valores[i] === undefined) {
      var pm = polarPonto(cx, cy, rMax * 100 / 150, i, total);
      marcadores += '<circle cx="' + pm.x + '" cy="' + pm.y + '" r="3.2" fill="#fff" stroke="#9F9F9F" stroke-width="1.2" stroke-dasharray="2,1.5"/>';
      continue;
    }
    var v = Math.max(0, Math.min(150, valores[i])) / 150; var pp = polarPonto(cx, cy, rMax * v, i, total);
    pts += pp.x + ',' + pp.y + ' ';
    marcadores += '<circle cx="' + pp.x + '" cy="' + pp.y + '" r="2.6" fill="#141414"/>';
  }
  if (pts) svg += '<polygon points="' + pts + '" fill="url(#' + gradId + ')" stroke="#C89A2E" stroke-width="1.6" fill-opacity="0.55"/>';
  svg += marcadores;
  svg += '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C89A2E"/><stop offset="100%" stop-color="#3D8B5F"/></linearGradient></defs></svg>';
  return svg;
}
`;
