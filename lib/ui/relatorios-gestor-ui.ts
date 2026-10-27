// Painel de acompanhamento dos relatórios do conselho na aba Conselhos do gestor (27/10/2026). Só desenha o que
// /api/gestor/relatorios-conselho já calculou: cobertura, avaliações, leituras que pedem ação e o detalhe de cada
// relatório. Sem tabela e sem grade de células: barras, cartões e frases.
// O script não usa barra invertida, crase nem cifrão com chave, para viver dentro de template string.

export const RELATORIOS_GESTOR_CSS = `
.rg-corpo{padding:0 18px 18px;display:flex;flex-direction:column;gap:16px}
.rg-relance{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.rg-card{background:var(--surface);border:1px solid var(--line2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.rg-card h3{margin:0;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3)}
.rg-grande{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;color:var(--ink)}
.rg-grande small{font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;color:var(--ink2);letter-spacing:0;margin-left:6px}
.rg-barra{display:flex;height:12px;border-radius:99px;overflow:hidden;background:var(--line)}
.rg-barra span{display:block;height:100%;min-width:0}
.rg-barra .ok{background:var(--green)}
.rg-barra .gold{background:var(--gold)}
.rg-barra .red{background:var(--red)}
.rg-barra .neutro{background:var(--line2)}
.rg-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--ink2)}
.rg-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:baseline}
.rg-leg i.ok{background:var(--green)}
.rg-leg i.gold{background:var(--gold)}
.rg-leg i.red{background:var(--red)}
.rg-leg i.neutro{background:var(--line2)}
.rg-leg b{color:var(--ink);font-weight:700}
.rg-cs{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--line);padding-top:10px}
.rg-cs-l{display:grid;grid-template-columns:minmax(70px,110px) 1fr auto;gap:10px;align-items:center;font-size:12.5px;color:var(--ink2)}
.rg-cs-l b{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rg-cs-l .rg-barra{height:8px}
.rg-cs-l em{font-style:normal;font-size:12px;font-weight:700;color:var(--ink)}
.rg-cs-l em.red{color:var(--red-ink)}
.rg-sinais{display:flex;flex-wrap:wrap;gap:8px}
.rg-sinal{display:flex;flex-direction:column;gap:2px;background:var(--bg);border-radius:12px;padding:9px 14px;min-width:96px}
.rg-sinal b{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;line-height:1.1}
.rg-sinal span{font-size:12px;color:var(--ink2)}
.rg-sinal.red b{color:var(--red-ink)}
.rg-sinal.gold b{color:var(--gold-ink)}
.rg-sec h3{margin:0 0 8px;font-size:13px;font-weight:700;color:var(--ink)}
.rg-sec>p{margin:0 0 10px;font-size:12.5px;color:var(--ink2);line-height:1.5}
.rg-leituras{display:flex;flex-direction:column;gap:10px}
.rg-leitura{background:var(--surface);border:1px solid var(--line2);border-left:4px solid var(--gold);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:5px;font-size:13px;line-height:1.5}
.rg-leitura.alta{border-left-color:var(--red)}
.rg-leitura.baixa{border-left-color:var(--line2)}
.rg-leitura .rg-oque{font-weight:600;color:var(--ink)}
.rg-leitura .rg-num{color:var(--ink2);font-size:12.5px}
.rg-leitura .rg-acao{font-size:12.5px;color:var(--ink)}
.rg-leitura .rg-acao span{font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;font-size:11px;margin-right:6px}
.rg-quem{display:flex;flex-wrap:wrap;gap:6px}
.rg-quem span{font-size:11.5px;font-weight:600;background:var(--bg);border-radius:99px;padding:2px 10px;color:var(--ink2)}
.rg-mais{align-self:flex-start;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink);background:transparent;border:1px solid var(--line2);border-radius:99px;padding:6px 14px;cursor:pointer}
.rg-mais:hover{border-color:var(--ink)}
.rg-vazio{background:var(--bg);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--ink2);line-height:1.5}
.rg-ok{background:var(--green-soft);color:#2F6B49;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5}
.rg-rels{display:flex;flex-direction:column;gap:10px}
.rg-rel{background:var(--surface);border:1px solid var(--line2);border-radius:14px;padding:13px 15px;display:flex;flex-direction:column;gap:7px;font-size:13px;line-height:1.5}
.rg-rel.alerta{border-color:var(--red)}
.rg-rel.atencao{border-color:var(--gold)}
.rg-rel-topo{display:flex;gap:8px 12px;align-items:center;flex-wrap:wrap}
.rg-rel-topo a{font-weight:700;color:var(--ink);text-decoration:none}
.rg-rel-topo a:hover{text-decoration:underline}
.rg-rel-topo small{color:var(--ink3);font-size:12px}
.rg-tag{display:inline-block;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:700}
.rg-tag.ok{background:var(--green-soft);color:#2F6B49}
.rg-tag.gold{background:var(--gold-soft);color:var(--gold-ink)}
.rg-tag.red{background:var(--red-soft);color:var(--red-ink)}
.rg-rel p{margin:0;color:var(--ink)}
.rg-rel .rg-rot{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3)}
.rg-sk{height:120px;border-radius:16px;background:linear-gradient(90deg,var(--line) 25%,#F6F5F5 50%,var(--line) 75%);background-size:200% 100%;animation:gcbrilho 1.3s linear infinite}
@media (prefers-reduced-motion:reduce){.rg-sk{animation:none}}
@media (max-width:520px){.rg-cs-l{grid-template-columns:80px 1fr auto}}
`;

