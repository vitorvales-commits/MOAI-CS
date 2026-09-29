import assert from 'node:assert/strict';
import { interpretar, responderMetas, processarPergunta, type LinhaMeta } from '../lib/consulta.ts';

async function main() {
const roster = [
  { nome: 'Rodrigo', nome_completo: 'Rodrigo Queiroz Campos' },
  { nome: 'Luana', nome_completo: 'Luana Sampaio Alves' },
  { nome: 'Vitor', nome_completo: 'Vitor Lucas Lacerda de Oliveira' },
];
const hoje = new Date(2026, 8, 29);

let c = interpretar('quais metas o rodrigo bateu e não bateu?', roster, hoje);
assert.deepEqual(c, { intencao: 'metas', cs: 'Rodrigo', mes: '2026-09-01', filtro: 'ambos' });
c = interpretar('O que a Luana não bateu em agosto?', roster, hoje);
assert.deepEqual([c.cs, c.mes, c.filtro], ['Luana', '2026-08-01', 'nao_bateu']);
c = interpretar('metas do time mês passado', roster, hoje);
assert.deepEqual([c.cs, c.mes], [null, '2026-08-01']);
c = interpretar('o que o vitor bateu em março de 2026', roster, hoje);
assert.deepEqual([c.cs, c.mes, c.filtro], ['Vitor', '2026-03-01', 'bateu']);

const L = (metrica: string, direcao: 'min'|'max', meta: number|null, real: number, status: LinhaMeta['status'], div = false): LinhaMeta =>
  ({ cs: 'Rodrigo', mes: '2026-09-01', metrica, direcao, meta, alcancado_manual: real, realizado_calculado: real, realizado: real, fonte: 'calculado', status, percentual: null, divergencia: div });
const linhas = [
  L('cases','min',7,7,'bateu'), L('matchmakings','min',16,33,'bateu'), L('indicacoes','min',4,4,'bateu'),
  L('rounds','min',1,2,'bateu',true), L('upsell','min',1,1,'bateu',true), L('churn','max',null,2,'sem_meta'),
];
const r = responderMetas(linhas, interpretar('metas do rodrigo', roster, hoje));
console.log(r);
assert.ok(!/[-–—]/.test(r), 'resposta não pode conter traço');
assert.match(r, /5 de 5 metas batidas/);

// Despacho por intenção: pergunta de metas passa pela RPC consultar_metas_cs (aqui simulada) e
// devolve resource pra auditoria; pergunta sem intenção reconhecida cai no texto padrão com
// exemplos, sem chamar o banco.
const supabaseFalsoMetas = { rpc: async (_nome: string, _args: unknown) => ({ data: linhas, error: null }) } as any;
const respostaMetas = await processarPergunta(supabaseFalsoMetas, 'metas do rodrigo', roster, hoje);
assert.equal(respostaMetas.intencao, 'metas');
assert.equal(respostaMetas.resource, 'Rodrigo|2026-09-01');
assert.ok(!/[-–—]/.test(respostaMetas.resposta), 'resposta da intenção não pode conter traço');

const supabaseNuncaChamado = { rpc: async () => { throw new Error('não deveria consultar o banco'); } } as any;
const respostaDesconhecida = await processarPergunta(supabaseNuncaChamado, 'qual é a previsão do tempo em são paulo', roster, hoje);
assert.equal(respostaDesconhecida.intencao, 'nenhuma');
assert.ok(!/[-–—]/.test(respostaDesconhecida.resposta), 'resposta padrão não pode conter traço');
assert.match(respostaDesconhecida.resposta, /metas/);

// Recorde/meta do time: usa metas_time_mensal (agregado), não consultar_metas_cs com cs nulo,
// e tem prioridade sobre a intenção "metas" quando a pergunta fala do time/equipe ou de recorde.
const linhasTime = [
  { indicador: 'rounds', mes: '2026-09-01', meta: 6, meta_mes_origem: '2026-07-01', realizado: 8, fonte: 'calculado', status: 'bateu', percentual: 133, em_recorde: true, recorde_valor: 7, recorde_mes: '2026-07-01', recorde_distancia: 1 },
  { indicador: 'churn', mes: '2026-09-01', meta: 1, meta_mes_origem: '2026-09-01', realizado: 2, fonte: 'calculado', status: 'nao_bateu', percentual: 200, em_recorde: false, recorde_valor: null, recorde_mes: null, recorde_distancia: null },
  { indicador: 'carteira', mes: '2026-09-01', meta: null, meta_mes_origem: null, realizado: null, fonte: 'sem_dado', status: 'sem_meta', percentual: null, em_recorde: false, recorde_valor: null, recorde_mes: null, recorde_distancia: null },
];
let rpcChamada = '';
const supabaseFalsoTime = { rpc: async (nome: string, _args: unknown) => { rpcChamada = nome; return { data: linhasTime, error: null }; } } as any;
const respostaTimeResult = await processarPergunta(supabaseFalsoTime, 'o time bateu a meta de rounds esse mês?', roster, hoje);
assert.equal(respostaTimeResult.intencao, 'recordes_time');
assert.equal(rpcChamada, 'metas_time_mensal');
assert.equal(respostaTimeResult.resource, 'time|2026-09-01');
assert.match(respostaTimeResult.resposta, /1 de 2 metas batidas/);
assert.match(respostaTimeResult.resposta, /recorde anterior de 7/);
assert.ok(!/[-–—]/.test(respostaTimeResult.resposta), 'resposta de time não pode conter traço');
assert.ok(!/carteira/i.test(respostaTimeResult.resposta), 'carteira não entra no agregado do time');

const respostaRecorde = await processarPergunta(supabaseFalsoTime, 'quais recordes foram batidos em setembro de 2026?', roster, hoje);
assert.equal(respostaRecorde.intencao, 'recordes_time');

console.log('OK');
}

main().catch((err) => { console.error(err); process.exit(1); });
