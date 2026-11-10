// Metas semanais na tela (PR 2a), compartilhado pela home do CS (app/dashboard-html.ts) e pela página do CS na visão
// do gestor (app/gestor-cs-html.ts). Só desenha o que já veio calculado de lib/metas-semanais-visao.ts e do ritmo do
// servidor (calcularRitmo): nenhum status é calculado aqui. Nomes com prefixo ms para não colidir com cada página.
// Inclui o CSS (METAS_SEMANAIS_CSS) e o script (METAS_SEMANAIS_UI_SCRIPT); a página inclui os dois.

export const METAS_SEMANAIS_CSS = `
.av-alt{display:inline-flex;gap:4px;margin-left:auto;background:#EEEDED;border-radius:999px;padding:3px}
.av-btn{border:0;background:transparent;border-radius:999px;padding:5px 11px;font-size:11.5px;font-weight:700;color:#1A1A1A;cursor:pointer}
.av-btn.on{background:#1A1A1A;color:#fff}
.ms-sem{font-size:12px;color:#5A5A5A;margin:6px 0 10px}
.ms-card{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,2fr) auto;gap:4px 12px;align-items:center;padding:10px 0;border-bottom:0.5pt solid #E5E2E2}
.ms-card b{font-size:13px}
.ms-card.atras b{color:#8A6D1C}
.ms-barra{position:relative;height:8px;background:#E5E2E2;border-radius:99px}
.ms-barra>span{display:block;height:100%;border-radius:99px;background:#3D8B5F}
.ms-barra>span.gold{background:#C89A2E}
.ms-barra>i{position:absolute;top:-3px;bottom:-3px;width:2px;background:#1A1A1A;border-radius:2px}
.ms-card .ms-sub{grid-column:1 / -1;font-size:11.5px;color:#5A5A5A}
.ms-st{font-size:11px;font-weight:800;color:#1A1A1A}
.ms-det summary{cursor:pointer;font-size:11px;color:#5A5A5A;margin-top:4px}
.ms-det p{font-size:11.5px;color:#5A5A5A;margin:4px 0 0}
.ms-bloco{margin-bottom:12px}
.ms-bloco>b{font-size:13px}
.ms-linha{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;padding:4px 0;border-bottom:0.5pt solid #E5E2E2}
`;

