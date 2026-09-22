// Shell da página de gestor — mesmo padrão de app/dashboard-html.ts: HTML+CSS+JS vanilla numa
// string só, sem framework de gráfico nem dependência de client-side nova (a CSP do projeto só
// libera script-src 'self', então nada de CDN externo aqui). O acesso de verdade é garantido no
// servidor por app/gestor/page.tsx (requireMoaiUser + isGestor) antes deste HTML ser servido;
// tudo aqui dentro é só apresentação — os dados vêm de /api/gestor/visao-geral, que faz a mesma
// checagem de novo.

export const GESTOR_STYLE = `
.gestor-page { font-family:'Inter', system-ui, sans-serif; background:#F5F5F5; color:#5D5D5D; font-size:13px; -webkit-font-smoothing:antialiased; }
.gestor-hero { background:linear-gradient(135deg,#1A1A1A,#141414); color:#fff; padding:40px 28px 34px; }
.gestor-hero-inner { max-width:1040px; margin:0 auto; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px; }
.gestor-back { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:#B7B5B5; text-decoration:none; margin-bottom:14px; }
.gestor-back:hover { color:#fff; }
.gestor-title { font-family:'Bricolage Grotesque', sans-serif; font-weight:800; font-size:32px; letter-spacing:-0.5px; color:#fff; }
.gestor-sub { font-size:12.5px; color:#B7B5B5; margin-top:6px; }
.gestor-filtros { margin-top:14px; display:flex; gap:8px; }
select.gestor-pickmes { background:rgba(255,255,255,0.08); color:#fff; border:0.75pt solid rgba(255,255,255,0.2); border-radius:10px; padding:7px 12px; font-family:'Inter',sans-serif; font-size:12px; font-weight:700; cursor:pointer; }
.gestor-destaque { text-align:right; }
.gestor-destaque-num { font-family:'Bricolage Grotesque', sans-serif; font-weight:800; font-size:46px; color:#C89A2E; line-height:1; }
.gestor-destaque-label { font-size:10px; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.6px; margin-top:4px; max-width:180px; }
.gestor-body { max-width:1040px; margin:0 auto; padding:32px 28px 80px; }
.gestor-section-title { font-size:11px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.8px; margin:36px 0 14px; display:flex; align-items:center; gap:8px; }
.gestor-section-title:first-child { margin-top:0; }
.gestor-section-title .line { flex:1; height:0.75pt; background:#C6C4C4; }
.gestor-card { background:#fff; border:0.75pt solid #D8D5D5; border-radius:20px; padding:20px; overflow-x:auto; }
table.gestor-table { width:100%; border-collapse:collapse; font-size:12px; }
table.gestor-table th { text-align:center; font-size:9.5px; font-weight:800; color:#9F9F9F; text-transform:uppercase; letter-spacing:0.4px; padding:8px 6px; border-bottom:0.75pt solid #D8D5D5; white-space:nowrap; }
table.gestor-table th:first-child { text-align:left; }
table.gestor-table td { padding:8px 6px; border-bottom:0.75pt solid #EEECEC; text-align:center; }
table.gestor-table tr.gestor-row { cursor:pointer; transition:background .15s; }
table.gestor-table tr.gestor-row:hover { background:#F9F9F9; }
.gestor-cel { border-radius:8px; padding:6px 4px; color:#fff; min-width:52px; }
.gestor-cel-manual { font-size:9px; opacity:0.85; font-weight:600; display:block; line-height:1.3; }
.gestor-cel-calc { font-size:13px; font-weight:800; display:block; line-height:1.3; }
.gestor-toggle-btn { background:#1A1A1A; color:#fff; border:none; border-radius:10px; padding:9px 16px; font-size:12px; font-weight:700; cursor:pointer; margin-bottom:16px; }
.gestor-toggle-btn.ativo { background:#C89A2E; color:#1A1A1A; }
.gestor-ranking-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:0.75pt solid #EEECEC; }
.gestor-ranking-row:last-child { border-bottom:none; }
.gestor-ranking-pos { width:22px; font-weight:800; color:#9F9F9F; font-size:12px; }
.gestor-ranking-nome { flex:1; font-weight:700; color:#1A1A1A; }
.gestor-ranking-bar-bg { flex:2; height:8px; background:#E9E9E9; border-radius:99px; overflow:hidden; }
.gestor-ranking-bar-fill { height:100%; background:linear-gradient(90deg,#C89A2E,#e8c574); border-radius:99px; transition:width .8s cubic-bezier(.16,1,.3,1); }
.gestor-ranking-score { width:36px; text-align:right; font-weight:800; color:#1A1A1A; }
.gestor-alertas-cs { margin-bottom:18px; }
.gestor-alertas-cs:last-child { margin-bottom:0; }
.gestor-alertas-nome { font-weight:800; color:#1A1A1A; margin-bottom:6px; font-size:12.5px; }
.gestor-alerta-linha { font-size:12px; color:#5D5D5D; padding:3px 0 3px 14px; position:relative; }
.gestor-alerta-linha::before { content:'—'; position:absolute; left:0; color:#C0433D; }
.gestor-empty { text-align:center; padding:40px; color:#9F9F9F; font-size:12.5px; }
.gestor-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:100; align-items:center; justify-content:center; padding:24px; }
.gestor-modal-overlay.ativo { display:flex; }
.gestor-modal { background:#fff; border-radius:26px; max-width:420px; width:100%; max-height:85vh; overflow-y:auto; padding:32px; position:relative; }
.gestor-modal-close { position:absolute; top:20px; right:20px; width:32px; height:32px; border-radius:50%; background:#F5F5F5; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; color:#5D5D5D; }
.gestor-modal-close:hover { background:#E9E9E9; }
.gestor-tabs { max-width:1040px; margin:0 auto; padding:0 28px; display:flex; gap:6px; border-bottom:0.75pt solid #D8D5D5; }
.gestor-tab { background:none; border:none; padding:14px 4px; margin-right:22px; font-family:'Inter',sans-serif; font-size:12.5px; font-weight:700; color:#9F9F9F; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-0.75pt; }
.gestor-tab.ativa { color:#1A1A1A; border-bottom-color:#C89A2E; }
.gestor-perfil-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:0.75pt solid #EEECEC; }
.gestor-perfil-row:last-child { border-bottom:none; }
.gestor-perfil-info { flex:1; min-width:0; }
.gestor-perfil-nome { font-weight:800; color:#1A1A1A; font-size:12.5px; }
.gestor-perfil-sub { font-size:11px; color:#9F9F9F; margin-top:1px; }
.gestor-perfil-remover { background:none; border:0.75pt solid #E3BDBB; color:#C0433D; border-radius:8px; padding:6px 12px; font-size:11px; font-weight:700; cursor:pointer; }
.gestor-perfil-remover:hover { background:#FBEEED; }
.gestor-form-add { display:flex; gap:8px; margin-bottom:18px; }
.gestor-form-add input { flex:1; border:0.75pt solid #D8D5D5; border-radius:10px; padding:9px 12px; font-size:12.5px; font-family:'Inter',sans-serif; }
.gestor-form-add input:focus { outline:none; border-color:#C89A2E; }
.gestor-form-add button { background:#1A1A1A; color:#fff; border:none; border-radius:10px; padding:9px 18px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
.gestor-form-erro { color:#C0433D; font-size:11.5px; margin:-10px 0 14px; }
.gestor-switch { position:relative; width:38px; height:22px; border-radius:99px; background:#D8D5D5; border:none; cursor:pointer; flex-shrink:0; }
.gestor-switch::after { content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:left .15s; }
.gestor-switch.ativo { background:#3D8B5F; }
.gestor-switch.ativo::after { left:18px; }
`;

