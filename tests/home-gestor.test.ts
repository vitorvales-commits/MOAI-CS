// Roda com: npx tsx tests/home-gestor.test.ts
// Montador do payload da home do gestor, com dados sintéticos (sem banco): forma, pódio sem vaga preenchida,
// CS sem dado, cases na ordem recebida e conselhos consolidados.
import assert from 'node:assert/strict';
import { montarHomeGestor } from '../lib/home-gestor.ts';

const indicadores = {
  casesSucesso: { meta: 55, alcancado: 11, tipoMeta: 'min' },
  matchmakings: { meta: 150, alcancado: 63, tipoMeta: 'min' },
  rounds: { meta: 4, alcancado: 0, tipoMeta: 'min' },
  indicacoes: { meta: 25, alcancado: 13, tipoMeta: 'min' },
  churn: { meta: 10, alcancado: 8, tipoMeta: 'max' },
  revenueChurn: { meta: 15000, alcancado: 10035, tipoMeta: 'max' },
  healthDaBase: { meta: 20, alcancado: 19, tipoMeta: 'max', percentualBase: 7.4, membrosTotal: 258 },
};
const det = (chave: string, valor: number | null, meta: number | null, pct: number | null) => ({
  chave, label: chave, valorAlcancado: valor, meta, achievementPct: pct, semMeta: meta === null, semPontos: false,
});
const ranking = [
  { nome: 'George', nomeCompleto: 'George Lima', fotoUrl: null, score: 81, posicao: 1, detalhamento: [det('casesSucesso', 4, 5, 80), det('matchmakings', 12, 10, 120)] },
  { nome: 'Marcos', nomeCompleto: 'Marcos Dias', fotoUrl: null, score: 76, posicao: 2, detalhamento: [det('casesSucesso', 1, 5, 20), det('matchmakings', 8, 10, 80)] },
  { nome: 'Amanda', nomeCompleto: 'Amanda Reis', fotoUrl: null, score: 72, posicao: 3, detalhamento: [det('casesSucesso', 2, 5, 40), det('matchmakings', 7, 10, 70)] },
];
const home = montarHomeGestor({
  mes: 'Outubro', ano: 2026, geral: false,
  indicadores, rankingGeral: ranking, membrosIncluidos: ['Amanda', 'George', 'Luana', 'Marcos'],
  variacoes: new Map([['George', { pontos: 3 }], ['Amanda', { pontos: 6 }]]),
  conselhos: [
    { nome: 'A', status: 'realizado', membros: 10, presente: 8, ausente: 2, reposicao: 0, registros: 10, congelado: false },
    { nome: 'B', status: 'realizado', membros: 10, presente: 5, ausente: 5, reposicao: 0, registros: 10, congelado: false },
    { nome: 'C', status: 'aguardando_confirmacao', membros: 9, congelado: true },
  ],
  recordes: { casesSucesso: { emRecorde: false, recordeValor: 65, recordeMes: '2026-09-01' } },
  casesDoTime: [{ nome: 'Case X', cs: 'George', produto: 'C Level' }, { nome: 'Case Y', cs: 'Amanda' }],
  casesPorCS: [{ nome: 'George', qtd: 1 }, { nome: 'Amanda', qtd: 1 }],
});

// Frase e saudação vêm do resumo, com o mesmo cálculo testado em home-regras.
assert.ok(home.resumo, 'mês fechado ou em curso tem resumo');
assert.equal(home.resumo!.totalMetas, 4);
assert.match(home.resumo!.saudacao, /atrás do ritmo em \d+ frentes?\.|no ritmo\./);

// Pódio: três primeiros, sem vaga preenchida quando há menos de três, e distância entre 1º e 4º (sem 4º, nula).
assert.equal(home.podio.pessoas.length, 3);
assert.equal(home.podio.pessoas[0].nome, 'George');
assert.equal(home.podio.distanciaPrimeiroQuarto, null);
assert.equal(home.podio.maiorAlta!.nome, 'Amanda', 'maior alta vem de variacoes');
const so2 = montarHomeGestor({
  mes: 'Outubro', ano: 2026, geral: false, indicadores, rankingGeral: ranking.slice(0, 2), membrosIncluidos: [],
  variacoes: new Map(), conselhos: [], recordes: {}, casesDoTime: [], casesPorCS: [],
});
assert.equal(so2.podio.pessoas.length, 2, 'não preenche vaga do pódio');

// Time: quem não tem pontuação aparece como sem dados, nunca como zero, e a faixa segue a régua da Visão da área.
const luana = home.time.find((t) => t.nome === 'Luana')!;
assert.equal(luana.score, null);
assert.equal(luana.faixa, 'sem_dados');
assert.equal(home.time.find((t) => t.nome === 'Marcos')!.faixa, 'ok');

// Conselhos consolidados: só realizados entram na presença; congelado não entra em abaixo do limite.
assert.equal(home.conselhos.ativos, 2);
assert.equal(home.conselhos.membros, 20);
assert.equal(home.conselhos.presencaAcumulada, 65, '13 presentes em 20 registros');
assert.equal(home.conselhos.abaixoDoLimite, 1, 'só B fica abaixo de 70%');

// Cases: total do período e os primeiros na ordem recebida, sem reordenar por data.
assert.equal(home.cases.total, 2);
assert.equal(home.cases.recentes[0].nome, 'Case X');

// Retenção: churn com projeção e críticos com percentual da base.
const churn = home.resumo!.retencao.find((r) => r.chave === 'churn')!;
// A projeção depende do dia de hoje: com o mês em curso ela existe e bate com a regra; fora dele, não há projeção.
const per = home.periodo;
const esperadoProjecao = per.emCurso && per.diasDecorridos >= 7 ? Math.round((8 / per.diasDecorridos) * per.diasNoMes) : null;
assert.equal(churn.projecao, esperadoProjecao);
const criticos = home.resumo!.retencao.find((r) => r.chave === 'healthDaBase')!;
assert.equal(criticos.percentualBase, 7.4);

// Mês geral (Visão Geral) não tem frase do mês.
const geral = montarHomeGestor({
  mes: 'Visão Geral', ano: 2026, geral: true, indicadores, rankingGeral: ranking, membrosIncluidos: [],
  variacoes: new Map(), conselhos: [], recordes: {}, casesDoTime: [], casesPorCS: [],
});
assert.equal(geral.resumo, null);

console.log('home-gestor: testes aprovados');
