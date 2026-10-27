// Redesenho das abas Acompanhamento e Reconhecimento da página do CS (27/10/2026). CSS das prévias aprovadas sob o
// prefixo rd-, para não colidir com card, pill, btn e seg, e os construtores de HTML que só desenham o que a página
// já carregou: nenhum cálculo de negócio mora aqui, só leitura de estado (frase da abertura, ritmo das 8 semanas,
// frase da posição). Sem tabela e sem grade de células. Os textos de ajuda não usam hífen nem travessão.
// O script não usa barra invertida, crase nem cifrão com chave: ele vive dentro da template string de dashboard-html.ts.
import { PONTOS_REPORT_ATRASADO, PONTOS_RELATORIO_ATRASADO } from '../constants.ts';
import { RELATORIO_PRAZO_DIAS } from '../pontos.ts';

export const REDESENHO_CS_CSS = `
.rd-stack{display:flex;flex-direction:column;gap:16px}
.rd-stack>*{min-width:0}
.rd-slot{display:flex;flex-direction:column;min-width:0}
.rd-slot>.rd-card{flex:1}
.rd-card{background:var(--surface);border:1px solid rgba(26,26,26,.06);border-radius:20px;box-shadow:0 1px 2px rgba(20,20,20,.04),0 10px 28px rgba(20,20,20,.04);padding:22px;min-width:0}
.rd-card h2{margin:0 0 4px;font-family:'Bricolage Grotesque',sans-serif;font-size:17px;letter-spacing:-0.01em}
.rd-sub{margin:0 0 16px;color:var(--ink2);font-size:12.5px;line-height:1.5}
.rd-lab{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)}
.rd-grid{display:grid;gap:16px}
.rd-grid>*{min-width:0}
.rd-g2{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
.rd-g3{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:980px){.rd-g2,.rd-g3{grid-template-columns:minmax(0,1fr)}}
.rd-pill{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:4px 11px;font-size:12px;font-weight:700}
.rd-pill.ok{background:var(--green-soft);color:#2F6B49}
.rd-pill.gold{background:var(--gold-soft);color:var(--gold-ink)}
.rd-pill.red{background:var(--red-soft);color:var(--red-ink)}
.rd-pill.neutro{background:var(--bg);color:var(--ink2)}
.rd-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line2);background:var(--surface);color:var(--ink);border-radius:99px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
.rd-btn.pri{background:var(--gold);border-color:var(--gold);color:#1A1A1A}
.rd-btn.esc{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#fff}
.rd-hero{position:relative;overflow:hidden;background:linear-gradient(150deg,#1C1C1C,#111);color:#fff;border-radius:24px;padding:26px 28px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:center;box-shadow:0 18px 40px rgba(20,20,20,.18)}
.rd-hero::after{content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(200,154,46,.28),transparent 65%);pointer-events:none}
.rd-hero>*{min-width:0}
.rd-hero h2{margin:6px 0 14px;font-family:'Bricolage Grotesque',sans-serif;font-size:26px;line-height:1.2;letter-spacing:-0.02em;max-width:560px}
.rd-hero .rd-lab{color:rgba(255,255,255,.55)}
.rd-hero-acoes{display:flex;gap:10px;flex-wrap:wrap}
.rd-anel{position:relative;width:150px;height:150px;z-index:1}
.rd-anel svg{width:100%;height:100%;transform:rotate(-90deg)}
.rd-anel .rd-t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rd-anel b{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;letter-spacing:-0.02em}
.rd-anel b.pq{font-size:17px}
.rd-anel span{font-size:11px;color:rgba(255,255,255,.6);text-align:center;line-height:1.3;max-width:100px}
.rd-ritmo{display:flex;flex-direction:column;gap:14px}
.rd-ritmo-l{display:grid;grid-template-columns:150px minmax(0,1fr) 124px;gap:14px;align-items:center}
.rd-ritmo-l b{font-size:13px}
.rd-ritmo-l>*{min-width:0}
.rd-qs{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}
.rd-q{display:block;height:34px;border-radius:10px;background:var(--line);position:relative}
.rd-q.ok{background:var(--green)}
.rd-q.atraso{background:var(--gold)}
.rd-q.falta{background:var(--red)}
.rd-q.pend{background:repeating-linear-gradient(45deg,#E9E6E6,#E9E6E6 5px,#F3F2F0 5px,#F3F2F0 10px);border:1px dashed var(--line2)}
.rd-q.vazio{background:transparent;border:1px dashed var(--line2)}
.rd-sem{display:grid;grid-template-columns:150px minmax(0,1fr) 124px;gap:14px;margin-top:-6px}
.rd-sem>div:nth-child(2){display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;font-size:10.5px;color:var(--ink3);text-align:center}
.rd-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--ink2);margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.rd-leg i{display:inline-block;width:10px;height:10px;border-radius:4px;margin-right:6px;vertical-align:-1px}
.rd-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.rd-navbtn{width:30px;height:30px;border-radius:50%;border:1px solid var(--line2);background:#fff;font-size:15px;cursor:pointer;color:var(--ink)}
.rd-navbtn:disabled{opacity:.35;cursor:default}
.rd-nav strong{font-size:14px}
.rd-camp{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.rd-camp div{background:var(--bg);border-radius:14px;padding:12px 14px}
.rd-camp .rd-lab{display:block;margin-bottom:4px}
.rd-camp p{margin:0;font-size:13.5px;line-height:1.5;overflow-wrap:anywhere}
.rd-mini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.rd-mini div{background:var(--bg);border-radius:14px;padding:12px 14px;min-width:0}
.rd-mini b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:22px;letter-spacing:-0.02em;overflow-wrap:anywhere}
.rd-mini span{font-size:12px;color:var(--ink2)}
.rd-cht{width:100%;overflow:hidden}
.rd-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.rd-chip{border:1px solid var(--line2);background:#fff;border-radius:99px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--ink2);cursor:pointer}
.rd-chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.rd-vz{background:var(--bg);border-radius:14px;padding:16px;font-size:13px;line-height:1.55;color:var(--ink2)}
.rd-vz b{display:block;color:var(--ink);margin-bottom:2px}
.rd-vz.erro{background:var(--red-soft);color:var(--red-ink)}
.rd-vz.erro b{color:var(--red-ink)}
.rd-pts{display:flex;gap:8px;margin:6px 0 10px}
.rd-pts i{width:34px;height:34px;border-radius:50%;border:2px dashed var(--line2)}
.rd-pts i.on{background:var(--red);border:2px solid var(--red)}
.rd-big{font-family:'Bricolage Grotesque',sans-serif;font-size:34px;letter-spacing:-0.02em;line-height:1}
.rd-big small{font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:var(--ink2);letter-spacing:0;margin-left:6px}
.rd-nota{font-size:11.5px;color:var(--ink3);margin:12px 0 0;line-height:1.5}
.rd-nota a{text-decoration:underline}
.rd-item{padding:10px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.rd-item:first-of-type{border-top:0}
.rd-item .rd-meta{font-size:11.5px;margin-top:3px;color:var(--ink2)}
.rd-item .rd-meta .rd-alta{color:var(--gold-ink);font-weight:700}
.rd-item .rd-meta .rd-venc{color:var(--red-ink);font-weight:700}
.rd-bloco{margin-top:14px}
.rd-bloco>.rd-lab{display:block;margin-bottom:2px}
.rd-det{margin-top:14px;border-top:1px solid var(--line);padding-top:6px}
.rd-det summary{cursor:pointer;font-weight:700;font-size:13px;padding:8px 0}
.rd-linkgestor{margin:0 0 14px;font-size:12.5px;color:var(--ink2)}
.rd-linkgestor a{text-decoration:underline;font-weight:700;color:var(--ink)}
.rd-pos{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px}
.rd-pos>*{min-width:0}
.rd-pos>div{display:flex;flex-direction:column}
.rd-pos>div>*{flex:1}
.rd-pos.so1{grid-template-columns:minmax(0,1fr)}
@media(max-width:980px){.rd-pos{grid-template-columns:minmax(0,1fr)}}
.rd-pos-card{display:flex;flex-direction:column;justify-content:center;background:linear-gradient(150deg,#1C1C1C,#111);color:#fff;border-radius:24px;padding:26px 28px;position:relative;overflow:hidden;box-shadow:0 18px 40px rgba(20,20,20,.18)}
.rd-pos-card::after{content:"";position:absolute;right:-70px;top:-100px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(200,154,46,.3),transparent 65%);pointer-events:none}
.rd-pos-card .rd-lab{color:rgba(255,255,255,.55)}
.rd-pos-n{font-family:'Bricolage Grotesque',sans-serif;font-size:64px;line-height:1;letter-spacing:-0.03em;margin:8px 0 2px;position:relative;z-index:1}
.rd-pos-n small{font-size:18px;font-weight:600;color:rgba(255,255,255,.6);letter-spacing:0;margin-left:8px}
.rd-prog{height:10px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;margin:18px 0 10px;position:relative;z-index:1}
.rd-prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold),#E6C06A)}
.rd-pos-card p{margin:0;font-size:13.5px;color:rgba(255,255,255,.78);position:relative;z-index:1;line-height:1.5}
.rd-pos-card .info-btn{margin-left:6px}
.rd-podio{display:flex;gap:14px;align-items:flex-end}
.rd-pd{flex:1 1 0;min-width:0;background:var(--surface);border:1px solid rgba(26,26,26,.06);border-radius:20px;padding:20px 14px 18px;text-align:center;box-shadow:0 10px 28px rgba(20,20,20,.05);position:relative}
.rd-pd.p1{flex-grow:1.12;padding-top:30px;padding-bottom:26px;border-color:rgba(200,154,46,.5);background:linear-gradient(180deg,#FFF9EA,#fff)}
.rd-pd .rd-av{width:68px;height:68px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px;background:var(--bg);color:var(--ink2);border:3px solid #fff;box-shadow:0 0 0 2px var(--line2)}
.rd-pd .rd-av img{width:100%;height:100%;object-fit:cover;display:block}
.rd-pd.p1 .rd-av{width:82px;height:82px;box-shadow:0 0 0 3px var(--gold);color:var(--gold-ink);background:var(--gold-soft)}
.rd-pd .rd-md{position:absolute;top:12px;left:12px;font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--ink3)}
.rd-pd.p1 .rd-md{color:var(--gold-ink)}
.rd-pd b.rd-nm{display:block;font-size:15px;overflow-wrap:anywhere}
.rd-pd .rd-n{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;letter-spacing:-0.02em;margin-top:4px}
.rd-pd .rd-n .info-btn{margin-left:4px;vertical-align:middle}
.rd-pd.eu{box-shadow:0 0 0 2px var(--ink),0 10px 28px rgba(20,20,20,.08)}
.rd-pd span.rd-l{font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em}
.rd-pulso-res{display:flex;gap:28px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}
.rd-pulso-res>div{min-width:0}
.rd-falas{columns:2 340px;column-gap:14px}
.rd-fala{break-inside:avoid;background:var(--bg);border-radius:16px;padding:16px;margin:0 0 14px;border-left:4px solid var(--gold)}
.rd-fala p{margin:0;font-size:13.5px;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere}
.rd-mais{font-size:12px;color:var(--ink3);font-style:italic;margin:2px 0 0}
.rd-div{display:flex;align-items:center;gap:10px;margin:22px 0 14px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)}
.rd-div::after{content:"";flex:1;height:1px;background:var(--line2)}
.rd-card .quote-block{background:var(--bg);border:0;border-left:4px solid var(--gold);border-radius:16px}
@media(max-width:760px){
  .rd-hero{grid-template-columns:minmax(0,1fr);padding:22px 20px}
  .rd-hero h2{font-size:22px}
  .rd-anel{justify-self:start}
  .rd-ritmo-l{grid-template-columns:minmax(0,1fr)}
  .rd-sem{grid-template-columns:minmax(0,1fr)}
  .rd-sem>div:first-child,.rd-sem>div:last-child{display:none}
  .rd-qs{gap:5px}
  .rd-q{height:28px}
  .rd-sem>div:nth-child(2){gap:5px;font-size:9px}
  .rd-card{padding:18px}
  .rd-podio{gap:6px}
  .rd-pd{padding:18px 2px 14px}
  .rd-pd.p1{padding-top:26px}
  .rd-pd .rd-av{width:50px;height:50px;font-size:18px}
  .rd-pd.p1 .rd-av{width:60px;height:60px}
  .rd-pd b.rd-nm{font-size:13px}
  .rd-pd .rd-n{font-size:24px}
  .rd-pos-card{padding:22px 20px}
  .rd-pos-n{font-size:52px}
}
`;

