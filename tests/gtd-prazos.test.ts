// Roda com: node --experimental-strip-types tests/gtd-prazos.test.ts
// Portado da lógica de referência do prompt de 07/10/2026 (seção 6, GTD).
import assert from 'node:assert/strict';
import { prazoEtapaGTD, cicloAberto, statusEtapaGTD, etapasPendentes, chaveEtapaGTD, hojeSP } from '../lib/gtd-prazos.ts';

// prazos da tabela, nunca do prefixo do rótulo
assert.equal(prazoEtapaGTD('D+9 Confirmação Individual e Anúncio da Data', '2026-10-30'), '2026-10-21', 'o rótulo diz D+9, o prazo real é 9 dias ANTES');
assert.equal(prazoEtapaGTD('D+5 Confirmação no grupo', '2026-10-30'), '2026-10-25');
assert.equal(prazoEtapaGTD('D-1 Verificar a jornada', '2026-10-30'), '2026-10-29');
assert.equal(prazoEtapaGTD('D+9 Follow do Encaminhamento', '2026-10-30'), '2026-11-08');
assert.equal(prazoEtapaGTD('D+2 Encaminhamentos', '2026-10-30'), '2026-11-01');
assert.equal(prazoEtapaGTD('D+2 Cuidei dos membros que não foram', '2026-10-30'), '2026-11-01');
assert.equal(prazoEtapaGTD('D+4 Gestão de Conhecimento', '2026-10-30'), '2026-11-03');
assert.equal(prazoEtapaGTD('D+7 Fiz e registrei meus matchmakings', '2026-10-30'), '2026-11-06');
assert.equal(prazoEtapaGTD('D+8 Mapeei oportunidades de upsells', '2026-10-30'), '2026-11-07');
assert.equal(prazoEtapaGTD('Rótulo desconhecido', '2026-10-30'), null);
assert.equal(chaveEtapaGTD('D+9 Follow do Encaminhamento'), 'follow_encaminhamento', 'follow não vira encaminhamentos');
assert.equal(chaveEtapaGTD('D+2 Encaminhamentos'), 'encaminhamentos');

// ciclo aberto até D+14
assert.equal(cicloAberto('2026-09-23', '2026-10-07'), true);
assert.equal(cicloAberto('2026-09-23', '2026-10-07'), true);
assert.equal(cicloAberto('2026-09-23', '2026-10-08'), false, 'D+15 já fechou');
assert.equal(cicloAberto('2026-09-02', '2026-10-07'), false, 'ciclo de 02/09 está fechado');
assert.equal(cicloAberto(null, '2026-10-07'), false);

const hoje = '2026-10-07';
assert.equal(statusEtapaGTD('D+9 Confirmação Individual e Anúncio da Data', false, '2026-10-12', hoje).status, 'atrasada');
assert.equal(statusEtapaGTD('D+9 Confirmação Individual e Anúncio da Data', false, '2026-10-12', hoje).dias, 4);
assert.deepEqual(statusEtapaGTD('D+5 Confirmação no grupo', false, '2026-10-12', hoje), { status: 'a_vencer', prazo: '2026-10-07', dias: 0 }, 'vence hoje');
assert.equal(statusEtapaGTD('D+2 Encaminhamentos', false, '2026-10-12', hoje).status, 'a_vencer');
assert.equal(statusEtapaGTD('D+4 Gestão de Conhecimento', false, '2026-10-12', hoje).status, 'futura');
assert.equal(statusEtapaGTD('D+8 Mapeei oportunidades de upsells', true, '2026-10-12', hoje).status, 'feita');
assert.equal(statusEtapaGTD('D+9 Follow do Encaminhamento', false, '2026-09-02', hoje).status, 'ciclo_fechado');
assert.equal(statusEtapaGTD('Rótulo desconhecido', false, '2026-10-12', hoje).status, 'sem_prazo');

// lista de pendências só de ciclos abertos
const e = (label: string, feito = false) => ({ label, feito });
const linhas = [
  { id_item_conselho: '1', membro: 'A', cs_responsavel: 'Marcos', data_conselho: '2026-10-12', etapas: [e('D+9 Confirmação Individual e Anúncio da Data'), e('D+5 Confirmação no grupo'), e('D+4 Gestão de Conhecimento'), e('Desconhecida')] },
  { id_item_conselho: '2', membro: 'B', cs_responsavel: 'Marcos', data_conselho: '2026-09-02', etapas: [e('D+9 Follow do Encaminhamento')] },
];
const r = etapasPendentes(linhas, hoje);
assert.equal(r.pendentes.length, 2); assert.equal(r.ciclosAbertos.length, 1);
assert.deepEqual(r.pendentes.map((p) => p.status).sort(), ['a_vencer', 'atrasada']);
assert.deepEqual(r.naoMapeados, ['Desconhecida']);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(hojeSP()));

console.log('gtd-prazos: testes aprovados');
