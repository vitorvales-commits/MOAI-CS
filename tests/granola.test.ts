// Roda com: node --experimental-strip-types tests/granola.test.ts
// Casos da sincronização do Granola (08/10/2026): fontes inválidas sem vazar a chave, vínculo automático,
// pendente por zero e por dois CS, desconto do email do gestor, normalização da transcrição e a linha
// gravada sem private_notes.
import assert from 'node:assert/strict';
import {
  lerFontes,
  participantesDaNota,
  vincularCS,
  dataReuniao,
  normalizarTranscricao,
  idNotaValido,
  linhaGranola,
} from '../supabase/functions/granola-sync/logica.ts';

const CHAVE_FALSA = 'grn_CHAVE_DE_TESTE_NAO_REAL_123';

// --- lerFontes ---
const lidas = lerFontes([
  { gestor: 'Vitor@MOAI.com', chave: CHAVE_FALSA, pasta: 'fol_abc' },
  { gestor: 'semchave@moai.com', chave: '', pasta: 'fol_abc' },
  { gestor: 'sempasta@moai.com', chave: CHAVE_FALSA, pasta: '' },
  { gestor: 'sememail', chave: CHAVE_FALSA, pasta: 'fol_xyz' },
  { gestor: 'chaveerrada@moai.com', chave: 'token_qualquer', pasta: 'fol_xyz' },
]);
assert.equal(lidas.fontes.length, 1, 'só a fonte completa e válida passa');
assert.equal(lidas.fontes[0].gestor, 'vitor@moai.com', 'gestor normalizado em minúsculas');
assert.equal(lidas.descartes.length, 4, 'as quatro fontes inválidas são descartadas');
assert.ok(!JSON.stringify(lidas.descartes).includes(CHAVE_FALSA), 'descarte nunca traz a chave');
assert.ok(!JSON.stringify(lidas.descartes).includes('token_qualquer'), 'descarte nunca traz o valor da chave');
assert.deepEqual(lerFontes('texto solto').fontes, [], 'secret que não é lista não gera fonte');

// --- participantesDaNota ---
const nota = {
  attendees: [{ email: 'Marcos@moaiclubedelideres.com' }, { email: 'vitor@moai.com' }, { email: null }],
  calendar_event: { invitees: [{ email: 'marcos@moaiclubedelideres.com' }, { email: 'Outra@x.com' }] },
};
assert.deepEqual(participantesDaNota(nota), ['marcos@moaiclubedelideres.com', 'vitor@moai.com', 'outra@x.com'], 'minúsculos, únicos, sem nulos');
assert.deepEqual(participantesDaNota({ attendees: null, calendar_event: null }), [], 'nota sem participantes');

// --- vincularCS ---
const mapa = new Map([['marcos@moaiclubedelideres.com', 'Marcos'], ['vilker@moaiclubedelideres.com', 'Vilker']]);
const gestores = new Set(['vitor@moai.com']);
assert.deepEqual(vincularCS(['marcos@moaiclubedelideres.com', 'vitor@moai.com'], gestores, mapa), { cs: 'Marcos', vinculo: 'auto' }, 'um CS e o gestor: vínculo automático');
assert.deepEqual(vincularCS(['vitor@moai.com', 'x@x.com'], gestores, mapa), { cs: null, vinculo: 'pendente' }, 'zero CS: pendente');
assert.deepEqual(vincularCS(['marcos@moaiclubedelideres.com', 'vilker@moaiclubedelideres.com'], gestores, mapa), { cs: null, vinculo: 'pendente' }, 'dois CS: pendente, resolvido pelo gestor');
assert.deepEqual(vincularCS(['vitor@moai.com'], gestores, mapa), { cs: null, vinculo: 'pendente' }, 'só o gestor na reunião: pendente');
assert.deepEqual(vincularCS(['marcos@moaiclubedelideres.com', 'marcos@moaiclubedelideres.com'], gestores, mapa), { cs: 'Marcos', vinculo: 'auto' }, 'mesmo CS repetido conta uma vez');

// --- dataReuniao ---
assert.equal(dataReuniao({ calendar_event: { scheduled_start_time: '2026-10-07T13:00:00Z' }, created_at: '2026-10-07T12:00:00Z' }), '2026-10-07T13:00:00Z', 'horário do calendário primeiro');
assert.equal(dataReuniao({ calendar_event: null, created_at: '2026-10-07T12:00:00Z' }), '2026-10-07T12:00:00Z', 'sem calendário, usa a criação');

