// Composição da resposta (Vitorio 2): modelos de frase com variações escolhidas de forma determinística pela semente da pergunta
// e preenchidos com os dados. Funções puras.
export function semente(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function escolher<T>(lista: T[], sem: number): T { return lista[sem % lista.length]; }
export function preencher(modelo: string, vars: Record<string, string | number | undefined>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : String(vars[k]))).replace(/\s+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
export const numeroBr = (n: number, casas = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export function plural(n: number, um: string, varios: string): string { return n + ' ' + (n === 1 ? um : varios); }
// "A, B e C"
export function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
}
export function iso2br(iso: string): string { return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4); }
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function dataLonga(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00Z');
  return DIAS[d.getUTCDay()] + ', ' + iso.slice(8, 10) + '/' + iso.slice(5, 7);
}
