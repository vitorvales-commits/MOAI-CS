// Composição da carteira por produto e regra de piso do Revenue Churn (02/11/2026). Funções puras.
//
// Por que existe: Revenue Churn é medido em reais e cada churn custa o MRR do produto do membro que saiu.
// Uma meta de receita menor que o MRR do produto mais barato da carteira equivale a não aceitar nenhum
// churn sem dizer isso; para a Luana, com um único conselho C-Level+, qualquer meta abaixo de R$ 2.497 é
// impossível de cumprir com um churn e inútil sem churn. Por isso:
//   piso   = MRR do produto mais barato presente na carteira do CS
//   médio  = MRR médio da carteira, ponderado pelos membros de cada produto
//   meta   = máximo entre o piso e (meta de churn em quantidade vezes o MRR médio)
// A mesma regra serve para a sugestão (lib/metas-sugestao.ts) e para a validação da matriz de metas.
import { PRODUCT_PRICES } from './constants.ts';

export interface ProdutoCarteira { produto: string; conselhos: number; membros: number; mrr: number }

const chaveProduto = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, '');
const PRECO_POR_CHAVE = new Map(Object.entries(PRODUCT_PRICES).map(([k, v]) => [chaveProduto(k), v]));

// MRR mensal do produto pelo nome que aparece no título do grupo ("C-Level+") ou no board de churn
// ("C-Level +"). null para produto sem preço (Setorial, Comunidade).
export function mrrDoProduto(produto: string | null | undefined): number | null {
  if (!produto) return null;
  return PRECO_POR_CHAVE.get(chaveProduto(produto)) ?? null;
}

// Agrupa os conselhos da carteira por produto. Conselho sem produto com preço fica fora (não define piso).
export function composicaoCarteira(conselhos: { produto: string | null | undefined; membros: number }[]): ProdutoCarteira[] {
  const porProduto = new Map<string, ProdutoCarteira>();
  conselhos.forEach((c) => {
    const mrr = mrrDoProduto(c.produto);
    if (mrr === null || !c.produto) return;
    const atual = porProduto.get(c.produto) || { produto: c.produto, conselhos: 0, membros: 0, mrr };
    atual.conselhos += 1; atual.membros += Math.max(0, Number(c.membros) || 0);
    porProduto.set(c.produto, atual);
  });
  return [...porProduto.values()].sort((a, b) => a.mrr - b.mrr);
}

export function pisoRevenueChurn(comp: ProdutoCarteira[]): number | null {
  return comp.length ? Math.min(...comp.map((p) => p.mrr)) : null;
}

// Média ponderada por membros; sem membros cadastrados, média simples dos conselhos.
export function mrrMedioCarteira(comp: ProdutoCarteira[]): number | null {
  if (!comp.length) return null;
  const membros = comp.reduce((s, p) => s + p.membros, 0);
  if (membros > 0) return comp.reduce((s, p) => s + p.membros * p.mrr, 0) / membros;
  const conselhos = comp.reduce((s, p) => s + p.conselhos, 0);
  return comp.reduce((s, p) => s + p.conselhos * p.mrr, 0) / conselhos;
}

const reais = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
export const formatarReais = reais;

export interface MetaRevenue { valor: number | null; piso: number | null; mrrMedio: number | null; explicacao: string }

// Meta de Revenue Churn para uma carteira, dada a meta de churn em quantidade (sugerida ou vigente).
export function metaRevenueChurn(comp: ProdutoCarteira[], metaChurnQtd: number | null): MetaRevenue {
  const piso = pisoRevenueChurn(comp);
  const medio = mrrMedioCarteira(comp);
  if (piso === null || medio === null) {
    return { valor: null, piso: null, mrrMedio: null, explicacao: 'Sem conselho com produto precificado na carteira: não há como calcular a meta em reais.' };
  }
  const resumo = comp.map((p) => `${p.conselhos} ${p.produto} (${reais(p.mrr)})`).join(', ');
  const qtd = metaChurnQtd !== null && metaChurnQtd !== undefined && metaChurnQtd > 0 ? metaChurnQtd : 0;
  const porQtd = qtd * medio;
  const valor = Math.round(Math.max(piso, porQtd));
  const partes = [`Carteira: ${resumo}. MRR médio por membro ${reais(medio)}.`];
  if (qtd > 0) partes.push(`Limite de churn ${qtd} vezes ${reais(medio)} dá ${reais(porQtd)}.`);
  else partes.push('Sem limite de churn em quantidade.');
  partes.push(valor === piso && porQtd < piso
    ? `Fica no piso de ${reais(piso)}, o MRR do produto mais barato da carteira: abaixo disso a meta não comporta nem um churn.`
    : `Meta ${reais(valor)}.`);
  return { valor, piso, mrrMedio: medio, explicacao: partes.join(' ') };
}
