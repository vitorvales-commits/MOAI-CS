import assert from 'node:assert/strict';
import { churnDaArea, ehChurnDaArea } from '../lib/churn-area.ts';

// Grupo Outubro do board de churn (10008640053) como estava em 26/10/2026, mais dois itens de fora
// do mês. Marcos já classificado como cs_ex depois da troca de carteira para a Iasmin.
const outubro = [
  { id: 1, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Executivo', data: '2026-10-04', data_referencia: '2026-10-04' },
  { id: 2, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Fast Track', data: '2026-10-05', data_referencia: '2026-10-05' },
  { id: 3, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Executivo', data: '2026-10-07', data_referencia: '2026-10-07' },
  { id: 4, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'C-Level', data: '2026-10-08', data_referencia: '2026-10-08' },
  { id: 5, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Fast Track', data: '2026-10-09', data_referencia: '2026-10-09' },
  { id: 6, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Fast Track', data: '2026-10-13', data_referencia: '2026-10-13' },
  { id: 7, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Executivo', data: '2026-10-14', data_referencia: '2026-10-14' },
  { id: 8, cs_categoria: 'cs_ex', eh_comunidade: false, produto: 'Fast Track', data: '2026-10-16', data_referencia: '2026-10-16' },
  { id: 9, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'C-Level', data: '2026-10-17', data_referencia: '2026-10-17' },
  { id: 10, cs_categoria: 'nao_cs', eh_comunidade: true, produto: 'Comunidade', data: '2026-10-20', data_referencia: '2026-10-20' },
  { id: 11, cs_categoria: 'cs_ex', eh_comunidade: false, produto: 'Executivo', data: '2026-10-22', data_referencia: '2026-10-22' },
  { id: 12, cs_categoria: 'cs_ativo', eh_comunidade: false, produto: 'Executivo', data: '2026-09-30', data_referencia: '2026-09-30' },
  { id: 13, cs_categoria: 'nao_cs', eh_comunidade: false, produto: 'High End', data: '2026-10-21', data_referencia: '2026-10-21' },
];

const r = churnDaArea(outubro, '2026-10-01', '2026-10-31');
// O card mostrava 8 (só CS ativos). O Monday tem 10 churns de CS no mês.
assert.equal(r.qtd, 10);
// Mesmo conjunto de linhas que a contagem: R$ 12.182, valor que o card de revenue já mostrava.
assert.equal(r.receita, 12182);
assert.equal(r.porProduto.reduce((s, p) => s + p.qtd, 0), r.qtd);

// Comunidade e registros sem CS nunca entram, mesmo com outra categoria.
assert.equal(ehChurnDaArea({ cs_categoria: 'cs_ativo', eh_comunidade: true }), false);
assert.equal(ehChurnDaArea({ cs_categoria: 'nao_cs', eh_comunidade: false }), false);
assert.equal(ehChurnDaArea({ cs_categoria: 'nao_informado' }), false);
assert.equal(ehChurnDaArea({ cs_categoria: 'cs_ex', eh_comunidade: false }), true);

// A troca de status de um CS não muda o total do mês.
const antesDaSaida = outubro.map((x) => (x.cs_categoria === 'cs_ex' ? { ...x, cs_categoria: 'cs_ativo' } : x));
assert.deepEqual(churnDaArea(antesDaSaida, '2026-10-01', '2026-10-31').qtd, r.qtd);

// Sem data_referencia, usa a coluna data. Sem nenhuma das duas, fica fora.
assert.equal(churnDaArea([{ cs_categoria: 'cs_ativo', data: '2026-10-02', produto: 'Fast Track' }], '2026-10-01', '2026-10-31').qtd, 1);
assert.equal(churnDaArea([{ cs_categoria: 'cs_ativo', produto: 'Fast Track' }], '2026-10-01', '2026-10-31').qtd, 0);

console.log('churn-area ok');
