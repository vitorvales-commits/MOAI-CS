// Vitorio no navegador (30/10/2026): painel de perguntas, resultado com o trecho original e tour por perfil.
// Marcação e estilo vêm de lib/vitorio/montagem.ts; a busca é public/vitorio-busca.js (sem IA, sem API externa).
// Sem biblioteca externa. Todo texto vindo dos documentos entra por textContent, nunca por innerHTML.
(function () {
  'use strict';
  var raiz = document.getElementById('vitorio-raiz');
  if (!raiz || !window.VitorioBusca) return;
  var B = window.VitorioBusca;
  var perfil = raiz.getAttribute('data-perfil') || 'cs';
  function $(id) { return document.getElementById(id); }
  var fab = $('vtFab'), painel = $('vtPainel'), form = $('vtForm'), campo = $('vtPergunta'), saida = $('vtResultado');
  var mascotePainel = painel.querySelector('.vitorio');

  // ---------------- rede ----------------
  function api(url, opts) {
    return fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opts || {})).then(function (r) {
      if (r.status === 401) { location.href = '/login'; return new Promise(function () {}); }
      return r;
    });
  }
  function postar(url, corpo) {
    return api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }); }).catch(function () { return {}; });
  }

  // ---------------- índice ----------------
  var CHAVE_CACHE = 'vitorio_indice_' + perfil;
  var indice = null, docs = [], config = null, promessaIndice = null;
  function lerCache() { try { return JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null'); } catch (e) { return null; } }
  function gravarCache(p) { try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(p)); } catch (e) { /* sem armazenamento */ } }
  function carregarIndice() {
    if (indice) return Promise.resolve();
    if (promessaIndice) return promessaIndice;
    var guardado = lerCache(), cab = {};
    if (guardado && guardado.versao) cab['If-None-Match'] = '"' + guardado.versao + '"';
    promessaIndice = api('/api/vitorio/indice?perfil=' + perfil, { headers: cab }).then(function (r) {
      if (r.status === 304 && guardado) return guardado;
      if (!r.ok) throw new Error('indice ' + r.status);
      return r.json().then(function (p) { gravarCache(p); return p; });
    }).then(function (p) {
      docs = p.documentos; config = p.config;
      indice = B.indexar(docs, p.sinonimos);
    }).catch(function (e) { promessaIndice = null; throw e; });
    return promessaIndice;
  }

  // ---------------- mascote ----------------
  var tEstado = null;
  function estado(e, voltarEm) {
    mascotePainel.setAttribute('data-estado', e);
    clearTimeout(tEstado);
    if (voltarEm) tEstado = setTimeout(function () { mascotePainel.setAttribute('data-estado', 'neutro'); }, voltarEm);
  }

  // ---------------- painel ----------------
  var aberto = false;
  function focaveis() {
    return [].slice.call(painel.querySelectorAll('button:not([disabled]),input,a[href]')).filter(function (el) { return el.offsetParent !== null; });
  }
  function abrir() {
    if (aberto) return;
    aberto = true; esconderConvite();
    painel.hidden = false; fab.setAttribute('aria-expanded', 'true');
    campo.focus();
    if (!indice) {
      mostrarMsg('Lendo os processos…');
      carregarIndice().then(function () { if (saida.getAttribute('data-estado') === 'carregando') saida.textContent = ''; saida.removeAttribute('data-estado'); if (campo.value.trim()) buscar(); })
        .catch(mostrarErroIndice);
    }
  }
  function fechar() {
    if (!aberto) return;
    aberto = false; painel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus();
  }
  function mostrarMsg(txt, classe) {
    saida.textContent = '';
    saida.setAttribute('data-estado', 'carregando');
    var p = document.createElement('p'); p.className = 'vt-msg' + (classe ? ' ' + classe : ''); p.textContent = txt; saida.appendChild(p);
    return p;
  }
  function mostrarErroIndice() {
    var p = mostrarMsg('Não consegui carregar os processos agora. Tente de novo em instantes.', 'erro');
    saida.removeAttribute('data-estado');
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vt-btn sm claro'; b.textContent = 'Tentar de novo';
    b.onclick = function () { mostrarMsg('Lendo os processos…'); carregarIndice().then(function () { saida.textContent = ''; saida.removeAttribute('data-estado'); if (campo.value.trim()) buscar(); }).catch(mostrarErroIndice); };
    p.appendChild(document.createElement('br')); p.appendChild(b);
  }

  // ---------------- resultado ----------------
  function el(tag, classe, texto) { var e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; }
  function trechoEl(doc, realce, max) {
    var t = B.trecho(doc.corpo || doc.titulo, realce, max), p = el('p', 'vt-trecho'), pos = 0;
    if (t.prefixo) p.appendChild(document.createTextNode('… '));
    t.marcas.forEach(function (m) {
      p.appendChild(document.createTextNode(t.texto.slice(pos, m[0])));
      p.appendChild(el('mark', null, t.texto.slice(m[0], m[1]))); pos = m[1];
    });
    p.appendChild(document.createTextNode(t.texto.slice(pos)));
    if (t.sufixo) p.appendChild(document.createTextNode(' …'));
    return p;
  }
  function botaoDestino(doc) {
    if (!doc.destino) return null;
    var a = el('a', 'vt-btn sm', doc.verbo || 'Abrir'); a.href = doc.destino; return a;
  }
  function cartaoResposta(doc, realce) {
    var c = el('article', 'vt-cartao');
    c.appendChild(el('div', 'vt-origem', doc.origem));
    c.appendChild(el('h3', null, doc.titulo));
    c.appendChild(trechoEl(doc, realce, 360));
    if (doc.data) c.appendChild(el('p', 'vt-data', 'Documento publicado em ' + doc.data));
    var b = botaoDestino(doc); if (b) c.appendChild(b);
    return c;
  }
  var ultimaConsultaId = null;
  function perguntaAjudou(wrap) {
    var l = el('div', 'vt-ajudou'); l.appendChild(el('span', null, 'Isso ajudou?'));
    function marca(util, rotulo) {
      var b = el('button', 'vt-btn sm claro', rotulo); b.type = 'button';
      b.onclick = function () {
        if (ultimaConsultaId) postar('/api/vitorio/util', { id: ultimaConsultaId, util: util });
        l.textContent = util ? 'Obrigado pelo retorno.' : 'Registrado. A liderança vai ver esta pergunta e pode documentar a resposta.';
      };
      l.appendChild(b);
    }
    marca(true, 'Sim'); marca(false, 'Não');
    wrap.appendChild(l);
  }
  function buscar() {
    var q = campo.value.trim();
    if (!q) return;
    if (!indice) { mostrarMsg('Lendo os processos…'); carregarIndice().then(function () { saida.removeAttribute('data-estado'); buscar(); }).catch(mostrarErroIndice); return; }
    var r = B.buscar(indice, q, config);
    saida.removeAttribute('data-estado'); saida.textContent = '';
    ultimaConsultaId = null;
    if (r.tipo === 'resposta') {
      estado('respondendo', 1000);
      saida.appendChild(cartaoResposta(r.itens[0].doc, r.realce));
      perguntaAjudou(saida);
    } else if (r.tipo === 'ambigua') {
      estado('neutro');
      saida.appendChild(el('p', 'vt-msg', 'Encontrei mais de um caminho. Qual destes?'));
      r.itens.forEach(function (it) {
        var a = el(it.doc.destino ? 'a' : 'div', 'vt-compacto');
        if (it.doc.destino) a.href = it.doc.destino;
        a.appendChild(el('b', null, it.doc.titulo));
        var t = B.trecho(it.doc.corpo || '', r.realce, 110);
        a.appendChild(el('span', null, it.doc.origem + '. ' + t.texto + (t.sufixo ? ' …' : '')));
        saida.appendChild(a);
      });
    } else {
      estado('nada');
      saida.appendChild(el('p', 'vt-msg', 'Não encontrei isso nos processos nem no dash. A Luana pode ajudar, e esta pergunta fica registrada para entrar na documentação.'));
    }
    // O registro nunca bloqueia a resposta: o que importa é o resultado, a pessoa não espera por ele.
    postar('/api/vitorio/consulta', { perfil: perfil, consulta: B.normalizar(q).slice(0, 200), resultado: r.tipo, chave: r.tipo === 'resposta' ? r.itens[0].doc.chave : null })
      .then(function (d) { ultimaConsultaId = d && d.id ? d.id : null; });
  }

  fab.addEventListener('click', function () { if (aberto) fechar(); else abrir(); });
  $('vtFechar').addEventListener('click', fechar);
  form.addEventListener('submit', function (ev) { ev.preventDefault(); buscar(); });
  painel.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { ev.stopPropagation(); fechar(); return; }
    if (ev.key !== 'Tab') return;
    var f = focaveis(); if (!f.length) return;
    var a = document.activeElement, i = f.indexOf(a);
    if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
    else if (!ev.shiftKey && (i === f.length - 1)) { ev.preventDefault(); f[0].focus(); }
  });

  // ---------------- tour ----------------
  var tour = null;
  function alvoVisivel(alvo) {
    var e = document.querySelector('[data-tour="' + alvo + '"]');
    if (!e) return null;
    var r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? e : null;
  }
  function marcarVisto(roteiro) { postar('/api/vitorio/tour', { tourId: roteiro.id, versao: roteiro.versao }); }
  function encerrarTour(concluido) {
    if (!tour) return;
    var t = tour; tour = null;
    ['bloqueio', 'recorte', 'balao'].forEach(function (k) { if (t[k] && t[k].parentNode) t[k].parentNode.removeChild(t[k]); });
    window.removeEventListener('resize', t.reposicionar); window.removeEventListener('scroll', t.reposicionar, true);
    document.removeEventListener('keydown', t.teclas, true);
    marcarVisto(t.roteiro);
    fab.focus();
  }
  function iniciarTour(roteiro, passos) {
    if (tour) encerrarTour();
    fechar();
    var validos = passos.filter(function (p) { return alvoVisivel(p.alvo); });
    if (!validos.length) return false;
    var modelo = $('vtTourModelo');
    var t = tour = { roteiro: roteiro, passos: validos, i: 0 };
    t.bloqueio = el('div', 'vt-tour-bloqueio'); t.recorte = el('div', 'vt-tour-recorte'); t.balao = el('div', 'vt-tour-balao');
    t.balao.setAttribute('role', 'dialog'); t.balao.setAttribute('aria-label', 'Tour: ' + roteiro.nome);
    t.balao.appendChild(modelo.content.cloneNode(true));
    var corpo = el('div', 'vt-tour-corpo'), h = el('h3'), p = el('p'), pe = el('div', 'vt-tour-pe'), cont = el('span', 'vt-cont');
    var ant = el('button', 'vt-btn sm claro', 'Anterior'), prox = el('button', 'vt-btn sm', 'Próximo'), sair = el('button', 'vt-btn sm claro', 'Sair');
    [ant, prox, sair].forEach(function (b) { b.type = 'button'; });
    pe.appendChild(cont); pe.appendChild(ant); pe.appendChild(prox); pe.appendChild(sair);
    h.setAttribute('aria-live', 'polite');
    corpo.appendChild(h); corpo.appendChild(p); corpo.appendChild(pe); t.balao.appendChild(corpo);
    document.body.appendChild(t.bloqueio); document.body.appendChild(t.recorte); document.body.appendChild(t.balao);
    var mascote = t.balao.querySelector('.vitorio');
    t.reposicionar = function () {
      var passo = t.passos[t.i], e = alvoVisivel(passo.alvo);
      if (!e) { return; }
      var r = e.getBoundingClientRect(), m = 6;
      t.recorte.style.top = (r.top - m) + 'px'; t.recorte.style.left = (r.left - m) + 'px';
      t.recorte.style.width = (r.width + 2 * m) + 'px'; t.recorte.style.height = (r.height + 2 * m) + 'px';
      if (window.innerWidth <= 640) { t.balao.style.top = ''; t.balao.style.left = ''; return; }
      var bw = t.balao.offsetWidth, bh = t.balao.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
      var abaixo = r.bottom + m + 14 + bh <= vh, acima = r.top - m - 14 - bh >= 0, top;
      if (abaixo) top = r.bottom + m + 14; else if (acima) top = r.top - m - 14 - bh; else top = Math.max(12, vh - bh - 12);
      t.balao.style.top = top + 'px';
      t.balao.style.left = Math.max(12, Math.min(vw - bw - 12, r.left + r.width / 2 - bw / 2)) + 'px';
    };
    function mostrar(direcao) {
      // alvo que sumiu desde o início do tour: pula sem erro
      while (t.i >= 0 && t.i < t.passos.length && !alvoVisivel(t.passos[t.i].alvo)) t.i += direcao;
      if (t.i < 0 || t.i >= t.passos.length) { encerrarTour(true); return; }
      var passo = t.passos[t.i], e = alvoVisivel(passo.alvo);
      e.scrollIntoView({ block: 'center', behavior: 'instant' }); // instant ignora o scroll suave do CSS da página
      h.textContent = passo.titulo; p.textContent = passo.texto;
      cont.textContent = (t.i + 1) + ' de ' + t.passos.length;
      ant.disabled = t.i === 0; prox.textContent = t.i === t.passos.length - 1 ? 'Concluir' : 'Próximo';
      mascote.setAttribute('data-aceno', mascote.getAttribute('data-aceno') === '1' ? '2' : '1');
      t.reposicionar();
      requestAnimationFrame(t.reposicionar); setTimeout(t.reposicionar, 350); // depois que o layout e a rolagem assentam
      prox.focus();
    }
    ant.onclick = function () { t.i--; mostrar(-1); };
    prox.onclick = function () { if (t.i >= t.passos.length - 1) encerrarTour(true); else { t.i++; mostrar(1); } };
    sair.onclick = function () { encerrarTour(false); };
    t.teclas = function (ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); encerrarTour(false); }
      else if (ev.key === 'Tab') {
        var f = [ant, prox, sair].filter(function (b) { return !b.disabled; }), i = f.indexOf(document.activeElement);
        if (i === -1) { ev.preventDefault(); f[0].focus(); }
        else if (ev.shiftKey && i === 0) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', t.teclas, true);
    window.addEventListener('resize', t.reposicionar); window.addEventListener('scroll', t.reposicionar, true);
    mostrar(1);
    return true;
  }

  function parametrosPagina() {
    var u = new URL(location.href);
    return 'perfil=' + perfil + '&path=' + encodeURIComponent(u.pathname) + '&aba=' + encodeURIComponent(u.searchParams.get('aba') || '');
  }
  function buscarTour() {
    return api('/api/vitorio/tour?' + parametrosPagina()).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  // convite discreto: nunca abre o tour sozinho
  var convite = $('vtConvite');
  function esconderConvite() { convite.hidden = true; }
  function oferecerTour() {
    buscarTour().then(function (d) {
      if (!d || !d.roteiro || !d.convite || d.convite.tipo === 'nenhum') return;
      $('vtConviteTxt').textContent = d.convite.tipo === 'mudou' ? 'Esta página mudou. Quer ver o que há de novo?' : 'Quer um tour de um minuto por esta página?';
      convite.hidden = false;
      $('vtConviteSim').onclick = function () { esconderConvite(); if (!iniciarTour(d.roteiro, d.convite.passos)) marcarVisto(d.roteiro); };
      $('vtConviteNao').onclick = function () { esconderConvite(); marcarVisto(d.roteiro); };
    });
  }
  $('vtRefazer').addEventListener('click', function () {
    buscarTour().then(function (d) {
      if (!d || !d.roteiro) { mostrarMsg('Esta página ainda não tem tour.'); saida.removeAttribute('data-estado'); return; }
      if (!iniciarTour(d.roteiro, d.roteiro.passos)) { mostrarMsg('Não encontrei os elementos do tour nesta tela.'); saida.removeAttribute('data-estado'); }
    });
  });

  setTimeout(oferecerTour, 1500);
})();
