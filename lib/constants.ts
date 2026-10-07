// Constantes portadas do Code.gs original (Apps Script) — mesma fonte de verdade usada pela
// Edge Function sync-monday. Ver Code.Gs no projeto MOAI para o arquivo original completo.

// Fotos do time de CS: arquivos estáticos em public/fotos-cs/, servidos direto pelo Next.js
// (nunca em base64 dentro do bundle — mantém o app leve e evita o risco de corrupção que já
// aconteceu antes com base64 grande colado à mão neste projeto). A chave precisa bater
// exatamente com o campo `nome` de cs_config no Supabase.
export const FOTOS_CS: Record<string, string> = {
  'Vilker': '/fotos-cs/vilker.jpg',
  'George': '/fotos-cs/george.jpg',
  'Rodrigo': '/fotos-cs/rodrigo.jpg',
  'Marcos': '/fotos-cs/marcos.jpg',
  'Vitor': '/fotos-cs/vitor.jpg',
  'Mateus': '/fotos-cs/mateus.jpg',
  'Luana': '/fotos-cs/luana.jpg',
};

export const MESES_ORDEM = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const PRODUCT_PRICES: Record<string, number> = {
  'Fast Track': 900,
  'Executivo': 1247,
  'C-Level': 1797,
  'C-Level +': 2497,
  'High End': 4500,
};

// Hierarquia de produto (nível do conselho) pra ordenação padrão da grade de conselhos da home —
// extraído do próprio nome do grupo do Monday (campo `nivel` de parseTituloConselho), nunca de
// coluna de status. "Setorial" (e qualquer nível não listado aqui) fica fora da hierarquia — grupo
// à parte, sempre depois dos cinco níveis abaixo (ver montarGradeConselhos em lib/reports.ts).
// Grafia sem espaço em "C-Level+" é a que aparece de fato nos títulos do board (diferente de
// PRODUCT_PRICES, que usa "C-Level +" — tabelas com propósitos diferentes, não precisam bater).
export const NIVEL_ORDEM = ['Fast Track', 'Executivo', 'C-Level', 'C-Level+', 'High End'];

export const CHURN_EXCLUIR = ['Comunidade', 'N/D'];
export const ROUNDS_STATUS_VALIDO = 'Realizado';
export const UD_STATUS_VALIDO = 'Finalizado';

export const STATUS_PRESENTE = 'Presente';
export const STATUS_AUSENTE_SET = ['Ausente', 'Não vai'];
export const STATUS_NAO_ERA = 'Não era do conselho';
export const STATUS_CONFIRMADO = 'Confirmado';
export const AGENDA_STATUS_CANCELADO = 'Cancelado';

export const FEEDBACK_CATEGORIAS = [
  'Proatividade em ajudar colegas',
  'Contribui para ambiente positivo e motivador',
  'Colabora ativamente com a equipe',
  'Colabora ativamente com os membros da MOAI',
  'Abertura a feedbacks',
];

// ex-CS achados no dropdown "Quem é o seu CS?" do board de Churn que nunca entraram no
// CS_Config — contas deletadas no Monday, sem userId (ver nota completa no Code.gs original).
export const EX_MEMBROS_SEM_CONTA = [
  { nome: 'Luma', nomeCompleto: 'Luma', userId: null as number | null, apelidoConselho: null as string | null, vezesDestaque: 0 },
  { nome: 'Lanna', nomeCompleto: 'Lanna', userId: null as number | null, apelidoConselho: null as string | null, vezesDestaque: 0 },
  { nome: 'Vinicius W.', nomeCompleto: 'Vinicius Walviesse', userId: null as number | null, apelidoConselho: null as string | null, vezesDestaque: 0 },
  { nome: 'Yasmim', nomeCompleto: 'Yasmim', userId: null as number | null, apelidoConselho: null as string | null, vezesDestaque: 0 },
];

