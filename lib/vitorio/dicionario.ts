// Dicionário de dados do Vitorio 2 (30/10/2026): para cada indicador do catálogo (indicadores_catalogo) e cada número das páginas
// principais, a origem, a frequência de atualização, a regra de cálculo (escrita a partir do código), onde aparece e o que fazer
// quando sai do esperado. O glossário de regras operacionais (pontos, prazos, NPS) continua em glossario.ts e entra no mesmo índice.
// Teste: tests/vitorio-dicionario.test.ts exige uma entrada para cada linha de indicadores_catalogo e config_home_indicadores.
import {
  ROUNDS_STATUS_VALIDO, UD_STATUS_VALIDO, LIMIAR_PRESENCA_ATENCAO, PESO_PONTO_ADVERTENCIA_DECIMOS, REPORT_VALIDADE_DIAS, FIDELIDADE_MESES, CHURN_EXCLUIR,
} from '../constants.ts';
import type { DocNav } from './navegacao.ts';

export type EntradaDicionario = {
  chave: string; titulo: string; origem: string; frequencia: string; regra: string; onde: { cs?: string; gestor?: string };
  fora_do_esperado: string; frases: string[]; direcao?: 'min' | 'max';
};
const SYNC = 'Sincronização com o Monday a cada 5 minutos; o botão de sincronização do topo força uma leitura na hora.';

