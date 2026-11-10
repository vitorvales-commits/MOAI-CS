// Fixture dos testes do Vitorio 2: dicionário de entidades e fonte de dados em memória. Nomes de CS são os do time; conselheiros e
// membros são fictícios. A data de referência dos testes é 2026-10-30 (sexta).
import { montarDicionario, type FontesDicionario } from '../../lib/vitorio/entidades.ts';
import type { FonteDados, RelatorioCSLite } from '../../lib/vitorio/fonte.ts';
import { INDICADORES_CAT } from './vitorio-catalogo.ts';

export const HOJE = '2026-10-30';
export const CS = [
  { nome: 'Vilker', nomeCompleto: 'Vilker Souza', apelido: 'Vilker' }, { nome: 'Amanda', nomeCompleto: 'Amanda Reis', apelido: 'Amanda' },
  { nome: 'George', nomeCompleto: 'George Lima', apelido: 'George' }, { nome: 'Iasmin', nomeCompleto: 'Iasmin Prado', apelido: 'Iasmin' },
  { nome: 'Rodrigo', nomeCompleto: 'Rodrigo Alves', apelido: 'Rodrigo' }, { nome: 'Luana', nomeCompleto: 'Luana Melo', apelido: 'Luana' },
  { nome: 'Vitor', nomeCompleto: 'Vitor Vales', apelido: 'Vitor' }, { nome: 'Mateus', nomeCompleto: 'Mateus Dias', apelido: 'Mateus' },
];
export const CONSELHOS = [
  { groupId: 'g1', titulo: 'C-Level | Renata Alves (George)', congelado: false }, { groupId: 'g2', titulo: 'C-Level | Heitor Campos (Vitor)', congelado: false },
  { groupId: 'g3', titulo: 'Executivo | Kadydja Moura (Rodrigo)', congelado: false }, { groupId: 'g4', titulo: 'C-Level+ | Otavio Brandt (Luana)', congelado: false },
  { groupId: 'g5', titulo: 'Fast Track | Livia Duarte (Amanda)', congelado: false }, { groupId: 'g6', titulo: 'C-Level | Tarcisio Neves (George)', congelado: true },
  { groupId: 'g7', titulo: 'Executivo | Beatriz Fontes (Vilker)', congelado: false }, { groupId: 'g8', titulo: 'C-Level | Gallo Tavares (Vitor)', congelado: false },
];
export const MEMBROS = [
  { nome: 'Marcos Vinicius Prado', groupId: 'g1', st: 'Pagante Padrão' }, { nome: 'Marcos Paulo Neri', groupId: 'g2', st: 'Pagante Padrão' },
  { nome: 'Fernanda Lopes', groupId: 'g1', st: 'Permuta de Conselho' }, { nome: 'Joao Pedro Matos', groupId: 'g1', st: 'Inadimplente' },
  { nome: 'Camila Rocha', groupId: 'g2', st: 'Pagante com desconto' }, { nome: 'Bruno Teixeira', groupId: 'g3', st: 'Pagante Padrão' },
  { nome: 'Patricia Gomes', groupId: 'g3', st: 'Parceria Estratégica' }, { nome: 'Sergio Barros', groupId: 'g4', st: 'Pagante Padrão' },
  { nome: 'Daniela Souza', groupId: 'g5', st: 'Pagante Padrão' }, { nome: 'Eduardo Pires', groupId: 'g5', st: 'Permuta Clube de Permuta' },
  { nome: 'Helena Cardoso', groupId: 'g7', st: 'Pagante Padrão' }, { nome: 'Rafael Costa', groupId: 'g8', st: 'Pagante Padrão' },
];
export const FONTES_DIC: FontesDicionario = {
  cs: CS, conselhos: CONSELHOS.map((g) => ({ groupId: g.groupId, titulo: g.titulo })), membros: MEMBROS.map((m) => ({ nome: m.nome, groupId: m.groupId })),
  indicadores: INDICADORES_CAT, advertencias: [{ codigo: 'report_atrasado', nome: 'Report semanal atrasado' }, { codigo: 'relatorio_conselho_atrasado', nome: 'Relatório do conselho atrasado' }],
};
export const DIC = montarDicionario(FONTES_DIC);

