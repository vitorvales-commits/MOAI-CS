// Roda com: npx tsx tests/vitorio-pipeline.test.ts
// Pipeline do Vitorio (B1, começo): precisão de intenção, de status e de entidades sobre o ouro (mínimo 90%),
// e casos de setembro e novembro para a fonte certa de cada lado da data de carga.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { responderTexto, type DadosPipeline } from '../lib/vitorio/pipeline.ts';
import { classificar } from '../lib/vitorio/classificador.ts';

interface Caso {
  pergunta: string;
  intencao: 'elenco' | 'carteira' | null;
  status: 'resposta' | 'esclarecimento' | 'sem_intencao';
  conselho?: string;
  data?: string;
  mes?: string;
}

const ouro: Caso[] = JSON.parse(readFileSync(new URL('./fixtures/vitorio-ouro-b1.json', import.meta.url), 'utf8'));

const dados: DadosPipeline = {
  hojeIso: '2026-11-10',
  periodos: [
    { nome_curto: 'Ana', nome_completo: 'Ana A', primeiro_mes: '2026-08-01', ultimo_mes: '2026-09-01' },
    { nome_curto: 'Bia', nome_completo: 'Bia B', primeiro_mes: '2026-09-01', ultimo_mes: null },
    { nome_curto: 'Caio', nome_completo: 'Caio C', primeiro_mes: '2026-10-01', ultimo_mes: null },
  ],
  ativosHoje: ['Bia', 'Caio', 'Ana'],
  vigencias: [
    { group_id: 'g1', cs_id: 2, inicio: '-infinity', fim: null },
    { group_id: 'g2', cs_id: 3, inicio: '2026-11-01', fim: null },
    { group_id: 'g3', cs_id: 1, inicio: '-infinity', fim: null },
  ],
  csPorId: { 1: 'Ana', 2: 'Bia', 3: 'Caio' },
  conselhos: { g1: 'Conselho Um', g2: 'Conselho Dois', g3: 'Conselho Tres' },
  conselhosLista: [
    { group_id: 'g1', titulo: 'Conselho Um' },
    { group_id: 'g2', titulo: 'Conselho Dois' },
    { group_id: 'g3', titulo: 'Conselho Tres' },
  ],
  csLista: [
    { id: 1, nome_curto: 'Ana', apelidos: [] },
    { id: 2, nome_curto: 'Bia', apelidos: ['Beatriz'] },
    { id: 3, nome_curto: 'Caio', apelidos: [] },
  ],
};

// Medição: intenção, status e entidades (só os campos que o ouro declara).
let okIntencao = 0;
let okStatus = 0;
let entTotal = 0;
let entOk = 0;
const falhas: string[] = [];
for (const c of ouro) {
  const out = responderTexto(c.pergunta, dados);
  const intencaoOk = (out.intencao ?? null) === c.intencao;
  const statusOk = out.status === c.status;
  if (intencaoOk) okIntencao++;
  if (statusOk) okStatus++;
  const checagens: [string, unknown, unknown][] = [];
  if (c.conselho !== undefined) checagens.push(['conselho', out.entidades.conselho, c.conselho]);
  if (c.data !== undefined) checagens.push(['data', out.entidades.data, c.data]);
  if (c.mes !== undefined) checagens.push(['mes', out.entidades.mes, c.mes]);
  for (const [nome, obtido, esperado] of checagens) {
    entTotal++;
    if (obtido === esperado) entOk++;
    else falhas.push(`${c.pergunta} | ${nome}: obteve ${JSON.stringify(obtido)}, esperava ${JSON.stringify(esperado)}`);
  }
  if (!intencaoOk || !statusOk) falhas.push(`${c.pergunta} | intencao ${out.intencao} (${out.status}), esperava ${c.intencao} (${c.status})`);
}

const pct = (a: number, b: number) => (b ? a / b : 1);
const precIntencao = pct(okIntencao, ouro.length);
const precStatus = pct(okStatus, ouro.length);
const precEntidades = pct(entOk, entTotal);
console.log(`ouro: ${ouro.length} perguntas | intenção ${(precIntencao * 100).toFixed(1)}% | status ${(precStatus * 100).toFixed(1)}% | entidades ${(precEntidades * 100).toFixed(1)}% (${entOk}/${entTotal})`);
if (falhas.length) console.log('divergências:\n  ' + falhas.join('\n  '));
assert.ok(ouro.filter((c) => c.intencao).length >= 40, 'o ouro precisa de pelo menos 40 perguntas das duas intenções');
assert.ok(precIntencao >= 0.9, `precisão de intenção abaixo de 90%: ${(precIntencao * 100).toFixed(1)}%`);
assert.ok(precEntidades >= 0.9, `precisão de entidades abaixo de 90%: ${(precEntidades * 100).toFixed(1)}%`);

// Setembro e novembro: a fonte certa de cada lado da data.
const set = responderTexto('quem cuidava do conselho um em 15/09', dados);
assert.equal(set.status, 'resposta');
if (set.status === 'resposta') {
  assert.equal(set.resposta.temRegistro, false);
  assert.match(set.resposta.texto, /o dash só passou a guardar quem cuida de cada conselho em 30\/10\/2026/);
}
const nov = responderTexto('quem cuida do conselho um em 05/11', dados);
assert.equal(nov.status, 'resposta');
if (nov.status === 'resposta') {
  assert.equal(nov.resposta.texto, 'Conselho Um era cuidado por Bia em 05/11/2026.');
  assert.match(nov.resposta.comoCheguei, /conselho_cs_vigencia/);
}
const elencoSet = responderTexto('quem era cs em setembro', dados);
if (elencoSet.status === 'resposta') assert.match(elencoSet.resposta.comoCheguei, /cs_periodos/);

// Esclarecimento: conselho faltando, com até cinco opções.
const semConselho = responderTexto('quem cuida do conselho em 05/11', dados);
assert.equal(semConselho.status, 'esclarecimento');
if (semConselho.status === 'esclarecimento') {
  assert.equal(semConselho.pergunta, 'De qual conselho?');
  assert.ok(semConselho.opcoes.length >= 1 && semConselho.opcoes.length <= 5);
}

// Sem intenção: abaixo do limiar, o pipeline não responde.
assert.equal(classificar('oi').intencao, null);
assert.equal(responderTexto('oi', dados).status, 'sem_intencao');

console.log('ok vitorio-pipeline');
