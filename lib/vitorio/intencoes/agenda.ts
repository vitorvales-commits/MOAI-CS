// Intenções de agenda: próximo conselho, encontros da semana ou de um dia, confirmados de um encontro.
import type { Intencao } from '../tipos.ts';

export const AGENDA: Intencao[] = [
  { id: 'agenda.proximo_conselho', familia: 'agenda', obrigatorias: [], opcionais: ['cs', 'conselho'], padrao: { cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'agenda.proximo_conselho',
    exemplos: ['quando e o proximo conselho', 'quando e o proximo conselho do {cs}', 'proximo conselho do {conselho}', 'quando acontece o conselho {conselho}', 'qual meu proximo conselho', 'quando e o proximo encontro do {conselho}', 'data do proximo conselho',
      'proximo encontro da {cs}', 'quando o {conselho} se reune', 'qual o proximo conselho que eu tenho', 'quando vai ser o conselho do {conselho}', 'proximo conselho'],
    modelos: ['O próximo conselho de {quem} é {conselho}, em {data}.', '{quem}: o próximo encontro é {conselho}, em {data}.', 'Em {data} acontece o próximo conselho de {quem}: {conselho}.'],
    continuacoes: ['Quais conselhos tenho na semana?', 'Quem são os membros?'] },
  { id: 'agenda.semana', familia: 'agenda', obrigatorias: [], opcionais: ['cs'], padrao: { periodo: 'semana_atual', cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'agenda.semana',
    exemplos: ['quais conselhos tenho {periodo}', 'conselhos {periodo}', 'agenda {periodo}', 'o que tenho de conselho {periodo}', 'quais conselhos o {cs} tem {periodo}', 'quais conselhos acontecem {periodo}', 'tenho conselho {periodo}', 'tem conselho {periodo}',
      'minha agenda {periodo}', 'encontros {periodo}', 'quais encontros {periodo}', 'agenda de conselhos {periodo}', 'quais conselhos tem hoje'],
    modelos: ['Em {periodo} {quem} tem {n}: {itens}.', '{quem}, {periodo}: {n}. {itens}.'], continuacoes: ['E na semana que vem?', 'Quem são os membros?'] },
  { id: 'agenda.confirmados', familia: 'agenda', obrigatorias: ['conselho'], perfis: ['cs', 'gestor'], manipulador: 'agenda.confirmados',
    exemplos: ['quantos confirmados no conselho {conselho}', 'quem confirmou presenca no {conselho}', 'confirmados do proximo conselho {conselho}', 'quantas confirmacoes tem o {conselho}', 'quem vai no conselho {conselho}', 'confirmacoes do conselho do {conselho}',
      'quantos vao ao {conselho}', 'lista de confirmados {conselho}', 'quantos confirmaram no {conselho}', 'faltas previstas no conselho {conselho}'],
    modelos: ['No conselho {conselho} há {n}.', 'Para o próximo encontro do {conselho}: {n}.'], continuacoes: ['Quando é o encontro?', 'Quem são os membros?'] },
];
