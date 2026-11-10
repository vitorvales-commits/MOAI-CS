// Roda com: npx tsx tests/conselho-conjunto.test.ts
// Casamento agenda -> grupos de Executivo (10/11/2026): conselho conjunto "Rafael e Rodrigo Gianesini" casa com os dois
// grupos pelos conselheiros vinculados, e o caso Henrique Guimarães (nome com anotação e erro de grafia) segue sem regressão.
import assert from 'node:assert/strict';
import { conjuntosDaAgenda, chavesDaAgenda } from '../lib/agenda-nomes.ts';
import { resolverEncontrosAgenda, generateAgendaVisual } from '../lib/reports.ts';

const grupos = [
  { group_id: 'g_mateus', titulo: 'Executivo | Rafael Gianesini (Mateus)', is_repo: false, congelado: false, repo_group_id: 'r_rafael' },
  { group_id: 'g_george', titulo: 'Executivo | Rodrigo Gianesini (George)', is_repo: false, congelado: false, repo_group_id: 'r_rodrigo' },
  { group_id: 'g_vitor', titulo: 'Executivo | Henrique Guimaraes (Vitor)', is_repo: false, congelado: false, repo_group_id: 'r_henrique' },
  { group_id: 'r_rafael', titulo: 'Reposições no Executivo | Rafael Gianesini', is_repo: true, congelado: false, repo_group_id: null },
];

// Vínculos como estão no banco: dois cadastros para o nome conjunto; um cadastro para cada nome individual.
const vinculos = [
  { nome_agenda: 'Rafael e Rodrigo Gianesini', conselheiro_monday_item_id: 10866398560 },
  { nome_agenda: 'Rafael e Rodrigo Gianesini', conselheiro_monday_item_id: 10866387336 },
  { nome_agenda: 'Rafael Gianesini', conselheiro_monday_item_id: 10866398560 },
  { nome_agenda: 'Henrique Guimaraes', conselheiro_monday_item_id: 13222360032 },
];
const cadastros = [
  { monday_item_id: 10866398560, nome: 'Rafael GIanesini' },
  { monday_item_id: 10866387336, nome: 'Rodrigo Gianesini' },
  { monday_item_id: 13222360032, nome: 'Henrique Guimarães' },
];
const conjuntos = conjuntosDaAgenda(vinculos, cadastros);

// Nome só é conjunto com dois ou mais conselheiros; os individuais não entram.
assert.deepEqual(Array.from(conjuntos.keys()), ['Rafael e Rodrigo Gianesini']);
assert.deepEqual(conjuntos.get('Rafael e Rodrigo Gianesini'), ['Rafael GIanesini', 'Rodrigo Gianesini']);
assert.deepEqual(chavesDaAgenda('Rafael e Rodrigo Gianesini', conjuntos), ['rafael gianesini', 'rodrigo gianesini']);
assert.deepEqual(chavesDaAgenda('Rafael Gianesini', conjuntos), ['rafael gianesini']);

const agenda = [
  // Encontro de 12/11/2026 às 14h de Brasília (17h UTC), status Confirmado.
  { id: 12898643862, conselheiro_nome: 'Rafael e Rodrigo Gianesini', data_iso: '2026-11-12T17:00:00+00:00', status: 'Confirmado' },
  // Caso Henrique Guimarães: anotação entre colchetes e erro de grafia, casado pela regra tolerante.
  { id: 13000000001, conselheiro_nome: 'Henrique Guimalhaes [André Froes]', data_iso: '2026-11-05T17:00:00+00:00', status: 'Confirmado' },
  // Nome individual de um conselheiro: continua casando só com o próprio grupo.
  { id: 12000000002, conselheiro_nome: 'Rafael Gianesini', data_iso: '2026-10-21T17:00:00+00:00', status: 'Confirmado' },
];

// Com vínculos: o encontro conjunto gera uma linha por grupo, com o mesmo agenda_item_id.
const comVinculo = resolverEncontrosAgenda({ conselhosGrupos: grupos, agenda, conjuntosAgenda: conjuntos } as any);
const doConjunto = comVinculo.resolvidos.filter((r) => r.agenda_item_id === 12898643862).map((r) => r.group_id).sort();
assert.deepEqual(doConjunto, ['g_george', 'g_mateus'], 'o conselho conjunto precisa cair nos dois grupos');
assert.equal(comVinculo.semGrupo.some((r) => r.id === 12898643862), false, 'o conselho conjunto não pode ficar sem grupo');

