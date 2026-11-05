// Roda com: npx tsx tests/metas-semanais-api.test.ts
// Validação dos corpos das rotas de metas semanais e feriados (lib/metas-semanais-api.ts).
import assert from 'node:assert/strict';
import { validarSalvarMetaSemanal, validarRemoverMetaSemanal, validarFeriado, ehSegunda } from '../lib/metas-semanais-api.ts';

const ok = { mes: '2026-11-01', csNome: 'Rodrigo', indicador: 'cases', semanaInicio: '2026-11-02', valor: 6 };

// Caminho feliz.
{
  const r = validarSalvarMetaSemanal(ok);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.valor, ok);
}

// Semana: segunda-feira real, nunca outro dia nem data inexistente.
assert.equal(ehSegunda('2026-11-02'), true);
assert.equal(ehSegunda('2026-11-03'), false, 'terça');
assert.equal(ehSegunda('2026-02-30'), false, 'data inexistente');
assert.equal(ehSegunda('2026-11-2'), false, 'formato errado');
assert.equal(validarSalvarMetaSemanal({ ...ok, semanaInicio: '2026-11-03' }).ok, false);

// Mês: sempre dia 1 no formato AAAA-MM-01.
assert.equal(validarSalvarMetaSemanal({ ...ok, mes: '2026-11-15' }).ok, false);
assert.equal(validarSalvarMetaSemanal({ ...ok, mes: undefined }).ok, false);

// Indicador: só os seis de P4. Churn e outros ficam de fora.
assert.equal(validarSalvarMetaSemanal({ ...ok, indicador: 'churn' }).ok, false);
assert.equal(validarSalvarMetaSemanal({ ...ok, indicador: 'matchmakings_resultado' }).ok, true);
assert.equal(validarSalvarMetaSemanal({ ...ok, indicador: 'downsell' }).ok, false);

// Valor: inteiro, zero ou positivo, com teto.
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: 0 }).ok, true);
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: -1 }).ok, false);
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: 2.5 }).ok, false, 'meta de contagem é inteira');
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: '6' }).ok, false, 'string não vira número em silêncio');
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: 100001 }).ok, false);
assert.equal(validarSalvarMetaSemanal({ ...ok, valor: NaN }).ok, false);

// CS: obrigatório, sem espaços só e sem texto gigante.
assert.equal(validarSalvarMetaSemanal({ ...ok, csNome: '   ' }).ok, false);
assert.equal(validarSalvarMetaSemanal({ ...ok, csNome: 'x'.repeat(121) }).ok, false);
const comEspacos = validarSalvarMetaSemanal({ ...ok, csNome: '  Rodrigo  ' });
assert.ok(comEspacos.ok && comEspacos.valor.csNome === 'Rodrigo', 'nome é aparado');

// Corpo nulo ou de tipo errado não derruba o validador.
assert.equal(validarSalvarMetaSemanal(null).ok, false);
assert.equal(validarSalvarMetaSemanal('texto').ok, false);

// Remover: mesma regra de chave, sem valor.
{
  const r = validarRemoverMetaSemanal({ ...ok, valor: 999 });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.valor, { mes: ok.mes, csNome: ok.csNome, indicador: ok.indicador, semanaInicio: ok.semanaInicio });
  assert.equal(validarRemoverMetaSemanal({ ...ok, semanaInicio: '2026-11-03' }).ok, false);
}

// Feriados: data real, nome obrigatório, abrangência padrão nacional.
{
  const r = validarFeriado({ data: '2026-11-20', nome: 'Consciência Negra' });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.valor.abrangencia, 'nacional');
  assert.equal(validarFeriado({ data: '2026-02-29', nome: 'x' }).ok, false, '2026 não é bissexto');
  assert.equal(validarFeriado({ data: '2026-11-20', nome: '' }).ok, false);
  assert.equal(validarFeriado({ data: '20/11/2026', nome: 'x' }).ok, false, 'formato brasileiro não entra');
}

console.log('metas-semanais-api: todos os casos passaram');
