// Sugestões do NPS (revisão out/2026, rodada 2, Fase 7). Funções puras, testadas em tests/voz-sugestoes.test.ts.
//
// Polaridade pelo campo, não pela nota do conselho:
//   - sugestao_texto é sempre "o que melhorar no conselho", então todo texto dele é crítica.
//   - avalia_cs_texto é elogio quando nota_cs_hoje é 9 ou 10, e crítica nos demais casos.
//   - destaque_texto_bruto não entra: é o nome de um membro destaque, não um elogio.

// Equivalentes a "sem sugestão": respostas que não dizem nada. Comparadas sem acento, em minúsculas,
// sem pontuação nas pontas e com espaços normalizados.
const EQUIVALENTES_SEM_SUGESTAO = new Set([
  'nao', 'n', 'na', 'nada', 'nenhum', 'nenhuma', 'nao tenho', 'nao tenho sugestao', 'nao tenho sugestoes',
  'sem sugestao', 'sem sugestoes', 'nenhuma sugestao', 'nenhuma sugestoes', 'sem mais', 'sem comentarios',
  'nada a acrescentar', 'tudo otimo', 'tudo bem', 'tudo certo', 'tudo perfeito', 'ok', 'n/a', 'na/a', 'nenhum comentario',
  'ainda nao tenho', 'sem recomendacoes', 'sem recomendacao', 'x', 'xxx',
]);

export function normalizarSugestao(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.!?,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Texto vazio ou equivalente a ausência de sugestão. Esses não entram na contagem de temas.
export function ehSemSugestao(texto: string | null | undefined): boolean {
  if (texto === null || texto === undefined) return true;
  const n = normalizarSugestao(String(texto));
  if (!n) return true;
  if (EQUIVALENTES_SEM_SUGESTAO.has(n)) return true;
  // Resposta curta que só elogia ou não diz nada ("excelente", "tudo ótimo", "amei tudo"): conta como sem conteúdo
  return n.split(' ').length <= 4 && /^(tudo|esta|ta|foi|achei|muito|amei|adorei|excelente|otimo|perfeito|legal|bom|nada|so|xxxx|n|na|ok)\b/.test(n);
}

// Polaridade de avalia_cs_texto pela nota de hoje do CS.
export function polaridadeAvaliacaoCs(notaCsHoje: number | null | undefined): 'elogio' | 'critica' | null {
  if (notaCsHoje === null || notaCsHoje === undefined || Number.isNaN(notaCsHoje)) return null;
  return notaCsHoje >= 9 ? 'elogio' : 'critica';
}
