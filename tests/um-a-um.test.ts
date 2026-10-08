// Roda com: node --experimental-strip-types tests/um-a-um.test.ts
// Casos de ordenação, vencido, visão compartilhada (sem privado, sem excluído, sem ponto de atenção)
// e resumo da 1:1 (decisões de 08/10/2026).
import assert from 'node:assert/strict';
import { itemVencido, ordenarItensAbertos, visaoCompartilhada, resumoAbertos, type ItemUmAUm } from '../lib/um-a-um.ts';

const HOJE = '2026-10-08';

function item(over: Partial<ItemUmAUm> & { id: string }): ItemUmAUm {
  return {
    csNome: 'Marcos', registroId: 'r1', tipo: 'passo_liderado', texto: 'Texto de teste',
    visibilidade: 'compartilhado', status: 'backlog', prioridade: 'media', prazo: null, observacao: null,
    criadoEm: '2026-10-01T10:00:00Z', statusAlteradoEm: null, excluidoEm: null, ...over,
  };
}

// --- itemVencido ---
assert.equal(itemVencido(item({ id: 'a', prazo: '2026-10-07' }), HOJE), true, 'prazo passado e aberto é vencido');
assert.equal(itemVencido(item({ id: 'b', prazo: '2026-10-08' }), HOJE), false, 'prazo de hoje ainda não está vencido');
assert.equal(itemVencido(item({ id: 'c', prazo: '2026-10-07', status: 'realizado' }), HOJE), false, 'concluído nunca vence');
assert.equal(itemVencido(item({ id: 'd', prazo: '2026-10-07', excluidoEm: '2026-10-01T00:00:00Z' }), HOJE), false, 'excluído não vence');
assert.equal(itemVencido(item({ id: 'e', prazo: null }), HOJE), false, 'sem prazo não vence');

// --- ordenarItensAbertos ---
const ordem = ordenarItensAbertos([
  item({ id: 'sem-prazo-media', prioridade: 'media' }),
  item({ id: 'alta-futuro', prioridade: 'alta', prazo: '2026-10-20' }),
  item({ id: 'vencido-baixa', prioridade: 'baixa', prazo: '2026-10-01' }),
  item({ id: 'alta-sem-prazo', prioridade: 'alta' }),
  item({ id: 'media-prazo-proximo', prioridade: 'media', prazo: '2026-10-09' }),
  item({ id: 'concluido', status: 'realizado', prioridade: 'alta' }),
  item({ id: 'excluido', excluidoEm: '2026-10-02T00:00:00Z', prioridade: 'alta' }),
  item({ id: 'em-andamento-alta', status: 'em_andamento', prioridade: 'alta', prazo: '2026-10-15' }),
], HOJE).map((i) => i.id);
assert.deepEqual(ordem, [
  'vencido-baixa',          // vencido vem antes de tudo, mesmo baixa prioridade
  'em-andamento-alta',      // alta com prazo mais próximo
  'alta-futuro',            // alta, prazo depois
  'alta-sem-prazo',         // alta sem prazo por último entre as altas
  'media-prazo-proximo',    // média com prazo
  'sem-prazo-media',        // média sem prazo
], 'ordem por vencido, prioridade, prazo, sem prazo por último');

// desempate por criação mais antiga
const mesmoPrazo = ordenarItensAbertos([
  item({ id: 'novo', criadoEm: '2026-10-05T00:00:00Z', prazo: '2026-10-20' }),
  item({ id: 'antigo', criadoEm: '2026-09-01T00:00:00Z', prazo: '2026-10-20' }),
], HOJE).map((i) => i.id);
assert.deepEqual(mesmoPrazo, ['antigo', 'novo'], 'criação mais antiga vem primeiro no desempate');

// --- visaoCompartilhada: segunda trava ---
const registros = [
  { id: 'r1', data: '2026-09-01', resumoCompartilhado: 'Resumo antigo' },
  { id: 'r2', data: '2026-10-01', resumoCompartilhado: 'Resumo recente' },
];
const todos: ItemUmAUm[] = [
  item({ id: 'pl-shared', tipo: 'passo_lideranca', visibilidade: 'compartilhado', registroId: 'r2' }),
  item({ id: 'pl-privado', tipo: 'passo_lideranca', visibilidade: 'privado_gestor', registroId: 'r2' }),
  item({ id: 'pld', tipo: 'passo_liderado', visibilidade: 'compartilhado', registroId: 'r1' }),
  item({ id: 'pld-excluido', tipo: 'passo_liderado', visibilidade: 'compartilhado', excluidoEm: '2026-10-02T00:00:00Z' }),
  // Um ponto de atenção que, por hipótese, veio com visibilidade errada: a trava ainda o esconde.
  item({ id: 'atencao-vazada', tipo: 'ponto_atencao', visibilidade: 'compartilhado' }),
  item({ id: 'atencao', tipo: 'ponto_atencao', visibilidade: 'privado_gestor' }),
];
const visao = visaoCompartilhada(registros, todos);
assert.deepEqual(visao.passosLiderado.map((i) => i.id), ['pld'], 'só passo do liderado compartilhado e não excluído');
assert.deepEqual(visao.compromissosLideranca.map((i) => i.id), ['pl-shared'], 'compromisso privado fica de fora');
assert.equal(visao.passosLiderado[0].dataOrigem, '2026-09-01', 'data da 1:1 de origem vem do registro');
assert.equal(visao.compromissosLideranca[0].dataOrigem, '2026-10-01');
const serializado = JSON.stringify(visao);
assert.ok(!serializado.includes('ponto_atencao'), 'nenhum ponto de atenção na visão do CS');
assert.ok(!serializado.includes('privado_gestor'), 'nenhuma visibilidade privada na visão do CS');
assert.ok(!serializado.includes('atencao'), 'nenhum item de atenção, mesmo com visibilidade trocada');
assert.deepEqual(visao.registros.map((r) => r.id), ['r2', 'r1'], 'registros do mais recente para o mais antigo');
assert.ok(!('notas' in (visao.registros[0] as object)), 'registros da visão do CS não trazem notas privadas');

// --- resumoAbertos ---
const resumo = resumoAbertos([
  item({ id: 'a', tipo: 'passo_lideranca', prazo: '2026-10-01' }),
  item({ id: 'b', tipo: 'passo_lideranca' }),
  item({ id: 'c', tipo: 'passo_liderado', status: 'realizado' }),
  item({ id: 'd', tipo: 'ponto_atencao', visibilidade: 'privado_gestor' }),
  item({ id: 'e', tipo: 'passo_liderado', excluidoEm: '2026-10-02T00:00:00Z' }),
], HOJE);
assert.deepEqual(resumo, { liderancaAbertos: 2, liderancaVencidos: 1, lideradoAbertos: 0, atencaoAbertos: 1 });

console.log('um-a-um: todos os casos passaram');
