// Acompanhamento dos relatórios do conselho na visão de gestor: cobertura, avaliações, leituras determinísticas e detalhe.
// Roda com: npx tsx tests/relatorios-gestor.test.ts
import assert from 'node:assert/strict';
import { montarPainelRelatorios, mesDeBrasilia, dataCurta, CATALOGO_LEITURAS_RELATORIO, type EncontroEntrada, type RelatorioEntrada } from '../lib/relatorios-gestor.ts';
import { REL_GESTOR_LEITURAS_VISIVEIS, REL_GESTOR_DETALHES_VISIVEIS } from '../lib/constants.ts';

const HOJE = '2026-10-27T15:00:00Z';
const enc = (g: string, cs: string, dia: string, estado: EncontroEntrada['estado']): EncontroEntrada => ({ groupId: g, conselho: 'Conselho ' + g, cs, dataEncontro: dia + 'T18:00:00Z', estado });
const rel = (id: string, g: string, cs: string, dia: string, p: Partial<RelatorioEntrada> = {}): RelatorioEntrada => ({
  id, groupId: g, conselho: 'Conselho ' + g, dataEncontro: dia + 'T18:00:00Z', csNome: cs, avaliacao: 'Bom', avanco: 'Plano fechado.',
  membroAtencaoId: null, membroAtencaoNome: null, membroAtencaoMotivo: null, combinado: null, enviadoEm: dia + 'T20:00:00Z', estado: 'enviado_no_prazo', faltas: [], ...p,
});
const ctx = (encontros: EncontroEntrada[], relatorios: RelatorioEntrada[]) => ({ mes: '2026-10', hoje: HOJE, encontros, relatorios });

// ---- datas em Brasília ----
assert.equal(mesDeBrasilia('2026-11-01T01:00:00Z'), '2026-10', '01h UTC de 1º de novembro ainda é 31/10 em Brasília');
assert.equal(dataCurta('2026-10-05T02:00:00Z'), '04/10');

// ---- estado vazio: sem encontros e sem relatórios ----
let p = montarPainelRelatorios(ctx([], []));
assert.equal(p.vazio, 'sem_encontros');
assert.equal(p.leituras.total, 0);
p = montarPainelRelatorios(ctx([enc('a', 'Iasmin', '2026-10-10', 'atrasado'), enc('b', 'Iasmin', '2026-10-12', 'a_preencher')], []));
assert.equal(p.vazio, 'sem_relatorios', 'encontros exigidos sem nenhum relatório enviado');
assert.equal(p.relance.exigidos, 2);
assert.equal(p.relance.enviados, 0);
assert.equal(p.relance.porCS[0].atrasados, 1);
assert.equal(p.relance.avaliacoes.every((a) => a.qtd === 0), true);

// ---- cobertura do mês e por CS (mês de setembro fica de fora) ----
const encontros = [
  enc('a', 'Iasmin', '2026-10-02', 'enviado_no_prazo'), enc('b', 'Iasmin', '2026-10-09', 'enviado_com_atraso'), enc('c', 'Kadydja', '2026-10-14', 'atrasado'),
  enc('d', 'Kadydja', '2026-10-20', 'vence_hoje'), enc('e', 'Kadydja', '2026-09-25', 'enviado_no_prazo'),
];
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02'), rel('r2', 'b', 'Iasmin', '2026-10-09', { estado: 'enviado_com_atraso', avaliacao: 'Muito bom' })]));
assert.equal(p.relance.exigidos, 4);
assert.equal(p.relance.enviados, 2);
assert.equal(p.relance.semRelatorio, 2);
assert.deepEqual(p.relance.cobertura.map((c) => c.qtd), [1, 1, 1, 1]);
assert.equal(p.relance.porCS[0].cs, 'Kadydja', 'quem tem atrasado vem primeiro');
assert.deepEqual(p.relance.avaliacoes.map((a) => a.qtd), [1, 1, 0, 0]);
assert.equal(p.vazio, null);

