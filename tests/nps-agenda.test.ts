// Roda com: npx tsx tests/nps-agenda.test.ts
// Casamento agenda -> grupo do NPS (revisão out/2026, rodada 2, Parte B).
import assert from 'node:assert/strict';
import { casarGruposDoConselheiro, conselheiroDoTitulo, chaveNome, coberturaNps } from '../lib/nps-agenda.ts';

const grupos = [
  { group_id: 'g_caio', titulo: 'Fast Track | Caio Vivan (George)' },
  { group_id: 'g_pedro', titulo: 'Setorial | Pedro Prado (Vitor)' },
  { group_id: 'g_jp', titulo: 'C-Level | JP (Rodrigo)' },
  { group_id: 'g_bruno1', titulo: 'Fast Track | Bruno Teixeira (Mateus)' },
  { group_id: 'g_bruno2', titulo: 'Setorial | Bruno Teixeira (Mateus)' },
  { group_id: 'g_repo', titulo: 'Repositório | Bruno Teixeira (Mateus)', is_repo: true },
  { group_id: 'g_antigo', titulo: 'Ana Lima [Fast Track]' },
];

// 1) Formato novo: "Fast Track | Caio Vivan (George)" casa com Caio Vivan
assert.equal(conselheiroDoTitulo('Fast Track | Caio Vivan (George)'), 'Caio Vivan');
assert.deepEqual(casarGruposDoConselheiro('Caio Vivan', grupos, {}), ['g_caio']);

// 2) "Setorial | Pedro Prado (Vitor)" casa com Pedro Prado
assert.deepEqual(casarGruposDoConselheiro('Pedro Prado', grupos, {}), ['g_pedro']);

// 3) Alias confirmado: João Pedro vai para o grupo do JP
assert.deepEqual(casarGruposDoConselheiro('João Pedro', grupos), ['group_mktkwg6v']);
assert.deepEqual(casarGruposDoConselheiro('JP', grupos, {}), ['g_jp']);

// 4) Um conselheiro com dois grupos: os dois voltam; o grupo de repositório fica de fora
assert.deepEqual(casarGruposDoConselheiro('Bruno Teixeira', grupos, {}), ['g_bruno1', 'g_bruno2']);

// Formato antigo do título continua funcionando
assert.deepEqual(casarGruposDoConselheiro('Ana Lima', grupos, {}), ['g_antigo']);

// Sem casamento: lista vazia
assert.deepEqual(casarGruposDoConselheiro('Daniel Brayer', grupos, {}), []);
assert.equal(chaveNome('  João  Pedro '), 'joao pedro');

// Cobertura de outubro de 2026: 5 realizados, 4 avaliados (Carol Borges sem resposta), resultado 4 de 5
const gruposOutubro = [
  { group_id: 'novo_grupo46057', titulo: 'Fast Track | Caio Vivan (George)' },
  { group_id: 'novo_grupo8268', titulo: 'Setorial | Pedro Prado (Vitor)' },
  { group_id: 'novo_grupo76506', titulo: 'Fast Track | Bruno Teixeira (Marcos)' },
  { group_id: 'group_mktkwg6v', titulo: 'C-Level | JP (Rodrigo)' },
  { group_id: 'group_title', titulo: 'C-Level | Carol Borges (Vitor)' },
];
const agenda = [
  { conselheiro_nome: 'Caio Vivan', data_iso: '2026-10-02T12:00:00Z', status: 'Executado' },
  { conselheiro_nome: 'João Pedro', data_iso: '2026-10-06T12:00:00Z', status: 'Executado' },
  { conselheiro_nome: 'Bruno Teixeira', data_iso: '2026-10-07T12:00:00Z', status: 'Executado' },
  { conselheiro_nome: 'Pedro Prado', data_iso: '2026-10-07T12:00:00Z', status: 'Executado' },
  { conselheiro_nome: 'Carol Borges', data_iso: '2026-10-09T12:00:00Z', status: 'Confirmado' },
  { conselheiro_nome: 'Daniel Brayer', data_iso: '2026-10-15T12:00:00Z', status: 'Em conjunto' },
  { conselheiro_nome: 'Cancelado Teste', data_iso: '2026-10-16T12:00:00Z', status: 'Cancelado' },
];
// Respostas de outubro: Bruno 8, Pedro 4, Caio 6, JP 9 (27 no total, em 4 conselhos)
const respostas = [
  ...Array.from({ length: 8 }, () => ({ group_id: 'novo_grupo76506' })),
  ...Array.from({ length: 4 }, () => ({ group_id: 'novo_grupo8268' })),
  ...Array.from({ length: 6 }, () => ({ group_id: 'novo_grupo46057' })),
  ...Array.from({ length: 9 }, () => ({ group_id: 'group_mktkwg6v' })),
];
const gruposDe = (nome: string) => casarGruposDoConselheiro(nome, gruposOutubro);
const cob = coberturaNps(agenda, respostas, '2026-10', new Date('2026-10-09T15:00:00Z'), gruposDe);
assert.equal(cob.realizados, 5);
assert.equal(cob.avaliados, 4);
assert.equal(`${cob.avaliados} de ${cob.realizados}`, '4 de 5');
assert.deepEqual(cob.detalhe.find((d) => d.conselheiro === 'Carol Borges'), { conselheiro: 'Carol Borges', avaliado: false, respostas: 0 });
assert.equal(cob.previstos, 6); // cancelado fica de fora
assert.deepEqual(cob.proximos, [{ conselheiro: 'Daniel Brayer', dataIso: '2026-10-15T12:00:00Z' }]);

console.log('casamento agenda e grupo e cobertura: todos os casos passaram');
