// Roda com: npx tsx tests/espelho-fila-acao.test.ts
// Fila de ação (etapa 5): um item por tabela de origem no bloco "Espelho no Monday com falha", janela de 24 horas
// para falhas do gatilho e separação das escritas de visita.
import assert from 'node:assert/strict';
import {
  agruparFalhasEspelho, ehBoardEspelho, espelhosEmErroDaFila, escritasPendentesDaFila,
  ESPELHO_BOARDS, JANELA_FALHA_HORAS, type EscritaPendente, type FalhaEspelho,
} from '../lib/sincronia.ts';

const AGORA = new Date('2026-11-09T18:00:00Z');
const base = (over: Partial<EscritaPendente>): EscritaPendente => ({
  id: 1, estado: 'erro', board_id: '18432210313', item_id: '13441800409', criado_em: '2026-11-08T10:00:00Z',
  executado_em: '2026-11-08T10:05:00Z', erro: 'falha', criado_por: 'alguem', valores: { x: 'y' }, ...over,
});
const falha = (tabela_origem: string, ocorrido_em: string, erro_mensagem: string): FalhaEspelho =>
  ({ tabela_origem, ocorrido_em, erro_mensagem });

// Os cinco boards Registro reconhecidos, e só eles.
assert.deepEqual(ESPELHO_BOARDS, {
  '18439110272': 'relatorios_conselho',
  '18439110274': 'advertencias_aplicadas',
  '18439110276': 'metas_definidas',
  '18439110277': 'cs_periodos',
  '18439229782': 'bonus_aplicados',
});
assert.equal(ehBoardEspelho('18439110276'), true);
assert.equal(ehBoardEspelho('18432210313'), false);
assert.equal(ehBoardEspelho('constructor'), false);
assert.equal(JANELA_FALHA_HORAS, 24);

// Sem falha, o bloco não tem nada para mostrar.
assert.deepEqual(agruparFalhasEspelho([], [], AGORA), []);

// Comandos de espelho em erro entram; conflito e erro de visita não.
const linhas: EscritaPendente[] = [
  base({ id: 10, board_id: '18439110276', estado: 'erro', erro: 'Monday recusou o valor', executado_em: '2026-11-09T09:00:00Z' }),
  base({ id: 11, board_id: '18439110274', estado: 'erro', erro: 'indisponível', executado_em: '2026-11-08T09:00:00Z' }),
  base({ id: 12, board_id: '18439110276', estado: 'conflito' }),
  base({ id: 13, board_id: '18432210313', estado: 'erro' }),
];
assert.deepEqual(espelhosEmErroDaFila(linhas).map((e) => e.tabela), ['advertencias_aplicadas', 'metas_definidas']);

// Visita: espelho fica de fora mesmo que esteja em erro há mais de 24 horas.
const visitas = escritasPendentesDaFila(linhas, AGORA);
assert.deepEqual(visitas.map((v) => v.id), [13]);
assert.equal(visitas.some((v) => ehBoardEspelho(v.board_id)), false);

// Agrupamento: três falhas da mesma tabela viram um item só, com o total, a última falha e a mensagem dela.
const falhas = [
  falha('advertencias_aplicadas', '2026-11-09T10:00:00Z', 'A'),
  falha('advertencias_aplicadas', '2026-11-09T17:30:00Z', 'B'),
  falha('advertencias_aplicadas', '2026-11-08T19:00:00Z', 'C'),
  // Fora da janela de 24 horas: não conta.
  falha('advertencias_aplicadas', '2026-11-07T10:00:00Z', 'velha'),
  falha('relatorios_conselho', '2026-11-08T12:00:00Z', 'antiga'),
];
const emErro = espelhosEmErroDaFila([
  base({ id: 20, board_id: '18439110276', estado: 'erro', erro: 'M1', executado_em: '2026-11-09T09:00:00Z' }),
  base({ id: 21, board_id: '18439110276', estado: 'erro', erro: 'M2', executado_em: '2026-11-09T16:00:00Z' }),
]);
const grupos = agruparFalhasEspelho(falhas, emErro, AGORA);
assert.equal(grupos.length, 2);
// Ordem: a falha mais recente primeiro (advertências 17:30 antes de metas 16:00).
assert.deepEqual(grupos.map((g) => g.tabela), ['advertencias_aplicadas', 'metas_definidas']);
assert.deepEqual(grupos[0], {
  tabela: 'advertencias_aplicadas', rotulo: 'Advertências', total: 3,
  ultimaEm: '2026-11-09T17:30:00Z', ultimaMensagem: 'B',
});
assert.deepEqual(grupos[1], {
  tabela: 'metas_definidas', rotulo: 'Metas definidas', total: 2,
  ultimaEm: '2026-11-09T16:00:00Z', ultimaMensagem: 'M2',
});

// Uma tabela com cem falhas continua sendo um item só.
const cem: FalhaEspelho[] = Array.from({ length: 100 }, (_, i) =>
  falha('cs_periodos', new Date(Date.parse('2026-11-09T10:00:00Z') + i * 60_000).toISOString(), 'erro ' + i));
const umItem = agruparFalhasEspelho(cem, [], AGORA);
assert.equal(umItem.length, 1);
assert.equal(umItem[0].total, 100);
assert.equal(umItem[0].ultimaMensagem, 'erro 99');

console.log('espelho-fila-acao: ok');
