// Shell da página completa de um conselho (/conselho/[grupo]) — mesmo padrão vanilla de
// app/gestor-html.ts e app/dashboard-html.ts: HTML+CSS+JS numa string só, sem framework de
// gráfico nem dependência de client-side nova (CSP do projeto só libera script-src 'self').
// Reaproveita o mesmo sistema visual já aprovado em app/gestor-html.ts (hero escuro com
// gradiente dourado/verde, cartões brancos de cantos arredondados) pra manter consistência com
// o resto do dashboard. Os dados vêm de /api/conselho/[grupo], que faz toda a checagem de
// autenticação de novo — este arquivo só desenha o que a API já calcula.
//
// 24/09/2026 (pedido do Vitor): esta página virou a visão COMBINADA conselheiro + conselho, aberta
// pelos cartões da aba "Conselhos" da home — perfil do conselheiro (board "Conselheiros 2026"),
// presença mensal do ano, tabela de membros (plaquinha, presença, pagamento), ata por membro/mês e
// Big Deal (sempre com o selo "não conferido"). Uma tela só, em vez de modal de conselheiro +
// página de conselho separados.

export const CONSELHO_STYLE = `
:root{
  --cinza-fundo:#F5F5F5; --preto-tinta:#1A1A1A; --preto-profundo:#141414; --grafite:#272727;
  --branco:#FFFFFF; --cinza-texto:#5D5D5D; --cinza-apoio:#9F9F9F;
  --cinza-linha:#C6C4C4; --cinza-borda:#D8D5D5; --cinza-superficie:#E9E9E9;
  --vermelho:#C0433D; --dourado:#C89A2E; --verde:#3D8B5F; --azul:#7dd3fc;
}
.conselho-page *{box-sizing:border-box;}
.conselho-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;}
.conselho-page h1,.conselho-page h2,.conselho-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1040px;margin:0 auto;padding:0 28px 80px;}
@media (max-width:600px){ .page{padding:0 16px 60px;} .hero{padding:28px 20px !important;} }

.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;flex-wrap:wrap;gap:12px;}
.voltar-btn{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);background:var(--branco);}
.voltar-btn:hover{background:var(--cinza-superficie);}
.pill{font-size:12px;padding:6px 12px;border-radius:999px;background:var(--branco);border:1px solid var(--cinza-borda);color:var(--cinza-texto);font-weight:500;}

.hero{position:relative;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#141414 0%,#1A1A1A 48%,#272727 100%);padding:40px 36px;color:var(--branco);}
.hero::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),
             radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);
  pointer-events:none;}
.hero-top{position:relative;z-index:1;display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
.foto-conselheiro{width:96px;height:96px;border-radius:24px;object-fit:cover;background:var(--grafite);flex-shrink:0;}
.foto-conselheiro-fallback{width:96px;height:96px;border-radius:24px;background:var(--grafite);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:30px;color:var(--dourado);flex-shrink:0;}
.hero-eyebrow{font-size:11px;letter-spacing:0.1em;font-weight:600;color:var(--dourado);text-transform:uppercase;}
.hero h1{font-size:28px;font-weight:700;margin:2px 0 4px;}
.hero-sub{font-size:13px;color:#C6C4C4;margin:0;}
.hero-selos{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
.selo{font-size:9.5px;font-weight:800;letter-spacing:0.7px;text-transform:uppercase;padding:4px 10px;border-radius:99px;}
.selo.congelado{background:#007eb5;color:#fff;}
.selo.atencao{background:var(--dourado);color:var(--preto-tinta);}
.selo.neutro{background:rgba(255,255,255,0.1);color:#E9E9E9;border:1px solid rgba(255,255,255,0.2);}
.hero-selector{position:relative;z-index:1;margin-top:22px;display:flex;gap:8px;flex-wrap:wrap;}
.hero-selector select{background:rgba(255,255,255,0.08);color:var(--branco);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:7px 12px;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;cursor:pointer;}
.hero-selector option{color:var(--preto-tinta);}

.metric-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-top:20px;}
.metric-card{background:var(--branco);color:var(--preto-tinta);border:1px solid var(--cinza-borda);border-radius:18px;padding:18px;}
.metric-value{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:28px;line-height:1;}
.metric-label{font-size:11px;color:var(--cinza-apoio);margin-top:8px;}
.metric-card.saude .metric-value{color:var(--dourado);}

.block{margin-top:44px;}
.block h2{font-size:19px;font-weight:700;margin:0 0 16px;}
.block h2 .sub{font-family:'Inter',sans-serif;font-size:12px;font-weight:500;color:var(--cinza-apoio);margin-left:6px;}

.perfil-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
.perfil-item{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:14px;padding:12px 14px;min-width:0;}
.perfil-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--cinza-apoio);}
.perfil-valor{font-size:13.5px;font-weight:600;margin-top:4px;overflow-wrap:anywhere;}
.perfil-item.largo{grid-column:1/-1;}
.perfil-item.largo .perfil-valor{font-weight:500;line-height:1.55;}

.chart-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:20px;overflow-x:auto;}
.chart-legenda{display:flex;gap:16px;font-size:12px;color:var(--cinza-texto);margin-top:10px;flex-wrap:wrap;}

.presenca-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:20px;}
.presenca-flex{display:flex;align-items:center;gap:28px;flex-wrap:wrap;}
.legenda{display:flex;flex-direction:column;gap:8px;font-size:13px;}
.legenda-item{display:flex;align-items:center;gap:8px;color:var(--cinza-texto);}
.legenda-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0;}
.legenda-item b{color:var(--preto-tinta);}
.legenda-obs{font-size:11.5px;color:var(--cinza-apoio);margin-top:4px;max-width:280px;}

.encontros-list{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;overflow:hidden;}
.encontro-row{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-bottom:1px solid var(--cinza-linha);font-size:13px;}
.encontro-row:last-child{border-bottom:none;}
.encontro-mes{font-weight:600;}
.encontro-presenca{color:var(--cinza-texto);}

.membro-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;margin-bottom:12px;overflow:hidden;}
.membro-head{display:flex;align-items:center;gap:10px;padding:14px 18px;cursor:pointer;flex-wrap:wrap;}
.membro-nome{font-weight:700;font-size:14px;flex:1;min-width:160px;}
.membro-chips{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.chip{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--cinza-superficie);color:var(--cinza-texto);white-space:nowrap;}
.chip.verde{background:rgba(61,139,95,0.12);color:var(--verde);}
.chip.vermelho{background:rgba(192,67,61,0.12);color:var(--vermelho);}
.chip.dourado{background:rgba(200,154,46,0.14);color:#9a7417;}
.membro-toggle{font-size:11px;color:var(--cinza-apoio);}
.membro-body{display:none;padding:0 18px 18px;}
.membro-body.aberto{display:block;}
.mes-ata{border-top:1px solid var(--cinza-linha);padding:14px 0;}
.mes-ata-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.mes-ata-titulo{font-size:12px;font-weight:700;color:var(--cinza-apoio);text-transform:uppercase;letter-spacing:0.04em;}
.mes-ata-link{font-size:11px;color:var(--dourado);text-decoration:none;font-weight:600;}
.mes-ata-link:hover{text-decoration:underline;}
.mes-ata-campo{font-size:13px;margin-bottom:6px;line-height:1.5;}
.mes-ata-campo b{font-weight:700;color:var(--preto-tinta);}
.mes-ata-vazio{font-size:12.5px;color:var(--cinza-apoio);font-style:italic;padding:6px 0;}
.oportunidade-chip{display:inline-block;font-size:10.5px;background:rgba(61,139,95,0.12);color:var(--verde);border-radius:6px;padding:2px 8px;margin:4px 6px 0 0;}

.bigdeal{border:1px solid rgba(200,154,46,0.45);background:rgba(200,154,46,0.05);border-radius:14px;padding:14px;margin:4px 0 10px;}
.bigdeal-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.bigdeal-titulo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:14px;}
.selo-nao-conferido{font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;background:var(--dourado);color:var(--preto-tinta);padding:4px 10px;border-radius:99px;}
.bigdeal-incerto{border:1px dashed var(--cinza-linha);border-radius:10px;padding:10px 12px;margin-top:8px;background:var(--branco);opacity:0.85;}
.bigdeal-incerto-aviso{font-size:11px;color:var(--vermelho);font-weight:600;margin-bottom:6px;}
.bigdeal-origem{font-size:11px;color:var(--cinza-apoio);margin-top:8px;}

.empty{padding:24px;color:var(--cinza-apoio);font-size:13px;text-align:center;}
.erro{padding:24px;color:var(--vermelho);font-size:13px;text-align:center;}
`;

