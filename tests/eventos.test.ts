// Roda com: npx tsx tests/eventos.test.ts
// Regras dos eventos da agenda: meta, horário, link do Sympla, casamento e ritmo de venda.
// Os textos de entrada são reais, copiados do board Escala de Eventos em 11/11/2026.
import assert from 'node:assert/strict';
import {
  parseMeta, metaTotal, parseHorarioInicio, minutosDoTurno, parseTimeline, idSymplaDoLink, nomeLimpo,
  casarEventos, ritmoDoEvento, eventoCancelado, isoBRT, semelhancaNomes, linkSymplaDivergente,
} from '../lib/eventos.ts';

// Meta
assert.deepEqual(parseMeta('60 pessoas'), { tipo: 'total', valor: 60, texto: '60 pessoas' });
assert.deepEqual(parseMeta('5 para cada'), { tipo: 'por_escalado', valor: 5, texto: '5 para cada' });
assert.equal(parseMeta('3 para cada')!.tipo, 'por_escalado');
assert.equal(parseMeta('10 por CS')!.tipo, 'por_escalado');
assert.equal(parseMeta('A definir'), null);
assert.equal(parseMeta(null), null);
assert.equal(parseMeta('0'), null);
assert.equal(metaTotal(parseMeta('60 pessoas'), 4), 60);
assert.equal(metaTotal(parseMeta('5 para cada'), 3), 15);
assert.equal(metaTotal(parseMeta('5 para cada'), 0), null);
assert.equal(metaTotal(null, 3), null);

// Horário
assert.equal(parseHorarioInicio('19h')!.minutos, 19 * 60);
assert.equal(parseHorarioInicio('10h-12h')!.minutos, 10 * 60);
assert.equal(parseHorarioInicio('19h-22h')!.minutos, 19 * 60);
assert.equal(parseHorarioInicio('8h-14h')!.minutos, 8 * 60);
assert.equal(parseHorarioInicio('09-18 e 09-20 (com HH)')!.minutos, 9 * 60);
assert.equal(parseHorarioInicio('19h30')!.minutos, 19 * 60 + 30);
assert.equal(parseHorarioInicio('19:30')!.minutos, 19 * 60 + 30);
assert.equal(parseHorarioInicio('A definir'), null);
assert.equal(parseHorarioInicio(null), null);
assert.equal(minutosDoTurno('Noite'), 19 * 60);
assert.equal(minutosDoTurno('Dia todo'), 9 * 60);
assert.equal(minutosDoTurno(null), null);

// Datas
assert.deepEqual(parseTimeline('2026-11-12 - 2026-11-13'), { inicio: '2026-11-12', fim: '2026-11-13' });
assert.deepEqual(parseTimeline('2026-11-24'), { inicio: '2026-11-24', fim: '2026-11-24' });
assert.equal(parseTimeline(null), null);
assert.equal(isoBRT('2026-11-24', 600), '2026-11-24T10:00:00-03:00');

// Link do Sympla
assert.equal(idSymplaDoLink('https://www.sympla.com.br/evento/mesa--o-ponto-zero-da-jornada-moai/3647115?token=e05ca7'), 3647115);
assert.equal(idSymplaDoLink('https://www.sympla.com.br/evento/moai-connect-menos-conversas-vazias-mais-negocios-na-mesa/3618652?share_id=copiarlink'), 3618652);
assert.equal(idSymplaDoLink('https://forms.moaiclubedelideres.com/events/event-details/6acfd357abd90c1531fefdac'), null);
assert.equal(idSymplaDoLink('https://claude.ai/artifact/WVjewyWFScxC6BVuGTY1ms'), null);
assert.equal(idSymplaDoLink(null), null);

// Nome
assert.equal(nomeLimpo('[12/11-13/11] MOAI Imersão Alavanca'), 'MOAI Imersão Alavanca');
assert.equal(nomeLimpo('[24/11]  MOAI   Mesa'), 'MOAI Mesa');

