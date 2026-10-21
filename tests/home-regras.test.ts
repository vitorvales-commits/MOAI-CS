// Roda com: npx tsx tests/home-regras.test.ts
// Regras da seção 7 do prompt das homes (20/10/2026): ritmo, projeção, pódio, foco, simulação e dica.
import assert from 'node:assert/strict';
import {
  deficitCrescimento, esperadoAteHoje, projecaoFluxo, statusCrescimento, statusRetencao, resumoMesGestor,
  frasesPodio, focoDoDia, simularPatamar, dicaRitmo, faixaPessoa, faltaPorSemana,
} from '../lib/home-regras.ts';
import { diasDoMesReal } from '../lib/inicio-cs.ts';

// Caso obrigatório 1: dia 20 de um mês de 31 dias, meta 55 e realizado 11 dá esperado 35 e déficit 24.
assert.equal(diasDoMesReal(2026, 10), 31);
const caso1 = deficitCrescimento(55, 11, 20, 31);
assert.equal(caso1.esperado, 35);
assert.equal(caso1.deficit, 24);
assert.equal(caso1.deficitRelativo, 24 / 55);

// Caso obrigatório 2: churn 8 no dia 20 de um mês de 31 dias projeta 12.
assert.equal(projecaoFluxo(8, 20, 31), 12);

// Abaixo de DIAS_MIN_PROJECAO (7) a projeção não aparece: mostra só o realizado.
assert.equal(projecaoFluxo(3, 6, 31), null);
assert.equal(projecaoFluxo(3, 7, 31), Math.round((3 / 7) * 31));

// Fração do mês usa o último dia real: fevereiro bissexto e mês de 30 dias.
assert.equal(esperadoAteHoje(28, 14, diasDoMesReal(2028, 2)), 14);
assert.equal(esperadoAteHoje(30, 15, 30), 15);

// Status de crescimento pela razão realizado sobre esperado.
assert.equal(statusCrescimento(0, 3), 'nenhum_ainda');
assert.equal(statusCrescimento(11, 35), 'acelerar');
assert.equal(statusCrescimento(13, 16), 'quase_no_ritmo');
assert.equal(statusCrescimento(40, 35), 'no_ritmo');
assert.equal(statusCrescimento(0, 0), 'no_ritmo', 'no começo do mês, sem esperado, nada está atrás');

// Retenção: projeção acima do limite vira Atenção; críticos (sem projeção) viram Perto do limite com 90% do limite.
assert.equal(statusRetencao(10, 8, 12), 'atencao');
assert.equal(statusRetencao(10, 8, 9), 'sob_controle');
assert.equal(statusRetencao(20, 19, null), 'perto_do_limite');
assert.equal(statusRetencao(20, 21, null), 'atencao');

// Frase do mês: o indicador de maior déficit relativo puxa a frase; a saudação conta frentes atrás mais retenção acima.
const mes = resumoMesGestor({
  diasDecorridos: 20, diasNoMes: 31,
  crescimento: [
    { chave: 'casesSucesso', label: 'Cases de sucesso', realizado: 11, meta: 55 },
    { chave: 'matchmakings', label: 'Matchmakings', realizado: 63, meta: 150 },
    { chave: 'rounds', label: 'Rounds', realizado: 0, meta: 4 },
    { chave: 'indicacoes', label: 'Indicações', realizado: 13, meta: 25 },
  ],
  retencao: [
    { chave: 'churn', label: 'Churn', realizado: 8, limite: 10, fluxo: true },
    { chave: 'healthDaBase', label: 'Membros críticos', realizado: 19, limite: 20, fluxo: false },
  ],
});
// Principal = maior déficit relativo ((esperado − realizado) / meta). Rounds tem 3/4 = 0,75 contra 24/55 de Cases.
assert.equal(mes.frase, 'Rounds é o maior risco do mês: 0 de 4, quando o esperado até hoje seria 3.');
assert.equal(mes.metasNoRitmo, 0);
assert.equal(mes.totalMetas, 4);
assert.equal(mes.frentesAtras, 5, 'quatro de crescimento atrás do ritmo e churn com projeção acima do limite');
assert.equal(mes.saudacao, 'O time está atrás do ritmo em 5 frentes.');
assert.match(mes.apoio, /Cases de sucesso, Matchmakings e Indicações também estão atrás do ritmo\./);
assert.match(mes.apoio, /Churn no ritmo atual fecha em 12, acima do limite de 10\./);
assert.equal(mes.crescimento.find((l) => l.chave === 'rounds')!.textoDeficit, '3 esperados até hoje.');
assert.equal(mes.retencao.find((l) => l.chave === 'healthDaBase')!.rotuloStatus, 'Perto do limite');

// Sem nada atrás, a frase diz que o time está no ritmo (7.1.6).
const noRitmo = resumoMesGestor({
  diasDecorridos: 20, diasNoMes: 31,
  crescimento: [{ chave: 'casesSucesso', label: 'Cases de sucesso', realizado: 40, meta: 55 }],
  retencao: [{ chave: 'churn', label: 'Churn', realizado: 2, limite: 10, fluxo: true }],
});
assert.equal(noRitmo.saudacao, 'O time está no ritmo.');
assert.equal(noRitmo.frase, 'O time está no ritmo em todas as frentes do mês.');

