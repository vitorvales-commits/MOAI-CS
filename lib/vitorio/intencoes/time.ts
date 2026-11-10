// Intenções de time: quem são os CS, quem cuida de um conselho, quais conselhos um CS cuida, head de CS e gestores.
import type { Intencao } from '../tipos.ts';

export const TIME: Intencao[] = [
  { id: 'time.roster', familia: 'time', obrigatorias: [], opcionais: [], padrao: { periodo: 'mes_atual' }, perfis: ['cs', 'gestor'], manipulador: 'time.roster',
    exemplos: ['quem sao os cs', 'quem sao os cs do mes', 'quem sao os membros da area de cs', 'quem faz parte do time de cs', 'lista dos cs {periodo}', 'quem eram os cs {periodo}',
      'quais sao os cs ativos', 'quem trabalha no cs', 'me fala quem e do time de cs', 'quantos cs temos', 'quem esta no time de sucesso do cliente', 'time de cs {periodo}', 'quem compoe a area de cs', 'nomes dos cs'],
    modelos: ['Em {periodo} o time de CS tem {n}: {nomes}.', 'O time de CS de {periodo} reúne {n}: {nomes}.', '{n} no time de CS em {periodo}: {nomes}.'],
    continuacoes: ['Quais conselhos cada um cuida?', 'Quem é a head de CS?', 'E no mês passado?'] },
  { id: 'time.cs_do_conselho', familia: 'time', obrigatorias: ['conselho'], perfis: ['cs', 'gestor'], manipulador: 'time.cs_do_conselho',
    exemplos: ['quem cuida do conselho {conselho}', 'quem e o cs do {conselho}', 'qual cs cuida do conselho do {conselho}', 'quem acompanha o {conselho}', 'cs responsavel pelo conselho {conselho}', 'de quem e o conselho {conselho}',
      'quem e o responsavel do conselho do {conselho}', 'quem atende o {conselho}', 'qual o cs do conselho {conselho}', 'quem cuida do {conselho}', 'o conselho {conselho} e de quem'],
    modelos: ['O conselho {conselho} é acompanhado por {cs}.', '{cs} cuida do conselho {conselho}.', 'Quem responde pelo conselho {conselho} é {cs}.'],
    continuacoes: ['Quando é o próximo encontro?', 'Quem são os membros?'] },
  { id: 'time.conselhos_do_cs', familia: 'time', obrigatorias: ['cs'], padrao: { cs: 'eu' }, perfis: ['cs', 'gestor'], manipulador: 'time.conselhos_do_cs',
    exemplos: ['quais conselhos o {cs} cuida', 'quais sao os conselhos do {cs}', 'quais sao meus conselhos', 'meus conselhos', 'que conselhos eu tenho', 'conselhos que o {cs} acompanha', 'lista de conselhos do {cs}',
      'quais conselhos estao com a {cs}', 'me mostra os conselhos do {cs}', 'qual a carteira de conselhos do {cs}', 'de quais conselhos eu cuido', 'conselhos do {cs}'],
    modelos: ['{cs} cuida de {n}: {nomes}.', 'A carteira de {cs} tem {n}: {nomes}.', 'Hoje {cs} acompanha {n}: {nomes}.'],
    continuacoes: ['Quantos membros no total?', 'Quando é o próximo conselho?', 'Como estão os indicadores?'] },
  { id: 'time.head', familia: 'time', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'time.head',
    exemplos: ['quem e a head de cs', 'quem e a lider do cs', 'quem lidera a area de cs', 'quem e a chefe do cs', 'quem coordena o cs', 'head de customer success', 'quem manda no cs', 'quem e a responsavel pela area de cs', 'a quem eu recorro no cs', 'quem e minha lider'],
    modelos: ['A head de CS é {nome}.', '{nome} lidera a área de CS.', 'Quem lidera a área de CS é {nome}.'], continuacoes: ['Quem são os CS do mês?', 'Quem são os gestores?'] },
  { id: 'time.gestores', familia: 'time', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'time.gestores',
    exemplos: ['quem sao os gestores', 'quem tem acesso de gestor', 'lista de gestores', 'quem e gestor do dash', 'quem sao os gestores da plataforma', 'quais pessoas sao gestoras', 'quem administra o dash', 'gestores do cs', 'quem pode ver a area de gestao'],
    modelos: ['Os gestores do dash são {nomes}.', 'Têm acesso de gestor: {nomes}.'], continuacoes: ['Quem é a head de CS?', 'O que o gestor consegue ver?'] },
];
