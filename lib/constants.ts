// Constantes portadas do Code.gs original (Apps Script) — mesma fonte de verdade usada pela
// Edge Function sync-monday. Ver Code.Gs no projeto MOAI para o arquivo original completo.

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