function relatorio(cs: string, mes: string): RelatorioCSLite {
  const ap = CS.find((c) => c.nome === cs)?.apelido || cs;
  const mine = CONSELHOS.filter((g) => g.titulo.endsWith('(' + ap + ')'));
  const base = (cs.length + mes.length) % 5;
  const ind = (meta: number | null, v: number | null, tipo: 'min' | 'max' = 'min') => ({ meta, alcancado: v, tipoMeta: tipo });
  return {
    indicadores: {
      casesSucesso: ind(2, base), matchmakings: ind(6, 3 + base), rounds: ind(4, 4), indicacoes: ind(3, 1), upsell: ind(1, 0), downsell: ind(1, 0, 'max'),
      churn: ind(1, base > 3 ? 2 : 0, 'max'), revenueChurn: { meta: null, alcancado: 12000, tipoMeta: 'max', unidade: 'R$' }, healthDaBase: { meta: 10, alcancado: 8 + base, tipoMeta: 'max', unidade: '%' }, criticos: ind(2, base, 'max'),
    },
    conselhos: mine.map((g) => ({ nome: g.titulo, groupId: g.groupId, membros: MEMBROS.filter((m) => m.groupId === g.groupId).length, proximaData: '2026-11-04', proximaDataEhFutura: true, confirmados: 3, status: 'realizado', congelado: g.congelado, presente: 4, registros: 5 })),
  };
}
export type AjustesFonte = { semRevelar?: boolean };
export function fonteFixture(aj: AjustesFonte = {}): FonteDados {
  return {
    roster: async () => CS,
    conselhos: async () => CONSELHOS,
    membros: async (id) => MEMBROS.filter((m) => m.groupId === id).map((m) => ({ nome: m.nome, statusPagamento: m.st })),
    contagemMembros: async (ids) => MEMBROS.filter((m) => ids.includes(m.groupId)).length,
    conselhosDoMembro: async (nome) => CONSELHOS.filter((g) => MEMBROS.some((m) => m.nome === nome && m.groupId === g.groupId)),
    gestores: async () => [{ nome: 'Vitor', email: 'vitor@x' }, { nome: 'Luana', email: 'luana@x' }],
    encontros: async (ids, de, ate) => ids.map((id, k) => ({ groupId: id, data: '2026-11-0' + (3 + k) + 'T19:00:00' })).filter((x) => x.data.slice(0, 10) >= de && x.data.slice(0, 10) <= ate),
    relatorioCS: async (nome, mes) => relatorio(nome, mes),
    revelarEquipe: async () => !aj.semRevelar,
    advertencias: async (cs) => (cs === 'George'
      ? { ativos: 5, total: 10, proximoVencimento: '2026-10-31T23:59:59', registros: [{ tipo: 'Report semanal atrasado', pontos: 5, data: '2026-10-12T10:00:00', validoAte: '2026-10-31T23:59:59', observacao: null, origem: 'sistema', ativa: true }, { tipo: 'Relatório do conselho atrasado', pontos: 5, data: '2026-09-03T10:00:00', validoAte: '2026-09-30T23:59:59', observacao: null, origem: 'sistema', ativa: false }] }
      : { ativos: 0, total: 0, proximoVencimento: null, registros: [] }),
    reportsDaSemana: async () => CS.filter((c) => !['Mateus', 'Iasmin'].includes(c.nome)).map((c) => ({ cs: c.nome, enviadoEm: '2026-10-27T15:00:00' })),
    encontrosRelatorio: async (cs) => [{ groupId: 'g1', conselho: 'Renata Alves (C-Level)', cs: 'George', dataEncontro: '2026-10-25', prazo: '2026-11-01', estado: 'a_preencher', diasRestantes: 2 }].filter((x) => !cs || x.cs === cs),
    gtd: async (cs) => [{ cs: 'George', atrasadas: 2, aVencer: 1, maiorAtrasoDias: 4 }, { cs: 'Vitor', atrasadas: 0, aVencer: 3, maiorAtrasoDias: 0 }].filter((x) => !cs || x.cs === cs),
    nps: async () => ({ geral: { total: 40, conselheiro: 72, conselho: 65, notaCS: 80 }, porCS: [{ cs: 'George', total: 12, conselheiro: 60, conselho: 58, notaCS: 75 }] }),
    alertasNps: async () => [{ texto: 'Nota baixa de um conselheiro de Renata Alves' }],
    umAUm: async () => ({ ultimaData: '2026-10-20', resumo: null, abertos: 2 }),
    saude: async () => ({ estado: 'saudavel', texto: 'Todos os boards sincronizaram nos últimos minutos.' }),
    sincronizadoEm: async () => '2026-10-30T14:50:00Z',
  };
}