// As chaves de indicador seguem indicadores_catalogo.chave.
export const DICIONARIO: EntradaDicionario[] = [
  { chave: 'cases', titulo: 'Cases de Sucesso', origem: 'Board Cases de Sucesso do Monday, tabela cases', frequencia: SYNC, direcao: 'min',
    regra: 'Quantidade de cases registrados no mês cujo responsável é o CS, casando todas as grafias do nome dele. Quando a matriz de metas tem valor manual para o mês, ele vale no lugar do calculado.',
    onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' }, fora_do_esperado: 'Conferir se o case foi registrado no board do mês certo e se só vale quando cumpre os critérios do guia de cases.', frases: ['como e calculado cases de sucesso', 'o que conta como case', 'de onde vem o numero de cases'] },
  { chave: 'matchmakings', titulo: 'Matchmakings', origem: 'Board Matchmaking do Monday, tabela matchmakings', frequencia: SYNC, direcao: 'min',
    regra: 'Quantidade de matchmakings do mês registrados no board com o usuário do Monday do CS. CS sem usuário do Monday vinculado fica com zero.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Todo matchmaking precisa ser registrado e ter follow up com as duas partes; confira o registro no board e o vínculo do usuário do Monday em Controle de perfis.', frases: ['como e calculado matchmaking', 'o que conta como matchmaking', 'por que meu matchmaking esta zerado'] },
  { chave: 'rounds', titulo: 'Rounds', origem: 'Board Rounds do Monday, tabela rounds', frequencia: SYNC, direcao: 'min',
    regra: 'Quantidade de rounds do mês do CS com status ' + ROUNDS_STATUS_VALIDO + '.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Round só conta depois de marcado como ' + ROUNDS_STATUS_VALIDO + ' no board.', frases: ['como e calculado rounds', 'o que conta como round', 'por que meu round nao entrou'] },
  { chave: 'indicacoes', titulo: 'Indicações', origem: 'Reports semanais (campo de indicações), tabela reports_individuais', frequencia: 'Atualiza quando o report semanal é enviado.', direcao: 'min',
    regra: 'Soma das indicações informadas nos reports semanais dentro do mês.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Informe as indicações no report da semana em que aconteceram; sem report enviado o número não sobe.', frases: ['como e calculado indicacoes', 'de onde vem o numero de indicacoes'] },
  { chave: 'upsell', titulo: 'Upsell', origem: 'Board Upsell e Downsell do Monday, tabela upsell_downsell', frequencia: SYNC, direcao: 'min',
    regra: 'Quantidade de upsells do período com status ' + UD_STATUS_VALIDO + ' atribuídos ao CS.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'O registro só conta quando está ' + UD_STATUS_VALIDO + ' no board; confira o status.', frases: ['como e calculado upsell', 'o que conta como upsell', 'por que meu upsell nao apareceu'] },
  { chave: 'downsell', titulo: 'Downsell', origem: 'Board Upsell e Downsell do Monday, tabela upsell_downsell', frequencia: SYNC, direcao: 'max',
    regra: 'Quantidade de downsells do período com status ' + UD_STATUS_VALIDO + ' atribuídos ao CS. Quanto menor, melhor.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Acima da meta pede conversa com o membro e registro do motivo no board.', frases: ['como e calculado downsell', 'o que conta como downsell'] },
  { chave: 'churn', titulo: 'Churn', origem: 'Board de Churn do Monday, tabela churn', frequencia: SYNC, direcao: 'max',
    regra: 'Quantidade de saídas do mês de membros da carteira do CS, conforme o board de Churn (as categorias ' + CHURN_EXCLUIR.join(' e ') + ' ficam fora da análise da área). Quanto menor, melhor.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=churn' },
    fora_do_esperado: 'Abra Churn e reconquista para ver motivo, visita e se o membro disse que voltaria. A fidelidade da MOAI é de ' + FIDELIDADE_MESES + ' meses.', frases: ['como e calculado o churn', 'o que conta como churn', 'de onde vem o churn'] },
  { chave: 'revenue_churn', titulo: 'Revenue Churn', origem: 'Board de Churn do Monday e tabela de preços por produto (lib/constants.ts)', frequencia: SYNC, direcao: 'max',
    regra: 'Soma do preço do produto de cada membro que saiu no mês. Churn sem produto informado no board não soma, porque o valor é desconhecido, então a receita pode estar subestimada.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=churn' },
    fora_do_esperado: 'Se faltar produto no registro do board, a receita fica de fora; peça o preenchimento.', frases: ['como e calculado o revenue churn', 'o que e receita perdida', 'por que o revenue churn esta zerado'] },
  { chave: 'carteira', titulo: 'Carteira', origem: 'Conselhos do Monday, tabelas conselhos_grupos e conselhos_membros', frequencia: SYNC, direcao: 'min',
    regra: 'Quantidade de conselhos ativos do CS: grupos cujo título traz o apelido dele entre parênteses, sem repositório. É só informação, sem peso na pontuação.', onde: { cs: '/?aba=conselhos', gestor: '/gestor?aba=conselhos' },
    fora_do_esperado: 'Carteira diferente do esperado costuma ser título de grupo sem o apelido do CS; confira no board de Conselhos.', frases: ['como e calculada a carteira', 'o que conta na carteira', 'por que minha carteira esta diferente'] },
  { chave: 'presenca', titulo: 'Presença nos conselhos', origem: 'Status de presença do board de Conselhos, tabela conselhos_status_mensal', frequencia: SYNC, direcao: 'min',
    regra: 'Presentes sobre os registros de presença do mês, somando conselhos já realizados. Abaixo de ' + LIMIAR_PRESENCA_ATENCAO + ' por cento o conselho entra em atenção. Não entra no Health da Base.', onde: { cs: '/?aba=conselhos', gestor: '/gestor?aba=conselhos' },
    fora_do_esperado: 'Presença baixa pede contato com os ausentes e oferta de reposição no mesmo mês.', frases: ['como e calculada a presenca', 'o que e a taxa de presenca', 'por que a presenca esta baixa'] },
  { chave: 'suspensoes', titulo: 'Suspensões', origem: 'Catálogo de indicadores e matriz de metas, tabela indicadores_catalogo', frequencia: 'Sem cálculo automático nas páginas hoje.', direcao: 'max',
    regra: 'Indicador do catálogo de metas. Hoje o dash não calcula este número a partir dos boards; quando aparecer, vem da matriz de metas.', onde: { gestor: '/gestor?aba=metasDestaques' },
    fora_do_esperado: 'Para acompanhar suspensões, use o processo de suspensão e o board Congelamento e Suspensão.', frases: ['como e calculada a suspensao', 'o que e o indicador de suspensoes'] },
  { chave: 'critico', titulo: 'Membros críticos', origem: 'Report semanal do CS (campo de críticos), tabela reports_individuais', frequencia: 'Atualiza quando o report semanal é enviado.', direcao: 'max',
    regra: 'Quantidade de membros críticos informada pelo CS no report mais recente do período. Um report com mais de ' + REPORT_VALIDADE_DIAS + ' dias aparece como desatualizado.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Aumento de críticos pede plano de ação por membro; confira a escala de críticos e envie o report atualizado.', frases: ['como e calculado criticos', 'o que e membro critico', 'de onde vem o numero de criticos'] },
  { chave: 'health_base', titulo: 'Health da Base', origem: 'Report semanal (críticos), base de membros dos conselhos e pontos de advertência ativos', frequencia: 'Recalcula a cada leitura, com o report mais recente.', direcao: 'max',
    regra: 'Percentual de críticos sobre todos os membros elegíveis da carteira, segundo o report mais recente, mais ' + (PESO_PONTO_ADVERTENCIA_DECIMOS / 10) + ' ponto percentual por ponto de advertência ativo. Menor é melhor, com teto de 100. Presença não entra.',
    onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral' }, fora_do_esperado: 'Subiu: veja se houve novo report com mais críticos ou novo ponto de advertência.', frases: ['como e calculado o health da base', 'por que meu health subiu', 'o que compoe o health'] },
];

export const DICIONARIO_NUMEROS: EntradaDicionario[] = [
  { chave: 'ritmo', titulo: 'Status de ritmo (Acelerar, Quase no ritmo, No ritmo)', origem: 'Metas do mês e realizado do indicador', frequencia: SYNC,
    regra: 'Compara o realizado com o esperado até hoje (meta proporcional aos dias decorridos). Abaixo de 70 por cento do esperado é Acelerar, de 70 a 90 é Quase no ritmo, a partir de 90 é No ritmo.', onde: { cs: '/', gestor: '/gestor?aba=visaoGeral' },
    fora_do_esperado: 'Acelerar pede ação antes do fim do mês; veja o indicador que está atrás.', frases: ['o que significa acelerar', 'o que significa no ritmo', 'como e calculado o ritmo'] },
  { chave: 'ranking', titulo: 'Posição no ranking do time', origem: 'Pontuação do CS no mês', frequencia: SYNC,
    regra: 'Ordem pela pontuação do CS no mês. Só entra quem tem meta e dado em pelo menos 3 indicadores; os demais aparecem como Sem dados suficientes.', onde: { cs: '/?aba=indicadores', gestor: '/gestor?aba=visaoGeral#mapa-time' },
    fora_do_esperado: 'Fora do ranking costuma ser falta de meta cadastrada para o mês; peça ao gestor.', frases: ['como e a posicao no ranking', 'por que estou fora do ranking'] },
];

const TODAS = [...DICIONARIO, ...DICIONARIO_NUMEROS];
export function docsDicionario(): DocNav[] {
  return TODAS.map((d) => ({
    chave: 'dicionario:' + d.chave, colecao: 'glossario', titulo: d.titulo,
    corpo: d.regra + ' Origem: ' + d.origem + '. ' + d.frequencia + ' ' + d.fora_do_esperado,
    perguntas: d.frases, palavras: [d.chave.replace(/_/g, ' ')], destino: null,
    destinos: { cs: d.onde.cs ?? null, gestor: d.onde.gestor ?? null }, origem: 'Dicionário de dados do dash', verbo: 'Ver onde aparece', data: null, perfis: ['cs', 'gestor'],
  }));
}
