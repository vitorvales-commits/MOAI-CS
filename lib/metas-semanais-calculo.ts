// Cálculo puro das metas semanais (05/11/2026, fase 2). Sem banco e sem relógio: quem busca a meta mensal,
// os overrides, o calendário e o realizado congelado é o wrapper de lib/metas-semanais.ts.
//
// Decisões (pedido de 05/11/2026):
//   D2  peso da semana = dias úteis da parcela do mês (lib/semanas.ts)
//   D3  o déficit de uma semana vai inteiro para a seguinte do mesmo mês
//   D4  editar uma semana faz as não editadas do mês se reequilibrarem para fechar a meta mensal
//   P1  déficit não atravessa o mês: a primeira parcela de cada mês não recebe déficit de outro mês
//   P2  superávit não reduz a semana seguinte
//   P3  o déficit usa o realizado congelado no fechamento da semana anterior, então a meta efetiva não muda
//       no meio da semana
//
// Unidade: meta de indicador de crescimento, contagem inteira. Meta mensal não inteira é recusada.
import type { SemanaDoMes } from './semanas.ts';

export interface EntradaMesMetas {
  metaMensal: number | null; // meta mensal do CS no indicador; null quando não há meta cadastrada
  semanas: SemanaDoMes[]; // semanas do mês em ordem, cada uma com a parcela de dias úteis desse mês
  overrides: Record<string, number>; // semana (inicio) -> valor manual; só exceções
  // semana (inicio) -> realizado congelado no fechamento. Ausente quando a semana ainda não fechou.
  realizadoCongelado: Record<string, number | null | undefined>;
}

export interface SemanaMeta {
  inicio: string;
  fim: string;
  base: number | null; // null sem meta mensal
  manual: boolean; // true quando a base vem de override
  deficitRecebido: number | null; // null quando a semana anterior do mês não tem realizado congelado (ausência, não zero)
  metaEfetiva: number | null; // null sem meta mensal ou com semana anterior sem realizado
  realizado: number | null; // congelado; null quando a semana ainda não fechou
  // déficit que esta semana transfere para a próxima do mês. Só existe quando a semana fechou.
  deficitTransferido: number | null;
  excedeMeta: boolean; // true quando a soma dos overrides do mês passa da meta mensal (aviso da tela)
}

const inteiro = (n: number) => Number.isInteger(n);

// Distribui metaMensal entre as semanas não editadas, proporcionalmente aos dias úteis, com arredondamento
// por maior resto para a soma fechar exatamente. Semanas editadas mantêm o valor manual.
export function distribuirBase(metaMensal: number, semanas: SemanaDoMes[], overrides: Record<string, number>): { valores: number[]; manual: boolean[]; excedeMeta: boolean } {
  if (!inteiro(metaMensal)) throw new Error(`meta mensal precisa ser inteira (recebido ${metaMensal})`);
  const manual = semanas.map((s) => Object.prototype.hasOwnProperty.call(overrides, s.inicio));
  const valorManual = semanas.map((s, i) => (manual[i] ? overrides[s.inicio] : 0));
  const somaManual = valorManual.reduce((t, v) => t + v, 0);
  if (somaManual >= metaMensal) {
    // Override que passa da meta: as demais ficam com zero e o aviso vai para a tela.
    return { valores: semanas.map((_, i) => valorManual[i]), manual, excedeMeta: somaManual > metaMensal };
  }
  const restante = metaMensal - somaManual;
  const pesoTotal = semanas.reduce((t, s, i) => t + (manual[i] ? 0 : s.diasUteis), 0);
  // Sem nenhum dia útil livre (todas as semanas editadas), o restante não tem onde cair; a soma fica abaixo
  // da meta e o aviso de excedeMeta não se aplica. Aqui não ocorre com meta válida, mas o caso não pode
  // inventar valor.
  if (pesoTotal === 0) return { valores: valorManual, manual, excedeMeta: false };
  const ideais = semanas.map((s, i) => (manual[i] ? 0 : (restante * s.diasUteis) / pesoTotal));
  const base = ideais.map((x) => Math.floor(x));
  let faltam = restante - base.reduce((t, x) => t + x, 0);
  const ordem = ideais
    .map((x, i) => ({ i, resto: x - Math.floor(x), livre: !manual[i] }))
    .filter((o) => o.livre)
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (let k = 0; faltam > 0 && k < ordem.length; k++, faltam--) base[ordem[k].i] += 1;
  return { valores: semanas.map((_, i) => (manual[i] ? valorManual[i] : base[i])), manual, excedeMeta: false };
}

// Metas efetivas das semanas de um mês. Chamado uma vez por mês: o encadeamento de déficit não passa de um
// mês para o outro (P1), porque cada mês começa com deficitRecebido zero.
export function metasSemanaisDoMes(e: EntradaMesMetas): SemanaMeta[] {
  const { metaMensal, semanas } = e;
  if (metaMensal === null || metaMensal === undefined) {
    return semanas.map((s) => ({
      inicio: s.inicio, fim: s.fim, base: null, manual: false, deficitRecebido: null, metaEfetiva: null,
      realizado: pegaRealizado(e, s.inicio), deficitTransferido: null, excedeMeta: false,
    }));
  }
  const dist = distribuirBase(metaMensal, semanas, e.overrides);
  const saida: SemanaMeta[] = [];
  // Anterior: meta efetiva e realizado congelado da semana anterior do mesmo mês. Null quando a semana anterior
  // não tem um dos dois (ausência propaga, não vira zero).
  let anterior: { efetiva: number | null; realizado: number | null } | null = null;
  semanas.forEach((s, i) => {
    const base = dist.valores[i];
    let deficitRecebido: number | null = 0;
    if (anterior) {
      deficitRecebido = anterior.efetiva === null || anterior.realizado === null
        ? null
        : Math.max(0, anterior.efetiva - anterior.realizado);
    }
    const metaEfetiva = deficitRecebido === null ? null : base + deficitRecebido;
    const realizado = pegaRealizado(e, s.inicio);
    const deficitTransferido = metaEfetiva !== null && realizado !== null ? Math.max(0, metaEfetiva - realizado) : null;
    saida.push({
      inicio: s.inicio, fim: s.fim, base, manual: dist.manual[i], deficitRecebido, metaEfetiva,
      realizado, deficitTransferido, excedeMeta: dist.excedeMeta,
    });
    anterior = { efetiva: metaEfetiva, realizado };
  });
  return saida;
}

function pegaRealizado(e: EntradaMesMetas, inicio: string): number | null {
  const v = e.realizadoCongelado[inicio];
  return v === null || v === undefined ? null : v;
}
