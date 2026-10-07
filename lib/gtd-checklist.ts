// Componente ÚNICO do checklist do GTD de conselho (07/10/2026). As páginas do projeto são strings
// de HTML, CSS e JS sem módulo compartilhado em tempo de execução, então este arquivo exporta o
// CSS e o JS uma vez e cada página os injeta na própria string. Proibido criar segunda
// implementação do checklist. Somente leitura: ninguém marca etapa por aqui.
//
// O JS abaixo não usa crase, interpolação nem barra invertida, para sobreviver a ser embutido em
// outra template literal sem escapes. O dado vem pronto de lib/gtd.ts (etapas com rotulo, dias e
// bloco), então não há regex nem regra de negócio aqui.
//
// API (JS):
//   gtdCicloHtml_(ciclo)            checklist de um ciclo: cabeçalho, atrasadas, blocos antes e depois
//   gtdSecaoHtml_(chave, gtd)       seletor de ciclo mais o ciclo escolhido (gtd = { vinculado, ciclos })

export const GTD_CHECKLIST_STYLE = `
.gtdx-vazio{padding:14px 16px;border-radius:12px;background:#F5F5F5;color:#6F6C6C;font-size:13px;line-height:1.5;}
.gtdx-seletor{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;font-weight:700;color:#6F6C6C;}
.gtdx-seletor select{font:inherit;font-weight:600;color:#1A1A1A;padding:6px 10px;border-radius:8px;border:1px solid #D8D5D5;background:#fff;max-width:100%;}
.gtdx-cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
.gtdx-taxa{font-weight:800;font-size:15px;color:#1A1A1A;}
.gtdx-meta{font-size:12px;color:#807E7E;}
.gtdx-barra{height:6px;border-radius:99px;background:#E9E9E9;overflow:hidden;margin-bottom:12px;}
.gtdx-barra > i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#C89A2E,#3D8B5F);}
.gtdx-atraso{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#FBEEEC;color:#C0433D;border:1px solid #EBC6C0;}
.gtdx-atual{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#F4EBD3;color:#7A5C14;}
.gtdx-bloco{margin-top:10px;}
.gtdx-bloco-titulo{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#807E7E;margin-bottom:6px;}
.gtdx-etapa{display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:1px solid #EFEDED;font-size:13px;line-height:1.35;color:#1A1A1A;}
.gtdx-etapa:last-child{border-bottom:none;}
.gtdx-ico{flex:0 0 18px;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-top:1px;background:#E9E9E9;color:#807E7E;}
.gtdx-etapa.feito .gtdx-ico{background:#3D8B5F;color:#fff;}
.gtdx-etapa.atrasada .gtdx-ico{background:#C0433D;color:#fff;}
.gtdx-etapa.atrasada .gtdx-rot{color:#C0433D;font-weight:600;}
.gtdx-ico svg{width:11px;height:11px;}
.gtdx-dias{margin-left:auto;flex:0 0 auto;font-size:11px;color:#9F9F9F;white-space:nowrap;padding-left:8px;}
.gtdx-nota{margin-top:10px;font-size:11.5px;color:#9F9F9F;}
`;

