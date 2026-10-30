// Roteiros dos tours do Vitorio (30/10/2026), para revisão. Texto em português formal, curto, sem hífen, focado no que a pessoa
// deve fazer. Cada tour ensina a leitura em três níveis (relance, diagnóstico, detalhe), sem descrever botão por botão.
//  - alvo: valor do atributo data-tour no elemento da página. Nunca seletor por classe visual, para o redesenho não quebrar o tour.
//  - novoDesde: versão do roteiro em que o passo entrou. Quando a versão sobe, quem já viu o tour vê só os passos novos.
//  - Suba `versao` ao mudar passos de um tour já publicado.
export type Perfil = 'cs' | 'gestor';
export type Passo = { id: string; alvo: string; titulo: string; texto: string; novoDesde: number };
export type Roteiro = { id: string; versao: number; perfil: Perfil; pagina: string; nome: string; passos: Passo[] };

const vitorio: Passo = {
  id: 'vitorio', alvo: 'vitorio', novoDesde: 1, titulo: 'Pergunte ao Vitorio',
  texto: 'Dúvida sobre um processo, um indicador ou o lugar de uma tela? Digite a pergunta e ele mostra o trecho original do documento e leva você até lá. Se não souber, a pergunta fica registrada para a liderança documentar.',
};

export const ROTEIROS: Roteiro[] = [
  { id: 'gestor-area', versao: 1, perfil: 'gestor', pagina: 'area', nome: 'Visão da área', passos: [
    { id: 'kpis', alvo: 'kpis', novoDesde: 1, titulo: 'Relance: os números do mês', texto: 'Estes quatro números dizem em segundos se o mês está no rumo. Comece por aqui e só desça se algum estiver fora do esperado.' },
    { id: 'mapa-time', alvo: 'mapa-time', novoDesde: 1, titulo: 'Diagnóstico: Mapa do time', texto: 'Uma linha por CS. A cor só aparece onde algo saiu do esperado. Em Prioridade, quem mais precisa de você fica no topo.' },
    { id: 'fila-acao', alvo: 'fila-acao', novoDesde: 1, titulo: 'Diagnóstico: Fila de ação', texto: 'Tudo que pede uma decisão sua nesta semana: reports, GTD, relatórios do conselho, alertas de NPS e dúvidas que o Vitorio não soube responder. Atenda primeiro o que está em vermelho.' },
    { id: 'rede-conselhos', alvo: 'rede-conselhos', novoDesde: 1, titulo: 'Detalhe: Rede de conselhos', texto: 'Abra os conselhos quando o mapa ou a fila apontarem um problema. Aqui ficam presença, nível e membros de cada um.' },
    vitorio,
  ] },
  { id: 'gestor-cs', versao: 1, perfil: 'gestor', pagina: 'cs-do-gestor', nome: 'Página do CS vista pelo gestor', passos: [
    { id: 'ficha-cs', alvo: 'ficha-cs', novoDesde: 1, titulo: 'Relance: a ficha do CS', texto: 'Pontuação, posição no ranking, Health da base e situação do acompanhamento desta pessoa, tudo numa coluna.' },
    { id: 'pontos-cs', alvo: 'pontos-cs', novoDesde: 1, titulo: 'Diagnóstico: onde estão os pontos', texto: 'Mostra quais indicadores explicam a distância até a nota cheia. Comece pelo que está mais abaixo da meta.' },
    { id: 'pauta-cs', alvo: 'pauta-cs', novoDesde: 1, titulo: 'Diagnóstico: pauta do próximo 1:1', texto: 'Sugestão de assuntos montada a partir dos números. Leve para a conversa e registre o combinado na aba 1:1.' },
    { id: 'abas-cs', alvo: 'abas-cs', novoDesde: 1, titulo: 'Detalhe: as abas', texto: 'Indicadores, GTD, Base e advertências e 1:1 guardam o detalhe. Abra só a aba que o diagnóstico indicou.' },
    vitorio,
  ] },
  { id: 'gestor-processos', versao: 1, perfil: 'gestor', pagina: 'processos', nome: 'Processos', passos: [
    { id: 'documento', alvo: 'documento', novoDesde: 1, titulo: 'O documento oficial de processos', texto: 'Fluxos, POPs, modelos e dúvidas gerais da área ficam aqui, com busca própria. É a fonte que o Vitorio consulta.' },
    { id: 'editar', alvo: 'editar-processos', novoDesde: 1, titulo: 'Quando faltar resposta, documente', texto: 'Editar processos permite corrigir um item ou acrescentar o que faltava. O que o time perguntou e o Vitorio não soube responder aparece na Fila de ação como lembrete.' },
    vitorio,
  ] },
  { id: 'cs-inicio', versao: 1, perfil: 'cs', pagina: 'inicio', nome: 'Início', passos: [
    { id: 'foco', alvo: 'foco', novoDesde: 1, titulo: 'Relance: o que fazer agora', texto: 'O foco de hoje reúne a coisa mais urgente: um conselho próximo, uma etapa de GTD atrasada ou o report da semana. Comece por ele.' },
    { id: 'pontuacao', alvo: 'pontuacao', novoDesde: 1, titulo: 'Relance: sua pontuação', texto: 'Sua nota do mês e a posição no ranking. Ela só sobe quando as metas do mês andam, então olhe para o ritmo logo ao lado.' },
    { id: 'metas-mes', alvo: 'metas-mes', novoDesde: 1, titulo: 'Diagnóstico: metas do mês', texto: 'Cada meta mostra o realizado contra o esperado até hoje. Quem está atrás do ritmo pede ação antes do fim do mês.' },
    { id: 'tarefas', alvo: 'tarefas', novoDesde: 1, titulo: 'Detalhe: tarefas do GTD', texto: 'As etapas dos seus conselhos, das que mais pedem atenção para as que menos pedem. Conclua as atrasadas primeiro.' },
    vitorio,
  ] },
  { id: 'cs-conselhos', versao: 1, perfil: 'cs', pagina: 'conselhos', nome: 'Meus conselhos', passos: [
    { id: 'agenda', alvo: 'agenda', novoDesde: 1, titulo: 'Relance: a agenda', texto: 'Os encontros da semana ou do mês, com a cor do semáforo de confirmados. Conselho com poucos confirmados pede contato antes da data.' },
    { id: 'conselhos', alvo: 'conselhos', novoDesde: 1, titulo: 'Diagnóstico: seus conselhos', texto: 'Cada cartão mostra presença, confirmados e situação do GTD. Abra o que estiver em atenção para chegar aos membros e às etapas.' },
    vitorio,
  ] },
  { id: 'cs-acompanhamento', versao: 1, perfil: 'cs', pagina: 'acompanhamento', nome: 'Acompanhamento', passos: [
    { id: 'ritmo', alvo: 'ritmo', novoDesde: 1, titulo: 'Relance: seu ritmo', texto: 'Mostra como foram as últimas oito semanas de report. Constância evita pontos de advertência.' },
    { id: 'report', alvo: 'report', novoDesde: 1, titulo: 'Diagnóstico: report semanal', texto: 'O report vence na sexta às 19h. Preencha aqui, informe os membros críticos e confira o checklist de rotina.' },
    { id: 'relatorios', alvo: 'relatorios', novoDesde: 1, titulo: 'Diagnóstico: relatório pós conselho', texto: 'Cada encontro tem até sete dias para o relatório. Os pendentes aparecem aqui, do mais atrasado para o menos atrasado.' },
    { id: 'advertencias', alvo: 'advertencias', novoDesde: 1, titulo: 'Detalhe: pontos de advertência', texto: 'Os pontos ativos e o motivo de cada um. Eles somam ao Health da base, então merecem atenção.' },
    vitorio,
  ] },
  { id: 'cs-processos', versao: 1, perfil: 'cs', pagina: 'processos', nome: 'Processos', passos: [
    { id: 'documento', alvo: 'documento', novoDesde: 1, titulo: 'O documento oficial de processos', texto: 'Fluxos, POPs, modelos e dúvidas gerais da área, com busca própria. Antes de perguntar no grupo, procure aqui.' },
    vitorio,
  ] },
];
