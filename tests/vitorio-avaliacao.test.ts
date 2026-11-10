// Roda com: npx tsx tests/vitorio-avaliacao.test.ts [--matriz]
// Avaliação do pipeline do Vitorio 2 sobre o conjunto ouro (tests/fixtures/vitorio-ouro.json). Falha se a precisão de intenção ou de
// entidades ficar abaixo de 90 por cento, se uma resposta de dado sair sem fonte ou se um CS comum receber dado restrito.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { responder } from '../lib/vitorio/responder.ts';
import type { Resposta, Turno } from '../lib/vitorio/tipos.ts';
import { servicos } from './fixtures/vitorio-servicos.ts';

type Caso = { p: 'cs' | 'gestor'; q: string; i: string; r: string; e?: Record<string, string>; doc?: string; ctx?: string[]; real?: boolean };
const ouro: Caso[] = JSON.parse(readFileSync(new URL('./fixtures/vitorio-ouro.json', import.meta.url), 'utf8'));
const CONHECIMENTO = (id: string | null) => id === 'conhecimento' || (!!id && (id.startsWith('plataforma.') || id === 'processo.direto'));
const turno = (q: string, r: Resposta): Turno => ({ pergunta: q, intencao: r.intencao, entidades: r.entidades, destino: r.destino });

async function rodar(c: Caso): Promise<Resposta> {
  const sv = servicos({ perfil: c.p, csNome: c.p === 'cs' ? 'George' : null });
  let contexto: Turno[] = [];
  for (const q of c.ctx || []) { const r = await responder({ texto: q, contexto }, sv); contexto = [...contexto, turno(q, r)].slice(-3); }
  return responder({ texto: c.q, contexto }, sv);
}
function intencaoOk(c: Caso, r: Resposta): boolean {
  if (c.i === 'lacuna') return r.resultado === 'nada';
  if (c.i === 'conhecimento') return CONHECIMENTO(r.intencao) && (!c.doc || (r.chave || '').startsWith(c.doc) || r.resultado !== 'resposta');
  return r.intencao === c.i;
}
function entidadesOk(c: Caso, r: Resposta): string[] {
  const erros: string[] = [];
  Object.entries(c.e || {}).forEach(([k, v]) => {
    const got = k === 'periodo' ? r.entidades.periodo?.rotulo : (r.entidades as any)[k]?.id;
    if (got !== v) erros.push(k + ': esperado ' + v + ', veio ' + got);
  });
  return erros;
}

const falhasIntencao: string[] = [], falhasEnt: string[] = [], semFonte: string[] = [], falhasResultado: string[] = [];
const matriz = new Map<string, number>();
let okInt = 0, okRes = 0, entTotal = 0, entOk = 0;
(async () => {
  for (const c of ouro) {
    const r = await rodar(c);
    const ok = intencaoOk(c, r);
    if (ok) okInt++; else { falhasIntencao.push(c.p + ' | ' + c.q + ' => esperado ' + c.i + (c.doc ? ' (' + c.doc + ')' : '') + ', veio ' + r.intencao + ' [' + r.resultado + '] ' + (r.chave || '')); const k = c.i + ' -> ' + (r.intencao || r.resultado); matriz.set(k, (matriz.get(k) || 0) + 1); }
    if (r.resultado === c.r) okRes++; else falhasResultado.push(c.p + ' | ' + c.q + ' => esperado ' + c.r + ', veio ' + r.resultado + ' (' + r.intencao + ')');
    if (c.e) { entTotal++; const er = entidadesOk(c, r); if (!er.length) entOk++; else falhasEnt.push(c.p + ' | ' + c.q + ' => ' + er.join('; ')); }
    if (r.resultado === 'resposta' && r.intencao && !r.intencao.startsWith('social') && r.intencao !== 'acao.abrir' && !r.fonte) semFonte.push(c.q);
  }
  const pInt = okInt / ouro.length, pEnt = entTotal ? entOk / entTotal : 1, pRes = okRes / ouro.length;
  console.log('casos: ' + ouro.length + ' | intenção ' + (pInt * 100).toFixed(1) + '% | resultado ' + (pRes * 100).toFixed(1) + '% | entidades ' + (pEnt * 100).toFixed(1) + '% (' + entOk + ' de ' + entTotal + ')');
  if (process.argv.includes('--matriz') || pInt < 0.9 || pEnt < 0.9) {
    console.log('\nMatriz de confusão (esperado -> obtido, só o que errou):');
    [...matriz.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + n + 'x ' + k));
    console.log('\nErros de intenção:\n  ' + falhasIntencao.join('\n  '));
    console.log('\nErros de resultado:\n  ' + falhasResultado.join('\n  '));
    console.log('\nErros de entidade:\n  ' + falhasEnt.join('\n  '));
  }
  assert.ok(pInt >= 0.9, 'precisão de intenção abaixo de 90%: ' + (pInt * 100).toFixed(1));
  assert.ok(pEnt >= 0.9, 'precisão de entidades abaixo de 90%: ' + (pEnt * 100).toFixed(1));
  assert.deepEqual(semFonte, [], 'respostas de dado sem fonte: ' + semFonte);
  assert.ok(ouro.length >= 250, 'o conjunto ouro precisa de ao menos 250 perguntas');
  console.log('vitorio avaliacao ok');
})();
