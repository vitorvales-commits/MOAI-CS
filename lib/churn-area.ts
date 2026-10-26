// Churn da área (26/10/2026): uma única definição para a contagem e o revenue churn dos cards de
// retenção da home e da aba Indicadores.
//
// Causa raiz corrigida: o card de churn do time vinha de churn_total_carteira (base carteira_atual,
// só cs_categoria = cs_ativo), enquanto o revenue churn somava os CS de cs_config. Quando um CS sai e
// a carteira passa para outra pessoa (Marcos para Iasmin em 22/10/2026), os churns dele mudam para
// cs_ex e sumiam da contagem do mês de forma retroativa, mas continuavam no revenue churn. Em outubro
// o card mostrava 8 de 10 quando a área tinha 10.
//
// Regra: no nível da área, o evento pertence à área, nunca ao status atual de quem o registrou. Entra
// todo churn de membro com CS identificado (ativo ou ex CS), fora a Comunidade e os registros sem CS
// (nao_cs, nao_informado, nao_classificado). A data é a mesma da tela de churn: data_referencia, que é
// a data do Monday ou, sem ela, o dia de criação do item. A visão "Carteira atual" da tela de churn
// continua existindo como recorte próprio; ela responde a outra pergunta (o histórico do time de hoje).
import { PRODUCT_PRICES } from './constants';

export const CATEGORIAS_CHURN_AREA = ['cs_ativo', 'cs_ex'] as const;

export interface LinhaChurnArea {
  cs_categoria?: string | null;
  eh_comunidade?: boolean | null;
  data_referencia?: string | null;
  data?: string | null;
  produto?: string | null;
}

export interface ChurnArea {
  qtd: number;
  receita: number;
  porProduto: { produto: string; qtd: number; valorAprox: number | null }[];
}

export function dataChurn(r: LinhaChurnArea): string | null {
  return (r.data_referencia || r.data || null) as string | null;
}

export function ehChurnDaArea(r: LinhaChurnArea): boolean {
  if (r.eh_comunidade) return false;
  return (CATEGORIAS_CHURN_AREA as readonly string[]).includes(String(r.cs_categoria || ''));
}

// Limites inclusivos no formato AAAA-MM-DD, os mesmos de periodoDatas.
export function churnDaArea(rows: LinhaChurnArea[], inicio: string, fim: string): ChurnArea {
  let qtd = 0, receita = 0;
  const porProduto = new Map<string, number>();
  rows.forEach((r) => {
    if (!ehChurnDaArea(r)) return;
    const d = dataChurn(r);
    if (!d || d < inicio || d > fim) return;
    qtd++;
    const produto = String(r.produto || '');
    const preco = PRODUCT_PRICES[produto];
    if (preco) receita += preco;
    porProduto.set(produto, (porProduto.get(produto) || 0) + 1);
  });
  return {
    qtd,
    receita,
    porProduto: Array.from(porProduto.entries())
      .map(([produto, n]) => ({ produto, qtd: n, valorAprox: PRODUCT_PRICES[produto] ?? null }))
      .sort((a, b) => b.qtd - a.qtd),
  };
}
