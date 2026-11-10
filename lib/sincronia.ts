// Edição de visitas no Monday pela fila de escrita (etapa 4b, 02/11/2026). Funções puras: validação do corpo da
// edição, validação da resolução de conflito, tradução do estado do comando para o que a tela mostra e o filtro da
// fonte "Escritas no Monday pendentes". Quem escreve no banco e no Monday é o banco (enfileirar_edicao_monday,
// sincronia_resolver_conflito) e a tarefa fila_escrita da sync-monday.

export const BOARD_VISITAS = '18432210313';
export const COLUNAS_EDITAVEIS: Record<string, 'date' | 'text'> = {
  date_mm7eccg9: 'date',
  text_mm7eya7z: 'text',
};
// Escrita que está em erro ou em conflito há mais tempo que isto entra na fila de ação do gestor.
export const HORAS_PENDENTE = 24;
// Chave de idempotência: a tela gera uma por tentativa de edição e a reutiliza nos reenvios.
export const CHAVE_MIN = 8;
export const CHAVE_MAX = 100;

export type EdicaoEntrada = { itemId: string; valores: Record<string, string>; lidoEm: string; chave?: string };
export type ValidacaoEdicao = { ok: true; edicao: EdicaoEntrada } | { ok: false; erro: string };

function chaveValida(chave: unknown): chave is string {
  return typeof chave === 'string' && chave.length >= CHAVE_MIN && chave.length <= CHAVE_MAX;
}

