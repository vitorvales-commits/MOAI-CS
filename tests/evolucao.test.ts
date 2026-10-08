// Roda com: node --experimental-strip-types tests/evolucao.test.ts
// Casos da evolução por período (08/10/2026): janela que começa em maio, mês aberto até o dia 5 inclusive e
// fechado no dia 6, mediana com nulos, leitura com e sem queda, maior queda e variação do ranking com alerta.
import assert from 'node:assert/strict';
import {
  mesesDaJanela,
  mesAberto,
  mediana,
  serieDoCS,
  leituraEvolucao,
  maiorQuedaIndicador,
  variacaoRanking,
  linhasFechamento,
} from '../lib/evolucao.ts';

// --- mesesDaJanela ---
assert.deepEqual(mesesDaJanela(2026, 9, 6), [
  { ano: 2026, mes: 4 }, { ano: 2026, mes: 5 }, { ano: 2026, mes: 6 },
  { ano: 2026, mes: 7 }, { ano: 2026, mes: 8 }, { ano: 2026, mes: 9 },
].slice(1), 'janela de 6 meses até setembro, mas nunca antes de maio: volta a 5 meses');
assert.deepEqual(mesesDaJanela(2026, 9, 6).map((m) => m.mes), [5, 6, 7, 8, 9], 'janela começa em maio e não vai antes');
assert.deepEqual(mesesDaJanela(2026, 9, 3).map((m) => m.mes), [7, 8, 9], 'janela de 3 meses');
assert.deepEqual(mesesDaJanela(2026, 2, 3), [], 'janela inteira antes de maio fica vazia');
assert.deepEqual(mesesDaJanela(2026, 7, 12).map((m) => m.mes), [5, 6, 7], 'janela de 12 começa em maio se os dados começam em maio');
assert.deepEqual(mesesDaJanela(2026, 1, 3, '2025-12'), [{ ano: 2025, mes: 12 }, { ano: 2026, mes: 1 }], 'janela que cruza o ano nunca vai antes do início');

// --- mesAberto: aberto até o dia 5 do mês seguinte, inclusive ---
assert.equal(mesAberto(2026, 9, '2026-10-05', 5), true, 'dia 5 do mês seguinte ainda aberto');
assert.equal(mesAberto(2026, 9, '2026-10-06', 5), false, 'dia 6 do mês seguinte já fechado');
assert.equal(mesAberto(2026, 9, '2026-10-01', 5), true, 'início do mês seguinte aberto');
assert.equal(mesAberto(2026, 12, '2027-01-05', 5), true, 'dezembro fecha em janeiro do ano seguinte');
assert.equal(mesAberto(2026, 12, '2027-01-06', 5), false, 'dezembro fechado no dia 6 de janeiro');
assert.equal(mesAberto(2026, 10, '2026-10-08', 5), true, 'mês corrente sempre aberto');

// --- mediana com nulos ---
assert.equal(mediana([100, null, 80, undefined, 120]), 100, 'mediana ignora nulos, com número ímpar');
assert.equal(mediana([100, 80, null, 120, 60]), 90, 'mediana de número par de valores sem nulos');
assert.equal(mediana([null, null]), null, 'sem valores, null');

// --- série e leitura ---
const meses = [
  { rotulo: 'Maio 2026', aberto: false, cs: { pontuacao: 60, posicao: 6 }, medianaTime: 80 },
  { rotulo: 'Junho 2026', aberto: false, cs: null, medianaTime: 80 },
  { rotulo: 'Julho 2026', aberto: false, cs: { pontuacao: 75, posicao: 4 }, medianaTime: 80 },
  { rotulo: 'Agosto 2026', aberto: false, cs: { pontuacao: 90, posicao: 2 }, medianaTime: 85 },
];
const serie = serieDoCS(meses);
assert.equal(serie[1].pontuacao, null, 'mês sem pontuação fica como lacuna');
assert.deepEqual(leituraEvolucao(serie), [
  'A pontuação foi de 60 para 90 em 3 meses.',
  'A posição foi de 6º para 2º.',
], 'frases de pontuação e posição, contando a distância entre o primeiro e o último mês com dado');
assert.deepEqual(leituraEvolucao(serieDoCS([{ rotulo: 'x', aberto: false, cs: null, medianaTime: 1 }])), [], 'sem dado nenhuma frase');

// com queda: a leitura mostra a pontuação caindo, sem frase inventada
const comQueda = leituraEvolucao(serieDoCS([
  { rotulo: 'a', aberto: false, cs: { pontuacao: 95, posicao: 1 }, medianaTime: 80 },
  { rotulo: 'b', aberto: false, cs: { pontuacao: 70, posicao: 5 }, medianaTime: 80 },
]));
assert.deepEqual(comQueda, ['A pontuação foi de 95 para 70 em 1 mês.', 'A posição foi de 1º para 5º.'], 'leitura de queda usa a mesma regra');

