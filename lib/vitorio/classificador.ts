// Classificador de intenção do Vitorio (determinístico, sem IA). Puro.
// Cada intenção tem frases exemplo. A confiança é a fração dos termos de um exemplo que aparecem na pergunta
// (máximo sobre os exemplos). Sinais estruturais, com entidades já extraídas, ajustam a decisão:
//   - conselho reconhecido na pergunta é carteira (mesmo que a frase tenha "cs");
//   - "cs" com mês ou data, sem conselho, é elenco.
// Abaixo do limiar, não há intenção: a rota segue para a busca de processos.
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
    'quantos cs tem',
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

// Assuntos que ainda não estão no B1 (NPS, relatórios, churn, metas, pontos, bônus, GTD, upsell): sem intenção.
const FORA_DO_ESCOPO = new Set(['nps', 'relatorio', 'report', 'churn', 'meta', 'metas', 'pontuacao', 'bonus', 'pontos', 'gtd', 'upsell']);

export interface Classificacao { intencao: Intencao | null; confianca: number }
export interface Sinais { temData: boolean; temConselho: boolean }

// 0,6: com um termo em comum só, a pergunta não é classificada ("quem é o cs mais bonito" fica sem intenção).
const LIMIAR = 0.6;

export function classificar(texto: string, sinais: Sinais = { temData: false, temConselho: false }): Classificacao {
  const lista = tokens(texto);
  if (!lista.length) return { intencao: null, confianca: 0 };
  if (lista.some((t) => FORA_DO_ESCOPO.has(t))) return { intencao: null, confianca: 0 };

  // Termo casa exato, ou com um erro de digitação quando tem cinco letras ou mais ("setmbro" casa com "setembro").
  const casa = (termo: string) => lista.some((p) => p === termo || (termo.length >= 5 && p.length >= 5 && levenshtein(p, termo) <= 1));
  const melhorDe: Record<Intencao, number> = { elenco: 0, carteira: 0 };
  (Object.keys(EXEMPLOS) as Intencao[]).forEach((intencao) => {
    EXEMPLOS[intencao].forEach((ex) => {
      const termos = tokens(ex);
      const comuns = termos.filter((t) => casa(t)).length;
      if (!comuns) return;
      melhorDe[intencao] = Math.max(melhorDe[intencao], comuns / termos.length);
    });
  });

  let intencao: Intencao | null = null;
  let confianca = 0;
  if (sinais.temConselho) {
    intencao = 'carteira';
    confianca = Math.max(melhorDe.carteira, LIMIAR);
  } else if (sinais.temData && lista.includes('cs')) {
    intencao = 'elenco';
    confianca = Math.max(melhorDe.elenco, LIMIAR);
  } else {
    const escolhida: Intencao = melhorDe.carteira > melhorDe.elenco ? 'carteira' : 'elenco';
    intencao = escolhida;
    confianca = melhorDe[escolhida];
  }
  if (confianca < LIMIAR) return { intencao: null, confianca };
  return { intencao, confianca };
}
