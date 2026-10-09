// Roda com: npx tsx tests/churn-pedidos.test.ts
// Pedidos de melhoria por motivo (K4), ação por motivo (K4) e pendências de reconquista estruturadas (K2),
// revisão out/2026.
import assert from 'node:assert/strict';
import { agruparPedidosMelhoria } from '../lib/churn.ts';
import { acaoParaMotivo, ACAO_MOTIVO_PADRAO } from '../config/acoes-por-motivo.ts';
import { pendenciasDetalheReconquista, type LinhaReconquista } from '../lib/reconquista.ts';

// Ação por motivo: só os dois motivos com correspondência clara; o resto cai no padrão
assert.equal(acaoParaMotivo('falta_de_tempo'), 'Oferecer formato reduzido ou pausa da fidelidade antes do cancelamento');
assert.equal(acaoParaMotivo('financeiro'), 'Apresentar plano alternativo e o custo da multa de fidelidade');
assert.equal(acaoParaMotivo('insatisfacao'), ACAO_MOTIVO_PADRAO);

// Pedidos: agrupa por motivo, ordena por quantidade, até três trechos distintos e os ids de origem
const itens = [
  { id: 1, motivo_principal: 'falta_de_tempo', sugestao_melhoria: 'Mais flexibilidade de horário' },
  { id: 2, motivo_principal: 'falta_de_tempo', sugestao_melhoria: 'Mais flexibilidade de horário' },
  { id: 3, motivo_principal: 'falta_de_tempo', sugestao_melhoria: 'Encontros mais curtos' },
  { id: 4, motivo_principal: 'falta_de_tempo', sugestao_melhoria: 'Menos reuniões' },
  { id: 5, motivo_principal: 'financeiro', sugestao_melhoria: null },
] as any[];
const grupos = agruparPedidosMelhoria(itens, []);
assert.equal(grupos[0].chave, 'falta_de_tempo');
assert.equal(grupos[0].qtd, 4);
assert.deepEqual(grupos[0].ids, [1, 2, 3, 4]);
assert.deepEqual(grupos[0].trechos, ['Mais flexibilidade de horário', 'Encontros mais curtos', 'Menos reuniões']);
assert.equal(grupos[1].chave, 'financeiro');
assert.deepEqual(grupos[1].trechos, []);

// Pendências de reconquista: vencidos viram linha, contatos pendentes viram uma linha por CS
const linha = (over: Partial<LinhaReconquista>) => ({
  churnId: 1, membro: 'Ana', empresa: null, cs: 'Marcos', produto: null, dataSaida: null, diasDesdeSaida: null,
  motivo: 'x', nota: 9, faixa: 'voltaria', status: 'a_contatar', aberto: true, vencido: false, diasVencido: null,
  responsavel: null, proximoContato: null, observacao: null, ...over,
}) as unknown as LinhaReconquista;
const pend = pendenciasDetalheReconquista([
  linha({ churnId: 1, membro: 'Ana', vencido: true, diasVencido: 5, responsavel: 'Vitor' }),
  linha({ churnId: 2, membro: 'Bia', cs: 'Marcos' }),
  linha({ churnId: 3, membro: 'Caio', cs: 'Marcos' }),
  linha({ churnId: 4, membro: 'Dani', cs: 'Luana' }),
]);
assert.equal(pend[0].tipo, 'reconquista');
assert.equal(pend[0].diasParado, 5);
assert.equal(pend[0].proximoPasso, 'Retomar o contato, responsável Vitor');
const massa = pend.filter((p) => p.tipo === 'reconquista_massa');
assert.equal(massa[0].cs, 'Marcos');
assert.equal(massa[0].quantidade, 2);
assert.equal(massa[0].membro, '2 ex membros que voltariam sem contato');
assert.equal(massa[1].cs, 'Luana');

console.log('pedidos de melhoria, ação por motivo e pendências: todos os casos passaram');
