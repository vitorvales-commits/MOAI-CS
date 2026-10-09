// Ponte entre a agenda de conselhos e os grupos do Monday (revisão out/2026, rodada 2, Parte B). Puro: sem banco.
// A agenda só tem o nome do conselheiro; o NPS tem o group_id. O título do grupo segue o formato
// "Produto | Nome do conselheiro (CS)", por exemplo "Fast Track | Caio Vivan (George)".
// Ordem: primeiro os aliases confirmados; depois o casamento automático pelo nome do conselheiro.

export interface GrupoConselho { group_id: string; titulo: string | null; is_repo?: boolean | null }

// Chave de comparação: sem acento, minúscula, espaços normalizados.
export function chaveNome(s: string | null | undefined): string {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Nome do conselheiro no título do grupo: entre "| " e " (". Sem o formato novo, cai no antigo "Nome [Produto]".
export function conselheiroDoTitulo(titulo: string | null | undefined): string | null {
  const t = String(titulo || '');
  const m = /\|\s*(.+?)(?:\s*\(|$)/.exec(t);
  if (m && m[1].trim()) return m[1].trim();
  const antigo = t.split(' [')[0].trim();
  return antigo || null;
}

// Aliases confirmados que o casamento automático não resolve. Chave: nome da agenda normalizado.
// João Pedro é o JP do grupo "C-Level | JP (Rodrigo)"; o alias fica aqui até a migration de
// agenda_conselho_aliases ser aplicada (decisoes-r2.md, Parte B).
export const ALIASES_CONFIRMADOS_FALLBACK: Record<string, string[]> = {
  [chaveNome('João Pedro')]: ['group_mktkwg6v'],
};

// Grupos de um conselheiro. Um conselheiro pode ter mais de um grupo; todos voltam.
// Grupos is_repo só entram quando não há nenhum grupo comum para o mesmo nome.
export function casarGruposDoConselheiro(
  conselheiro: string,
  grupos: GrupoConselho[],
  aliases: Record<string, string[]> = ALIASES_CONFIRMADOS_FALLBACK,
): string[] {
  const chave = chaveNome(conselheiro);
  if (aliases[chave]?.length) return aliases[chave];
  const iguais = grupos.filter((g) => chaveNome(conselheiroDoTitulo(g.titulo)) === chave);
  const comuns = iguais.filter((g) => !g.is_repo).map((g) => g.group_id);
  if (comuns.length) return comuns;
  return iguais.map((g) => g.group_id);
}

// Cobertura do NPS (Parte B). Realizado é a reunião da agenda no mês com data até agora; avaliado é o
// conselho realizado com pelo menos uma resposta, em qualquer dos grupos ligados ao conselheiro.
export function coberturaNps(agendaRows: any[], respostasMes: { group_id: string | null }[], ref: string, agora: Date, gruposDe: (nome: string) => string[]) {
  const cancelado = (x: string | null) => chaveNome(x).includes('cancelad');
  const doMes = agendaRows.filter((a: any) => a.conselheiro_nome && a.data_iso && String(a.data_iso).slice(0, 7) === ref && !cancelado(a.status));
  const passou = (a: any) => new Date(a.data_iso).getTime() <= agora.getTime();
  const respPorGrupo = new Map<string, number>();
  respostasMes.forEach((r) => { if (r.group_id) respPorGrupo.set(String(r.group_id), (respPorGrupo.get(String(r.group_id)) || 0) + 1); });
  const nomes = Array.from(new Set(doMes.filter(passou).map((a: any) => String(a.conselheiro_nome))));
  const detalhe = nomes.map((conselheiro) => {
    const grupos = gruposDe(conselheiro);
    const respostas = grupos.reduce((soma, g) => soma + (respPorGrupo.get(g) || 0), 0);
    return { conselheiro, avaliado: respostas > 0, respostas };
  }).sort((a, b) => a.conselheiro.localeCompare(b.conselheiro, 'pt-BR'));
  const proximas = doMes.filter((a: any) => !passou(a))
    .sort((x: any, y: any) => new Date(x.data_iso).getTime() - new Date(y.data_iso).getTime())
    .map((a: any) => ({ conselheiro: String(a.conselheiro_nome), dataIso: String(a.data_iso) }));
  return { previstos: doMes.length, realizados: detalhe.length, avaliados: detalhe.filter((d) => d.avaliado).length, detalhe, proximos: proximas };
}