// 11 conselheiros cujo nome está escrito diferente entre o board de Gestão (apelido curto) e o
// board de Agenda (nome completo) — ver nota v12 no Code.gs original.
export const APELIDOS_AGENDA: Record<string, string> = {
  'Alan': 'Alan Nogales',
  'Gallo': 'Eduardo Gallo',
  'Gui Figueiredo': 'Guilherme Figueiredo',
  'Herick': 'Herick Ferreira',
  'JP': 'João Pedro',
  'Zago': 'Fernando Zago',
  'Tarso': 'Tarso Frota',
  'Digo Melo': 'Rodrigo Melo',
  'Murilo': 'Murilo Hypólito',
  'Thiago Correa': 'Thiago Correia',
  'Tati Moura': 'Tatiana Moura',
};

// Buckets do "Status de Pagamento" (coluna color_mm5bzhq3 do board de Gestão dos Conselhos) pro
// gráfico de pizza pagante x permuta de cada conselho (ver montarGradeConselhos em lib/reports.ts).
// Decisão fechada com o Vitor (25/09/2026): Conselheiro e Sócio de Conselheiro ficam de fora da
// conta inteira (nem entram no denominador) — não são membros pagantes nem em permuta, são o
// próprio conselheiro ou sócio dele.
export const STATUS_PAGAMENTO_PAGANTE = ['Pagante Padrão', 'Pagante com desconto', 'Parceria Estratégica', 'Inadimplente'];
export const STATUS_PAGAMENTO_PERMUTA = ['Permuta Clube de Permuta', 'Permuta de Conselho'];
export const STATUS_PAGAMENTO_EXCLUIR = ['Conselheiro', 'Sócio de Conselheiro'];

// Limiares das "ações sugeridas" do conselho (B3, pedido do Vitor 25/09/2026) — regras fixas e
// determinísticas, sem IA, calculadas a partir de dados que já existem no banco. Nomeados aqui,
// num único lugar, pra dar pra ajustar sem mexer na lógica em lib/reports.ts (calcularAcoesSugeridas).
export const LIMIAR_HEALTHSCORE_ATENCAO = 60; // healthscore (0-100) abaixo disso sinaliza atenção geral ao conselho
export const LIMIAR_PRESENCA_ATENCAO = 70; // taxa de presença (%) do mês de referência abaixo disso sinaliza reforçar engajamento
export const MESES_JANELA_MATCHMAKINGS_PARADO = 3; // janela (meses corridos terminando no mês real atual) sem nenhum matchmaking pra considerar o conselho "parado" nessa frente
export const SIMILARIDADE_DESAFIO_MIN = 0.6; // overlap mínimo (0-1, por token) pra dois desafios de meses seguidos contarem como "o mesmo problema sem evolução"

// Pesos do CS Top 3 (pontuação ponderada) — somam 100. Ver calcularScoreCS em reports.ts.
export const PESOS_SCORE_CS: Record<string, number> = {
  carteira: 15,
  casesSucesso: 18,
  matchmakings: 18,
  rounds: 12,
  upsell: 12,
  indicacoes: 12,
  churn: 10,
  downsell: 3,
};

// ============ semáforo de confirmações (07/10/2026) ============
// Fonte única das faixas de confirmados de um conselho. A agenda (semana, mês, lista), o selo dos
// cards de conselho, a legenda e o tooltip leem esta constante — nenhum outro lugar repete os
// limiares. "ate: null" é a faixa aberta (8 ou mais). Tokens validados com contraste de pelo menos
// 4,5 para 1 entre corFundo e corTexto; verde e azul tiveram só a luminosidade escurecida
// (#3D8B5F para #3A845A e #3B82F6 para #1E6FF5), mantendo a matiz.
export type SemaforoChave = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';
export type SemaforoFaixa = { chave: SemaforoChave; de: number; ate: number | null; corFundo: string; corTexto: string; rotulo: string };
export const SEMAFORO_CONFIRMADOS: SemaforoFaixa[] = [
  { chave: 'vermelho', de: 0, ate: 1, corFundo: '#C0433D', corTexto: '#FFFFFF', rotulo: 'vermelha' },
  { chave: 'laranja', de: 2, ate: 3, corFundo: '#E8833A', corTexto: '#1A1A1A', rotulo: 'laranja' },
  { chave: 'amarelo', de: 4, ate: 5, corFundo: '#E9C23B', corTexto: '#1A1A1A', rotulo: 'amarela' },
  { chave: 'verde', de: 6, ate: 7, corFundo: '#3A845A', corTexto: '#FFFFFF', rotulo: 'verde' },
  { chave: 'azul', de: 8, ate: null, corFundo: '#1E6FF5', corTexto: '#FFFFFF', rotulo: 'azul' },
];
// Conselho já encerrado não recebe semáforo: estilo neutro, mostra a presença apurada.
export const AGENDA_PASSADO_COR = { corFundo: '#64748B', corTexto: '#FFFFFF' };
// Entrada inválida (nula, negativa, não inteira) cai no neutro, sem lançar erro.
export const SEMAFORO_NEUTRO = { corFundo: '#9F9F9F', corTexto: '#1A1A1A' };

