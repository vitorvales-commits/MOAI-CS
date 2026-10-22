// Regras puras da aba Conselhos (gestor) e da grade de Meus conselhos (CS). A grade em si vem de
// montarGradeConselhos (lib/reports.ts); aqui ficam só a frase de situação e o filtro por CS, para o
// cliente nunca recontar nada.

export type CardConselho = {
  csResponsavel: string;
  congelado: boolean;
  atencao: boolean;
  proximaData: string | null;
  proximaDataEhFutura: boolean;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Mesma regra de dono do restante do sistema: o CS é o que está entre parênteses no título do grupo.
export function filtrarCardsPorCS<T extends { csResponsavel: string }>(cards: T[], apelidoCS: string | null): T[] {
  if (!apelidoCS) return [];
  const alvo = norm(apelidoCS);
  return cards.filter((c) => norm(c.csResponsavel) === alvo);
}

export function resumoSituacao(cards: CardConselho[]) {
  const ativos = cards.filter((c) => !c.congelado);
  return {
    ativos: ativos.length,
    atencao: ativos.filter((c) => c.atencao).length,
    semProximo: ativos.filter((c) => !(c.proximaData && c.proximaDataEhFutura)).length,
  };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function fraseSituacaoConselhos(cards: CardConselho[]): string {
  const r = resumoSituacao(cards);
  if (r.ativos === 0) return 'Nenhum conselho ativo encontrado para este recorte.';
  const partes = [`${plural(r.ativos, 'conselho ativo', 'conselhos ativos')}`];
  partes.push(r.atencao === 0 ? 'nenhum com selo Atenção' : `${r.atencao} com selo Atenção`);
  partes.push(r.semProximo === 0 ? 'todos com próximo encontro na agenda' : `${plural(r.semProximo, 'sem próximo encontro na agenda', 'sem próximo encontro na agenda')}`);
  return partes[0] + ', ' + partes[1] + ' e ' + partes[2] + '.';
}
