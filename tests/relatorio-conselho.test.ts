// Relatório do conselho: validação do formulário, resumo por CS, frases de estado e prioridade no foco de hoje.
// Roda com: npx tsx tests/relatorio-conselho.test.ts
import assert from 'node:assert/strict';
import { validarRelatorio, resumoRelatoriosPorCS, fraseEstadoRelatorio, encontroDeLinha, CATEGORIAS_FALTA, AVALIACOES_ENCONTRO } from '../lib/relatorio-conselho.ts';
import { focoDoDia, type RelatorioFoco } from '../lib/home-regras.ts';

const ok = { avaliacao: 'Bom', avanco: 'Fechamos o plano de expansão.', membroAtencaoId: null, membroAtencaoMotivo: '', combinado: '', faltas: [] };
const faltas = [{ membroId: 1, nome: 'Ana', tipo: 'falta' as const }, { membroId: 2, nome: 'Beto', tipo: 'desistencia' as const }];

// ---- campos obrigatórios e limites ----
assert.deepEqual(validarRelatorio(ok, []), []);
assert.deepEqual(AVALIACOES_ENCONTRO, ['Muito bom', 'Bom', 'Regular', 'Ruim']);
assert.equal(CATEGORIAS_FALTA.length, 6);
assert.ok(validarRelatorio({ ...ok, avaliacao: '' }, []).some((m) => m.includes('como foi o encontro')));
assert.ok(validarRelatorio({ ...ok, avanco: '   ' }, []).some((m) => m.includes('avanço')));
assert.deepEqual(validarRelatorio({ ...ok, avanco: 'x'.repeat(280) }, []), [], '280 caracteres cabem');
assert.equal(validarRelatorio({ ...ok, avanco: 'x'.repeat(281) }, []).length, 1, '281 não cabe');
assert.equal(validarRelatorio({ ...ok, combinado: 'x'.repeat(281) }, []).length, 1);

// ---- membro em atenção exige motivo de até 200 ----
assert.equal(validarRelatorio({ ...ok, membroAtencaoId: 7, membroAtencaoMotivo: '' }, []).length, 1);
assert.deepEqual(validarRelatorio({ ...ok, membroAtencaoId: 7, membroAtencaoMotivo: 'x'.repeat(200) }, []), []);
assert.equal(validarRelatorio({ ...ok, membroAtencaoId: 7, membroAtencaoMotivo: 'x'.repeat(201) }, []).length, 1);
assert.deepEqual(validarRelatorio({ ...ok, membroAtencaoId: null, membroAtencaoMotivo: 'solto' }, []), [], 'motivo sem membro é ignorado');

// ---- falta de quem confirmou exige categoria e justificativa; desistência não ----
assert.equal(validarRelatorio(ok, faltas).length, 2, 'sem item para a falta da Ana: categoria e justificativa');
assert.deepEqual(validarRelatorio({ ...ok, faltas: [{ membroId: 1, categoria: 'Viagem', justificativa: 'Voo cancelado' }] }, faltas), [], 'desistência de Beto não exige nada');
assert.equal(validarRelatorio({ ...ok, faltas: [{ membroId: 1, categoria: 'Inventada', justificativa: 'x' }] }, faltas).length, 1, 'categoria fora da lista');
assert.equal(validarRelatorio({ ...ok, faltas: [{ membroId: 1, categoria: 'Saúde', justificativa: 'x'.repeat(201) }] }, faltas).length, 1);

// ---- resumo por CS: atrasados primeiro ----
const r = resumoRelatoriosPorCS([
  { cs: 'Vitor', estado: 'a_preencher', diasRestantes: 5 },
  { cs: 'Rodrigo', estado: 'atrasado', diasRestantes: -9 },
  { cs: 'Rodrigo', estado: 'atrasado', diasRestantes: -2 },
  { cs: 'Rodrigo', estado: 'vence_hoje', diasRestantes: 0 },
  { cs: 'Iasmin', estado: 'atrasado', diasRestantes: -1 },
  { cs: 'Mateus', estado: 'enviado_no_prazo', diasRestantes: -3 },
  { cs: null, estado: 'atrasado', diasRestantes: -4 },
]);
assert.deepEqual(r.map((x) => [x.cs, x.pendentes, x.atrasados, x.maiorAtrasoDias]), [['Rodrigo', 1, 2, 9], ['Iasmin', 0, 1, 1], ['Vitor', 1, 0, 0]]);