// ============ faixas de presença por membro (kanban da Visão da rede) ============
// Fonte única das quatro faixas. "atencao" reaproveita LIMIAR_PRESENCA_ATENCAO. Fronteiras
// fechadas à direita: até 20 crítica, acima de 20 até 50 baixa, acima de 50 até 70 atenção.
export type FaixaPresencaChave = 'critica' | 'baixa' | 'atencao' | 'saudavel';
export const FAIXAS_PRESENCA: { chave: FaixaPresencaChave; ate: number | null; rotulo: string }[] = [
  { chave: 'critica', ate: 20, rotulo: 'Presença crítica' },
  { chave: 'baixa', ate: 50, rotulo: 'Presença baixa' },
  { chave: 'atencao', ate: LIMIAR_PRESENCA_ATENCAO, rotulo: 'Em atenção' },
  { chave: 'saudavel', ate: null, rotulo: 'Saudável' },
];

// ============ Health da Base (redefinido em 07/10/2026) ============
// Health da Base do CS = percentual de membros críticos na base do CS (todos os membros elegíveis
// dos conselhos dele), segundo o report semanal mais recente, mais os pontos de advertência ativos.
// Menor é melhor; teto de 100,0. Presença NÃO entra no Health (correção do Vitor).
export const PESO_PONTO_ADVERTENCIA_DECIMOS = 10; // décimos de ponto percentual somados ao Health por ponto de advertência ativa

// ============ report individual semanal (07/10/2026) ============
// Report mais velho que isso aparece com o selo "desatualizado".
export const REPORT_VALIDADE_DIAS = 14;
// Quantas semanas para trás o CS ainda pode editar o próprio report (gestor edita qualquer uma).
// O banco aplica a mesma janela em salvar_report_individual (semana atual menos 7 dias).
export const REPORT_EDICAO_SEMANAS = 1;
export const REPORT_COMO_FOI_SEMANA = [
  { valor: 'fluindo', rotulo: 'Fluindo' }, { valor: 'atencao', rotulo: 'Atenção' }, { valor: 'critica', rotulo: 'Crítica' },
];
export const REPORT_STATUS_CHECKLIST = [
  { valor: 'feito', rotulo: 'Feito' }, { valor: 'em_andamento', rotulo: 'Em andamento' }, { valor: 'parado', rotulo: 'Parado' },
];
// Os quatro checklists de rotina, com os mesmos rótulos do board Reports Individuais CS.
export const REPORT_CHECKLISTS = [
  { campo: 'check_atas_crm', rotulo: 'Atas e CRM' },
  { campo: 'check_confirmacoes', rotulo: 'Abriu as confirmações dos conselhos com 15 dias de antecedência' },
  { campo: 'check_gtd', rotulo: 'Atualizou o GTD e a Gestão de Conselhos' },
  { campo: 'check_kpis', rotulo: 'Verificou os KPIs individuais' },
];

// Duração fixa de um conselho na agenda (4h, nunca registrada no Monday). Define o tamanho do bloco
// na grade da semana e o momento em que o conselho passa a ser "encerrado" (sem semáforo).
export const AGENDA_DURACAO_CONSELHO_MIN = 240;
