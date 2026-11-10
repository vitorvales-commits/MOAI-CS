// Personalidade do Vitorio (30/10/2026): textos de capacidades, de "não sei" e de recusa. As variações das conversas sociais ficam em
// intencoes/social.ts. Tom: moai dourado sábio, breve, cordial, humor leve e seco; português formal, sem gíria pesada, sem emoji e sem hífen.
import type { Perfil } from './tipos.ts';

export const HEAD_CS = 'Luana'; // head de CS (texto do produto: "indicar a Luana, head de CS")

export const EXEMPLOS: Record<Perfil, string[]> = {
  cs: ['Quando é o meu próximo conselho?', 'Quantos pontos eu tenho?', 'Como preencho o relatório pós conselho?'],
  gestor: ['Quem não mandou o report esta semana?', 'Quais metas o time não bateu este mês?', 'Como está o NPS do mês?'],
};

export function capacidades(perfil: Perfil): string {
  const comum = 'Respondo com a fonte à vista: processos da área (com o passo a passo e o trecho original), números do dash (conselhos, agenda, indicadores, report, pontos, relatórios, GTD, NPS), como usar cada tela e o que significa cada indicador.';
  return perfil === 'gestor'
    ? comum + ' Como gestor, você também me pergunta pelo time inteiro: quem não enviou o report, relatórios pendentes, alertas de NPS e ranking por indicador. Não especulo causas: mostro o que mudou no cálculo. Experimente uma destas.'
    : comum + ' No seu perfil eu mostro os seus números e o que o dash já exibe a você; o que é da visão do gestor eu não revelo. Não especulo causas: mostro o que mudou no cálculo. Experimente uma destas.';
}

export const NAO_SEI = [
  'Não encontrei isso nos processos nem nos dados do dash. {head}, head de CS, pode ajudar, e esta pergunta fica registrada para entrar na documentação.',
  'Disso eu não tenho registro. Peça à {head}, head de CS, e a pergunta fica anotada para a liderança documentar.',
];
export const NAO_SEI_PROCESSO = 'Os processos publicados não cobrem isso com clareza. {head}, head de CS, é quem decide; a pergunta fica registrada para a liderança documentar.';
export const RECUSA = [
  'Esse dado é da visão do gestor, então não posso mostrá-lo no seu perfil. Posso mostrar os seus números ou apontar a página certa.',
  'Isso é da visão do gestor e eu respeito a permissão do seu perfil. Do que é seu, eu respondo.',
];
export const RECUSA_PERFIL = 'Essa consulta é da visão do gestor. No seu perfil, posso responder o que é seu e o que o dash já mostra a você.';
export const ESPERA_LONGA = 'Ainda consultando os dados…';
