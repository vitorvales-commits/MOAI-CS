// Classificador de intenção do Vitorio (determinístico, sem IA). Puro.
// Ordem de decisão (regras gerais, sem casos pontuais):
//   1. Assunto fora do escopo do B1 (NPS, relatório, churn, meta...): sem intenção.
//   2. Conselho reconhecido na pergunta: só carteira, e só com sinal de "quem cuida" (cuida, responsável,
//      de quem é, CS do/da, tá com...). Com palavra de outro assunto (quantos, membros, quando, reunião...)
//      ou sem sinal de "quem cuida", sem intenção. Nunca elenco.
//   3. CS como sujeito, sem conselho ("quais conselhos o X cuida"): sem intenção.
//   4. "cs" com verbo de lista ou membros, sem conselho: elenco (período padrão é o mês corrente).
//   5. Sem conselho nem CS: pontuação por frases exemplo, com limiar.
import { tokens, levenshtein, normalizarTexto } from './texto.ts';

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

// Assuntos que ainda não estão no B1: sem intenção em qualquer caso.
const FORA_DO_ESCOPO = new Set(['nps', 'relatorio', 'report', 'churn', 'meta', 'metas', 'pontuacao', 'bonus', 'pontos', 'gtd', 'upsell']);

// Palavras de outro assunto que, junto de um conselho, impedem carteira (quantos membros, quando é a próxima reunião...).
const OUTRO_ASSUNTO_COM_CONSELHO = new Set(['quantos', 'quantas', 'membros', 'membro', 'nota', 'quando', 'proximo', 'proxima', 'proximos', 'encontro', 'encontros', 'reuniao', 'reunioes', 'agenda']);

// Sinal de "quem cuida" (equivalentes de cuidar, responsável, de quem é, CS do/da, tá com quem).
const SINAL_QUEM_CUIDA = /\b(cuida|cuidava|cuidou|cuidam|cuidar|responsavel|responsaveis|atende|atendia|atendeu|toma conta|ta com|esta com|estava com|estavam com|de quem|cs do|cs da|do cs|da cs|carteira)\b/;

// Verbo de lista ou de membros, com "cs" e sem conselho: elenco.
const VERBO_DE_LISTA = /\b(sao|membros|time|equipe|lista|quantos|quantas|parte)\b/;

export interface Classificacao { intencao: Intencao | null; confianca: number }

export interface Sinais {
  temConselho: boolean;
  temData: boolean;
  temCs: boolean;
}

// 0,6: com um termo em comum só, a pergunta não é classificada ("quem é o cs mais bonito" fica sem intenção).
const LIMIAR = 0.6;

export function classificar(texto: string, sinais: Sinais = { temConselho: false, temData: false, temCs: false }): Classificacao {
  const lista = tokens(texto);
  const norm = normalizarTexto(texto);
  const palavras = new Set(norm.split(' '));
  if (!lista.length) return { intencao: null, confianca: 0 };
  if (lista.some((t) => FORA_DO_ESCOPO.has(t))) return { intencao: null, confianca: 0 };

  // Regra 2: conselho reconhecido manda. Carteira só com sinal de "quem cuida" e sem outro assunto.
  if (sinais.temConselho) {
    if ([...palavras].some((p) => OUTRO_ASSUNTO_COM_CONSELHO.has(p))) return { intencao: null, confianca: 0 };
    if (!SINAL_QUEM_CUIDA.test(norm)) return { intencao: null, confianca: 0 };
    return { intencao: 'carteira', confianca: 0.6 };
  }

  // Regra 3: CS como sujeito, sem conselho, não recebe carteira nem elenco nesta etapa.
  if (sinais.temCs) return { intencao: null, confianca: 0 };

  // Regra 4: "cs" com verbo de lista ou membros, sem conselho: elenco do período indicado ou do mês corrente.
  if (palavras.has('cs') && VERBO_DE_LISTA.test(norm)) return { intencao: 'elenco', confianca: 0.6 };

  // Regra 5: pontuação por frases exemplo, com tolerância a erro de digitação em palavras longas.
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
  if (sinais.temData && palavras.has('cs')) {
    const confianca = Math.max(melhorDe.elenco, LIMIAR);
    return { intencao: 'elenco', confianca };
  }
  const escolhida: Intencao = melhorDe.carteira > melhorDe.elenco ? 'carteira' : 'elenco';
  const confianca = melhorDe[escolhida];
  if (confianca < LIMIAR) return { intencao: null, confianca };
  return { intencao: escolhida, confianca };
}