// Casamento: id do link primeiro, depois mesmo dia e nome parecido
const monday = [
  { id: 1, nome: 'MOAI Mesa', data_inicio: '2026-11-24', data_fim: '2026-11-24', inicio: null, sympla_event_id: 3647115 },
  { id: 2, nome: 'Talks B2HR', data_inicio: '2026-11-25', data_fim: '2026-11-25', inicio: null, sympla_event_id: null },
  { id: 3, nome: 'Networking Gourmet', data_inicio: '2026-11-24', data_fim: '2026-11-24', inicio: null, sympla_event_id: null },
];
const sympla = [
  { id: 3647115, nome: 'Mesa: o ponto zero da jornada MOAI', inicio: '2026-11-24T13:00:00Z' },
  { id: 3700001, nome: 'MOAI Talks | B2HR', inicio: '2026-11-25T22:00:00Z' },
  { id: 3700002, nome: 'Conselho High End', inicio: '2026-11-24T15:00:00Z' },
];
const casados = casarEventos(monday, sympla);
assert.equal(casados.get(1), 3647115);
assert.equal(casados.get(2), 3700001);
assert.equal(casados.has(3), false);
assert.ok(semelhancaNomes('Talks B2HR', 'MOAI Talks | B2HR') >= 0.34);

// Ritmo
// 10 de 60 a 20 dias: o ritmo esperado é 10/30 da meta, então já está abaixo.
assert.equal(ritmoDoEvento({ vendidos: 10, meta: 60, diasAteEvento: 20, passado: false }), 'atencao');
assert.equal(ritmoDoEvento({ vendidos: 30, meta: 60, diasAteEvento: 5, passado: false }), 'atencao');
assert.equal(ritmoDoEvento({ vendidos: 20, meta: 60, diasAteEvento: 1, passado: false }), 'critico');
assert.equal(ritmoDoEvento({ vendidos: 60, meta: 60, diasAteEvento: 1, passado: false }), 'meta_batida');
assert.equal(ritmoDoEvento({ vendidos: 5, meta: null, diasAteEvento: 1, passado: false }), 'sem_meta');
assert.equal(ritmoDoEvento({ vendidos: null, meta: 30, diasAteEvento: 1, passado: false }), 'sem_venda');
assert.equal(ritmoDoEvento({ vendidos: 5, meta: 30, diasAteEvento: -1, passado: true }), 'encerrado');
// MOAI Business Poker (26/11, 14 dias antes, 0 de 60): abaixo do esperado (16/30 da meta), vira atenção.
assert.equal(ritmoDoEvento({ vendidos: 0, meta: 60, diasAteEvento: 14, passado: false }), 'atencao');
assert.equal(ritmoDoEvento({ vendidos: 40, meta: 60, diasAteEvento: 25, passado: false }), 'no_ritmo');
assert.equal(ritmoDoEvento({ vendidos: 60, meta: 60, diasAteEvento: 14, passado: false }), 'meta_batida');
// Link do Sympla: nome sem palavra em comum com a Escala é divergente; nome parecido não é.
assert.equal(linkSymplaDivergente('MOAI Meetup | PAV', 'MOAI Mentoria |Planejamento Comercial para 2027'), true);
assert.equal(linkSymplaDivergente('MOAI Meetup | Sociedade boa também precisa de regra', 'MOAI Meetup | Até que os negócios nos separem'), true);
assert.equal(linkSymplaDivergente('MOAI Connect', 'MOAI Connect |O Palco é seu'), false);

// Cancelamento
assert.equal(eventoCancelado('Evento Cancelado', null), true);
assert.equal(eventoCancelado('Escala Fechada', 'Cancelado'), true);
assert.equal(eventoCancelado('Escala Fechada', 'A iniciar'), false);

console.log('eventos: todos os testes passaram');