export const RELATORIOS_GESTOR_HTML = `
    <section class="panel" style="margin-top:22px" aria-labelledby="h-rel-gestor">
      <div class="ph"><div><h2 id="h-rel-gestor">Relatórios pós conselho</h2><p id="relGestorSituacao">Carregando os relatórios dos encontros.</p></div></div>
      <div id="relGestor"></div>
    </section>
`;

export const RELATORIOS_GESTOR_SCRIPT = `
var RG_ = { dados: null, leiturasAbertas: false, detalheAberto: false, seq: 0 };
function rgEsc_(t) { return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function rgPlural_(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
function rgData_(iso) {
  var d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2);
}
function rgRef_() {
  var i = MESES_GESTOR.indexOf(mesAtual);
  var m = i >= 0 ? i + 1 : new Date().getMonth() + 1;
  return anoAtual + '-' + ('0' + m).slice(-2);
}
function rgBarra_(segs) {
  var total = 0; segs.forEach(function (s) { total += s.qtd; });
  if (!total) return '<div class="rg-barra" aria-hidden="true"></div>';
  return '<div class="rg-barra" role="img" aria-label="' + rgEsc_(segs.map(function (s) { return s.rotulo + ': ' + s.qtd; }).join(', ')) + '">' +
    segs.filter(function (s) { return s.qtd > 0; }).map(function (s) { return '<span class="' + s.tom + '" style="width:' + (s.qtd / total * 100) + '%"></span>'; }).join('') + '</div>';
}
function rgLegenda_(segs) {
  return '<div class="rg-leg">' + segs.map(function (s) { return '<span><i class="' + s.tom + '"></i>' + rgEsc_(s.rotulo) + ' <b>' + s.qtd + '</b></span>'; }).join('') + '</div>';
}
function rgCartaoPreenchimento_(r) {
  var linhas = r.porCS.map(function (c) {
    var segs = [
      { rotulo: 'Enviados', qtd: c.enviados, tom: 'ok' }, { rotulo: 'Atrasados', qtd: c.atrasados, tom: 'red' }, { rotulo: 'A preencher', qtd: c.pendentes, tom: 'neutro' }
    ];
    return '<div class="rg-cs-l"><b title="' + rgEsc_(c.cs) + '">' + rgEsc_(c.cs) + '</b>' + rgBarra_(segs) +
      '<em class="' + (c.atrasados > 0 ? 'red' : '') + '">' + c.enviados + ' de ' + c.exigidos + '</em></div>';
  }).join('');
  return '<div class="rg-card"><h3>Preenchimento</h3>' +
    '<div class="rg-grande">' + r.enviados + ' de ' + r.exigidos + '<small>' + (r.exigidos === 1 ? 'relatório enviado' : 'relatórios enviados') + '</small></div>' +
    rgBarra_(r.cobertura) + rgLegenda_(r.cobertura) + (linhas ? '<div class="rg-cs">' + linhas + '</div>' : '') + '</div>';
}
function rgCartaoAvaliacao_(r) {
  var total = 0; r.avaliacoes.forEach(function (a) { total += a.qtd; });
  var abaixo = 0; r.avaliacoes.forEach(function (a) { if (a.chave === 'Regular' || a.chave === 'Ruim') abaixo += a.qtd; });
  var corpo = total
    ? '<div class="rg-grande">' + abaixo + ' de ' + total + '<small>' + (abaixo === 1 ? 'encontro abaixo do esperado' : 'encontros abaixo do esperado') + '</small></div>' + rgBarra_(r.avaliacoes) + rgLegenda_(r.avaliacoes)
    : '<div class="rg-vazio">Nenhum relatório enviado no mês, então ainda não há avaliação dos encontros.</div>';
  var sinais = '<div class="rg-sinais">' +
    '<div class="rg-sinal ' + (r.emAtencao > 0 ? 'gold' : '') + '"><b>' + r.emAtencao + '</b><span>' + (r.emAtencao === 1 ? 'membro em atenção' : 'membros em atenção') + '</span></div>' +
    '<div class="rg-sinal"><b>' + r.faltas + '</b><span>' + (r.faltas === 1 ? 'falta justificada' : 'faltas justificadas') + '</span></div>' +
    '<div class="rg-sinal ' + (r.desistencias > 0 ? 'red' : '') + '"><b>' + r.desistencias + '</b><span>' + (r.desistencias === 1 ? 'desistência' : 'desistências') + '</span></div></div>';
  return '<div class="rg-card"><h3>Como foram os encontros</h3>' + corpo + (total ? sinais : '') + '</div>';
}
function rgLeitura_(i) {
  var quem = (i.responsaveis || []).filter(function (n, k, a) { return a.indexOf(n) === k; });
  return '<div class="rg-leitura ' + rgEsc_(i.severidade) + '"><div class="rg-oque">' + rgEsc_(i.oQue) + '</div>' +
    '<div class="rg-num">' + rgEsc_(i.numero) + (i.referencia ? ' · ' + rgEsc_(i.referencia) : '') + '</div>' +
    '<div class="rg-acao"><span>Próximo passo</span>' + rgEsc_(i.acao) + '</div>' +
    (quem.length ? '<div class="rg-quem">' + quem.map(function (n) { return '<span>' + rgEsc_(n) + '</span>'; }).join('') + '</div>' : '') + '</div>';
}
function rgSecaoLeituras_(l) {
  var lista = RG_.leiturasAbertas ? l.visiveis.concat(l.restantes) : l.visiveis;
  var corpo = l.total
    ? '<div class="rg-leituras">' + lista.map(rgLeitura_).join('') + '</div>' +
      (l.restantes.length ? '<button type="button" class="rg-mais" id="rgMaisLeituras">' + (RG_.leiturasAbertas ? 'Mostrar menos' : 'Ver mais ' + l.restantes.length) + '</button>' : '')
    : '<div class="rg-ok">Nenhum relatório do mês pede ação. Quando um CS registrar encontro abaixo do esperado, membro em atenção, falta recorrente ou desistência, a leitura aparece aqui com o próximo passo.</div>';
  return '<div class="rg-sec"><h3>O que pede ação</h3>' + corpo + '</div>';
}
function rgRelatorio_(d) {
  var tom = d.avaliacao === 'Ruim' ? 'red' : (d.avaliacao === 'Regular' ? 'gold' : 'ok');
  var linhas = '<span class="rg-rot">Principal avanço ou tema</span><p>' + rgEsc_(d.avanco) + '</p>';
  if (d.membroAtencao) linhas += '<span class="rg-rot">Membro que exige atenção</span><p>' + rgEsc_(d.membroAtencao.nome || 'Membro') + (d.membroAtencao.motivo ? ': ' + rgEsc_(d.membroAtencao.motivo) : '') + '</p>';
  if (d.combinado) linhas += '<span class="rg-rot">Combinado para o próximo encontro</span><p>' + rgEsc_(d.combinado) + '</p>';
  if (d.faltas && d.faltas.length) {
    linhas += '<span class="rg-rot">Faltas de quem confirmou</span>' + d.faltas.map(function (f) {
      return '<p>' + rgEsc_(f.nome) + (f.tipo === 'desistencia' ? ' (desistência)' : '') + (f.categoria ? ', ' + rgEsc_(f.categoria.toLowerCase()) : '') + (f.justificativa ? ': ' + rgEsc_(f.justificativa) : '') + '</p>';
    }).join('');
  }
  var atraso = d.estado === 'enviado_com_atraso' ? '<span class="rg-tag gold">Enviado com atraso</span>' : '';
  return '<div class="rg-rel ' + (d.destaque || '') + '"><div class="rg-rel-topo"><a href="/conselho/' + encodeURIComponent(d.groupId) + '">' + rgEsc_(d.conselho) + '</a>' +
    '<span class="rg-tag ' + tom + '">' + rgEsc_(d.avaliacao) + '</span>' + atraso +
    '<small>' + rgEsc_(d.cs) + ' · encontro de ' + rgData_(d.dataEncontro) + '</small></div>' + linhas + '</div>';
}
function rgSecaoDetalhe_(det) {
  if (!det.total) return '';
  var lista = RG_.detalheAberto ? det.visiveis.concat(det.restantes) : det.visiveis;
  return '<div class="rg-sec"><h3>Relatórios do mês</h3><p>Os encontros fora do padrão vêm primeiro.</p><div class="rg-rels">' + lista.map(rgRelatorio_).join('') + '</div>' +
    (det.restantes.length ? '<button type="button" class="rg-mais" id="rgMaisDetalhe" style="margin-top:10px">' + (RG_.detalheAberto ? 'Mostrar menos' : 'Ver todos os ' + det.total) + '</button>' : '') + '</div>';
}
function rgSituacao_(p) {
  var r = p.relance;
  if (p.vazio === 'sem_encontros') return 'Nenhum encontro com relatório exigido neste mês.';
  var s = r.enviados + ' de ' + r.exigidos + (r.exigidos === 1 ? ' relatório enviado' : ' relatórios enviados');
  s += p.leituras.total ? '. ' + rgPlural_(p.leituras.total, 'leitura pede ação', 'leituras pedem ação') + '.' : '. Nenhuma leitura pede ação.';
  return s;
}
function rgDesenhar_() {
  var p = RG_.dados; var raiz = document.getElementById('relGestor');
  document.getElementById('relGestorSituacao').textContent = rgSituacao_(p);
  if (p.vazio === 'sem_encontros') {
    raiz.innerHTML = '<div class="rg-corpo"><div class="rg-vazio">Não houve encontro de conselho com relatório exigido neste mês. O relatório passou a valer para encontros a partir de 23/09/2026, com prazo de 7 dias depois do encontro. Escolha outro mês no seletor do topo para ver o histórico.</div></div>';
    return;
  }
  var aviso = p.vazio === 'sem_relatorios'
    ? '<div class="rg-vazio">Nenhum CS enviou relatório neste mês ainda. O preenchimento por CS aparece abaixo, e as leituras de avaliação, membros em atenção e faltas surgem assim que o primeiro relatório chegar.</div>' : '';
  raiz.innerHTML = '<div class="rg-corpo"><div class="rg-relance">' + rgCartaoPreenchimento_(p.relance) + rgCartaoAvaliacao_(p.relance) + '</div>' +
    aviso + rgSecaoLeituras_(p.leituras) + rgSecaoDetalhe_(p.detalhe) + '</div>';
  var ml = document.getElementById('rgMaisLeituras');
  if (ml) ml.addEventListener('click', function () { RG_.leiturasAbertas = !RG_.leiturasAbertas; rgDesenhar_(); });
  var md = document.getElementById('rgMaisDetalhe');
  if (md) md.addEventListener('click', function () { RG_.detalheAberto = !RG_.detalheAberto; rgDesenhar_(); });
}
function carregarRelatoriosGestor_() {
  var seq = ++RG_.seq;
  RG_.leiturasAbertas = false; RG_.detalheAberto = false;
  document.getElementById('relGestorSituacao').textContent = 'Carregando os relatórios dos encontros.';
  document.getElementById('relGestor').innerHTML = '<div class="rg-corpo"><span class="rg-sk"></span></div>';
  fetchJSON_('/api/gestor/relatorios-conselho?ref=' + encodeURIComponent(rgRef_())).then(function (p) {
    if (seq !== RG_.seq) return;
    RG_.dados = p; rgDesenhar_();
  }).catch(function (err) {
    if (seq !== RG_.seq) return;
    document.getElementById('relGestorSituacao').textContent = '';
    document.getElementById('relGestor').innerHTML = '<div class="rg-corpo">' + erroSecaoHtml_('Não foi possível carregar os relatórios dos encontros', err) + '</div>';
  });
}
`;
