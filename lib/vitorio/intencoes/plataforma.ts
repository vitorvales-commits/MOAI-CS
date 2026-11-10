// Intenções de plataforma e processo: como fazer uma ação, onde ver algo, o que significa um termo ou número, quem pode fazer o quê,
// por que não consigo fazer algo, e perguntas de processo respondidas de forma direta a partir do documento publicado.
import type { Intencao } from '../tipos.ts';

export const PLATAFORMA: Intencao[] = [
  { id: 'plataforma.como_fazer', familia: 'plataforma', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'plataforma.como_fazer',
    exemplos: ['como faco para preencher o relatorio do conselho', 'como envio o report semanal', 'como registro uma 1a1', 'como cadastro uma meta', 'como aplico uma advertencia', 'como troco minha foto', 'como vinculo um cs', 'como cadastro uma pergunta extra',
      'como publico os processos', 'como faco para sincronizar o monday', 'como vejo o relatorio do mes', 'onde eu clico para confirmar um membro', 'como anulo uma advertencia', 'como registro um case', 'como trato um alerta de nps', 'como definir metas do mes',
      'como edito os processos', 'como adiciono um gestor', 'passo a passo para enviar o report', 'como faz pra salvar o relatorio do conselho'],
    modelos: ['{texto}'], continuacoes: ['Quem pode fazer isso?', 'Qual o prazo?'] },
  { id: 'plataforma.onde', familia: 'plataforma', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'plataforma.onde',
    exemplos: ['onde vejo o nps', 'onde fica a fila de acao', 'onde vejo meus pontos', 'onde preencho o relatorio do conselho', 'onde vejo as metas', 'onde ficam os processos', 'onde vejo o churn', 'onde acho a agenda', 'em que tela vejo o health',
      'onde envio o report', 'onde fica o controle de perfis', 'onde vejo o mapa do time', 'me leva para a agenda', 'onde esta a pagina do cs', 'onde vejo meus conselhos'],
    modelos: ['{texto}'], continuacoes: ['O que significa esse número?'] },
  { id: 'plataforma.significado', familia: 'plataforma', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'plataforma.significado',
    exemplos: ['o que significa health da base', 'o que e o nps', 'o que quer dizer no ritmo', 'o que e critico', 'o que e revenue churn', 'o que significa acelerar', 'como e calculado o health', 'como calcula a pontuacao', 'de onde vem esse numero',
      'o que e matchmaking', 'o que e round', 'o que e gtd', 'o que significa fora do alvo', 'como e calculado o churn', 'o que e a carteira', 'qual a regra de calculo dos cases', 'o que e upsell', 'o que significa membro critico'],
    modelos: ['{texto}'], continuacoes: ['Onde vejo esse número?', 'Por que ele mudou?'] },
  { id: 'plataforma.permissao', familia: 'plataforma', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'plataforma.permissao',
    exemplos: ['quem pode aplicar advertencia', 'quem pode editar os processos', 'por que nao consigo editar os processos', 'por que nao consigo ver o ranking', 'por que nao vejo a area de gestao', 'quem pode definir metas', 'por que nao consigo ver outro cs',
      'o que o gestor consegue ver', 'o que o cs pode ver', 'por que nao consigo aplicar advertencia', 'quem pode ver o um a um privado', 'quem pode vincular cs', 'quem pode publicar processos', 'por que o botao esta bloqueado', 'quem enxerga as notas privadas'],
    modelos: ['{texto}'], continuacoes: ['Como falo com a liderança?'] },
  { id: 'processo.direto', familia: 'processo', obrigatorias: [], perfis: ['cs', 'gestor'], manipulador: 'processo.direto',
    exemplos: ['como funciona o onboarding', 'qual o processo de designacao', 'como e o processo de churn', 'o que faco quando um membro quer cancelar', 'como funciona o upsell na pratica', 'qual o fluxo do conselho', 'o que fazer apos o conselho', 'como funciona a reposicao',
      'quais os passos do pre conselho', 'qual o prazo para enviar o encaminhamento', 'quanto tempo leva o onboarding', 'como e o processo de congelamento', 'o que acontece na suspensao', 'como funciona a visita de churn', 'como faco um matchmaking', 'o que e um case',
      'como funcionam os rounds', 'qual a politica de reposicao', 'quando faco o follow dos encaminhamentos', 'processo de offboarding'],
    modelos: ['{texto}'], continuacoes: ['Quem é o responsável?', 'Qual o prazo?'] },
];
