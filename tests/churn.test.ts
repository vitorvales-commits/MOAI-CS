import assert from 'node:assert/strict';
import {
  parseRecorte, recorteParaQuery, chaveProdutos, descreverRecorte, rotuloProduto, graficoChurnSVG, referenciaDoGrafico,
  PRODUTO_SEM_INFORMACAO, type SerieChurn,
} from '../lib/churn.ts';
import { GESTOR_SCRIPT } from '../app/gestor-html.ts';

// ---- padrão: todos os produtos, Comunidade fora da conta ----
let r = parseRecorte(new URLSearchParams('granularidade=mes&ref=2026-09'));
assert.equal(r.produtos, null);
assert.equal(r.incluirComunidade, false);
assert.equal(chaveProdutos(r), 'todos_exceto_comunidade');
assert.match(descreverRecorte(r), /todos os produtos, Comunidade fora da conta/);
assert.equal(recorteParaQuery(r), 'granularidade=mes&ref=2026-09');

// ---- a URL reproduz a mesma seleção (ida e volta) ----
r = parseRecorte(new URLSearchParams('granularidade=semana&ref=2026-03&produtos=Executivo,C-Level%20%2B,sem_produto_informado&comunidade=1'));
assert.deepEqual(r.produtos, ['Executivo', 'C-Level +', 'sem_produto_informado']);
assert.equal(r.incluirComunidade, true);
const volta = parseRecorte(new URLSearchParams(recorteParaQuery(r)));
assert.deepEqual(volta, r);
assert.equal(chaveProdutos(r), 'C-Level +|Executivo|sem_produto_informado|comunidade');
assert.match(descreverRecorte(r), /Comunidade incluída na conta/);

// ---- nenhum produto marcado é diferente de todos ----
r = parseRecorte(new URLSearchParams('produtos='));
assert.deepEqual(r.produtos, []);
assert.equal(chaveProdutos(r), 'nenhum');
assert.match(descreverRecorte(r), /nenhum produto marcado/);

// ---- Comunidade na lista de produtos vira a chave própria, e o JSON do POST segue a mesma regra ----
r = parseRecorte({ granularidade: 'mes', ref: '2026-09', produtos: ['Executivo', 'Comunidade'], comunidade: false });
assert.deepEqual(r.produtos, ['Executivo']);
assert.equal(r.incluirComunidade, true);
r = parseRecorte({ granularidade: 'mes', ref: '2026-09', produtos: null, comunidade: true });
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

// ---- recordes: linha tracejada e selo no gráfico ----
const serie: SerieChurn = {
  granularidade: 'mes', total: 5,
  periodos: [
    { inicio: '2026-08-01', fim: '2026-08-31', semana: null, rotulo: 'ago/26', rotuloLongo: 'agosto de 2026', total: 2, porMotivo: { financeiro: 2 } },
    { inicio: '2026-09-01', fim: '2026-09-30', semana: null, rotulo: 'set/26', rotuloLongo: 'setembro de 2026', total: 3, porMotivo: { financeiro: 3 } },
  ],
  porMotivo: [{ chave: 'financeiro', rotulo: 'Motivos financeiros', cor: '#eb6834', qtd: 5, pct: 100 }],
};
const semRecorde = graficoChurnSVG(serie, 'x');
assert.ok(!semRecorde.includes('churn-recorde'));
const rec = {
  indicador: 'churn', meta: null,
  mensal: { valor: 37, mes: '2026-03-01', emAndamento: false, empates: 1 },
  semanal: { valor: 16, mes: '2026-03-01', semana: 1, emAndamento: false },
  valorMesCorrente: 2, diferenca: -35, historicoDesde: '2025-10-01', calculadoEm: null,
};
const ref = referenciaDoGrafico(rec, 'mes')!;
assert.equal(ref.valor, 37);
assert.equal(ref.texto, 'Recorde 37 em mar/26');
const comRecorde = graficoChurnSVG(serie, 'x', ref);
assert.ok(comRecorde.includes('stroke-dasharray="6 4"') && comRecorde.includes('Recorde 37 em mar/26'));
// o recorde acima das barras entra na escala do eixo: o topo tem de alcançar 37 (rótulo 40 no eixo)
assert.ok(comRecorde.includes('>40</text>'), 'eixo cobre o recorde');
assert.equal(referenciaDoGrafico(rec, 'semana')!.texto, 'Recorde semanal 16, semana 1 de mar/26');
assert.equal(referenciaDoGrafico({ ...rec, mensal: { ...rec.mensal!, emAndamento: true } }, 'mes')!.texto, 'Recorde 37 em mar/26, em andamento');
assert.equal(referenciaDoGrafico({ ...rec, mensal: null }, 'mes'), null);

// ---- o script do navegador compila (erro de sintaxe aqui derrubaria a aba inteira) ----
new Function(GESTOR_SCRIPT);

console.log('churn.test.ts: tudo certo');
