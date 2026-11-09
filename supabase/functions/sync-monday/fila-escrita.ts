// Fila de escrita do dash para o Monday (etapa 4a, 02/11/2026). Funções puras: não acessam banco nem API.
// Testadas em tests/fila-escrita.test.ts. Quem chama fica em index.ts.

// Conflito: o item mudou no Monday depois que o usuário leu o valor no dash. O Monday vence, e a escrita não é feita.
// Sem leitura registrada (lido_em nulo) ou sem data do Monday, a escrita segue.
export type Decisao = 'escrever' | 'conflito';

export function decidirEscrita(lidoEm: string | null, atualizadoEmMonday: string | null): Decisao {
  if (!lidoEm || !atualizadoEmMonday) return 'escrever';
  return new Date(atualizadoEmMonday).getTime() > new Date(lidoEm).getTime() ? 'conflito' : 'escrever';
}

// Espera após cada falha, em minutos: 1, 5, 30 e 120. São 5 tentativas no total; após a quinta falha o comando vai para erro.
export const ESPERAS_MINUTOS = [1, 5, 30, 120];
export const MAX_TENTATIVAS = 5;

// Próxima tentativa depois da falha número `tentativas` (já contada). Nulo quando esgotou.
export function proximaTentativa(tentativas: number, agora: Date): Date | null {
  if (tentativas >= MAX_TENTATIVAS) return null;
  const espera = ESPERAS_MINUTOS[Math.max(0, tentativas - 1)];
  return new Date(agora.getTime() + espera * 60_000);
}

// Tipo de cada coluna editável, espelho de sincronia.campos_editaveis (piloto de Visita Churns).
export const TIPO_COLUNA: Record<string, 'date' | 'text'> = {
  date_mm7eccg9: 'date',
  text_mm7eya7z: 'text',
};

// Valor no formato da API do Monday: data como {"date": "AAAA-MM-DD"}, texto como string.
export function valorParaMonday(colunaId: string, valor: unknown): unknown {
  if (TIPO_COLUNA[colunaId] === 'date') return { date: String(valor).slice(0, 10) };
  return String(valor ?? '');
}

// Formato tipado (espelho nativo, etapa 5): { coluna_id: { tipo, valor } }. Nulo limpa a coluna.
export type TipoColunaEspelho = 'text' | 'long_text' | 'numbers' | 'date' | 'status';
export type ValorTipado = { tipo: TipoColunaEspelho; valor: unknown };

function ehValorTipado(v: unknown): v is ValorTipado {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'tipo' in v && 'valor' in v;
}

export function valorTipadoParaMonday(tipo: TipoColunaEspelho, valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  switch (tipo) {
    case 'text': return String(valor);
    case 'long_text': return { text: String(valor) };
    case 'numbers': return String(valor);
    case 'date': return { date: String(valor).slice(0, 10) };
    case 'status': return { label: String(valor) };
    default: throw new Error(`tipo de coluna desconhecido: ${String(tipo)}`);
  }
}

// Aceita os dois formatos: o do piloto (valor cru, colunas de TIPO_COLUNA) e o tipado do espelho.
export function montarColumnValues(valores: Record<string, unknown>): string {
  const saida: Record<string, unknown> = {};
  for (const [coluna, valor] of Object.entries(valores)) {
    saida[coluna] = ehValorTipado(valor)
      ? valorTipadoParaMonday(valor.tipo, valor.valor)
      : valorParaMonday(coluna, valor);
  }
  return JSON.stringify(saida);
}

export type ResultadoTarefa =
  | { status: 'sucesso'; itens: number }
  | { status: 'erro'; erro: string }
  | { status: 'desligada' };

// Roda as tarefas uma a uma. Uma tarefa que lança erro é registrada e não interrompe as demais. Se o próprio
// registro falhar, o ciclo segue mesmo assim.
export async function executarCiclo(
  tarefas: Record<string, () => Promise<number | null>>,
  registrar: (nome: string, status: 'sucesso' | 'erro', itens?: number, erro?: string) => Promise<void>,
): Promise<Record<string, ResultadoTarefa>> {
  const resultados: Record<string, ResultadoTarefa> = {};
  for (const [nome, fn] of Object.entries(tarefas)) {
    try {
      const itens = await fn();
      if (itens === null) {
        resultados[nome] = { status: 'desligada' };
        continue;
      }
      resultados[nome] = { status: 'sucesso', itens };
      await registrar(nome, 'sucesso', itens);
    } catch (e: any) {
      const erro = String(e?.message || e);
      resultados[nome] = { status: 'erro', erro };
      try {
        await registrar(nome, 'erro', undefined, erro);
      } catch {
        // o registro falhou: o ciclo segue
      }
    }
  }
  return resultados;
}
