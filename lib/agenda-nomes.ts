// Casamento entre o nome digitado no board de Agenda e o contato do título do grupo de conselho
// (19/10/2026). Puro: sem banco. Único lugar com a regra; reports.ts usa para a agenda visual, a
// próxima data do conselho e o ano das atas.
//
// Por que existe: o board de Agenda é digitado à mão e carrega anotações e erros de grafia que o
// casamento exato descartava em silêncio. Casos reais de outubro/2026: "Henrique Guimalhaes [André
// Froes]" (conselheiro novo do grupo do André, com anotação e erro de grafia), "Eduardo Gallo
// (Gallo)", "Gustavo Dahyan" contra "Gustavo Dayahn", "Rodrigo Félix (Bruno Teixeira substituiu)".
//
// Regra, em ordem: (1) remove anotações entre parênteses ou colchetes e normaliza acento, caixa e
// espaços; (2) procura a chave exata; (3) se não achar, aceita um único candidato com o mesmo
// primeiro nome e no máximo DISTANCIA_MAX_NOME edições no nome inteiro. Empate ou nenhum candidato
// devolve null: nunca escolhe um conselho errado sozinho.

// Nomes com menos letras que isto só casam de forma exata (nome curto tolera pouco erro).
const TAMANHO_MIN_TOLERANCIA = 8;
// Edições aceitas: cobre uma letra trocada mais uma letra a mais ou a menos, ou uma inversão.
const DISTANCIA_MAX_NOME = 2;

export function chaveAgenda(nome: string | null | undefined): string {
  return String(nome || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// Chave conhecida que corresponde a `chave` (já passada por chaveAgenda), exata ou tolerante.
export function acharChaveTolerante(chave: string, conhecidas: Iterable<string>): string | null {
  if (!chave) return null;
  const lista = Array.from(conhecidas);
  if (lista.includes(chave)) return chave;
  if (chave.length < TAMANHO_MIN_TOLERANCIA) return null;
  const primeiro = chave.split(' ')[0];
  const candidatos = lista.filter((k) =>
    k.length >= TAMANHO_MIN_TOLERANCIA && k.split(' ')[0] === primeiro && distanciaEdicao(k, chave) <= DISTANCIA_MAX_NOME);
  return candidatos.length === 1 ? candidatos[0] : null;
}

// Apelidos e sucessões: contato do título do grupo -> nomes usados na agenda. Aceita um nome ou
// vários (sucessão de conselheiro: o grupo é o mesmo, o nome na agenda muda). Devolve o mapa já
// normalizado por chaveAgenda.
export function normalizarApelidos(apelidos: Record<string, string | string[]>): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  Object.entries(apelidos).forEach(([contato, nomes]) => {
    const lista = (Array.isArray(nomes) ? nomes : [nomes]).map(chaveAgenda).filter(Boolean);
    mapa.set(chaveAgenda(contato), Array.from(new Set(lista)));
  });
  return mapa;
}

// Todas as chaves de agenda que pertencem a um contato de grupo: o próprio contato e seus apelidos.
export function chavesDoContato(contato: string, apelidos: Map<string, string[]>): string[] {
  const base = chaveAgenda(contato);
  return Array.from(new Set([base, ...(apelidos.get(base) || [])])).filter(Boolean);
}
