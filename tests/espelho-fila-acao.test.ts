// Roda com: npx tsx tests/espelho-fila-acao.test.ts
// Fila de ação (etapa 5): bloco "Espelho no Monday com falha" e separação das escritas de visita.
import assert from 'node:assert/strict';
import { ehBoardEspelho, espelhosEmErroDaFila, escritasPendentesDaFila, ESPELHO_BOARDS, type EscritaPendente } from '../lib/sincronia.ts';

const AGORA = new Date('2026-11-09T18:00:00Z');
const base = (over: Partial<EscritaPendente>): EscritaPendente => ({
  id: 1, estado: 'erro', board_id: '18432210313', item_id: '13441800409', criado_em: '2026-11-08T10:00:00Z',
  executado_em: '2026-11-08T10:05:00Z', erro: 'falha', criado_por: 'alguem', valores: { x: 'y' }, ...over,
});

// Os quatro boards Registro reconhecidos, e só eles.
assert.deepEqual(ESPELHO_BOARDS, {
  '18439110272': 'relatorios_conselho',
  '18439110274': 'advertencias_aplicadas',
  '18439110276': 'metas_definidas',
  '18439110277': 'cs_periodos',
});
assert.equal(ehBoardEspelho('18439110276'), true);
assert.equal(ehBoardEspelho('18432210313'), false);
assert.equal(ehBoardEspelho('constructor'), false);

// Sem falha, o bloco não tem nada para mostrar.
assert.deepEqual(espelhosEmErroDaFila([]), []);

// Espelho em erro vira item do bloco, com tabela de origem; conflito e erro de visita não entram.
const linhas: EscritaPendente[] = [
  base({ id: 10, board_id: '18439110276', estado: 'erro', erro: 'Monday recusou o valor', executado_em: '2026-11-09T09:00:00Z' }),
  base({ id: 11, board_id: '18439110274', estado: 'erro', erro: 'indisponível', executado_em: '2026-11-08T09:00:00Z' }),
  base({ id: 12, board_id: '18439110276', estado: 'conflito' }),
  base({ id: 13, board_id: '18432210313', estado: 'erro' }),
];
const emErro = espelhosEmErroDaFila(linhas);
assert.deepEqual(emErro.map((e) => e.tabela), ['advertencias_aplicadas', 'metas_definidas']); // mais antigo primeiro
assert.equal(emErro[1].erro, 'Monday recusou o valor');

// Visita: espelho fica de fora mesmo que esteja em erro há mais de 24 horas.
const visitas = escritasPendentesDaFila(linhas, AGORA);
assert.deepEqual(visitas.map((v) => v.id), [13]);
assert.equal(visitas.some((v) => ehBoardEspelho(v.board_id)), false);

console.log('espelho-fila-acao: ok');
