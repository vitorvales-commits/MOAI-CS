// Ação sugerida por motivo de saída (revisão out/2026, K4). As chaves são os motivos que existem em
// churn_items.motivo_principal (ver MOTIVOS em lib/churn.ts). Só entram aqui os motivos com correspondência
// clara com a lista da especificação. Os demais caem em ACAO_MOTIVO_PADRAO e ficam registrados em decisoes.md.
export const ACOES_POR_MOTIVO: Record<string, string> = {
  falta_de_tempo: 'Oferecer formato reduzido ou pausa da fidelidade antes do cancelamento',
  financeiro: 'Apresentar plano alternativo e o custo da multa de fidelidade',
};

export const ACAO_MOTIVO_PADRAO = 'Definir ação com o time';

export function acaoParaMotivo(chave: string): string {
  return ACOES_POR_MOTIVO[chave] ?? ACAO_MOTIVO_PADRAO;
}
