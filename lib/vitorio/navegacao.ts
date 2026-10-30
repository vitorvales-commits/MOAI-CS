// Registro de navegação do Vitorio (30/10/2026): uma entrada por página ou aba do app, com as frases de pergunta que
// levam até ela. A maior parte sai das definições do dock (lib/ui/tema.ts), então um item novo no dock já aparece aqui
// com título e subtítulo; as frases de pergunta ficam em FRASES_DOCK e um teste (tests/vitorio-navegacao.test.ts) falha
// se um item do dock ficar sem elas. O que o dock não cobre (seções dentro de uma página) está em NAVEGACAO_FIXA.
import type { DocVitorio } from './busca.ts';
import { gruposCS, gruposGestor } from '../ui/tema.ts';

export type Perfil = 'cs' | 'gestor';
export type DocNav = DocVitorio & { perfis: Perfil[]; destinos?: Partial<Record<Perfil, string | null>> };

// chave: perfil:chaveDoDock
export const FRASES_DOCK: Record<string, string[]> = {
  'gestor:inicio': ['onde fica o início', 'situação do mês', 'página inicial do gestor', 'resumo do mês da área'],
  'gestor:area': ['onde vejo a visão da área', 'onde fica a fila de ação', 'onde vejo o mapa do time', 'o que está urgente na área', 'indicadores da área'],
  'gestor:time': ['onde vejo a página de um cs', 'como está um cs do time', 'página individual de cada cs', 'acompanhar um cs'],
  'gestor:conselhos': ['onde vejo os conselhos', 'cartões dos conselhos', 'onde ficam as atas', 'impacto dos conselhos', 'presença dos conselhos'],
  'gestor:metas': ['onde defino as metas do mês', 'onde vejo as metas', 'metas e destaques', 'recordes do time', 'sugerir metas'],
  'gestor:churn': ['onde vejo o churn', 'onde vejo os cancelamentos', 'saídas e motivos', 'reconquista de membros', 'quem saiu'],
  'gestor:nps': ['onde vejo o nps', 'onde vejo a nota dos conselhos', 'pulso de cs', 'voz do membro', 'alertas de nps'],
  'gestor:voz': ['onde vejo os pedidos para a liderança', 'fila da liderança', 'sugestões dos cs para a liderança'],
  'gestor:perfis': ['onde vinculo um cs', 'controle de perfis', 'permissões de acesso', 'quem é gestor', 'dar acesso a alguém'],
  'gestor:processos': ['onde ficam os processos', 'onde vejo os fluxos', 'documento de processos', 'onde ficam os pops'],
  'cs:inicio': ['onde fica o meu início', 'o que fazer agora', 'meu dia', 'página inicial do cs'],
  'cs:agenda': ['onde vejo a agenda', 'quando é o próximo conselho', 'agenda dos conselhos', 'rounds da semana'],
  'cs:meus-conselhos': ['onde vejo meus conselhos', 'onde vejo os membros do conselho', 'presença dos membros', 'checklist do conselho', 'onde vejo o gtd'],
  'cs:processos': ['onde ficam os processos', 'onde vejo os fluxos', 'documento de processos', 'onde ficam os pops'],
  'cs:indicadores': ['onde vejo minhas metas', 'onde vejo meus indicadores', 'metas contra o realizado', 'como estou no mês', 'meu desempenho'],
  'cs:pontos': ['onde vejo meus pontos', 'pontos de advertência', 'quantos pontos tenho', 'advertências ativas'],
  'cs:report': ['onde envio o report', 'onde preencho o report semanal', 'report da semana', 'prazo do report'],
  'cs:gestor': ['área de gestão', 'visão da área para gestor'],
};

const verbo = (titulo: string) => 'Ir para ' + titulo;

// Entradas geradas do dock.
export function navegacaoDoDock(): DocNav[] {
  const out: DocNav[] = [];
  ([['gestor', gruposGestor({})], ['cs', gruposCS({})]] as const).forEach(([perfil, grupos]) => {
    grupos.forEach((g) => g.itens.forEach((i) => {
      out.push({
        chave: 'navegacao:' + perfil + '-' + i.chave, colecao: 'navegacao', titulo: i.titulo, corpo: i.sub + '. Grupo ' + g.titulo + '.',
        perguntas: FRASES_DOCK[perfil + ':' + i.chave] || [], palavras: [], destino: i.href, origem: 'Navegação do dash', verbo: verbo(i.titulo),
        data: null, perfis: [perfil],
      });
    }));
  });
  return out;
}

// Seções dentro das páginas, que o dock não lista.
export const NAVEGACAO_FIXA: DocNav[] = [
  { chave: 'navegacao:gestor-fila', colecao: 'navegacao', titulo: 'Fila de ação', corpo: 'Pendências da semana da área: report atrasado, GTD, relatórios do conselho, alertas de NPS e dúvidas sem resposta.',
    perguntas: ['onde vejo as pendências da área', 'onde fica a fila de ação', 'o que cobrar do time', 'dúvidas sem resposta'], palavras: [], destino: '/gestor?aba=visaoGeral#filaAcao',
    origem: 'Navegação do dash', verbo: 'Ir para a Fila de ação', data: null, perfis: ['gestor'] },
  { chave: 'navegacao:gestor-mapa', colecao: 'navegacao', titulo: 'Mapa do time', corpo: 'Uma linha por CS, com a cor só onde algo saiu do esperado, em ordem de prioridade ou de ranking.',
    perguntas: ['onde vejo o mapa do time', 'ranking dos cs', 'quem está atrás do ritmo', 'pontuação dos cs'], palavras: [], destino: '/gestor?aba=visaoGeral#mapa-time',
    origem: 'Navegação do dash', verbo: 'Ir para o Mapa do time', data: null, perfis: ['gestor'] },
  { chave: 'navegacao:gestor-relatorios-conselho', colecao: 'navegacao', titulo: 'Relatórios do conselho (gestor)', corpo: 'Relatórios pós conselho pendentes e atrasados por CS, com leitura de reincidência.',
    perguntas: ['onde vejo os relatórios pós conselho', 'quem não fez o relatório do conselho', 'relatório do conselho atrasado'], palavras: ['relatorio pos conselho'],
    destino: '/gestor?aba=conselhos#h-rel-gestor', origem: 'Navegação do dash', verbo: 'Ir para os relatórios do conselho', data: null, perfis: ['gestor'] },
  { chave: 'navegacao:cs-relatorio-conselho', colecao: 'navegacao', titulo: 'Relatório pós conselho', corpo: 'Relatório de cada encontro, preenchido em até 7 dias depois do conselho, na aba Acompanhamento.',
    perguntas: ['onde preencho o relatório do conselho', 'onde faço o relatório pós conselho', 'relatório do encontro', 'prazo do relatório do conselho'], palavras: ['relatorio pos conselho'],
    destino: '/?aba=report', origem: 'Navegação do dash', verbo: 'Ir para o Acompanhamento', data: null, perfis: ['cs'] },
  { chave: 'navegacao:cs-o-que-fazer-agora', colecao: 'navegacao', titulo: 'O que fazer agora', corpo: 'Pendências do dia, da mais urgente para a menos urgente, no topo do Início.',
    perguntas: ['onde vejo minhas pendências', 'o que preciso fazer hoje', 'o que está atrasado'], palavras: [], destino: '/', origem: 'Navegação do dash', verbo: 'Ir para o Início', data: null, perfis: ['cs'] },
];
