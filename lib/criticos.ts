// Membros críticos por produto na página do CS (07/10/2026). Funções puras. Produto é o nível do
// conselho do membro, com Setorial exibido como Executivo (mesma regra do dashboard). Percentuais
// em décimos de ponto percentual inteiros: 150 significa 15,0 por cento.
// Roda com: node --experimental-strip-types tests/criticos.test.ts
import { NIVEL_ORDEM } from './constants.ts';
import { percentualCriticosDecimos } from './indicadores-base.ts';

export function nivelExibicao(nivel: string | null | undefined): string {
  const n = String(nivel || '').trim();
  if (!n) return 'Sem produto';
  return n === 'Setorial' ? 'Executivo' : n;
}

// Percentual em décimos: definição única em indicadores-base.ts (base zero ou críticos acima da
// base devolvem null, nunca zero).
export { percentualCriticosDecimos };

export type LinhaProduto = { produto: string; criticos: number; membros: number; percentualDecimos: number | null };

// criticosPorNivel e membrosPorNivel são contagens por nível bruto do título do conselho. Produtos
// são somas dos mesmos membros: o total do CS é a soma das linhas, nunca outro número.
export function consolidarCriticosPorProduto(
  criticosPorNivel: Record<string, number>, membrosPorNivel: Record<string, number>,
): { linhas: LinhaProduto[]; total: { criticos: number; membros: number; percentualDecimos: number | null } } {
  const crit: Record<string, number> = {}, memb: Record<string, number> = {};
  Object.keys(criticosPorNivel).forEach((n) => { const p = nivelExibicao(n); crit[p] = (crit[p] || 0) + criticosPorNivel[n]; });
  Object.keys(membrosPorNivel).forEach((n) => { const p = nivelExibicao(n); memb[p] = (memb[p] || 0) + membrosPorNivel[n]; });
  const produtos = Array.from(new Set([...Object.keys(crit), ...Object.keys(memb)]));
  const ordem = (p: string) => { const i = NIVEL_ORDEM.indexOf(p); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
  produtos.sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b, 'pt-BR'));
  const linhas = produtos.map((produto) => {
    const criticos = crit[produto] || 0, membros = memb[produto] || 0;
    return { produto, criticos, membros, percentualDecimos: percentualCriticosDecimos(criticos, membros) };
  });
  const criticos = linhas.reduce((s, l) => s + l.criticos, 0);
  const membros = linhas.reduce((s, l) => s + l.membros, 0);
  return { linhas, total: { criticos, membros, percentualDecimos: percentualCriticosDecimos(criticos, membros) } };
}
