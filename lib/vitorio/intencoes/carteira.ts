// Intenções de carteira e conselhos: membros de um conselho, conselho de um membro, tamanho da carteira, pagantes e permutas, situação do conselho.
import type { Intencao } from '../tipos.ts';

export const CARTEIRA: Intencao[] = [
  { id: 'carteira.membros_do_conselho', familia: 'carteira', obrigatorias: ['conselho'], perfis: ['cs', 'gestor'], manipulador: 'carteira.membros_do_conselho',
    exemplos: ['quantos membros tem o conselho {conselho}', 'quem sao os membros do conselho {conselho}', 'membros do {conselho}', 'quantas pessoas tem no conselho do {conselho}', 'quem esta no conselho {conselho}', 'lista de membros do {conselho}',
      'me fala os membros do conselho do {conselho}', 'quantos membros no {conselho}', 'quem faz parte do conselho {conselho}', 'tamanho do conselho {conselho}', 'integrantes do conselho {conselho}', 'membros do grupo {conselho}'],
    modelos: ['O conselho {conselho} tem {n}: {nomes}.', 'No conselho {conselho} há {n}: {nomes}.', '{n} no conselho {conselho}: {nomes}.'],
    continuacoes: ['Quem é o CS do conselho?', 'Quando é o próximo encontro?', 'Quantos são pagantes?'] },
  { id: 'carteira.conselho_do_membro', familia: 'carteira', obrigatorias: ['membro'], perfis: ['cs', 'gestor'], manipulador: 'carteira.conselho_do_membro',
    exemplos: ['em qual conselho esta o {membro}', 'qual o conselho do {membro}', 'o {membro} esta em que conselho', 'onde esta o membro {membro}', 'em que grupo o {membro} participa', 'conselho da {membro}', 'a {membro} e de qual conselho',
      'qual conselho o {membro} faz parte', 'membro {membro} conselho', 'me diz o conselho do {membro}', 'em que conselho a {membro} esta'],
    modelos: ['{membro} participa de {conselhos}.', '{membro} está em {conselhos}.', 'Encontrei {membro} em {conselhos}.'], continuacoes: ['Quem cuida desse conselho?', 'Quando é o próximo encontro?'] },
  { id: 'carteira.resumo_cs', familia: 'carteira', obrigatorias: ['cs'], padrao: { cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'carteira.resumo_cs',
    exemplos: ['quantos conselhos o {cs} tem', 'quantos membros o {cs} tem', 'quantos membros eu tenho', 'quantos conselhos eu tenho', 'tamanho da carteira do {cs}', 'qual o tamanho da minha carteira', 'carteira do {cs}', 'quantos membros tem a carteira da {cs}',
      'quantas empresas o {cs} acompanha', 'quantos conselhos e membros o {cs} cuida', 'minha carteira', 'quantos membros sao meus'],
    modelos: ['{cs} acompanha {conselhos} e {membros} no total.', 'A carteira de {cs} tem {conselhos} e {membros}.', '{cs}: {conselhos} e {membros} somando todos os grupos.'],
    continuacoes: ['Quais são os conselhos?', 'Quantos são pagantes?', 'Como estão os indicadores?'] },
  { id: 'carteira.pagantes', familia: 'carteira', obrigatorias: [], opcionais: ['cs', 'conselho'], perfis: ['cs', 'gestor'], manipulador: 'carteira.pagantes',
    exemplos: ['quantos pagantes o {cs} tem', 'quantos membros pagantes tem o conselho {conselho}', 'quantos sao permuta no {conselho}', 'pagantes da minha carteira', 'quantos membros pagam', 'quantos membros estao em permuta', 'quantos inadimplentes tem o {conselho}',
      'status de pagamento do conselho {conselho}', 'membros pagantes do {cs}', 'quantos sao pagantes', 'quantos permuta eu tenho', 'quantos inadimplentes eu tenho'],
    modelos: ['{escopo}: {pagantes}, {permutas} e {inadimplentes}.', 'Em {escopo} são {pagantes}, {permutas} e {inadimplentes}.'], continuacoes: ['Quantos membros no total?', 'Quais são os conselhos?'] },
  { id: 'carteira.status_conselho', familia: 'carteira', obrigatorias: ['conselho'], padrao: { periodo: 'mes_atual' }, perfis: ['cs', 'gestor'], manipulador: 'carteira.status_conselho',
    exemplos: ['qual o status do conselho {conselho} {periodo}', 'o conselho {conselho} ja aconteceu {periodo}', 'situacao do conselho {conselho}', 'o {conselho} esta congelado', 'conselho {conselho} realizado ou aguardando', 'como esta o conselho {conselho} {periodo}', 'o conselho do {conselho} esta ativo',
      'o {conselho} foi realizado {periodo}', 'presenca do conselho {conselho} {periodo}', 'status do {conselho}'],
    modelos: ['O conselho {conselho} em {periodo} está {status}.', 'Situação do conselho {conselho} em {periodo}: {status}.'], continuacoes: ['Quando é o próximo encontro?', 'Quem são os membros?'] },
];
