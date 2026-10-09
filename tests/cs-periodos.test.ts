// Roda com: npx tsx tests/cs-periodos.test.ts
// Normalização dos títulos de mês de metas_subitens e regra de quem foi CS em cada mês (revisão out/2026, R2 Fase 4).
import assert from 'node:assert/strict';
import { normalizarMes, periodosPorMetas } from '../lib/cs-periodos.ts';

// Títulos inconsistentes viram o primeiro dia do mês no ano padrão
assert.deepEqual(normalizarMes('Metas Maio', 2026), { ano: 2026, mes: 5, primeiroDia: '2026-05-01' });
assert.deepEqual(normalizarMes('Ale - Maio', 2026), { ano: 2026, mes: 5, primeiroDia: '2026-05-01' });
assert.deepEqual(normalizarMes('JUNHO', 2026), { ano: 2026, mes: 6, primeiroDia: '2026-06-01' });
assert.deepEqual(normalizarMes('SETEMBRO', 2026), { ano: 2026, mes: 9, primeiroDia: '2026-09-01' });
assert.deepEqual(normalizarMes('Março', 2026), { ano: 2026, mes: 3, primeiroDia: '2026-03-01' });
// Ano com quatro dígitos no título prevalece sobre o padrão
assert.deepEqual(normalizarMes('Dezembro 2025', 2026), { ano: 2025, mes: 12, primeiroDia: '2025-12-01' });
// Sem mês reconhecido
assert.equal(normalizarMes('Metas gerais', 2026), null);
assert.equal(normalizarMes('', 2026), null);

// Regra: quem tem meta no mês é CS; primeiro e último mês com meta marcam o período
const linhas = [
  { mes_grupo_titulo: 'Ale - Maio', cs_nome: 'Alejandro' },
  { mes_grupo_titulo: 'Metas Maio', cs_nome: 'George' },
  { mes_grupo_titulo: 'JUNHO', cs_nome: 'George' },
  { mes_grupo_titulo: 'JUNHO', cs_nome: 'Rodrigo' },
  { mes_grupo_titulo: 'SETEMBRO', cs_nome: 'RODRIGO' },
  { mes_grupo_titulo: 'SETEMBRO', cs_nome: 'Luana' },
  { mes_grupo_titulo: 'AGOSTO', cs_nome: 'Alejandro' },
];
const periodos = periodosPorMetas(linhas, 2026, ['George', 'Rodrigo', 'Luana']);
const porNome = Object.fromEntries(periodos.map((p) => [p.nome_curto.toLowerCase(), p]));

// CS em cs_config fica ativo (ultimo_mes nulo) e confirmado
assert.deepEqual(porNome['george'], { nome_curto: 'George', primeiro_mes: '2026-05-01', ultimo_mes: null, confirmado: true });
// Rodrigo e RODRIGO são o mesmo CS (sem acento e sem caixa)
assert.equal(porNome['rodrigo'].primeiro_mes, '2026-06-01');
assert.equal(porNome['rodrigo'].confirmado, true);
// Fora de cs_config: ultimo_mes é o último mês com meta e precisa de revisão
assert.deepEqual(porNome['alejandro'], { nome_curto: 'Alejandro', primeiro_mes: '2026-05-01', ultimo_mes: '2026-08-01', confirmado: false });
// Luana entra em setembro pela regra (tem meta só a partir daí)
assert.equal(porNome['luana'].primeiro_mes, '2026-09-01');

// Ordem: por mês de entrada e depois por nome
assert.deepEqual(periodos.map((p) => p.nome_curto), ['Alejandro', 'George', 'Rodrigo', 'Luana']);

console.log('normalização de mês e períodos de CS: todos os casos passaram');
