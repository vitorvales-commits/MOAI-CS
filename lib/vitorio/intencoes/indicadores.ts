// Intenções de indicadores: valor de qualquer indicador do catálogo, metas fora do alvo e ranking por indicador (gestor).
import type { Intencao } from '../tipos.ts';

export const INDICADORES: Intencao[] = [
  { id: 'indicadores.valor', familia: 'indicadores', obrigatorias: ['indicador'], opcionais: ['cs'], padrao: { periodo: 'mes_atual', cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'indicadores.valor',
    exemplos: ['quantos {indicador} o {cs} fez {periodo}', 'quantos {indicador} eu tenho {periodo}', 'quanto e o {indicador} {periodo}', 'qual o {indicador} do {cs} {periodo}', '{indicador} {periodo}', 'como esta meu {indicador}', 'quantos {indicador} o time fez {periodo}',
      'me diz o {indicador} {periodo}', 'valor de {indicador} {periodo}', 'qual meu {indicador}', 'quantos {indicador} tivemos {periodo}', 'meus {indicador} {periodo}', 'quanto o {cs} tem de {indicador}', 'como esta o {indicador} do {cs}', 'qual o {indicador} do time {periodo}',
      'bati a meta de {indicador}', 'quanto falta pra meta de {indicador}'],
    modelos: ['{quem} em {periodo}: {indicador} está em {valor}.', 'Em {periodo}, {indicador} de {quem} é {valor}.', '{indicador} de {quem} em {periodo}: {valor}.'],
    continuacoes: ['E no mês passado?', 'Quais metas estão fora do alvo?', 'Como cheguei nisso?'] },
  { id: 'indicadores.metas_fora', familia: 'indicadores', obrigatorias: [], opcionais: ['cs'], padrao: { periodo: 'mes_atual', cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'indicadores.metas_fora',
    exemplos: ['quais metas nao bati', 'quais metas estao fora do alvo', 'quais metas o {cs} nao bateu {periodo}', 'o que esta atrasado nas metas', 'quais indicadores estao ruins', 'metas que faltam {periodo}', 'o que falta pra bater as metas', 'quais metas bati {periodo}',
      'em que meta estou atras', 'quais metas o {cs} bateu', 'como estao minhas metas {periodo}', 'metas do {cs} {periodo}', 'o que o {cs} nao bateu em {periodo}'],
    modelos: ['{quem} em {periodo}: {fora}.', 'Em {periodo}, para {quem}: {fora}.'], continuacoes: ['Qual o valor de cada indicador?', 'E no mês passado?'] },
  { id: 'indicadores.ranking', familia: 'indicadores', obrigatorias: ['indicador'], padrao: { periodo: 'mes_atual' }, perfis: ['gestor'], manipulador: 'indicadores.ranking',
    exemplos: ['quem lidera em {indicador} {periodo}', 'ranking de {indicador} {periodo}', 'quem fez mais {indicador}', 'qual cs tem mais {indicador}', 'quem tem mais {indicador} {periodo}', 'ranking do time em {indicador}', 'quem esta melhor em {indicador}',
      'quem esta pior em {indicador} {periodo}', 'comparar os cs em {indicador}', 'top cs em {indicador}', 'quem teve mais {indicador} {periodo}'],
    modelos: ['Em {periodo}, {indicador} por CS: {itens}.', 'Ranking de {indicador} em {periodo}: {itens}.'], continuacoes: ['E no mês passado?', 'Quais metas estão fora do alvo?'] },
];