export const METAS_SEMANAIS_UI_SCRIPT = `
function msEsc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function msNum_(v) { return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
function msData_(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
// Alternância de visão: opcoes é [[valor, rótulo], ...]; atual marca o botão ativo.
function msAlternancia_(opcoes, atual) {
  return '<div class="av-alt" role="group" aria-label="Visão das metas">' + opcoes.map(function (o) {
    return '<button type="button" class="av-btn' + (o[0] === atual ? ' on' : '') + '" data-visao="' + o[0] + '" aria-pressed="' + (o[0] === atual) + '">' + msEsc_(o[1]) + '</button>';
  }).join('') + '</div>';
}
// Liga os botões da alternância: aoEscolher recebe o valor escolhido e redesenha a seção.
function msLigarAlternancia_(el, aoEscolher) {
  el.querySelectorAll('.av-btn').forEach(function (b) {
    b.addEventListener('click', function () { aoEscolher(b.getAttribute('data-visao')); });
  });
}
var MS_ST_ = { no_ritmo: 'No ritmo', atencao: 'Atenção', atras: 'Atrás', cedo: 'Começando' };
// Semana corrente: cabeçalho com o intervalo e um cartão por indicador (linhas vindas de linhasSemanaAtual).
function msCorpoSemana_(s) {
  if (!s.linhas || !s.linhas.length) return '<div class="gh-vazio">Nenhuma meta mensal para derivar a semana. Peça ao gestor para cadastrar a meta do mês.</div>';
  var l0 = s.linhas[0];
  return '<p class="ms-sem">Semana de ' + msData_(l0.inicio) + ' a ' + msData_(l0.fim) + ', ' + l0.diasUteisDecorridos + ' de ' + l0.diasUteisTotal + ' dias úteis.</p>' + s.linhas.map(msCardSemana_).join('');
}
function msCardSemana_(x) {
  var sem = x.efetiva === null || x.efetiva === undefined;
  var pct = !sem && x.efetiva > 0 && x.realizado !== null ? Math.min(x.realizado / x.efetiva * 100, 100) : 0;
  var pace = !sem && x.previsto !== null && x.previsto !== undefined && x.efetiva > 0 ? Math.min(x.previsto / x.efetiva * 100, 100) : null;
  var st = sem ? 'Sem meta efetiva' : (x.status === null ? 'Sem apuração' : MS_ST_[x.status]);
  var atrasado = x.status === 'atras' || x.status === 'atencao';
  var real = x.realizado === null ? 'sem apuração' : msNum_(x.realizado);
  var sub = '<div class="ms-sub"><b class="ms-st">' + st + '</b>' + (x.falta === null || x.falta === undefined ? '' : ' · Faltam ' + msNum_(x.falta) + ' · ' + x.diasUteisRestantes + (x.diasUteisRestantes === 1 ? ' dia útil restante' : ' dias úteis restantes')) + '</div>';
  var det = '<details class="ms-det"><summary>Detalhe</summary><p>Base da semana: ' + (x.base === null ? 'sem base' : msNum_(x.base)) + '. Déficit herdado: ' + (x.deficitRecebido === null ? 'sem dado' : msNum_(x.deficitRecebido)) + '.</p>' +
    (x.semData ? '<p>' + x.semData + (x.semData === 1 ? ' item sem data no mês, fora desta conta.' : ' itens sem data no mês, fora desta conta.') + '</p>' : '') + '</details>';
  return '<div class="ms-card' + (atrasado ? ' atras' : '') + '"><b>' + msEsc_(x.label) + '</b>' +
    '<div class="ms-barra"><span class="' + (atrasado ? 'gold' : '') + '" style="width:' + pct.toFixed(0) + '%"></span>' + (pace !== null ? '<i style="left:' + pace.toFixed(0) + '%" title="Esperado até hoje"></i>' : '') + '</div>' +
    '<span>' + real + '<small>/' + (sem ? 'sem meta' : msNum_(x.efetiva)) + '</small></span>' +
    sub + det + '</div>';
}
// Semanas do mês: uma lista por indicador, com cada semana fechada (ou aguardando o fechamento de segunda).
function msCorpoSemanasMes_(s) {
  if (!s.fechadas || !s.fechadas.length) return '<div class="gh-vazio">Nenhuma semana fechada neste mês. O saldo de cada semana é calculado no fechamento de segunda.</div>';
  var grupos = {};
  s.fechadas.forEach(function (f) { (grupos[f.indicador] = grupos[f.indicador] || []).push(f); });
  return Object.keys(grupos).map(function (k) {
    var lista = grupos[k].slice().sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
    return '<div class="ms-bloco"><b>' + msEsc_(lista[0].label) + '</b>' + lista.map(function (f) {
      var txt = f.estado === 'aguardando_fechamento' ? 'Aguardando fechamento' : (f.atingiu === null ? 'Sem apuração' : (f.atingiu ? 'Atingiu' : 'Não atingiu'));
      var def = f.deficitTransferido ? ' Déficit levado: ' + msNum_(f.deficitTransferido) + '.' : '';
      return '<div class="ms-linha"><span>' + msData_(f.inicio) + ' a ' + msData_(f.fim) + '</span><span>' + (f.realizado === null ? 'sem apuração' : msNum_(f.realizado)) + ' de ' + (f.efetiva === null ? 'sem meta' : msNum_(f.efetiva)) + '</span><em>' + txt + '.' + def + '</em></div>';
    }).join('') + '</div>';
  }).join('');
}
`;
