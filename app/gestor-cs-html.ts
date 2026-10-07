// Página do CS na visão do gestor (/gestor/cs/[nome], 07/10/2026). Mesmo padrão vanilla das outras
// páginas: HTML, CSS e JS em strings, sem dependência nova no cliente. Uma única chamada a
// /api/gestor/cs/[nome] traz tudo (cabeçalho, radar, GTD, críticos por produto, Health da Base e
// advertências); cada seção é desenhada à parte e mostra a mensagem real do erro só dela. Esta
// página só desenha: pontuação, posição, radar, GTD e críticos vêm prontos do servidor. A aplicação
// de advertência mora aqui; a escrita passa pelas rotas e funções SECURITY DEFINER de gestor.
import { RADAR_SVG_SCRIPT } from '../lib/radar-svg';
import { GTD_CHECKLIST_STYLE } from '../lib/gtd-checklist';

export const GESTOR_CS_STYLE = `
:root{
  --cinza-fundo:#F5F5F5; --preto-tinta:#1A1A1A; --preto-profundo:#141414; --grafite:#272727;
  --branco:#FFFFFF; --cinza-texto:#5D5D5D; --cinza-apoio:#9F9F9F;
  --cinza-linha:#C6C4C4; --cinza-borda:#D8D5D5; --cinza-superficie:#E9E9E9;
  --vermelho:#C0433D; --dourado:#C89A2E; --verde:#3D8B5F;
}
.cs-page *{box-sizing:border-box;}
.cs-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;}
.cs-page h1,.cs-page h2,.cs-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1040px;margin:0 auto;padding:0 28px 80px;}
@media (max-width:600px){ .page{padding:0 16px 60px;} .hero{padding:26px 18px !important;} }
.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;flex-wrap:wrap;gap:12px;}
.voltar-btn{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);background:var(--branco);}
.voltar-btn:hover{background:var(--cinza-superficie);}
.seletor{display:flex;gap:8px;flex-wrap:wrap;}
.seletor select{font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:10px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.hero{position:relative;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#141414 0%,#1A1A1A 48%,#272727 100%);padding:36px;color:var(--branco);}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);pointer-events:none;}
.hero-top{position:relative;z-index:1;display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.foto-cs{width:112px;height:112px;border-radius:28px;object-fit:cover;background:var(--grafite);flex-shrink:0;}
.foto-cs-fallback{width:112px;height:112px;border-radius:28px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:46px;color:#fff;flex-shrink:0;}
.hero-eyebrow{font-size:11px;letter-spacing:0.1em;font-weight:600;color:var(--dourado);text-transform:uppercase;}
.hero h1{font-size:30px;font-weight:700;margin:2px 0 4px;}
.hero-sub{font-size:13px;color:#C6C4C4;margin:0;}
.hero-selos{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
.selo{font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,0.1);color:#E9E9E9;border:1px solid rgba(255,255,255,0.2);}
.selo.ouro{background:var(--dourado);color:var(--preto-tinta);border-color:var(--dourado);}
.selo.alerta{background:#FBEEEC;color:var(--vermelho);border-color:#EBC6C0;}
.stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:24px;}
.stat{background:var(--branco);color:var(--preto-tinta);border-radius:18px;padding:16px 18px;}
.stat.alerta{background:#FBEEEC;border:1px solid #EBC6C0;}
.stat-label{font-size:11px;font-weight:700;color:var(--cinza-texto);text-transform:uppercase;letter-spacing:.04em;}
.stat-valor{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;line-height:1.1;margin-top:6px;}
.stat.alerta .stat-valor{color:var(--vermelho);}
.stat-sub{font-size:11.5px;color:var(--cinza-texto);margin-top:4px;line-height:1.4;}
.block{margin-top:34px;}
.block h2{font-size:21px;font-weight:700;margin:0 0 6px;}
.block .sub{font-size:13px;font-weight:400;color:var(--cinza-texto);display:block;margin-top:2px;font-family:'Inter',sans-serif;letter-spacing:0;}
.card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:22px;padding:22px;margin-top:14px;}
.erro-secao{padding:14px 16px;border-radius:12px;background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;font-size:13px;line-height:1.5;margin-top:14px;}
.vazio{padding:16px;border-radius:12px;background:var(--cinza-fundo);color:var(--cinza-texto);font-size:13px;line-height:1.5;}
details.composicao{margin-top:16px;background:rgba(255,255,255,0.06);border-radius:14px;padding:12px 16px;position:relative;z-index:1;}
details.composicao summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#E9E9E9;}
.comp-linha{display:grid;grid-template-columns:1.6fr 70px 1.3fr 70px;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:12.5px;color:#E9E9E9;}
.comp-linha:last-child{border-bottom:none;}
.comp-linha .num{text-align:right;}
.comp-nota{margin-top:8px;font-size:11.5px;color:#C6C4C4;line-height:1.5;}
.radar-bloco{display:grid;grid-template-columns:minmax(260px,380px) 1fr;gap:24px;align-items:center;}
@media (max-width:760px){ .radar-bloco{grid-template-columns:1fr;} }
.radar-svg-wrap{display:flex;justify-content:center;}
table.leg{width:100%;border-collapse:collapse;font-size:13px;}
table.leg th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--cinza-texto);text-align:left;padding:6px 8px;border-bottom:1px solid var(--cinza-borda);}
table.leg td{padding:9px 8px;border-bottom:1px solid #EFEDED;}
table.leg td.num,table.leg th.num{text-align:right;}
.tag-sem-meta{display:inline-block;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--cinza-superficie);color:var(--cinza-texto);}
.gtd-geral{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px;}
.gtd-geral-valor{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:36px;line-height:1;}
.gtd-geral-sub{font-size:12.5px;color:var(--cinza-texto);}
.barra{height:8px;border-radius:99px;background:var(--cinza-superficie);overflow:hidden;}
.barra > i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--dourado),var(--verde));}
.gtd-linha{display:grid;grid-template-columns:1.3fr 1.4fr 70px auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #EFEDED;font-size:13px;}
.gtd-linha:last-child{border-bottom:none;}
.gtd-linha a{color:var(--preto-tinta);font-weight:700;text-decoration:none;}
.gtd-linha a:hover{text-decoration:underline;}
.gtd-linha .meta{font-size:11.5px;color:var(--cinza-texto);}
@media (max-width:700px){ .gtd-linha{grid-template-columns:1fr 1fr;} }
.atraso{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.nota{font-size:12px;color:var(--cinza-texto);margin-top:12px;line-height:1.5;}
.crit-total{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.crit-total b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:36px;line-height:1;}
.form-adv{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 16px;}
.form-adv label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;color:var(--cinza-texto);}
.form-adv select,.form-adv textarea,.edit-obs{font:inherit;font-size:13px;font-weight:400;padding:8px 10px;border-radius:10px;border:1px solid var(--cinza-borda);background:var(--branco);color:var(--preto-tinta);}
.form-adv textarea,.edit-obs{min-height:62px;width:100%;resize:vertical;}
.btn{background:#D4AF37;color:#1A1A1A;border:none;border-radius:10px;padding:9px 16px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;}
.btn:disabled{opacity:.6;cursor:default;}
.btn.sec{background:var(--cinza-superficie);color:var(--preto-tinta);}
.btn.perigo{background:#FBEEEC;color:var(--vermelho);border:1px solid #EBC6C0;}
.adv-linha{padding:14px 0;border-bottom:1px solid #EFEDED;font-size:13px;}
.adv-linha:last-child{border-bottom:none;}
.adv-topo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.adv-tipo{font-weight:700;}
.status-adv{font-size:10.5px;font-weight:800;padding:3px 10px;border-radius:99px;}
.status-adv.ativa{background:#FBEEEC;color:var(--vermelho);}
.status-adv.vencida{background:var(--cinza-superficie);color:var(--cinza-texto);}
.adv-meta{font-size:12px;color:var(--cinza-texto);margin-top:4px;line-height:1.5;}
.adv-acoes{margin-left:auto;display:flex;gap:6px;}
.efeito{padding:12px 14px;border-radius:12px;background:var(--cinza-fundo);font-size:13px;line-height:1.5;margin-bottom:14px;}
.msg{font-size:12px;font-weight:600;margin-left:8px;}
${GTD_CHECKLIST_STYLE}
`;

