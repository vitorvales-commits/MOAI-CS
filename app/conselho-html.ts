// Shell da página completa de um conselho (/conselho/[grupo]) — mesmo padrão vanilla de
// app/gestor-html.ts e app/dashboard-html.ts: HTML+CSS+JS numa string só, sem framework de
// gráfico nem dependência de client-side nova (CSP do projeto só libera script-src 'self').
// Reaproveita o mesmo sistema visual já aprovado em app/gestor-html.ts (hero escuro com
// gradiente dourado/verde, cartões brancos de cantos arredondados) pra manter consistência com
// o resto do dashboard. Os dados vêm de /api/conselho/[grupo], que faz toda a checagem de
// autenticação de novo — este arquivo só desenha o que a API já calcula.

export const CONSELHO_STYLE = `
:root{
  --cinza-fundo:#F5F5F5; --preto-tinta:#1A1A1A; --preto-profundo:#141414; --grafite:#272727;
  --branco:#FFFFFF; --cinza-texto:#5D5D5D; --cinza-apoio:#9F9F9F;
  --cinza-linha:#C6C4C4; --cinza-borda:#D8D5D5; --cinza-superficie:#E9E9E9;
  --vermelho:#C0433D; --dourado:#C89A2E; --verde:#3D8B5F;
}
.conselho-page *{box-sizing:border-box;}
.conselho-page{margin:0;background:var(--cinza-fundo);color:var(--preto-tinta);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
.conselho-page h1,.conselho-page h2,.conselho-page h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em;}
.page{max-width:1040px;margin:0 auto;padding:0 28px 80px;}

.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;flex-wrap:wrap;gap:12px;}
.voltar-btn{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cinza-texto);text-decoration:none;padding:7px 14px 7px 10px;border-radius:999px;border:1px solid var(--cinza-borda);background:var(--branco);}
.voltar-btn:hover{background:var(--cinza-superficie);}
.pill{font-size:12px;padding:6px 12px;border-radius:999px;background:var(--branco);border:1px solid var(--cinza-borda);color:var(--cinza-texto);font-weight:500;}
select.pick{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:10px;padding:7px 12px;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;color:var(--preto-tinta);cursor:pointer;}

.hero{position:relative;border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#141414 0%,#1A1A1A 48%,#272727 100%);padding:40px 36px;color:var(--branco);}
.hero::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 14% -10%, rgba(200,154,46,0.38), transparent 55%),
             radial-gradient(circle at 100% 110%, rgba(61,139,95,0.28), transparent 55%);
  pointer-events:none;}
.hero-top{position:relative;z-index:1;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.foto-conselheiro{width:56px;height:56px;border-radius:50%;object-fit:cover;background:var(--grafite);flex-shrink:0;}
.foto-conselheiro-fallback{width:56px;height:56px;border-radius:50%;background:var(--grafite);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;color:var(--dourado);flex-shrink:0;}
.hero-eyebrow{font-size:11px;letter-spacing:0.1em;font-weight:600;color:var(--dourado);text-transform:uppercase;}
.hero h1{font-size:26px;font-weight:700;margin:2px 0 4px;}
.hero-sub{font-size:13px;color:#C6C4C4;margin:0;}
.hero-selector{position:relative;z-index:1;margin-top:20px;display:flex;gap:8px;}
.hero-selector select{background:rgba(255,255,255,0.08);color:var(--branco);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:7px 12px;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;cursor:pointer;}

.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-top:20px;}
.metric-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;padding:18px;}
.metric-value{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:28px;line-height:1;}
.metric-label{font-size:11px;color:var(--cinza-apoio);margin-top:8px;}
.metric-card.saude .metric-value{color:var(--dourado);}

.block{margin-top:44px;}
.block h2{font-size:19px;font-weight:700;margin:0 0 16px;}

.encontros-list{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;overflow:hidden;}
.encontro-row{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-bottom:1px solid var(--cinza-linha);font-size:13px;}
.encontro-row:last-child{border-bottom:none;}
.encontro-mes{font-weight:600;}
.encontro-presenca{color:var(--cinza-texto);}

.membro-card{background:var(--branco);border:1px solid var(--cinza-borda);border-radius:18px;margin-bottom:12px;overflow:hidden;}
.membro-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;cursor:pointer;}
.membro-nome{font-weight:700;font-size:14px;}
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
      </div>
    </div>
    <div class="hero-selector">
      <select class="pick" id="selMesConselho"></select>
      <select class="pick" id="selAnoConselho"><option>2025</option><option>2026</option><option>2027</option></select>
    </div>
    <div class="metric-grid" id="metricGrid"></div>
  </section>

  <section class="block">
    <h2>Encontros no período</h2>
    <div class="encontros-list" id="encontrosList"><div class="empty">Carregando…</div></div>
  </section>

  <section class="block">
    <h2>Membros</h2>
    <div id="membrosList"><div class="empty">Carregando…</div></div>
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
var GROUP_ID = ${JSON.stringify(groupId)};

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
var mesAtualConselho = MESES_CONSELHO[agoraConselho.getMonth()];
var anoAtualConselho = agoraConselho.getFullYear();

function iniciais(nome) {
  var partes = String(nome || '').trim().split(/\\s+/);
  return ((partes[0] || '')[0] || '') + ((partes[1] || '')[0] || '');
}

function renderHero(d) {
  document.getElementById('pillPeriodo').textContent = d.periodo.geral ? ('Visão Geral · ' + d.periodo.ano) : (d.periodo.mes + '/' + d.periodo.ano);
  document.getElementById('heroNivel').textContent = (d.grupo.nivel || '').toUpperCase();
  document.getElementById('heroTitulo').textContent = d.grupo.conselheiro || d.grupo.titulo;
  document.getElementById('heroSub').textContent = (d.grupo.csResponsavel ? ('CS responsável: ' + d.grupo.csResponsavel) : '') + (d.grupo.congelado ? ' · Congelado' : '');
  var fotoWrap = document.getElementById('fotoConselheiroWrap');
  if (d.grupo.fotoConselheiroUrl) {
    fotoWrap.innerHTML = '<img class="foto-conselheiro" src="' + d.grupo.fotoConselheiroUrl + '">';
  } else {
    fotoWrap.innerHTML = '<div class="foto-conselheiro-fallback">' + iniciais(d.grupo.conselheiro || '?') + '</div>';
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

function renderEncontros(d) {
  var el = document.getElementById('encontrosList');
  if (!d.encontros.length) { el.innerHTML = '<div class="empty">Nenhum encontro registrado neste período.</div>'; return; }
  el.innerHTML = d.encontros.map(function (e) {
    return '<div class="encontro-row"><span class="encontro-mes">' + e.mes + '</span><span class="encontro-presenca">' + e.presentes + ' de ' + e.agendados + ' presentes</span></div>';
  }).join('');
}

function campoAta(label, valor) {
  if (!valor) return '';
  return '<div class="mes-ata-campo"><b>' + label + ':</b> ' + valor + '</div>';
}

function renderAtaDoMes(ata) {
  if (!ata) return '<div class="mes-ata-vazio">Ata ainda não processada para este mês.</div>';
  var html = campoAta('Desafio', ata.desafio) + campoAta('Compromisso', ata.compromisso) + campoAta('Ganhos', ata.ganhos) + campoAta('Anotações', ata.anotacoes) + campoAta('Sugestões', ata.sugestoes);
  if (ata.oportunidadesMapeadas && ata.oportunidadesMapeadas.length) {
    html += '<div style="margin-top:6px;">' + ata.oportunidadesMapeadas.map(function (o) { return '<span class="oportunidade-chip">' + o + '</span>'; }).join('') + '</div>';
  }
  if (ata.fonteDocUrl) {
    html += '<div style="margin-top:8px;"><a class="mes-ata-link" href="' + ata.fonteDocUrl + '" target="_blank" rel="noopener">Ver ata original →</a></div>';
  }
  return html || '<div class="mes-ata-vazio">Ata processada, mas sem nenhum campo preenchido.</div>';
}

function renderMembros(d) {
  var el = document.getElementById('membrosList');
  if (!d.membros.length) { el.innerHTML = '<div class="empty">Nenhum membro neste conselho.</div>'; return; }
  el.innerHTML = d.membros.map(function (m, idx) {
    var atasPorMes = {};
    (m.atas || []).forEach(function (a) { atasPorMes[a.mesAta] = a; });
    var mesesDoBloco = (m.presencaPorMes || []).map(function (p) { return p.mes; });
    var mesesCorpo = mesesDoBloco.length ? mesesDoBloco : Object.keys(atasPorMes);
    var corpo = mesesCorpo.map(function (mes) {
      var presenca = (m.presencaPorMes || []).find(function (p) { return p.mes === mes; });
      var linkAta = '<div class="mes-ata"><div class="mes-ata-head"><span class="mes-ata-titulo">' + mes + (presenca && presenca.status ? ' · ' + presenca.status : '') + '</span></div>' + renderAtaDoMes(atasPorMes[mes]) + '</div>';
      return linkAta;
    }).join('');
    return '<div class="membro-card"><div class="membro-head" onclick="toggleMembro(' + idx + ')">' +
      '<span class="membro-nome">' + m.nome + '</span><span class="membro-toggle" id="toggleLabel' + idx + '">ver detalhes ▾</span></div>' +
      '<div class="membro-body" id="membroBody' + idx + '">' + (corpo || '<div class="mes-ata-vazio">Sem dado neste período.</div>') + '</div></div>';
  }).join('');
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
    renderEncontros(d);
    renderMembros(d);
  }).catch(function (err) {
    document.getElementById('metricGrid').innerHTML = '';
    document.getElementById('encontrosList').innerHTML = '<div class="erro">Erro ao carregar: ' + err.message + '</div>';
    document.getElementById('membrosList').innerHTML = '';
    document.getElementById('heroTitulo').textContent = 'Não foi possível carregar este conselho';
  });
}

(function initConselho() {
  var selMes = document.getElementById('selMesConselho');
  MESES_CONSELHO.forEach(function (m) { var o = document.createElement('option'); o.textContent = m; selMes.appendChild(o); });
  selMes.value = mesAtualConselho;
  document.getElementById('selAnoConselho').value = String(anoAtualConselho);

  function aoMudarFiltro() {
    carregarConselho(selMes.value, Number(document.getElementById('selAnoConselho').value));
  }
  selMes.onchange = aoMudarFiltro;
  document.getElementById('selAnoConselho').onchange = aoMudarFiltro;

  aoMudarFiltro();
})();
`;
}
