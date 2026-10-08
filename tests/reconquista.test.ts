import assert from 'node:assert/strict';
import { montarReconquista, pendenciasReconquista, validarEntradaDefinir, type EntradaReconquista } from '../lib/reconquista.ts';
import { faixaRetorno, resumoRetorno, frasesRetorno, classificarTemasMembro, PERGUNTAS_SAIDA } from '../lib/voz-membro.ts';

// ---- faixa da nota de retorno: 9 e 10 voltariam, 7 e 8 talvez, 0 a 6 não ----
assert.equal(faixaRetorno(10), 'voltaria');
assert.equal(faixaRetorno(9), 'voltaria');
assert.equal(faixaRetorno(8), 'talvez');
assert.equal(faixaRetorno(7), 'talvez');
assert.equal(faixaRetorno(6), 'nao');
assert.equal(faixaRetorno(0), 'nao');
assert.equal(faixaRetorno(null), null);

// ---- resumo da disposição para voltar ----
const linhas = [
  ...Array.from({ length: 5 }, () => ({ motivo: 'questoes_pessoais', nota: 10, preenchidoPeloCs: false })),
  ...Array.from({ length: 4 }, () => ({ motivo: 'insatisfacao', nota: 2, preenchidoPeloCs: false })),
  { motivo: 'insatisfacao', nota: 8, preenchidoPeloCs: false },
  { motivo: 'falta_de_tempo', nota: null, preenchidoPeloCs: false },
  { motivo: 'falta_de_tempo', nota: 10, preenchidoPeloCs: true },
];
const r = resumoRetorno(linhas);
assert.equal(r.base, 10, 'sem nota e preenchido pelo CS ficam fora da base');
assert.equal(r.semNota, 1);
assert.equal(r.preenchidosPeloCs, 1);
assert.deepEqual(r.faixas, { voltaria: 5, talvez: 1, nao: 4 });
assert.equal(r.distribuicao[10], 5);
assert.equal(r.distribuicao[2], 4);
assert.equal(r.pctVoltaria, 50);
assert.equal(r.porMotivo[0].motivo, 'questoes_pessoais', 'quem mais voltaria primeiro');
assert.equal(r.porMotivo[0].pctVoltaria, 100);
assert.equal(r.porMotivo[1].pctVoltaria, 0);
const frases = frasesRetorno(r, (c) => ({ questoes_pessoais: 'Questões pessoais', insatisfacao: 'Insatisfação' } as any)[c] || c);
assert.equal(frases.length, 2);
assert.ok(frases[1].includes('Questões pessoais') && frases[1].includes('Insatisfação'), 'nomes dos motivos sem minúscula forçada');
assert.ok(!frases.join(' ').includes('.0'), 'sem ponto decimal');

// ---- temas novos do formulário de saída ----
assert.equal(classificarTemasMembro('Problemas pessoais e familiares, gravidez')[0].chave, 'pessoal');
assert.equal(classificarTemasMembro('Estamos reestruturando a empresa, saída de um sócio')[0].chave, 'empresa');
assert.equal(PERGUNTAS_SAIDA.length, 3);

// ---- fila de reconquista ----
const base = (over: Partial<EntradaReconquista>): EntradaReconquista => ({
  churnId: 1, membro: 'Ana', empresa: 'Empresa A', cs: 'Vitor', produto: 'Executivo', dataSaida: '2026-09-01',
  motivo: 'questoes_pessoais', nota: 10, explicacao: 'Mudança de cidade', registro: null, ...over,
});
const entradas: EntradaReconquista[] = [
  base({ churnId: 1, nota: 10 }),
  base({ churnId: 2, nota: 9, registro: { status: 'contatado', responsavel: 'Mateus', proximo_contato: '2026-10-01', observacao: null, atualizado_em: null, atualizado_por: null } }),
  base({ churnId: 3, nota: 8 }),
  base({ churnId: 4, nota: 10, registro: { status: 'voltou', responsavel: null, proximo_contato: '2026-09-01', observacao: null, atualizado_em: null, atualizado_por: null } }),
  base({ churnId: 5, nota: 3 }),
  base({ churnId: 6, nota: 10, explicacao: 'PREENCHIDO PELO CS PORQUE O MEMBRO NÃO RESPONDEU' }),
];
const m = montarReconquista(entradas, '2026-10-08', false);
assert.deepEqual(m.itens.map((i) => i.churnId), [2, 1, 4], 'vencido primeiro, depois a contatar, encerrado no fim; talvez, nota baixa e preenchido pelo CS fora');
assert.equal(m.itens[0].vencido, true);
assert.equal(m.itens[0].diasVencido, 7);
assert.equal(m.itens.find((i) => i.churnId === 4)!.vencido, false, 'encerrado nunca vence');
assert.equal(m.resumo.abertos, 2);
assert.equal(m.resumo.vencidos, 1);
assert.equal(m.resumo.semContato, 1);
assert.equal(m.resumo.voltaram, 1);
assert.equal(m.resumo.preenchidosPeloCs, 1);
assert.equal(m.itens[0].link, 'https://moai-global.monday.com/boards/10008640053/pulses/2');
const comTalvez = montarReconquista(entradas, '2026-10-08', true);
assert.ok(comTalvez.itens.some((i) => i.churnId === 3 && i.faixa === 'talvez'));
const pend = pendenciasReconquista(m.itens);
assert.equal(pend.length, 2);
assert.ok(pend[0].startsWith('Retomar o contato com Ana (nota 9 para voltar), responsável Mateus: venceu há 7 dias.'));
assert.equal(pend[1], '1 ex membro que disse que voltaria ainda não foi contatado.');

// ---- validação do POST ----
assert.deepEqual(validarEntradaDefinir({ churnId: '12', status: 'em_conversa', proximoContato: '2026-10-20', responsavel: 'Vitor' }),
  { churnId: 12, status: 'em_conversa', responsavel: 'Vitor', proximoContato: '2026-10-20', observacao: null });
assert.throws(() => validarEntradaDefinir({ churnId: 12, status: 'qualquer' }), /Status inválido/);
assert.throws(() => validarEntradaDefinir({ churnId: 0, status: 'voltou' }), /Saída inválida/);
assert.throws(() => validarEntradaDefinir({ churnId: 3, status: 'voltou', proximoContato: '20/10/2026' }), /Data/);

console.log('reconquista.test.ts: tudo certo');