export const GESTOR_CS_HTML = `
<div class="cs-page">
<div class="page">
  <header class="topbar">
    <a href="/gestor" class="voltar-btn">&larr; Voltar à visão da área</a>
    <div class="seletor">
      <select id="selMesCS" aria-label="Mês"></select>
      <select id="selAnoCS" aria-label="Ano"><option>2025</option><option>2026</option><option>2027</option></select>
    </div>
  </header>

  <section class="hero" id="heroCS"><div class="vazio" style="background:rgba(255,255,255,0.08);color:#E9E9E9;">Carregando…</div></section>

  <section class="block">
    <h2>Radar dos indicadores <span class="sub">Cada eixo vai de 0 a 150, e 100 significa meta batida. Eixo sem meta aparece com marcador vazio.</span></h2>
    <div class="card" id="secRadar"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Andamento do GTD <span class="sub">Etapas feitas sobre etapas totais dos ciclos atuais dos conselhos deste CS.</span></h2>
    <div class="card" id="secGtd"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Membros críticos <span class="sub">Percentual no report mais recente, no total e por produto. Os nomes ficam só no report do próprio CS.</span></h2>
    <div class="card" id="secCriticos"><div class="vazio">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Advertências <span class="sub">Pontos ativos entram no Health da Base do CS. O CS vê o que foi aplicado na aba Pontos tomados.</span></h2>
    <div class="card" id="secAdvertencias"><div class="vazio">Carregando…</div></div>
  </section>
</div>
</div>
`;

