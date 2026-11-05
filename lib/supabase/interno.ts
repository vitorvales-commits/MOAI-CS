// Exceção de middleware para a rota interna de fechamento de metas semanais (05/11/2026). Módulo puro, sem
// dependência de Next nem de Node, para ser testado. Uso: lib/supabase/middleware.ts decide antes do gate de sessão.
//
// Regras:
//   - Só o caminho exato CAMINHO_FECHAMENTO é tratado aqui. Qualquer outro caminho cai no gate normal.
//   - Nesse caminho só POST pode passar, e só com o cabeçalho igual a METAS_FECHAMENTO_SECRET.
//   - Falha fechada: variável ausente, cabeçalho ausente, método diferente ou segredo errado dão 'negar'.
//
// A comparação é em tempo constante. No Edge runtime do middleware (Next 14) não há timingSafeEqual do
// node:crypto, então a comparação é feita caractere a caractere, sem parar no primeiro erro.
export const CAMINHO_FECHAMENTO = '/api/interno/metas-semanais/fechar';
export const CABECALHO_SEGREDO = 'x-metas-secret';

export type DecisaoInterna = 'normal' | 'liberar' | 'negar';

export function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

export function decidirRotaInterna(
  metodo: string,
  caminho: string,
  cabecalho: string | null | undefined,
  segredoEsperado: string | null | undefined,
): DecisaoInterna {
  if (caminho !== CAMINHO_FECHAMENTO) return 'normal';
  if (metodo !== 'POST') return 'negar';
  if (!segredoEsperado || !cabecalho) return 'negar';
  return iguaisEmTempoConstante(cabecalho, segredoEsperado) ? 'liberar' : 'negar';
}
