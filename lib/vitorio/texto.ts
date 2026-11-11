// Normalização e medidas de texto do pipeline do Vitorio. Puro.
// Mesma regra de lib/consulta.ts normalizar (sem acento, minúscula), com pontuação trocada por espaço.

export function normalizarTexto(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokens sem palavras de ligação; o classificador e as entidades comparam só o conteúdo.
const VAZIAS = new Set(['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'pra', 'para', 'pro', 'e', 'um', 'uma', 'que', 'qual', 'quais', 'quem', 'foi', 'era', 'eram', 'ser', 'sao', 'é', 'e']);

export function tokens(t: string): string[] {
  return normalizarTexto(t).split(' ').filter((x) => x && !VAZIAS.has(x));
}

export function trigramas(s: string): Set<string> {
  const p = `  ${normalizarTexto(s)} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  return out;
}

// Fração dos trigramas de `alvo` que aparecem em `texto` (1 = todo o alvo está no texto).
export function contencao(alvo: string, texto: string): number {
  const a = trigramas(alvo);
  if (!a.size) return 0;
  const b = trigramas(texto);
  let n = 0;
  a.forEach((g) => { if (b.has(g)) n++; });
  return n / a.size;
}

// Distância de Levenshtein, para erros de digitação em nomes curtos.
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