// O nome do CS entra por JSON.stringify (nunca por concatenação crua), como nas outras páginas.
// O JS abaixo evita barra invertida e crase para não precisar de escapes dentro da template literal.
export function gestorCSScript(nome: string): string {
  return `
${RADAR_SVG_SCRIPT}
var CS_NOME = ${JSON.stringify(nome).replace(/</g, '\\u003c')};
var LIMIAR_ADVERTENCIA_DESTAQUE = 3;
var MESES_CS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var DADOS_CS = null;
var advEditandoId = null;
var advExcluindoId = null;

function fetchJSON_(url, opts) {
  opts = opts || {};
  opts.cache = 'no-store';
  return fetch(url, opts).then(function (res) {
    if (res.status === 401) { window.location.href = '/login'; return new Promise(function () {}); }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
      return data;
    });
  });
}
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function dec(d) { return (d / 10).toFixed(1).replace('.', ',') + '%'; }
function dataBR(iso) {
  if (!iso) return 'sem data';
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function corDoNome(nome) {
  var cores = ['#8A6D1C', '#3D8B5F', '#C0433D', '#2F6F8F', '#6B4E9B', '#B5651D', '#4A7A4A'];
  var h = 0; String(nome || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  return cores[h % cores.length];
}
function erroSecao(msg) { return '<div class="erro-secao">Não foi possível carregar esta seção: ' + esc(msg) + '</div>'; }
function numFmt(v) { return (v === null || v === undefined) ? 'Sem dado' : Number(v).toLocaleString('pt-BR'); }

// ---------- cabeçalho ----------
function renderHeroCS(d) {
  var el = document.getElementById('heroCS');
  if (d.cabecalho.erro) { el.innerHTML = erroSecao(d.cabecalho.erro); return; }
  var c = d.cabecalho.dado;
  var adv = d.advertencias.dado, hb = d.health.dado;
  var pontosAtivos = adv ? adv.pontuacaoAtiva : null;
  var acima = pontosAtivos !== null && pontosAtivos > LIMIAR_ADVERTENCIA_DESTAQUE;
  var foto = c.fotoUrl
    ? '<img class="foto-cs" src="' + esc(c.fotoUrl) + '" alt="Foto de ' + esc(c.nome) + '">'
    : '<div class="foto-cs-fallback" style="background:' + corDoNome(c.nomeCompleto || c.nome) + '">' + esc((c.nome || '?').charAt(0).toUpperCase()) + '</div>';
  var temNota = c.pontuacao !== null && c.pontuacao !== undefined;
  var selos = temNota
    ? '<span class="selo ouro">' + c.posicao + 'º de ' + c.totalRankeados + ' no ranking</span>'
    : '<span class="selo">Sem dados suficientes, fora do ranking</span>';
  if (acima) selos += '<span class="selo alerta">Advertências acima de ' + LIMIAR_ADVERTENCIA_DESTAQUE + ' pontos</span>';
  var carteira = c.carteira.numConselhos + (c.carteira.numConselhos === 1 ? ' conselho' : ' conselhos');
  var metaCarteira = c.carteira.semMetaPropria ? 'sem meta própria cadastrada' : 'meta de ' + c.carteira.meta;
  var healthTxt = 'Sem apuração', healthSub = '';
  if (hb) {
    if (hb.comPontosDecimos !== null && hb.comPontosDecimos !== undefined) healthTxt = dec(hb.comPontosDecimos);
    if (!hb.semApuracao) healthSub = 'sem os pontos: ' + dec(hb.semPontosDecimos);
  } else if (d.health.erro) { healthTxt = 'Erro'; healthSub = d.health.erro; }

  var linhas = c.detalhamento.map(function (it) {
    var sem = !!it.semMeta;
    return '<div class="comp-linha"><span>' + esc(it.label) + (sem ? ' (sem meta)' : '') + '</span><span class="num">peso ' + it.peso + '</span>'
      + '<span>' + (sem ? numFmt(it.valorAlcancado) + ', sem meta' : numFmt(it.valorAlcancado) + ' de ' + numFmt(it.meta) + ', ' + it.achievementPct + '%') + '</span>'
      + '<span class="num">' + (sem || it.pontos === null ? 'fora da média' : it.pontos + ' pts') + '</span></div>';
  }).join('');

  el.innerHTML = '<div class="hero-top">' + foto + '<div><div class="hero-eyebrow">CS</div><h1>' + esc(c.nome) + '</h1>'
    + '<p class="hero-sub">' + esc(carteira) + ' na carteira, ' + esc(metaCarteira) + '</p><div class="hero-selos">' + selos + '</div></div></div>'
    + '<div class="stats">'
    + '<div class="stat"><div class="stat-label">Pontuação</div><div class="stat-valor">' + (temNota ? c.pontuacao : 'Sem nota') + '</div><div class="stat-sub">'
      + (temNota ? c.elegiveis + ' indicadores com meta' : c.elegiveis + ' de ' + c.minimoIndicadores + ' indicadores com meta') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Posição</div><div class="stat-valor">' + (temNota ? c.posicao + 'º' : 'Fora') + '</div><div class="stat-sub">' + (temNota ? 'entre ' + c.totalRankeados + ' CS ranqueados' : 'sem número no ranking') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Carteira</div><div class="stat-valor">' + c.carteira.numConselhos + '</div><div class="stat-sub">' + esc(metaCarteira) + '</div></div>'
    + '<div class="stat' + (acima ? ' alerta' : '') + '"><div class="stat-label">Pontos de advertência</div><div class="stat-valor">' + (pontosAtivos === null ? 'Erro' : pontosAtivos) + '</div><div class="stat-sub">ativos' + (acima ? ', acima do limite de ' + LIMIAR_ADVERTENCIA_DESTAQUE : '') + '</div></div>'
    + '<div class="stat"><div class="stat-label">Health da Base</div><div class="stat-valor">' + esc(healthTxt) + '</div><div class="stat-sub">' + esc(healthSub) + '</div></div>'
    + '</div>'
    + '<details class="composicao"><summary>Como a pontuação foi composta</summary>' + linhas
    + '<div class="comp-nota">Pontos são o peso vezes o aproveitamento na meta. Indicador sem meta cadastrada fica fora da média e os pesos dos demais são redistribuídos. A pontuação vai de 0 a 100 e só existe com pelo menos ' + c.minimoIndicadores + ' indicadores com meta.</div></details>';
}

// ---------- radar ----------
function renderRadarCS(d) {
  var el = document.getElementById('secRadar');
  if (d.radar.erro) { el.innerHTML = erroSecao(d.radar.erro); return; }
  var eixos = d.radar.dado;
  var svg = radarSVG(eixos.map(function (e) { return e.label; }), eixos.map(function (e) { return e.pct; }), 'gradCS', 380);
  var linhas = eixos.map(function (e) {
    var un = e.unidade === '%' ? '%' : '';
    return '<tr><td>' + esc(e.label) + '</td><td class="num">' + numFmt(e.valor) + un + '</td><td class="num">' + (e.semMeta ? '<span class="tag-sem-meta">sem meta</span>' : numFmt(e.meta) + un) + '</td>'
      + '<td class="num">' + (e.semMeta ? 'sem meta' : e.pct + '%') + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="radar-bloco"><div class="radar-svg-wrap">' + svg + '</div>'
    + '<table class="leg"><thead><tr><th>Indicador</th><th class="num">Valor</th><th class="num">Meta</th><th class="num">Aproveitamento</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
}

// ---------- GTD ----------
function renderGtdCS(d) {
  var el = document.getElementById('secGtd');
  if (d.gtd.erro) { el.innerHTML = erroSecao(d.gtd.erro); return; }
  var g = d.gtd.dado;
  if (!g.conselhos.length) { el.innerHTML = '<div class="vazio">Nenhum ciclo de GTD em aberto para os conselhos deste CS.</div>'; return; }
  var pct = g.taxa === null ? null : g.taxa;
  var qs = '?mes=' + encodeURIComponent(d.periodo.mes) + '&ano=' + encodeURIComponent(d.periodo.ano);
  var html = '<div class="gtd-geral"><div class="gtd-geral-valor">' + (pct === null ? 'Sem taxa' : pct + '%') + '</div>'
    + '<div style="flex:1;min-width:200px;"><div class="barra"><i style="width:' + (pct === null ? 0 : pct) + '%"></i></div>'
    + '<div class="gtd-geral-sub" style="margin-top:6px;">' + g.feitas + ' de ' + g.total + ' etapas feitas em ' + g.conselhos.length + (g.conselhos.length === 1 ? ' conselho' : ' conselhos') + '</div></div></div>';
  html += g.conselhos.map(function (c) {
    var nome = c.groupId ? '<a href="/conselho/' + encodeURIComponent(c.groupId) + qs + '">' + esc(c.membro) + '</a>' : esc(c.membro);
    var taxa = (c.taxa === null || c.taxa === undefined) ? 0 : c.taxa;
    return '<div class="gtd-linha"><div>' + nome + '<div class="meta">Encontro em ' + esc(dataBR(c.dataConselho)) + (c.vinculado ? '' : ' · não vinculado a um conselho') + '</div></div>'
      + '<div class="barra"><i style="width:' + taxa + '%"></i></div>'
      + '<div><b>' + (c.taxa === null ? 'Sem taxa' : c.taxa + '%') + '</b><div class="meta">' + c.feitas + ' de ' + c.total + '</div></div>'
      + '<div>' + (c.etapasAtrasadas.length ? '<span class="atraso">' + c.etapasAtrasadas.length + (c.etapasAtrasadas.length === 1 ? ' atrasada' : ' atrasadas') + '</span>' : '') + '</div></div>';
  }).join('');
  if (g.naoVinculados.length) html += '<div class="nota">Não vinculados a um conselho ativo: ' + esc(g.naoVinculados.join(', ')) + '. O vínculo é pelo nome do conselheiro, igual à visão do CS.</div>';
  el.innerHTML = html;
}

// ---------- críticos ----------
function renderCriticosCS(d) {
  var el = document.getElementById('secCriticos');
  if (d.criticos.erro) { el.innerHTML = erroSecao(d.criticos.erro); return; }
  var c = d.criticos.dado;
  if (c.estado === 'sem_report') { el.innerHTML = '<div class="vazio">Sem report. Este CS ainda não tem report individual registrado.</div>'; return; }
  if (c.estado === 'sem_detalhamento') {
    var p = c.percentualDecimos;
    el.innerHTML = '<div class="crit-total"><b>' + (p === null || p === undefined ? 'Sem dado' : dec(p)) + '</b><span class="gtd-geral-sub">'
      + (c.criticos === null || c.criticos === undefined ? 'Sem total declarado' : c.criticos + ' críticos de ' + numFmt(c.membros) + ' membros declarados') + ', semana de ' + esc(dataBR(c.semana)) + '</span></div>'
      + '<div class="vazio">Sem detalhamento por produto. O report mais recente foi importado do Monday só com a contagem, sem os nomes dos críticos.</div>';
    return;
  }
  var linhas = c.linhas.map(function (l) {
    return '<tr><td>' + esc(l.produto) + '</td><td class="num">' + l.criticos + '</td><td class="num">' + l.membros + '</td><td class="num">' + (l.percentualDecimos === null ? 'Sem dado' : dec(l.percentualDecimos)) + '</td></tr>';
  }).join('');
  el.innerHTML = '<div class="crit-total"><b>' + (c.total.percentualDecimos === null ? 'Sem dado' : dec(c.total.percentualDecimos)) + '</b><span class="gtd-geral-sub">'
    + c.total.criticos + ' críticos de ' + c.total.membros + ' membros, semana de ' + esc(dataBR(c.semana)) + '</span></div>'
    + '<table class="leg"><thead><tr><th>Produto</th><th class="num">Críticos</th><th class="num">Membros</th><th class="num">Percentual</th></tr></thead><tbody>' + linhas
    + '<tr><td><b>Total do CS</b></td><td class="num"><b>' + c.total.criticos + '</b></td><td class="num"><b>' + c.total.membros + '</b></td><td class="num"><b>' + (c.total.percentualDecimos === null ? 'Sem dado' : dec(c.total.percentualDecimos)) + '</b></td></tr></tbody></table>';
}

// ---------- advertências ----------
function renderAdvertenciasCS(d) {
  var el = document.getElementById('secAdvertencias');
  if (d.advertencias.erro) { el.innerHTML = erroSecao(d.advertencias.erro); return; }
  var a = d.advertencias.dado, hb = d.health.dado;
  var efeito = '';
  if (hb && !hb.semApuracao) {
    efeito = '<div class="efeito">Efeito no Health da Base: <b>' + dec(hb.comPontosDecimos) + '</b> com os ' + hb.pontosAtivos + (hb.pontosAtivos === 1 ? ' ponto ativo' : ' pontos ativos')
      + ' e <b>' + dec(hb.semPontosDecimos) + '</b> sem eles.</div>';
  } else if (hb) { efeito = '<div class="efeito">Health da Base sem apuração: sem report com críticos e base.</div>'; }
  var opcoes = a.tipos.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nome) + ' (' + t.pontos + (t.pontos === 1 ? ' ponto' : ' pontos') + ', ' + t.validadeMeses + ' meses)</option>'; }).join('');
  var form = a.tipos.length
    ? '<div class="form-adv"><label>Tipo<select id="advTipo">' + opcoes + '</select></label>'
      + '<label style="flex:1 1 240px;">Observação (opcional)<textarea id="advObs" placeholder="Contexto da advertência"></textarea></label>'
      + '<div><button class="btn" id="advAplicar" type="button">Aplicar</button><span class="msg" id="advMsg"></span></div></div>'
    : '<div class="vazio" style="margin-bottom:14px;">Nenhum tipo de advertência ativo. Cadastre em Controle de perfis.</div>';
  var lista = a.registros.length ? a.registros.map(function (r) {
    var editando = advEditandoId === r.id, excluindo = advExcluindoId === r.id;
    var acoes = '<div class="adv-acoes"><button class="btn sec" type="button" data-adv-acao="editar" data-id="' + esc(r.id) + '">Editar</button>'
      + (excluindo
        ? '<button class="btn perigo" type="button" data-adv-acao="excluir-confirmar" data-id="' + esc(r.id) + '">Confirmar exclusão</button><button class="btn sec" type="button" data-adv-acao="cancelar" data-id="' + esc(r.id) + '">Cancelar</button>'
        : '<button class="btn perigo" type="button" data-adv-acao="excluir" data-id="' + esc(r.id) + '">Excluir</button>') + '</div>';
    var corpo = editando
      ? '<div style="margin-top:8px;"><textarea class="edit-obs" id="advObsEdit">' + esc(r.observacao || '') + '</textarea><div style="margin-top:8px;display:flex;gap:6px;"><button class="btn" type="button" data-adv-acao="salvar" data-id="' + esc(r.id) + '">Salvar</button><button class="btn sec" type="button" data-adv-acao="cancelar" data-id="' + esc(r.id) + '">Cancelar</button></div></div>'
      : (r.observacao ? '<div class="adv-meta">' + esc(r.observacao) + '</div>' : '');
    var validade = new Date(r.aplicadoEm); validade.setMonth(validade.getMonth() + r.validadeMeses);
    return '<div class="adv-linha"><div class="adv-topo"><span class="adv-tipo">' + esc(r.tipoNome) + '</span><span>' + r.pontos + (r.pontos === 1 ? ' ponto' : ' pontos') + '</span>'
      + '<span class="status-adv ' + (r.ativa ? 'ativa' : 'vencida') + '">' + (r.ativa ? 'Ativa' : 'Vencida') + '</span>' + acoes + '</div>'
      + '<div class="adv-meta">Aplicada em ' + esc(dataBR(r.aplicadoEm)) + ' por ' + esc(r.aplicadoPor) + ', válida até ' + esc(dataBR(validade.toISOString())) + '</div>' + corpo + '</div>';
  }).join('') : '<div class="vazio">Nenhuma advertência aplicada a este CS.</div>';
  el.innerHTML = efeito + form + lista;
}

function renderTudoCS(d) {
  DADOS_CS = d;
  renderHeroCS(d); renderRadarCS(d); renderGtdCS(d); renderCriticosCS(d); renderAdvertenciasCS(d);
}

function carregarCS() {
  var mes = document.getElementById('selMesCS').value, ano = document.getElementById('selAnoCS').value;
  fetchJSON_('/api/gestor/cs/' + encodeURIComponent(CS_NOME) + '?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(renderTudoCS).catch(function (err) {
    document.getElementById('heroCS').innerHTML = erroSecao(err.message);
    ['secRadar', 'secGtd', 'secCriticos', 'secAdvertencias'].forEach(function (id) { document.getElementById(id).innerHTML = ''; });
  });
}

function postAdv(url, metodo, corpo) {
  var opts = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (corpo) opts.body = JSON.stringify(corpo);
  return fetchJSON_(url, opts);
}
document.addEventListener('click', function (ev) {
  var alvo = ev.target;
  if (!alvo || !alvo.closest) return;
  var base = '/api/cs/' + encodeURIComponent(CS_NOME) + '/advertencias';
  if (alvo.id === 'advAplicar') {
    var msg = document.getElementById('advMsg');
    alvo.disabled = true; msg.style.color = '#5D5D5D'; msg.textContent = 'Aplicando';
    postAdv(base, 'POST', { tipoId: document.getElementById('advTipo').value, observacao: document.getElementById('advObs').value.trim() || null })
      .then(carregarCS).catch(function (err) { alvo.disabled = false; msg.style.color = '#C0433D'; msg.textContent = 'Erro: ' + err.message; });
    return;
  }
  var botao = alvo.closest('[data-adv-acao]');
  if (!botao) return;
  var acao = botao.getAttribute('data-adv-acao'), id = botao.getAttribute('data-id');
  if (acao === 'editar') { advEditandoId = id; advExcluindoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'excluir') { advExcluindoId = id; advEditandoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'cancelar') { advEditandoId = null; advExcluindoId = null; renderAdvertenciasCS(DADOS_CS); }
  else if (acao === 'salvar') {
    postAdv(base + '/' + encodeURIComponent(id), 'PATCH', { observacao: document.getElementById('advObsEdit').value.trim() || null })
      .then(function () { advEditandoId = null; return carregarCS(); }).catch(function (err) { botao.textContent = 'Erro: ' + err.message; });
  } else if (acao === 'excluir-confirmar') {
    postAdv(base + '/' + encodeURIComponent(id), 'DELETE')
      .then(function () { advExcluindoId = null; return carregarCS(); }).catch(function (err) { botao.textContent = 'Erro: ' + err.message; });
  }
});

(function inicializarCS() {
  var selMes = document.getElementById('selMesCS'), selAno = document.getElementById('selAnoCS');
  ['Visão Geral'].concat(MESES_CS).forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  var params = new URLSearchParams(window.location.search);
  var agora = new Date();
  var mesUrl = params.get('mes');
  selMes.value = (mesUrl && (mesUrl === 'Visão Geral' || MESES_CS.indexOf(mesUrl) !== -1)) ? mesUrl : MESES_CS[agora.getMonth()];
  selAno.value = params.get('ano') || String(agora.getFullYear());
  if (!selAno.value) selAno.value = String(agora.getFullYear());
  function aoMudar() {
    var url = new URL(window.location.href);
    url.searchParams.set('mes', selMes.value); url.searchParams.set('ano', selAno.value);
    window.history.replaceState(null, '', url.toString());
    carregarCS();
  }
  selMes.onchange = aoMudar; selAno.onchange = aoMudar;
  aoMudar();
})();
`;
}
