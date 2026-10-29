import assert from 'node:assert/strict';
import { resumirSync, textoIdade } from '../lib/sync-saude.ts';

const agora = Date.parse('2026-10-29T17:10:00Z');
const m = (min: number) => new Date(agora - min * 60000).toISOString();

// em dia: o quadro mais atrasado tem 4 minutos
const ok = resumirSync([{ board: 'churn', finished_at: m(1) }, { board: 'cases', finished_at: m(4) }, { board: 'cases', finished_at: m(9) }], agora);
assert.equal(ok.minutos, 4); assert.equal(ok.atrasado, false); assert.equal(ok.quadroMaisAtrasado, 'cases'); assert.equal(ok.texto, 'Monday há 4 min');

// um quadro parado puxa o selo, mesmo com os outros em dia
const parado = resumirSync([{ board: 'churn', finished_at: m(1) }, { board: 'rounds', finished_at: m(22) }], agora);
assert.equal(parado.atrasado, true); assert.equal(parado.quadroMaisAtrasado, 'rounds');

// o limite é estrito: 15 minutos ainda é normal, 16 não
assert.equal(resumirSync([{ board: 'a', finished_at: m(15) }], agora).atrasado, false);
assert.equal(resumirSync([{ board: 'a', finished_at: m(16) }], agora).atrasado, true);

// granola e alertas não mascaram queda do Monday; sem linhas válidas o selo avisa
assert.equal(resumirSync([{ board: 'granola', finished_at: m(0) }, { board: 'alertas_nps', finished_at: m(0) }], agora).atrasado, true);
assert.equal(resumirSync([{ board: 'churn', finished_at: null }], agora).ultimoSucesso, null);
assert.equal(resumirSync([], agora).texto, 'Sem registro de sincronização');

assert.equal(textoIdade(0), 'agora há pouco'); assert.equal(textoIdade(125), 'há 2 h'); assert.equal(textoIdade(3000), 'há 2 d');
console.log('sync-saude ok');
