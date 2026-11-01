// Decisão pura da trava de sanidade dos prunes (normativa de dados, etapa 6, 01/11/2026). Não acessa o banco
// nem a API: recebe os números e devolve se o prune pode rodar e, se não puder, o motivo para sync_log.
// A regra vem do prompt de normativa: a leitura do Monday precisa confirmar pelo menos 80% das linhas
// existentes, e um prune não pode remover mais de 50 linhas de uma vez.

export const LIMITE_PRESENCA_PRUNE = 0.8;
export const LIMITE_REMOCAO_PRUNE = 50;

export type DecisaoPrune = { pode: true } | { pode: false; motivo: string };

export function decidirPrune(existentes: number, confirmadas: number, orfaos: number): DecisaoPrune {
  const minimo = Math.ceil(existentes * LIMITE_PRESENCA_PRUNE);
  if (confirmadas < minimo) {
    return {
      pode: false,
      motivo: `a leitura do Monday confirmou ${confirmadas} de ${existentes} linha(s) existentes (mínimo ${minimo}); nada foi removido`,
    };
  }
  if (orfaos > LIMITE_REMOCAO_PRUNE) {
    return {
      pode: false,
      motivo: `${orfaos} linha(s) sairiam de uma vez (limite ${LIMITE_REMOCAO_PRUNE}); nada foi removido`,
    };
  }
  return { pode: true };
}