export const GESTOR_HTML = `
<div class="gestor-page">
  <div class="gestor-hero">
    <div class="gestor-hero-inner">
      <div>
        <a class="gestor-back" href="/">← Time</a>
        <div class="gestor-title">Visão geral da área</div>
        <div class="gestor-sub">Valores calculados pelo sistema, sem a máscara do manual — visão restrita a gestores.</div>
        <div class="gestor-filtros">
          <select class="gestor-pickmes" id="selMesGestor"></select>
          <select class="gestor-pickmes" id="selAnoGestor"><option>2026</option><option>2027</option></select>
        </div>
      </div>
      <div class="gestor-destaque">
        <div class="gestor-destaque-num" id="gestorDestaqueNum">—</div>
        <div class="gestor-destaque-label">CS com pelo menos um indicador abaixo da meta</div>
      </div>
    </div>
  </div>

  <div class="gestor-tabs">
    <button class="gestor-tab ativa" id="tabVisaoGeral" onclick="mudarAba('visaoGeral')">Visão geral</button>
    <button class="gestor-tab" id="tabControlePerfis" onclick="mudarAba('controlePerfis')">Controle de perfis</button>
  </div>

  <div class="gestor-body" id="abaVisaoGeral">
    <div id="gestorConteudo">
      <div class="gestor-section-title">Indicadores por CS (valor calculado)<div class="line"></div></div>
      <button class="gestor-toggle-btn" id="btnDivergencia">Ver divergência</button>
      <div class="gestor-card"><div id="gestorTabelaWrap"><div class="gestor-empty">Carregando...</div></div></div>

      <div class="gestor-section-title">Ranking (score real)<div class="line"></div></div>
      <div class="gestor-card"><div id="gestorRanking"><div class="gestor-empty">Carregando...</div></div></div>

      <div class="gestor-section-title">Alertas<div class="line"></div></div>
      <div class="gestor-card"><div id="gestorAlertas"><div class="gestor-empty">Carregando...</div></div></div>
    </div>
  </div>

  <div class="gestor-body" id="abaControlePerfis" style="display:none;">
    <div class="gestor-section-title">Gestores<div class="line"></div></div>
    <div class="gestor-card">
      <div class="gestor-form-add">
        <input type="email" id="inputNovoGestorEmail" placeholder="nome@moaiclubedelideres.com" />
        <button onclick="adicionarGestorUI()">Adicionar</button>
      </div>
      <div id="gestorFormErro" class="gestor-form-erro" style="display:none;"></div>
      <div id="listaGestores"><div class="gestor-empty">Carregando...</div></div>
    </div>

    <div class="gestor-section-title">CS ativos<div class="line"></div></div>
    <div class="gestor-card">
      <div id="listaCSRoster"><div class="gestor-empty">Carregando...</div></div>
    </div>
  </div>
</div>

<div class="gestor-modal-overlay" id="gestorModalOverlay" onclick="if(event.target===this) fecharRadarModal()">
  <div class="gestor-modal">
    <div class="gestor-modal-close" onclick="fecharRadarModal()">✕</div>
    <div id="gestorModalBody"></div>
  </div>
</div>
`;

