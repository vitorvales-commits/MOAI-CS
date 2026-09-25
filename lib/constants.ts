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
