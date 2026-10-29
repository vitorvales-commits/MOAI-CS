// Dados de exemplo da pré visualização. Os números de risco e de relatórios passam pelas mesmas funções puras da
// aplicação (calcularRisco, montarPainelRelatorios), então a tela mostra o cálculo real sobre dados fictícios.
import { calcularRisco, ordenarPorUrgencia, resumirCarteira, RISCO_CONFIG_PADRAO, FIDELIDADE_MESES, type SinaisMembro } from '../../lib/risco-churn.ts';
import { montarPainelRelatorios, type EncontroEntrada, type RelatorioEntrada } from '../../lib/relatorios-gestor.ts';

const HOJE = '2026-10-29';
let seq = 0;
const sinais = (o: Partial<SinaisMembro> & { nome: string; cs: string }): SinaisMembro => ({
  membroId: ++seq, groupId: 'g' + o.nome, conselho: 'Executivo | Conselheiro Exemplo (' + o.cs + ')',
  notaNps: 10, alertasNpsAbertos: 0, statusAtual: 'Presente', statusRecentes: ['Presente', 'Presente', 'Presente'],
  semanasReportAtrasadoCs: 0, fimFidelidade: null, mensalidade: null, visitaAberta: false, ...o,
});

function risco(vazio: boolean) {
  const base: SinaisMembro[] = vazio ? [] : [
    sinais({ nome: 'Membro A', cs: 'Iasmin', notaNps: 3, alertasNpsAbertos: 1, statusAtual: 'Inadimplente', fimFidelidade: '2027-01-15', mensalidade: 2400 }),
    sinais({ nome: 'Membro B', cs: 'Iasmin', notaNps: 8, statusRecentes: ['Ausente', 'Presente', 'Ausente'], fimFidelidade: '2026-12-20', visitaAberta: true }),
    sinais({ nome: 'Membro C', cs: 'Rodrigo', notaNps: 5, statusAtual: 'Sem retorno', semanasReportAtrasadoCs: 2 }),
    sinais({ nome: 'Membro D', cs: 'Rodrigo' }), sinais({ nome: 'Membro E', cs: 'Rodrigo' }), sinais({ nome: 'Membro F', cs: 'Marcos' }),
    sinais({ nome: 'Membro G', cs: 'Marcos', notaNps: 7, alertasNpsAbertos: 2 }),
    sinais({ nome: 'Membro H', cs: 'Marcos', notaNps: null, statusAtual: null, statusRecentes: [], alertasNpsAbertos: null, semanasReportAtrasadoCs: null }),
  ];
  const membros = ordenarPorUrgencia(base.map((s) => ({ ...s, risco: calcularRisco(s, HOJE) })));
  const configLinhas = Object.entries(RISCO_CONFIG_PADRAO).map(([chave, valor]) => ({ chave, valor, descricao: chave.replace(/_/g, ' ') }));
  return { hoje: HOJE, configOrigem: 'banco', configLinhas, membros, resumo: resumirCarteira(membros), fidelidadeMeses: FIDELIDADE_MESES, padrao: RISCO_CONFIG_PADRAO };
}

