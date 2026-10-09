// Roda com: npx tsx tests/proximas-reunioes.test.ts
// Próximas reuniões da consulta rápida (revisão out/2026, rodada 2, Fase 5). Datas com -03:00 (São Paulo).
import assert from 'node:assert/strict';
import {
  reconhecePerguntaReunioes, resolverEntidade, formatarHora, formatarLinhaReuniao,
  proximasDoConselheiro, responderProximasReunioes, type Vinculos, type ReuniaoAgenda,
} from '../lib/consulta/proximas-reunioes.ts';

// Reconhecimento: termos sem acento e sem caixa
assert.ok(reconhecePerguntaReunioes('Próximo conselho do André Soares'));
assert.ok(reconhecePerguntaReunioes('QUANDO ACONTECE o conselho da Ana?'));
assert.ok(reconhecePerguntaReunioes('Qual a agenda do conselho?'));
assert.equal(reconhecePerguntaReunioes('Quantas metas o Rodrigo bateu?'), false);

// Hora: cheia vira "14h", com minutos vira "14h30"
assert.equal(formatarHora(14, '00'), '14h');
assert.equal(formatarHora(14, '30'), '14h30');

// Linha: dia, mês, hora no fuso de São Paulo e dia da semana (20/01/2026 é terça-feira)
assert.equal(formatarLinhaReuniao('2026-01-20T17:00:00Z'), '- 20/01 às 14h (Terça)');
assert.equal(formatarLinhaReuniao('2026-01-20T17:30:00Z'), '- 20/01 às 14h30 (Terça)');
// Domingo: 18/01/2026 às 10h
assert.equal(formatarLinhaReuniao('2026-01-18T13:00:00Z'), '- 18/01 às 10h (Domingo)');

const vinculos: Vinculos = {
  conselheiros: ['André Soares', 'Ana Lima'],
  membros: [
    { nome: 'Bruno Teixeira', conselheiro: 'Ana Lima' },
    { nome: 'Carla Souza', conselheiro: 'André Soares' },
    { nome: 'Daniel Rocha', conselheiro: null },
  ],
  css: [{ nome: 'Marcos', membros: ['Bruno Teixeira', 'Carla Souza'] }],
};
const agora = '2026-01-10T12:00:00Z';
const agenda: ReuniaoAgenda[] = [
  { conselheiro: 'André Soares', dataIso: '2026-01-20T17:00:00Z', status: 'Confirmado' },
  { conselheiro: 'André Soares', dataIso: '2026-02-10T17:00:00Z', status: null },
  { conselheiro: 'André Soares', dataIso: '2026-03-10T17:00:00Z', status: 'Cancelado' },
  { conselheiro: 'André Soares', dataIso: '2025-12-10T17:00:00Z', status: 'Executado' },
  { conselheiro: 'Ana Lima', dataIso: '2026-01-27T17:00:00Z', status: 'Em conjunto' },
];

// Filtro: passado fora, cancelado fora, ordem crescente
assert.deepEqual(proximasDoConselheiro(agenda, 'André Soares', agora), ['2026-01-20T17:00:00Z', '2026-02-10T17:00:00Z']);

// Entidade: conselheiro
assert.deepEqual(resolverEntidade('próximo conselho do andré soares', vinculos), { tipo: 'conselheiro', nome: 'André Soares', conselheiros: ['André Soares'] });
// Entidade: membro leva ao conselho dele
assert.deepEqual(resolverEntidade('quando é o conselho do Bruno Teixeira?', vinculos), { tipo: 'membro', nome: 'Bruno Teixeira', conselheiros: ['Ana Lima'] });
// Entidade: CS leva a todos os conselhos da carteira, em ordem alfabética
assert.deepEqual(resolverEntidade('próximo conselho do Marcos', vinculos), { tipo: 'cs', nome: 'Marcos', conselheiros: ['Ana Lima', 'André Soares'] });
// Sem entidade reconhecida
assert.equal(resolverEntidade('próximo conselho de quem?', vinculos), null);

// Resposta para conselheiro: formato da especificação, sem linha de cabeçalho de conselho
const resp = responderProximasReunioes('próximo conselho do André Soares', vinculos, agenda, agora);
assert.equal(resp, '📆 Próximas Reuniões:\n\n- 20/01 às 14h (Terça)\n- 10/02 às 14h (Terça)');

// Sem reunião futura
// Membro sem grupo ativo não resolve conselho: cai no pedido de nome
assert.ok(responderProximasReunioes('próximo conselho do Daniel Rocha', vinculos, agenda, agora).startsWith('De qual conselho?'));
assert.equal(
  responderProximasReunioes('quando acontece o conselho da Ana Lima', vinculos, [], agora),
  'Nenhuma reunião futura cadastrada para o conselho Ana Lima.',
);

// CS com vários conselhos: um bloco por conselho, precedido da linha Conselho X
const respCs = responderProximasReunioes('próximo conselho do Marcos', vinculos, agenda, agora);
assert.equal(respCs,
  'Conselho Ana Lima\n📆 Próximas Reuniões:\n\n- 27/01 às 14h (Terça)\n\n' +
  'Conselho André Soares\n📆 Próximas Reuniões:\n\n- 20/01 às 14h (Terça)\n- 10/02 às 14h (Terça)');

// Sem entidade: pede o nome e mostra os três conselhos com reunião mais próxima como atalhos
const semEntidade = responderProximasReunioes('próximo conselho', vinculos, agenda, agora);
assert.ok(semEntidade.startsWith('De qual conselho? Escreva o nome do conselheiro, do membro ou do CS.'));
assert.ok(semEntidade.includes('- Conselho Ana Lima: 27/01 às 14h (Terça)'));
assert.ok(semEntidade.includes('- Conselho André Soares: 20/01 às 14h (Terça)'));

console.log('próximas reuniões: todos os casos passaram');
