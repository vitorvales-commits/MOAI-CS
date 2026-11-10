// Entidades da pergunta do Vitorio: data e período em português, conselho (por trigramas) e CS (por token,
// com tolerância a um erro de digitação em nomes com cinco letras ou mais). Puro: recebe as listas já lidas.
import { normalizarTexto, contencao, levenshtein } from './texto.ts';

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export interface DataEntidade { tipo: 'dia' | 'mes'; iso: string }

// Número do mês cujo nome está a uma letra de distância (ex.: "setmbro"). Nome exato tem prioridade no chamador.
function nomeDeMesProximo(palavra: string): number | undefined {
  const cand = Object.keys(MESES).filter((m) => levenshtein(palavra, m) <= 1);
  return cand.length === 1 ? MESES[cand[0]] : undefined;
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function deslocarDia(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function deslocarMes(iso: string, meses: number): string {
  const [y, m] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + meses, 1));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}

// Primeira data ou período encontrado, em ordem de precisão: dia explícito, hoje/ontem, mês relativo, nome de mês.
export function extrairData(texto: string, hojeIso: string): DataEntidade | null {
  const n = normalizarTexto(texto);
  const hoje = hojeIso.slice(0, 10);
  const anoHoje = Number(hoje.slice(0, 4));

  const dm = n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    const y = dm[3] ? Number(dm[3]) : anoHoje;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { tipo: 'dia', iso: ymd(y, m, d) };
  }
  if (/\bhoje\b/.test(n)) return { tipo: 'dia', iso: hoje };
  if (/\bontem\b/.test(n)) return { tipo: 'dia', iso: deslocarDia(hoje, -1) };
  if (/\bmes passado\b/.test(n)) return { tipo: 'mes', iso: deslocarMes(hoje, -1) };
  if (/\b(esse|este|deste|desse) mes\b/.test(n)) return { tipo: 'mes', iso: deslocarMes(hoje, 0) };

  const partes = n.split(' ');
  for (let i = 0; i < partes.length; i++) {
    // mês com um erro de digitação (nomes de seis letras ou mais): "setmbro" casa com "setembro"
    const mes = MESES[partes[i]] ?? (partes[i].length >= 6 ? nomeDeMesProximo(partes[i]) : undefined);
    if (!mes) continue;
    const prox = partes[i + 1] === 'de' ? partes[i + 2] : partes[i + 1];
    const ano = prox && /^\d{4}$/.test(prox) ? Number(prox) : anoHoje;
    return { tipo: 'mes', iso: ymd(ano, mes, 1) };
  }
  return null;
}

export interface ConselhoRef { group_id: string; titulo: string }

// Fração das palavras do título que aparecem na pergunta, com um erro de digitação em palavras de cinco letras ou mais.
// Cobre "conselo" para "conselho", que a contenção de trigramas deixa abaixo do limiar.
function fracaoDeTokens(titulo: string, qtokens: string[]): number {
  const ts = normalizarTexto(titulo).split(' ').filter(Boolean);
  if (!ts.length) return 0;
  const achou = ts.filter((t) => qtokens.some((q) => q === t || (t.length >= 5 && q.length >= 5 && levenshtein(q, t) <= 1))).length;
  return achou / ts.length;
}

// Conselhos que a pergunta cita. Mais de um candidato quando o empate é de fato (ambiguidade).
// Devolve os candidatos ordenados pela semelhança; o limiar é a contenção dos trigramas do título no texto.
export function extrairConselho(texto: string, conselhos: ConselhoRef[], limiar = 0.7): { candidatos: string[]; ordenados: { group_id: string; score: number }[] } {
  const qtokens = normalizarTexto(texto).split(' ');
  const pontos = conselhos
    .filter((c) => c.titulo)
    .map((c) => ({ group_id: c.group_id, score: Math.max(contencao(c.titulo, texto), fracaoDeTokens(c.titulo, qtokens)) }))
    .sort((a, b) => b.score - a.score);
  const topo = pontos[0]?.score ?? 0;
  const candidatos = topo >= limiar ? pontos.filter((p) => p.score >= limiar && p.score >= topo - 0.02).map((p) => p.group_id) : [];
  return { candidatos, ordenados: pontos };
}

export interface CsRef { id: number; nome_curto: string; apelidos: string[] }

// CS citado na pergunta: um token que casa com nome curto ou apelido, exato ou com um erro (nomes com 5+ letras).
export function extrairCs(texto: string, cs: CsRef[]): number[] {
  const tokens = normalizarTexto(texto).split(' ').filter((t) => t.length >= 3);
  const achados = new Set<number>();
  for (const c of cs) {
    const nomes = [c.nome_curto, ...c.apelidos].map((x) => normalizarTexto(x)).filter(Boolean);
    for (const nome of nomes) {
      if (tokens.some((t) => t === nome || (nome.length >= 5 && t.length >= 5 && levenshtein(t, nome) <= 1))) {
        achados.add(c.id);
      }
    }
  }
  return Array.from(achados);
}
