// Roda com: npx tsx tests/saude-dados.test.ts
import assert from 'node:assert/strict';
import { classificarSaude, type LinhaSaude } from '../lib/saude-dados.ts';

const agora = new Date('2026-10-29T16:00:00Z');
const min = (m: number) => new Date(agora.getTime() - m * 60000).toISOString();
const l = (board: string, idade: number | null, falhas = 0, erro: string | null = null): LinhaSaude => ({
  board, ultima_sucesso: idade === null ? null : min(idade), ultima_execucao: min(1), falhas_consecutivas: falhas, ultimo_erro: erro, ultimo_erro_em: erro ? min(1) : null,
});

assert.equal(classificarSaude([], agora).estado, 'vazio');

// tudo saudável: texto neutro com a maior idade
const ok = classificarSaude([l('churn', 3), l('metas', 14), l('granola', 14)], agora);
assert.equal(ok.estado, 'saudavel');
assert.equal(ok.texto, 'Dados atualizados há 14 minutos');
assert.equal(ok.itens.length, 0);

// limites: 15 minutos não atrasa, 16 atrasa; 60 atrasa, 61 é crítico; cinco falhas é crítico mesmo recente
assert.equal(classificarSaude([l('churn', 15)], agora).estado, 'saudavel');
assert.equal(classificarSaude([l('churn', 16)], agora).estado, 'atrasado');
assert.equal(classificarSaude([l('churn', 60)], agora).estado, 'atrasado');
assert.equal(classificarSaude([l('churn', 61)], agora).estado, 'critico');
assert.equal(classificarSaude([l('churn', 2, 4)], agora).estado, 'saudavel');
assert.equal(classificarSaude([l('churn', 2, 5)], agora).estado, 'critico');

// rotinas de 15 minutos: 45 e 120
assert.equal(classificarSaude([l('granola', 45)], agora).estado, 'saudavel');
assert.equal(classificarSaude([l('granola', 46)], agora).estado, 'atrasado');
assert.equal(classificarSaude([l('alertas_nps', 121)], agora).estado, 'critico');

// ordem: crítico antes de atrasado, e dentro da gravidade o mais parado primeiro; sem sucesso é o mais grave
const r = classificarSaude([l('metas', 20), l('churn', 90), l('cases', 300), l('rounds', null, 2)], agora);
assert.deepEqual(r.itens.map((i) => i.board), ['rounds', 'cases', 'churn', 'metas']);
assert.equal(r.estado, 'critico');
assert.equal(r.texto, '3 rotinas de dados paradas e 1 atrasada. Abra para ver o que tratar.');
assert.match(classificarSaude([l('alertas_nps', 9000, 659, 'Resend HTTP 403')], agora).itens[0].acao, /email/);
console.log('ok saude-dados');