// Pódio (7.3): liderança de indicador, depois maior alta, depois contagem; nenhuma frase repetida.
const pessoas = [
  { nome: 'Marcos', valores: { matchmakings: 90, cases: 1 }, variacaoPontos: 2, metasOk: 8, comMeta: 9 },
  { nome: 'George', valores: { matchmakings: 120, cases: 3 }, variacaoPontos: 3, metasOk: 8, comMeta: 9 },
  { nome: 'Amanda', valores: { matchmakings: 40, cases: 2 }, variacaoPontos: 6, metasOk: 8, comMeta: 9 },
];
const frases = frasesPodio(pessoas, [{ chave: 'matchmakings', label: 'Matchmakings' }, { chave: 'cases', label: 'Cases de sucesso' }]);
assert.equal(frases.George, 'Maior volume de matchmakings do time');
assert.equal(frases.Amanda, 'Quem mais subiu no mês');
assert.equal(frases.Marcos, '8 de 9 indicadores com meta batidos ou no ritmo');
assert.equal(new Set(Object.values(frases)).size, 3);
const empate = frasesPodio([
  { nome: 'A', valores: {}, variacaoPontos: 0, metasOk: 5, comMeta: 9 },
  { nome: 'B', valores: {}, variacaoPontos: 0, metasOk: 5, comMeta: 9 },
], []);
assert.equal(empate.A, '5 de 9 indicadores com meta batidos ou no ritmo');
assert.equal(empate.B, null, 'frase repetida não aparece');

// Foco de hoje (7.4): conselho próximo com pouca confirmação vem antes do report e das metas.
const foco = focoDoDia({
  conselhos: [{ nome: 'Fast Track 04', diasAte: 2, confirmados: 5, membros: 14, gtdAtrasadas: 2 }],
  reportDiasAtePrazo: 0,
  metas: [],
  proximo: null,
});
assert.equal(foco.tipo, 'conselho');
assert.equal(foco.titulo, 'Preparar o conselho Fast Track 04');
assert.equal(foco.texto, 'Faltam 2 dias. 5 de 14 membros confirmaram. 2 etapas do GTD atrasadas.');
assert.equal(focoDoDia({ conselhos: [], reportDiasAtePrazo: 1, metas: [], proximo: null }).tipo, 'report');
const metaAtras = focoDoDia({
  conselhos: [], reportDiasAtePrazo: 5,
  metas: [
    { chave: 'upsell', label: 'Upsell', meta: 2, realizado: 0, esperado: 1, peso: 1 },
    { chave: 'casesSucesso', label: 'Cases de sucesso', meta: 5, realizado: 2, esperado: 3, peso: 3 },
  ],
  proximo: null,
});
assert.equal(metaAtras.titulo, 'Cases de sucesso está atrás do ritmo', 'maior peso atrasado vence');
assert.equal(focoDoDia({ conselhos: [], reportDiasAtePrazo: 5, metas: [], proximo: { titulo: 'Round Executivo 02', quando: 'quarta, 14h' } }).tipo, 'tudo_em_dia');

// Simulação (7.5): quantas unidades a mais levam ao próximo múltiplo de 5, sem passar da meta.
const indicadores = {
  casesSucesso: { meta: 5, alcancado: 2, tipoMeta: 'min' }, matchmakings: { meta: 10, alcancado: 10, tipoMeta: 'min' },
  rounds: { meta: 2, alcancado: 2, tipoMeta: 'min' }, upsell: { meta: 1, alcancado: 1, tipoMeta: 'min' },
  indicacoes: { meta: 4, alcancado: 4, tipoMeta: 'min' }, churn: { meta: 2, alcancado: 0, tipoMeta: 'max' },
  downsell: { meta: 1, alcancado: 0, tipoMeta: 'max' },
};
const sim = simularPatamar({ indicadores, carteira: { numConselhos: 6, metaPropria: 6 }, chave: 'casesSucesso', scoreAtual: 72 });
assert.ok(sim && sim.patamar === 75 && sim.unidades >= 1, 'a simulação devolve um patamar alcançável');
assert.equal(simularPatamar({ indicadores, carteira: { numConselhos: 6, metaPropria: 6 }, chave: 'casesSucesso', scoreAtual: null }), null);

// Dica do ritmo (7.6) e faixa do anel da foto (mesma régua da Visão da área).
assert.equal(dicaRitmo({ label: 'Cases', meta: 5, realizado: 2, diasRestantes: 11 }), 'Cases está atrás do ritmo: faltam 3 em 11 dias, cerca de 1,9 por semana.');
assert.equal(dicaRitmo({ label: 'Cases', meta: 5, realizado: 5, diasRestantes: 11 }), null);
assert.equal(faltaPorSemana(3, 11), 1.9);
assert.equal(faixaPessoa(40), 'em_risco');
assert.equal(faixaPessoa(60), 'acompanhar');
assert.equal(faixaPessoa(80), 'ok');
assert.equal(faixaPessoa(null), 'sem_dados');

console.log('home-regras: testes aprovados');
