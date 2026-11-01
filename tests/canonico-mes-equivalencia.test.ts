// Roda com: npx tsx tests/canonico-mes-equivalencia.test.ts
// Equivalência entre canonico.mes_de_titulo (SQL, migração 20261030c) e normalizarMes (TypeScript).
// Os valores esperados foram lidos do banco em 01/11/2026, com ano padrão 2026, sobre os 29 títulos
// distintos de cases_items, rounds_items, metas_subitens e matchmakings_items. Se a regra mudar em um
// dos dois lados, este teste precisa falhar.
import assert from 'node:assert/strict';
import { normalizarMes } from '../lib/cs-periodos.ts';

const esperado: Record<string, string> = {
  'Maio': '2026-05-01',
  'Abril': '2026-04-01',
  'JULHO': '2026-07-01',
  'JUNHO': '2026-06-01',
  'Julho': '2026-07-01',
  'Junho': '2026-06-01',
  'AGOSTO': '2026-08-01',
  'Agosto': '2026-08-01',
  'Outubro': '2026-10-01',
  'SETEMBRO': '2026-09-01',
  'Setembro': '2026-09-01',
  'Maio 2026': '2026-05-01',
  'Abril 2026': '2026-04-01',
  'Ale - Maio': '2026-05-01',
  'Julho 2025': '2025-07-01',
  'Julho 2026': '2026-07-01',
  'Junho 2026': '2026-06-01',
  'Metas Maio': '2026-05-01',
  'Agosto 2025': '2025-08-01',
  'Agosto 2026': '2026-08-01',
  'Março 2026': '2026-03-01',
  'Janeiro 2026': '2026-01-01',
  'Outubro 2025': '2025-10-01',
  'Outubro 2026': '2026-10-01',
  'Dezembro 2025': '2025-12-01',
  'Novembro 2025': '2025-11-01',
  'Setembro 2025': '2025-09-01',
  'Setembro 2026': '2026-09-01',
  'Fevereiro 2026': '2026-02-01',
};

assert.equal(Object.keys(esperado).length, 29, 'o conjunto precisa ter os 29 títulos distintos');

for (const [titulo, primeiroDia] of Object.entries(esperado)) {
  const obtido = normalizarMes(titulo, 2026);
  assert.ok(obtido, `normalizarMes devolveu nulo para "${titulo}"`);
  assert.equal(obtido.primeiroDia, primeiroDia, `título "${titulo}"`);
}

// Título sem mês reconhecido continua nulo, como no SQL (sem linha devolvida).
assert.equal(normalizarMes('Sem mês aqui', 2026), null);

console.log('ok: 29 títulos conferidos contra a função SQL');