assert.deepEqual(comVinculo.resolvidos.filter((r) => r.agenda_item_id === 13000000001).map((r) => r.group_id), ['g_vitor'],
  'Henrique Guimalhaes [André Froes] tem que continuar casando com Henrique Guimaraes (Vitor)');
assert.deepEqual(comVinculo.resolvidos.filter((r) => r.agenda_item_id === 12000000002).map((r) => r.group_id), ['g_mateus'],
  'nome individual casa só com o próprio grupo');

// Sem vínculos carregados, o nome conjunto não casa com nada pelo texto: fica fora, e não casa com um grupo por semelhança.
const semVinculo = resolverEncontrosAgenda({ conselhosGrupos: grupos, agenda, conjuntosAgenda: new Map() } as any);
assert.equal(semVinculo.resolvidos.some((r) => r.agenda_item_id === 12898643862), false);
assert.equal(semVinculo.semGrupo.some((r) => r.id === 12898643862), true);

// Agenda visual: o encontro conjunto aparece UMA vez, com os dois nomes; o cartão mostra o pior grupo e cada grupo
// traz os próprios confirmados. Mateus tem 2 confirmados, George tem 1: o pior é George.
const membros = [
  { id: 1, nome: 'Membro M1', group_id: 'g_mateus' }, { id: 2, nome: 'Membro M2', group_id: 'g_mateus' }, { id: 3, nome: 'Membro M3', group_id: 'g_mateus' },
  { id: 4, nome: 'Membro G1', group_id: 'g_george' }, { id: 5, nome: 'Membro G2', group_id: 'g_george' }, { id: 6, nome: 'Membro G3', group_id: 'g_george' },
];
const statusMensal = [
  { membro_id: 1, mes: 'Novembro', status: 'Confirmado' }, { membro_id: 2, mes: 'Novembro', status: 'Confirmado' }, { membro_id: 3, mes: 'Novembro', status: 'Agd. Confirmação' },
  { membro_id: 4, mes: 'Novembro', status: 'Confirmado' }, { membro_id: 5, mes: 'Novembro', status: 'Não vai' }, { membro_id: 6, mes: 'Novembro', status: 'Agd. Confirmação' },
];
const dadosVisual = {
  conselhosGrupos: grupos, conselhosMembros: membros, conselhosStatusMensal: statusMensal,
  agenda, rounds: [], conselheiros: cadastros.map((c) => ({ monday_item_id: c.monday_item_id, nome: c.nome })),
  vinculoAgenda: vinculos, conjuntosAgenda: conjuntos,
};
async function testeAgendaVisual() {
 const visual = await generateAgendaVisual(null as any, '2026-11-09', '2026-11-16', dadosVisual as any);
const cartoes = visual.conselhos.filter((c) => c.dataIso === '2026-11-12T17:00:00+00:00');
assert.equal(cartoes.length, 1, 'o conselho conjunto aparece uma única vez na agenda');
const cartao = cartoes[0];
assert.equal(cartao.conselheiroNome, 'Rafael e Rodrigo Gianesini');
assert.deepEqual(cartao.grupos.map((g) => g.nomeGrupo).sort(), ['Executivo | Rafael Gianesini (Mateus)', 'Executivo | Rodrigo Gianesini (George)']);
const porGrupo = Object.fromEntries(cartao.grupos.map((g) => [g.groupId, g.confirmadosQtd]));
assert.deepEqual(porGrupo, { g_mateus: 2, g_george: 1 }, 'confirmados são contados por grupo');
assert.equal(cartao.groupId, 'g_george', 'o cartão aponta para o pior grupo');
assert.equal(cartao.confirmadosQtd, 1);
assert.equal(cartao.faixa, 'vermelho', 'o semáforo do cartão é o pior entre os grupos');
assert.equal(cartao.precisaCobranca, true);
}
testeAgendaVisual().then(() => console.log('conselho-conjunto: ok'));