export const CONSELHO_HTML = `
<div class="conselho-page">
<div class="page">
  <header class="topbar">
    <a href="/" class="voltar-btn">&larr; Voltar</a>
    <span class="pill" id="pillPeriodo"></span>
  </header>

  <section class="hero">
    <div class="hero-top">
      <div id="fotoConselheiroWrap"></div>
      <div>
        <div class="hero-eyebrow" id="heroNivel">—</div>
        <h1 id="heroTitulo">Carregando…</h1>
        <p class="hero-sub" id="heroSub"></p>
        <div class="hero-selos" id="heroSelos"></div>
      </div>
    </div>
    <div class="hero-selector">
      <select class="pick" id="selMesConselho"></select>
      <select class="pick" id="selAnoConselho"><option>2025</option><option>2026</option><option>2027</option></select>
    </div>
    <div class="metric-grid" id="metricGrid"></div>
  </section>

  <section class="block">
    <h2>Perfil do conselheiro</h2>
    <div id="perfilConselheiro"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Presença mensal do conselho <span class="sub" id="presencaMensalSub"></span></h2>
    <div class="chart-card" id="presencaMensalCard"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Presença geral em <span id="presencaMesLabel"></span></h2>
    <div class="presenca-card" id="presencaCard"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Encontros no período</h2>
    <div class="encontros-list" id="encontrosList"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Membros <span class="sub">clique pra ver ata, oportunidades e Big Deal</span></h2>
    <div id="membrosList"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block" id="bigDealsSemMembroBlock" style="display:none;">
    <h2>Big Deal sem membro correspondente</h2>
    <div id="bigDealsSemMembro"></div>
  </section>
</div>
</div>
`;

