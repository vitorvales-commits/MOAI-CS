import type { SupabaseClient } from '@supabase/supabase-js';

// O PostgREST corta toda resposta em 1000 linhas sem erro (Max Rows). Estes helpers paginam com range()
// e lançam erro explícito ao atingir o limite de páginas, para que volume nunca mais seja silencioso.
export const TAMANHO_PAGINA = 1000;
export type OpcoesPaginar = { tamanhoPagina?: number; maxPaginas?: number };
type Pagina = PromiseLike<{ data: any[] | null; error: { message: string } | null }>;

async function paginar(nome: string, buscar: (de: number, ate: number) => Pagina, o: OpcoesPaginar = {}): Promise<any[]> {
  const tam = o.tamanhoPagina ?? TAMANHO_PAGINA;
  const max = o.maxPaginas ?? 50;
  const linhas: any[] = [];
  for (let p = 0; p < max; p++) {
    const { data, error } = await buscar(p * tam, p * tam + tam - 1);
    if (error) throw new Error(`Erro ao buscar ${nome}: ${error.message}`);
    const pagina = data || [];
    linhas.push(...pagina);
    if (pagina.length < tam) return linhas;
  }
  throw new Error(`Limite de ${max} páginas de ${tam} linhas atingido em ${nome}: volume maior que o esperado`);
}

export function rpcPaginado(sb: SupabaseClient, nomeFuncao: string, argumentos: Record<string, unknown>, opcoes?: OpcoesPaginar) {
  return paginar(nomeFuncao, (de, ate) => sb.rpc(nomeFuncao, argumentos).range(de, ate) as unknown as Pagina, opcoes);
}

// construtor devolve a consulta de tabela (já com .from().select() e filtros); o helper aplica o range.
export function selectPaginado(construtor: () => { range: (de: number, ate: number) => Pagina }, opcoes?: OpcoesPaginar & { nome?: string }) {
  return paginar(opcoes?.nome ?? 'consulta de tabela', (de, ate) => construtor().range(de, ate), opcoes);
}
