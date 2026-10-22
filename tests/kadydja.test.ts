// Roda com: npx tsx tests/kadydja.test.ts
// Caso real de 22/10/2026: o conselho "Executivo | Kadydja (Rodrigo)" sumia da carteira do Rodrigo nas telas que
// ligam o GTD e a agenda ao conselho por nome. Causas: o membro do GTD vem como "Kadydja (?)", a agenda traz
// "Kadydja Albuquerque" e o título do grupo traz "Kadydja".
import assert from 'node:assert/strict';
import { gtdDoConselho } from '../lib/gtd.ts';
import { chaveAgenda } from '../lib/agenda-nomes.ts';
import { casarGruposDoConselheiro } from '../lib/nps-agenda.ts';
import { montarVinculos, responderProximasReunioes } from '../lib/consulta/proximas-reunioes.ts';

// 1) GTD: "Kadydja (?)" liga ao contato "Kadydja"
const historico = [
  { id_item_conselho: 'i1', membro: 'Kadydja (?)', cs_responsavel: 'Rodrigo', data_conselho: '2026-10-23', data_snapshot: null, taxa_cumprimento: 50, etapas: [], etapas_atrasadas: [] },
  { id_item_conselho: 'i1', membro: 'Kadydja (?)', cs_responsavel: 'Rodrigo', data_conselho: '2026-09-18', data_snapshot: null, taxa_cumprimento: 100, etapas: [], etapas_atrasadas: [] },
];
const gtd = gtdDoConselho(historico as any, 'Kadydja', chaveAgenda, '2026-10-22');
assert.equal(gtd.vinculado, true);
assert.equal(gtd.ciclos.length, 2);
assert.equal(gtdDoConselho(historico as any, 'Kadydja', (s) => s.toLowerCase().trim(), '2026-10-22').vinculado, false, 'sem a correção não vinculava');

// 2) NPS: a agenda "Kadydja Albuquerque" casa com o grupo do título
const grupos = [
  { group_id: 'novo_grupo65945', titulo: 'Executivo | Kadydja (Rodrigo)' },
  { group_id: 'group_mkz5tsgn', titulo: 'Reposições no Executivo | Kadydja', is_repo: true },
  { group_id: 'novo_grupo33254', titulo: 'Executivo | André Soares (Rodrigo)' },
];
assert.deepEqual(casarGruposDoConselheiro('Kadydja Albuquerque', grupos, {}), ['novo_grupo65945']);
assert.deepEqual(casarGruposDoConselheiro('Kadydja', grupos, {}), ['novo_grupo65945']);

// 3) Consulta: as reuniões do Rodrigo incluem a Kadydja, mesmo com a agenda em dois nomes
const agenda = [
  { conselheiro_nome: 'Kadydja Albuquerque', data_iso: '2026-06-26T17:00:00Z', status: 'Executado' },
  { conselheiro_nome: 'Kadydja', data_iso: '2026-10-23T17:00:00Z', status: 'Confirmado' },
  { conselheiro_nome: 'Kadydja', data_iso: '2026-11-20T17:00:00Z', status: null },
  { conselheiro_nome: 'André Soares', data_iso: '2026-11-10T17:00:00Z', status: null },
];
const { vinculos, agenda: ag } = montarVinculos(agenda, grupos, [{ nome: 'Fulano', group_id: 'novo_grupo65945' }]);
assert.ok(ag.every((a) => a.conselheiro !== 'Kadydja Albuquerque'), 'agenda unificada no contato do título');
const resposta = responderProximasReunioes('próximas reuniões do Rodrigo', vinculos, ag, '2026-10-22T12:00:00Z');
assert.match(resposta, /Conselho Kadydja/);
assert.match(resposta, /23\/10 às 14h/);
assert.match(resposta, /Conselho André Soares/);
console.log('kadydja ok');
