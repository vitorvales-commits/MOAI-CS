// Classificador de intenção do Vitorio (determinístico, sem IA). Puro.
// Cada intenção tem frases exemplo. A confiança é a fração dos termos de um exemplo que aparecem na pergunta
// (máximo sobre os exemplos). Abaixo do limiar, não há intenção: a rota segue para a busca de processos.
import { tokens, levenshtein } from './texto.ts';

export type Intencao = 'elenco' | 'carteira';

export const EXEMPLOS: Record<Intencao, string[]> = {
  elenco: [
    'quem era cs em setembro',
    'quem eram os cs em setembro de 2026',
    'quem foi cs no mes passado',
    'quais cs tinha em outubro',
    'quem sao os cs deste mes',
    'quem era o cs em agosto',
    'cs de setembro',
    'time de cs em setembro',
    'quem eram os cs esse mes',
    'quais os cs do mes passado',
    'quem era cs hoje',
    'quem era cs ontem',
  ],
  carteira: [
    'quem cuida do conselho',
    'quem cuidava do conselho em setembro',
    'quem era responsavel pelo conselho em 05/11',
    'quem cuida do conselho em 05/11/2026',
    'quem estava com o conselho no dia 05/11',
    'carteira do conselho em novembro',
    'de quem e o conselho hoje',
    'quem cuidou do conselho ontem',
  ],
};

export interface Classificacao { intencao: Intencao | null; confianca: number }

// 0,6: com um termo em comum só, a pergunta não é classificada ("quem é o cs mais bonito" fica sem intenção).
const LIMIAR = 0.6;

// Sinais estruturais (entidades já extraídas): "cs" com um mês ou data é elenco; "conselho" com conselho ou data é carteira.
// Cada sinal leva a confiança a 0,6, o mínimo para classificar, sem substituir a semelhança com os exemplos.
export interface Sinais { temData: boolean; temConselho: boolean }

export function classificar(texto: string, sinais: Sinais = { temData: false, temConselho: false }): Classificacao {
  const lista = tokens(texto);
  if (!lista.length) return { intencao: null, confianca: 0 };
  // Termo casa exato, ou com um erro de digitação quando tem cinco letras ou mais ("setmbro" casa com "setembro").
  const casa = (termo: string) => lista.some((p) => p === termo || (termo.length >= 5 && p.length >= 5 && levenshtein(p, termo) <= 1));
  let melhor: Classificacao = { intencao: null, confianca: 0 };
  (Object.keys(EXEMPLOS) as Intencao[]).forEach((intencao) => {
    EXEMPLOS[intencao].forEach((ex) => {
      const termos = tokens(ex);
      const comuns = termos.filter((t) => casa(t)).length;
      if (!comuns) return;
      const score = comuns / termos.length;
      if (score > melhor.confianca) melhor = { intencao, confianca: score };
    });
  });
  const temCs = lista.includes('cs');
  const temConselhoPalavra = lista.some((t) => t === 'conselho' || (t.length >= 5 && levenshtein(t, 'conselho') <= 1));
  if (sinais.temData && temCs && melhor.confianca < 0.6 && melhor.intencao !== 'carteira') melhor = { intencao: 'elenco', confianca: 0.6 };
  if ((sinais.temData || sinais.temConselho) && temConselhoPalavra && melhor.confianca < 0.6) melhor = { intencao: 'carteira', confianca: 0.6 };
  if (melhor.confianca < LIMIAR) return { intencao: null, confianca: melhor.confianca };
  return melhor;
}
