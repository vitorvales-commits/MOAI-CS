/* Processos de CS (13/10/2026). Leitor para todo o time e editor por item para gestor.
   O documento de processos é uma aplicação HTML movida a dados: abas, busca, diagramas e POPs são
   desenhados a partir de constantes em CAIXA ALTA no script (META, PROCESSOS, FLUXOS, POPS, FAQ...).
   O banco guarda a moldura (o HTML com o bloco de dados trocado por PROC_DADOS) e os dados avaliados.
   Este script:
   1. monta o documento e o exibe num iframe isolado (sandbox sem allow-same-origin), sem vazar estilo
      para o painel nem dar acesso à sessão;
   2. para gestor, mantém um rascunho com inserir, editar e remover item de cada coleção, importar o HTML
      atualizado com comparação item a item, desfazer, validação antes de publicar, histórico e restauração.
   Arquivo sem bloco de dados é tratado inteiro: só se troca importando a versão nova.
   As funções puras (extração, comparação, aplicação, montagem) também são exportadas para os testes. */
(function (global) {
  'use strict';

  var MARCADOR = '/*PROC_DADOS*/';
  var CHAVE_RASCUNHO = 'moai-processos-rascunho-v2';
  var DECL = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;
  var FIM_REGIAO = /^(?:async\s+)?(?:function|class)\b/;
  var CAIXA_ALTA = /^[A-Z][A-Z0-9_]*$/;

  // Nomes de tela das coleções conhecidas e a ordem em que aparecem no editor. Coleções novas
  // aparecem depois, pelo próprio nome, sem precisar mexer aqui.
  var AMIGAVEIS = {
    FAQ: 'Perguntas frequentes', PROCESSOS: 'Processos', FLUXOS: 'Fluxos e atividades', POPS: 'POPs',
    MODELOS: 'Modelos, cadastro', MODELO_CORPO: 'Modelos, conteúdo', MACROS: 'Macroprocessos',
    META: 'Cabeçalho do documento', CADEIA: 'Cadeia de valor', NIVEIS: 'Níveis da arquitetura',
    LANE_COR: 'Cores das raias', STATUS_TXT: 'Textos de status', L: 'Raias', GAL: 'Origem padrão dos modelos',
    CFG: 'Medidas do diagrama'
  };
  // Rótulos de tela para os campos mais comuns; campo desconhecido aparece pelo próprio nome.
  var CAMPOS_AMIGAVEIS = {
    cat: 'Categoria', q: 'Pergunta', a: 'Resposta', fonte: 'Fonte', val: 'A validar', nome: 'Nome', id: 'Identificador',
    desc: 'Descrição', tipo: 'Tipo', status: 'Status', origem: 'Origem', macro: 'Macroprocesso', subs: 'Subprocessos',
    fluxos: 'Fluxos', resumo: 'Resumo', gatilho: 'Gatilho', executor: 'Executor', aprovador: 'Aprovador', ferramentas: 'Ferramentas',
    sla: 'Prazo', freq: 'Frequência', indicador: 'Indicador', risco: 'Risco', cod: 'Código', titulo: 'Título', subtitulo: 'Subtítulo',
    versao: 'Versão', data: 'Data', setor: 'Setor', objetivo: 'Objetivo', processo: 'Processo', nodes: 'Atividades do fluxo',
    dispara: 'Dispara', vemDe: 'Vem de', vemTxt: 'Origem em texto', valor: 'Valor'
  };
  var PRINCIPAIS = ['FAQ', 'PROCESSOS', 'FLUXOS', 'POPS', 'MODELOS', 'MODELO_CORPO', 'MACROS', 'META', 'CADEIA'];

  // Referências entre coleções do mapa de processos. Ao remover ou renomear um item usado em outro
  // lugar, o documento quebra ao abrir aquela tela (ex.: modsOf lança "Modelo inexistente"). Regras de
  // coleções que não existem no arquivo são ignoradas, então outros documentos não são afetados.
  // de: caminho do valor que aponta; para: COLECAO (chaves de um mapa) ou COLECAO.campo (lista).
  var SINGULAR = { FLUXOS: 'O fluxo', PROCESSOS: 'O processo', POPS: 'O POP' };
  var REFERENCIAS = [
    { de: 'FLUXOS[].nodes[].mod[]', para: 'MODELOS', oQue: 'o modelo' },
    { de: 'FLUXOS[].nodes[].ref', para: 'FLUXOS.id', oQue: 'o fluxo' },
    { de: 'FLUXOS[].dispara[]', para: 'FLUXOS.id', oQue: 'o fluxo' },
    { de: 'FLUXOS[].vemDe[]', para: 'FLUXOS.id', oQue: 'o fluxo' },
    { de: 'FLUXOS[].processo', para: 'PROCESSOS.id', oQue: 'o processo' },
    { de: 'PROCESSOS[].fluxos[]', para: 'FLUXOS.id', oQue: 'o fluxo' },
    { de: 'PROCESSOS[].macro', para: 'MACROS.id', oQue: 'o macroprocesso' },
    { de: 'POPS[].fluxos[]', para: 'FLUXOS.id', oQue: 'o fluxo' }
  ];

  // ======================================================================
  // Funções puras
  // ======================================================================
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normalizar(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function semTags(s) { return String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function clonar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function iguais(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function nomeAmigavel(n) { return AMIGAVEIS[n] || n; }

  // Localiza o bloco de dados: o script inline com mais constantes em CAIXA ALTA na coluna zero.
  // A região começa na primeira dessas constantes e termina na primeira declaração de função ou
  // classe, ou na primeira constante que não está em CAIXA ALTA. Tudo fora dela vira moldura.
  function extrairDocumento(html) {
    html = String(html || '');
    var mt = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    var titulo = mt ? semTags(mt[1]) : '';
    var re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, m, melhor = null;
    while ((m = re.exec(html))) {
      var attrs = m[1] || '';
      if (/\bsrc\s*=/.test(attrs)) continue;
      var tipo = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
      if (tipo && !/javascript|module/i.test(tipo[1])) continue;
      var n = 0;
      m[2].split('\n').forEach(function (l) { var d = DECL.exec(l); if (d && CAIXA_ALTA.test(d[1])) n++; });
      if (n && (!melhor || n > melhor.n)) melhor = { n: n, ini: m.index + m[0].indexOf('>') + 1, conteudo: m[2] };
    }
    if (!melhor || html.indexOf(MARCADOR) >= 0) return { modo: 'inteiro', titulo: titulo, moldura: html, regiao: '', declaracoes: [] };
    var linhas = melhor.conteudo.split('\n');
    var i0 = -1;
    for (var i = 0; i < linhas.length; i++) { var d0 = DECL.exec(linhas[i]); if (d0 && CAIXA_ALTA.test(d0[1])) { i0 = i; break; } }
    var fim = linhas.length, declaracoes = [];
    for (var j = i0; j < linhas.length; j++) {
      var l = linhas[j];
      if (FIM_REGIAO.test(l)) { fim = j; break; }
      var d = DECL.exec(l);
      if (d) {
        if (!CAIXA_ALTA.test(d[1])) { fim = j; break; }
        declaracoes.push({ nome: d[1], inicio: j });
      }
    }
    declaracoes.forEach(function (dc, k) {
      var ate = k + 1 < declaracoes.length ? declaracoes[k + 1].inicio : fim;
      dc.fonte = linhas.slice(dc.inicio, ate).join('\n').replace(/\s+$/, '');
      dc.linha = dc.inicio - i0; // linha relativa ao início da região, para apontar onde está um erro
      delete dc.inicio;
    });
    var regiao = linhas.slice(i0, fim).join('\n');
    var novoConteudo = linhas.slice(0, i0).join('\n') + (i0 ? '\n' : '') + MARCADOR + '\n' + linhas.slice(fim).join('\n');
    var moldura = html.slice(0, melhor.ini) + novoConteudo + html.slice(melhor.ini + melhor.conteudo.length);
    return { modo: 'dados', titulo: titulo, moldura: moldura, regiao: regiao, declaracoes: declaracoes };
  }

  function serializarValor(v) {
    return JSON.stringify(v).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  function montarBlocoDados(dados) {
    return dados.map(function (c) {
      return c.tipo === 'fonte' ? c.fonte : 'const ' + c.nome + ' = ' + serializarValor(c.valor) + ';';
    }).join('\n');
  }
  // Ponte injetada no início do documento: avisa o painel de erros de execução (validação antes de
  // publicar) e abre links externos em nova aba.
  var PONTE = '<script>(function(){function env(m){try{parent.postMessage(m,"*")}catch(e){}}' +
    'window.addEventListener("error",function(e){env({tipo:"proc-erro",msg:String(e.message||e)})});' +
    'window.addEventListener("unhandledrejection",function(e){env({tipo:"proc-erro",msg:String(e.reason&&e.reason.message||e.reason)})});' +
    'window.addEventListener("load",function(){setTimeout(function(){env({tipo:"proc-ok"})},700)});' +
    'window.addEventListener("message",function(ev){if(ev.source===parent&&ev.data&&ev.data.tipo==="proc-ir"&&typeof ev.data.alvo==="string"){try{if(typeof go==="function")go(ev.data.alvo);else location.hash=ev.data.alvo}catch(e){}return}});' +
    'window.addEventListener("message",function(ev){if(ev.source!==parent||!ev.data||ev.data.tipo!=="proc-percorrer")return;' +
    'var abas=Array.prototype.slice.call(document.querySelectorAll("[data-t],[role=tab],.tab")).slice(0,20),i=0;' +
    '(function prox(){if(i>=abas.length){setTimeout(function(){env({tipo:"proc-percorrido"})},300);return}try{abas[i++].click()}catch(e){env({tipo:"proc-erro",msg:String(e.message||e)})}setTimeout(prox,180)})()});' +
    'document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest?ev.target.closest("a[href]"):null;if(!a)return;' +
    'var h=a.getAttribute("href")||"";if(/^(https?:|mailto:|tel:)/i.test(h)&&!a.getAttribute("target")){a.setAttribute("target","_blank");a.setAttribute("rel","noopener")}},true);' +
    '})();<\/script>';
  function montarHtml(doc) {
    var html = String(doc.moldura || '');
    if (doc.dados && doc.dados.length) {
      var p = html.split(MARCADOR);
      html = p.length === 2 ? p[0] + montarBlocoDados(doc.dados) + p[1] : html;
    }
    var h = /<head[^>]*>/i.exec(html);
    return h ? html.slice(0, h.index + h[0].length) + PONTE + html.slice(h.index + h[0].length) : PONTE + html;
  }

  // ---------------- itens, chaves e rótulos ----------------
  function formaDe(v) { return Array.isArray(v) ? 'lista' : (v && typeof v === 'object' ? 'mapa' : 'valor'); }
  var CAMPOS_CHAVE = ['id', 'cod', 'chave', 'q', 'nome', 'titulo', 'n'];
  function chaveItem(item, i) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (var k = 0; k < CAMPOS_CHAVE.length; k++) {
        var v = item[CAMPOS_CHAVE[k]];
        if (v !== undefined && v !== null && v !== '') return CAMPOS_CHAVE[k] + ':' + String(v);
      }
      return '#' + i;
    }
    if (item === null || typeof item !== 'object') return 'v:' + String(item);
    return '#' + i;
  }
  // Chaves de uma lista; se houver repetição, cai para a posição (comparação por ordem).
  function chavesLista(lista) {
    var ks = lista.map(chaveItem), vistos = {};
    for (var i = 0; i < ks.length; i++) { if (vistos[ks[i]]) return lista.map(function (_, j) { return '#' + j; }); vistos[ks[i]] = true; }
    return ks;
  }
  function rotuloItem(item, chave, forma) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      var r = item.nome || item.q || item.titulo || item.t || item.macro || item.termo || item.ref || item.id || item.cod;
      if (r) return String(r);
      return forma === 'mapa' ? chave : String(chave).replace(/^#/, 'Item ');
    }
    if (typeof item === 'string') {
      var t = semTags(item);
      if (forma === 'mapa') { var h = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(item); return chave + (h ? ' · ' + semTags(h[1]) : (t.length <= 40 ? ': ' + t : '')); }
      return t.slice(0, 80) || '(vazio)';
    }
    return forma === 'mapa' ? chave + ': ' + String(item) : String(item);
  }

  // ---------------- comparação ----------------
  function compararColecao(a, b) {
    var forma = formaDe(b), itens = [];
    if (forma === 'lista') {
      var ka = chavesLista(a), kb = chavesLista(b), posA = {};
      ka.forEach(function (k, i) { posA[k] = i; });
      kb.forEach(function (k, j) {
        var i = posA[k];
        itens.push(i === undefined ? { chave: k, situacao: 'novo', ni: j, rotulo: rotuloItem(b[j], k, forma) }
          : { chave: k, situacao: iguais(a[i], b[j]) ? 'igual' : 'alterado', ai: i, ni: j, rotulo: rotuloItem(b[j], k, forma) });
      });
      var emB = {}; kb.forEach(function (k) { emB[k] = true; });
      ka.forEach(function (k, i) { if (!emB[k]) itens.push({ chave: k, situacao: 'removido', ai: i, rotulo: rotuloItem(a[i], k, forma) }); });
    } else {
      Object.keys(b).forEach(function (k) {
        itens.push(!Object.prototype.hasOwnProperty.call(a, k) ? { chave: k, situacao: 'novo', rotulo: rotuloItem(b[k], k, forma) }
          : { chave: k, situacao: iguais(a[k], b[k]) ? 'igual' : 'alterado', rotulo: rotuloItem(b[k], k, forma) });
      });
      Object.keys(a).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(b, k)) itens.push({ chave: k, situacao: 'removido', rotulo: rotuloItem(a[k], k, forma) }); });
    }
    return itens;
  }
  // Compara dois conjuntos de dados. Cada bloco: novo, removido, igual ou alterado; quando é lista ou
  // mapa nos dois lados, o alterado traz os itens (novo, alterado, removido, igual).
  function compararDados(atual, novo) {
    var porNome = {}; atual.forEach(function (c) { porNome[c.nome] = c; });
    var noNovo = {}, blocos = [];
    novo.forEach(function (n) {
      noNovo[n.nome] = true;
      var a = porNome[n.nome];
      if (!a) { blocos.push({ nome: n.nome, situacao: 'novo' }); return; }
      if (a.tipo !== n.tipo || n.tipo === 'fonte') {
        blocos.push({ nome: n.nome, situacao: iguais(a, n) ? 'igual' : 'alterado', inteiro: true }); return;
      }
      var fa = formaDe(a.valor), fb = formaDe(n.valor);
      if (fa === fb && fb !== 'valor') {
        var itens = compararColecao(a.valor, n.valor);
        var mudou = itens.some(function (x) { return x.situacao !== 'igual'; }) || !iguais(a.valor, n.valor);
        blocos.push({ nome: n.nome, situacao: mudou ? 'alterado' : 'igual', forma: fb, itens: itens });
      } else {
        blocos.push({ nome: n.nome, situacao: iguais(a.valor, n.valor) ? 'igual' : 'alterado', inteiro: true });
      }
    });
    atual.forEach(function (a) { if (!noNovo[a.nome]) blocos.push({ nome: a.nome, situacao: 'removido' }); });
    return blocos;
  }

  // Aplica a comparação escolhendo bloco a bloco e item a item. escolhas[nome] = false recusa o bloco
  // inteiro; escolhas[nome + '|' + chave] = false recusa um item. Sem escolha, aceita.
  function aplicarComparacao(atual, novo, blocos, escolhas) {
    escolhas = escolhas || {};
    function aceito(nome, chave) { var k = chave === undefined ? nome : nome + '|' + chave; return escolhas[k] !== false; }
    var porA = {}, porN = {};
    atual.forEach(function (c) { porA[c.nome] = c; });
    novo.forEach(function (c) { porN[c.nome] = c; });
    var res = [];
    blocos.forEach(function (b) {
      var a = porA[b.nome], n = porN[b.nome];
      if (b.situacao === 'novo') { if (aceito(b.nome)) res.push(clonar(n)); return; }
      if (b.situacao === 'removido') {
        if (aceito(b.nome)) return;
        var ordemA = atual.map(function (c) { return c.nome; }), idx = ordemA.indexOf(b.nome), pos = -1;
        for (var j = idx - 1; j >= 0 && pos < 0; j--) for (var r = 0; r < res.length; r++) if (res[r].nome === ordemA[j]) { pos = r; break; }
        res.splice(pos + 1, 0, clonar(a));
        return;
      }
      if (b.situacao === 'igual') { res.push(clonar(n)); return; }
      if (b.inteiro || !b.itens) { res.push(clonar(aceito(b.nome) ? n : a)); return; }
      if (!aceito(b.nome)) { res.push(clonar(a)); return; }
      res.push({ nome: b.nome, tipo: 'valor', valor: mesclarItens(a.valor, n.valor, b, aceito) });
    });
    return res;
  }
  function mesclarItens(va, vn, b, aceito) {
    if (b.forma === 'lista') {
      var out = [];
      b.itens.forEach(function (it) {
        if (it.situacao === 'removido') return;
        var item;
        if (it.situacao === 'novo') { if (!aceito(b.nome, it.chave)) return; item = vn[it.ni]; }
        else if (it.situacao === 'alterado') item = aceito(b.nome, it.chave) ? vn[it.ni] : va[it.ai];
        else item = vn[it.ni];
        out.push({ v: clonar(item), ai: it.ai });
      });
      b.itens.forEach(function (it) {
        if (it.situacao !== 'removido' || aceito(b.nome, it.chave)) return;
        var pos = -1;
        for (var j = it.ai - 1; j >= 0 && pos < 0; j--) for (var r = 0; r < out.length; r++) if (out[r].ai === j) { pos = r; break; }
        out.splice(pos + 1, 0, { v: clonar(va[it.ai]), ai: it.ai });
      });
      return out.map(function (x) { return x.v; });
    }
    var chaves = [], obj = {};
    b.itens.forEach(function (it) {
      if (it.situacao === 'removido') return;
      if (it.situacao === 'novo' && !aceito(b.nome, it.chave)) return;
      chaves.push(it.chave);
      obj[it.chave] = clonar(it.situacao === 'alterado' && !aceito(b.nome, it.chave) ? va[it.chave] : vn[it.chave]);
    });
    var ordemA = Object.keys(va);
    b.itens.forEach(function (it) {
      if (it.situacao !== 'removido' || aceito(b.nome, it.chave)) return;
      var idx = ordemA.indexOf(it.chave), pos = -1;
      for (var j = idx - 1; j >= 0 && pos < 0; j--) pos = chaves.indexOf(ordemA[j]);
      chaves.splice(pos + 1, 0, it.chave);
      obj[it.chave] = clonar(va[it.chave]);
    });
    var final = {};
    chaves.forEach(function (k) { final[k] = obj[k]; });
    return final;
  }

  // Resumo legível das diferenças, usado na descrição da publicação e no status do editor.
  function resumoMudancas(publicado, rascunho) {
    var blocos = compararDados(publicado.dados || [], rascunho.dados || []);
    var molduraMudou = String(publicado.moldura || '') !== String(rascunho.moldura || '');
    var partes = [], total = 0;
    blocos.forEach(function (b) {
      if (b.situacao === 'igual') return;
      var nome = nomeAmigavel(b.nome);
      if (b.situacao === 'novo') { partes.push(nome + ': bloco novo'); total++; return; }
      if (b.situacao === 'removido') { partes.push(nome + ': bloco removido'); total++; return; }
      if (!b.itens) { partes.push(nome + ': atualizado'); total++; return; }
      var grupos = { novo: [], alterado: [], removido: [] };
      b.itens.forEach(function (it) { if (grupos[it.situacao]) grupos[it.situacao].push(it.rotulo); });
      var trechos = [];
      [['novo', 'inclui'], ['alterado', 'atualiza'], ['removido', 'remove']].forEach(function (g) {
        var l = grupos[g[0]];
        if (!l.length) return;
        total += l.length;
        trechos.push(g[1] + ' ' + (l.length <= 3 ? l.map(function (t) { return '"' + t.slice(0, 60) + '"'; }).join(', ') : l.length + ' itens'));
      });
      if (!trechos.length) { trechos.push('reordena itens'); total++; }
      partes.push(nome + ': ' + trechos.join(', '));
    });
    if (molduraMudou) { partes.push('Estrutura visual e código atualizados'); total++; }
    if ((publicado.titulo || '') !== (rascunho.titulo || '') && publicado.versao) total++;
    if (!publicado.versao) return { blocos: blocos, molduraMudou: molduraMudou, total: Math.max(total, 1), descricao: 'Primeira publicação do documento de processos' };
    return { blocos: blocos, molduraMudou: molduraMudou, total: total, descricao: partes.join('. ') };
  }

  function valorDe(dados, nome) {
    for (var i = 0; i < dados.length; i++) if (dados[i].nome === nome && dados[i].tipo === 'valor') return dados[i].valor;
    return undefined;
  }
  // Lista os problemas de referência: "Fluxo Designação usa o modelo guia_x, que não existe."
  function verificarReferencias(dados) {
    var problemas = [];
    REFERENCIAS.forEach(function (r) {
      var passos = r.de.split('.'), raizNome = passos[0].replace('[]', '');
      var raiz = valorDe(dados, raizNome);
      var alvoPartes = r.para.split('.'), alvo = valorDe(dados, alvoPartes[0]);
      if (raiz === undefined || alvo === undefined) return;
      var existe = {};
      if (alvoPartes[1]) (Array.isArray(alvo) ? alvo : []).forEach(function (x) { if (x && x[alvoPartes[1]] !== undefined) existe[String(x[alvoPartes[1]])] = true; });
      else if (alvo && typeof alvo === 'object') Object.keys(alvo).forEach(function (k) { existe[k] = true; });
      var tops = passos[0].indexOf('[]') >= 0 ? (Array.isArray(raiz) ? raiz : []) : [raiz];
      tops.forEach(function (top) {
        var atuais = [top];
        passos.slice(1).forEach(function (p) {
          var lista = p.slice(-2) === '[]', campo = lista ? p.slice(0, -2) : p, prox = [];
          atuais.forEach(function (a) {
            var v = a && typeof a === 'object' ? a[campo] : undefined;
            if (v === undefined || v === null) return;
            if (lista) { if (Array.isArray(v)) v.forEach(function (x) { prox.push(x); }); } else prox.push(v);
          });
          atuais = prox;
        });
        atuais.forEach(function (v) {
          if (v === '' || v === null || v === undefined) return;
          if (!existe[String(v)]) problemas.push((SINGULAR[raizNome] || 'O item de ' + nomeAmigavel(raizNome)) + ' "' + rotuloItem(top, '', 'lista') + '" usa ' + r.oQue + ' ' + String(v) + ', que não existe.');
        });
      });
    });
    return problemas;
  }

  var Nucleo = {
    MARCADOR: MARCADOR, esc: esc, normalizar: normalizar, extrairDocumento: extrairDocumento, montarHtml: montarHtml,
    montarBlocoDados: montarBlocoDados, chaveItem: chaveItem, chavesLista: chavesLista, rotuloItem: rotuloItem,
    compararDados: compararDados, aplicarComparacao: aplicarComparacao, resumoMudancas: resumoMudancas, nomeAmigavel: nomeAmigavel,
    verificarReferencias: verificarReferencias,
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Nucleo; return; }
  global.ProcessosNucleo = Nucleo;

  // ======================================================================
  // Avaliação e validação em iframe isolado (navegador)
  // ======================================================================
  function iframeIsolado(srcdoc, aoMensagem, limiteMs) {
    return new Promise(function (ok, falha) {
      var f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:800px;border:0;visibility:hidden';
      var feito = false;
      function fim(erro, valor) {
        if (feito) return; feito = true;
        window.removeEventListener('message', ouvir); clearTimeout(t); f.remove();
        if (erro) falha(erro); else ok(valor);
      }
      function ouvir(ev) { if (ev.source === f.contentWindow) aoMensagem(ev.data || {}, fim, f); }
      window.addEventListener('message', ouvir);
      var t = setTimeout(function () { aoMensagem({ tipo: 'tempo' }, fim, f); }, limiteMs);
      f.srcdoc = srcdoc;
      document.body.appendChild(f);
    });
  }
  // Lê os valores da região de dados executando o próprio documento num iframe isolado, no mesmo
  // contexto em que ele roda de verdade: com o corpo do HTML presente e com as funções do script já
  // içadas (hoisting), porque constantes de dados podem chamar funções declaradas mais abaixo ou ler
  // atributos do DOM. A coleta acontece logo depois da última constante de dados, antes do restante
  // do motor rodar, para guardar os valores originais e não versões já alteradas pelo motor; em
  // seguida o script é interrompido por um sinal próprio. Qualquer erro dentro da região vira uma
  // mensagem que diz qual constante falhou, em vez de esperar o limite de tempo.
  var SINAL_FIM = '__proc_fim_coleta__';
  function nomeNaLinha(ext, linhaRegiao) {
    var nome = '';
    ext.declaracoes.forEach(function (dc) { if (typeof dc.linha === 'number' && dc.linha <= linhaRegiao) nome = dc.nome; });
    return nome;
  }
  function avaliarDados(ext) {
    var nomes = ext.declaracoes.map(function (d) { return d.nome; });
    var coletor = '<script>(function(){var env=function(m){try{parent.postMessage(m,"*")}catch(e){}};' +
      'window.addEventListener("error",function(e){var m=String(e.message||e);if(m.indexOf(' + JSON.stringify(SINAL_FIM) + ')>=0){e.preventDefault();return}' +
      'env({tipo:"aval",erro:m,linha:e.lineno||0})},true);' +
      // Sem eval (a CSP herdada não libera): cada nome vira uma leitura direta, resolvida na hora da chamada.
      'window.__procColetar=function(){var r={},g=function(n,f){try{var v=f();r[n]=typeof v==="function"?{fn:1}:' +
      '{v:JSON.parse(JSON.stringify(v===undefined?null:v))}}catch(e){r[n]={erro:String(e&&e.message||e)}}};' +
      nomes.map(function (n) { return 'g(' + JSON.stringify(n) + ',function(){return ' + n + '})'; }).join(';') +
      ';env({tipo:"aval",r:r})};})();<\/script>';
    var moldura = String(ext.moldura || '');
    var partes = moldura.split(MARCADOR);
    if (partes.length !== 2) return Promise.reject(new Error('O arquivo não tem um bloco de dados reconhecível.'));
    var antes = partes[0] + '\n';
    var src = antes + ext.regiao + '\n;window.__procColetar();throw ' + JSON.stringify(SINAL_FIM) + ';\n' + partes[1];
    var h = /<head[^>]*>/i.exec(src);
    src = h ? src.slice(0, h.index + h[0].length) + coletor + src.slice(h.index + h[0].length) : coletor + src;
    // Linha do srcdoc em que a região começa, para traduzir o lineno do erro em constante.
    var cabeca = h ? src.slice(0, src.indexOf(ext.regiao, h.index)) : src.slice(0, src.indexOf(ext.regiao));
    var linhaInicio = cabeca.split('\n').length;
    var erros = [], espera = null;
    function descreverErro(e) {
      var rel = e.linha ? e.linha - linhaInicio : -1;
      var nome = rel >= 0 ? nomeNaLinha(ext, rel) : '';
      return nome ? 'Erro ao ler ' + nome + ' (linha ' + (rel + 1) + ' do bloco de dados): ' + e.erro
        : 'Erro ao executar o arquivo antes dos dados: ' + e.erro;
    }
    return iframeIsolado(src, function (d, fim) {
      if (d.tipo === 'tempo') {
        clearTimeout(espera);
        fim(new Error(erros.length ? descreverErro(erros[0]) : 'O arquivo não terminou de carregar os dados em 15 segundos. Confira se ele abre normalmente no navegador.'));
        return;
      }
      if (d.tipo !== 'aval') return;
      if (d.erro) {
        erros.push(d);
        // Erro dentro da região impede a coleta; se o resultado não chegar logo, a falha é real.
        if (!espera) espera = setTimeout(function () { fim(new Error(descreverErro(erros[0]))); }, 1500);
        return;
      }
      clearTimeout(espera);
      var dados = [];
      for (var i = 0; i < ext.declaracoes.length; i++) {
        var dc = ext.declaracoes[i], x = d.r[dc.nome];
        if (!x || x.erro) { fim(new Error('Não foi possível ler ' + dc.nome + (x && x.erro ? ': ' + x.erro : '.'))); return; }
        dados.push(x.fn ? { nome: dc.nome, tipo: 'fonte', fonte: dc.fonte } : { nome: dc.nome, tipo: 'valor', valor: x.v });
      }
      fim(null, dados);
    }, 15000);
  }
  // Abre o documento montado e coleta erros de execução nos primeiros instantes.
  // Depois de carregar, clica em cada aba do documento para exercitar as telas que só se desenham sob
  // demanda, e junta os problemas de referência entre coleções.
  function validarDocumento(doc) {
    var erros = verificarReferencias(doc.dados || []).slice();
    return iframeIsolado(montarHtml(doc), function (d, fim, frame) {
      if (d.tipo === 'proc-erro') erros.push(d.msg);
      if (d.tipo === 'proc-ok') frame.contentWindow.postMessage({ tipo: 'proc-percorrer' }, '*');
      if (d.tipo === 'proc-percorrido' || d.tipo === 'tempo') fim(null, erros);
    }, 12000);
  }
  // Lê um arquivo HTML inteiro e devolve o documento pronto para rascunho.
  function lerArquivoHtml(html) {
    var ext = extrairDocumento(html);
    if (ext.modo === 'inteiro') return Promise.resolve({ modo: 'inteiro', titulo: ext.titulo, moldura: ext.moldura, dados: [] });
    return avaliarDados(ext).then(function (dados) {
      var meta = dados.filter(function (c) { return c.nome === 'META' && c.tipo === 'valor'; })[0];
      var titulo = (meta && meta.valor && meta.valor.titulo) || ext.titulo;
      return { modo: 'dados', titulo: titulo, moldura: ext.moldura, dados: dados };
    });
  }

  // ======================================================================
  // Interface
  // ======================================================================
  var CFG = global.PROCESSOS_CFG || { podeEditar: false };
  var publicado = null;   // { titulo, moldura, dados, versao, atualizadoEm, atualizadoPor }
  var rascunho = null;    // { titulo, moldura, dados }
  var desfazer = [];      // pilha de rascunhos anteriores (texto JSON)
  var modo = 'ler';       // ler | editar | versao
  var versaoVista = null;
  var filtroEditor = '';
  var abertos = {};       // blocos expandidos no editor

  function $(id) { return document.getElementById(id); }
  function fmtData(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function nomeDoEmail(e) { return e ? String(e).split('@')[0].replace(/[._]/g, ' ') : ''; }
  function fetchJSON(url, opts) {
    return fetch(url, Object.assign({ cache: 'no-store' }, opts || {})).then(function (r) {
      if (r.status === 401) { location.href = '/login'; return new Promise(function () {}); }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || ('Erro ' + r.status)); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function aviso(msg, tipo) {
    var a = $('prAviso');
    a.textContent = msg; a.className = 'pr-aviso ativo ' + (tipo || '');
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { a.className = 'pr-aviso'; }, 4500);
  }
  function salvarLocal() {
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ versaoBase: publicado.versao, rascunho: rascunho })); } catch (e) { /* sem armazenamento */ }
  }
  function lerLocal() { try { var s = localStorage.getItem(CHAVE_RASCUNHO); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function limparLocal() { try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (e) { /* nada */ } }
  function temDados(d) { return d && d.dados && d.dados.length > 0; }

  // ---------------- documento visível ----------------
  function docVisivel() {
    if (modo === 'versao' && versaoVista) return versaoVista;
    if (modo === 'editar' && rascunho) return rascunho;
    return publicado;
  }
  // ?item=colecao:id (links do Vitorio): a rota interna do item vem do índice do Vitorio, que já conhece a estrutura dos dados.
  // Roda uma vez, depois que o documento carrega no iframe.
  var itemPedido = CFG.item || '';
  function abrirItemPedido() {
    if (!itemPedido || modo !== 'ler') return;
    var chave = itemPedido; itemPedido = '';
    $('prDoc').addEventListener('load', function irAoItem() {
      $('prDoc').removeEventListener('load', irAoItem);
      fetchJSON('/api/vitorio/indice').then(function (p) {
        var doc = (p.documentos || []).filter(function (x) { return x.chave === chave; })[0];
        if (doc && doc.alvo) setTimeout(function () { $('prDoc').contentWindow.postMessage({ tipo: 'proc-ir', alvo: doc.alvo }, '*'); }, 600);
      }).catch(function () { /* sem o índice o documento abre na página inicial */ });
    });
  }
  function pintarDocumento() {
    var d = docVisivel();
    abrirItemPedido();
    $('prDoc').srcdoc = d && d.moldura ? montarHtml(d) : '<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;color:#9F9F9F;display:flex;align-items:center;justify-content:center;height:90vh">Nenhum conteúdo no rascunho ainda.</body>';
  }

  function renderTopo() {
    var d = publicado;
    $('prTitulo').textContent = (modo === 'versao' && versaoVista) ? 'Versão ' + versaoVista.versao + ' em pré-visualização' : (d && d.titulo) || 'Processos de CS';
    var meta = '';
    if (modo === 'editar') meta = 'Modo de edição. O time continua vendo a versão publicada até você publicar.';
    else if (modo === 'versao') meta = 'Versão antiga. Nada muda até você restaurá-la.';
    else if (d && d.versao) meta = 'Versão ' + d.versao + ', publicada em ' + fmtData(d.atualizadoEm) + (d.atualizadoPor ? ' por ' + nomeDoEmail(d.atualizadoPor) : '');
    $('prMeta').textContent = meta;
    var acoes = '';
    if (CFG.podeEditar && modo === 'ler' && d && d.versao) acoes = '<button type="button" class="pr-btn pr-btn-ouro" data-acao="editar" data-tour="editar-processos">Editar processos</button>';
    if (modo === 'versao') acoes = '<button type="button" class="pr-btn" data-acao="sair-versao">Voltar</button><button type="button" class="pr-btn pr-btn-ouro" data-acao="restaurar">Restaurar esta versão</button>';
    $('prAcoesTopo').innerHTML = acoes;
    document.body.setAttribute('data-modo', modo);
  }
  function renderTudo() {
    renderTopo();
    var vazio = !publicado || !publicado.versao;
    var mostrarVazio = vazio && modo === 'ler';
    $('prVazio').hidden = !mostrarVazio;
    $('prLeitor').hidden = mostrarVazio;
    if (mostrarVazio) {
      $('prVazio').innerHTML = '<h2>Os processos ainda não foram publicados</h2>' +
        (CFG.podeEditar
          ? '<p>Importe o HTML de processos da área. O arquivo é lido, os blocos de dados são separados para edição item a item e você confere tudo antes de publicar.</p><button type="button" class="pr-btn pr-btn-ouro" data-acao="importar-inicial">Importar HTML de processos</button>'
          : '<p>Assim que a liderança publicar o documento, ele aparece aqui.</p>');
    }
    $('prEditor').hidden = modo !== 'editar';
    if (modo === 'editar') renderEditor();
    if (!mostrarVazio) pintarDocumento();
  }

  // ---------------- editor ----------------
  function iniciarEdicao(semRecuperar) {
    var salvo = semRecuperar ? null : lerLocal();
    if (salvo && salvo.rascunho && salvo.versaoBase === publicado.versao) { rascunho = salvo.rascunho; aviso('Rascunho não publicado recuperado deste navegador.', 'ok'); }
    else {
      if (salvo) limparLocal();
      rascunho = { titulo: publicado.titulo, moldura: publicado.moldura, dados: clonar(publicado.dados || []) };
    }
    desfazer = [];
    modo = 'editar';
    renderTudo();
  }
  function registrarDesfazer() {
    desfazer.push(JSON.stringify(rascunho));
    if (desfazer.length > 15) desfazer.shift();
  }
  function mudouRascunho() { salvarLocal(); renderEditor(); pintarDocumento(); }

  var ROT_SIT = { novo: 'Novo', alterado: 'Alterado', removido: 'Removido' };
  function renderEditor() {
    var r = resumoMudancas({ dados: publicado.dados || [], moldura: publicado.moldura, titulo: publicado.titulo, versao: publicado.versao }, rascunho);
    $('prEdStatus').textContent = r.total === 0 ? 'Nenhuma alteração em relação à versão publicada.' : r.total + (r.total === 1 ? ' alteração ainda não publicada.' : ' alterações ainda não publicadas.');
    $('prEdPublicar').disabled = r.total === 0 || !rascunho.moldura;
    $('prEdDesfazer').disabled = !desfazer.length;
    $('prEdDescartar').disabled = r.total === 0;
    var refs = temDados(rascunho) ? verificarReferencias(rascunho.dados) : [];
    $('prEdRefs').hidden = !refs.length;
    $('prEdRefs').innerHTML = refs.length ? '<b>' + refs.length + (refs.length === 1 ? ' referência quebrada' : ' referências quebradas') + '.</b> Publicar fica bloqueado até corrigir: ' +
      refs.slice(0, 4).map(esc).join(' ') + (refs.length > 4 ? ' E mais ' + (refs.length - 4) + '.' : '') : '';
    var lista = $('prEdLista');
    if (!rascunho.moldura) { lista.innerHTML = '<p class="pr-ajuda">Comece importando o HTML de processos.</p>'; return; }
    if (!temDados(rascunho)) {
      lista.innerHTML = '<p class="pr-ajuda">Este arquivo não tem blocos de dados separáveis, então é tratado inteiro. Para alterar, importe a versão atualizada do HTML.</p>';
      return;
    }
    var porBloco = {}; r.blocos.forEach(function (b) { porBloco[b.nome] = b; });
    var f = normalizar(filtroEditor);
    var visiveis = rascunho.dados.filter(function (c) { return c.tipo === 'valor'; });
    var ordenados = visiveis.slice().sort(function (a, b) {
      var ia = PRINCIPAIS.indexOf(a.nome), ib = PRINCIPAIS.indexOf(b.nome);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    var html = '';
    var outros = '';
    ordenados.forEach(function (c) {
      var comp = porBloco[c.nome] || { situacao: 'igual' };
      var forma = formaDe(c.valor);
      var bloco = blocoHtml(c, forma, comp, f);
      if (bloco === null) return;
      if (PRINCIPAIS.indexOf(c.nome) >= 0) html += bloco; else outros += bloco;
    });
    if (outros) html += '<div class="pr-ed-grupo">Configurações do documento</div>' + outros;
    lista.innerHTML = html || '<p class="pr-ajuda">Nenhum item encontrado para "' + esc(filtroEditor) + '".</p>';
  }
  function blocoHtml(c, forma, comp, f) {
    var tagBloco = comp.situacao !== 'igual' && publicado.versao ? '<span class="pr-ed-tag ' + comp.situacao + '">' + (comp.situacao === 'novo' ? 'Novo' : 'Alterado') + '</span>' : '';
    var sitItem = {};
    (comp.itens || []).forEach(function (it) { sitItem[it.chave] = it; });
    var cab = '<summary><span class="pr-ed-bloco-nome">' + esc(nomeAmigavel(c.nome)) + '</span>';
    if (forma === 'valor') {
      var texto = rotuloItem(c.valor, c.nome, 'valor');
      if (f && normalizar(nomeAmigavel(c.nome) + ' ' + texto).indexOf(f) < 0) return null;
      return '<div class="pr-ed-bloco simples"><div class="pr-ed-item"><span class="pr-ed-tit"><b>' + esc(nomeAmigavel(c.nome)) + '</b> ' + esc(texto.slice(0, 80)) + '</span>' + tagBloco +
        '<span class="pr-ed-ctrl"><button type="button" class="pr-ico" data-acao="editar-item" data-bloco="' + esc(c.nome) + '" title="Editar" aria-label="Editar">&#9998;</button></span></div></div>';
    }
    var itens = forma === 'lista'
      ? c.valor.map(function (v, i) { return { v: v, ref: String(i) }; })
      : Object.keys(c.valor).map(function (k) { return { v: c.valor[k], ref: k }; });
    var chaves = forma === 'lista' ? chavesLista(c.valor) : itens.map(function (x) { return x.ref; });
    var linhas = itens.map(function (x, i) {
      var rot = rotuloItem(x.v, chaves[i], forma);
      if (f && normalizar(rot + ' ' + (typeof x.v === 'string' ? semTags(x.v).slice(0, 400) : JSON.stringify(x.v).slice(0, 600))).indexOf(f) < 0) return '';
      var s = sitItem[chaves[i]];
      var tag = s && publicado.versao && ROT_SIT[s.situacao] && s.situacao !== 'removido' ? '<span class="pr-ed-tag ' + s.situacao + '">' + ROT_SIT[s.situacao] + '</span>' : '';
      return '<li class="pr-ed-item"><span class="pr-ed-tit">' + esc(rot) + '</span>' + tag +
        '<span class="pr-ed-ctrl">' +
        (forma === 'lista' ? '<button type="button" class="pr-ico" data-acao="mover" data-dir="-1" data-bloco="' + esc(c.nome) + '" data-ref="' + esc(x.ref) + '" title="Mover para cima" aria-label="Mover para cima">&#8593;</button>' +
          '<button type="button" class="pr-ico" data-acao="mover" data-dir="1" data-bloco="' + esc(c.nome) + '" data-ref="' + esc(x.ref) + '" title="Mover para baixo" aria-label="Mover para baixo">&#8595;</button>' : '') +
        '<button type="button" class="pr-ico" data-acao="editar-item" data-bloco="' + esc(c.nome) + '" data-ref="' + esc(x.ref) + '" title="Editar" aria-label="Editar">&#9998;</button>' +
        '<button type="button" class="pr-ico perigo" data-acao="remover-item" data-bloco="' + esc(c.nome) + '" data-ref="' + esc(x.ref) + '" title="Remover" aria-label="Remover">&#10005;</button>' +
        '</span></li>';
    }).join('');
    var removidos = (comp.itens || []).filter(function (it) { return it.situacao === 'removido'; }).map(function (it) {
      return '<li class="pr-ed-item removida"><span class="pr-ed-tit">' + esc(it.rotulo) + '</span><span class="pr-ed-tag rem">Removido</span>' +
        '<button type="button" class="pr-link" data-acao="restaurar-item" data-bloco="' + esc(c.nome) + '" data-chave="' + esc(it.chave) + '">Restaurar</button></li>';
    }).join('');
    if (f && !linhas && !removidos && normalizar(nomeAmigavel(c.nome)).indexOf(f) < 0) return null;
    var aberto = abertos[c.nome] || !!f;
    var n = itens.length;
    return '<details class="pr-ed-bloco" data-bloco="' + esc(c.nome) + '"' + (aberto ? ' open' : '') + '>' + cab +
      '<span class="pr-ed-bloco-n">' + n + (n === 1 ? ' item' : ' itens') + '</span>' + tagBloco + '</summary>' +
      '<ol class="pr-ed-itens">' + linhas + removidos + '</ol>' +
      '<button type="button" class="pr-ed-mais" data-acao="inserir-item" data-bloco="' + esc(c.nome) + '">+ inserir item</button></details>';
  }
  function constante(nome) { for (var i = 0; i < rascunho.dados.length; i++) if (rascunho.dados[i].nome === nome) return rascunho.dados[i]; return null; }

  function moverItem(nome, ref, dir) {
    var c = constante(nome), i = Number(ref), j = i + dir;
    if (!c || j < 0 || j >= c.valor.length) return;
    registrarDesfazer();
    var t = c.valor[i]; c.valor[i] = c.valor[j]; c.valor[j] = t;
    mudouRascunho();
  }
  function removerItem(nome, ref) {
    var c = constante(nome); if (!c) return;
    registrarDesfazer();
    if (Array.isArray(c.valor)) c.valor.splice(Number(ref), 1); else delete c.valor[ref];
    mudouRascunho();
    aviso('Item removido do rascunho. Use Desfazer se foi engano.', 'ok');
  }
  function restaurarItem(nome, chave) {
    var c = constante(nome), p = (publicado.dados || []).filter(function (x) { return x.nome === nome; })[0];
    if (!c || !p) return;
    registrarDesfazer();
    if (Array.isArray(c.valor)) {
      var kp = chavesLista(p.valor), idx = kp.indexOf(chave);
      if (idx < 0) return;
      var kr = chavesLista(c.valor), pos = -1;
      for (var j = idx - 1; j >= 0 && pos < 0; j--) pos = kr.indexOf(kp[j]);
      c.valor.splice(pos + 1, 0, clonar(p.valor[idx]));
    } else {
      c.valor[chave] = clonar(p.valor[chave]);
    }
    mudouRascunho();
  }

  // ---------------- formulário genérico de item ----------------
  function modelo(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = modelo(v[k]); }); return o; }
    if (typeof v === 'boolean') return false;
    if (typeof v === 'number') return 0;
    return '';
  }
  function campoHtml(k, v, i) {
    var id = 'prCampo' + i, rot = '<span>' + esc(CAMPOS_AMIGAVEIS[k] || k) + (CAMPOS_AMIGAVEIS[k] ? ' <em>' + esc(k) + '</em>' : '') + '</span>';
    if (typeof v === 'boolean') return '<label class="pr-check" data-campo="' + esc(k) + '" data-tipo="bool"><input id="' + id + '" type="checkbox"' + (v ? ' checked' : '') + '> ' + esc(CAMPOS_AMIGAVEIS[k] || k) + '</label>';
    if (typeof v === 'number') return '<label class="pr-campo" data-campo="' + esc(k) + '" data-tipo="num">' + rot + '<input id="' + id + '" type="number" step="any" value="' + esc(v) + '"></label>';
    if (typeof v === 'string') {
      var longo = v.length > 90 || /\n|</.test(v);
      return '<label class="pr-campo" data-campo="' + esc(k) + '" data-tipo="str">' + rot + (longo
        ? '<textarea id="' + id + '" rows="' + Math.min(14, Math.max(3, Math.ceil(v.length / 90))) + '"' + (/</.test(v) ? ' class="mono"' : '') + '>' + esc(v) + '</textarea>'
        : '<input id="' + id + '" type="text" value="' + esc(v) + '">') + '</label>';
    }
    return '<label class="pr-campo" data-campo="' + esc(k) + '" data-tipo="json">' + '<span>' + esc(CAMPOS_AMIGAVEIS[k] || k) + ' <em>' + (Array.isArray(v) ? 'lista' : 'estrutura') + ' em JSON</em></span>' +
      '<textarea id="' + id + '" class="mono" rows="' + Math.min(16, Math.max(3, JSON.stringify(v, null, 2).split('\n').length)) + '">' + esc(JSON.stringify(v, null, 2)) + '</textarea></label>';
  }
  function formHtml(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.keys(v).map(function (k, i) { return campoHtml(k, v[k], i); }).join('');
    return campoHtml('valor', v, 0);
  }
  function lerForm(raiz, base) {
    var objeto = base && typeof base === 'object' && !Array.isArray(base);
    var out = objeto ? {} : null;
    var erro = null;
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-campo]'), function (el) {
      var k = el.getAttribute('data-campo'), t = el.getAttribute('data-tipo'), inp = el.querySelector('input,textarea'), v;
      if (t === 'bool') v = inp.checked;
      else if (t === 'num') v = inp.value === '' ? 0 : Number(inp.value);
      else if (t === 'str') v = inp.value;
      else { try { v = JSON.parse(inp.value); } catch (e) { erro = 'O campo ' + k + ' não é um JSON válido.'; } }
      if (objeto) out[k] = v; else out = v;
    });
    // Campo booleano desmarcado em item que não tinha a chave: não cria a chave à toa.
    if (objeto) Object.keys(out).forEach(function (k) { if (out[k] === false && base[k] === undefined) delete out[k]; });
    return { valor: out, erro: erro };
  }
  function dialogoItem(nome, ref, inserir) {
    var c = constante(nome); if (!c) return;
    var forma = formaDe(c.valor);
    var atual;
    if (forma === 'valor') atual = c.valor;
    else if (inserir) {
      var amostra = forma === 'lista' ? c.valor[0] : c.valor[Object.keys(c.valor)[0]];
      atual = amostra === undefined ? '' : modelo(amostra);
    } else atual = forma === 'lista' ? c.valor[Number(ref)] : c.valor[ref];
    var titulo = (inserir ? 'Inserir em ' : 'Editar em ') + nomeAmigavel(nome);
    var chaveCampo = forma === 'mapa' ? '<label class="pr-campo"><span>Chave do item</span><input id="prItemChave" type="text" value="' + esc(inserir ? '' : ref) + '"' + (inserir ? ' autofocus' : '') + ' spellcheck="false"></label>' : '';
    var posCampo = forma === 'lista' && inserir ? '<label class="pr-campo"><span>Posição</span><select id="prItemPos"><option value="fim">No final</option>' +
      c.valor.map(function (v, i) { return '<option value="' + i + '">Antes de ' + esc(rotuloItem(v, chavesLista(c.valor)[i], 'lista').slice(0, 60)) + '</option>'; }).join('') + '</select></label>' : '';
    abrirDialogo(titulo,
      chaveCampo + posCampo +
      '<div class="pr-ed-alterna"><button type="button" class="pr-link" id="prModoForm" aria-pressed="true">Formulário</button><button type="button" class="pr-link" id="prModoJson" aria-pressed="false">JSON completo</button></div>' +
      '<div id="prItemForm">' + formHtml(atual) + '</div>' +
      '<label class="pr-campo" id="prItemJsonWrap" hidden><span>Item em JSON</span><textarea id="prItemJson" class="mono" rows="18" spellcheck="false">' + esc(JSON.stringify(atual, null, 2)) + '</textarea></label>' +
      '<p class="pr-ajuda">Campos de texto aceitam HTML quando o documento usa HTML naquele campo. Estruturas aparecem em JSON; use JSON completo para criar campos novos.</p>' +
      '<p class="pr-erro" id="prDlgErro" hidden></p>',
      [{ rotulo: 'Cancelar', acao: fecharDialogo }, { rotulo: inserir ? 'Inserir no rascunho' : 'Aplicar ao rascunho', classe: 'pr-btn-ouro', acao: function () {
        var valor;
        if (!$('prItemJsonWrap').hidden) {
          try { valor = JSON.parse($('prItemJson').value); } catch (e) { erroDialogo('O JSON do item não é válido: ' + e.message); return; }
        } else {
          var lido = lerForm($('prItemForm'), atual);
          if (lido.erro) { erroDialogo(lido.erro); return; }
          valor = lido.valor;
        }
        registrarDesfazer();
        if (forma === 'valor') c.valor = valor;
        else if (forma === 'mapa') {
          var k = $('prItemChave').value.trim();
          if (!k) { desfazer.pop(); erroDialogo('Informe a chave do item.'); return; }
          if (k !== ref && Object.prototype.hasOwnProperty.call(c.valor, k)) { desfazer.pop(); erroDialogo('Já existe um item com a chave ' + k + '.'); return; }
          var novo = {};
          Object.keys(c.valor).forEach(function (kk) { if (kk === ref && !inserir) novo[k] = valor; else novo[kk] = c.valor[kk]; });
          if (inserir) novo[k] = valor;
          c.valor = novo;
        } else {
          var teste = c.valor.slice();
          if (inserir) { var p = $('prItemPos').value; if (p === 'fim') teste.push(valor); else teste.splice(Number(p), 0, valor); }
          else teste[Number(ref)] = valor;
          var ks = teste.map(chaveItem).filter(function (k) { return k.charAt(0) !== '#'; }), vistos = {}, dup = null;
          ks.forEach(function (k) { if (vistos[k]) dup = k; vistos[k] = true; });
          if (dup) { desfazer.pop(); erroDialogo('Já existe outro item com ' + dup.replace(':', ' = ') + '.'); return; }
          c.valor = teste;
        }
        abertos[nome] = true;
        fecharDialogo(); mudouRascunho();
        aviso(inserir ? 'Item inserido no rascunho.' : 'Item atualizado no rascunho.', 'ok');
      } }]);
    $('prModoForm').onclick = function () {
      try { var v = JSON.parse($('prItemJson').value); $('prItemForm').innerHTML = formHtml(v); atual = v; } catch (e) { erroDialogo('Corrija o JSON antes de voltar ao formulário.'); return; }
      $('prItemForm').hidden = false; $('prItemJsonWrap').hidden = true; this.setAttribute('aria-pressed', 'true'); $('prModoJson').setAttribute('aria-pressed', 'false');
    };
    $('prModoJson').onclick = function () {
      var lido = lerForm($('prItemForm'), atual);
      if (lido.erro) { erroDialogo(lido.erro); return; }
      $('prItemJson').value = JSON.stringify(lido.valor, null, 2);
      $('prItemForm').hidden = true; $('prItemJsonWrap').hidden = false; this.setAttribute('aria-pressed', 'true'); $('prModoForm').setAttribute('aria-pressed', 'false');
    };
  }

  // ---------------- diálogo genérico ----------------
  function abrirDialogo(titulo, corpoHtml, botoes) {
    $('prDlgTitulo').textContent = titulo;
    $('prDlgCorpo').innerHTML = corpoHtml;
    $('prDlgBotoes').innerHTML = botoes.map(function (b, k) {
      return '<button type="button" class="pr-btn ' + (b.classe || '') + '" data-dlg="' + k + '">' + esc(b.rotulo) + '</button>';
    }).join('');
    abrirDialogo.botoes = botoes;
    var d = $('prDlg');
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    var foco = d.querySelector('[autofocus]'); if (foco) foco.focus();
  }
  function fecharDialogo() { var d = $('prDlg'); if (d.close) d.close(); else d.removeAttribute('open'); }
  function erroDialogo(msg) { var e = $('prDlgErro'); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function lerArquivo(input) {
    return new Promise(function (ok, falha) {
      var f = input && input.files && input.files[0];
      if (!f) { ok(null); return; }
      if (f.size > 6e6) { falha(new Error('Arquivo acima de 6 MB.')); return; }
      var leitor = new FileReader();
      leitor.onload = function () { ok(String(leitor.result || '')); };
      leitor.onerror = function () { falha(new Error('Não foi possível ler o arquivo.')); };
      leitor.readAsText(f, 'utf-8');
    });
  }

  // ---------------- importar HTML atualizado ----------------
  var importacao = null;
  function dialogoImportar() {
    importacao = null;
    abrirDialogo('Importar HTML atualizado',
      '<p class="pr-ajuda">Escolha a versão nova do arquivo de processos. Ele é comparado com o rascunho atual item a item, e você decide o que entra. Nada chega ao time antes de publicar.</p>' +
      '<label class="pr-campo"><span>Arquivo .html</span><input id="prImpArquivo" type="file" accept=".html,.htm,text/html" autofocus></label>' +
      '<div id="prImpResultado"></div><p class="pr-erro" id="prDlgErro" hidden></p>',
      [{ rotulo: 'Cancelar', acao: fecharDialogo }, { rotulo: 'Aplicar ao rascunho', classe: 'pr-btn-ouro', acao: aplicarImportacao }]);
    $('prImpArquivo').addEventListener('change', processarImportacao);
  }
  function processarImportacao() {
    erroDialogo('');
    $('prImpResultado').innerHTML = '<p class="pr-ajuda">Lendo o arquivo…</p>';
    lerArquivo($('prImpArquivo')).then(function (txt) {
      if (txt === null) { $('prImpResultado').innerHTML = ''; importacao = null; return null; }
      return lerArquivoHtml(txt).then(function (novo) {
        var primeira = !rascunho.moldura;
        var estruturaMudou = temDados(novo) !== temDados(rascunho);
        var blocos = (primeira || estruturaMudou) ? [] : compararDados(rascunho.dados, novo.dados);
        var molduraMudou = novo.moldura !== rascunho.moldura;
        importacao = { novo: novo, blocos: blocos, primeira: primeira, estruturaMudou: estruturaMudou };
        var h = '';
        if (primeira) {
          var nItens = novo.dados.filter(function (c) { return c.tipo === 'valor'; }).reduce(function (s, c) { var f = formaDe(c.valor); return s + (f === 'lista' ? c.valor.length : f === 'mapa' ? Object.keys(c.valor).length : 1); }, 0);
          h = temDados(novo)
            ? '<div class="pr-imp-resumo">' + novo.dados.length + ' blocos de dados separados, com ' + nItens + ' itens editáveis.</div><ul class="pr-imp-lista">' +
              novo.dados.filter(function (c) { return c.tipo === 'valor'; }).map(function (c) { var f = formaDe(c.valor); return '<li>' + esc(nomeAmigavel(c.nome)) + (f === 'valor' ? '' : ' <span class="pr-hist-meta">' + (f === 'lista' ? c.valor.length : Object.keys(c.valor).length) + ' itens</span>') + '</li>'; }).join('') + '</ul>'
            : '<div class="pr-imp-resumo">O arquivo não tem blocos de dados separáveis e será guardado inteiro.</div>';
        } else if (estruturaMudou) {
          h = '<div class="pr-imp-resumo">A estrutura do arquivo mudou; o rascunho será substituído pelo arquivo novo inteiro.</div>';
        } else {
          var mudancas = blocos.filter(function (b) { return b.situacao !== 'igual'; });
          h = '<div class="pr-imp-resumo">' + (mudancas.length ? mudancas.length + (mudancas.length === 1 ? ' bloco com mudança.' : ' blocos com mudança.') : 'Nenhum dado mudou.') + ' Desmarque o que não deve entrar.</div>';
          h += mudancas.map(function (b) {
            var nome = nomeAmigavel(b.nome);
            if (b.situacao === 'novo' || b.situacao === 'removido' || !b.itens) {
              var rot = b.situacao === 'novo' ? 'Bloco novo' : b.situacao === 'removido' ? 'Bloco sai' : 'Bloco atualizado';
              return '<div class="pr-imp-bloco"><label><input type="checkbox" data-esc="' + esc(b.nome) + '" checked><b>' + esc(nome) + '</b> <span class="pr-ed-tag ' + (b.situacao === 'removido' ? 'rem' : b.situacao) + '">' + rot + '</span></label></div>';
            }
            var its = b.itens.filter(function (it) { return it.situacao !== 'igual'; });
            if (!its.length) return '<div class="pr-imp-bloco"><b>' + esc(nome) + '</b> <span class="pr-hist-meta">mesma lista em outra ordem; entra na ordem nova</span></div>';
            return '<div class="pr-imp-bloco"><b>' + esc(nome) + '</b><ul class="pr-imp-lista">' + its.map(function (it) {
              var rot = it.situacao === 'novo' ? 'Novo' : it.situacao === 'removido' ? 'Sai' : 'Alterado';
              return '<li><label><input type="checkbox" data-esc="' + esc(b.nome + '|' + it.chave) + '" checked><span class="pr-ed-tag ' + (it.situacao === 'removido' ? 'rem' : it.situacao) + '">' + rot + '</span> ' + esc(it.rotulo) + '</label></li>';
            }).join('') + '</ul></div>';
          }).join('');
          if (molduraMudou) h += '<label class="pr-check"><input type="checkbox" id="prImpMoldura" checked> Atualizar também a estrutura visual e o código do documento</label>';
          if (!mudancas.length && !molduraMudou) h += '<p class="pr-ajuda">O arquivo é igual ao rascunho.</p>';
        }
        $('prImpResultado').innerHTML = h;
      });
    }).catch(function (e) { $('prImpResultado').innerHTML = ''; importacao = null; erroDialogo(e.message); });
  }
  function aplicarImportacao() {
    if (!importacao) { erroDialogo('Escolha o arquivo HTML.'); return; }
    registrarDesfazer();
    var novo = importacao.novo;
    if (importacao.primeira || importacao.estruturaMudou) {
      rascunho = { titulo: novo.titulo, moldura: novo.moldura, dados: novo.dados };
    } else {
      var escolhas = {};
      Array.prototype.forEach.call(document.querySelectorAll('#prImpResultado [data-esc]'), function (c) { escolhas[c.getAttribute('data-esc')] = c.checked; });
      rascunho.dados = aplicarComparacao(rascunho.dados, novo.dados, importacao.blocos, escolhas);
      var m = $('prImpMoldura');
      if (m && m.checked) rascunho.moldura = novo.moldura;
      rascunho.titulo = novo.titulo || rascunho.titulo;
    }
    fecharDialogo(); mudouRascunho();
    aviso('Importação aplicada ao rascunho. Confira o documento e publique.', 'ok');
  }

  // ---------------- publicar, histórico, restaurar ----------------
  function dialogoPublicar() {
    var r = resumoMudancas({ dados: publicado.dados || [], moldura: publicado.moldura, titulo: publicado.titulo, versao: publicado.versao }, rascunho);
    abrirDialogo('Publicar processos',
      '<p class="pr-ajuda">Ao publicar, todo o time passa a ver esta versão. A anterior fica no histórico e pode ser restaurada.</p>' +
      '<div id="prPubValidacao" class="pr-validacao">Testando o documento antes de publicar…</div>' +
      '<label class="pr-campo"><span>O que mudou, para o histórico</span><textarea id="prPubDesc" rows="4" maxlength="300">' + esc((r.descricao || 'Primeira publicação').slice(0, 300)) + '</textarea></label>' +
      '<p class="pr-erro" id="prDlgErro" hidden></p>',
      [{ rotulo: 'Cancelar', acao: fecharDialogo }, { rotulo: 'Publicar agora', classe: 'pr-btn-ouro', acao: publicar }]);
    var botao = document.querySelector('#prDlgBotoes .pr-btn-ouro');
    botao.disabled = true;
    validarDocumento(rascunho).then(function (erros) {
      var v = $('prPubValidacao'); if (!v) return;
      if (erros.length) {
        v.className = 'pr-validacao erro';
        v.innerHTML = '<b>O documento não pode ser publicado assim.</b> ' + esc(erros.slice(0, 4).join(' ')) + (erros.length > 4 ? ' E mais ' + (erros.length - 4) + '.' : '');
      } else {
        v.className = 'pr-validacao ok';
        v.textContent = 'Documento testado: abre sem erros.';
        botao.disabled = false;
      }
    }).catch(function (e) { var v = $('prPubValidacao'); if (v) { v.className = 'pr-validacao erro'; v.textContent = 'Não foi possível testar o documento: ' + e.message; } });
  }
  function publicar() {
    var desc = $('prPubDesc').value.trim();
    if (!desc) { erroDialogo('Descreva o que mudou.'); return; }
    var botao = document.querySelector('#prDlgBotoes .pr-btn-ouro'); botao.disabled = true; botao.textContent = 'Publicando…';
    var corpo = { titulo: rascunho.titulo, moldura: rascunho.moldura, dados: rascunho.dados, descricao: desc, versaoBase: publicado.versao };
    fetchJSON('/api/processos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (res) {
        limparLocal(); fecharDialogo();
        return carregar().then(function () { modo = 'ler'; rascunho = null; desfazer = []; renderTudo(); aviso('Versão ' + res.versao + ' publicada.', 'ok'); });
      })
      .catch(function (e) { botao.disabled = false; botao.textContent = 'Publicar agora'; erroDialogo(e.message); });
  }
  function dialogoHistorico() {
    abrirDialogo('Histórico de versões', '<div id="prHist"><div class="pr-ajuda">Carregando…</div></div><p class="pr-erro" id="prDlgErro" hidden></p>', [{ rotulo: 'Fechar', acao: fecharDialogo }]);
    fetchJSON('/api/processos/versoes').then(function (d) {
      if (!d.versoes.length) { $('prHist').innerHTML = '<p class="pr-ajuda">Nenhuma versão publicada ainda.</p>'; return; }
      $('prHist').innerHTML = '<ol class="pr-hist">' + d.versoes.map(function (v) {
        var atual = v.versao === publicado.versao;
        return '<li><div class="pr-hist-cab"><b>Versão ' + v.versao + '</b>' + (atual ? '<span class="pr-ed-tag igual">Publicada</span>' : '') +
          '<span class="pr-hist-meta">' + fmtData(v.criadoEm) + (v.criadoPor ? ', ' + esc(nomeDoEmail(v.criadoPor)) : '') + '</span></div>' +
          '<div class="pr-hist-desc">' + esc(v.descricao) + '</div>' +
          (atual ? '' : '<button type="button" class="pr-link" data-acao="ver-versao" data-versao="' + v.versao + '">Pré-visualizar</button>') + '</li>';
      }).join('') + '</ol>';
    }).catch(function (e) { erroDialogo(e.message); });
  }
  function verVersao(n) {
    fetchJSON('/api/processos/versoes/' + n).then(function (v) { fecharDialogo(); versaoVista = v; modo = 'versao'; renderTudo(); })
      .catch(function (e) { erroDialogo(e.message); });
  }
  function restaurarVersao() {
    var n = versaoVista.versao;
    abrirDialogo('Restaurar a versão ' + n,
      '<p class="pr-ajuda">A versão ' + n + ' volta a ser a publicada, registrada como uma versão nova. A atual continua no histórico.' + (rascunho ? ' O rascunho não publicado será descartado.' : '') + '</p><p class="pr-erro" id="prDlgErro" hidden></p>',
      [{ rotulo: 'Cancelar', acao: fecharDialogo }, { rotulo: 'Restaurar', classe: 'pr-btn-ouro', acao: function () {
        fetchJSON('/api/processos/restaurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versao: n, versaoBase: publicado.versao }) })
          .then(function (res) {
            limparLocal(); fecharDialogo(); rascunho = null; versaoVista = null;
            return carregar().then(function () { modo = 'ler'; renderTudo(); aviso('Versão ' + n + ' restaurada como versão ' + res.versao + '.', 'ok'); });
          }).catch(function (e) { erroDialogo(e.message); });
      } }]);
  }

  // ---------------- eventos ----------------
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-acao],[data-dlg]') : null;
    if (!b) return;
    if (b.hasAttribute('data-dlg')) { var bt = abrirDialogo.botoes[Number(b.getAttribute('data-dlg'))]; if (bt && bt.acao) bt.acao(); return; }
    var acao = b.getAttribute('data-acao'), nome = b.getAttribute('data-bloco'), ref = b.getAttribute('data-ref');
    if (acao === 'editar') iniciarEdicao();
    else if (acao === 'importar-inicial') { iniciarEdicao(true); dialogoImportar(); }
    else if (acao === 'importar') dialogoImportar();
    else if (acao === 'historico') dialogoHistorico();
    else if (acao === 'publicar') dialogoPublicar();
    else if (acao === 'desfazer') { if (desfazer.length) { rascunho = JSON.parse(desfazer.pop()); mudouRascunho(); aviso('Última alteração desfeita.', 'ok'); } }
    else if (acao === 'sair-edicao') { modo = 'ler'; renderTudo(); }
    else if (acao === 'descartar') {
      abrirDialogo('Descartar rascunho', '<p class="pr-ajuda">Todas as alterações não publicadas serão perdidas.</p>', [
        { rotulo: 'Cancelar', acao: fecharDialogo },
        { rotulo: 'Descartar', classe: 'pr-btn-perigo', acao: function () { limparLocal(); fecharDialogo(); iniciarEdicao(true); aviso('Rascunho descartado.', 'ok'); } }]);
    }
    else if (acao === 'editar-item') dialogoItem(nome, ref, false);
    else if (acao === 'inserir-item') dialogoItem(nome, null, true);
    else if (acao === 'remover-item') removerItem(nome, ref);
    else if (acao === 'restaurar-item') restaurarItem(nome, b.getAttribute('data-chave'));
    else if (acao === 'mover') moverItem(nome, ref, Number(b.getAttribute('data-dir')));
    else if (acao === 'ver-versao') verVersao(Number(b.getAttribute('data-versao')));
    else if (acao === 'sair-versao') { versaoVista = null; modo = rascunho ? 'editar' : 'ler'; renderTudo(); }
    else if (acao === 'restaurar') restaurarVersao();
  });
  document.addEventListener('toggle', function (ev) {
    var d = ev.target;
    if (d && d.classList && d.classList.contains('pr-ed-bloco') && !filtroEditor) abertos[d.getAttribute('data-bloco')] = d.open;
  }, true);
  window.addEventListener('beforeunload', function (ev) {
    if (modo === 'editar' && rascunho && desfazer.length) { ev.preventDefault(); ev.returnValue = ''; }
  });

  function carregar() {
    return fetchJSON('/api/processos').then(function (d) { publicado = d; CFG.podeEditar = !!d.podeEditar; });
  }
  function iniciar() {
    var t = null;
    $('prEdFiltro').addEventListener('input', function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { filtroEditor = v; renderEditor(); }, 200); });
    carregar().then(renderTudo).catch(function (e) {
      $('prLeitor').hidden = true; $('prVazio').hidden = false;
      $('prVazio').innerHTML = '<h2>Não foi possível carregar os processos</h2><p>' + esc(e.message) + '</p><button type="button" class="pr-btn" onclick="location.reload()">Tentar de novo</button>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(typeof window !== 'undefined' ? window : this);
