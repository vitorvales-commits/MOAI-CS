// Tolerância da leitura do bônus enquanto a migração 20261110a não existe no banco (ou numa versão antiga).
// Só a ausência da função ou da tabela vira "sem bônus": qualquer outro erro continua sendo lançado, para não
// esconder falha de permissão, de rede ou de dados. Função pura, sem banco, para o teste rodar sozinho.

export type ErroBanco = { code?: string | null; message?: string | null } | null | undefined;

// PGRST202: função não está no cache do PostgREST. PGRST205: tabela não está no cache.
// 42883: undefined_function. 42P01: undefined_table. "does not exist" cobre a mensagem do Postgres nos casos acima.
const CODIGOS_AUSENCIA = new Set(['PGRST202', 'PGRST205', '42883', '42P01']);

export function ehAusenciaDoBonus(erro: ErroBanco): boolean {
  if (!erro) return false;
  if (erro.code && CODIGOS_AUSENCIA.has(erro.code)) return true;
  return /does not exist/i.test(erro.message ?? '');
}

// Para uma leitura do bônus: false quando não houve erro; true (com aviso no log) quando a função ou a tabela
// ainda não existe, e então quem chama devolve vazio; lança nos demais erros. `leitura` só vai para a mensagem.
export function ausenteOuLanca(erro: ErroBanco, leitura: string): boolean {
  if (!erro) return false;
  if (ehAusenciaDoBonus(erro)) {
    console.warn(`[bônus] ${leitura}: função ou tabela ausente (${erro.code ?? 'sem código'}); tratando como sem bônus. ${erro.message ?? ''}`);
    return true;
  }
  throw new Error(`Erro ao buscar ${leitura}: ${erro.message ?? String(erro)}`);
}
