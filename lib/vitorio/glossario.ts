// Glossário do Vitorio (30/10/2026): definição curta e regra de cálculo dos indicadores e das regras operacionais do dash.
// Escrito a partir do código (lib/constants.ts, lib/indicadores-base.ts, lib/pontos.ts, lib/pontuacao.ts, lib/home-regras.ts),
// com os números lidos das mesmas constantes: se a regra mudar lá, a definição muda aqui sem texto para corrigir à mão.
import {
  PESO_PONTO_ADVERTENCIA_DECIMOS, REPORT_VALIDADE_DIAS, PONTOS_REPORT_ATRASADO, PONTOS_RELATORIO_ATRASADO, PESOS_SCORE_CS,
  PONTUACAO_MIN_INDICADORES_COM_META, SCORE_FAIXA_SAUDAVEL, SCORE_FAIXA_ATENCAO, HOME_RITMO_LIMIAR_ACELERAR, HOME_RITMO_LIMIAR_NO_RITMO,
  ALERTA_NPS_LIMIAR_DETRATOR, ALERTA_NPS_LIMIAR_NOTA_CS, ALERTA_NPS_MINIMO, ALERTA_NPS_MEDIA_MINIMA, ALERTA_NPS_AMOSTRA_MINIMA,
  FIDELIDADE_MESES, GTD_PRAZOS_ETAPA, GTD_DIAS_CICLO_ABERTO, LIMIAR_PRESENCA_ATENCAO, ROUNDS_STATUS_VALIDO, UD_STATUS_VALIDO,
  DIAS_MIN_PROJECAO, FECHAMENTO_DIA_CORTE,
} from '../constants.ts';
import { RELATORIO_PRAZO_DIAS, REPORT_PRAZO_HORA } from '../pontos.ts';
import type { DocNav } from './navegacao.ts';

const pct = (n: number) => String(n).replace('.', ',') + '%';
const dec = (n: number) => String(n).replace('.', ',');
const g = (id: string, titulo: string, corpo: string, perguntas: string[], palavras: string[], destinos: DocNav['destinos']): DocNav => ({
  chave: 'glossario:' + id, colecao: 'glossario', titulo, corpo, perguntas, palavras, destino: null, destinos,
  origem: 'Glossário do dash', verbo: 'Ver onde aparece', data: null, perfis: ['cs', 'gestor'],
});

const diasGtd = (chave: string) => GTD_PRAZOS_ETAPA.find((e) => e.chave === chave)!.dias;
const pesos = PESOS_SCORE_CS;