export const GTD_CHECKLIST_SCRIPT = `
var GTDX_CICLOS_ = {};
function gtdEsc_(s){
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function gtdDataBR_(iso){
  if (!iso) return null;
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
var GTDX_ICO_FEITO_ = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6.5 5,9 10,3"/></svg>';
var GTDX_ICO_ABERTO_ = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><polyline points="6,3.8 6,6 7.6,7"/></svg>';
function gtdDiasTexto_(e, bloco){
  if (e.dias === null || e.dias === undefined) return '';
  return e.dias + (e.dias === 1 ? ' dia ' : ' dias ') + (bloco === 'antes' ? 'antes' : 'depois');
}
function gtdBlocoHtml_(titulo, etapas, atrasadas, bloco){
  if (!etapas || !etapas.length) return '';
  var html = '<div class="gtdx-bloco"><div class="gtdx-bloco-titulo">' + gtdEsc_(titulo) + '</div>';
  etapas.forEach(function(e){
    var atrasada = !e.feito && atrasadas.indexOf(e.label) !== -1;
    html += '<div class="gtdx-etapa' + (e.feito ? ' feito' : (atrasada ? ' atrasada' : '')) + '">' +
      '<span class="gtdx-ico">' + (e.feito ? GTDX_ICO_FEITO_ : GTDX_ICO_ABERTO_) + '</span>' +
      '<span class="gtdx-rot">' + gtdEsc_(e.rotulo) + '</span>' +
      '<span class="gtdx-dias">' + gtdEsc_(gtdDiasTexto_(e, bloco)) + '</span></div>';
  });
  return html + '</div>';
}
function gtdCicloHtml_(c){
  if (!c) return '<div class="gtdx-vazio">Sem ciclo de GTD para este conselho.</div>';
  var atrasadas = c.etapasAtrasadas || [];
  var pct = (c.taxa === null || c.taxa === undefined) ? null : Math.max(0, Math.min(100, Math.round(c.taxa)));
  var html = '<div class="gtdx-cab">' +
    '<span class="gtdx-taxa">' + (pct === null ? 'Sem taxa' : pct + '% cumprido') + '</span>' +
    '<span class="gtdx-meta">' + c.feitas + ' de ' + c.total + ' etapas</span>' +
    (c.atual ? '<span class="gtdx-atual">Ciclo atual</span>' : '') +
    (atrasadas.length ? '<span class="gtdx-atraso">' + atrasadas.length + (atrasadas.length === 1 ? ' etapa atrasada' : ' etapas atrasadas') + '</span>' : '') +
    '</div>' +
    '<div class="gtdx-barra"><i style="width:' + (pct === null ? 0 : pct) + '%"></i></div>' +
    '<div class="gtdx-meta">Conselho em ' + gtdEsc_(gtdDataBR_(c.dataConselho) || 'data não informada') +
    (c.dataSnapshot ? ' · posição de ' + gtdEsc_(gtdDataBR_(c.dataSnapshot)) : '') + '</div>';
  html += gtdBlocoHtml_('Antes do conselho', c.antes, atrasadas, 'antes');
  html += gtdBlocoHtml_('Depois do conselho', c.depois, atrasadas, 'depois');
  html += gtdBlocoHtml_('Etapas sem prefixo de dias', c.semPrefixo, atrasadas, 'depois');
  return html;
}
function gtdSecaoHtml_(chave, gtd){
  var seguro = String(chave).replace(/[^a-zA-Z0-9_]/g, '_');
  if (!gtd || !gtd.vinculado || !gtd.ciclos || !gtd.ciclos.length) {
    return '<div class="gtdx-vazio">Nenhum ciclo de GTD vinculado a este conselho. O ciclo é ligado pelo nome do conselheiro, igual à visão do CS.</div>';
  }
  GTDX_CICLOS_[seguro] = gtd.ciclos;
  var opcoes = gtd.ciclos.map(function(c, i){
    return '<option value="' + i + '">' + (c.atual ? 'Ciclo atual, ' : '') + gtdEsc_(gtdDataBR_(c.dataConselho) || 'sem data') + '</option>';
  }).join('');
  var seletor = gtd.ciclos.length > 1
    ? '<div class="gtdx-seletor"><label>Ciclo <select class="gtdx-sel" data-gtdx="' + seguro + '">' + opcoes + '</select></label></div>'
    : '';
  return seletor + '<div id="gtdx-ciclo-' + seguro + '">' + gtdCicloHtml_(gtd.ciclos[0]) + '</div>';
}
document.addEventListener('change', function(ev){
  var el = ev.target;
  if (!el || !el.classList || !el.classList.contains('gtdx-sel')) return;
  var chave = el.getAttribute('data-gtdx');
  var alvo = document.getElementById('gtdx-ciclo-' + chave);
  var ciclos = GTDX_CICLOS_[chave];
  if (alvo && ciclos) alvo.innerHTML = gtdCicloHtml_(ciclos[Number(el.value)]);
});
`;