// --- normalizarTranscricao ---
const segs = normalizarTranscricao([
  { speaker: { source: 'microphone', attribution: 'me', name: 'Vitor' }, text: ' Como foi a semana? ', start_time: '00:00:01' },
  { speaker: { source: 'system', attribution: 'me' }, text: 'Tudo bem', start_time: '00:00:05' },
  { speaker: { source: 'system', attribution: 'them' }, text: 'Foi ótima', start_time: '00:00:09' },
  { speaker: { source: 'system', attribution: 'outro' }, text: 'Alguém', start_time: null },
  { speaker: { source: 'system', attribution: 'them' }, text: '   ', start_time: '00:00:12' },
]);
assert.deepEqual(segs, [
  { quem: 'Vitor', texto: 'Como foi a semana?', inicio: '00:00:01' },
  { quem: 'Liderança', texto: 'Tudo bem', inicio: '00:00:05' },
  { quem: 'Liderado', texto: 'Foi ótima', inicio: '00:00:09' },
  { quem: 'Participante', texto: 'Alguém', inicio: null },
], 'quem fala: nome, depois attribution; texto vazio fica de fora');
assert.equal(normalizarTranscricao(null), null, 'sem transcrição, null');

// --- idNotaValido ---
assert.equal(idNotaValido('not_ABCDEFGHIJKLMN'), true, 'id com 14 caracteres');
assert.equal(idNotaValido('not_ABC'), false, 'id curto');
assert.equal(idNotaValido(undefined), false, 'id ausente');

// --- linhaGranola ---
const notaCompleta = {
  id: 'not_ABCDEFGHIJKLMN', title: 'Reunião com Marcos', created_at: '2026-10-07T12:00:00Z', updated_at: '2026-10-07T14:00:00Z',
  web_url: 'https://notes.granola.ai/d/x', summary_markdown: '## Resumo', summary_text: 'texto',
  private_notes_text: 'NAO_PODE_SAIR', private_notes_markdown: 'NAO_PODE_SAIR', deleted_at: null,
};
const linha = linhaGranola(notaCompleta, { gestor: 'vitor@moai.com', chave: CHAVE_FALSA, pasta: 'fol_abc' }, { cs: 'Marcos', vinculo: 'auto' }, ['marcos@moaiclubedelideres.com'], [{ quem: 'Liderança', texto: 'oi', inicio: null }]);
assert.ok(linha, 'linha gerada');
assert.equal(linha!.resumo_markdown, '## Resumo', 'usa summary_markdown antes de summary_text');
assert.equal(linha!.cs_nome, 'Marcos');
assert.equal(linha!.vinculo, 'auto');
assert.equal(linha!.excluida_no_granola, false);
const serializada = JSON.stringify(linha);
assert.ok(!serializada.includes('NAO_PODE_SAIR'), 'private_notes_* nunca entra na linha');
assert.ok(!serializada.includes(CHAVE_FALSA), 'a chave nunca entra na linha');
assert.ok(!('private_notes_text' in linha!) && !('private_notes_markdown' in linha!), 'nenhuma coluna private_notes na linha');

const semTranscricao = linhaGranola(notaCompleta, { gestor: 'vitor@moai.com', chave: CHAVE_FALSA, pasta: 'fol_abc' }, { cs: null, vinculo: 'pendente' }, [], undefined);
assert.ok(!('transcricao' in semTranscricao!), 'transcrição não buscada (expurgada) não entra no upsert e o valor do banco fica');

assert.equal(linhaGranola({ ...notaCompleta, id: 'nao_valido' }, { gestor: 'a@a.com', chave: CHAVE_FALSA, pasta: 'fol_1' }, { cs: null, vinculo: 'pendente' }, [], null), null, 'id inválido não gera linha');

const comApagada = linhaGranola({ ...notaCompleta, deleted_at: '2026-10-08T00:00:00Z' }, { gestor: 'a@a.com', chave: CHAVE_FALSA, pasta: 'fol_1' }, { cs: null, vinculo: 'pendente' }, [], null);
assert.equal(comApagada!.excluida_no_granola, true, 'nota apagada no Granola marca excluida_no_granola');

console.log('granola: todos os casos passaram');
