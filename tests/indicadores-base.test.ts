// Roda com: node --experimental-strip-types tests/indicadores-base.test.ts
// Casos espelham a lógica de referência do prompt de 07/10/2026 (seção 6).
import assert from 'node:assert/strict';
import {
  semaforoConfirmados, corBlocoAgenda, faixaPresenca, distribuicaoPresenca, percentuaisMaiorResto,
  calcularHealthBase, advertenciaAtiva, pontuacaoAtiva, presencaMembroDecimos,
} from '../lib/indicadores-base.ts';

// semáforo
const esperado: [number, string][] = [[0, 'vermelho'], [1, 'vermelho'], [2, 'laranja'], [3, 'laranja'], [4, 'amarelo'], [5, 'amarelo'], [6, 'verde'], [7, 'verde'], [8, 'azul'], [12, 'azul']];
esperado.forEach(([n, chave]) => assert.equal(semaforoConfirmados(n).chave, chave, `semáforo ${n}`));
[null, undefined, -1, 2.5, NaN, '4'].forEach((x) => assert.equal(semaforoConfirmados(x).chave, 'neutro', `entrada inválida ${String(x)}`));
assert.equal(semaforoConfirmados(4).intervalo, 'de 4 a 5');
assert.equal(semaforoConfirmados(9).intervalo, '8 ou mais');
assert.equal(semaforoConfirmados(4).corTexto, '#1A1A1A', 'amarelo usa texto escuro');
assert.equal(semaforoConfirmados(2).corTexto, '#1A1A1A', 'laranja usa texto escuro');
assert.equal(corBlocoAgenda(8, true).chave, 'encerrado', 'encerrado vence o semáforo');
assert.equal(corBlocoAgenda(6, false).chave, 'verde');

// faixas
assert.equal(faixaPresenca(0), 'critica');
assert.equal(faixaPresenca(20), 'critica');
assert.equal(faixaPresenca(20.1), 'baixa');
assert.equal(faixaPresenca(21), 'baixa');
assert.equal(faixaPresenca(50), 'baixa');
assert.equal(faixaPresenca(70), 'atencao');
assert.equal(faixaPresenca(71), 'saudavel');
assert.equal(faixaPresenca(100), 'saudavel');
assert.equal(faixaPresenca(101), null);
assert.equal(faixaPresenca(null), null);

// percentuais pelo maior resto
assert.deepEqual(percentuaisMaiorResto([13, 49, 55, 137]), [51, 193, 217, 539], 'kanban do print');
assert.equal(percentuaisMaiorResto([1, 1, 1, 0]).reduce((a, b) => a + b, 0), 1000);
assert.deepEqual(percentuaisMaiorResto([1, 1, 1, 0]), [334, 333, 333, 0], 'empate vai para o menor índice');
assert.deepEqual(percentuaisMaiorResto([0, 0, 0, 0]), [0, 0, 0, 0]);
const dist = distribuicaoPresenca([10, 30, 60, 90, 95, null]);
assert.deepEqual(dist.contagens, { critica: 1, baixa: 1, atencao: 1, saudavel: 2 });
assert.equal(dist.semApuracao, 1);
assert.equal(dist.totalApurado, 5);
assert.equal(Object.values(dist.percentuaisDecimos).reduce((a, b) => a + b, 0), 1000);

// Health da Base
let h = calcularHealthBase([800], 0);
assert.deepEqual([h.saudeLiquidaDecimos, h.healthBaseDecimos], [800, 200], 'presença 80, sem advertência: 20');
h = calcularHealthBase([800], 3);
assert.deepEqual([h.saudeLiquidaDecimos, h.healthBaseDecimos], [770, 230], 'presença 80, 3 pontos: 23');
assert.equal(h.composicao, 'Presença média da carteira 80,0%, advertências ativas 3 pontos, saúde líquida 77,0%, Health da Base 23,0%.');
h = calcularHealthBase([100], 50);
assert.deepEqual([h.saudeLiquidaDecimos, h.healthBaseDecimos], [0, 1000], 'piso em zero');
h = calcularHealthBase([1000], 0);
assert.deepEqual([h.saudeLiquidaDecimos, h.healthBaseDecimos], [1000, 0], 'presença total');
h = calcularHealthBase([700, null, 900], 0);
assert.deepEqual([h.presencaMediaDecimos, h.membrosApurados], [800, 2], 'membro sem apuração fica fora da média');
h = calcularHealthBase([null, null], 2);
assert.equal(h.semApuracao, true);
assert.equal(h.healthBaseDecimos, null, 'sem apuração nunca vira zero');
h = calcularHealthBase([], 0);
assert.equal(h.semApuracao, true);
assert.equal(presencaMembroDecimos(2, 3), 667);
assert.equal(presencaMembroDecimos(0, 0), null);

// advertências: vencida não desconta
const agora = new Date('2026-10-07T12:00:00Z');
assert.equal(advertenciaAtiva('2026-09-29T17:23:46Z', 1, agora), true);
assert.equal(advertenciaAtiva('2026-08-01T12:00:00Z', 1, agora), false);
assert.equal(pontuacaoAtiva([
  { aplicado_em: '2026-09-29T17:23:46Z', validade_meses: 1, pontos: 10 },
  { aplicado_em: '2026-08-01T12:00:00Z', validade_meses: 1, pontos: 5 },
], agora), 10);

console.log('indicadores-base: todos os testes aprovados');
