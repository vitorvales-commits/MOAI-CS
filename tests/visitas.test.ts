import assert from 'node:assert/strict';
import { diasEntre, filaAcoes, funil, eficacia, calibracao, ievPorSafra, perfil, csvVisitas, dentroDaJanelaVisitas, type VisitaLinha } from '../lib/visitas.ts';

const HOJE = '2026-10-08';

const base = (over: Partial<VisitaLinha>): VisitaLinha => ({
  id: 1, membro_nome: 'Membro X', membro_id: 10, group_id: 'g1', cs_responsavel: 'Ana', visitantes: null,
  etapa: 'visita', produto: 'Executivo', local: 'Online', acao_principal: 'Plano de Ação', termometro: 'Muito em risco',
  causa_raiz: null, etapa_origem: 'CS', duracao: '30 a 60 min', expansao: 'Nenhuma', mrr_em_risco: 1000,
  data_pedido: '2026-08-01', data_visita: null, data_desfecho: null, fim_fidelidade: '2027-01-01',
  proximo_acompanhamento: null, encerrada: false, retencao_imediata: null, situacao_hoje: 'ativo',
  dentro_fidelidade: false, dias_ate_visita: null, dias_ate_novo_risco: null, evitavel: null, identificavel_antes: null,
  retido_30: 'em_aberto', retido_90: 'em_aberto', retido_180: 'em_aberto', iev: null, ...over,
});

// ---- datas ----
assert.equal(diasEntre('2026-10-01', '2026-10-08'), 7);

// ---- a2: fila de ações ----
const pedidoAtrasado = base({ id: 2, etapa: 'pedido', data_pedido: '2026-09-20', data_visita: null });
const pedidoNoPrazo = base({ id: 3, etapa: 'pedido', data_pedido: '2026-10-05', data_visita: null });
const acompanhamentoVencido = base({ id: 4, etapa: 'acompanhamento', proximo_acompanhamento: '2026-09-30' });
const visitaSemCausa = base({ id: 5, etapa: 'visita', data_visita: '2026-09-30', causa_raiz: null });
const fila = filaAcoes([pedidoAtrasado, pedidoNoPrazo, acompanhamentoVencido, visitaSemCausa], HOJE);
assert.equal(fila.length, 3, 'pedido dentro do SLA de 7 dias não entra');
assert.match(fila[0], /^Visitar Membro X, pedido há 18 dias, CS Ana, MRR R\$ 1000,00$/);
assert.match(fila[1], /Acompanhamento de Membro X venceu há 8 dias/);
assert.match(fila[2], /Registrar a causa raiz da visita a Membro X/);
assert.deepEqual(filaAcoes([], HOJE), ['Nenhuma pendência de reversão hoje.']);

// ---- c1: funil e retenção (amostra mínima de 5) ----
const visitasMaduras = Array.from({ length: 5 }, (_, i) => base({
  id: 100 + i, etapa: i < 4 ? 'revertido' : 'perdido', data_pedido: '2026-06-01', data_visita: '2026-06-10',
  dias_ate_visita: 9, retido_30: 'retido', retido_90: i < 4 ? 'retido' : 'perdido', retido_180: 'em_maturacao',
  encerrada: true, retencao_imediata: i < 4, dentro_fidelidade: i < 2,
}));
const f = funil(visitasMaduras);
assert.equal(f.pedidos, 5);
assert.equal(f.revertidos, 4);
assert.equal(f.perdidos, 1);
assert.equal(f.retencao90.pct, 80, '4 retidos de 5 maturadas');
assert.equal(f.retencao180.pct, null, 'em maturação não entra no percentual');
assert.equal(f.retencao180.emMaturacao, 5);
assert.equal(f.mrrPreservado, 4000, 'MRR preservado soma só as retidas em 90 dias');
assert.equal(f.retencaoImediataDentroFidelidade.base, 2);
assert.equal(f.retencaoImediataForaFidelidade.base, 3);

// abaixo da amostra mínima, o percentual some
assert.equal(funil(visitasMaduras.slice(0, 2)).retencao90.pct, null);

// ---- c1: eficácia e termômetro ----
const ef = eficacia(visitasMaduras, 'acao_principal');
assert.equal(ef[0].visitas, 5);
assert.equal(ef[0].retencao90, 80);
const cal = calibracao(visitasMaduras);
assert.equal(cal[0].retido + cal[0].perdido, 5);

// ---- c1: IEV por safra ----
const safra = ievPorSafra([base({ id: 200, data_visita: '2026-10-01', iev: null }), base({ id: 201, data_visita: '2026-01-10', iev: 4 })], HOJE);
const recente = safra.find((s) => s.safra === '2026-10')!;
assert.equal(recente.status, 'em maturação');
assert.equal(recente.iev, null);
const antiga = safra.find((s) => s.safra === '2026-01')!;
assert.equal(antiga.status, 'maturada', 'janeiro já passou de 180 dias em outubro');
assert.equal(antiga.iev, 4);

// ---- c2: perfil com amostra pequena ----
const perfilProduto = perfil(visitasMaduras, 'produto');
assert.equal(perfilProduto[0].amostraPequena, false);
assert.equal(perfilProduto[0].retencao90, 80);

// ---- janela de 6 meses ----
assert.equal(dentroDaJanelaVisitas(base({ data_pedido: '2026-05-01' }), '2026-10'), true);
assert.equal(dentroDaJanelaVisitas(base({ data_pedido: '2026-04-30' }), '2026-10'), false);

// ---- c3: CSV com BOM, ponto e vírgula e proteção contra fórmula ----
const csv = csvVisitas([base({ id: 300, membro_nome: '=HYPERLINK("x")', mrr_em_risco: 1234.5, iev: 3 })]);
assert.equal(csv.charCodeAt(0), 0xfeff, 'começa com BOM');
const [cabecalho, linhaCsv] = csv.replace('﻿', '').trim().split('\r\n');
assert.equal(cabecalho.split(';')[0], 'Membro');
assert.ok(linhaCsv.includes("'=HYPERLINK"), 'fórmula ganha apóstrofo');
assert.ok(linhaCsv.includes('1234,5'));
assert.ok(linhaCsv.endsWith('https://moai-global.monday.com/boards/18432210313/pulses/300'));

console.log('visitas.test.ts: tudo certo');
