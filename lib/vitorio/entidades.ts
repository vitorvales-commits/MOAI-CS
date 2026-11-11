// Entidades da pergunta do Vitorio: data e período em português, conselho (pelas palavras do título) e CS.
// Puro: recebe as listas já lidas.
import { normalizarTexto, levenshtein } from './texto.ts';

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// Nomes de mês: nunca identificam conselho ("julho" não é "Julio Faccioli").
export const NOMES_DE_MES: string[] = Object.keys(MESES);

export interface DataEntidade { tipo: 'dia' | 'mes'; iso: string }

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

// Número do mês cujo nome está a uma letra de distância (ex.: "setmbro"). Nome exato tem prioridade no chamador.
function nomeDeMesProximo(palavra: string): number | undefined {
  const cand = Object.keys(MESES).filter((m) => levenshtein(palavra, m) <= 1);
  return cand.length === 1 ? MESES[cand[0]] : undefined;
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
  if (/\b(hoje|hj)\b/.test(n)) return { tipo: 'dia', iso: hoje };
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

// Palavras que não identificam um conselho: tipo de grupo, número de título e ligações.
const GENERICAS = new Set(['c', 'level', 'executivo', 'setorial', 'fast', 'track', 'reposicoes', 'reposicao', 'no', 'da', 'do', 'de', 'em', 'e', 'congelado', 'externo', 'grupo', 'novo', 'group', 'conselho']);

// Palavras distintivas do título: sem o que está entre parênteses (é o CS responsável), sem genéricas,
// sem nomes de CS e sem nomes de mês.
function distintivas(titulo: string, excluir: Set<string>): string[] {
  return normalizarTexto(titulo.replace(/\([^)]*\)/g, ' '))
    .split(' ')
    .filter((t) => t && !GENERICAS.has(t) && !excluir.has(t) && t.length >= 2);
}

// Palavra da pergunta casa com palavra do título: exata, ou com um erro quando tem cinco letras ou mais.
// Erro de digitação só entra em palavras só com letras: "pessoa1" não é "pessoa2".
const soLetras = (s: string) => /^[a-z]+$/.test(s);
const casaPalavra = (titulo: string, q: string) => q === titulo || (soLetras(titulo) && soLetras(q) && titulo.length >= 5 && q.length >= 5 && levenshtein(q, titulo) <= 1);

// Regra: uma palavra que aparece em mais de um título nunca resolve sozinha, e o esclarecimento lista todos esses
// títulos. Só uma sequência de palavras presente em um único título resolve. Títulos de reposição só entram
// quando nenhum conselho principal casa com a pergunta.
export function extrairConselho(texto: string, conselhos: ConselhoRef[], excluir: Set<string> = new Set()): { candidatos: string[]; ordenados: { group_id: string; score: number }[] } {
  const qtokens = normalizarTexto(texto).split(' ').filter((q) => q && !excluir.has(q));
  const itens = conselhos
    .filter((c) => c.titulo)
    .map((c) => ({ group_id: c.group_id, ds: distintivas(c.titulo, excluir), reposicao: /^reposi/.test(normalizarTexto(c.titulo)) }))
    .filter((x) => x.ds.length);

  // Palavras da pergunta que casam com alguma palavra distintiva de algum título.
  const qPalavras = qtokens.filter((q) => itens.some((x) => x.ds.some((t) => casaPalavra(t, q))));
  const ordenados = itens
    .map((x) => ({ group_id: x.group_id, score: x.ds.filter((t) => qtokens.some((q) => casaPalavra(t, q))).length / x.ds.length }))
    .sort((a, b) => b.score - a.score);
  if (!qPalavras.length) return { candidatos: [], ordenados };

  const casam = itens.filter((x) => qPalavras.some((q) => x.ds.some((t) => casaPalavra(t, q))));
  const principais = casam.filter((x) => !x.reposicao);
  const pool = principais.length ? principais : casam;

  // Títulos que contêm todas as palavras da pergunta que casaram: sequência única resolve, mais de uma pede esclarecimento.
  const cheios = pool.filter((x) => qPalavras.every((q) => x.ds.some((t) => casaPalavra(t, q))));
  const candidatos = (cheios.length ? cheios : pool).map((x) => x.group_id);
  return { candidatos, ordenados };
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
