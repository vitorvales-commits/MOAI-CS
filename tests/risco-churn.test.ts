import assert from 'node:assert/strict';
import { calcularRisco, mesclarConfig, mesesAteFimFidelidade, ordenarPorUrgencia, resumirCarteira, RISCO_CONFIG_PADRAO, type SinaisMembro } from '../lib/risco-churn.ts';

const HOJE = '2026-10-29';
const base = (o: Partial<SinaisMembro> = {}): SinaisMembro => ({
  membroId: 1, nome: 'Membro A', groupId: 'g1', conselho: 'Executivo', cs: 'Ana',
  notaNps: 10, alertasNpsAbertos: 0, statusAtual: 'Presente', statusRecentes: ['Presente', 'Presente', 'Presente'],
  semanasReportAtrasadoCs: 0, fimFidelidade: null, mensalidade: null, visitaAberta: false, ...o,
});

// baixo: tudo em ordem
const ok = calcularRisco(base(), HOJE);
assert.equal(ok.nivel, 'baixo'); assert.equal(ok.pontos, 0); assert.equal(ok.semDados, false);

// atenção: neutro no NPS e uma falta (10 + 10 = 20) mais fidelidade próxima (15) = 35
const at = calcularRisco(base({ notaNps: 8, statusRecentes: ['Presente', 'Ausente', 'Presente'], fimFidelidade: '2026-12-20' }), HOJE);
assert.equal(at.nivel, 'atencao'); assert.equal(at.pontos, 35); assert.equal(at.mesesRestantesFidelidade, 1);

// crítico: detrator (30) + alerta (15) + inadimplente (40) = 85
const cr = calcularRisco(base({ notaNps: 3, alertasNpsAbertos: 1, statusAtual: 'Inadimplente' }), HOJE);
assert.equal(cr.nivel, 'critico'); assert.equal(cr.pontos, 85);
assert.deepEqual(cr.motivos.map((m) => m.sinal), ['nps', 'alertas', 'status']);

// teto de 100 e tetos por sinal
const tudo = calcularRisco(base({ notaNps: 0, alertasNpsAbertos: 9, statusAtual: 'Sem retorno', statusRecentes: ['Ausente', 'Ausente', 'Não vai'], semanasReportAtrasadoCs: 9, fimFidelidade: '2026-11-30' }), HOJE);
assert.equal(tudo.pontos, 100);

// dado ausente: não pontua, lista o que faltou e marca semDados quando faltam os três sinais do membro
const vazio = calcularRisco(base({ notaNps: null, alertasNpsAbertos: null, statusAtual: null, statusRecentes: [], semanasReportAtrasadoCs: null }), HOJE);
assert.equal(vazio.nivel, 'baixo'); assert.equal(vazio.semDados, true);
assert.deepEqual(vazio.ausentes, ['nps', 'alertas', 'status', 'presenca', 'report', 'fidelidade']);
const parcial = calcularRisco(base({ notaNps: null }), HOJE);
assert.equal(parcial.semDados, false); assert.ok(parcial.ausentes.includes('nps'));

// configuração muda o resultado sem tocar na função
const rigido = mesclarConfig([{ chave: 'limiar_atencao', valor: '10' }, { chave: 'inexistente', valor: 5 }, { chave: 'limiar_critico', valor: 'abc' }]);
assert.equal(rigido.limiar_atencao, 10); assert.equal(rigido.limiar_critico, RISCO_CONFIG_PADRAO.limiar_critico);
assert.equal(calcularRisco(base({ notaNps: 8 }), HOJE, rigido).nivel, 'atencao');
assert.deepEqual(mesclarConfig(null), { ...RISCO_CONFIG_PADRAO });

// fidelidade: meses restantes, exposição só com mensalidade, nunca inventada
assert.equal(mesesAteFimFidelidade('2027-01-29', HOJE), 3);
assert.equal(mesesAteFimFidelidade('2027-01-28', HOJE), 2);
assert.equal(mesesAteFimFidelidade('2026-09-01', HOJE), 0);
assert.equal(mesesAteFimFidelidade(null, HOJE), null);
assert.equal(mesesAteFimFidelidade('lixo', HOJE), null);
const semMrr = calcularRisco(base({ fimFidelidade: '2027-01-29' }), HOJE);
assert.equal(semMrr.exposicao, null); assert.equal(semMrr.pctMensalidadesRestantes, 25);
assert.equal(calcularRisco(base({ fimFidelidade: '2027-01-29', mensalidade: 2000 }), HOJE).exposicao, 6000);

// ordenação e resumo da carteira
const mk = (nome: string, cs: string, o: Partial<SinaisMembro>) => { const s = base({ nome, cs, ...o }); return { ...s, risco: calcularRisco(s, HOJE) }; };
const lista = [mk('B', 'Ana', {}), mk('C', 'Bia', { notaNps: 3, statusAtual: 'Inadimplente' }), mk('D', 'Ana', { notaNps: 8 })];
assert.deepEqual(ordenarPorUrgencia(lista).map((m) => m.nome), ['C', 'D', 'B']);
const r = resumirCarteira(lista);
assert.equal(r.carteira.critico, 1); assert.equal(r.carteira.pctCritico, 33.3);
assert.equal(r.porCS[0].cs, 'Bia'); assert.equal(r.exposicaoTotal, null);
assert.equal(resumirCarteira([]).carteira.pctCritico, null);
console.log('risco-churn ok');
