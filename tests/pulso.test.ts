import assert from 'node:assert/strict';
import { modoFeedbackDoPeriodo, mesesDoPulso, resumirPulso, buscarPulsoIndividual } from '../lib/pulso.ts';
import { GESTOR_SCRIPT } from '../app/gestor-html.ts';
import { DASHBOARD_HTML } from '../app/dashboard-html.ts';

async function main() {
  // ---- qual estrutura vale em cada período ----
  assert.equal(modoFeedbackDoPeriodo('Setembro', 2026), 'legado');
  assert.equal(modoFeedbackDoPeriodo('Junho', 2026), 'legado');
  assert.equal(modoFeedbackDoPeriodo('Outubro', 2026), 'pulso');
  assert.equal(modoFeedbackDoPeriodo('Dezembro', 2026), 'pulso');
  assert.equal(modoFeedbackDoPeriodo('Visão Geral', 2026), 'ambos');
  assert.equal(modoFeedbackDoPeriodo('Janeiro', 2027), 'pulso');
  assert.equal(modoFeedbackDoPeriodo('Visão Geral', 2027), 'pulso');
  assert.equal(modoFeedbackDoPeriodo('Dezembro', 2025), 'legado');
  assert.deepEqual(mesesDoPulso(2026), ['Outubro', 'Novembro', 'Dezembro']);
  assert.equal(mesesDoPulso(2027).length, 12);
  assert.deepEqual(mesesDoPulso(2025), []);

  // ---- resumo agregado: NPS pela régua padrão, clareza, gargalos, destaques ----
  const linhas = [
    { respondente_nome: 'Pessoa Um', nota_recomendacao: 10, nota_clareza: 9, gargalos: ['Carteira e acompanhamento', 'Engajamento dos membros'], destaque_colaboracao: 'Rodrigo', melhorar_texto: 'Rotinas', comecar_parar_continuar: 'Começar dashboard', tema_apoio_texto: 'IA', lideranca_saber_texto: 'Nada', feedback_lideranca_texto: null },
    { respondente_nome: 'Pessoa Dois', nota_recomendacao: 7, nota_clareza: 7, gargalos: ['Carteira e acompanhamento'], destaque_colaboracao: 'Rodrigo', melhorar_texto: '  ', comecar_parar_continuar: null, tema_apoio_texto: null, lideranca_saber_texto: null, feedback_lideranca_texto: 'Mais clareza' },
    { respondente_nome: 'Pessoa Tres', nota_recomendacao: 3, nota_clareza: 4, gargalos: [], destaque_colaboracao: 'Marcos', melhorar_texto: null, comecar_parar_continuar: null, tema_apoio_texto: null, lideranca_saber_texto: null, feedback_lideranca_texto: null },
    { respondente_nome: 'Pessoa Quatro', nota_recomendacao: null, nota_clareza: null, gargalos: null, destaque_colaboracao: null },
  ];
  const r = resumirPulso(linhas);
  assert.equal(r.respostas, 4);
  // 1 promotor, 1 neutro, 1 detrator em 3 notas válidas: (1 - 1) / 3 = 0
  assert.deepEqual(r.nps, { promotores: 1, neutros: 1, detratores: 1, total: 3, score: 0 });
  assert.equal(r.clareza.media, 6.7);
  assert.deepEqual([r.clareza.baixa, r.clareza.media_faixa, r.clareza.alta, r.clareza.total], [1, 1, 1, 3]);
  assert.deepEqual(r.gargalos[0], { rotulo: 'Carteira e acompanhamento', qtd: 2 });
  assert.equal(r.gargalos.length, 2);
  assert.deepEqual(r.destaques, [{ rotulo: 'Rodrigo', qtd: 2 }, { rotulo: 'Marcos', qtd: 1 }]);
  assert.deepEqual(r.textos.melhorar, ['Rotinas']); // texto só com espaços não conta
  assert.deepEqual(r.textos.feedbackLideranca, ['Mais clareza']);
  // nenhum nome de respondente pode aparecer no resumo
  const json = JSON.stringify(r);
  ['Pessoa Um', 'Pessoa Dois', 'Pessoa Tres', 'Pessoa Quatro', 'respondente'].forEach((n) => assert.equal(json.includes(n), false, 'vazou ' + n));
  // período sem respostas
  const vazio = resumirPulso([]);
  assert.equal(vazio.nps.score, null);
  assert.equal(vazio.clareza.media, null);

  // ---- leitura individual: legado nunca toca o banco, pulso chama a função certa ----
  const chamadas: any[] = [];
  const sb: any = {
    rpc: async (nome: string, args: any) => { chamadas.push([nome, args]); return { data: { respostas: 5, avaliadores: 2, destaques: 1, falas: ['a', 'b'] }, error: null }; },
  };
  const leg = await buscarPulsoIndividual(sb, 'Vilker', 'Setembro', 2026);
  assert.equal(leg.modo, 'legado');
  assert.equal(chamadas.length, 0);
  const pul = await buscarPulsoIndividual(sb, 'Vilker', 'Outubro', 2026);
  assert.equal(pul.modo, 'pulso');
  assert.deepEqual(chamadas[0], ['pulso_cs_individual', { p_cs: 'Vilker', p_mes: 'Outubro' }]);
  assert.deepEqual([pul.respostas, pul.avaliadores, pul.destaques, pul.falas.length], [5, 2, 1, 2]);
  const amb = await buscarPulsoIndividual(sb, 'Vilker', 'Visão Geral', 2026);
  assert.equal(amb.modo, 'ambos');
  assert.deepEqual(chamadas[1], ['pulso_cs_individual', { p_cs: 'Vilker', p_mes: null }]);
  const sbErro: any = { rpc: async () => ({ data: null, error: { message: 'not authorized' } }) };
  await assert.rejects(() => buscarPulsoIndividual(sbErro, 'Vilker', 'Outubro', 2026), /not authorized/);

  // ---- os scripts embutidos continuam com sintaxe válida ----
  new Function(GESTOR_SCRIPT);
  const m = DASHBOARD_HTML.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(m, 'script do dashboard não encontrado');
  new Function(m![1]);
  assert.ok(GESTOR_SCRIPT.includes('/api/gestor/pulso'));
  assert.ok(DASHBOARD_HTML.includes('feedbackPulsoHtml_'));

  console.log('pulso.test.ts: tudo certo');
}
main();
