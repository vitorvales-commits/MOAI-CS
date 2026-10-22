// Interface do relatório do conselho (22/10/2026), compartilhada pela home do CS e pela página do conselho: painel
// lateral com o formulário e a lista de relatórios por encontro. Só desenha; prazo, estado e faltas vêm de
// /api/conselho/[grupo]/relatorios (encontros_pendentes_relatorio no banco) e a gravação é POST /relatorio.
// Regras do script inline: sem barra invertida, sem crase e sem cifrão com chave (é uma string de template).
import { CATEGORIAS_FALTA, AVALIACOES_ENCONTRO } from '../relatorio-conselho.ts';
import { RELATORIO_AVANCO_MAX, RELATORIO_COMBINADO_MAX, RELATORIO_MOTIVO_ATENCAO_MAX, RELATORIO_JUSTIFICATIVA_MAX, MONDAY_BOARD_CONSELHOS_URL } from '../constants.ts';

export const RELATORIO_CSS = `
.rc-fundo{position:fixed;inset:0;background:rgba(20,20,20,.35);z-index:80;}
.rc-fundo[hidden],.rc-painel[hidden]{display:none;}
.rc-painel{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:var(--bg,#F3F2F0);z-index:81;box-shadow:-12px 0 40px rgba(20,20,20,.18);display:flex;flex-direction:column;color:var(--ink,#1A1A1A);}
.rc-topo{padding:18px 20px 14px;border-bottom:1px solid var(--line2,#DAD7D7);background:var(--surface,#fff);}
.rc-topo h2{margin:0 0 4px;font-size:18px;line-height:1.3;}
.rc-topo p{margin:0;font-size:12.5px;color:var(--ink2,#5D5D5D);line-height:1.5;}
.rc-corpo{flex:1;overflow:auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:16px;}
.rc-rodape{padding:12px 20px;border-top:1px solid var(--line2,#DAD7D7);background:var(--surface,#fff);display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.rc-msg{font-size:12.5px;color:var(--ink2,#5D5D5D);flex:1 1 160px;}
.rc-msg.erro{color:#A3342F;}
.rc-aviso{background:var(--gold-soft,#F7EFDC);color:var(--gold-ink,#8A6410);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;}
.rc-aviso a{color:inherit;font-weight:700;}
.rc-aviso.red{background:var(--red-soft,#FBECEA);color:var(--red-ink,#A3342F);}
.rc-campo{display:flex;flex-direction:column;gap:6px;}
.rc-campo>label,.rc-campo>.rc-rot{font-size:12.5px;font-weight:700;}
.rc-campo small{font-weight:400;color:var(--ink2,#5D5D5D);}
.rc-campo textarea,.rc-campo input[type=text],.rc-campo select{font:inherit;font-size:13px;padding:9px 10px;border:1px solid var(--line2,#DAD7D7);border-radius:9px;background:var(--surface,#fff);color:inherit;width:100%;}
.rc-campo textarea{min-height:76px;resize:vertical;}
.rc-cont{font-size:11.5px;color:var(--ink3,#878585);text-align:right;}
.rc-opcoes{display:flex;gap:8px;flex-wrap:wrap;}
.rc-opcoes label{border:1px solid var(--line2,#DAD7D7);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;cursor:pointer;background:var(--surface,#fff);}
.rc-opcoes input{position:absolute;opacity:0;pointer-events:none;}
.rc-opcoes label.on{background:var(--ink,#1A1A1A);color:#fff;border-color:var(--ink,#1A1A1A);}
.rc-opcoes label:focus-within{outline:2px solid var(--gold,#C89A2E);outline-offset:2px;}
.rc-faltas{display:flex;flex-direction:column;gap:10px;}
.rc-falta{background:var(--surface,#fff);border:1px solid var(--line2,#DAD7D7);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
.rc-falta b{font-size:13px;}
.rc-sep{font-size:12.5px;color:var(--ink2,#5D5D5D);line-height:1.5;}
.rc-btn{font:inherit;font-size:13px;font-weight:700;border-radius:999px;padding:9px 18px;cursor:pointer;border:1px solid var(--line2,#DAD7D7);background:var(--surface,#fff);color:inherit;}
.rc-btn.pri{background:var(--ink,#1A1A1A);color:#fff;border-color:var(--ink,#1A1A1A);}
.rc-btn:disabled{opacity:.5;cursor:default;}
.rc-lista{display:flex;flex-direction:column;}
.rc-item{padding:13px 18px;border-bottom:1px solid var(--line,#ECEAEA);font-size:13px;line-height:1.5;}
.rc-item:last-child{border-bottom:none;}
.rc-item-topo{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.rc-item-topo .rc-data{font-weight:700;}
.rc-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;}
.rc-tag.ok{background:var(--green-soft,#E8F2EC);color:#2F6B49;}
.rc-tag.alerta{background:var(--red-soft,#FBECEA);color:var(--red-ink,#A3342F);}
.rc-tag.atencao{background:var(--gold-soft,#F7EFDC);color:var(--gold-ink,#8A6410);}
.rc-item-topo .rc-btn{margin-left:auto;padding:6px 14px;font-size:12px;}
.rc-det{margin-top:8px;font-size:12.5px;color:var(--ink2,#5D5D5D);}
.rc-det summary{cursor:pointer;font-weight:700;color:var(--ink,#1A1A1A);}
.rc-det dl{margin:8px 0 0;display:grid;grid-template-columns:150px 1fr;gap:6px 12px;}
.rc-det dt{font-weight:700;color:var(--ink,#1A1A1A);}
.rc-det dd{margin:0;}
.rc-tabela{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px;}
.rc-tabela th,.rc-tabela td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line,#ECEAEA);}
.rc-tabela th{font-size:11.5px;color:var(--ink3,#878585);text-transform:uppercase;letter-spacing:.04em;}
@media (max-width:520px){.rc-det dl{grid-template-columns:1fr;}.rc-item-topo .rc-btn{margin-left:0;}}
`;

