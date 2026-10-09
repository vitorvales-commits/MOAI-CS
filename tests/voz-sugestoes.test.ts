// Roda com: npx tsx tests/voz-sugestoes.test.ts
// Sugestões do NPS: descarte de respostas sem sugestão e polaridade da avaliação do CS (revisão out/2026, R2 Fase 7).
import assert from 'node:assert/strict';
import { ehSemSugestao, polaridadeAvaliacaoCs } from '../lib/voz-membro/sugestoes.ts';
import { classificarTemasMembro } from '../lib/voz-membro.ts';

// Ausência de sugestão, com e sem acento, caixa e pontuação
for (const t of ['não tenho', 'Nada.', 'NENHUMA', 'sem sugestões', 'Tudo ótimo!', 'tudo certo', 'Nenhuma sugestão', '', '   ', null, undefined]) {
  assert.equal(ehSemSugestao(t as any), true, `deveria ser sem sugestão: ${t}`);
}
// Texto real não é descartado
assert.equal(ehSemSugestao('Simplificar os cadastros nos formulários'), false);
assert.equal(ehSemSugestao('Não tenho nada a reclamar, mas o wifi cai'), false);

// Polaridade do CS pelo campo: 9 e 10 elogio, demais crítica, sem nota não classifica
assert.equal(polaridadeAvaliacaoCs(10), 'elogio');
assert.equal(polaridadeAvaliacaoCs(9), 'elogio');
assert.equal(polaridadeAvaliacaoCs(8), 'critica');
assert.equal(polaridadeAvaliacaoCs(0), 'critica');
assert.equal(polaridadeAvaliacaoCs(null), null);

// Tema "Tecnologia e formulários" acrescido com sinal, celular e wi fi
assert.ok(classificarTemasMembro('O sinal do celular cai na sala').some((t) => t.chave === 'tecnologia'));
assert.ok(classificarTemasMembro('Melhorar o wi fi').some((t) => t.chave === 'tecnologia'));
assert.ok(classificarTemasMembro('Sinal fraco no celular').some((t) => t.chave === 'tecnologia'));

console.log('sugestões do NPS: todos os casos passaram');
