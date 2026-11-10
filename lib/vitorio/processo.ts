// Resposta direta de processo (Vitorio 2, 30/10/2026): extrativa, sem reescrever. Dentro do item mais bem classificado, divide o texto
// em frases, pontua cada uma contra a pergunta e devolve de uma a três frases na ordem original; fluxos e POPs com etapas viram passos
// numerados. Quando a pergunta combina processo e data ("o relatório do conselho de ontem"), junta a regra com a data calculada.
import { normalizar, radical, type DocVitorio } from './busca.ts';
import { somarDias } from './periodo.ts';
import { iso2br } from './redacao.ts';
import type { Bloco, Entidades } from './tipos.ts';

export const MAX_FRASES = 3;
export const MAX_PASSOS = 7;

export function frases(texto: string): string[] {
  return texto.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/).map((s) => s.trim()).filter((s) => s.length > 3);
}
const radicaisDe = (t: string) => normalizar(t).split(' ').filter(Boolean).map(radical);

export function extrair(doc: DocVitorio, realce: string[]): { frases: string[]; passos: string[] | null } {
  const alvo = new Set(realce);
  const pontua = (s: string) => { const r = radicaisDe(s); return r.length ? r.filter((x) => alvo.has(x)).length / Math.pow(r.length, 0.3) : 0; };
  if (doc.passos && doc.passos.length >= 2) return { frases: [], passos: doc.passos.slice(0, MAX_PASSOS) };
  const fs = frases(doc.corpo);
  if (doc.colecao === 'faq') return { frases: fs.slice(0, MAX_FRASES), passos: null };
  const pont = fs.map((s, i) => ({ s, i, p: pontua(s) }));
  let escolhidas = pont.filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, MAX_FRASES).sort((a, b) => a.i - b.i);
  if (!escolhidas.length) escolhidas = pont.slice(0, 2);
  return { frases: escolhidas.map((x) => x.s), passos: null };
}

// Passos numerados ou trecho original, mais o complemento de data quando o caso pede.
export function blocosDeProcesso(doc: DocVitorio, realce: string[], ent: Entidades): { blocos: Bloco[]; extra: string | null } {
  const { frases: fr, passos } = extrair(doc, realce);
  const blocos: Bloco[] = [];
  if (passos) blocos.push({ tipo: 'passos', passos: passos.map((t, i) => ({ n: i + 1, texto: t })) });
  else blocos.push({ tipo: 'trecho', texto: fr.join(' '), origem: doc.origem, data: doc.data });
  let extra: string | null = null;
  if (doc.chave === 'glossario:prazo-relatorio-conselho' && ent.periodo && ent.periodo.tipo === 'dia') {
    const limite = somarDias(ent.periodo.data, 7);
    extra = 'Para o conselho de ' + iso2br(ent.periodo.data) + ', o relatório pode ser enviado até ' + iso2br(limite) + '.';
  }
  return { blocos, extra };
}
