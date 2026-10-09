// Polaridade de um trecho da voz do membro (revisão out/2026, N1). As perguntas abertas do NPS são
// separadas por assunto (sobre o conselho ou sobre o CS), não por polaridade. Por isso a polaridade vem
// da nota de quem escreveu: 9 e 10 são elogio, de 0 a 6 são crítica, e 7 e 8 entram em crítica com o
// rótulo "neutro" no trecho, para não tratar uma nota intermediária como elogio.
export type Polaridade = 'elogio' | 'critica';

export interface RotuloPolaridade {
  polaridade: Polaridade;
  // Só 7 e 8 têm rótulo; nos demais o campo é null.
  rotulo: 'neutro' | null;
}

export function polaridadeDaNota(nota: number | null | undefined): RotuloPolaridade | null {
  if (nota === null || nota === undefined || Number.isNaN(nota)) return null;
  if (nota >= 9) return { polaridade: 'elogio', rotulo: null };
  if (nota >= 7) return { polaridade: 'critica', rotulo: 'neutro' };
  return { polaridade: 'critica', rotulo: null };
}
