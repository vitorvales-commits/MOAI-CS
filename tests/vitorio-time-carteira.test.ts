// Roda com: npx tsx tests/vitorio-time-carteira.test.ts
// Respostas de time e carteira dos dois lados da data de carga (30/10/2026).
import assert from 'node:assert/strict';
import { responderElenco, responderCarteira, type DadosTime } from '../lib/vitorio/time-carteira.ts';

const dados: DadosTime = {
  hojeIso: '2026-11-10',
  periodos: [
    { nome_curto: 'Ana', nome_completo: 'Ana A', primeiro_mes: '2026-08-01', ultimo_mes: '2026-09-01' },
    { nome_curto: 'Bia', nome_completo: 'Bia B', primeiro_mes: '2026-09-01', ultimo_mes: null },
    { nome_curto: 'Caio', nome_completo: 'Caio C', primeiro_mes: '2026-10-01', ultimo_mes: null },
  ],
  ativosHoje: ['Bia', 'Caio'],
  vigencias: [
    { group_id: 'g1', cs_id: 2, inicio: '-infinity', fim: null },
    { group_id: 'g2', cs_id: 3, inicio: '2026-11-01', fim: null },
  ],
  csPorId: { 1: 'Ana', 2: 'Bia', 3: 'Caio' },
  conselhos: { g1: 'Conselho Um', g2: 'Conselho Dois' },
};

// Elenco de setembro: cs_periodos, com quem já saiu e sem quem entrou depois.
const set = responderElenco('2026-09-01', dados);
assert.match(set.texto, /Ana, Bia/);
assert.doesNotMatch(set.texto, /Caio/);
assert.match(set.comoCheguei, /cs_periodos/);

// Elenco de novembro: mês corrente, CS ativos hoje.
const nov = responderElenco('2026-11-01', dados);
assert.match(nov.texto, /Bia, Caio/);
assert.match(nov.comoCheguei, /cs_config/);

// Carteira de setembro: não tem registro, mesmo com carga '-infinity' cobrindo o conselho g1.
const carteiraSet = responderCarteira('g1', '2026-09-15', dados);
assert.equal(carteiraSet.temRegistro, false);
assert.match(carteiraSet.texto, /Não tenho esse registro/);
assert.doesNotMatch(carteiraSet.texto, /Bia/);
assert.match(carteiraSet.comoCheguei, /sem registro/);

// Carteira de novembro: a carga responde para o conselho g1.
const carteiraNov = responderCarteira('g1', '2026-11-05', dados);
assert.equal(carteiraNov.temRegistro, true);
assert.match(carteiraNov.texto, /Conselho Um era cuidado por Bia em 2026-11-05/);
assert.match(carteiraNov.comoCheguei, /conselho_cs_vigencia/);

// Conselho com vigência só a partir de 01/11: 31/10 não tem registro (guarda da carga), 01/11 responde.
const antes = responderCarteira('g2', '2026-10-31', dados);
assert.equal(antes.temRegistro, false);
const depois = responderCarteira('g2', '2026-11-01', dados);
assert.match(depois.texto, /Conselho Dois era cuidado por Caio/);

console.log('ok vitorio-time-carteira');