export const GESTOR_SCRIPT = `
function fetchJSON_(url) {
  return fetch(url, { cache: 'no-store' }).then(function (res) {
    // Mesmo comportamento do dashboard: sessão expirada ou acesso negado (401/403) manda de
    // volta pro /login em vez de tentar renderizar um erro genérico na tela do gestor.
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/login';
      return new Promise(function () {});
    }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
      return data;
    });
  });
}

var STATUS_COR = { dentro_da_meta: '#3D8B5F', no_limite: '#C89A2E', abaixo_da_meta: '#C0433D', sem_dado: '#9F9F9F' };
function statusCor(s) { return STATUS_COR[s] || '#9F9F9F'; }

var dadosAtuais = null;
var modoDivergencia = false;

function renderHeader() {
  document.getElementById('gestorDestaqueNum').textContent = dadosAtuais.csAbaixoDaMeta;
}

function renderTabela() {
  var ordem = dadosAtuais.indicadoresOrdem;
  var labels = dadosAtuais.labelsIndicador;
  var thead = '<tr><th>CS</th>' + ordem.map(function (k) { return '<th>' + (labels[k] || k) + '</th>'; }).join('') + '</tr>';
  var rows = dadosAtuais.porCS.map(function (cs, idx) {
    var cells = ordem.map(function (k) {
      var i = cs.indicadores[k];
      var cor = statusCor(i.status);
      var temDivergencia = modoDivergencia && i.manual !== null && i.manual !== undefined && i.manual !== i.calculado;
      if (temDivergencia) {
        return '<td><div class="gestor-cel" style="background:' + cor + ';"><span class="gestor-cel-manual">' + i.manual + ' informado</span><span class="gestor-cel-calc">' + i.calculado + ' real</span></div></td>';
      }
      var valor = (i.calculado === null || i.calculado === undefined) ? '—' : i.calculado;
      return '<td><div class="gestor-cel" style="background:' + cor + ';"><span class="gestor-cel-calc">' + valor + '</span></div></td>';
    }).join('');
    return '<tr class="gestor-row" onclick="abrirRadarModal(' + idx + ')"><td style="text-align:left;font-weight:800;color:#1A1A1A;">' + cs.nome + '</td>' + cells + '</tr>';
  }).join('');
  document.getElementById('gestorTabelaWrap').innerHTML = '<table class="gestor-table"><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table>';
}

function alternarDivergencia() {
  modoDivergencia = !modoDivergencia;
  var btn = document.getElementById('btnDivergencia');
  btn.classList.toggle('ativo', modoDivergencia);
  btn.textContent = modoDivergencia ? 'Ver valores' : 'Ver divergência';
  renderTabela();
}

function renderRanking() {
  if (!dadosAtuais.ranking.length) { document.getElementById('gestorRanking').innerHTML = '<div class="gestor-empty">Sem dados suficientes neste período.</div>'; return; }
  var maxScore = Math.max.apply(null, dadosAtuais.ranking.map(function (r) { return r.scoreReal || 0; }).concat([1]));
  var html = dadosAtuais.ranking.map(function (r, i) {
    var pct = maxScore > 0 ? (r.scoreReal / maxScore * 100) : 0;
    return '<div class="gestor-ranking-row"><span class="gestor-ranking-pos">' + (i + 1) + 'º</span>' +
      '<span class="gestor-ranking-nome">' + r.nome + '</span>' +
      '<div class="gestor-ranking-bar-bg"><div class="gestor-ranking-bar-fill" style="width:' + pct + '%;"></div></div>' +
      '<span class="gestor-ranking-score">' + (r.scoreReal === null || r.scoreReal === undefined ? '—' : r.scoreReal) + '</span></div>';
  }).join('');
  document.getElementById('gestorRanking').innerHTML = html;
}

function renderAlertas() {
  var comAlertas = dadosAtuais.porCS.filter(function (c) { return c.alertas.length > 0; });
  if (comAlertas.length === 0) { document.getElementById('gestorAlertas').innerHTML = '<div class="gestor-empty">Nenhum alerta neste período.</div>'; return; }
  var html = comAlertas.map(function (c) {
    return '<div class="gestor-alertas-cs"><div class="gestor-alertas-nome">' + c.nome + '</div>' +
      c.alertas.map(function (a) { return '<div class="gestor-alerta-linha">' + a + '</div>'; }).join('') +
      '</div>';
  }).join('');
  document.getElementById('gestorAlertas').innerHTML = html;
}

// Radar SVG feito à mão, sem lib externa — duas séries só (CS clicado x média da equipe), eixos
// vindos prontos do back-end (radarPct em lib/reports.ts), escala 0-150 com 100 = bateu a meta.
function radarSVG(labels, serieA, serieB) {
  var n = labels.length;
  var cx = 150, cy = 150, r = 108;
  var angleStep = (2 * Math.PI) / n;
  function ponto(i, valor) {
    var frac = Math.max(0, Math.min(150, valor)) / 150;
    var ang = -Math.PI / 2 + i * angleStep;
    return [cx + r * frac * Math.cos(ang), cy + r * frac * Math.sin(ang)];
  }
  var aneis = [50, 100, 150].map(function (val) {
    var pts = [];
    for (var i = 0; i < n; i++) pts.push(ponto(i, val).join(','));
    return '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#E9E9E9" stroke-width="1" stroke-dasharray="' + (val === 100 ? '0' : '3,3') + '"/>';
  }).join('');
  var eixos = labels.map(function (_, i) {
    var p = ponto(i, 150);
    return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#E9E9E9" stroke-width="1"/>';
  }).join('');
  var rotulos = labels.map(function (lbl, i) {
    var p = ponto(i, 172);
    return '<text x="' + p[0] + '" y="' + p[1] + '" font-size="11" fill="#5D5D5D" text-anchor="middle" font-family="Inter">' + lbl + '</text>';
  }).join('');
  function poligono(serie, cor, opacidade, somenteContorno) {
    var pts = serie.map(function (v, i) { return ponto(i, v).join(','); }).join(' ');
    return '<polygon points="' + pts + '" fill="' + (somenteContorno ? 'none' : cor) + '" fill-opacity="' + (somenteContorno ? 0 : opacidade) + '" stroke="' + cor + '" stroke-width="2.5"/>';
  }
  return '<svg viewBox="0 0 300 320" style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto;">' +
    aneis + eixos +
    poligono(serieB, '#9F9F9F', 0, true) +
    poligono(serieA, '#C89A2E', 0.32, false) +
    rotulos +
    '</svg>';
}

function abrirRadarModal(idx) {
  var cs = dadosAtuais.porCS[idx];
  var svg = radarSVG(dadosAtuais.radarEixos, cs.radar, dadosAtuais.radarEquipe);
  document.getElementById('gestorModalBody').innerHTML =
    '<div style="text-align:center;">' +
    '<div style="font-family:\\'Bricolage Grotesque\\',sans-serif;font-weight:800;font-size:20px;color:#1A1A1A;margin-bottom:4px;">' + cs.nome + '</div>' +
    '<div style="font-size:11.5px;color:#9F9F9F;margin-bottom:14px;">Score real: <strong style="color:#1A1A1A;">' + (cs.scoreReal === null ? '—' : cs.scoreReal) + '</strong></div>' +
    svg +
    '<div style="font-size:11px;color:#9F9F9F;margin-top:10px;"><span style="color:#C89A2E;">●</span> ' + cs.nome + ' &nbsp; <span style="color:#9F9F9F;">○</span> média da equipe</div>' +
    '</div>';
  document.getElementById('gestorModalOverlay').classList.add('ativo');
}
function fecharRadarModal() { document.getElementById('gestorModalOverlay').classList.remove('ativo'); }

function carregarVisaoGestor(mes, ano) {
  document.getElementById('gestorConteudo').style.opacity = '0.5';
  fetchJSON_('/api/gestor/visao-geral?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(function (data) {
    dadosAtuais = data;
    document.getElementById('gestorConteudo').style.opacity = '1';
    renderHeader();
    renderTabela();
    renderRanking();
    renderAlertas();
  }).catch(function (err) {
    document.getElementById('gestorConteudo').style.opacity = '1';
    document.getElementById('gestorTabelaWrap').innerHTML = '<div class="gestor-empty">Erro ao carregar: ' + err.message + '</div>';
  });
}

function mudarAba(aba) {
  var ehVisaoGeral = aba === 'visaoGeral';
  document.getElementById('abaVisaoGeral').style.display = ehVisaoGeral ? '' : 'none';
  document.getElementById('abaControlePerfis').style.display = ehVisaoGeral ? 'none' : '';
  document.getElementById('tabVisaoGeral').classList.toggle('ativa', ehVisaoGeral);
  document.getElementById('tabControlePerfis').classList.toggle('ativa', !ehVisaoGeral);
  if (!ehVisaoGeral) { carregarGestores(); carregarCSRoster(); }
}

// ============ controle de perfis: gestores ============

function renderGestores(lista) {
  if (!lista.length) { document.getElementById('listaGestores').innerHTML = '<div class="gestor-empty">Nenhum gestor cadastrado.</div>'; return; }
  var html = lista.map(function (g) {
    return '<div class="gestor-perfil-row"><div class="gestor-perfil-info">' +
      '<div class="gestor-perfil-nome">' + (g.nome || g.email) + '</div>' +
      '<div class="gestor-perfil-sub">' + g.email + '</div></div>' +
      '<button class="gestor-perfil-remover" data-email="' + g.email + '" onclick="removerGestorUI(this.dataset.email)">Remover</button></div>';
  }).join('');
  document.getElementById('listaGestores').innerHTML = html;
}

function carregarGestores() {
  fetchJSON_('/api/gestor/gestores').then(function (data) { renderGestores(data.gestores || []); })
    .catch(function (err) { document.getElementById('listaGestores').innerHTML = '<div class="gestor-empty">Erro ao carregar: ' + err.message + '</div>'; });
}

function mostrarErroForm(msg) {
  var el = document.getElementById('gestorFormErro');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function adicionarGestorUI() {
  var input = document.getElementById('inputNovoGestorEmail');
  var email = (input.value || '').trim().toLowerCase();
  // Validação no front é só conveniência (feedback rápido) — a função adicionar_gestor no banco
  // valida o domínio de novo antes de gravar, então nunca é a única barreira.
  if (!/^[^@\\s]+@moaiclubedelideres\\.com$/.test(email)) {
    mostrarErroForm('E-mail precisa terminar em @moaiclubedelideres.com');
    return;
  }
  mostrarErroForm('');
  fetch('/api/gestor/gestores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
    .then(function (res) {
      if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return new Promise(function () {}); }
      return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || ('Erro ' + res.status)); return data; });
    })
    .then(function (data) { input.value = ''; renderGestores(data.gestores || []); })
    .catch(function (err) { mostrarErroForm(err.message); });
}

function removerGestorUI(email) {
  if (!window.confirm('Remover o gestor ' + email + '? Ele perde acesso à visão da área imediatamente.')) return;
  fetch('/api/gestor/gestores?email=' + encodeURIComponent(email), { method: 'DELETE' })
    .then(function (res) {
      if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return new Promise(function () {}); }
      return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || ('Erro ' + res.status)); return data; });
    })
    .then(function (data) { renderGestores(data.gestores || []); })
    .catch(function (err) { window.alert('Não foi possível remover: ' + err.message); });
}

// ============ controle de perfis: roster de CS ============

function renderCSRoster(lista) {
  if (!lista.length) { document.getElementById('listaCSRoster').innerHTML = '<div class="gestor-empty">Nenhum CS cadastrado.</div>'; return; }
  var html = lista.map(function (c) {
    return '<div class="gestor-perfil-row"><div class="gestor-perfil-info">' +
      '<div class="gestor-perfil-nome">' + c.nome + '</div>' +
      '<div class="gestor-perfil-sub">' + c.nomeCompleto + ' · ' + (c.ativo ? 'ativo' : 'inativo') + '</div></div>' +
      '<button class="gestor-switch' + (c.ativo ? ' ativo' : '') + '" data-nome="' + c.nome + '" data-ativo="' + c.ativo + '" onclick="toggleCSAtivoUI(this.dataset.nome, this.dataset.ativo !== &quot;true&quot;)" title="' + (c.ativo ? 'Inativar' : 'Reativar') + '"></button></div>';
  }).join('');
  document.getElementById('listaCSRoster').innerHTML = html;
}

function carregarCSRoster() {
  fetchJSON_('/api/gestor/cs-roster').then(function (data) { renderCSRoster(data.roster || []); })
    .catch(function (err) { document.getElementById('listaCSRoster').innerHTML = '<div class="gestor-empty">Erro ao carregar: ' + err.message + '</div>'; });
}

function toggleCSAtivoUI(nome, novoAtivo) {
  var acao = novoAtivo ? 'reativar' : 'inativar';
  if (!window.confirm('Confirma ' + acao + ' ' + nome + '?')) return;
  fetch('/api/gestor/cs-roster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, ativo: novoAtivo }) })
    .then(function (res) {
      if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return new Promise(function () {}); }
      return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || ('Erro ' + res.status)); return data; });
    })
    .then(function (data) { renderCSRoster(data.roster || []); })
    .catch(function (err) { window.alert('Não foi possível alterar: ' + err.message); });
}

(function initGestor() {
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var selMes = document.getElementById('selMesGestor');
  MESES.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  var agora = new Date();
  selMes.value = MESES[agora.getMonth()];
  document.getElementById('selAnoGestor').value = String(agora.getFullYear());

  function aoMudarFiltro() {
    carregarVisaoGestor(selMes.value, Number(document.getElementById('selAnoGestor').value));
  }
  selMes.onchange = aoMudarFiltro;
  document.getElementById('selAnoGestor').onchange = aoMudarFiltro;
  document.getElementById('btnDivergencia').onclick = alternarDivergencia;

  aoMudarFiltro();
})();
`;
