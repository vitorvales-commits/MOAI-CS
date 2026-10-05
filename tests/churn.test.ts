import assert from 'node:assert/strict';
import {
  mesAtualBrasilia, parseRecorte, recorteParaQuery, chaveProdutos, descreverRecorte, rotuloProduto, graficoChurnSVG, textosTela, ultimoMesFechado, montarSerie, rotuloMesCurto,
  PRODUTO_SEM_INFORMACAO, type SerieChurn, type TelaChurn, type Recorte,
} from '../lib/churn.ts';
import { GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { parseChurn } from '../lib/reports.ts';

// ---- padrão: carteira atual, todos os produtos, Comunidade fora da conta ----
let r = parseRecorte(new URLSearchParams('granularidade=mes&ref=2026-09'));
assert.equal(r.base, 'carteira_atual');
assert.equal(r.produtos, null);
assert.equal(r.incluirComunidade, false);
assert.equal(chaveProdutos(r), 'carteira_atual|todos');
assert.match(descreverRecorte(r), /Carteira atual: CS ativos, sem a Comunidade, todos os produtos, Comunidade fora da conta/);
assert.equal(recorteParaQuery(r), 'granularidade=mes&ref=2026-09');
// sem ref, vale o último mês fechado (nunca o mês em andamento)
const mesAtual = mesAtualBrasilia();
assert.notEqual(parseRecorte(new URLSearchParams('')).referencia, mesAtual);
assert.equal(parseRecorte(new URLSearchParams('')).referencia, ultimoMesFechado());
// na carteira atual a Comunidade nunca entra, mesmo pedida na URL
r = parseRecorte(new URLSearchParams('comunidade=1&produtos=Executivo,Comunidade'));
assert.equal(r.incluirComunidade, false);
// toda a rede: base na URL, Comunidade pode entrar
r = parseRecorte(new URLSearchParams('base=toda_a_rede'));
assert.equal(r.base, 'toda_a_rede');
assert.equal(chaveProdutos(r), 'todos_exceto_comunidade');
assert.match(descreverRecorte(r), /Toda a rede: todos os CS e ex CS, todos os produtos, Comunidade fora da conta/);
assert.equal(recorteParaQuery(r), 'granularidade=mes&ref=' + r.referencia + '&base=toda_a_rede');

// ---- a URL reproduz a mesma seleção (ida e volta) ----
r = parseRecorte(new URLSearchParams('granularidade=semana&ref=2026-03&base=toda_a_rede&produtos=Executivo,C-Level%20%2B,sem_produto_informado&comunidade=1'));
assert.deepEqual(r.produtos, ['Executivo', 'C-Level +', 'sem_produto_informado']);
assert.equal(r.incluirComunidade, true);
const volta = parseRecorte(new URLSearchParams(recorteParaQuery(r)));
assert.deepEqual(volta, r);
assert.equal(chaveProdutos(r), 'C-Level +|Executivo|sem_produto_informado|comunidade');
assert.equal(chaveProdutos({ ...r, base: 'carteira_atual', incluirComunidade: false }), 'carteira_atual|C-Level +|Executivo|sem_produto_informado');
assert.match(descreverRecorte(r), /Comunidade incluída na conta/);

// ---- nenhum produto marcado é diferente de todos ----
r = parseRecorte(new URLSearchParams('produtos='));
assert.deepEqual(r.produtos, []);
assert.equal(chaveProdutos(r), 'carteira_atual|nenhum');
assert.match(descreverRecorte(r), /nenhum produto marcado/);

// ---- Comunidade na lista de produtos vira a chave própria, e o JSON do POST segue a mesma regra ----
r = parseRecorte({ granularidade: 'mes', ref: '2026-09', base: 'toda_a_rede', produtos: ['Executivo', 'Comunidade'], comunidade: false });
assert.deepEqual(r.produtos, ['Executivo']);
assert.equal(r.incluirComunidade, true);
r = parseRecorte({ granularidade: 'mes', ref: '2026-09', base: 'toda_a_rede', produtos: null, comunidade: true });
assert.equal(r.produtos, null);
assert.equal(chaveProdutos(r), null, 'todos com Comunidade dentro mantém a chave nula do recorte antigo');

// ---- link antigo de produto único continua valendo ----
r = parseRecorte(new URLSearchParams('produto=__sem_produto__'));
assert.deepEqual(r.produtos, [PRODUTO_SEM_INFORMACAO]);
r = parseRecorte(new URLSearchParams('produto=Executivo'));
assert.deepEqual(r.produtos, ['Executivo']);

// ---- rótulos escritos sem hífen ----
assert.equal(rotuloProduto('C-Level'), 'C Level');
assert.equal(rotuloProduto('C-Level +'), 'C Level +');
assert.equal(rotuloProduto(PRODUTO_SEM_INFORMACAO), 'Sem produto informado');
assert.ok(!/-/.test(descreverRecorte(parseRecorte(new URLSearchParams('produtos=C-Level')))), 'descrição do recorte sem hífen');

// ---- gráfico: sem linha de recorde, com destaque âmbar no mês de referência ----
const serie: SerieChurn = {
  granularidade: 'mes', total: 5,
  periodos: [
    { inicio: '2026-08-01', fim: '2026-08-31', semana: null, rotulo: 'ago/26', rotuloLongo: 'agosto de 2026', total: 2, porMotivo: { financeiro: 2 } },
    { inicio: '2026-09-01', fim: '2026-09-30', semana: null, rotulo: 'set/26', rotuloLongo: 'setembro de 2026', total: 3, porMotivo: { financeiro: 3 } },
  ],
  porMotivo: [{ chave: 'financeiro', rotulo: 'Motivos financeiros', cor: '#eb6834', qtd: 5, pct: 100 }],
};
const semDestaque = graficoChurnSVG(serie, 'x');
assert.ok(!semDestaque.includes('churn-destaque'));
const comDestaque = graficoChurnSVG(serie, 'x', '2026-09-01');
assert.ok(comDestaque.includes('class="churn-destaque"') && comDestaque.includes('#C89A2E'));
for (const svg of [semDestaque, comDestaque]) {
  assert.ok(!svg.includes('stroke-dasharray="6 4"'), 'nunca há linha tracejada de recorde no gráfico');
  assert.ok(!/Recorde/.test(svg), 'o recorde não aparece dentro do gráfico');
}

// ---- textos da tela: uma definição por número ----
const comunidade = { incluida: false, totalMes: 6, totalRedeMes: 22, porMotivo: [] };
const tela = (o: Partial<TelaChurn>): TelaChurn => ({
  base: 'carteira_atual', referencia: '2026-09', emAndamento: false, primeiroMesCarteira: '2026-05-01', serie,
  totalMes: 10, totalMesAnterior: 5, motivoTop: { chave: 'falta_de_tempo', rotulo: 'Falta de tempo', qtd: 5 },
  recordeMensal: { valor: 10, mes: '2026-09-01', emAndamento: false }, recordeSemanal: { valor: 4, mes: '2026-09-01', semana: 3, emAndamento: false },
  comunidade, ...o,
});
const rec = (o: Partial<Recorte> = {}): Recorte => ({ ...parseRecorte(new URLSearchParams('ref=2026-09')), ...o });
let x = textosTela(tela({}), rec(), 5);
assert.equal(x.rotuloNumero, 'Churns em setembro de 2026');
assert.equal(x.definicaoNumero, 'Carteira atual: CS ativos, sem a Comunidade.');
assert.equal(x.variacao, '5 a mais que em agosto de 2026');
assert.equal(x.motivoRotulo, 'Falta de tempo');
assert.equal(x.motivoFracao, '5 de 10');
assert.equal(x.notaRecorde, 'Este mês é o recorde histórico neste filtro (carteira atual): 10 churns.');
assert.equal(x.linhaComunidade, 'Fora desta conta: Comunidade, 6 churns em setembro de 2026.');
assert.equal(x.linkLista, 'Ver os 10 churns deste mês');
assert.equal(x.avisoCarteira, 'Antes de mai/26 a carteira era de outros CS.', 'o primeiro mês da carteira vem dos dados');
x = textosTela(tela({ base: 'toda_a_rede', totalMes: 16, totalMesAnterior: 20, recordeMensal: { valor: 33, mes: '2026-01-01', emAndamento: false } }), rec({ base: 'toda_a_rede' }), 5);
assert.equal(x.definicaoNumero, 'Toda a rede: todos os CS e ex CS, sem a Comunidade.');
assert.equal(x.variacao, '4 a menos que em agosto de 2026');
assert.equal(x.notaRecorde, 'Recorde histórico neste filtro (toda a rede): 33 em janeiro de 2026.');
assert.equal(x.avisoCarteira, null);
x = textosTela(tela({ base: 'toda_a_rede', totalMes: 22, comunidade: { ...comunidade, incluida: true }, recordeMensal: { valor: 37, mes: '2026-03-01', emAndamento: false } }), rec({ base: 'toda_a_rede', incluirComunidade: true }), 5);
assert.equal(x.definicaoNumero, 'Toda a rede: todos os CS e ex CS, com a Comunidade.');
assert.equal(x.notaRecorde, 'Recorde histórico neste filtro (toda a rede): 37 em março de 2026.');
assert.equal(x.linhaComunidade, 'Comunidade incluída nesta conta: 6 churns em setembro de 2026.');
// mês em andamento: rótulo até o dia de hoje e sem variação
x = textosTela(tela({ referencia: '2026-10', emAndamento: true, totalMes: 2 }), rec({ referencia: '2026-10' }), 5);
assert.equal(x.rotuloNumero, 'Churns em outubro de 2026, até 5 de outubro');
assert.equal(x.variacao, '');
assert.equal(x.linkLista, 'Ver os 2 churns deste mês até hoje');
// por semana: nota de recorde semanal
x = textosTela(tela({}), rec({ granularidade: 'semana' }), 5);
assert.equal(x.notaRecorde, 'Recorde semanal neste filtro (carteira atual): 4 na semana 3 de setembro de 2026.');
// sem churn no mês
x = textosTela(tela({ totalMes: 0, motivoTop: null, recordeMensal: null }), rec(), 5);
assert.equal(x.motivoRotulo, 'Sem churn no mês');
assert.equal(x.notaRecorde, '');
// nenhum texto da tela tem travessão ou hífen
for (const t of [x, textosTela(tela({}), rec(), 5)]) {
  for (const v of Object.values(t)) assert.ok(typeof v !== 'string' || !/[-–—]/.test(v), 'texto da tela sem traço: ' + v);
}
// série montada a partir das linhas do banco soma o que o banco devolveu
const m = montarSerie([
  { periodo_inicio: '2026-09-01', periodo_fim: '2026-09-30', semana: null, motivo: 'financeiro', qtd: 3 },
  { periodo_inicio: '2026-09-01', periodo_fim: '2026-09-30', semana: null, motivo: 'falta_de_tempo', qtd: 2 },
  { periodo_inicio: '2026-08-01', periodo_fim: '2026-08-31', semana: null, motivo: null, qtd: 0 },
], 'mes');
assert.equal(m.total, 5);
assert.deepEqual(m.periodos.map((p) => [p.rotulo, p.total]), [['ago/26', 0], ['set/26', 5]]);
assert.equal(rotuloMesCurto('2026-05-01'), 'mai/26');

// ---- card Churn: carteira atual, a Comunidade nunca entra e a data é a data de referência ----
const linhasCard = [
  { quem_e_seu_cs: 'Vitor', data: '2026-09-09', data_referencia: '2026-09-09', eh_comunidade: false, produto: 'C-Level' },
  { quem_e_seu_cs: 'Vitor', data: '2026-09-15', data_referencia: '2026-09-15', eh_comunidade: false, produto: 'Executivo' },
  // Comunidade sob um CS ativo: não conta no churn, que era a origem do 11 contra 10
  { quem_e_seu_cs: 'Vitor', data: '2026-09-29', data_referencia: '2026-09-29', eh_comunidade: true, produto: 'Comunidade' },
  // sem a coluna data do Monday: conta pela data de criação, igual à tela
  { quem_e_seu_cs: 'Vitor', data: null, data_referencia: '2026-09-20', eh_comunidade: false, produto: null },
  { quem_e_seu_cs: 'Marcos', data: '2026-08-05', data_referencia: '2026-08-05', eh_comunidade: false, produto: 'Fast Track' },
];
const card = parseChurn(linhasCard, 'Vitor', '2026-09-01', '2026-09-30');
assert.equal(card.churn, 3, 'Comunidade fora, linha sem data dentro');
assert.equal(parseChurn(linhasCard, 'Marcos', '2026-09-01', '2026-09-30').churn, 0);

// ---- o script do navegador compila (erro de sintaxe aqui derrubaria a aba inteira) ----
new Function(GESTOR_SCRIPT);

console.log('churn.test.ts: tudo certo');
