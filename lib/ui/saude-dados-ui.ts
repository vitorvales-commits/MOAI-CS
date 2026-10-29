// Cartão de saúde dos dados da visão de gestor (29/10/2026), no padrão rd- das abas redesenhadas. Dois níveis: uma
// faixa discreta no topo, neutra quando tudo está saudável e âmbar ou vermelha só quando há exceção, e, ao clicar,
// um painel com apenas os boards e rotinas fora do padrão. A classificação vem pronta de /api/gestor/saude-dados
// (lib/saude-dados.ts); aqui só se desenha o que veio. Nunca entra na página do CS.
// O script não usa barra invertida, crase nem cifrão com chave: ele vive dentro da template string de gestor-html.ts.

export const SAUDE_DADOS_CSS = `
.rd-saude{margin:10px 0 14px}
.rd-saude-faixa{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line2);background:var(--surface);color:var(--ink2);border-radius:12px;padding:9px 14px;font:inherit;font-size:12.5px;line-height:1.4;cursor:pointer}
.rd-saude-faixa:hover{border-color:var(--ink3)}
.rd-saude-ponto{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ink3)}
.rd-saude-texto{flex:1;min-width:0;overflow-wrap:anywhere}
.rd-saude-mais{flex:none;font-weight:700;font-size:12px}
.rd-saude[data-estado="atrasado"] .rd-saude-faixa{background:var(--gold-soft);border-color:var(--gold);color:var(--gold-ink)}
.rd-saude[data-estado="atrasado"] .rd-saude-ponto{background:var(--gold)}
.rd-saude[data-estado="critico"] .rd-saude-faixa{background:var(--red-soft);border-color:var(--red);color:var(--red-ink)}
.rd-saude[data-estado="critico"] .rd-saude-ponto{background:var(--red)}
.rd-saude-painel{margin-top:10px}
.rd-saude-painel[hidden]{display:none}
.rd-saude-item{padding:14px 0;border-top:1px solid var(--line)}
.rd-saude-item:first-of-type{border-top:0;padding-top:4px}
.rd-saude-cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.rd-saude-cab b{font-size:14px}
.rd-saude-dl{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;margin:0;font-size:12.5px;color:var(--ink2);line-height:1.5}
.rd-saude-dl b{color:var(--ink)}
.rd-saude-dl span{overflow-wrap:anywhere}
`;

export const SAUDE_DADOS_HTML = `
<div class="rd-saude" id="saudeDados" data-estado="carregando">
  <button type="button" class="rd-saude-faixa" id="saudeFaixa" aria-expanded="false" aria-controls="saudePainel">
    <span class="rd-saude-ponto" aria-hidden="true"></span>
    <span class="rd-saude-texto" id="saudeTexto">Verificando a atualização dos dados...</span>
    <span class="rd-saude-mais" id="saudeMais" hidden>Ver o que tratar</span>
  </button>
  <section class="rd-card rd-saude-painel" id="saudePainel" hidden aria-label="Saúde dos dados"></section>
</div>
`;

export const SAUDE_DADOS_SCRIPT = `
var saudeUltima_ = null;
function saudeEsc_(t) { return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function saudeData_(iso) {
  if (!iso) return 'nunca houve';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
function saudeDefinirFaixa_(estado, texto, comDetalhe) {
  document.getElementById('saudeDados').setAttribute('data-estado', estado);
  document.getElementById('saudeTexto').textContent = texto;
  document.getElementById('saudeMais').hidden = !comDetalhe;
}
function saudePainelHtml_(r) {
  if (!r.itens.length) {
    return '<h2>Nada a tratar</h2><p class="rd-sub">Todas as rotinas de atualização estão dentro do padrão. Quando alguma atrasar ou falhar, ela aparece aqui com a ação sugerida.</p>';
  }
  var html = '<h2>O que tratar nos dados</h2><p class="rd-sub">Só aparecem as rotinas fora do padrão, da mais grave para a menos grave.</p>';
  r.itens.forEach(function (i) {
    var erro = i.ultimoErro ? String(i.ultimoErro).slice(0, 160) : '';
    html += '<div class="rd-saude-item"><div class="rd-saude-cab"><b>' + saudeEsc_(i.nome) + '</b>' +
      '<span class="rd-pill ' + (i.gravidade === 'critico' ? 'red' : 'gold') + '">' + (i.gravidade === 'critico' ? 'Crítico' : 'Atrasado') + '</span></div>' +
      '<p class="rd-saude-dl"><span><b>Última sincronização bem sucedida:</b> ' + saudeEsc_(saudeData_(i.ultimaSucesso)) + (i.paradoTexto ? ' (parada há ' + saudeEsc_(i.paradoTexto) + ')' : '') + '</span>' +
      '<span><b>Falhas consecutivas:</b> ' + Number(i.falhasConsecutivas || 0) + '</span>' +
      (erro ? '<span><b>Último erro:</b> ' + saudeEsc_(erro) + '</span>' : '') +
      '<span><b>Ação sugerida:</b> ' + saudeEsc_(i.acao) + '</span></p></div>';
  });
  return html;
}
function renderSaude_(r) {
  saudeUltima_ = r;
  if (r.estado === 'vazio') {
    saudeDefinirFaixa_('vazio', 'Ainda não há registro de sincronização. Se a plataforma acabou de ser instalada, aguarde o primeiro ciclo de 5 minutos.', false);
    document.getElementById('saudePainel').innerHTML = '<h2>Sem registros</h2><p class="rd-sub">Nenhuma rotina de atualização registrou execução. Se isso continuar depois de alguns minutos, acione o responsável técnico.</p>';
    return;
  }
  saudeDefinirFaixa_(r.estado, r.texto, r.estado !== 'saudavel');
  document.getElementById('saudePainel').innerHTML = saudePainelHtml_(r);
}
function carregarSaude_() {
  fetchJSON_('/api/gestor/saude-dados').then(renderSaude_).catch(function () {
    if (saudeUltima_) return;
    saudeDefinirFaixa_('atrasado', 'Não foi possível verificar a atualização dos dados. Recarregue a página; se continuar, acione o responsável técnico.', false);
    document.getElementById('saudePainel').innerHTML = '<h2>Verificação indisponível</h2><p class="rd-sub">A consulta à saúde dos dados falhou. Isso não significa que os dados estejam parados. Recarregue a página e, se o aviso persistir, acione o responsável técnico.</p>';
  });
}
document.getElementById('saudeFaixa').addEventListener('click', function () {
  var painel = document.getElementById('saudePainel');
  painel.hidden = !painel.hidden;
  this.setAttribute('aria-expanded', painel.hidden ? 'false' : 'true');
});
carregarSaude_();
setInterval(carregarSaude_, 120000);
`;