export function validarEdicao(corpo: unknown): ValidacaoEdicao {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Corpo da requisição inválido.' };
  const c = corpo as Record<string, unknown>;
  const itemId = String(c.itemId ?? '');
  if (!/^\d{1,20}$/.test(itemId)) return { ok: false, erro: 'Item inválido.' };
  const lidoEm = String(c.lidoEm ?? '');
  if (!lidoEm || Number.isNaN(Date.parse(lidoEm))) return { ok: false, erro: 'Data da leitura inválida.' };
  let chave: string | undefined;
  if (c.chave !== undefined && c.chave !== null) {
    if (!chaveValida(c.chave)) return { ok: false, erro: `Chave inválida (de ${CHAVE_MIN} a ${CHAVE_MAX} caracteres).` };
    chave = c.chave;
  }
  if (!c.valores || typeof c.valores !== 'object' || Array.isArray(c.valores)) {
    return { ok: false, erro: 'Informe os valores a gravar.' };
  }
  const valores: Record<string, string> = {};
  for (const [coluna, valor] of Object.entries(c.valores as Record<string, unknown>)) {
    const tipo = COLUNAS_EDITAVEIS[coluna];
    if (!tipo) return { ok: false, erro: `A coluna ${coluna} não é editável pelo dash.` };
    if (typeof valor !== 'string') return { ok: false, erro: `Valor inválido para ${coluna}.` };
    if (tipo === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { ok: false, erro: 'Data no formato AAAA-MM-DD.' };
    if (tipo === 'text' && valor.length > 5000) return { ok: false, erro: 'Observação muito longa (máximo 5000 caracteres).' };
    valores[coluna] = valor;
  }
  if (Object.keys(valores).length === 0) return { ok: false, erro: 'Nenhuma alteração para gravar.' };
  return { ok: true, edicao: { itemId, valores, lidoEm: new Date(lidoEm).toISOString(), chave } };
}

// Resolução de conflito: usar o valor do Monday, ou reaplicar a alteração do dash sobre o valor atual.
export const ACOES_RESOLUCAO = ['usar_monday', 'reaplicar'] as const;
export type AcaoResolucao = (typeof ACOES_RESOLUCAO)[number];
export type ValidacaoResolucao = { ok: true; acao: AcaoResolucao; chave: string | null } | { ok: false; erro: string };

function ehAcaoResolucao(acao: unknown): acao is AcaoResolucao {
  return typeof acao === 'string' && (ACOES_RESOLUCAO as readonly string[]).includes(acao);
}

export function validarResolucao(corpo: unknown): ValidacaoResolucao {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Corpo da requisição inválido.' };
  const c = corpo as Record<string, unknown>;
  if (!ehAcaoResolucao(c.acao)) return { ok: false, erro: 'Ação inválida: use usar_monday ou reaplicar.' };
  // Só reaplicar cria um comando novo, e só ele precisa de chave.
  if (c.acao === 'usar_monday') return { ok: true, acao: c.acao, chave: null };
  if (!chaveValida(c.chave)) return { ok: false, erro: `Chave inválida (de ${CHAVE_MIN} a ${CHAVE_MAX} caracteres).` };
  return { ok: true, acao: c.acao, chave: c.chave };
}

// Estados que a tela mostra no cartão: enviando (pendente ou executando), salvo, conflito, resolvido e erro.
export type EstadoVisual = 'enviando' | 'salvo' | 'conflito' | 'resolvido' | 'erro';
export function estadoVisual(estado: string, erro?: string | null): EstadoVisual {
  if (estado === 'pendente' || estado === 'executando') return 'enviando';
  if (estado === 'concluido') return 'salvo';
  if (estado === 'conflito') return 'conflito';
  if (estado === 'cancelado' && erro?.startsWith('resolvido:')) return 'resolvido';
  return 'erro';
}

export type EscritaPendente = {
  id: number;
  estado: string;
  board_id: string;
  item_id: string | null;
  criado_em: string;
  executado_em: string | null;
  erro: string | null;
  criado_por: string | null;
  valores: Record<string, string> | null;
};

// Espelho nativo (etapa 5): boards "Registro" e a tabela de origem de cada um. Fixo, porque os boards são criados pela normativa.
export const ESPELHO_BOARDS: Record<string, string> = {
  '18439110272': 'relatorios_conselho',
  '18439110274': 'advertencias_aplicadas',
  '18439110276': 'metas_definidas',
  '18439110277': 'cs_periodos',
  '18439229782': 'bonus_aplicados',
};
export const ROTULO_ESPELHO: Record<string, string> = {
  relatorios_conselho: 'Relatórios pós conselho',
  advertencias_aplicadas: 'Advertências',
  metas_definidas: 'Metas definidas',
  cs_periodos: 'Períodos de CS',
  relatorio_conselho_faltas: 'Relatórios pós conselho',
  bonus_aplicados: 'Bônus de pontuação',
};
export function ehBoardEspelho(boardId: string): boolean {
  return Object.prototype.hasOwnProperty.call(ESPELHO_BOARDS, boardId);
}

export type FalhaEspelho = { tabela_origem: string; erro_mensagem: string; ocorrido_em: string };
export type EspelhoEmErro = { tabela: string; erro: string | null; criado_em: string; executado_em: string | null };

// Comandos de espelho que pararam em erro (depois das tentativas). Sem limite de horas: falha é falha.
export function espelhosEmErroDaFila(linhas: EscritaPendente[]): EspelhoEmErro[] {
  return linhas
    .filter((l) => l.estado === 'erro' && ehBoardEspelho(l.board_id))
    .map((l) => ({ tabela: ESPELHO_BOARDS[l.board_id], erro: l.erro, criado_em: l.criado_em, executado_em: l.executado_em }))
    .sort((a, b) => new Date(a.executado_em ?? a.criado_em).getTime() - new Date(b.executado_em ?? b.criado_em).getTime());
}

// Bloco de espelho na fila de ação: um item por tabela de origem, somando falhas do gatilho e comandos em erro.
// Falhas do gatilho só contam nas últimas JANELA_FALHA_HORAS horas (a RPC devolve 7 dias; o corte é aqui).
// Não há como saber, sem mudança no banco, se uma falha já foi resolvida por um comando concluído depois dela.
export const JANELA_FALHA_HORAS = 24;
export type GrupoEspelho = { tabela: string; rotulo: string; total: number; ultimaEm: string; ultimaMensagem: string };

export function agruparFalhasEspelho(falhas: FalhaEspelho[], emErro: EspelhoEmErro[], agora: Date = new Date()): GrupoEspelho[] {
  const limite = agora.getTime() - JANELA_FALHA_HORAS * 3_600_000;
  const registros: { tabela: string; em: string; msg: string }[] = [
    ...falhas
      .filter((f) => new Date(f.ocorrido_em).getTime() >= limite)
      .map((f) => ({ tabela: f.tabela_origem, em: f.ocorrido_em, msg: f.erro_mensagem })),
    ...emErro.map((e) => ({ tabela: e.tabela, em: e.executado_em ?? e.criado_em, msg: e.erro ?? 'sem mensagem' })),
  ];
  const porTabela = new Map<string, { total: number; ultimo: { em: string; msg: string } }>();
  for (const r of registros) {
    const atual = porTabela.get(r.tabela);
    const maisRecente = !atual || new Date(r.em).getTime() > new Date(atual.ultimo.em).getTime();
    porTabela.set(r.tabela, {
      total: (atual?.total ?? 0) + 1,
      ultimo: maisRecente ? { em: r.em, msg: r.msg } : atual!.ultimo,
    });
  }
  return [...porTabela.entries()]
    .map(([tabela, g]) => ({
      tabela, rotulo: ROTULO_ESPELHO[tabela] ?? tabela, total: g.total,
      ultimaEm: g.ultimo.em, ultimaMensagem: g.ultimo.msg,
    }))
    .sort((a, b) => new Date(b.ultimaEm).getTime() - new Date(a.ultimaEm).getTime());
}

// Fila de ação de visitas: erro, ou conflito parado há mais de HORAS_PENDENTE. Mais antigo primeiro.
// Comandos de espelho ficam de fora: têm bloco próprio ("Espelho no Monday com falha").
export function escritasPendentesDaFila(linhas: EscritaPendente[], agora: Date = new Date()): EscritaPendente[] {
  const limite = agora.getTime() - HORAS_PENDENTE * 3_600_000;
  return linhas
    .filter((l) => !ehBoardEspelho(l.board_id))
    .filter((l) => (l.estado === 'erro' || l.estado === 'conflito') && new Date(l.executado_em ?? l.criado_em).getTime() <= limite)
    .sort((a, b) => new Date(a.executado_em ?? a.criado_em).getTime() - new Date(b.executado_em ?? b.criado_em).getTime());
}
