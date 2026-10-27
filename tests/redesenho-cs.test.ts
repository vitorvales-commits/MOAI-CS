// Frases e contagens da abertura do Acompanhamento e da posição no Reconhecimento (27/10/2026).
// O script mora em string de template; aqui ele é executado num contexto isolado.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { REDESENHO_CS_SCRIPT } from '../lib/ui/redesenho-cs-ui.ts';

const ctx: any = {};
vm.createContext(ctx);
vm.runInContext(REDESENHO_CS_SCRIPT, ctx);
const frase = (e: any, r: any, g: any) => ctx.rdFraseAbertura_(ctx.rdPendencias_(e, r, g));

assert.equal(frase({ estado: 'enviado_no_prazo' }, [], []).startsWith('Tudo em dia'), true);
assert.equal(ctx.rdPendencias_({ estado: 'pendente' }, [], []).total, 1);
assert.match(frase({ estado: 'pendente' }, [], []), /^Você tem 1 pendência: o report da semana vence sexta às 19h\.$/);
const rels = [{ estado: 'atrasado', diasRestantes: -2 }, { estado: 'a_preencher', diasRestantes: 3 }];
assert.match(frase({ estado: 'atrasado', horas_atraso: 30 }, rels, []), /3 pendências: o report da semana está atrasado há 30 h, 1 relatório de conselho está atrasado e 1 relatório de conselho está por preencher\./);
// sem a lista exata, cai para a regularidade das 8 semanas
assert.equal(ctx.rdPendencias_(null, null, [{ semana_inicio: '2026-10-12', estado: 'pendente' }, { semana_inicio: '2026-10-05', estado: 'enviado_no_prazo' }]).total, 1);
// posição: 1º, 2º, 3º e fora do pódio
assert.equal(ctx.rdFrasePosicao_(2, 66, [101, 66, 46.5]), 'Faltam 35 pontos para o 1º lugar e você está 19,5 pontos à frente do 3º.');
assert.equal(ctx.rdFrasePosicao_(1, 101, [101, 66, 46]), 'Você lidera e está 35 pontos à frente do 2º lugar.');
assert.equal(ctx.rdFrasePosicao_(5, 30, [101, 66, 46]), 'Faltam 71 pontos para o 1º lugar e 16 pontos para chegar ao pódio.');
// regras do script inline
assert.equal(/[\`]|\$\{/.test(REDESENHO_CS_SCRIPT), false, 'sem barra invertida, crase ou cifrão com chave');
assert.equal(/[—–]/.test(REDESENHO_CS_SCRIPT), false, 'sem travessão');
console.log('redesenho-cs: testes aprovados');