// ---- frases ----
assert.equal(fraseEstadoRelatorio('atrasado', -2), 'Atrasado há 2 dias');
assert.equal(fraseEstadoRelatorio('atrasado', -1), 'Atrasado há 1 dia');
assert.equal(fraseEstadoRelatorio('vence_hoje', 0), 'O prazo vence hoje');
assert.equal(fraseEstadoRelatorio('a_preencher', 1), 'Falta 1 dia para o prazo');
assert.equal(fraseEstadoRelatorio('a_preencher', 5), 'Faltam 5 dias para o prazo');

// ---- linha do banco para o formato do código ----
const e = encontroDeLinha({ group_id: 'g', conselho: 'C (X)', cs_nome: 'X', data_encontro: '2026-10-06T17:00:00Z', prazo: '2026-10-15T02:59:59Z', estado: 'atrasado', dias_restantes: -9,
  relatorio_id: null, enviado_em: null, avaliacao: null, faltas: [{ membro_id: '10', nome: 'Ana', tipo: 'falta', categoria: null, justificativa: null }], faltas_sem_justificativa: 1, presenca_pendente: 0 });
assert.deepEqual([e.groupId, e.faltas[0].membroId, e.faltasSemJustificativa], ['g', 10, 1]);

// ---- foco de hoje: relatório vencendo em até 2 dias ou atrasado passa à frente do GTD ----
const rel = (estado: RelatorioFoco['estado'], dias: number, conselho = 'Fast Track 04'): RelatorioFoco => ({ groupId: 'g', conselho, dataEncontro: '2026-10-14T17:00:00Z', estado, diasRestantes: dias });
const conselhoUrgente = { nome: 'Executivo 02', diasAte: 1, confirmados: 2, membros: 10, gtdAtrasadas: 3 };
const base = { conselhos: [conselhoUrgente], reportDiasAtePrazo: 0, metas: [], proximo: null };
assert.equal(focoDoDia({ ...base, relatorios: [rel('atrasado', -3)] }).tipo, 'relatorio', 'atrasado vence GTD e report');
assert.equal(focoDoDia({ ...base, relatorios: [rel('a_preencher', 2)] }).tipo, 'relatorio', 'vence em 2 dias vence GTD');
assert.equal(focoDoDia({ ...base, relatorios: [rel('a_preencher', 3)] }).tipo, 'conselho', 'com 3 dias o GTD ainda vem antes');
assert.equal(focoDoDia({ conselhos: [], reportDiasAtePrazo: 0, metas: [], proximo: null, relatorios: [rel('a_preencher', 5)] }).tipo, 'report', 'relatório calmo fica depois do report');
assert.equal(focoDoDia({ conselhos: [], reportDiasAtePrazo: null, metas: [], proximo: null, relatorios: [rel('a_preencher', 5)] }).tipo, 'relatorio', 'relatório calmo vem antes de meta e de tudo em dia');
const mais = focoDoDia({ ...base, relatorios: [rel('a_preencher', 1, 'A'), rel('atrasado', -4, 'B'), rel('atrasado', -1, 'C')] });
assert.equal(mais.relatorio?.conselho, 'B', 'o mais atrasado primeiro');
assert.equal(mais.titulo, 'Preencher o relatório do conselho B');
assert.equal(mais.texto, 'O prazo venceu há 4 dias. Cada relatório atrasado gera 5 pontos.');
assert.equal(focoDoDia({ ...base, relatorios: [rel('vence_hoje', 0)] }).texto, 'O prazo vence hoje, às 23h59.');
assert.equal(focoDoDia({ ...base, relatorios: [] }).tipo, 'conselho', 'sem relatórios nada muda');
for (const t of [mais.titulo, mais.texto, fraseEstadoRelatorio('atrasado', -3)]) assert.ok(!/[–—]/.test(t) && !/\w-\w/.test(t), 'sem travessão nem hífen: ' + t);

console.log('relatorio-conselho: todos os testes aprovados');