export const GLOSSARIO: DocNav[] = [
  g('health-da-base', 'Health da Base',
    'Percentual de membros críticos na base do CS (todos os membros elegíveis dos conselhos dele), segundo o report semanal mais recente que o CS enviou, mais os pontos de advertência ativos: cada ponto soma ' +
    dec(PESO_PONTO_ADVERTENCIA_DECIMOS / 10) + ' ponto percentual. Menor é melhor e o teto é 100. A presença nos conselhos não entra no Health. Um report com mais de ' + REPORT_VALIDADE_DIAS + ' dias aparece como desatualizado.',
    ['o que é o health da base', 'como é calculado o health', 'o que são membros críticos', 'por que meu health subiu'], ['critico', 'saude da base', 'health'],
    { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' }),
  g('pontos-advertencia', 'Pontos de advertência',
    'Pontos aplicados a um CS por descumprir uma rotina. Dois são automáticos: report semanal sem envio até sexta às ' + REPORT_PRAZO_HORA + 'h gera ' + PONTOS_REPORT_ATRASADO +
    ' pontos; relatório pós conselho fora do prazo de ' + RELATORIO_PRAZO_DIAS + ' dias gera ' + PONTOS_RELATORIO_ATRASADO + ' pontos. Os pontos automáticos valem até o fim do mês corrente. Os pontos ativos entram no Health da Base.',
    ['como funcionam os pontos de advertência', 'quando levo ponto', 'quantos pontos vale um report atrasado', 'até quando valem os pontos'], ['penalidade', 'advertencia', 'ponto'],
    { cs: '/?aba=advertencias', gestor: '/gestor?aba=visaoGeral#mapa-time' }),
  g('prazo-do-report', 'Prazo do report semanal',
    'O report semanal vence na sexta às ' + REPORT_PRAZO_HORA + 'h. Quem não envia até lá recebe ' + PONTOS_REPORT_ATRASADO + ' pontos de advertência. O report enviado na segunda conta para a semana anterior, já com atraso. ' +
    'O report mais antigo que ' + REPORT_VALIDADE_DIAS + ' dias aparece como desatualizado.',
    ['qual o prazo do report', 'até quando envio o report', 'o que acontece se eu atrasar o report', 'report de segunda conta'], ['report semanal', 'sexta'],
    { cs: '/?aba=report', gestor: '/gestor?aba=visaoGeral#filaAcao' }),
  g('prazo-relatorio-conselho', 'Prazo do relatório pós conselho',
    'O relatório pós conselho deve ser preenchido em até ' + RELATORIO_PRAZO_DIAS + ' dias depois do encontro. Fora do prazo, gera ' + PONTOS_RELATORIO_ATRASADO + ' pontos de advertência para o CS responsável.',
    ['qual o prazo do relatório pós conselho', 'em quantos dias faço o relatório do conselho', 'relatório do conselho atrasado gera ponto'], ['relatorio do conselho', 'ata do cs'],
    { cs: '/?aba=report', gestor: '/gestor?aba=conselhos#h-rel-gestor' }),
  g('prazos-gtd', 'Prazos do GTD do conselho',
    'Cada etapa do GTD tem prazo contado a partir da data do conselho: confirmação individual ' + Math.abs(diasGtd('confirmacao_individual')) + ' dias antes, confirmação no grupo ' + Math.abs(diasGtd('confirmacao_grupo')) +
    ' dias antes, verificar a jornada ' + Math.abs(diasGtd('verificar_jornada')) + ' dia antes; depois do encontro, cuidar dos membros e enviar encaminhamentos em ' + diasGtd('encaminhamentos') + ' dias, gestão de conhecimento em ' +
    diasGtd('gestao_conhecimento') + ', matchmakings em ' + diasGtd('matchmakings') + ', upsells em ' + diasGtd('upsells') + ' e follow dos encaminhamentos em ' + diasGtd('follow_encaminhamento') + '. O ciclo fica aberto até ' + GTD_DIAS_CICLO_ABERTO + ' dias depois do conselho.',
    ['quais os prazos do gtd', 'quando confirmo a presença', 'quando faço o follow dos encaminhamentos', 'prazo de cada etapa do conselho'], ['gtd', 'etapas', 'checklist do conselho'],
    { cs: '/?aba=conselhos', gestor: '/gestor?aba=visaoGeral#filaAcao' }),
  g('metas-do-mes', 'Metas do mês',
    'O gestor define as metas de cada indicador por mês e por CS. Os indicadores de crescimento são comparados ao esperado até hoje: abaixo de ' + pct(HOME_RITMO_LIMIAR_ACELERAR * 100) +
    ' do esperado o status é Acelerar, de ' + pct(HOME_RITMO_LIMIAR_ACELERAR * 100) + ' a ' + pct(HOME_RITMO_LIMIAR_NO_RITMO * 100) + ' é Quase no ritmo e a partir de ' + pct(HOME_RITMO_LIMIAR_NO_RITMO * 100) +
    ' é No ritmo. Churn e downsell são limites: quanto menor, melhor. A projeção do mês só aparece depois de ' + DIAS_MIN_PROJECAO + ' dias decorridos. Cada mês só fecha no dia ' + FECHAMENTO_DIA_CORTE + ' do mês seguinte.',
    ['o que são as metas do mês', 'como é definida a meta', 'o que significa no ritmo', 'o que significa acelerar', 'quando o mês fecha'], ['meta', 'ritmo', 'esperado'],
    { cs: '/?aba=indicadores', gestor: '/gestor?aba=metasDestaques' }),
  g('pontuacao-do-cs', 'Pontuação do CS',
    'Nota de 0 a 100 do CS no mês, com pesos por indicador: cases de sucesso ' + pesos.casesSucesso + ', matchmakings ' + pesos.matchmakings + ', rounds ' + pesos.rounds + ', upsell ' + pesos.upsell + ', indicações ' + pesos.indicacoes +
    ', churn ' + pesos.churn + ' e downsell ' + pesos.downsell + '. Os pesos são renormalizados entre os indicadores que têm meta, então bater todas as metas vale 100. A carteira não pontua. É preciso ter meta e dado em pelo menos ' +
    PONTUACAO_MIN_INDICADORES_COM_META + ' indicadores para receber nota. Acima de ' + SCORE_FAIXA_SAUDAVEL + ' é saudável, entre ' + SCORE_FAIXA_ATENCAO + ' e ' + SCORE_FAIXA_SAUDAVEL + ' é atenção e abaixo de ' + SCORE_FAIXA_ATENCAO + ' é risco.',
    ['como é calculada a pontuação do cs', 'qual o peso de cada indicador', 'o que é o ranking', 'cs top 3', 'por que estou sem dados suficientes'], ['score', 'ranking', 'top 3', 'nota do cs'],
    { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral#mapa-time' }),
  g('nps', 'NPS e alerta de NPS baixo',
    'Pesquisa de satisfação do conselheiro depois de cada encontro, com nota de 0 a 10 para o conselho e para o CS. O alerta de NPS baixo dispara quando a nota do conselheiro é ' + ALERTA_NPS_LIMIAR_DETRATOR +
    ' ou menos (detrator), quando a nota dada ao CS é ' + ALERTA_NPS_LIMIAR_NOTA_CS + ' ou menos, ou quando o NPS do encontro fica abaixo de ' + ALERTA_NPS_MINIMO + ' ou a média abaixo de ' + dec(ALERTA_NPS_MEDIA_MINIMA) +
    '. Os agregados só valem com pelo menos ' + ALERTA_NPS_AMOSTRA_MINIMA + ' respostas. O alerta entra na Fila de ação do gestor até ser tratado.',
    ['o que é nps', 'quando dispara o alerta de nps', 'o que é detrator', 'nota baixa do conselheiro', 'como o nps é calculado'], ['nota', 'detrator', 'pesquisa de satisfacao'],
    { gestor: '/gestor?aba=nps' }),
  g('fidelidade', 'Fidelidade de ' + FIDELIDADE_MESES + ' meses',
    'A fidelidade da MOAI é de ' + FIDELIDADE_MESES + ' meses: saída dentro dela tem multa proporcional. O dash usa esse prazo na análise de churn e de reconquista.',
    ['o que é a fidelidade', 'quanto tempo dura a fidelidade', 'tem multa se o membro sair', 'fidelidade de 12 meses'], ['multa', 'rescisao', 'permanencia'],
    { gestor: '/gestor?aba=churn' }),
  g('indicadores-gerais', 'Indicadores gerais',
    'Grade de indicadores do mês: cases de sucesso, matchmakings, rounds (contam os com status ' + ROUNDS_STATUS_VALIDO + '), upsell e downsell (contam os com status ' + UD_STATUS_VALIDO + '), indicações, churn, revenue churn, ' +
    'membros críticos (Health da Base) e carteira, que é só informação e não pontua. Cada um mostra o realizado contra a meta do mês.',
    ['o que são os indicadores gerais', 'como é contado o round', 'o que conta como upsell', 'o que é revenue churn', 'o que é carteira'], ['indicadores', 'realizado', 'matchmakings', 'rounds', 'upsell', 'downsell', 'cases'],
    { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' }),
  g('presenca-conselho', 'Presença do conselho',
    'Taxa de presença dos membros nos encontros do mês. Abaixo de ' + pct(LIMIAR_PRESENCA_ATENCAO) + ' o conselho entra em atenção e pede reforço de engajamento. A presença não entra no Health da Base.',
    ['o que é a taxa de presença', 'quando um conselho entra em atenção', 'qual a presença mínima', 'por que o conselho está em atenção'], ['presenca', 'frequencia', 'abaixo do limite'],
    { cs: '/?aba=conselhos', gestor: '/gestor?aba=conselhos' }),
];
