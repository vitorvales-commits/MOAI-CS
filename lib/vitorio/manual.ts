// Manual da plataforma (Vitorio 2, 30/10/2026): uma entrada para cada ação de escrita do dash. O teste tests/vitorio-manual.test.ts
// falha se uma rota de escrita (POST, PATCH, PUT ou DELETE em app/api) não estiver em `rotas` de alguma entrada.
// Texto escrito a partir dos comentários e das regras de cada rota; prazos e pontos vêm de lib/constants.ts e lib/pontos.ts.
import { PONTOS_RELATORIO_ATRASADO, PONTOS_REPORT_ATRASADO } from '../constants.ts';
import { RELATORIO_PRAZO_DIAS, REPORT_PRAZO_HORA } from '../pontos.ts';

export type EntradaManual = {
  id: string; titulo: string; rotas: string[]; o_que_faz: string; onde: string; url: string; quem: 'cs' | 'gestor' | 'cs_ou_gestor';
  passos: string[]; prazo?: string; consequencia?: string; se_der_erro?: string; frases: string[];
};

const GESTOR_ERRO = 'Se aparecer "Esta área é restrita a gestores", seu perfil não tem essa permissão; fale com a liderança.';
const m = (e: EntradaManual): EntradaManual => e;

export const MANUAL: EntradaManual[] = [
  m({ id: 'relatorio-conselho', titulo: 'Preencher o relatório pós conselho', rotas: ['/api/conselho/[grupo]/relatorio'], quem: 'cs_ou_gestor',
    o_que_faz: 'Registra como foi cada encontro: avaliação, avanço, membro que exige atenção, combinado e as faltas com categoria e justificativa.',
    onde: 'Acompanhamento, bloco Relatórios do conselho, ou a página do conselho', url: '/?aba=report',
    passos: ['Abra Acompanhamento e escolha o relatório pendente, ou abra a página do conselho.', 'Marque a avaliação do encontro e escreva o avanço.', 'Se houver, escolha o membro que exige atenção e diga o motivo.', 'Informe a categoria e a justificativa de cada falta.', 'Salve o relatório.'],
    prazo: 'Até ' + RELATORIO_PRAZO_DIAS + ' dias depois do encontro. Depois do prazo só o gestor edita.', consequencia: 'Relatório fora do prazo gera ' + PONTOS_RELATORIO_ATRASADO + ' pontos de advertência.',
    se_der_erro: 'Se a tela disser que o encontro não exige relatório, ele não está na lista de pendentes. Se o prazo passou, peça ao gestor para editar.',
    frases: ['como preencho o relatorio do conselho', 'como faco o relatorio pos conselho', 'como salvar o relatorio do conselho', 'como registro as faltas do encontro'] }),
  m({ id: 'confirmar-membro', titulo: 'Confirmar o membro de uma ata', rotas: ['/api/conselho/[grupo]/confirmar-membro', '/api/conselho/[grupo]/confirmar-destaque'], quem: 'cs_ou_gestor',
    o_que_faz: 'Quando a extração da ata ou do NPS não consegue casar um nome com o roster, você escolhe o membro certo e o dash passa a reconhecer essa grafia.',
    onde: 'Página do conselho', url: '/', passos: ['Abra o conselho e procure o aviso de nome não reconhecido.', 'Escolha o membro oficial na lista.', 'Confirme.'],
    se_der_erro: 'Se o membro não aparece na lista, ele não está no roster do conselho; peça ao gestor para conferir o board do Monday.',
    frases: ['como confirmo o membro da ata', 'como confirmar o destaque da reuniao', 'nome nao reconhecido na ata', 'como corrijo o membro do big deal'] }),
  m({ id: 'consulta-rapida', titulo: 'Consulta rápida do gestor', rotas: ['/api/consulta'], quem: 'gestor',
    o_que_faz: 'Responde perguntas sobre metas e desempenho do time a partir de uma frase digitada no painel de consulta da Visão da área.',
    onde: 'Visão da área, painel de consulta', url: '/gestor?aba=visaoGeral', passos: ['Abra a Visão da área.', 'Digite a pergunta no painel de consulta ou escolha um exemplo.', 'Leia a resposta e a fonte.'], se_der_erro: GESTOR_ERRO,
    frases: ['como uso a consulta rapida', 'como pergunto sobre as metas de um cs', 'onde digito uma pergunta sobre o time'] }),
  m({ id: 'advertencia-aplicar', titulo: 'Aplicar, editar, anular ou excluir uma advertência', rotas: ['/api/cs/[nome]/advertencias', '/api/cs/[nome]/advertencias/[id]', '/api/cs/[nome]/advertencias/[id]/anular'], quem: 'gestor',
    o_que_faz: 'O gestor aplica um tipo do catálogo a um CS, edita a observação, anula com motivo (sem apagar) ou exclui o que foi lançado por engano.',
    onde: 'Página do CS vista pelo gestor, aba Base e advertências', url: '/gestor', passos: ['Abra a página do CS pelo item Time.', 'Entre na aba Base e advertências.', 'Escolha o tipo e escreva a observação para aplicar.', 'Para anular, informe o motivo; para corrigir, edite a observação.'],
    consequencia: 'Os pontos ativos entram no Health da Base do CS.', se_der_erro: 'Só gestor aplica, edita, anula ou exclui advertência; o CS apenas consulta as próprias.',
    frases: ['como aplico uma advertencia', 'como anulo uma advertencia', 'como excluo um ponto aplicado por engano', 'como edito a observacao da advertencia'] }),
  m({ id: 'advertencia-tipos', titulo: 'Criar ou editar tipos de advertência', rotas: ['/api/gestor/advertencia-tipos', '/api/gestor/advertencia-tipos/[id]', '/api/gestor/advertencia-soma-health'], quem: 'gestor',
    o_que_faz: 'Define o catálogo de advertências (nome, pontos e validade), permite desativar um tipo sem apagá-lo e liga ou desliga a soma dos pontos ativos ao Health da Base.',
    onde: 'Controle de perfis', url: '/gestor?aba=controlePerfis', passos: ['Abra Controle de perfis.', 'Crie um tipo com nome, pontos e validade, ou edite um existente.', 'Para parar de usar um tipo, desative em vez de apagar.'], se_der_erro: GESTOR_ERRO,
    frases: ['como crio um tipo de advertencia', 'como mudo os pontos de uma advertencia', 'como desativo um tipo de advertencia', 'como ligo a soma dos pontos no health'] }),
  m({ id: 'foto-cs', titulo: 'Trocar ou remover a foto do CS', rotas: ['/api/cs/[nome]/foto'], quem: 'cs_ou_gestor',
    o_que_faz: 'Salva uma foto recortada em 480 por 480 ou remove a foto customizada e volta para a padrão.', onde: 'Sua página, lápis sobre a foto', url: '/',
    passos: ['Abra sua página de CS.', 'Clique no lápis sobre a foto.', 'Recorte e salve; para voltar à padrão, remova.'], se_der_erro: 'O CS só troca a própria foto; se a imagem for recusada, use JPG ou PNG menor.',
    frases: ['como troco minha foto', 'como mudo a foto do perfil', 'como removo minha foto']}),
  m({ id: 'cs-destaque', titulo: 'Alterar quantas vezes um CS foi Destaque', rotas: ['/api/destaque/[nome]'], quem: 'gestor',
    o_que_faz: 'Ajusta o contador de vezes em que o CS foi reconhecido como CS Destaque.', onde: 'Página do CS, selo CS Destaque', url: '/gestor', passos: ['Abra a página do CS.', 'Clique no selo CS Destaque.', 'Informe o novo valor e salve.'], se_der_erro: 'Só gestor altera o CS Destaque.',
    frases: ['como altero o cs destaque', 'como mudo quantas vezes o cs foi destaque']}),
  m({ id: 'alerta-nps', titulo: 'Tratar um alerta de NPS', rotas: ['/api/gestor/alertas-nps/[id]/tratar', '/api/gestor/nps/aliases-pendentes'], quem: 'gestor',
    o_que_faz: 'Marca um alerta de NPS baixo como tratado, com uma nota curta do que foi feito, e confirma a qual conselho pertence cada resposta de NPS ainda sem vínculo.',
    onde: 'Fila de ação e aba NPS', url: '/gestor?aba=nps', passos: ['Abra a Fila de ação e localize o alerta.', 'Clique em Marcar como tratado.', 'Escreva a nota curta e confirme.'], se_der_erro: 'Só gestor trata alertas.',
    frases: ['como trato um alerta de nps', 'como marco o alerta como tratado', 'como confirmo o conselho de uma resposta de nps']}),
  m({ id: 'config-equipe', titulo: 'Liberar os indicadores da equipe para os CS', rotas: ['/api/gestor/config'], quem: 'gestor',
    o_que_faz: 'Liga ou desliga, para todos os CS de uma vez e sem deploy, a visão dos indicadores da equipe.', onde: 'Controle de perfis', url: '/gestor?aba=controlePerfis', passos: ['Abra Controle de perfis.', 'Altere a chave de indicadores da equipe.'], se_der_erro: GESTOR_ERRO,
    frases: ['como libero os indicadores da equipe', 'como deixo o cs ver o time', 'como escondo os indicadores dos outros cs']}),
  m({ id: 'perfis-vinculos', titulo: 'Vincular CS e e-mails, ativar ou desativar CS', rotas: ['/api/gestor/cs-roster', '/api/gestor/cs-usuarios', '/api/gestor/vincular-cs', '/api/gestor/gestores'], quem: 'gestor',
    o_que_faz: 'Ativa ou desativa um CS no roster, vincula um e-mail a um perfil de CS, cria o vínculo de um CS detectado nos boards e adiciona ou remove gestores.',
    onde: 'Controle de perfis', url: '/gestor?aba=controlePerfis', passos: ['Abra Controle de perfis.', 'Para um CS novo, use o aviso de CS não vinculado e informe nome e nome completo.', 'Para dar acesso, vincule o e-mail ao CS.', 'Para gestor, adicione o e-mail na lista de gestores.'],
    se_der_erro: 'Sem o vínculo do e-mail, a pessoa vê a mensagem de perfil ainda não vinculado.', frases: ['como vinculo um cs', 'como dou acesso a um cs novo', 'como adiciono um gestor', 'como desativo um cs', 'como vinculo o email ao cs', 'perfil ainda nao vinculado']}),
  m({ id: 'metas', titulo: 'Definir, copiar e registrar recordes das metas', rotas: ['/api/gestor/metas', '/api/gestor/metas/copiar', '/api/gestor/recordes-manuais', '/api/gestor/indicadores-home'], quem: 'gestor',
    o_que_faz: 'Define a meta de cada indicador por mês, para o time ou para cada CS, copia as metas de um mês para outro sem sobrescrever, cadastra recordes anteriores ao histórico e escolhe quais indicadores aparecem na home.',
    onde: 'Metas e destaques', url: '/gestor?aba=metasDestaques', passos: ['Abra Metas e destaques e escolha o mês.', 'Preencha a matriz de indicadores por CS ou por time.', 'Para repetir um mês, use copiar metas e escolha origem e destino.', 'Use sugerir metas se quiser uma base pelo histórico.'],
    se_der_erro: 'A cópia nunca sobrescreve o que já foi definido no mês de destino.', frases: ['como defino as metas do mes', 'como copio as metas de outro mes', 'como cadastro um recorde manual', 'como escolho os indicadores da home', 'como cadastrar meta']}),
  m({ id: 'um-a-um', titulo: 'Registrar a 1:1 e acompanhar combinados', rotas: ['/api/gestor/cs/[nome]/um-a-um', '/api/gestor/lideranca', '/api/gestor/voz', '/api/gestor/membro/melhorias'], quem: 'gestor',
    o_que_faz: 'O gestor registra a 1:1 de um CS com resumo compartilhado e notas privadas, acompanha os compromissos da liderança, a Voz do liderado e a fila de melhorias dos membros.',
    onde: 'Página do CS, aba 1:1, e Fila da liderança', url: '/gestor?aba=voz', passos: ['Abra a página do CS e a aba 1:1.', 'Informe a data e escreva o resumo; notas privadas ficam só com o gestor.', 'Crie os combinados e atualize o status até concluir.'], se_der_erro: 'O CS vê só o resumo compartilhado e os itens compartilhados, nunca as notas privadas.',
    frases: ['como registro a 1a1', 'como crio um combinado da 1a1', 'como atualizo o status de um pedido para a lideranca', 'como registro uma melhoria do membro']}),
  m({ id: 'reconquista', titulo: 'Acompanhar a reconquista de quem saiu', rotas: ['/api/gestor/reconquista'], quem: 'gestor',
    o_que_faz: 'Registra status, responsável, próximo contato e observação de quem disse na pesquisa de saída que voltaria.', onde: 'Churn e reconquista', url: '/gestor?aba=churn', passos: ['Abra Churn e reconquista.', 'Escolha o ex membro.', 'Defina status, responsável e data do próximo contato.'], se_der_erro: GESTOR_ERRO,
    frases: ['como registro a reconquista', 'como marco um ex membro para contato', 'como defino o proximo contato de reconquista']}),
  m({ id: 'processos', titulo: 'Publicar ou restaurar os processos', rotas: ['/api/processos', '/api/processos/restaurar'], quem: 'gestor',
    o_que_faz: 'Publica uma nova versão do documento de processos, editando item a item, ou republica uma versão antiga como nova. O histórico guarda as versões.', onde: 'Processos, botão Editar processos', url: '/processos',
    passos: ['Abra Processos e clique em Editar processos.', 'Altere os itens e confira a validação.', 'Descreva o que mudou e publique.', 'Para voltar atrás, abra o histórico e restaure a versão.'], se_der_erro: 'Se disser que outra pessoa publicou antes, recarregue a página e refaça a alteração.',
    frases: ['como edito os processos', 'como publico uma nova versao dos processos', 'como restauro uma versao antiga dos processos', 'como corrijo um item do processo']}),
  m({ id: 'sincronizar', titulo: 'Sincronizar com o Monday agora', rotas: ['/api/sync-agora'], quem: 'cs_ou_gestor',
    o_que_faz: 'Força a leitura dos boards do Monday sem esperar a sincronização automática, que roda a cada 5 minutos.', onde: 'Indicador de sincronização no dock', url: '/', passos: ['Clique no horário de sincronização no topo.', 'Aguarde o novo horário aparecer.'],
    se_der_erro: 'Se aparecer Erro ou quadros com erro, algum board falhou; tente de novo em alguns minutos e avise a liderança se continuar.', frases: ['como sincronizo com o monday', 'como atualizo os dados agora', 'como forco a sincronizacao']}),
  m({ id: 'reabrir-mes', titulo: 'Reabrir um mês fechado', rotas: ['/api/gestor/cs/[nome]/evolucao'], quem: 'gestor',
    o_que_faz: 'Apaga a fotografia de um mês já fechado, para que ele seja recalculado e fechado de novo. O mês anterior fica aberto até o dia 5 do mês seguinte.',
    onde: 'Página do CS vista pelo gestor, evolução', url: '/gestor', passos: ['Abra a página do CS e a evolução.', 'Escolha o mês fechado.', 'Use a opção de reabrir e confirme.'], se_der_erro: GESTOR_ERRO,
    frases: ['como reabro um mes fechado', 'como refazer o fechamento do mes', 'como apago a fotografia do mes']}),
  m({ id: 'report-semanal', titulo: 'Enviar o report semanal', rotas: [], quem: 'cs',
    o_que_faz: 'Registra como foi a semana, os membros críticos e o checklist de rotina.', onde: 'Report semanal', url: '/?aba=report', passos: ['Abra Report semanal pelo dock.', 'Marque como foi a semana e informe os críticos.', 'Confira o checklist de rotina e envie.'],
    prazo: 'Sexta às ' + REPORT_PRAZO_HORA + 'h. O report enviado na segunda conta para a semana anterior, já com atraso.', consequencia: 'Sem envio até o prazo, o CS recebe ' + PONTOS_REPORT_ATRASADO + ' pontos de advertência.',
    frases: ['como envio o report semanal', 'como preencho o report', 'qual o prazo do report', 'como mando o report da semana']}),
];

// Rota de arquivo (app/api/.../route.ts) para o formato usado em MANUAL.rotas.
export const rotaDoArquivo = (arquivo: string) => '/' + arquivo.replace(/\\/g, '/').replace(/^app\//, '').replace(/\/route\.ts$/, '');

// Documentos do manual para o índice do Vitorio (colecao manual): corpo com o que faz, passos, prazo e consequência.
export function docsManual() {
  return MANUAL.map((e) => ({
    chave: 'manual:' + e.id, colecao: 'manual' as const, titulo: e.titulo,
    corpo: [e.o_que_faz, ...e.passos.map((p, i) => (i + 1) + '. ' + p), e.prazo, e.consequencia, e.se_der_erro].filter(Boolean).join(' '),
    perguntas: e.frases, palavras: [e.onde], destino: e.url, origem: 'Manual do dash', verbo: 'Ir para ' + e.onde, data: null,
    perfis: (e.quem === 'gestor' ? ['gestor'] : e.quem === 'cs' ? ['cs'] : ['cs', 'gestor']) as ('cs' | 'gestor')[],
  }));
}
