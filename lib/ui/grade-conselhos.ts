// Grade de cartões dos conselhos, compartilhada pela aba Conselhos do gestor e por Meus conselhos do
// CS (22/10/2026). Só desenha o que /api/conselhos-grade já calculou: situação, selos, atas e
// presença vêm prontos do servidor. Ordenar e filtrar por CS é reordenação em memória.
// O script não usa barra invertida nem crase, para viver dentro de template string.

export const GRADE_CONSELHOS_CSS = `
.gc-ctl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 18px 14px}
.gc-ctl label,.gc-lbl{font-size:12px;font-weight:600;color:var(--ink2)}
.gc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;padding:0 18px 18px}
.gc-card{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line2);border-radius:16px;overflow:hidden;color:var(--ink);text-decoration:none;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.gc-card:hover{transform:translateY(-2px);border-color:var(--ink);box-shadow:0 10px 24px rgba(20,20,20,.08)}
.gc-card.congelado .gc-foto img,.gc-card.congelado .gc-foto .gc-ini{filter:grayscale(1);opacity:.55}
.gc-foto{position:relative;aspect-ratio:4/3;background:var(--bg)}
.gc-foto img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
.gc-ini{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;color:var(--ink3)}
.gc-selo{position:absolute;top:10px;left:10px;background:rgba(255,255,255,.92)}
.gc-selo.gold{background:var(--gold-soft)}
.gc-health{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.92);border-radius:99px;font-size:11px;font-weight:700;padding:3px 9px;color:var(--ink)}
.gc-corpo{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
.gc-nome{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:700;line-height:1.15;letter-spacing:-0.01em}
.gc-nivel{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3)}
.gc-lin{font-size:12px;color:var(--ink2);line-height:1.4}
.gc-lin b{color:var(--ink);font-weight:600}
.gc-rod{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:8px;margin-top:2px;font-size:12px;color:var(--ink2)}
.gc-var{font-weight:700}
.gc-var.queda{color:var(--red-ink)}
.gc-atas{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:var(--ink2)}
.gc-sk{height:300px;border-radius:16px;background:linear-gradient(90deg,var(--line) 25%,#F6F5F5 50%,var(--line) 75%);background-size:200% 100%;animation:gcbrilho 1.3s linear infinite}
@keyframes gcbrilho{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.gc-sk{animation:none}}
.gc-vazio{padding:22px 18px;font-size:13px;color:var(--ink2)}
.gc-erro{padding:16px 18px;font-size:12.5px;color:var(--red-ink);background:var(--red-soft);border-radius:10px;margin:0 18px 18px}
.gc-barras{padding:0 18px 18px;display:flex;flex-direction:column;gap:10px}
.gc-barra{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr) 34px;gap:12px;align-items:center;font-size:13px;text-decoration:none;color:var(--ink)}
.gc-bnome{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gc-bnome small{color:var(--ink3);font-size:12px;margin-left:6px}
.gc-bval{font-weight:700;text-align:right}
.gc-barra:hover .gc-bnome{text-decoration:underline}
.gc-impacto-tot{display:flex;gap:18px;flex-wrap:wrap;padding:0 18px 12px;font-size:13px;color:var(--ink2)}
.gc-impacto-tot b{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;color:var(--ink);margin-right:5px}
@media (max-width:560px){.gc-grid{grid-template-columns:1fr 1fr;gap:10px;padding:0 12px 14px}.gc-ctl{padding:0 12px 12px}.gc-barra{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 28px}}
`;

