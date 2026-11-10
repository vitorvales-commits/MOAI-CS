// Roda com: npx tsx tests/vitorio-time-carteira.test.ts
// Respostas de time e carteira: fonte certa dos dois lados da data de carga, texto em português e tempo verbal pela data.
import assert from 'node:assert/strict';
import { responderElenco, responderCarteira, dataBR, mesPorExtenso, type DadosTime, type RespostaTime } from '../lib/vitorio/time-carteira.ts';

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

const respostas: RespostaTime[] = [];
function guardar(r: RespostaTime): RespostaTime { respostas.push(r); return r; }

// Formatação para o leitor.
assert.equal(dataBR('2026-11-05'), '05/11/2026');
assert.equal(mesPorExtenso('2026-09-01'), 'setembro de 2026');

// Elenco de setembro: cs_periodos, com quem já saiu e sem quem entrou depois.
const set = guardar(responderElenco('2026-09-01', dados));
assert.match(set.texto, /Ana, Bia/);
assert.match(set.texto, /setembro de 2026/);
assert.doesNotMatch(set.texto, /Caio/);
assert.equal(set.temRegistro, true);
assert.match(set.comoCheguei, /cs_periodos/);

// Elenco de novembro: mês corrente, CS ativos hoje, com a fonte real (canonico.cs via vitorio_dicionario).
const nov = guardar(responderElenco('2026-11-01', dados));
assert.match(nov.texto, /Bia, Caio/);
assert.match(nov.comoCheguei, /canonico\.cs/);
assert.doesNotMatch(nov.comoCheguei, /cs_config/);

// Elenco vazio: temRegistro false, nos dois ramos.
const vazioHoje = guardar(responderElenco('2026-11-01', { ...dados, ativosHoje: [] }));
assert.equal(vazioHoje.temRegistro, false);
assert.match(vazioHoje.texto, /Não encontrei CS registrado em novembro de 2026/);
const vazioSet = guardar(responderElenco('2026-09-01', { ...dados, periodos: [] }));
assert.equal(vazioSet.temRegistro, false);

// Carteira de setembro: não tem registro, mesmo com carga '-infinity' cobrindo o conselho g1.
const carteiraSet = guardar(responderCarteira('g1', '2026-09-15', dados));
assert.equal(carteiraSet.temRegistro, false);
assert.equal(
  carteiraSet.texto,
  'Sobre Conselho Um em 15/09/2026: o dash só passou a guardar quem cuida de cada conselho em 30/10/2026, então não tenho esse registro.',
);
assert.match(carteiraSet.texto, /15\/09\/2026/);
assert.doesNotMatch(carteiraSet.texto, /Bia/);
assert.match(carteiraSet.comoCheguei, /sem registro/);

// Carteira antes de hoje: "era cuidado por", com data em português.
const carteiraNov = guardar(responderCarteira('g1', '2026-11-05', dados));
assert.equal(carteiraNov.temRegistro, true);
assert.equal(carteiraNov.texto, 'Conselho Um era cuidado por Bia em 05/11/2026.');
assert.match(carteiraNov.comoCheguei, /conselho_cs_vigencia/);

// Carteira de hoje e de data futura: "é cuidado por".
const hoje = guardar(responderCarteira('g1', '2026-11-10', dados));
assert.equal(hoje.texto, 'Conselho Um é cuidado por Bia em 10/11/2026.');
const futuro = guardar(responderCarteira('g1', '2026-12-01', dados));
assert.equal(futuro.texto, 'Conselho Um é cuidado por Bia em 01/12/2026.');

// Conselho com vigência só a partir de 01/11: 31/10 não tem registro (guarda da carga), 01/11 responde.
const antes = guardar(responderCarteira('g2', '2026-10-31', dados));
assert.equal(antes.temRegistro, false);
const depois = guardar(responderCarteira('g2', '2026-11-01', dados));
assert.equal(depois.texto, 'Conselho Dois era cuidado por Caio em 01/11/2026.');

// Nenhuma resposta visível traz data AAAA-MM-DD.
for (const r of respostas) {
  assert.doesNotMatch(r.texto, /\d{4}-\d{2}-\d{2}/, `data ISO no texto: ${r.texto}`);
  assert.doesNotMatch(r.comoCheguei, /\d{4}-\d{2}-\d{2}/, `data ISO em Como cheguei: ${r.comoCheguei}`);
}

console.log('ok vitorio-time-carteira');