// ---- leitura: desistência é severidade alta e leva o CS ----
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', { faltas: [{ membroId: 9, nome: 'Ana', tipo: 'desistencia', categoria: null, justificativa: null }] })]));
const des = p.leituras.visiveis.find((i) => i.id.startsWith('rel_desistencia'));
assert.ok(des && des.severidade === 'alta' && des.responsaveis[0] === 'Iasmin');
assert.ok(des!.referencia.includes('sem motivo registrado'));
assert.equal(p.relance.desistencias, 1);

// ---- leitura: dois encontros seguidos abaixo do esperado, e só um não duplica ----
p = montarPainelRelatorios(ctx(encontros, [rel('r0', 'a', 'Iasmin', '2026-09-30', { avaliacao: 'Regular' }), rel('r1', 'a', 'Iasmin', '2026-10-02', { avaliacao: 'Ruim' })]));
assert.equal(p.leituras.visiveis.filter((i) => i.id.startsWith('rel_avaliacao_em_queda')).length, 1);
assert.equal(p.leituras.visiveis.filter((i) => i.id.startsWith('rel_encontro_abaixo')).length, 0, 'a queda já cobre o encontro abaixo');
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', { avaliacao: 'Ruim' })]));
const abaixo = p.leituras.visiveis.find((i) => i.id.startsWith('rel_encontro_abaixo'));
assert.ok(abaixo && abaixo.severidade === 'alta', 'Ruim isolado é alta');
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', { avaliacao: 'Regular' })]));
assert.equal(p.leituras.visiveis.find((i) => i.id.startsWith('rel_encontro_abaixo'))!.severidade, 'media');
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', { avaliacao: 'Bom' })]));
assert.equal(p.leituras.total, 0, 'encontro bom não gera leitura');

// ---- leitura: membro em atenção, reincidência sobe a severidade ----
const atencao = { membroAtencaoId: 5, membroAtencaoNome: 'Bia', membroAtencaoMotivo: 'Sem entregar o desafio' };
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', atencao)]));
assert.equal(p.leituras.visiveis.find((i) => i.id.startsWith('rel_membro_atencao'))!.severidade, 'media');
p = montarPainelRelatorios(ctx(encontros, [rel('r0', 'a', 'Iasmin', '2026-09-18', atencao), rel('r1', 'a', 'Iasmin', '2026-10-02', atencao)]));
const reinc = p.leituras.visiveis.find((i) => i.id.startsWith('rel_membro_atencao'))!;
assert.equal(reinc.severidade, 'alta');
assert.ok(reinc.numero.includes('2 relatórios'));
assert.equal(p.relance.emAtencao, 1, 'o relance conta só o mês');

// ---- leitura: faltas recorrentes do mesmo membro na janela de 90 dias ----
const falta = (cat: string) => ({ faltas: [{ membroId: 3, nome: 'Caio', tipo: 'falta' as const, categoria: cat, justificativa: 'Agenda' }] });
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', falta('Viagem'))]));
assert.equal(p.leituras.visiveis.some((i) => i.id.startsWith('rel_faltas_recorrentes')), false, 'uma falta só não é recorrência');
p = montarPainelRelatorios(ctx(encontros, [rel('r0', 'a', 'Iasmin', '2026-08-20', falta('Viagem')), rel('r1', 'a', 'Iasmin', '2026-10-02', falta('Viagem'))]));
const rec = p.leituras.visiveis.find((i) => i.id.startsWith('rel_faltas_recorrentes'));
assert.ok(rec && rec.numero.startsWith('2 faltas') && rec.referencia.includes('viagem'));
p = montarPainelRelatorios(ctx(encontros, [rel('r0', 'a', 'Iasmin', '2026-05-01', falta('Viagem')), rel('r1', 'a', 'Iasmin', '2026-10-02', falta('Viagem'))]));
assert.equal(p.leituras.visiveis.some((i) => i.id.startsWith('rel_faltas_recorrentes')), false, 'falta fora da janela não conta');