export const GRADE_CONSELHOS_SCRIPT = `
var GC_ = { cards: [], ordem: 'produto', cs: '', mes: '', ano: 0, comCS: false, raiz: null, ctl: null };
function gcEsc_(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(ch){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]; }); }
function gcIniciais_(nome){ return String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map(function(p){ return p.charAt(0).toUpperCase(); }).join(''); }
function gcData_(iso){
  try { return new Intl.DateTimeFormat('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' }).format(new Date(iso)); }
  catch (e) { return ''; }
}
function gcSkeleton(raizId){
  var h = '';
  for (var i = 0; i < 6; i++) h += '<span class="gc-sk"></span>';
  document.getElementById(raizId).innerHTML = '<div class="gc-grid">' + h + '</div>';
}
function gcErro(raizId, msg){
  document.getElementById(raizId).innerHTML = '<div class="gc-erro" role="alert">Não foi possível montar esta seção: ' + gcEsc_(msg) + '</div>';
}
// opcoes: { raizId, ctlId, grade, mes, ano, comCS }
function gcIniciar(opcoes){
  GC_.cards = (opcoes.grade && opcoes.grade.cards) || [];
  GC_.mes = opcoes.mes; GC_.ano = opcoes.ano; GC_.comCS = !!opcoes.comCS;
  GC_.raiz = document.getElementById(opcoes.raizId); GC_.ctl = document.getElementById(opcoes.ctlId);
  GC_.cs = '';
  gcControles_(); gcDesenhar_();
}
function gcControles_(){
  var cs = {};
  GC_.cards.forEach(function(c){ cs[c.csResponsavel] = 1; });
  var opts = '<option value="">Todos os CS</option>' + Object.keys(cs).sort().map(function(n){ return '<option value="' + gcEsc_(n) + '"' + (GC_.cs === n ? ' selected' : '') + '>' + gcEsc_(n) + '</option>'; }).join('');
  GC_.ctl.innerHTML =
    '<span class="gc-lbl">Ordenar por</span>' +
    '<div class="seg" role="group" aria-label="Ordenar conselhos">' +
      '<button type="button" data-gc-ordem="produto" class="' + (GC_.ordem === 'produto' ? 'on' : '') + '">Produto</button>' +
      '<button type="button" data-gc-ordem="proximo" class="' + (GC_.ordem === 'proximo' ? 'on' : '') + '">Próximo encontro</button>' +
    '</div>' +
    (GC_.comCS ? '<label for="gcCS">CS</label><select class="sel" id="gcCS" aria-label="Filtrar por CS">' + opts + '</select>' : '');
  GC_.ctl.querySelectorAll('[data-gc-ordem]').forEach(function(b){ b.addEventListener('click', function(){ GC_.ordem = b.getAttribute('data-gc-ordem'); gcControles_(); gcDesenhar_(); }); });
  var sel = document.getElementById('gcCS');
  if (sel) sel.addEventListener('change', function(){ GC_.cs = sel.value; gcDesenhar_(); });
}
function gcCartao_(c){
  var qs = '?mes=' + encodeURIComponent(GC_.mes) + '&ano=' + encodeURIComponent(GC_.ano);
  var foto = c.fotoUrl ? '<img loading="lazy" src="' + gcEsc_(c.fotoUrl) + '" alt="">' : '<div class="gc-ini">' + gcEsc_(gcIniciais_(c.conselheiro)) + '</div>';
  var selo = c.congelado ? '<span class="tag gc-selo">Congelado</span>' : (c.atencao ? '<span class="tag gold gc-selo">Atenção</span>' : '');
  var health = (c.healthscore !== null && c.healthscore !== undefined) ? '<span class="gc-health" title="Healthscore do conselho no período">Health ' + c.healthscore + '</span>' : '';
  var prox = 'Sem próximo encontro na agenda';
  if (c.proximaData && c.proximaDataEhFutura) { var f = gcData_(c.proximaData); if (f) prox = 'Próximo: ' + f; }
  var pres = '<span class="gc-var">Sem presença registrada</span>';
  if (c.presenca) {
    var v = c.presenca.variacaoPp;
    var comp = '';
    if (v !== null && v !== undefined) {
      var mesAnt = String(c.presenca.mesAnterior || '').slice(0, 3).toLowerCase();
      comp = v === 0 ? ' (igual a ' + mesAnt + ')' : ' (' + (v > 0 ? 'mais ' : 'menos ') + Math.abs(v) + ' p.p. que ' + mesAnt + ')';
    }
    pres = '<span class="gc-var' + (v < 0 ? ' queda' : '') + '" title="Presença em ' + gcEsc_(c.presenca.mes) + '">Presença ' + c.presenca.taxa + '%' + gcEsc_(comp) + '</span>';
  }
  var a = c.atas || { comAta: 0, membros: 0, semAta: 0 };
  var atas = a.membros === 0 ? '' : (a.comAta === 0
    ? '<div class="gc-atas">Nenhuma ata extraída no período</div>'
    : '<div class="gc-atas">Atas: ' + a.comAta + ' de ' + a.membros + (a.semAta > 0 ? ' <span class="tag gold">' + a.semAta + (a.semAta === 1 ? ' membro sem ata' : ' membros sem ata') + '</span>' : '') + '</div>');
  return '<a class="gc-card' + (c.congelado ? ' congelado' : '') + '" href="/conselho/' + encodeURIComponent(c.groupId) + qs + '">' +
    '<div class="gc-foto">' + foto + selo + health + '</div>' +
    '<div class="gc-corpo"><div class="gc-nome">' + gcEsc_(c.conselheiro) + '</div><div class="gc-nivel">' + gcEsc_(c.nivel) + '</div>' +
    '<div class="gc-lin">CS: <b>' + gcEsc_(c.csResponsavel) + '</b></div><div class="gc-lin">' + gcEsc_(prox) + '</div>' + atas +
    '<div class="gc-rod"><span>' + c.membros + ' membros</span>' + pres + '</div></div></a>';
}
function gcDesenhar_(){
  var cards = GC_.cards.filter(function(c){ return !GC_.cs || c.csResponsavel === GC_.cs; });
  if (!cards.length) { GC_.raiz.innerHTML = '<div class="gc-vazio">Nenhum conselho ativo neste recorte. Confira se o título do grupo no Monday traz o CS entre parênteses.</div>'; return; }
  if (GC_.ordem === 'proximo') {
    var t = function(c){ return c.proximaData && c.proximaDataEhFutura ? new Date(c.proximaData).getTime() : Number.MAX_SAFE_INTEGER; };
    cards.sort(function(a, b){ return t(a) - t(b) || a.conselheiro.localeCompare(b.conselheiro); });
  } else {
    cards.sort(function(a, b){ return a.nivelOrdem - b.nivelOrdem || a.conselheiro.localeCompare(b.conselheiro); });
  }
  GC_.raiz.innerHTML = '<div class="gc-grid">' + cards.map(gcCartao_).join('') + '</div>';
}

// Impacto dos conselhos (cases mais matchmakings), em barras. opcoes.impacto = { historico, periodo }.
var GC_IMP_ = { imp: null, modo: 'historico', raiz: null, ctl: null, mes: '', ano: 0 };
function gcImpactoIniciar(opcoes){
  GC_IMP_.imp = opcoes.impacto; GC_IMP_.raiz = document.getElementById(opcoes.raizId); GC_IMP_.ctl = document.getElementById(opcoes.ctlId);
  GC_IMP_.mes = opcoes.mes; GC_IMP_.ano = opcoes.ano; GC_IMP_.modo = 'historico';
  gcImpactoDesenhar_();
}
function gcImpactoDesenhar_(){
  GC_IMP_.ctl.innerHTML = '<div class="seg" role="group" aria-label="Período do impacto">' +
    '<button type="button" data-gc-imp="historico" class="' + (GC_IMP_.modo === 'historico' ? 'on' : '') + '">Histórico completo</button>' +
    '<button type="button" data-gc-imp="periodo" class="' + (GC_IMP_.modo === 'periodo' ? 'on' : '') + '">Período selecionado</button></div>';
  GC_IMP_.ctl.querySelectorAll('[data-gc-imp]').forEach(function(b){ b.addEventListener('click', function(){ GC_IMP_.modo = b.getAttribute('data-gc-imp'); gcImpactoDesenhar_(); }); });
  var d = GC_IMP_.imp && GC_IMP_.imp[GC_IMP_.modo];
  if (!d) { GC_IMP_.raiz.innerHTML = '<div class="gc-vazio">Sem dados de impacto disponíveis.</div>'; return; }
  var tot = '<div class="gc-impacto-tot"><span><b>' + d.totalCases + '</b>cases de sucesso</span><span><b>' + d.totalMatchmakings + '</b>matchmakings</span>' +
    '<span><b' + (d.matchmakingsSemResultado > 0 ? ' style="color:var(--red-ink)"' : '') + '>' + d.matchmakingsSemResultado + '</b>matchmakings sem resultado</span></div>';
  if (!d.topConselhos || !d.topConselhos.length) { GC_IMP_.raiz.innerHTML = tot + '<div class="gc-vazio">Nenhum case ou matchmaking atribuído a um conselho ' + (GC_IMP_.modo === 'periodo' ? 'neste período.' : 'ainda.') + '</div>'; return; }
  var max = Math.max.apply(null, d.topConselhos.map(function(x){ return x.total; }).concat([1]));
  var qs = '?mes=' + encodeURIComponent(GC_IMP_.mes) + '&ano=' + encodeURIComponent(GC_IMP_.ano);
  GC_IMP_.raiz.innerHTML = tot + '<div class="gc-barras">' + d.topConselhos.map(function(x){
    var contato = String(x.nome || '').split('|')[1] || x.nome; contato = String(contato).replace(/[(].*$/, '').trim();
    return '<a class="gc-barra" href="/conselho/' + encodeURIComponent(x.groupId) + qs + '"><span class="gc-bnome">' + gcEsc_(contato) + '<small>' + gcEsc_(x.cs) + '</small></span>' +
      '<span class="bar"><span class="gold" style="width:' + Math.round(x.total / max * 100) + '%"></span></span><span class="gc-bval">' + x.total + '</span></a>';
  }).join('') + '</div>';
}
`;
