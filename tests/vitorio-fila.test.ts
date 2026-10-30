// Roda com: npx tsx tests/vitorio-fila.test.ts
// Regra da fonte "Dúvidas sem resposta" da Fila de ação: consulta sem resposta ou marcada como não útil pelo menos duas vezes
// em 14 dias, uma entrada por consulta normalizada; tratadas saem da fila.
import assert from 'node:assert/strict';
import { duvidasSemResposta } from '../lib/vitorio/fila.ts';
import { VITORIO_FILA_JANELA_DIAS, VITORIO_FILA_MIN_OCORRENCIAS, VITORIO_REGISTRAR_PESSOA } from '../lib/constants.ts';

const agora = new Date('2026-10-30T15:00:00Z');
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString();
const l = (consulta: string, resultado: string, atras: number, util: boolean | null = null, tratada: string | null = null, perfil = 'cs') =>
  ({ criado_em: dias(atras), consulta_normalizada: consulta, resultado, util, tratada_em: tratada, perfil });

assert.equal(VITORIO_FILA_MIN_OCORRENCIAS, 2);
assert.equal(VITORIO_FILA_JANELA_DIAS, 14);
assert.equal(VITORIO_REGISTRAR_PESSOA, false);

const linhas = [
  l('receita de bolo', 'nada', 1), l('receita de bolo', 'nada', 3, null, null, 'gestor'), l('receita de bolo', 'nada', 5),
  l('prazo do relatorio', 'resposta', 1, false), l('prazo do relatorio', 'resposta', 2, false),
  l('so uma vez', 'nada', 1),
  l('fora da janela', 'nada', 15), l('fora da janela', 'nada', 20),
  l('ja tratada', 'nada', 1, null, dias(0)), l('ja tratada', 'nada', 2, null, dias(0)),
  l('ajudou', 'resposta', 1, true), l('ajudou', 'resposta', 2, true),
  l('uma nada e uma util', 'nada', 1), l('uma nada e uma util', 'resposta', 2, true),
];
const fila = duvidasSemResposta(linhas, agora);
assert.deepEqual(fila.map((d) => [d.consulta, d.ocorrencias]), [['receita de bolo', 3], ['prazo do relatorio', 2]]);
assert.deepEqual(fila[0].perfis.sort(), ['cs', 'gestor']);
assert.equal(fila[0].ultima, dias(1));
assert.deepEqual(duvidasSemResposta([], agora), []);
console.log('vitorio fila ok');
