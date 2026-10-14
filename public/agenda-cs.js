/* Agenda de conselhos e Rounds (13/10/2026). Componente único: a home do gestor, a visão do próprio CS
   e a página do CS aberta pelo gestor montam esta mesma agenda com agendaMontar(raizId, opcoes).
   Os dados vêm de /api/agenda. Faixa, turno, cobrança e prazo já chegam prontos do servidor
   (lib/agenda.ts); este script só filtra e desenha. Configuração em window.AGENDA_CFG. */
(function (global) {
  'use strict';

  var CFG = global.AGENDA_CFG || { faixas: [], turnos: [], roundCor: {} };
  var DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var GRAVIDADE = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3, azul: 4 };
  var controles = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDe(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dePartesIso(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function segundaDe(d) { var dw = d.getDay(); return addDias(d, dw === 0 ? -6 : 1 - dw); }
  function ddmm(iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; }
  function faixaDe(chave) {
    for (var i = 0; i < CFG.faixas.length; i++) if (CFG.faixas[i].chave === chave) return CFG.faixas[i];
    return null;
  }
  function capitalizar(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function plural(n, singular, plural) { return n + ' ' + (n === 1 ? singular : plural); }
  function nivelTexto(nivel) {
    var n = nivel === 'Setorial' ? 'Executivo' : nivel;
    return String(n || 'Nível desconhecido').replace(/-/g, ' ');
  }
  function iniciais(nome) {
    var p = String(nome || '').replace(/\s*[\[(].*$/, '').trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  function rotuloSemana(ini) {
    var fim = addDias(ini, 6);
    if (ini.getMonth() === fim.getMonth()) return ini.getDate() + ' a ' + fim.getDate() + ' ' + MESES_CURTOS[fim.getMonth()];
    return ini.getDate() + ' ' + MESES_CURTOS[ini.getMonth()] + ' a ' + fim.getDate() + ' ' + MESES_CURTOS[fim.getMonth()];
  }
  function ehMobile() { return global.matchMedia && global.matchMedia('(max-width:700px)').matches; }

  // Gravidade para ordenar dentro da célula: vermelho primeiro, passado e round por último.
  function gravidade(item) {
    if (item.tipo === 'round') return 6;
    if (item.passado || !item.faixa) return 5;
    return GRAVIDADE[item.faixa] != null ? GRAVIDADE[item.faixa] : 5;
  }

  function doEscopo(st, item) {
    if (st.escopo !== 'meus') return true;
    if (item.tipo === 'round') return item.csLista.indexOf(st.csNome) >= 0;
    return item.cs === st.csNome;
  }

  function itensDaSemana(st) {
    var d = st.dados || { conselhos: [], rounds: [] };
    var lista = [];
    (d.conselhos || []).forEach(function (c) { lista.push(c); });
    (d.rounds || []).forEach(function (r) { lista.push(r); });
    return lista.filter(function (it) { return doEscopo(st, it); });
  }

  function descricaoCobranca(c) {
    var prazo = c.prazoCobranca && c.prazoCobranca.tipo === 'ate' ? 'cobrar até ' + ddmm(c.prazoCobranca.diaIso) : 'cobrar hoje';
    return nivelTexto(c.nivel) + ' de ' + c.conselheiroNome + ', ' + DIAS_CURTOS[dePartesIso(c.diaIso).getDay()] + ' ' + ddmm(c.diaIso) + ' ' + c.hhmm + ', ' + prazo;
  }

  function resumoTexto(st, itens) {
    var conselhos = itens.filter(function (i) { return i.tipo === 'conselho'; });
    var rounds = itens.length - conselhos.length;
    var cobra = conselhos.filter(function (c) { return c.precisaCobranca; });
    var sufixoRounds = rounds ? ', e ' + rounds + (rounds === 1 ? ' round' : ' rounds') : '';
    var quem = st.escopo === 'meus' ? 'seus' : 'da equipe';
    if (!conselhos.length) {
      if (st.escopo === 'meus') return 'Nenhum conselho seu nesta semana' + (rounds ? ', e ' + rounds + (rounds === 1 ? ' round' : ' rounds') : '') + '.';
      return 'Nenhum conselho da equipe nesta semana' + (rounds ? ', e ' + rounds + (rounds === 1 ? ' round' : ' rounds') : '') + '.';
    }
    var base = conselhos.length + (conselhos.length === 1 ? ' conselho ' : ' conselhos ') + quem + ' nesta semana' + sufixoRounds;
    if (!cobra.length) return base + ', todos com confirmações em dia.';
    var n = cobra.length;
    var verbo = n === 1 ? ' precisa' : ' precisam';
    if (st.escopo !== 'meus') return base + '. ' + n + verbo + ' de cobrança até a véspera.';
    var mostrados = cobra.slice(0, 2).map(descricaoCobranca).join('; ');
    var resto = n > 2 ? ' e mais ' + (n - 2) : '';
    return base + '. ' + n + verbo + ' de cobrança: ' + mostrados + resto + '.';
  }

  // Token de faixa do cartão (data-faixa). Encerrado fica neutro. Sem dado de confirmação (nenhum titular
  // com status no mês e nenhum confirmado) usa sem_dados; a faixa do servidor não muda.
  function estiloConselho(st, c) {
    var faixa = c.passado || !c.faixa ? null : faixaDe(c.faixa);
    var semDados = !c.passado && c.membrosEsperados === 0 && c.confirmadosQtd === 0;
    var chave = c.passado ? null : (semDados || !c.faixa ? 'sem_dados' : c.faixa);
    return { chave: chave, faixa: faixa, passado: !!c.passado };
  }
  function lampa(e) {
    return '<span class="ag-lamp"' + (e.chave ? ' data-faixa="' + e.chave + '"' : '') + ' aria-hidden="true"></span>';
  }

  function cardConselho(st, c, idx) {
    var e = estiloConselho(st, c);
    var contagem = '';
    var sub = nivelTexto(c.nivel) + (st.escopo === 'equipe' ? ' · CS ' + esc(c.cs || 'não informado') : '');
    var linhaCobranca = '';
    if (c.passado) {
      var presenca = c.presenca ? 'Presença ' + c.presenca.presentes + ' de ' + c.presenca.total : 'Presença não apurada';
      sub += ' · ' + presenca;
    } else {
      var esperados = c.membrosEsperados;
      var txt = (c.confirmadosQtd == null ? '' : c.confirmadosQtd) + (esperados == null ? '' : '/' + esperados);
      contagem = '<span class="ag-direita">' + lampa(e) + esc(txt) + '</span>';
      if (c.precisaCobranca && c.prazoCobranca) {
        linhaCobranca = '<div class="ag-cobranca">' + (c.prazoCobranca.tipo === 'hoje' ? 'Cobrar hoje' : 'Cobrar até ' + ddmm(c.prazoCobranca.diaIso)) + '</div>';
      }
    }
    var foto = c.conselheiroId != null
      ? '<img class="ag-foto" data-ag-foto="1" src="/conselheiro-foto/' + encodeURIComponent(c.conselheiroId) + '" alt="' + esc(c.conselheiroNome) + '" loading="lazy">'
      : '<span class="ag-iniciais" aria-hidden="true">' + esc(iniciais(c.conselheiroNome)) + '</span>';
    var rotulo = 'Conselho de ' + c.conselheiroNome + ', ' + nivelTexto(c.nivel) + ', ' + DIAS_CURTOS[dePartesIso(c.diaIso).getDay()] + ' ' + ddmm(c.diaIso) + ' às ' + c.hhmm
      + (c.passado ? ', encerrado, presença ' + (c.presenca ? c.presenca.presentes + ' de ' + c.presenca.total : 'não apurada')
        : ', confirmados ' + c.confirmadosQtd + ', esperados ' + (c.membrosEsperados == null ? 'não informados' : c.membrosEsperados) + ', faixa ' + (e.faixa ? e.faixa.rotulo : 'sem faixa')
          + (c.precisaCobranca ? ', precisa de cobrança' : ''));
    return '<button type="button" class="ag-card' + (e.passado ? ' passado' : '') + '"' + (e.chave ? ' data-faixa="' + e.chave + '"' : '') + ' data-ag="card" data-ag-idx="' + idx + '" aria-label="' + esc(rotulo) + '">'
      + '<div class="ag-topo"><span>' + esc(c.hhmm) + '</span>' + contagem + '</div>'
      + '<div class="ag-corpo-card">' + foto + '<div class="ag-texto"><div class="ag-nome">' + esc(c.conselheiroNome) + '</div>'
      + '<div class="ag-sub">' + sub + '</div>' + linhaCobranca + '</div></div></button>';
  }

  function cardRound(st, r, idx) {
    var cor = CFG.roundCor[r.status] || '#757575';
    var cs = st.escopo === 'equipe' && r.cs ? '<span class="ag-sub">CS ' + esc(r.cs) + '</span>' : '';
    var rotulo = 'Round ' + (r.nome || 'sem nome') + ', ' + DIAS_CURTOS[dePartesIso(r.diaIso).getDay()] + ' ' + ddmm(r.diaIso) + ' às ' + r.hhmm + ', status ' + (r.status || 'sem status');
    return '<button type="button" class="ag-card ag-round" data-ag="card" data-ag-idx="' + idx + '" aria-label="' + esc(rotulo) + '">'
      + '<div class="ag-topo"><span>' + esc(r.hhmm) + '</span><span class="ag-sub" style="margin:0;">Round</span></div>'
      + '<div class="ag-nome" style="margin-top:6px;">' + esc(r.nome || 'Sem nome') + '</div>'
      + (r.tema ? '<div class="ag-sub">' + esc(r.tema) + '</div>' : '')
      + '<div class="ag-corpo-card" style="margin-top:6px;">'
      + '<span class="ag-pill" style="background:' + esc(cor) + ';">' + esc(r.status || 'sem status') + '</span>' + cs + '</div></button>';
  }

  function htmlItem(st, it, idx) { return it.tipo === 'round' ? cardRound(st, it, idx) : cardConselho(st, it, idx); }

  function ordenarItens(a, b) {
    if (a.hhmm !== b.hhmm) return a.hhmm < b.hhmm ? -1 : 1;
    return gravidade(a) - gravidade(b);
  }

  function renderSemana(st, itens) {
    var dias = [];
    for (var k = 0; k < 7; k++) {
      var d = addDias(st.semanaIni, k);
      var iso = isoDe(d);
      var tem = itens.some(function (it) { return it.diaIso === iso; });
      if (k < 5 || tem) dias.push({ d: d, iso: iso });
    }
    var turnosComItens = CFG.turnos.filter(function (t) {
      return itens.some(function (it) { return it.turno === t.chave && dias.some(function (dia) { return dia.iso === it.diaIso; }); });
    });
    if (!turnosComItens.length) return null;
    var hoje = isoDe(new Date());
    var html = '<div class="ag-grade" style="--ag-dias:' + dias.length + ';">';
    html += '<div class="ag-cab-dia"></div>';
    dias.forEach(function (dia) {
      var cab = DIAS_CURTOS[dia.d.getDay()].toUpperCase() + ' ' + dia.d.getDate();
      html += '<div class="ag-cab-dia' + (dia.iso === hoje ? ' hoje' : '') + '">' + esc(cab) + (dia.iso === hoje ? ' · HOJE' : '') + '</div>';
    });
    turnosComItens.forEach(function (t) {
      html += '<div class="ag-eixo">' + esc(t.rotulo) + '</div>';
      dias.forEach(function (dia) {
        var celulas = itens.filter(function (it) { return it.turno === t.chave && it.diaIso === dia.iso; }).sort(ordenarItens);
        html += '<div class="ag-celula' + (dia.iso === hoje ? ' hoje' : '') + '">';
        celulas.forEach(function (it) { html += htmlItem(st, it, st.visiveis.indexOf(it)); });
        html += '</div>';
      });
    });
    html += '</div>';
    return html;
  }

  function renderLista(st, itens) {
    if (!itens.length) return null;
    var porDia = {};
    itens.slice().sort(function (a, b) {
      if (a.diaIso !== b.diaIso) return a.diaIso < b.diaIso ? -1 : 1;
      return ordenarItens(a, b);
    }).forEach(function (it) { (porDia[it.diaIso] = porDia[it.diaIso] || []).push(it); });
    var hoje = isoDe(new Date());
    var html = '<div class="ag-lista">';
    Object.keys(porDia).sort().forEach(function (iso) {
      var d = dePartesIso(iso);
      var titulo = DIAS_LONGOS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_CURTOS[d.getMonth()] + (iso === hoje ? ' · HOJE' : '');
      html += '<div><div class="ag-lista-dia-titulo">' + esc(titulo) + '</div><div class="ag-lista-itens">';
      porDia[iso].forEach(function (it) { html += htmlItem(st, it, st.visiveis.indexOf(it)); });
      html += '</div></div>';
    });
    return html + '</div>';
  }

  function legendaHtml() {
    var h = '';
    CFG.faixas.forEach(function (f) {
      var intervalo = f.ate === null ? f.de + ' ou mais' : f.de + ' a ' + f.ate;
      h += '<span class="ag-legenda-item"><span class="ag-lamp" data-faixa="' + f.chave + '"></span>' + esc(capitalizar(f.rotulo)) + ' ' + esc(intervalo) + '</span>';
    });
    h += '<span class="ag-legenda-item"><span class="ag-lamp" data-faixa="sem_dados"></span>Sem dados</span>';
    h += '<span class="ag-legenda-item"><span class="ag-lamp encerrado"></span>Encerrado</span>';
    return h;
  }

  function desenharControles(st) {
    var ehAtual = isoDe(segundaDe(new Date())) === isoDe(st.semanaIni);
    st.controles.innerHTML =
      '<div class="ag-controles">'
      + '<button type="button" class="ag-btn" data-ag="prev" aria-label="Semana anterior">&lsaquo;</button>'
      + '<button type="button" class="ag-btn" data-ag="next" aria-label="Próxima semana">&rsaquo;</button>'
      + (ehAtual ? '' : '<button type="button" class="ag-btn" data-ag="semana-atual">Esta semana</button>')
      + '<span class="ag-seletor" role="group" aria-label="Escopo">'
      + '<button type="button" class="ag-btn" data-ag="escopo" data-valor="meus" aria-pressed="' + (st.escopo === 'meus') + '"' + (st.csNome ? '' : ' disabled') + '>Meus</button>'
      + '<button type="button" class="ag-btn" data-ag="escopo" data-valor="equipe" aria-pressed="' + (st.escopo === 'equipe') + '">Equipe</button>'
      + '</span>'
      + '<span class="ag-seletor ag-seletor-visao" role="group" aria-label="Visão">'
      + '<button type="button" class="ag-btn" data-ag="visao" data-valor="semana" aria-pressed="' + (st.visao === 'semana') + '">Semana</button>'
      + '<button type="button" class="ag-btn" data-ag="visao" data-valor="lista" aria-pressed="' + (st.visao === 'lista') + '">Lista</button>'
      + '</span></div>';
    st.rotulo.textContent = 'Agenda · ' + rotuloSemana(st.semanaIni);
    st.legenda.innerHTML = legendaHtml();
  }

  function renderizar(st) {
    var itens = itensDaSemana(st);
    st.visiveis = itens.slice().sort(ordenarItens);
    st.resumo.textContent = resumoTexto(st, itens);
    var usaLista = st.visao === 'lista' || ehMobile();
    var html = usaLista ? renderLista(st, st.visiveis) : renderSemana(st, st.visiveis);
    st.corpo.innerHTML = html || '<div class="ag-vazio">Nenhum conselho ou round nesta semana.</div>';
    desenharControles(st);
  }

  function carregar(st) {
    var seq = ++st.seq;
    var ini = st.semanaIni;
    var fim = addDias(ini, 7);
    st.corpo.innerHTML = '<div class="ag-vazio">Carregando agenda…</div>';
    st.resumo.textContent = '';
    fetch('/api/agenda?inicio=' + isoDe(ini) + '&fim=' + isoDe(fim), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || 'erro ' + r.status);
          return j;
        });
      })
      .then(function (dados) {
        if (seq !== st.seq) return;
        st.dados = dados;
        renderizar(st);
      })
      .catch(function (err) {
        if (seq !== st.seq) return;
        st.resumo.textContent = '';
        st.corpo.innerHTML = '<div class="ag-vazio ag-erro">Não foi possível carregar a agenda: ' + esc(err.message) + '. Tente sincronizar ou recarregar.</div>';
      });
  }

  function fecharModal() {
    var m = document.getElementById('agendaModalFundo');
    if (m) m.parentNode.removeChild(m);
  }

  function abrirModal(st, item) {
    fecharModal();
    var fundo = document.createElement('div');
    fundo.id = 'agendaModalFundo';
    fundo.className = 'ag-modal-fundo';
    var titulo = item.tipo === 'round' ? (item.nome || 'Round') : item.conselheiroNome;
    var corpo = '';
    if (item.tipo === 'round') {
      corpo = '<dl><dt>Dia</dt><dd>' + esc(DIAS_LONGOS[dePartesIso(item.diaIso).getDay()] + ', ' + ddmm(item.diaIso)) + ' às ' + esc(item.hhmm) + '</dd>'
        + '<dt>Status</dt><dd>' + esc(item.status || 'sem status') + '</dd>'
        + (item.tema ? '<dt>Tema</dt><dd>' + esc(item.tema) + '</dd>' : '')
        + (item.local ? '<dt>Local</dt><dd>' + esc(item.local) + '</dd>' : '')
        + '<dt>CS</dt><dd>' + esc(item.cs || 'não informado') + '</dd></dl>';
    } else {
      var e = estiloConselho(st, item);
      var linhas = '<dl><dt>Nível</dt><dd>' + esc(nivelTexto(item.nivel)) + '</dd>'
        + '<dt>CS</dt><dd>' + esc(item.cs || 'não informado') + '</dd>'
        + '<dt>Dia</dt><dd>' + esc(DIAS_LONGOS[dePartesIso(item.diaIso).getDay()] + ', ' + ddmm(item.diaIso)) + ' às ' + esc(item.hhmm) + '</dd>';
      if (item.passado) {
        linhas += '<dt>Presença</dt><dd>' + (item.presenca ? item.presenca.presentes + ' de ' + item.presenca.total : 'não apurada') + '</dd></dl>';
        var pres = (item.presencaPorMembro || []).map(function (p) {
          return '<li>' + esc(p.nome) + (p.reposicao ? ' (reposição)' : '') + ' · ' + esc(p.status || 'sem status') + '</li>';
        }).join('');
        corpo = linhas + (pres ? '<ul>' + pres + '</ul>' : '');
      } else {
        var titulares = (item.confirmados || []).filter(function (c) { return !c.reposicao; });
        var reposicoes = (item.confirmados || []).filter(function (c) { return c.reposicao; });
        var esperados = item.membrosEsperados == null ? ', esperados não informados' : ' de ' + plural(item.membrosEsperados, 'esperado', 'esperados');
        linhas += '<dt>Faixa</dt><dd>' + esc(e.faixa ? capitalizar(e.faixa.rotulo) : 'Sem dados') + ', ' + plural(titulares.length, 'confirmado', 'confirmados') + ' e ' + plural(reposicoes.length, 'reposição', 'reposições') + esperados + '</dd>';
        if (item.precisaCobranca && item.prazoCobranca) {
          linhas += '<dt>Cobrança</dt><dd>' + (item.prazoCobranca.tipo === 'hoje' ? 'Cobrar hoje' : 'Cobrar até ' + ddmm(item.prazoCobranca.diaIso)) + '</dd>';
        }
        linhas += '</dl>';
        var listaTitulares = titulares.map(function (c) { return '<li>' + esc(c.nome) + '</li>'; }).join('');
        var listaRepos = reposicoes.map(function (c) { return '<li>' + esc(c.nome) + '</li>'; }).join('');
        corpo = linhas + '<div class="ag-sub">Confirmados</div>' + (listaTitulares ? '<ul>' + listaTitulares + '</ul>' : '<div class="ag-sub">Ninguém confirmou ainda.</div>')
          + '<div class="ag-sub">Reposições</div>' + (listaRepos ? '<ul>' + listaRepos + '</ul>' : '<div class="ag-sub">Nenhuma reposição para este conselho.</div>');
      }
    }
    fundo.innerHTML = '<div class="ag-modal" role="dialog" aria-modal="true" aria-labelledby="agendaModalTitulo">'
      + '<h3 id="agendaModalTitulo">' + esc(titulo) + '</h3>' + corpo
      + '<button type="button" class="ag-modal-fechar" data-ag="fechar">Fechar</button></div>';
    fundo.addEventListener('click', function (ev) {
      if (ev.target === fundo || (ev.target.getAttribute && ev.target.getAttribute('data-ag') === 'fechar')) fecharModal();
    });
    document.body.appendChild(fundo);
    var botao = fundo.querySelector('[data-ag="fechar"]');
    if (botao) botao.focus();
  }

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharModal(); });

  function acaoPara(st, alvo) {
    var el = alvo.closest ? alvo.closest('[data-ag]') : null;
    if (!el || !st.raiz.contains(el)) return;
    var acao = el.getAttribute('data-ag');
    if (acao === 'prev') { st.semanaIni = addDias(st.semanaIni, -7); carregar(st); return; }
    if (acao === 'next') { st.semanaIni = addDias(st.semanaIni, 7); carregar(st); return; }
    if (acao === 'semana-atual') { st.semanaIni = segundaDe(new Date()); carregar(st); return; }
    if (acao === 'escopo' && !el.disabled) { st.escopo = el.getAttribute('data-valor'); renderizar(st); return; }
    if (acao === 'visao') { st.visao = el.getAttribute('data-valor'); renderizar(st); return; }
    if (acao === 'card') {
      var item = st.visiveis[Number(el.getAttribute('data-ag-idx'))];
      if (item) abrirModal(st, item);
    }
  }

  function montarEstrutura(st) {
    st.raiz.innerHTML = '<div class="ag-bloco">'
      + '<div class="ag-cab"><div class="ag-rotulo"></div><div data-ag-controles></div></div>'
      + '<p class="ag-resumo" aria-live="polite"></p>'
      + '<div class="ag-legenda"></div>'
      + '<div data-ag-corpo></div></div>';
    st.rotulo = st.raiz.querySelector('.ag-rotulo');
    st.controles = st.raiz.querySelector('[data-ag-controles]');
    st.resumo = st.raiz.querySelector('.ag-resumo');
    st.legenda = st.raiz.querySelector('.ag-legenda');
    st.corpo = st.raiz.querySelector('[data-ag-corpo]');
    st.raiz.addEventListener('click', function (ev) { acaoPara(st, ev.target); });
    // Foto que falha vira iniciais: erro de imagem não borbulha, por isso captura na raiz.
    st.raiz.addEventListener('error', function (ev) {
      var img = ev.target;
      if (!img || !img.getAttribute || img.getAttribute('data-ag-foto') !== '1') return;
      var span = document.createElement('span');
      span.className = 'ag-iniciais';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = iniciais(img.getAttribute('alt'));
      img.parentNode.replaceChild(span, img);
    }, true);
  }

  // Monta (ou reconfigura) a agenda dentro de #raizId. opcoes.csNome: CS da página (Meus); sem ele, só Equipe.
  global.agendaMontar = function (raizId, opcoes) {
    var raiz = document.getElementById(raizId);
    if (!raiz) return;
    var st = controles[raizId];
    if (!st || st.raiz !== raiz) {
      st = { raiz: raiz, seq: 0, visao: 'semana', dados: null, visiveis: [] };
      controles[raizId] = st;
      montarEstrutura(st);
    }
    st.csNome = opcoes && opcoes.csNome ? String(opcoes.csNome) : null;
    st.escopo = st.csNome ? 'meus' : 'equipe';
    st.visao = 'semana';
    st.semanaIni = segundaDe(new Date());
    carregar(st);
  };
})(window);
