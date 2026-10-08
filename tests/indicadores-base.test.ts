// Roda com: node --experimental-strip-types tests/indicadores-base.test.ts
// Casos espelham a lógica de referência do prompt de 07/10/2026 (seção 6).
import assert from 'node:assert/strict';
import {
  semaforoConfirmados, corBlocoAgenda, faixaPresenca, distribuicaoPresenca, percentuaisMaiorResto,
  calcularHealthBase, advertenciaAtiva, pontuacaoAtiva, percentualCriticosDecimos, casaBusca, statusReport, segundaFeiraBRT,
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

// Health da Base = percentual de críticos + advertências (casos da seção 6 do prompt de 07/10/2026)
assert.equal(percentualCriticosDecimos(4, 50), 80, 'George outubro, base declarada');
assert.equal(percentualCriticosDecimos(7, 43), 163, 'Vitor outubro, base declarada');
assert.equal(percentualCriticosDecimos(1, 23), 43, 'Mateus setembro, base declarada');
assert.equal(percentualCriticosDecimos(0, 50), 0);
assert.equal(percentualCriticosDecimos(50, 50), 1000);
assert.equal(percentualCriticosDecimos(0, 0), null, 'base zero não tem valor');
assert.equal(percentualCriticosDecimos(51, 50), null, 'críticos acima da base');
assert.equal(percentualCriticosDecimos(null, 50), null);
let h = calcularHealthBase(4, 50, 0);
assert.equal(h.healthBaseDecimos, 80);
h = calcularHealthBase(4, 50, 3);
assert.equal(h.healthBaseDecimos, 110, 'advertência soma e piora');
assert.equal(h.composicao, 'Críticos 4 de 50 (8,0%), advertências ativas 3 pontos, Health da Base 11,0%.');
h = calcularHealthBase(40, 50, 30);
assert.equal(h.healthBaseDecimos, 1000, 'teto de 100,0');
h = calcularHealthBase(null, null, 2);
assert.deepEqual([h.semApuracao, h.healthBaseDecimos], [true, null], 'sem report nunca vira zero');
h = calcularHealthBase(0, 0, 0);
assert.equal(h.composicao, 'Sem apuração: base sem membros elegíveis.');

// busca por nome
assert.equal(casaBusca('ana', 'Mariana Costa'), true);
assert.equal(casaBusca('cos mar', 'Mariana Costa'), true, 'termos em qualquer ordem');
assert.equal(casaBusca('zzz', 'Mariana Costa'), false);
assert.equal(casaBusca('', 'Mariana Costa'), true, 'busca vazia casa tudo');
assert.equal(casaBusca('jose', 'José Silva'), true, 'sem acento acha com acento');
assert.equal(casaBusca('JOSÉ', 'jose silva'), true, 'com acento acha sem acento');
assert.equal(casaBusca('conceicao', 'Maria da Conceição'), true);
assert.equal(casaBusca('Conceição', 'MARIA DA CONCEICAO'), true);
// a mesma função roda no navegador a partir do próprio código-fonte
// O tsx (esbuild) injeta chamadas a um auxiliar __name no código transformado; recriada fora do módulo,
// a função não o encontraria. O parâmetro abaixo supre o auxiliar e não muda nada no node puro nem no
// navegador, onde o código não passa por essa transformação.
const casaBuscaNoNavegador = new Function('__name', 'return ' + casaBusca.toString())((f: unknown) => f);
assert.equal(casaBuscaNoNavegador('cos mar', 'Mariana Costa'), true);

// status do report e semana
assert.equal(statusReport(null), 'sem_report');
assert.equal(statusReport('2026-10-02', new Date('2026-10-07T12:00:00Z')), 'atual');
assert.equal(statusReport('2026-09-15', new Date('2026-10-07T12:00:00Z')), 'desatualizado');
assert.equal(segundaFeiraBRT(new Date('2026-10-07T12:00:00Z')), '2026-10-05');
assert.equal(segundaFeiraBRT(new Date('2026-10-12T02:00:00Z')), '2026-10-05', 'domingo 23h em Brasília ainda é a semana anterior');

// advertências: vencida não desconta
const agora = new Date('2026-10-07T12:00:00Z');
assert.equal(advertenciaAtiva('2026-09-29T17:23:46Z', 1, agora), true);
assert.equal(advertenciaAtiva('2026-08-01T12:00:00Z', 1, agora), false);
assert.equal(pontuacaoAtiva([
  { aplicado_em: '2026-09-29T17:23:46Z', validade_meses: 1, pontos: 10 },
  { aplicado_em: '2026-08-01T12:00:00Z', validade_meses: 1, pontos: 5 },
], agora), 10);

console.log('indicadores-base: todos os testes aprovados');