export const REDESENHO_CS_SCRIPT = `
// ---- Redesenho das abas Acompanhamento e Reconhecimento: só desenho, o estado vem da página ----
var RD_PONTOS_REPORT_ = ${PONTOS_REPORT_ATRASADO};
var RD_PONTOS_RELATORIO_ = ${PONTOS_RELATORIO_ATRASADO};
var RD_PRAZO_RELATORIO_ = ${RELATORIO_PRAZO_DIAS};
function rdEsc_(s){ return String(s === null || s === undefined ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function rdDec_(n, casas){ return Number(n).toLocaleString('pt-BR', { minimumFractionDigits:casas, maximumFractionDigits:casas }); }
function rdNum_(n){ return Number(n).toLocaleString('pt-BR', { maximumFractionDigits:1 }); }
function rdPct_(decimos){ return decimos === null || decimos === undefined ? null : rdDec_(decimos / 10, 1) + '%'; }
function rdDia_(iso){ var p = String(iso).slice(0,10).split('-'); return p[2] + '/' + p[1]; }
function rdSomar_(iso, n){ var d = new Date(String(iso).slice(0,10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); }
function rdHoras_(h){ h = Number(h || 0); return h >= 48 ? Math.floor(h / 24) + ' dias' : Math.round(h) + ' h'; }
function rdDias_(n){ return n + (n === 1 ? ' dia' : ' dias'); }
function rdCartao_(titulo, sub, corpo){ return '<section class="rd-card"><h2>' + rdEsc_(titulo) + '</h2>' + (sub ? '<p class="rd-sub">' + rdEsc_(sub) + '</p>' : '') + corpo + '</section>'; }
function rdAviso_(titulo, texto, erro){ return '<div class="rd-vz' + (erro ? ' erro' : '') + '"><b>' + rdEsc_(titulo) + '</b>' + rdEsc_(texto) + '</div>'; }
function rdMsgCartao_(titulo, titMsg, texto, erro){ return rdCartao_(titulo, '', rdAviso_(titMsg, texto, erro)); }

// Pendências da semana: o report pendente ou atrasado e os relatórios de conselho por preencher. A lista exata vem de
// relatoriosPendentes; sem ela, cai para a regularidade das 8 semanas (sem nome de conselho).
function rdPendencias_(estado, relatorios, regRelatorio){
  var rep = estado && (estado.estado === 'pendente' || estado.estado === 'atrasado') ? estado : null;
  var lista = relatorios;
  if (!lista) {
    lista = (regRelatorio || []).filter(function(r){ return r.estado === 'pendente' || r.estado === 'atrasado'; }).map(function(r){
      return { groupId: null, conselho: null, dataEncontro: r.semana_inicio, estado: r.estado === 'atrasado' ? 'atrasado' : 'a_preencher', diasRestantes: null };
    });
  }
  lista = lista.slice().sort(function(a, b){
    var x = a.diasRestantes === null ? 0 : a.diasRestantes, y = b.diasRestantes === null ? 0 : b.diasRestantes;
    return x - y;
  });
  var atrasados = lista.filter(function(r){ return r.estado === 'atrasado'; }).length;
  return { report: rep, relatorios: lista, relAtrasados: atrasados, relAFazer: lista.length - atrasados, total: (rep ? 1 : 0) + lista.length };
}

// Frase da abertura, por regra: conta as pendências e diz o que fazer. Sem pendência, diz que está tudo em dia.
function rdFraseAbertura_(p){
  if (!p.total) return 'Tudo em dia: o report da semana e os relatórios dos conselhos não têm pendência.';
  var partes = [];
  if (p.report) partes.push(p.report.estado === 'atrasado' ? 'o report da semana está atrasado há ' + rdHoras_(p.report.horas_atraso) : 'o report da semana vence sexta às 19h');
  if (p.relAtrasados) partes.push(p.relAtrasados + (p.relAtrasados === 1 ? ' relatório de conselho está atrasado' : ' relatórios de conselho estão atrasados'));
  if (p.relAFazer) partes.push(p.relAFazer + (p.relAFazer === 1 ? ' relatório de conselho está por preencher' : ' relatórios de conselho estão por preencher'));
  var junto = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0];
  return 'Você tem ' + p.total + (p.total === 1 ? ' pendência' : ' pendências') + ': ' + junto + '.';
}

function rdAnel_(health){
  var dec = health ? health.healthBaseDecimos : null;
  var circ = 2 * Math.PI * 62;
  var frac = dec === null || dec === undefined ? 0 : Math.max(0, Math.min(1, dec / 1000));
  var legenda = dec === null || dec === undefined ? (health && health.composicao ? health.composicao : 'Sem apuração') : 'Health da Base, críticos sobre a carteira';
  return '<div class="rd-anel"><svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/>' +
    '<circle cx="75" cy="75" r="62" fill="none" stroke="#C89A2E" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - frac)).toFixed(1) + '"/></svg>' +
    '<div class="rd-t" role="img" aria-label="Health da Base ' + rdEsc_(dec === null || dec === undefined ? 'sem apuração' : rdPct_(dec)) + '"><b' + (dec === null || dec === undefined ? ' class="pq"' : '') + '>' + rdEsc_(dec === null || dec === undefined ? 'Sem apuração' : rdPct_(dec)) + '</b><span>' + rdEsc_(legenda) + '</span></div></div>';
}

function rdAbertura_(d, mondayUrl){
  if (!d) return '<section class="rd-hero" aria-label="Situação da semana"><div><span class="rd-lab">Sua semana</span><h2>Carregando a situação da semana…</h2></div></section>';
  var base = d;
  var p = rdPendencias_(base.estado, base.relatoriosPendentes || null, base.regularidadeRelatorio);
  var botoes = '<a class="rd-btn pri" href="' + rdEsc_(mondayUrl) + '" target="_blank" rel="noopener">Abrir o report no Monday</a>' +
    (p.total ? '<button type="button" class="rd-btn esc" onclick="rdIrPendencias_()">Ver a lista de pendências</button>' : '');
  return '<section class="rd-hero" aria-label="Situação da semana"><div><span class="rd-lab">Sua semana</span><h2>' + rdEsc_(rdFraseAbertura_(p)) + '</h2><div class="rd-hero-acoes">' + botoes + '</div></div>' + rdAnel_(d.health) + '</section>';
}

function rdClasse_(estado){
  return estado === 'enviado_no_prazo' ? 'ok' : estado === 'enviado_com_atraso' ? 'atraso' : estado === 'atrasado' ? 'falta' : estado === 'pendente' ? 'pend' : 'vazio';
}
var RD_ROTULO_ = { ok:'No prazo', atraso:'Com atraso', falta:'Não enviado', pend:'Pendente', vazio:'Sem encontro ou sem cobrança' };
var RD_GRAVIDADE_ = { vazio:0, ok:1, pend:2, atraso:3, falta:4 };
function rdQuadrado_(cls, semana, nome){
  var t = nome + ', semana de ' + rdDia_(semana) + ': ' + RD_ROTULO_[cls];
  return '<i class="rd-q ' + cls + '" role="img" aria-label="' + rdEsc_(t) + '" title="' + rdEsc_(t) + '"></i>';
}
function rdResumoRitmo_(classes){
  var ok = classes.filter(function(c){ return c === 'ok'; }).length;
  var julgados = classes.filter(function(c){ return c === 'ok' || c === 'atraso' || c === 'falta'; }).length;
  if (!julgados) return '<span class="rd-pill neutro">Sem semanas cobradas</span>';
  return '<span class="rd-pill ' + (ok === julgados ? 'ok' : 'gold') + '">' + ok + ' de ' + julgados + ' no prazo</span>';
}
// Oito semanas a partir de semanaAtual, para trás. Semana sem encontro de conselho fica vazia.
function rdRitmo_(d){
  if (!d) return rdMsgCartao_('Seu ritmo nas últimas 8 semanas', 'Carregando', 'Buscando o histórico do report e dos relatórios.', false);
  var base = d;
  var atual = base.semana;
  var semanas = []; for (var i = 7; i >= 0; i--) semanas.push(rdSomar_(atual, -7 * i));
  var reg = base.regularidade || [];
  var rep = semanas.map(function(s){
    if (s === atual && base.estado) return rdClasse_(base.estado.estado);
    var it = reg.filter(function(r){ return String(r.semana_inicio).slice(0,10) === s; })[0];
    return it ? rdClasse_(it.estado) : 'vazio';
  });
  var rels = base.regularidadeRelatorio || [];
  var rel = semanas.map(function(s){
    var cls = 'vazio';
    rels.forEach(function(r){ if (String(r.semana_inicio).slice(0,10) === s) { var c = rdClasse_(r.estado); if (RD_GRAVIDADE_[c] > RD_GRAVIDADE_[cls]) cls = c; } });
    return cls;
  });
  var relEncontros = rels.map(function(r){ return rdClasse_(r.estado); });
  var linha = function(rot, classes, nome, resumo){
    return '<div class="rd-ritmo-l"><b>' + rot + '</b><div class="rd-qs">' + classes.map(function(c, i){ return rdQuadrado_(c, semanas[i], nome); }).join('') + '</div>' + resumo + '</div>';
  };
  var leg = [['var(--green)', 'No prazo'], ['var(--gold)', 'Com atraso'], ['var(--red)', 'Não enviado']].map(function(x){ return '<span><i style="background:' + x[0] + '"></i>' + x[1] + '</span>'; }).join('') +
    '<span><i style="background:#E9E6E6;border:1px dashed var(--line2)"></i>Pendente</span><span><i style="border:1px dashed var(--line2)"></i>Sem encontro ou sem cobrança na semana</span>';
  return rdCartao_('Seu ritmo nas últimas 8 semanas', 'Um quadrado por semana. O que está em dia fica verde e o que atrasou chama a atenção.',
    '<div class="rd-ritmo">' + linha('Report semanal', rep, 'Report semanal', rdResumoRitmo_(rep)) + linha('Relatório do conselho', rel, 'Relatório do conselho', rdResumoRitmo_(relEncontros)) +
    '<div class="rd-sem"><div></div><div>' + semanas.map(function(s){ return '<span>' + rdDia_(s) + '</span>'; }).join('') + '</div><div></div></div></div><div class="rd-leg">' + leg + '</div>');
}

function rdSeloEstado_(d){
  var e = d.estado;
  if (e) {
    if (e.estado === 'enviado_no_prazo') return ['Enviado no prazo', 'ok'];
    if (e.estado === 'enviado_com_atraso') return ['Enviado com atraso, ' + rdHoras_(e.horas_atraso), 'gold'];
    if (e.estado === 'pendente') return ['Pendente, prazo sexta às 19h', 'gold'];
    return ['Atrasado há ' + rdHoras_(e.horas_atraso), 'red'];
  }
  return d.report ? ['Enviado no Monday', 'ok'] : ['Sem report nesta semana', 'neutro'];
}
function rdSemReport_(d){
  var e = d.estado;
  if (e && e.estado === 'pendente') return rdAviso_('Nada enviado ainda', 'O prazo é sexta às 19h. O envio fora do prazo gera ' + RD_PONTOS_REPORT_ + ' pontos automáticos.');
  if (e && e.estado === 'atrasado') return rdAviso_('Report atrasado', 'O Health da Base fica sem apuração até o envio, e o atraso gera ' + RD_PONTOS_REPORT_ + ' pontos automáticos.');
  if (!e && d.semana === d.semanaAtual) return rdAviso_('Sem report cobrado', 'Este CS não tem report cobrado nesta semana.');
  return rdAviso_('Nenhum report encontrado', 'Não há report enviado para esta semana.');
}
function rdReportCartao_(d, comoFoi, mondayUrl){
  var proxima = rdSomar_(d.semana, 7);
  var fim = rdSomar_(d.semana, 6);
  var selo = rdSeloEstado_(d);
  var nav = '<div class="rd-nav"><button type="button" class="rd-navbtn" data-report-acao="semana" data-semana="' + rdSomar_(d.semana, -7) + '" aria-label="Semana anterior">&lsaquo;</button>' +
    '<strong>' + rdDia_(d.semana) + ' a ' + rdDia_(fim) + '/' + fim.slice(0,4) + '</strong>' +
    '<button type="button" class="rd-navbtn" data-report-acao="semana" data-semana="' + proxima + '" aria-label="Próxima semana"' + (proxima > d.semanaAtual ? ' disabled' : '') + '>&rsaquo;</button>' +
    '<span class="rd-pill ' + selo[1] + '">' + rdEsc_(selo[0]) + '</span></div>';
  var rep = d.report, corpo;
  if (rep) {
    var como = comoFoi.filter(function(o){ return o.valor === rep.como_foi_semana; })[0];
    var crit = rep.criticos_total === null || rep.criticos_total === undefined ? 'Não informado' : rep.criticos_total + ' de ' + rep.base_total;
    corpo = '<div class="rd-mini"><div><b>' + rdEsc_(crit) + '</b><span>críticos declarados</span></div>' +
      '<div><b>' + rdEsc_(como ? como.rotulo : 'Não informado') + '</b><span>como foi a semana' + (rep.nota_semana !== null && rep.nota_semana !== undefined ? ', nota ' + rdEsc_(rep.nota_semana) : '') + '</span></div></div>' +
      (rep.risco_se_ignorar || rep.por_que ? '<div class="rd-camp">' +
        (rep.risco_se_ignorar ? '<div><span class="rd-lab">O que pode virar problema</span><p>' + rdEsc_(rep.risco_se_ignorar) + '</p></div>' : '') +
        (rep.por_que ? '<div><span class="rd-lab">Por quê</span><p>' + rdEsc_(rep.por_que) + '</p></div>' : '') + '</div>' : '');
  } else {
    var ult = (d.historico || [])[0];
    corpo = rdSemReport_(d) + (ult && ult.criticos_total !== null && ult.criticos_total !== undefined
      ? '<div class="rd-mini"><div><b>' + rdEsc_(ult.criticos_total + ' de ' + ult.base_total) + '</b><span>críticos declarados na última semana enviada</span></div></div>' : '');
  }
  return rdCartao_('Report da semana', 'O report é preenchido no Monday. Aqui você vê o que foi enviado.', nav + corpo +
    '<p class="rd-nota"><a href="' + rdEsc_(mondayUrl) + '" target="_blank" rel="noopener">Abrir o board no Monday</a></p>');
}

function rdHistoricoCartao_(d, desenharLinha){
  var hist = (d.historico || []).slice().reverse();
  var titulo = 'Críticos ao longo do tempo';
  if (!hist.length) return rdCartao_(titulo, '', rdAviso_('Nenhum report registrado ainda', 'Quando o primeiro report for enviado no Monday, a evolução dos críticos aparece aqui.'));
  var pontos = hist.filter(function(r){ return r.percentualDecimos !== null && r.percentualDecimos !== undefined; }).map(function(r){ return { v: r.percentualDecimos / 10, lbl: rdDia_(r.semana_inicio) }; });
  var grafico = pontos.length >= 2
    ? '<div class="rd-cht" role="img" aria-label="Percentual de críticos por semana">' + desenharLinha(pontos, '#C89A2E', { w:360, h:180 }) + '</div>'
    : rdAviso_('Poucos pontos ainda', 'O gráfico aparece quando houver pelo menos duas semanas com críticos informados.');
  var chips = hist.slice(-8).map(function(r){
    var s = String(r.semana_inicio).slice(0,10);
    return '<button type="button" class="rd-chip' + (s === d.semana ? ' on' : '') + '" data-report-acao="semana" data-semana="' + s + '" aria-pressed="' + (s === d.semana ? 'true' : 'false') + '">' + rdDia_(s) + '</button>';
  }).join('');
  return rdCartao_(titulo, 'Percentual de críticos sobre a carteira. Toque numa semana para ver o report dela.', grafico + '<div class="rd-chips">' + chips + '</div>');
}

function rdRelatoriosCartao_(d){
  var base = d;
  var p = rdPendencias_(null, base.relatoriosPendentes || null, base.regularidadeRelatorio);
  var n = p.relatorios.length;
  var nota;
  if (!n) nota = 'Nenhum relatório pendente. O prazo é de ' + RD_PRAZO_RELATORIO_ + ' dias depois do encontro.';
  else {
    var r = p.relatorios[0];
    var nome = r.conselho ? 'Conselho ' + r.conselho : 'Encontro da semana de ' + rdDia_(r.dataEncontro);
    var quando = r.diasRestantes === null ? (r.estado === 'atrasado' ? 'atrasado' : 'dentro do prazo')
      : r.estado === 'atrasado' ? (r.diasRestantes >= 0 ? 'o prazo venceu hoje' : 'atrasado há ' + rdDias_(-r.diasRestantes))
      : r.estado === 'vence_hoje' ? 'vence hoje' : 'vence em ' + rdDias_(r.diasRestantes);
    nota = 'Mais urgente: ' + nome + ', ' + quando + '. Cada relatório atrasado gera ' + RD_PONTOS_RELATORIO_ + ' pontos automáticos.';
  }
  return rdCartao_('Relatórios do conselho', 'Prazo de ' + RD_PRAZO_RELATORIO_ + ' dias depois do encontro.',
    '<div class="rd-big">' + n + '<small>' + 'a preencher' + '</small></div><p class="rd-nota">' + rdEsc_(nota) + '</p>' +
    (n ? '<div style="margin-top:12px"><button type="button" class="rd-btn" onclick="rdIrPendencias_()">Ver e preencher</button></div>' : ''));
}

function rdIrPendencias_(){
  var alvo = document.getElementById('pendLista');
  if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior:'smooth', block:'start' });
}

// Posição no time: a frase compara com o 1º e com o 3º (ou com o 2º, quando é o 1º). top = pontuações do pódio em ordem.
function rdFrasePosicao_(posicao, meu, top){
  var p1 = top[0], p3 = top[2];
  if (posicao === 1) return top.length > 1 ? 'Você lidera e está ' + rdNum_(Math.max(0, meu - top[1])) + ' pontos à frente do 2º lugar.' : 'Você lidera o time neste mês.';
  var faltam = 'Faltam ' + rdNum_(Math.max(0, p1 - meu)) + ' pontos para o 1º lugar';
  if (posicao === 2 && p3 !== undefined) return faltam + ' e você está ' + rdNum_(Math.max(0, meu - p3)) + ' pontos à frente do 3º.';
  if (posicao > 3 && p3 !== undefined) return faltam + ' e ' + rdNum_(Math.max(0, p3 - meu)) + ' pontos para chegar ao pódio.';
  return faltam + '.';
}
`;