function relatorios(vazio: boolean) {
  const enc = (g: string, cs: string, dia: string, estado: EncontroEntrada['estado']): EncontroEntrada => ({ groupId: g, conselho: 'Conselho ' + g, cs, dataEncontro: dia + 'T18:00:00Z', estado });
  const rel = (id: string, g: string, cs: string, dia: string, p: Partial<RelatorioEntrada> = {}): RelatorioEntrada => ({
    id, groupId: g, conselho: 'Conselho ' + g, dataEncontro: dia + 'T18:00:00Z', csNome: cs, avaliacao: 'Bom', avanco: 'Plano fechado.',
    membroAtencaoId: null, membroAtencaoNome: null, membroAtencaoMotivo: null, combinado: null, enviadoEm: dia + 'T20:00:00Z', estado: 'enviado_no_prazo', faltas: [], ...p,
  });
  const encontros = vazio ? [] : [
    enc('a', 'Iasmin', '2026-09-10', 'enviado_no_prazo'), enc('b', 'Rodrigo', '2026-09-17', 'atrasado'),
    enc('c', 'Iasmin', '2026-10-06', 'enviado_no_prazo'), enc('d', 'Rodrigo', '2026-10-08', 'atrasado'), enc('e', 'Marcos', '2026-10-15', 'enviado_com_atraso'), enc('f', 'Marcos', '2026-10-28', 'a_preencher'),
  ];
  const rels = vazio ? [] : [
    rel('1', 'c', 'Iasmin', '2026-10-06', { avaliacao: 'Muito bom' }),
    rel('2', 'e', 'Marcos', '2026-10-15', { avaliacao: 'Ruim', estado: 'enviado_com_atraso', membroAtencaoId: 9, membroAtencaoNome: 'Membro C', membroAtencaoMotivo: 'Duas ausências seguidas',
      faltas: [{ membroId: 9, nome: 'Membro C', tipo: 'falta', categoria: 'Imprevisto profissional', justificativa: 'Viagem de trabalho' }] }),
  ];
  return montarPainelRelatorios({ mes: '2026-10', hoje: HOJE + 'T15:00:00Z', encontros, relatorios: rels });
}

function acoes(vazio: boolean) {
  const risc = risco(vazio).membros.filter((m) => m.risco.nivel === 'critico' && !m.visitaAberta && !m.risco.semDados)
    .map((m) => ({ membroId: m.membroId, nome: m.nome, cs: m.cs, groupId: m.groupId, conselho: m.conselho, pontos: m.risco.pontos, motivo: m.risco.motivos.slice(0, 2).map((x) => x.texto).join('; '), mesesRestantes: m.risco.mesesRestantesFidelidade }));
  return {
    geradoEm: HOJE + 'T15:00:00Z',
    urgencias: { dado: vazio ? { report: { pendentes: [], prazo: '2026-10-30' }, gtd: { porCS: [] } } : { report: { pendentes: ['Marcos'], prazo: '2026-10-30' }, gtd: { porCS: [{ cs: 'Iasmin', atrasadas: 2, aVencer: 1, maiorAtrasoDias: 6 }] } } },
    insights: { dado: { visiveis: [], restantes: [] } },
    alertasNps: { dado: vazio ? [] : [{ id: 'x', criterio: 'detrator', mes: 'Outubro', groupId: 'g1', comentario: null, texto: { oQue: 'Detrator no NPS do conselho Exemplo', numero: 'Nota 4 de 10', acao: 'Ligar para o membro nesta semana.', quem: 'Rodrigo' } }] },
    relatorios: { dado: { porCS: vazio ? [] : [{ cs: 'Rodrigo', pendentes: 0, atrasados: 1, maiorAtrasoDias: 21 }] } },
    riscoChurn: { dado: risc },
    carimbos: { gtdSnapshot: null },
  };
}

export function fixturesPorCenario(c: 'dados' | 'vazio' | 'erro'): Record<string, unknown> {
  const sync = c === 'erro' ? { texto: 'Monday há 23 min', atrasado: true, minutos: 23, quadroMaisAtrasado: 'rounds', limiteMinutos: 15 } : { texto: 'Monday há 3 min', atrasado: false, minutos: 3, quadroMaisAtrasado: 'cases', limiteMinutos: 15 };
  const falha = { __status: 500, error: 'Não foi possível carregar agora (simulado)' };
  return {
    '/api/sync-status': sync,
    '/api/gestor/risco-churn': c === 'erro' ? falha : risco(c === 'vazio'),
    '/api/gestor/relatorios-conselho': c === 'erro' ? falha : relatorios(c === 'vazio'),
    '/api/gestor/visao-geral/acoes': c === 'erro' ? falha : acoes(c === 'vazio'),
  };
}
