import assert from 'node:assert/strict';
import { classificarTemas, montarVoz, gerarInsights, generateVozLiderado, definirStatusVoz, statusVozValido, STATUS_VOZ } from '../lib/voz.ts';
import { GESTOR_SCRIPT, GESTOR_HTML } from '../app/gestor-html.ts';

async function main() {
  // ---- classificação por tema ----
  assert.equal(classificarTemas('Precisamos melhorar o processo no Monday')[0].chave, 'processos');
  assert.equal(classificarTemas('Mais clareza no alinhamento das reuniões')[0].chave, 'comunicacao');
  assert.equal(classificarTemas('Sobrecarga de demandas urgentes')[0].chave, 'carga');
  assert.deepEqual(classificarTemas('xyz qwe'), [{ chave: 'outros', rotulo: 'Outros' }]);
  assert.ok(classificarTemas('Reunião de alinhamento sobre processo e rotina de acompanhamento').length <= 2);
  assert.equal(classificarTemas('SOBRECARGA')[0].chave, 'carga'); // sem acento e sem diferença de caixa

  // ---- status ----
  assert.equal(STATUS_VOZ[0].chave, 'backlog'); // padrão é a primeira coluna
  assert.equal(statusVozValido('realizado'), true);
  assert.equal(statusVozValido('feito'), false);

  // ---- montarVoz ----
  const agora = new Date('2026-10-20T12:00:00Z');
  const base = { campo: 'melhorar', tipo: null, mes_grupo_titulo: 'OUTUBRO', observacao_lider: null, status_alterado_em: null };
  const linhas = [
    { ...base, id: 'a1', pulso_item_id: 1, texto: 'Melhorar o processo e o sistema de registro', status: 'backlog', criado_em: '2026-09-10T00:00:00Z' },
    { ...base, id: 'a2', pulso_item_id: 2, texto: 'Rotina de processo mais enxuta', status: 'em_andamento', criado_em: '2026-10-15T00:00:00Z' },
    { ...base, id: 'a3', pulso_item_id: 2, texto: 'Dashboard melhor no monday', status: 'realizado', criado_em: '2026-10-15T00:00:00Z' },
    { ...base, id: 'a4', pulso_item_id: 3, campo: 'lideranca_saber', texto: 'Sobrecarga de demanda urgente na carteira', status: 'backlog', criado_em: '2026-10-18T00:00:00Z' },
    { ...base, id: 'a5', pulso_item_id: 3, campo: 'comecar_parar_continuar', tipo: 'parar', texto: 'Parar de aceitar prazo irreal', status: 'rejeitado', criado_em: '2026-10-18T00:00:00Z' },
    { ...base, id: 'a6', pulso_item_id: 4, campo: 'comecar_parar_continuar', tipo: 'continuar', texto: 'Continuar a reunião semanal', status: 'backlog', criado_em: '2026-10-18T00:00:00Z' },
  ];
  const v = montarVoz(linhas, agora);
  assert.equal(v.resumo.total, 5); // o item continuar fica fora do quadro
  assert.equal(v.manter.length, 1);
  assert.deepEqual(v.resumo.porStatus, { backlog: 2, em_andamento: 1, realizado: 1, rejeitado: 1 });
  assert.equal(v.resumo.taxaTratamento, 60); // 3 de 5 com decisão
  const proc = v.temas.find((t) => t.chave === 'processos')!;
  assert.equal(proc.respostas, 2); // respostas 1 e 2, contadas uma vez cada
  const item1 = v.itens.find((i) => i.id === 'a1')!;
  assert.equal(item1.diasNoBacklog, 40);
  assert.equal(item1.recorrencia, 2);
  assert.equal(v.itens.find((i) => i.id === 'a3')!.diasNoBacklog, null); // fora do backlog
  assert.equal(montarVoz([], agora).resumo.taxaTratamento, null);

  // ---- privacidade: nada de respondente nem id da resposta de origem ----
  const json = JSON.stringify(v);
  assert.equal(json.includes('pulso_item_id'), false);
  assert.equal(json.includes('respondente'), false);

  // ---- insights ----
  const ins = gerarInsights(v, [{ rotulo: 'Carteira e acompanhamento', qtd: 3 }], 4);
  assert.ok(ins.length >= 3);
  assert.ok(ins.some((t) => t.includes('Processos e sistemas')));
  assert.ok(ins.some((t) => t.includes('alerta')));
  assert.ok(ins.some((t) => t.includes('30 dias')));
  // o item de parar do conjunto está rejeitado, então o insight só aparece com um parar em backlog
  assert.equal(ins.some((t) => t.includes('para parar')), false);
  const vParar = montarVoz([{ ...base, id: 'p1', pulso_item_id: 9, campo: 'comecar_parar_continuar', tipo: 'parar', texto: 'Parar reunião sem pauta', status: 'backlog', criado_em: '2026-10-19T00:00:00Z' }], agora);
  assert.ok(gerarInsights(vParar, [], 1).some((t) => t.includes('para parar 1 prática')));
  assert.ok(ins.some((t) => t.includes('Carteira e acompanhamento')));
  ins.forEach((t) => { assert.equal(/[‐-―−]|\s-\s/.test(t), false, 'traço no texto: ' + t); });
  assert.deepEqual(gerarInsights(montarVoz([], agora), [], 0), []);

  // ---- exclusão lógica: excluída não entra no resumo, nos temas nem nos insights ----
  const comExcluida = montarVoz([
    { ...base, id: 'e1', pulso_item_id: 20, campo: 'melhorar', tipo: null, texto: 'Sobrecarga de demandas urgentes', status: 'backlog', criado_em: '2026-10-19T00:00:00Z' },
    { ...base, id: 'e2', pulso_item_id: 21, campo: 'melhorar', tipo: null, texto: 'Sobrecarga de demandas urgentes', status: 'backlog', criado_em: '2026-10-19T00:00:00Z', excluido_em: '2026-10-20T00:00:00Z' },
  ], agora);
  assert.equal(comExcluida.resumo.total, 1);
  assert.deepEqual(comExcluida.itens.map((i) => i.id), ['e1']);
  assert.equal(comExcluida.temas[0].itens, 1);

  // ---- leitura simulada (GET) e gravação (RPC) ----
  const tabelas: Record<string, any[]> = {
    voz_liderado_itens: linhas,
    pulso_cs_items: [
      { id: 1, mes_grupo_titulo: 'OUTUBRO', gargalos: ['Carteira'] },
      { id: 2, mes_grupo_titulo: 'OUTUBRO', gargalos: ['Carteira'] },
      { id: 3, mes_grupo_titulo: 'NOVEMBRO', gargalos: [] },
    ],
  };
  const consulta = (nome: string) => {
    const q: any = { select: () => q, eq: () => q, is: () => q, not: () => q, order: () => q, limit: async () => ({ data: tabelas[nome], error: null }) };
    return q;
  };
  const sb: any = { from: consulta, rpc: async () => ({ data: null, error: null }) };
  const geral = await generateVozLiderado(sb, 'Visão Geral', 2026);
  assert.equal(geral.respostasNoPeriodo, 3);
  assert.equal(geral.resumo.total, 5);
  assert.equal(geral.gargalos[0].qtd, 2);
  assert.equal(geral.status.length, 4);
  const mesOut = await generateVozLiderado(sb, 'Outubro', 2026);
  assert.equal(mesOut.respostasNoPeriodo, 2);
  assert.equal(JSON.stringify(geral).includes('pulso_item_id'), false);
  assert.ok(Array.isArray(geral.excluidas));

  const chamadas: any[] = [];
  const sbRpc: any = { rpc: async (n: string, a: any) => { chamadas.push([n, a]); return { data: { id: 'a1', status: 'realizado', observacao_lider: 'ok', status_alterado_em: '2026-10-20T00:00:00Z' }, error: null }; } };
  const r = await definirStatusVoz(sbRpc, 'a1', 'realizado', 'ok');
  assert.deepEqual(chamadas[0], ['voz_definir_status', { p_id: 'a1', p_status: 'realizado', p_observacao: 'ok' }]);
  assert.equal(r.status, 'realizado');
  await definirStatusVoz(sbRpc, 'a1', 'backlog');
  assert.equal(chamadas[1][1].p_observacao, null); // sem observação mantém a atual
  await assert.rejects(() => definirStatusVoz(sbRpc, 'a1', 'feito'), /Status inválido/);
  const sbErro: any = { rpc: async () => ({ data: null, error: { message: 'not authorized' } }) };
  await assert.rejects(() => definirStatusVoz(sbErro, 'a1', 'backlog'), /not authorized/);

  // ---- a tela ----
  new Function(GESTOR_SCRIPT);
  assert.ok(GESTOR_SCRIPT.includes('/api/gestor/voz'));
  assert.ok(GESTOR_HTML.includes('data-tab="voz"'));
  assert.ok(GESTOR_HTML.includes('id="tab-voz"'));
  assert.ok(GESTOR_HTML.includes('Voz do liderado'));

  console.log('voz.test.ts: tudo certo');
}
main();