// ---- leitura: sem retorno do membro agrupa o mês ----
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02', falta('Sem retorno do membro')), rel('r2', 'b', 'Iasmin', '2026-10-09', { faltas: [{ membroId: 4, nome: 'Duda', tipo: 'falta', categoria: 'Sem retorno do membro', justificativa: 'Não atendeu' }] })]));
assert.ok(p.leituras.visiveis.some((i) => i.id === 'rel_sem_retorno' && i.numero.includes('2 faltas sem retorno em 2 conselhos')));

// ---- leitura: CS com atraso reincidente ----
p = montarPainelRelatorios(ctx([enc('a', 'Kadydja', '2026-10-02', 'atrasado'), enc('b', 'Kadydja', '2026-10-09', 'enviado_com_atraso'), enc('c', 'Iasmin', '2026-10-09', 'atrasado')], []));
const atr = p.leituras.visiveis.filter((i) => i.id.startsWith('rel_cs_reincidente_atraso'));
assert.equal(atr.length, 1);
assert.equal(atr[0].responsaveis[0], 'Kadydja');

// ---- ordenação por severidade e corte de visíveis ----
const muitos: RelatorioEntrada[] = [];
const muitosEnc: EncontroEntrada[] = [];
for (let i = 0; i < 9; i++) {
  const g = 'g' + i; const dia = '2026-10-' + String(i + 1).padStart(2, '0');
  muitosEnc.push(enc(g, 'Iasmin', dia, 'enviado_no_prazo'));
  muitos.push(rel('m' + i, g, 'Iasmin', dia, { avaliacao: i % 2 ? 'Ruim' : 'Regular' }));
}
p = montarPainelRelatorios(ctx(muitosEnc, muitos));
assert.equal(p.leituras.total, 9);
assert.equal(p.leituras.visiveis.length, REL_GESTOR_LEITURAS_VISIVEIS);
assert.equal(p.leituras.visiveis[0].severidade, 'alta');
assert.equal(p.leituras.restantes.length, 9 - REL_GESTOR_LEITURAS_VISIVEIS);

// ---- detalhe: o que está fora do padrão vem primeiro, depois por data ----
assert.equal(p.detalhe.total, 9);
assert.equal(p.detalhe.visiveis.length, REL_GESTOR_DETALHES_VISIVEIS);
assert.equal(p.detalhe.visiveis[0].avaliacao, 'Ruim');
assert.equal(p.detalhe.visiveis[0].destaque, 'alerta');
p = montarPainelRelatorios(ctx(encontros, [rel('r1', 'a', 'Iasmin', '2026-10-02'), rel('r2', 'b', 'Iasmin', '2026-10-09', atencao)]));
assert.equal(p.detalhe.visiveis[0].id, 'r2', 'membro em atenção antes do relatório sem ponto de atenção');
assert.equal(p.detalhe.visiveis[1].destaque, null);

// ---- catálogo: ids únicos, todas as leituras trazem as quatro partes ----
assert.equal(new Set(CATALOGO_LEITURAS_RELATORIO.map((r) => r.id)).size, CATALOGO_LEITURAS_RELATORIO.length);
p = montarPainelRelatorios(ctx(muitosEnc, muitos));
p.leituras.visiveis.concat(p.leituras.restantes).forEach((i) => { assert.ok(i.oQue && i.numero && i.acao && i.responsaveis.length, 'leitura completa: ' + i.id); });
// texto sem travessão e sem hífen
const todosTextos = JSON.stringify(p.leituras);
assert.equal(/[-–—]/.test(todosTextos.replace(/"id":"[^"]*"/g, '')), false, 'texto das leituras sem traço');

console.log('relatorios-gestor: todos os testes aprovados');
