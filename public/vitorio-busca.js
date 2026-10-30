// Motor de busca do Vitorio (30/10/2026). Matemática pura: normalização, radical, BM25F com pesos por campo
// e similaridade por trigramas para tolerar erro de digitação. Sem rede, sem DOM, sem IA.
// Fonte única: roda no navegador (window.VitorioBusca) e nos testes (lib/vitorio/busca.ts reexporta com tipos).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.VitorioBusca = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PESOS = { titulo: 3, perguntas: 3, sinonimos: 2, corpo: 1 };
  var BM25_K1 = 1.2;
  var BM25_B = 0.75;
  var JACCARD_MINIMO = 0.45; // trigramas: abaixo disso o termo digitado não é trocado por um termo do vocabulário
  var PESO_SINONIMO_CONSULTA = 0.5; // um termo vindo do dicionário vale menos que o que a pessoa digitou
  var PESO_TERMO_CORRIGIDO = 0.85;
  var MAX_OPCOES = 3;
  var PADRAO = { limiarResposta: 0.55, limiarMinimo: 0.3, margemAmbiguidade: 0.12 };

  var PALAVRAS_VAZIAS = ('a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem sob sobre ate ao aos a a ' +
    'e ou mas que se como qual quais quando onde quem quanto quantos quantas eu voce nos meu minha meus minhas seu sua seus suas ' +
    'ele ela eles elas isso isto esse essa esses essas este esta estes estas aquele aquela ser sao e foi era tem ter tenho temos ' +
    'ha vai vou posso pode podem preciso quero fazer faco faz favor me te lhe nao sim mais menos muito pouco ja ainda tambem so ' +
    'la aqui ali isso entre ate desde contra durante cada todo toda todos todas outro outra outros outras mesmo mesma').split(' ');
  var VAZIAS = {};
  PALAVRAS_VAZIAS.forEach(function (p) { VAZIAS[p] = true; });

  function normalizar(texto) {
    var t = String(texto == null ? '' : texto).toLowerCase();
    t = t.normalize ? t.normalize('NFD').replace(/[̀-ͯ]/g, '') : t;
    t = t.replace(/\b1\s*:\s*1\b/g, ' 1a1 ');
    t = t.replace(/[^a-z0-9]+/g, ' ');
    return t.replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  // Sufixos em ordem: o mais longo primeiro. Cada regra mantém um radical mínimo para não fundir palavras de sentido diferente.
  var SUFIXOS = [
    ['amentos', 3], ['imentos', 3], ['amento', 3], ['imento', 3], ['mente', 4], ['acoes', 2], ['icoes', 2], ['ucoes', 2],
    ['coes', 2], ['cao', 2], ['sao', 3], ['ando', 3], ['endo', 3], ['indo', 3], ['adores', 3], ['adoras', 3], ['ador', 3], ['adora', 3],
    ['ados', 3], ['adas', 3], ['ado', 3], ['ada', 3], ['idos', 3], ['idas', 3], ['ido', 3], ['ida', 3],
    ['ar', 3], ['er', 3], ['ir', 3]
  ];
  function radical(palavra) {
    var p = String(palavra || '');
    if (p.length <= 3 || /^\d/.test(p)) return p;
    // plurais: "oes" e "aes" viram "ao"; "ais", "eis" e "ois" ficam como estão; "ns" vira "m"; demais "s" caem
    if (/oes$|aes$/.test(p) && p.length > 4) p = p.slice(0, -3) + 'ao';
    else if (/ns$/.test(p) && p.length > 4) p = p.slice(0, -2) + 'm';
    else if (/(r|z)es$/.test(p) && p.length > 5) p = p.slice(0, -2);
    else if (/[^s]s$/.test(p) && p.length > 3) p = p.slice(0, -1);
    for (var i = 0; i < SUFIXOS.length; i++) {
      var suf = SUFIXOS[i][0];
      if (p.length - suf.length >= SUFIXOS[i][1] && p.slice(-suf.length) === suf) { p = p.slice(0, -suf.length); break; }
    }
    if (p.length > 4 && /[aeo]$/.test(p)) p = p.slice(0, -1);
    return p;
  }

  function radicais(textoNormalizado) {
    var out = [];
    textoNormalizado.split(' ').forEach(function (w) { if (w && !VAZIAS[w]) out.push(radical(w)); });
    return out;
  }
  function contar(lista) {
    var m = {};
    lista.forEach(function (t) { m[t] = (m[t] || 0) + 1; });
    return m;
  }
  function trigramas(w) {
    var s = '  ' + w + ' ', out = {}, n = 0;
    for (var i = 0; i + 3 <= s.length; i++) { var g = s.substr(i, 3); if (!out[g]) { out[g] = 1; n++; } }
    return { set: out, n: n };
  }
  function jaccard(a, b) {
    var comum = 0;
    for (var g in a.set) if (b.set[g]) comum++;
    return comum / (a.n + b.n - comum);
  }

  // docs: [{ chave, titulo, corpo, perguntas: [], palavras: [] }]; sinonimos: [[frase, frase...], ...]
  function indexar(docs, sinonimos) {
    var campos = ['titulo', 'perguntas', 'sinonimos', 'corpo'];
    var lista = [], postings = {}, somaTam = { titulo: 0, perguntas: 0, sinonimos: 0, corpo: 0 };
    docs.forEach(function (d, i) {
      var f = {
        titulo: radicais(normalizar(d.titulo)),
        perguntas: radicais(normalizar((d.perguntas || []).join(' '))),
        sinonimos: radicais(normalizar((d.palavras || []).join(' '))),
        corpo: radicais(normalizar(d.corpo))
      };
      var reg = { doc: d, tam: {}, i: i };
      campos.forEach(function (c) { reg.tam[c] = f[c].length; somaTam[c] += f[c].length; });
      lista.push(reg);
      campos.forEach(function (c) {
        var tf = contar(f[c]);
        for (var t in tf) {
          var p = postings[t] || (postings[t] = {});
          (p[i] || (p[i] = {}))[c] = tf[t];
        }
      });
    });
    var media = {};
    campos.forEach(function (c) { media[c] = Math.max(1, somaTam[c] / Math.max(1, docs.length)); });
    var vocabulario = Object.keys(postings);
    var grupos = (sinonimos || []).map(function (g) {
      return g.map(function (frase) { return radicais(normalizar(frase)); }).filter(function (s) { return s.length; });
    }).filter(function (g) { return g.length > 1; });
    return { docs: lista, postings: postings, media: media, vocabulario: vocabulario, trig: {}, grupos: grupos, n: docs.length };
  }

  function idf(indice, termo) {
    var df = indice.postings[termo] ? Object.keys(indice.postings[termo]).length : 0;
    return Math.log(1 + (indice.n - df + 0.5) / (df + 0.5));
  }
  function maisProximo(indice, termo) {
    var tt = trigramas(termo), melhor = null, melhorS = 0;
    for (var i = 0; i < indice.vocabulario.length; i++) {
      var v = indice.vocabulario[i];
      if (Math.abs(v.length - termo.length) > 3) continue;
      var tv = indice.trig[v] || (indice.trig[v] = trigramas(v));
      var s = jaccard(tt, tv);
      if (s > melhorS) { melhorS = s; melhor = v; }
    }
    return melhorS > JACCARD_MINIMO ? melhor : null;
  }
  function contemSequencia(alvo, sub) {
    for (var i = 0; i + sub.length <= alvo.length; i++) {
      var ok = true;
      for (var j = 0; j < sub.length; j++) if (alvo[i + j] !== sub[j]) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }

  // Devolve { tipo: 'resposta' | 'ambigua' | 'nada', itens: [{ doc, score }], realce: [radicais] }.
  function buscar(indice, consulta, cfg) {
    var c = {}; for (var k in PADRAO) c[k] = PADRAO[k];
    if (cfg) for (var k2 in cfg) if (cfg[k2] != null) c[k2] = cfg[k2];
    var qn = normalizar(consulta), ondeNav = /^(onde|aonde)( |$)/.test(qn);
    var qs = radicais(qn);
    var vistos = {}, termos = []; // { t, peso }
    function somar(t, peso) { if (!vistos[t]) termos.push({ t: t, peso: peso }); vistos[t] = Math.max(vistos[t] || 0, peso); }
    var maxIdf = Math.log(1 + (indice.n + 0.5) / 0.5);
    var denominador = 0, realce = {};
    qs.forEach(function (t) {
      var alvo = t, peso = 1;
      if (!indice.postings[t]) {
        alvo = maisProximo(indice, t);
        peso = PESO_TERMO_CORRIGIDO;
        if (!alvo) { denominador += maxIdf; return; } // termo desconhecido pesa contra a confiança
      }
      somar(alvo, peso); realce[alvo] = true;
      denominador += idf(indice, alvo) * peso;
    });
    indice.grupos.forEach(function (g) {
      var bate = g.some(function (frase) { return contemSequencia(qs, frase); });
      if (!bate) return;
      g.forEach(function (frase) {
        if (contemSequencia(qs, frase)) return;
        frase.forEach(function (t) { if (indice.postings[t] && !vistos[t]) { somar(t, PESO_SINONIMO_CONSULTA); realce[t] = true; } });
      });
    });
    if (!termos.length || denominador <= 0) return { tipo: 'nada', itens: [], realce: [] };

    var pontos = {};
    termos.forEach(function (x) {
      var post = indice.postings[x.t]; if (!post) return;
      var w = idf(indice, x.t) * x.peso;
      for (var di in post) {
        var reg = indice.docs[di], tfp = 0;
        for (var campo in PESOS) {
          var tf = post[di][campo]; if (!tf) continue;
          tfp += PESOS[campo] * tf / (1 - BM25_B + BM25_B * reg.tam[campo] / indice.media[campo]);
        }
        pontos[di] = (pontos[di] || 0) + w * tfp / (BM25_K1 + tfp);
      }
    });
    var ranking = Object.keys(pontos).map(function (di) {
      // Cada termo contribui idf * saturação (menor que 1): dividir pelo total de idf dá uma pontuação entre 0 e 1
      // Pode passar de 1 quando sinônimos reforçam o mesmo documento; só a ordem e os limiares importam.
      return { doc: indice.docs[di].doc, score: pontos[di] / denominador };
    }).sort(function (a, b) { return b.score - a.score; });
    // Pergunta que começa com "onde" procura um lugar do app: se alguma página passa do mínimo, só as páginas competem.
    if (ondeNav) {
      var paginas = ranking.filter(function (r) { return r.doc.colecao === 'navegacao'; });
      if (paginas.length && paginas[0].score >= c.limiarMinimo) ranking = paginas;
    }
    var rel = Object.keys(realce), melhores = ranking.slice(0, 5);
    if (!ranking.length || ranking[0].score < c.limiarMinimo) return { tipo: 'nada', itens: [], realce: rel, ranking: melhores };
    var s1 = ranking[0].score, s2 = ranking[1] ? ranking[1].score : 0;
    if (s1 >= c.limiarResposta && s1 - s2 >= c.margemAmbiguidade) return { tipo: 'resposta', itens: [ranking[0]], realce: rel, ranking: melhores };
    var opcoes = ranking.filter(function (r) { return r.score >= c.limiarMinimo; }).slice(0, MAX_OPCOES);
    return { tipo: 'ambigua', itens: opcoes, realce: rel, ranking: melhores };
  }

  // Trecho do texto original em torno do primeiro termo encontrado, com as posições a destacar.
  function trecho(texto, realce, max) {
    var t = String(texto || '').replace(/\s+/g, ' ').trim(), limite = max || 320;
    var alvo = {}; (realce || []).forEach(function (r) { alvo[r] = true; });
    var palavras = [], re = /[^\s.,;:!?()\[\]"'“”«»\/-]+/g, m;
    while ((m = re.exec(t))) {
      var r = radicais(normalizar(m[0]))[0];
      if (r && alvo[r]) palavras.push([m.index, m.index + m[0].length]);
    }
    var ini = 0;
    if (palavras.length && palavras[0][0] > limite / 2) {
      ini = Math.max(0, palavras[0][0] - 60);
      var esp = t.indexOf(' ', ini); if (esp >= 0 && esp < palavras[0][0]) ini = esp + 1;
    }
    var fim = Math.min(t.length, ini + limite);
    if (fim < t.length) { var sp = t.lastIndexOf(' ', fim); if (sp > ini + limite / 2) fim = sp; }
    return {
      texto: t.slice(ini, fim), prefixo: ini > 0, sufixo: fim < t.length,
      marcas: palavras.filter(function (p) { return p[0] >= ini && p[1] <= fim; }).map(function (p) { return [p[0] - ini, p[1] - ini]; })
    };
  }

  return {
    PESOS: PESOS, BM25_K1: BM25_K1, BM25_B: BM25_B, JACCARD_MINIMO: JACCARD_MINIMO, PADRAO: PADRAO, PALAVRAS_VAZIAS: PALAVRAS_VAZIAS,
    normalizar: normalizar, radical: radical, indexar: indexar, buscar: buscar, trecho: trecho
  };
});