// --- maiorQuedaIndicador ---
const eixos = [
  { chave: 'churn', label: 'Churn', pctPorMes: [100, 90, 60] },
  { chave: 'rounds', label: 'Rounds', pctPorMes: [120, 110, 100] },
  { chave: 'cumprimentoGtd', label: 'GTD', pctPorMes: [80, 50, 2] },
  { chave: 'upsell', label: 'Upsell', pctPorMes: [null, 90, null] },
];
const queda = maiorQuedaIndicador(eixos);
assert.deepEqual(queda, { chave: 'churn', label: 'Churn', de: 90, para: 60, queda: 30 }, 'maior queda entre os eixos com histórico, sem GTD');
assert.equal(maiorQuedaIndicador([{ chave: 'rounds', label: 'Rounds', pctPorMes: [120, 110, 100] }]), null, 'queda de 10 pontos não chega ao limite de 30');
assert.equal(maiorQuedaIndicador([{ chave: 'upsell', label: 'Upsell', pctPorMes: [null, 90, null] }]), null, 'eixo com um dado só não tem queda');

// --- variacaoRanking ---
assert.deepEqual(variacaoRanking({ posicao: 3, pontuacao: 80 }, { posicao: 4, pontuacao: 76 }), { posicoes: 1, pontos: 4, alerta: false }, 'subiu uma posição e ganhou 4 pontos');
assert.deepEqual(variacaoRanking({ posicao: 6, pontuacao: 70 }, { posicao: 4, pontuacao: 88 }), { posicoes: -2, pontos: -18, alerta: true }, 'caiu 2 posições e 18 pontos: alerta');
assert.deepEqual(variacaoRanking({ posicao: 4, pontuacao: 80 }, { posicao: 4, pontuacao: 90 }), { posicoes: 0, pontos: -10, alerta: false }, 'queda de 10 pontos sem mudar de posição não é alerta');
assert.deepEqual(variacaoRanking({ posicao: 5, pontuacao: 80 }, { posicao: 4, pontuacao: 80 }), { posicoes: -1, pontos: 0, alerta: false }, 'queda de uma posição sem perda de pontos não é alerta');
assert.equal(variacaoRanking({ posicao: 3, pontuacao: 80 }, null), null, 'mês anterior sem dado: variação nula');
assert.equal(variacaoRanking({ posicao: null, pontuacao: 80 }, { posicao: 3, pontuacao: 80 }), null, 'atual sem posição: variação nula');

// --- linhasFechamento: mesma montagem que a gravação usa ---
const eixosTeste = [{ chave: 'churn', label: 'Churn', tipoMeta: 'max' as const }, { chave: 'rounds', label: 'Rounds', tipoMeta: 'min' as const }];
const porCS = [
  { nome: 'Marcos', scoreReal: 88, pontuacao: { estado: 'com_pontuacao', elegiveis: 7 }, radar: [100, 120], indicadores: { churn: { calculado: 1, meta: 2, unidade: '%' }, rounds: { calculado: 4, meta: 2, unidade: null } } },
  { nome: 'Novo', scoreReal: null, pontuacao: { estado: 'sem_dados_suficientes', elegiveis: 1 }, radar: [null, 50], indicadores: { churn: { calculado: 0, meta: 2, unidade: '%' }, rounds: { calculado: 1, meta: 2, unidade: null } } },
];
const linhas = linhasFechamento(porCS, [{ nome: 'Marcos', posicao: 1 }], eixosTeste);
assert.equal(linhas[0].pontuacao, 88);
assert.equal(linhas[0].posicao, 1);
assert.equal(linhas[0].totalRankeados, 1);
assert.deepEqual(linhas[0].radar[0], { chave: 'churn', label: 'Churn', tipoMeta: 'max', pct: 100, valor: 1, meta: 2, unidade: '%' });
assert.equal(linhas[1].pontuacao, null, 'sem dados suficientes: pontuação nula');
assert.equal(linhas[1].posicao, null, 'fora do ranking: posição nula');
assert.equal(linhas[1].estado, 'sem_dados_suficientes');

console.log('evolucao: todos os casos passaram');

// --- mês em andamento fica fora da comparação (09/10/2026) ---
const comAberto = serieDoCS([
  { rotulo: 'Agosto 2026', aberto: false, cs: { pontuacao: 173, posicao: 1 }, medianaTime: 120 },
  { rotulo: 'Setembro 2026', aberto: false, cs: { pontuacao: 104, posicao: 5 }, medianaTime: 118 },
  { rotulo: 'Outubro 2026', aberto: true, cs: { pontuacao: 12, posicao: 6 }, medianaTime: 20 },
]);
assert.deepEqual(leituraEvolucao(comAberto), [
  'A pontuação foi de 173 para 104 em 1 mês.',
  'A posição foi de 1º para 5º.',
  'Outubro 2026 está em andamento: 12 pontos até agora, 6º lugar parcial. Esse mês não entra na comparação.',
], 'mês aberto não entra na comparação e ganha frase própria');
assert.equal(
  maiorQuedaIndicador([{ chave: 'matchmakings', label: 'Matchmakings', pctPorMes: [150, 150, 0] }], undefined, [false, false, true]),
  null,
  'queda causada só pelo mês aberto não é alerta',
);
assert.deepEqual(
  maiorQuedaIndicador([{ chave: 'matchmakings', label: 'Matchmakings', pctPorMes: [150, 80, 0] }], undefined, [false, false, true]),
  { chave: 'matchmakings', label: 'Matchmakings', de: 150, para: 80, queda: 70 },
  'queda entre meses fechados continua valendo',
);
