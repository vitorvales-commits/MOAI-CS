// Roda com: npx tsx tests/vitorio-titulo.test.ts
// Título de exibição sem o CS entre parênteses, reutilizado nas respostas; "| EXTERNO" depois do parêntese é preservado.
import assert from 'node:assert/strict';
import { tituloDeExibicao } from '../lib/vitorio/titulo.ts';
import { responderCarteira, type DadosTime } from '../lib/vitorio/time-carteira.ts';

// Com parêntese (o CS atual): sai.
assert.equal(tituloDeExibicao('C-Level | Zago (Vilker)'), 'C-Level | Zago');
// Sem parêntese: fica igual.
assert.equal(tituloDeExibicao('Setorial | Tarso'), 'Setorial | Tarso');
// Com "| EXTERNO" depois do parêntese: o sufixo é preservado.
assert.equal(tituloDeExibicao('Executivo | João Vitor (Mateus) | EXTERNO'), 'Executivo | João Vitor | EXTERNO');
// Espaços sobrando não entram na saída.
assert.equal(tituloDeExibicao('  C-Level   |  Gallo  (Vitor)  '), 'C-Level | Gallo');

// A frase de carteira usa o título limpo, mesmo quando o CS entre parênteses não é o da data.
const dados: DadosTime = {
  hojeIso: '2026-11-11',
  periodos: [],
  ativosHoje: ['Amanda'],
  vigencias: [{ group_id: 'g1', cs_id: 5, inicio: '-infinity', fim: null }],
  csPorId: { 5: 'Amanda' },
  conselhos: { g1: 'C-Level | Zago (Vilker)' },
};
const r = responderCarteira('g1', '2026-11-05', dados);
assert.equal(r.texto, 'O conselho C-Level | Zago estava com Amanda em 05/11/2026.');
assert.doesNotMatch(r.texto, /\(Vilker\)/);

console.log('ok vitorio-titulo');