// Parametrizado pelo group_id (embutido via JSON.stringify — nunca por concatenação de string
// crua: já tivemos dois bugs de produção nesta mesma sessão por escapar string/regex à mão numa
// template literal, então aqui é sempre JSON.stringify, que lida com qualquer caractere especial
// sem risco de quebrar o JS gerado).
export function conselhoScript(groupId: string): string {
  return `
var GROUP_ID = ${JSON.stringify(groupId).replace(/</g, '\\u003c')};

function fetchJSON_(url) {
  return fetch(url, { cache: 'no-store' }).then(function (res) {
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

var MESES_CONSELHO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var agoraConselho = new Date();

// Todo texto vindo de ata/Monday passa por aqui antes de ir pro innerHTML.
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}
function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase().trim();
}
function iniciais(nome) {
  var partes = String(nome || '').trim().split(/\\s+/);
  return ((partes[0] || '')[0] || '') + ((partes[1] || '')[0] || '');
}
function dataBR(iso) {
  if (!iso) return null;
  var p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function dataHoraBR(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderHero(d) {
  document.getElementById('pillPeriodo').textContent = d.periodo.geral ? ('Visão Geral · ' + d.periodo.ano) : (d.periodo.mes + '/' + d.periodo.ano);
  document.getElementById('heroNivel').textContent = (d.grupo.nivel || '').toUpperCase();
  document.getElementById('heroTitulo').textContent = d.grupo.conselheiro || d.grupo.titulo;
  document.title = (d.grupo.conselheiro || d.grupo.titulo) + ' · Conselho';
  var sub = [];
  if (d.grupo.csResponsavel) sub.push('CS responsável: ' + d.grupo.csResponsavel);
  if (d.grupo.proximaData) {
    var f = dataHoraBR(d.grupo.proximaData);
    if (f) sub.push((d.grupo.proximaDataEhFutura ? 'Próximo encontro: ' : 'Último encontro: ') + f);
  }
  document.getElementById('heroSub').textContent = sub.join(' · ');
  var selos = '';
  if (d.grupo.congelado) selos += '<span class="selo congelado">Congelado</span>';
  else if (d.grupo.atencao) selos += '<span class="selo atencao">Atenção</span>';
  if (d.conselheiro && d.conselheiro.statusEngajamento && !d.grupo.congelado && !d.grupo.atencao) selos += '<span class="selo neutro">' + esc(d.conselheiro.statusEngajamento) + '</span>';
  document.getElementById('heroSelos').innerHTML = selos;
  var fotoWrap = document.getElementById('fotoConselheiroWrap');
  if (d.grupo.fotoConselheiroUrl) {
    fotoWrap.innerHTML = '<img class="foto-conselheiro" src="' + esc(d.grupo.fotoConselheiroUrl) + '" alt="">';
  } else {
    fotoWrap.innerHTML = '<div class="foto-conselheiro-fallback">' + esc(iniciais(d.grupo.conselheiro || '?')) + '</div>';
  }
}

function renderMetricas(d) {
  var m = d.metricas;
  var cards = [
    { valor: m.totalEncontros, label: 'Encontros no período' },
    { valor: m.totalMatchmakings, label: 'Matchmakings' },
    { valor: m.totalCases, label: 'Cases de sucesso' },
    { valor: m.totalOportunidadesMapeadas, label: 'Oportunidades mapeadas' },
    { valor: m.healthscore === null || m.healthscore === undefined ? '—' : m.healthscore, label: 'Healthscore', saude: true },
  ];
  document.getElementById('metricGrid').innerHTML = cards.map(function (c) {
    return '<div class="metric-card' + (c.saude ? ' saude' : '') + '"><div class="metric-value">' + c.valor + '</div><div class="metric-label">' + c.label + '</div></div>';
  }).join('');
}

function renderPerfil(d) {
  var el = document.getElementById('perfilConselheiro');
  var p = d.conselheiro;
  if (!p) { el.innerHTML = '<div class="empty">Conselheiro não encontrado no board "Conselheiros 2026".</div>'; return; }
  var fat = (p.faturamento === null || p.faturamento === undefined) ? null : Number(p.faturamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  var itens = [
    ['Segmento de atuação', p.segmento], ['Perfil do conselho', p.perfilConselho],
    ['Perfil do conselheiro', p.perfilConselheiro], ['Especialidade', p.especialidade],
    ['CS responsável', p.csResponsavel], ['E-mail', p.email],
    ['Status de engajamento', p.statusEngajamento], ['Data de entrada', dataBR(p.dataEntrada)],
    ['Faturamento', fat], ['Filhos', p.filhos], ['Estado civil', p.estadoCivil],
    ['Vegetariano', p.vegetariano], ['Data de nascimento', dataBR(p.dataNascimento)],
    ['Formação', p.formacao], ['Endereço', p.endereco],
  ];
  var html = '<div class="perfil-grid">' + itens.map(function (i) {
    return '<div class="perfil-item"><div class="perfil-label">' + i[0] + '</div><div class="perfil-valor">' + (i[1] ? esc(i[1]) : '<span style="color:#9F9F9F;font-weight:500;">—</span>') + '</div></div>';
  }).join('');
  if (p.curiosidades) html += '<div class="perfil-item largo"><div class="perfil-label">Curiosidades</div><div class="perfil-valor">' + esc(p.curiosidades) + '</div></div>';
  el.innerHTML = html + '</div>';
}

// Barras empilhadas (titulares + reposições) dos 12 meses, SVG puro, com a contagem de membros do
// conselho em cada mês logo abaixo do rótulo.
function renderPresencaMensal(d) {
  var el = document.getElementById('presencaMensalCard');
  var meses = d.presencaMensal || [];
  document.getElementById('presencaMensalSub').textContent = '· ' + d.periodo.ano + ', titulares + reposições';
  var max = Math.max.apply(null, meses.map(function (m) { return m.titulares + m.reposicoes; }).concat([1]));
  if (!meses.some(function (m) { return m.titulares + m.reposicoes + m.membros > 0; })) {
    el.innerHTML = '<div class="empty">Nenhum registro de presença neste ano.</div>'; return;
  }
  var W = 720, H = 220, topo = 22, base = 170, larg = W / 12, barra = 30;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="min-width:560px;" role="img" aria-label="Presença mensal">';
  svg += '<line x1="0" y1="' + base + '" x2="' + W + '" y2="' + base + '" stroke="#E9E9E9"/>';
  meses.forEach(function (m, i) {
    var cx = i * larg + larg / 2, x = cx - barra / 2;
    var hT = (m.titulares / max) * (base - topo), hR = (m.reposicoes / max) * (base - topo);
    if (m.titulares) svg += '<rect x="' + x + '" y="' + (base - hT) + '" width="' + barra + '" height="' + hT + '" rx="4" fill="#3D8B5F"><title>' + m.mes + ': ' + m.titulares + ' titulares</title></rect>';
    if (m.reposicoes) svg += '<rect x="' + x + '" y="' + (base - hT - hR) + '" width="' + barra + '" height="' + hR + '" rx="4" fill="#7dd3fc"><title>' + m.mes + ': ' + m.reposicoes + ' reposições</title></rect>';
    var total = m.titulares + m.reposicoes;
    if (total) svg += '<text x="' + cx + '" y="' + (base - hT - hR - 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#1A1A1A" font-family="Inter,sans-serif">' + total + '</text>';
    svg += '<text x="' + cx + '" y="' + (base + 18) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#5D5D5D" font-family="Inter,sans-serif">' + m.mes.slice(0, 3) + '</text>';
    svg += '<text x="' + cx + '" y="' + (base + 36) + '" text-anchor="middle" font-size="10" fill="#9F9F9F" font-family="Inter,sans-serif">' + (m.membros ? m.membros + ' mb' : '—') + '</text>';
  });
  svg += '</svg>';
  el.innerHTML = svg + '<div class="chart-legenda">' +
    '<span><span class="legenda-dot" style="background:#3D8B5F"></span> Titulares presentes</span>' +
    '<span><span class="legenda-dot" style="background:#7dd3fc"></span> Reposições presentes</span>' +
    '<span style="color:#9F9F9F;">"mb" = membros no conselho naquele mês</span></div>';
}

// pizza de presença via SVG puro (sem lib de gráfico — CSP só libera script-src 'self'): um
// círculo por fatia, cada um com stroke-dasharray/stroke-dashoffset cobrindo só o trecho da fatia.
function pizzaPresencaSVG(p) {
  var r = 46, c = 2 * Math.PI * r;
  var fatias = [
    { valor: p.presente, cor: '#3D8B5F' },
    { valor: p.noShow, cor: '#C0433D' },
    { valor: p.faltouSemConfirmacaoRegistrada, cor: '#C89A2E' },
  ].filter(function (f) { return f.valor > 0; });
  var offset = 0;
  var circulos = fatias.map(function (f) {
    var comprimento = (f.valor / p.totalAgendados) * c;
    var svg = '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + f.cor + '" stroke-width="16" ' +
      'stroke-dasharray="' + comprimento + ' ' + (c - comprimento) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 60 60)"></circle>';
    offset += comprimento;
    return svg;
  }).join('');
  var label = p.taxaPresenca === null ? '—' : (p.taxaPresenca + '%');
  return '<svg width="120" height="120" viewBox="0 0 120 120">' + circulos +
    '<text x="60" y="66" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-size="20" font-weight="700" fill="#1A1A1A">' + label + '</text></svg>';
}

function legendaPresenca(p) {
  var itens = [
    { label: 'Presente', valor: p.presente, cor: '#3D8B5F' },
    { label: 'No-show (confirmou e faltou)', valor: p.noShow, cor: '#C0433D' },
    { label: 'Faltou', valor: p.faltouSemConfirmacaoRegistrada, cor: '#C89A2E' },
  ];
  var html = itens.map(function (i) {
    return '<div class="legenda-item"><span class="legenda-dot" style="background:' + i.cor + '"></span>' + i.label + ' <b>' + i.valor + '</b></div>';
  }).join('');
  html += '<div class="legenda-obs">No-show só é detectado a partir de 23/set/2026 (início do log de transição de status) — faltas anteriores a essa data caem em "Faltou".</div>';
  return html;
}

function renderPresenca(d) {
  var p = d.presencaMes;
  document.getElementById('presencaMesLabel').textContent = p.mes;
  var el = document.getElementById('presencaCard');
  if (!p.totalAgendados) {
    el.innerHTML = '<div class="empty">Nenhum dado de presença registrado para ' + p.mes + '.</div>';
    return;
  }
  el.innerHTML = '<div class="presenca-flex">' + pizzaPresencaSVG(p) + '<div class="legenda">' + legendaPresenca(p) + '</div></div>';
}

function renderEncontros(d) {
  var el = document.getElementById('encontrosList');
  if (!d.encontros.length) { el.innerHTML = '<div class="empty">Nenhum encontro registrado neste período.</div>'; return; }
  el.innerHTML = d.encontros.map(function (e) {
    return '<div class="encontro-row"><span class="encontro-mes">' + e.mes + '</span><span class="encontro-presenca">' + e.presentes + ' de ' + e.agendados + ' presentes</span></div>';
  }).join('');
}

function campoAta(label, valor) {
  if (!valor) return '';
  return '<div class="mes-ata-campo"><b>' + label + ':</b> ' + esc(valor) + '</div>';
}

function renderAtaDoMes(ata) {
  if (!ata) return '<div class="mes-ata-vazio">Ata ainda não processada para este mês.</div>';
  var html = campoAta('Desafio', ata.desafio) + campoAta('Compromisso', ata.compromisso) + campoAta('Ganhos', ata.ganhos) + campoAta('Anotações', ata.anotacoes) + campoAta('Sugestões', ata.sugestoes);
  if (ata.oportunidadesMapeadas && ata.oportunidadesMapeadas.length) {
    html += '<div style="margin-top:6px;">' + ata.oportunidadesMapeadas.map(function (o) { return '<span class="oportunidade-chip">' + esc(o) + '</span>'; }).join('') + '</div>';
  }
  if (ata.fonteDocUrl && /^https?:\\/\\//.test(ata.fonteDocUrl)) {
    html += '<div style="margin-top:8px;"><a class="mes-ata-link" href="' + esc(ata.fonteDocUrl) + '" target="_blank" rel="noopener">Ver ata original →</a></div>';
  }
  return html || '<div class="mes-ata-vazio">Ata processada, mas sem nenhum campo preenchido.</div>';
}

// Big Deal: NUNCA conferido ainda. Os quatro campos que descrevem o próprio membro aparecem
// normais; "Big Deal definido" e "Observações gerais" — que a extração frequentemente associa ao
// membro vizinho na tabela da ata — ficam numa caixa tracejada, com aviso explícito.
function renderBigDeal(b) {
  var confiaveis = campoAta('Feedbacks positivos', b.feedbacksPositivos) + campoAta('Feedbacks negativos', b.feedbacksNegativos) +
    campoAta('Feedback do conselheiro', b.feedbackConselheiro) + campoAta('Conclusões', b.conclusoes);
  var incertos = campoAta('Big Deal definido', b.bigDealDefinido) + campoAta('Observações gerais', b.observacoesGerais);
  var html = '<div class="bigdeal"><div class="bigdeal-head"><span class="bigdeal-titulo">Big Deal do trimestre</span>' +
    (b.conferido ? '' : '<span class="selo-nao-conferido">⚠ Não conferido · checar com o conselheiro</span>') + '</div>';
  html += confiaveis || '<div class="mes-ata-vazio">Sem feedbacks/conclusões extraídos.</div>';
  if (incertos) {
    html += '<div class="bigdeal-incerto"><div class="bigdeal-incerto-aviso">Posição incerta na ata: estes dois campos podem ser de um membro vizinho no documento.</div>' + incertos + '</div>';
  }
  html += '<div class="bigdeal-origem">Nome na ata: ' + esc(b.membroNomeAta) +
    (b.fonteDocUrl && /^https?:\\/\\//.test(b.fonteDocUrl) ? ' · <a class="mes-ata-link" href="' + esc(b.fonteDocUrl) + '" target="_blank" rel="noopener">Ver ata original →</a>' : '') + '</div>';
  return html + '</div>';
}

function chipPagamento(s) {
  if (!s) return '';
  var cls = s === 'Inadimplente' ? 'vermelho' : (s === 'Pagante Padrão' || s === 'Pagante com desconto' ? 'verde' : 'dourado');
  return '<span class="chip ' + cls + '" title="Status de pagamento">' + esc(s) + '</span>';
}
function chipPlaquinha(s) {
  if (!s) return '';
  var cls = s === 'Tem' ? 'verde' : (s === 'Não tem' || s === 'Perdida' ? 'vermelho' : '');
  return '<span class="chip ' + cls + '" title="Plaquinha">Plaquinha: ' + esc(s) + '</span>';
}
function chipPresenca(t) {
  if (t === null || t === undefined) return '<span class="chip" title="Presença no ano">Presença —</span>';
  var cls = t >= 75 ? 'verde' : (t >= 60 ? 'dourado' : 'vermelho');
  return '<span class="chip ' + cls + '" title="Presença no ano">Presença ' + t + '%</span>';
}

function renderMembros(d) {
  var el = document.getElementById('membrosList');
  if (!d.membros.length) { el.innerHTML = '<div class="empty">Nenhum membro neste conselho.</div>'; return; }
  el.innerHTML = d.membros.map(function (m, idx) {
    var atasPorMes = {};
    (m.atas || []).forEach(function (a) { atasPorMes[semAcento(a.mesAta)] = a; });
    var mesesCorpo = (m.presencaPorMes || []).map(function (p) { return p.mes; });
    // em "Visão Geral", mostra só os meses com presença registrada ou com ata — não 12 blocos vazios
    if (d.periodo.geral) {
      mesesCorpo = mesesCorpo.filter(function (mes) {
        var p = (m.presencaPorMes || []).find(function (x) { return x.mes === mes; });
        return (p && p.status) || atasPorMes[semAcento(mes)];
      });
    }
    var corpo = (m.bigDeals || []).map(renderBigDeal).join('');
    corpo += mesesCorpo.map(function (mes) {
      var presenca = (m.presencaPorMes || []).find(function (p) { return p.mes === mes; });
      return '<div class="mes-ata"><div class="mes-ata-head"><span class="mes-ata-titulo">' + mes + (presenca && presenca.status ? ' · ' + esc(presenca.status) : '') + '</span></div>' + renderAtaDoMes(atasPorMes[semAcento(mes)]) + '</div>';
    }).join('');
    var temBigDeal = (m.bigDeals || []).length > 0;
    return '<div class="membro-card"><div class="membro-head" onclick="toggleMembro(' + idx + ')">' +
      '<span class="membro-nome">' + esc(m.nome) + '</span>' +
      '<span class="membro-chips">' + chipPresenca(m.taxaPresencaAno) + chipPlaquinha(m.plaquinha) + chipPagamento(m.statusPagamento) +
        (temBigDeal ? '<span class="chip dourado">Big Deal</span>' : '') + '</span>' +
      '<span class="membro-toggle" id="toggleLabel' + idx + '">ver detalhes ▾</span></div>' +
      '<div class="membro-body" id="membroBody' + idx + '">' + (corpo || '<div class="mes-ata-vazio">Sem dado neste período.</div>') + '</div></div>';
  }).join('');
}

function renderBigDealsSemMembro(d) {
  var bloco = document.getElementById('bigDealsSemMembroBlock');
  var lista = d.bigDealsSemMembro || [];
  bloco.style.display = lista.length ? 'block' : 'none';
  document.getElementById('bigDealsSemMembro').innerHTML = lista.map(renderBigDeal).join('');
}

function toggleMembro(idx) {
  var body = document.getElementById('membroBody' + idx);
  var label = document.getElementById('toggleLabel' + idx);
  var aberto = body.classList.toggle('aberto');
  label.textContent = aberto ? 'ocultar ▴' : 'ver detalhes ▾';
}

function carregarConselho(mes, ano) {
  fetchJSON_('/api/conselho/' + encodeURIComponent(GROUP_ID) + '?mes=' + encodeURIComponent(mes) + '&ano=' + encodeURIComponent(ano)).then(function (d) {
    renderHero(d);
    renderMetricas(d);
    renderPerfil(d);
    renderPresencaMensal(d);
    renderPresenca(d);
    renderEncontros(d);
    renderMembros(d);
    renderBigDealsSemMembro(d);
  }).catch(function (err) {
    document.getElementById('metricGrid').innerHTML = '';
    document.getElementById('presencaCard').innerHTML = '';
    document.getElementById('perfilConselheiro').innerHTML = '';
    document.getElementById('presencaMensalCard').innerHTML = '';
    document.getElementById('encontrosList').innerHTML = '<div class="erro">Erro ao carregar: ' + esc(err.message) + '</div>';
    document.getElementById('membrosList').innerHTML = '';
    document.getElementById('heroTitulo').textContent = 'Não foi possível carregar este conselho';
  });
}

(function initConselho() {
  var selMes = document.getElementById('selMesConselho');
  var selAno = document.getElementById('selAnoConselho');
  ['Visão Geral'].concat(MESES_CONSELHO).forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });

  // período inicial: o mesmo que estava selecionado no dashboard (?mes=&ano=), senão o mês atual
  var params = new URLSearchParams(window.location.search);
  var mesUrl = params.get('mes'), anoUrl = params.get('ano');
  selMes.value = (mesUrl && (mesUrl === 'Visão Geral' || MESES_CONSELHO.indexOf(mesUrl) !== -1)) ? mesUrl : MESES_CONSELHO[agoraConselho.getMonth()];
  selAno.value = anoUrl || String(agoraConselho.getFullYear());
  if (!selAno.value) selAno.value = String(agoraConselho.getFullYear()); // ano fora das opções

  function aoMudarFiltro() {
    var url = new URL(window.location.href);
    url.searchParams.set('mes', selMes.value);
    url.searchParams.set('ano', selAno.value);
    window.history.replaceState(null, '', url.toString());
    carregarConselho(selMes.value, Number(selAno.value));
  }
  selMes.onchange = aoMudarFiltro;
  selAno.onchange = aoMudarFiltro;

  aoMudarFiltro();
})();
`;
}