export const RELATORIO_PAINEL_HTML = `
<div class="rc-fundo" id="rcFundo" hidden></div>
<aside class="rc-painel" id="rcPainel" role="dialog" aria-modal="true" aria-labelledby="rcTitulo" hidden>
  <div class="rc-topo"><h2 id="rcTitulo">Relatório do conselho</h2><p id="rcSub"></p></div>
  <div class="rc-corpo" id="rcCorpo"></div>
  <div class="rc-rodape"><span class="rc-msg" id="rcMsg" role="status"></span><button type="button" class="rc-btn" id="rcFechar">Fechar</button><button type="button" class="rc-btn pri" id="rcEnviar">Enviar relatório</button></div>
</aside>`;

export const RELATORIO_SCRIPT = `
var RC_AVALIACOES_ = ${JSON.stringify(AVALIACOES_ENCONTRO)};
var RC_CATEGORIAS_ = ${JSON.stringify(CATEGORIAS_FALTA)};
var RC_LIM_ = { avanco: ${RELATORIO_AVANCO_MAX}, combinado: ${RELATORIO_COMBINADO_MAX}, motivo: ${RELATORIO_MOTIVO_ATENCAO_MAX}, justificativa: ${RELATORIO_JUSTIFICATIVA_MAX} };
var RC_BOARD_URL_ = ${JSON.stringify(MONDAY_BOARD_CONSELHOS_URL)};
var RC_ = { grupo: null, data: null, dados: null, aoSalvar: null };

function rcEsc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; });
}
function rcFetch_(url, opts) {
  opts = opts || {}; opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    var tipo = res.headers.get('content-type') || '';
    if (tipo.indexOf('json') === -1) throw new Error('Resposta inesperada do servidor (' + res.status + ')');
    return res.json().then(function (corpo) {
      if (!res.ok) { var e = new Error(corpo.error || 'Erro ' + res.status); e.erros = corpo.erros; throw e; }
      return corpo;
    });
  });
}
function rcDia_(iso) { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }
function rcMesmo_(a, b) { return new Date(a).getTime() === new Date(b).getTime(); }
function rcRotuloEstado_(e) {
  if (e.estado === 'enviado_no_prazo') return 'Enviado no prazo';
  if (e.estado === 'enviado_com_atraso') return 'Enviado com atraso';
  if (e.estado === 'atrasado') { var d = -e.diasRestantes; return d <= 0 ? 'Prazo venceu hoje' : (d === 1 ? 'Atrasado há 1 dia' : 'Atrasado há ' + d + ' dias'); }
  if (e.estado === 'vence_hoje') return 'O prazo vence hoje';
  return e.diasRestantes === 1 ? 'Falta 1 dia para o prazo' : 'Faltam ' + e.diasRestantes + ' dias para o prazo';
}
function rcClasseEstado_(e) { return e.estado === 'enviado_no_prazo' ? 'ok' : (e.estado === 'atrasado' || e.estado === 'enviado_com_atraso' ? 'alerta' : 'atencao'); }
function rcEncontro_(dados, data) { var l = dados.encontros.filter(function (e) { return rcMesmo_(e.dataEncontro, data); }); return l[0] || null; }
function rcRelatorio_(dados, data) { var l = dados.relatorios.filter(function (r) { return rcMesmo_(r.dataEncontro, data); }); return l[0] || null; }
function rcPodeEditar_(dados, e) { return dados.souGestor || !e.relatorioId || e.estado === 'a_preencher' || e.estado === 'vence_hoje'; }

function rcAbrir_(grupo, data, aoSalvar) {
  RC_.grupo = grupo; RC_.data = data; RC_.aoSalvar = aoSalvar || null;
  document.getElementById('rcFundo').hidden = false;
  document.getElementById('rcPainel').hidden = false;
  document.getElementById('rcEnviar').disabled = true;
  document.getElementById('rcMsg').textContent = ''; document.getElementById('rcMsg').className = 'rc-msg';
  document.getElementById('rcCorpo').innerHTML = '<div class="rc-sep">Carregando o relatório.</div>';
  rcFetch_('/api/conselho/' + encodeURIComponent(grupo) + '/relatorios').then(function (d) { RC_.dados = d; rcDesenhar_(); })
    .catch(function (err) { document.getElementById('rcCorpo').innerHTML = '<div class="rc-aviso red">Não foi possível carregar o relatório: ' + rcEsc_(err.message) + '.</div>'; });
}
function rcFechar_() { document.getElementById('rcFundo').hidden = true; document.getElementById('rcPainel').hidden = true; }

function rcDesenhar_() {
  var d = RC_.dados, e = rcEncontro_(d, RC_.data), corpo = document.getElementById('rcCorpo');
  if (!e) { corpo.innerHTML = '<div class="rc-aviso">Este encontro não exige relatório.</div>'; return; }
  var r = rcRelatorio_(d, RC_.data);
  document.getElementById('rcTitulo').textContent = 'Relatório do conselho ' + (d.conselho || e.conselho);
  document.getElementById('rcSub').textContent = 'Encontro de ' + rcDia_(e.dataEncontro) + '. Prazo: ' + rcDia_(e.prazo) + ', às 23h59. ' + rcRotuloEstado_(e) + '.';
  var podeEditar = rcPodeEditar_(d, e);
  var html = '';
  if (e.presencaPendente > 0) html += '<div class="rc-aviso">Presença ainda não marcada no Monday para ' + e.presencaPendente + (e.presencaPendente === 1 ? ' membro' : ' membros') + '. <a href="' + rcEsc_(RC_BOARD_URL_) + '" target="_blank" rel="noopener">Abrir o board</a>. A lista de faltas se atualiza no próximo sync. Você pode enviar agora, e essas pessoas ficam marcadas como pendentes.</div>';
  if (e.estado === 'atrasado' && !r) html += '<div class="rc-aviso red">O prazo terminou. O envio fica registrado como tardio, e o relatório atrasado gera 5 pontos automáticos.</div>';
  if (!podeEditar) html += '<div class="rc-aviso red">O prazo terminou. Só o gestor edita este relatório.</div>';

  html += '<div class="rc-campo"><span class="rc-rot">Como foi o encontro</span><div class="rc-opcoes" id="rcAval">' + RC_AVALIACOES_.map(function (a) {
    var on = r && r.avaliacao === a;
    return '<label class="' + (on ? 'on' : '') + '"><input type="radio" name="rcAval" value="' + rcEsc_(a) + '"' + (on ? ' checked' : '') + (podeEditar ? '' : ' disabled') + '>' + rcEsc_(a) + '</label>';
  }).join('') + '</div></div>';
  html += '<div class="rc-campo"><label for="rcAvanco">Principal avanço ou tema</label><textarea id="rcAvanco" maxlength="' + RC_LIM_.avanco + '"' + (podeEditar ? '' : ' disabled') + '>' + rcEsc_(r ? r.avanco : '') + '</textarea><span class="rc-cont" id="rcAvancoCont"></span></div>';
  var presentes = (d.presentes && d.presentes[e.dataEncontro]) || [];
  var atencaoId = r && r.membroAtencaoId !== null ? r.membroAtencaoId : '';
  var opcoes = '<option value="">Nenhum</option>' + presentes.map(function (m) { return '<option value="' + m.id + '"' + (String(m.id) === String(atencaoId) ? ' selected' : '') + '>' + rcEsc_(m.nome) + '</option>'; }).join('');
  if (r && r.membroAtencaoId !== null && !presentes.some(function (m) { return m.id === r.membroAtencaoId; })) opcoes += '<option value="' + r.membroAtencaoId + '" selected>' + rcEsc_(r.membroAtencaoNome || 'Membro') + '</option>';
  html += '<div class="rc-campo"><label for="rcAtencao">Membro que exige atenção <small>(opcional, entre os presentes)</small></label><select id="rcAtencao"' + (podeEditar ? '' : ' disabled') + '>' + opcoes + '</select>' +
    '<input type="text" id="rcMotivo" maxlength="' + RC_LIM_.motivo + '" placeholder="Por que exige atenção" aria-label="Motivo da atenção" value="' + rcEsc_(r && r.membroAtencaoMotivo ? r.membroAtencaoMotivo : '') + '"' + (podeEditar ? '' : ' disabled') + '></div>';
  html += '<div class="rc-campo"><label for="rcComb">Combinado para o próximo encontro <small>(opcional)</small></label><textarea id="rcComb" maxlength="' + RC_LIM_.combinado + '"' + (podeEditar ? '' : ' disabled') + '>' + rcEsc_(r && r.combinado ? r.combinado : '') + '</textarea></div>';

  var faltas = e.faltas.filter(function (f) { return f.tipo === 'falta'; }), desist = e.faltas.filter(function (f) { return f.tipo === 'desistencia'; });
  html += '<div class="rc-campo"><span class="rc-rot">Faltas de quem confirmou</span>';
  if (!faltas.length) html += '<div class="rc-sep">Ninguém que confirmou faltou, até a última sincronização do Monday.</div>';
  else html += '<div class="rc-faltas">' + faltas.map(function (f) {
    var cats = '<option value="">Categoria</option>' + RC_CATEGORIAS_.map(function (c) { return '<option' + (f.categoria === c ? ' selected' : '') + '>' + rcEsc_(c) + '</option>'; }).join('');
    return '<div class="rc-falta" data-rc-falta="' + f.membroId + '"><b>' + rcEsc_(f.nome) + '</b><select aria-label="Categoria da falta de ' + rcEsc_(f.nome) + '"' + (podeEditar ? '' : ' disabled') + '>' + cats + '</select>' +
      '<input type="text" maxlength="' + RC_LIM_.justificativa + '" placeholder="Justificativa" aria-label="Justificativa da falta de ' + rcEsc_(f.nome) + '" value="' + rcEsc_(f.justificativa || '') + '"' + (podeEditar ? '' : ' disabled') + '></div>';
  }).join('') + '</div>';
  if (desist.length) html += '<div class="rc-sep">Avisaram que não iriam, sem justificativa obrigatória: ' + desist.map(function (f) { return rcEsc_(f.nome); }).join('; ') + '.</div>';
  html += '</div>';
  corpo.innerHTML = html;

  var cont = function () { var t = document.getElementById('rcAvanco'); document.getElementById('rcAvancoCont').textContent = t.value.length + ' de ' + RC_LIM_.avanco; };
  document.getElementById('rcAvanco').oninput = cont; cont();
  document.getElementById('rcAval').onchange = function () {
    Array.prototype.forEach.call(document.querySelectorAll('#rcAval label'), function (l) { l.classList.toggle('on', l.querySelector('input').checked); });
  };
  var botao = document.getElementById('rcEnviar');
  botao.textContent = r ? 'Salvar alterações' : 'Enviar relatório';
  botao.disabled = !podeEditar;
}

function rcEnviar_() {
  var d = RC_.dados, e = rcEncontro_(d, RC_.data), msg = document.getElementById('rcMsg'), botao = document.getElementById('rcEnviar');
  var aval = document.querySelector('#rcAval input:checked');
  var atencao = document.getElementById('rcAtencao').value;
  var faltas = Array.prototype.map.call(document.querySelectorAll('[data-rc-falta]'), function (li) {
    return { membroId: Number(li.getAttribute('data-rc-falta')), categoria: li.querySelector('select').value, justificativa: li.querySelector('input').value };
  });
  botao.disabled = true; msg.className = 'rc-msg'; msg.textContent = 'Enviando.';
  rcFetch_('/api/conselho/' + encodeURIComponent(RC_.grupo) + '/relatorio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataEncontro: e.dataEncontro, avaliacao: aval ? aval.value : '', avanco: document.getElementById('rcAvanco').value,
      membroAtencaoId: atencao ? Number(atencao) : null, membroAtencaoMotivo: document.getElementById('rcMotivo').value,
      combinado: document.getElementById('rcComb').value, faltas: faltas
    })
  }).then(function () {
    msg.textContent = 'Relatório salvo.';
    if (RC_.aoSalvar) RC_.aoSalvar();
    return rcFetch_('/api/conselho/' + encodeURIComponent(RC_.grupo) + '/relatorios').then(function (novo) { RC_.dados = novo; rcDesenhar_(); });
  }).catch(function (err) {
    msg.className = 'rc-msg erro'; msg.textContent = err.message; botao.disabled = false;
  });
}

document.addEventListener('click', function (ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  if (t.id === 'rcFechar' || t.id === 'rcFundo') { rcFechar_(); return; }
  if (t.id === 'rcEnviar') { rcEnviar_(); return; }
  var abre = t.closest('[data-rc-abrir]');
  if (abre) { ev.preventDefault(); rcAbrir_(abre.getAttribute('data-rc-grupo'), abre.getAttribute('data-rc-data'), window.rcAoSalvar_ || null); }
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !document.getElementById('rcPainel').hidden) rcFechar_(); });

// Lista de relatórios por encontro na página do conselho: estado, avaliação e, ao abrir, o conteúdo enviado.
function rcRenderLista_(alvoId, grupo) {
  var alvo = document.getElementById(alvoId);
  rcFetch_('/api/conselho/' + encodeURIComponent(grupo) + '/relatorios').then(function (d) {
    var html = '';
    if (!d.encontros.length) {
      alvo.innerHTML = '<div class="rc-item">Nenhum encontro deste conselho exige relatório até agora. A regra vale para encontros a partir do corte de pontos automáticos.</div>';
      return;
    }
    html += '<div class="rc-lista">' + d.encontros.slice().sort(function (a, b) { return new Date(b.dataEncontro) - new Date(a.dataEncontro); }).map(function (e) {
      var r = rcRelatorio_(d, e.dataEncontro);
      var botao = rcPodeEditar_(d, e) && (d.souGestor || d.souResponsavel)
        ? '<button type="button" class="rc-btn" data-rc-abrir="1" data-rc-grupo="' + rcEsc_(grupo) + '" data-rc-data="' + rcEsc_(e.dataEncontro) + '">' + (r ? 'Editar' : 'Preencher relatório') + '</button>' : '';
      var det = '';
      if (r) {
        det = '<details class="rc-det"><summary>Ver o relatório enviado por ' + rcEsc_(r.enviadoPor) + ' em ' + rcDia_(r.enviadoEm) + '</summary><dl>' +
          '<dt>Como foi</dt><dd>' + rcEsc_(r.avaliacao) + '</dd><dt>Principal avanço</dt><dd>' + rcEsc_(r.avanco) + '</dd>' +
          (r.membroAtencaoNome ? '<dt>Membro em atenção</dt><dd>' + rcEsc_(r.membroAtencaoNome) + ': ' + rcEsc_(r.membroAtencaoMotivo || '') + '</dd>' : '') +
          (r.combinado ? '<dt>Combinado</dt><dd>' + rcEsc_(r.combinado) + '</dd>' : '') +
          r.faltas.map(function (f) { return '<dt>' + (f.tipo === 'falta' ? 'Faltou' : 'Avisou que não iria') + '</dt><dd>' + rcEsc_(f.nome) + (f.categoria ? ', ' + rcEsc_(f.categoria) : '') + (f.justificativa ? ': ' + rcEsc_(f.justificativa) : '') + '</dd>'; }).join('') +
          '</dl></details>';
      }
      return '<div class="rc-item"><div class="rc-item-topo"><span class="rc-data">Encontro de ' + rcDia_(e.dataEncontro) + '</span><span class="rc-tag ' + rcClasseEstado_(e) + '">' + rcEsc_(rcRotuloEstado_(e)) + '</span>' +
        (r ? '<span>' + rcEsc_(r.avaliacao) + '</span>' : '') + botao + '</div>' + det + '</div>';
    }).join('') + '</div>';
    if (d.faltasPorMembro.length) {
      html += '<div class="rc-item"><b>Faltas por membro</b> <span class="rc-sep">(faltas depois de confirmar)</span><table class="rc-tabela"><thead><tr><th>Membro</th><th>Faltas</th><th>Categoria mais frequente</th></tr></thead><tbody>' +
        d.faltasPorMembro.map(function (f) { return '<tr><td>' + rcEsc_(f.nome) + '</td><td>' + f.faltas + '</td><td>' + rcEsc_(f.categoriaMaisFrequente || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    alvo.innerHTML = html;
  }).catch(function (err) { alvo.innerHTML = '<div class="rc-item">Não foi possível carregar os relatórios: ' + rcEsc_(err.message) + '.</div>'; });
}
`;
