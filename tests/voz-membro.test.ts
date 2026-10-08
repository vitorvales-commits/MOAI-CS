import assert from 'node:assert/strict';
import {
  ehNaoResposta, ehPreenchidoPeloCs, classificarTemasMembro, montarTemas, resumoNotas,
  conselhosComNotasBaixas, justificativasNotaBaixa, ehPrimeiroConselho, ehTravado, tabelaDesafio, frasesDesafio,
  type TextoVoz, type RespostaNps,
} from '../lib/voz-membro.ts';

// ---- não resposta e preenchido pelo CS ----
assert.equal(ehNaoResposta('não'), true);
assert.equal(ehNaoResposta('Não tenho nada a acrescentar'), true);
assert.equal(ehNaoResposta('ok'), true);
assert.equal(ehNaoResposta('tudo ótimo'), true);
assert.equal(ehNaoResposta('Falta de tempo para estar presente nas reuniões'), false);
assert.equal(ehNaoResposta(null), true);
assert.equal(ehPreenchidoPeloCs('CS deve que responder'), true);
assert.equal(ehPreenchidoPeloCs('PREENCHIDO PELO CS'), true);
assert.equal(ehPreenchidoPeloCs('Quero mais clareza na comunicação'), false);

// ---- temas de frases reais ----
const temas = (t: string) => classificarTemasMembro(t).map((x) => x.chave);
assert.ok(temas('não fechei nenhum negócio em um ano').includes('negocios'));
assert.ok(temas('mudei de Brasília').includes('distancia'));
assert.ok(temas('troca constante de CS').includes('cs'));
assert.ok(temas('barulho e sala apertada').includes('estrutura'));
assert.deepEqual(temas('xyz qwe'), ['outros']);

// ---- primeiro conselho e travamento ----
const linha = (over: Partial<RespostaNps>): RespostaNps => ({
  group_id: 'g1', nome_grupo: 'Conselho A', cs: 'Ana', nota_conselheiro: 9, nota_cs_hoje: 9,
  nota_qualidade_trocas: 4, nota_evolucao_desafios: 4, continuidade_desafios: 'Sim, sinto bastante evolução',
  sugestao_texto: null, avalia_cs_texto: null, ...over,
});
const primeiro = linha({ continuidade_desafios: 'Este é o meu primeiro conselho', nota_evolucao_desafios: 1 });
assert.equal(ehPrimeiroConselho(primeiro), true);
assert.equal(ehTravado(linha({ continuidade_desafios: 'Em partes, ainda me sinto travado em alguns aspectos' })), true);
assert.equal(ehTravado(linha({ continuidade_desafios: 'Não vejo continuidade e evolução nos meus desafios' })), true);
assert.equal(ehTravado(linha({ continuidade_desafios: 'Sim, sinto bastante evolução' })), false);

// ---- b2: temas, janela e contagem que fecha ----
const atual: TextoVoz[] = [
  { fonte: 'saida', mes: 'Set 2026', texto: 'não fechei nenhum negócio em um ano' },
  { fonte: 'saida', mes: 'Set 2026', texto: 'mudei de Brasília e ficou difícil participar' },
  { fonte: 'saida', mes: 'Set 2026', texto: 'CS deve que responder' },
  { fonte: 'nps_sugestao', mes: 'Set 2026', texto: 'ok' },
  { fonte: 'nps_sugestao', mes: 'Set 2026', texto: null },
];
const anterior: TextoVoz[] = [{ fonte: 'saida', mes: 'Ago 2026', texto: 'mudei de Brasília' }];
const tem = montarTemas(atual, anterior);
assert.equal(tem.preenchidosPeloCs, 1);
assert.equal(tem.descartadosVazios, 1);
assert.equal(tem.textosAnalisados, 2);
// analisados + descartados + preenchidos = textos não nulos
assert.equal(tem.textosAnalisados + tem.descartadosVazios + tem.preenchidosPeloCs, atual.filter((t) => t.texto !== null).length);
assert.ok(tem.ranking.some((l) => l.chave === 'distancia' && l.delta === 0));
assert.ok(tem.insights[0].startsWith('O tema mais citado é'));

// ---- b4: notas, primeiro conselho fora da evolução ----
const respostas: RespostaNps[] = [
  linha({ nota_conselheiro: 5, nota_evolucao_desafios: 2 }),
  linha({ nota_conselheiro: 9, nota_evolucao_desafios: 5 }),
  linha({ nota_conselheiro: 8, nota_evolucao_desafios: 5 }),
  linha({ nota_conselheiro: 10, nota_evolucao_desafios: 5 }),
  linha({ nota_conselheiro: 10, nota_evolucao_desafios: 5 }),
  primeiro,
];
const notas = resumoNotas(respostas, []);
const evo = notas.find((n) => n.chave === 'evolucao')!;
assert.equal(evo.respostas, 5, 'o primeiro conselho não entra na evolução');
const conselheiro = notas.find((n) => n.chave === 'conselheiro')!;
assert.equal(conselheiro.respostas, 6);
assert.equal(conselheiro.baixas, 1);
const porConselho = conselhosComNotasBaixas(respostas);
assert.equal(porConselho.length, 1);
assert.equal(porConselho[0].conselho, 'Conselho A');
assert.equal(porConselho[0].baixas >= 1, true);

const just = justificativasNotaBaixa(respostas);
assert.equal(just.total >= 1, true);
assert.match(just.frase, /de \d+ respostas com nota baixa não trazem justificativa escrita\./);

// ---- b5: desafio com amostra mínima e frases só com dois lados ----
const desafio: RespostaNps[] = [];
for (let i = 0; i < 5; i++) desafio.push(linha({ group_id: 'g1', nome_grupo: 'Conselho A', cs: 'Ana', continuidade_desafios: i < 3 ? 'Em partes, ainda me sinto travado' : 'Sim, sinto bastante evolução' }));
for (let i = 0; i < 5; i++) desafio.push(linha({ group_id: 'g2', nome_grupo: 'Conselho B', cs: 'Bruno', continuidade_desafios: 'Sim, sinto bastante evolução' }));
desafio.push(linha({ group_id: 'g3', nome_grupo: 'Conselho C', cs: 'Caio', continuidade_desafios: 'Não vejo continuidade e evolução nos meus desafios' }));
const extras = new Map([
  ['g1', { presencaPercentual: 60, ganhosPercentual: 30 }],
  ['g2', { presencaPercentual: 90, ganhosPercentual: 70 }],
]);
const tabela = tabelaDesafio(desafio, extras);
assert.equal(tabela.length, 2, 'g3 tem só uma resposta e fica de fora pela amostra mínima');
assert.equal(tabela[0].groupId, 'g1');
assert.equal(tabela[0].percentualTravados, 60);
assert.equal(tabela[0].fraseRevisao, 'Revisar a condução dos desafios com Ana');
const frases = frasesDesafio(tabela);
assert.equal(frases.length, 0, 'com um conselho de cada lado não sai frase por regra de amostra');

console.log('voz-membro.test.ts: tudo certo');
