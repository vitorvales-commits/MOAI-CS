// Edição de visitas no Monday pela fila de escrita (etapa 4b, 02/11/2026). Funções puras: validação do corpo da
// edição, tradução do estado do comando para o que a tela mostra e o filtro da fonte "Escritas no Monday pendentes".
// Quem escreve no banco e no Monday é o banco (enfileirar_edicao_monday) e a tarefa fila_escrita da sync-monday.

export const BOARD_VISITAS = '18432210313';
export const COLUNAS_EDITAVEIS: Record<string, 'date' | 'text'> = {
  date_mm7eccg9: 'date',
  text_mm7eya7z: 'text',
};
// Escrita que está em erro ou em conflito há mais tempo que isto entra na fila de ação do gestor.
export const HORAS_PENDENTE = 24;

export type EdicaoEntrada = { itemId: string; valores: Record<string, string>; lidoEm: string };
export type ValidacaoEdicao = { ok: true; edicao: EdicaoEntrada } | { ok: false; erro: string };

export function validarEdicao(corpo: unknown): ValidacaoEdicao {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Corpo da requisição inválido.' };
  const c = corpo as Record<string, unknown>;
  const itemId = String(c.itemId ?? '');
  if (!/^\d{1,20}$/.test(itemId)) return { ok: false, erro: 'Item inválido.' };
  const lidoEm = String(c.lidoEm ?? '');
  if (!lidoEm || Number.isNaN(Date.parse(lidoEm))) return { ok: false, erro: 'Data da leitura inválida.' };
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
  return { ok: true, edicao: { itemId, valores, lidoEm: new Date(lidoEm).toISOString() } };
}

// Estados que a tela mostra no cartão: enviando (pendente ou executando), salvo, conflito e erro.
export type EstadoVisual = 'enviando' | 'salvo' | 'conflito' | 'erro';
export function estadoVisual(estado: string): EstadoVisual {
  if (estado === 'pendente' || estado === 'executando') return 'enviando';
  if (estado === 'concluido') return 'salvo';
  if (estado === 'conflito') return 'conflito';
  return 'erro';
}

export type EscritaPendente = { id: number; estado: string; board_id: string; item_id: string | null; criado_em: string; executado_em: string | null; erro: string | null };

// Fila de ação: erro, ou conflito parado há mais de HORAS_PENDENTE. Mais antigo primeiro.
export function escritasPendentesDaFila(linhas: EscritaPendente[], agora: Date = new Date()): EscritaPendente[] {
  const limite = agora.getTime() - HORAS_PENDENTE * 3_600_000;
  return linhas
    .filter((l) => (l.estado === 'erro' || l.estado === 'conflito') && new Date(l.executado_em ?? l.criado_em).getTime() <= limite)
    .sort((a, b) => new Date(a.executado_em ?? a.criado_em).getTime() - new Date(b.executado_em ?? b.criado_em).getTime());
}
