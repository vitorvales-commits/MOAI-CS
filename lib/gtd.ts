// GTD de conselho (07/10/2026). Funções puras: taxa por ciclo, agregado do CS, separação das
// etapas em antes e depois do conselho e ciclos de um conselho. Nenhuma tela recalcula nada.
// Roda com: node --experimental-strip-types tests/gtd.test.ts

export type EtapaGtd = { label: string; feito: boolean };
export type LinhaHistoricoGtd = {
  id_item_conselho: string | null; membro: string | null; cs_responsavel: string | null;
  data_conselho: string | null; data_snapshot: string | null; taxa_cumprimento: number | string | null;
  etapas: EtapaGtd[] | null; etapas_atrasadas: string[] | null;
};

// Percentual de etapas feitas, arredondado meio para cima. Zero etapas não tem valor (null).
export function taxaGtd(feitas: number, total: number): number | null {
  if (!Number.isInteger(feitas) || !Number.isInteger(total) || total <= 0 || feitas < 0 || feitas > total) return null;
  return Math.floor((feitas * 200 + total) / (2 * total));
}

export function contarEtapas(etapas: EtapaGtd[] | null | undefined): { feitas: number; total: number } {
  const lista = Array.isArray(etapas) ? etapas : [];
  return { feitas: lista.filter((e) => e && e.feito === true).length, total: lista.length };
}

// Agregado pooled: etapas feitas sobre etapas totais somadas em todos os ciclos, nunca a média das
// taxas. Sem nenhuma etapa, null.
export function taxaGtdAgregada(ciclos: { feitas: number; total: number }[]): number | null {
  const feitas = ciclos.reduce((s, c) => s + c.feitas, 0);
  const total = ciclos.reduce((s, c) => s + c.total, 0);
  return taxaGtd(feitas, total);
}

// Antes ou depois do conselho pelo sinal do prefixo do rótulo: "D-1 ..." é antes, "D+2 ..." é
// depois (decisão do Vitor em 07/10/2026). Rótulo sem prefixo reconhecido devolve null e aparece
// à parte, nunca é adivinhado.
export function blocoEtapa(label: unknown): 'antes' | 'depois' | null {
  const m = /^\s*D\s*([+\-−–])\s*\d+/i.exec(String(label ?? ''));
  if (!m) return null;
  return m[1] === '+' ? 'depois' : 'antes';
}

// Etapa pronta para a tela: rótulo sem o prefixo "D-1 " ou "D+2 ", e o número de dias do prefixo.
// Assim o JS das páginas não precisa de regex nem repete a regra.
export type EtapaTela = EtapaGtd & { rotulo: string; dias: number | null };
export function etapaParaTela(e: EtapaGtd): EtapaTela {
  const label = String(e && e.label !== undefined && e.label !== null ? e.label : '');
  const m = /^\s*D\s*[+\-−–]\s*(\d+)\s*(.*)$/i.exec(label);
  return { label, feito: !!(e && e.feito), rotulo: m ? (m[2] || label) : label, dias: m ? Number(m[1]) : null };
}

export function dividirEtapas(etapas: EtapaGtd[] | null | undefined) {
  const lista = Array.isArray(etapas) ? etapas : [];
  const antes: EtapaTela[] = [], depois: EtapaTela[] = [], semPrefixo: EtapaTela[] = [];
  lista.forEach((e) => {
    const b = blocoEtapa(e && e.label);
    const t = etapaParaTela(e);
    (b === 'antes' ? antes : b === 'depois' ? depois : semPrefixo).push(t);
  });
  return { antes, depois, semPrefixo };
}

export type CicloGtd = {
  idItem: string | null; dataConselho: string | null; dataSnapshot: string | null;
  taxa: number | null; feitas: number; total: number; etapasAtrasadas: string[];
  antes: EtapaTela[]; depois: EtapaTela[]; semPrefixo: EtapaTela[]; atual: boolean;
};

export function montarCiclo(l: LinhaHistoricoGtd, atual: boolean): CicloGtd {
  const { feitas, total } = contarEtapas(l.etapas);
  const taxaBanco = l.taxa_cumprimento === null || l.taxa_cumprimento === undefined ? null : Number(l.taxa_cumprimento);
  const dividido = dividirEtapas(l.etapas);
  return {
    idItem: l.id_item_conselho, dataConselho: l.data_conselho, dataSnapshot: l.data_snapshot,
    // A taxa exibida é a do banco (taxa_cumprimento). Sem ela, deriva das etapas.
    taxa: taxaBanco !== null && !Number.isNaN(taxaBanco) ? taxaBanco : taxaGtd(feitas, total),
    feitas, total, etapasAtrasadas: Array.isArray(l.etapas_atrasadas) ? l.etapas_atrasadas : [],
    antes: dividido.antes, depois: dividido.depois, semPrefixo: dividido.semPrefixo, atual,
  };
}

// Ciclo atual de cada conselho: o de maior data_conselho por id_item_conselho (mesma definição que
// a visão do CS já usa, cicloAtualPorConselho em reports.ts).
export function cicloAtualPorId(linhas: LinhaHistoricoGtd[]): LinhaHistoricoGtd[] {
  const porId = new Map<string, LinhaHistoricoGtd>();
  linhas.forEach((it) => {
    if (!it.id_item_conselho) return;
    const atual = porId.get(it.id_item_conselho);
    if (!atual || (it.data_conselho || '') > (atual.data_conselho || '')) porId.set(it.id_item_conselho, it);
  });
  return [...porId.values()];
}

// Todos os ciclos de um conselho, do mais recente ao mais antigo. O vínculo é o da visão do CS: o
// ciclo atual cujo membro bate com o conselheiro do título. Sem vínculo, devolve vinculado false e
// nenhum ciclo, nunca adivinha por outro critério.
export function gtdDoConselho(
  historico: LinhaHistoricoGtd[], contato: string | null, normalizar: (s: string) => string,
): { vinculado: boolean; ciclos: CicloGtd[] } {
  if (!contato) return { vinculado: false, ciclos: [] };
  const atual = cicloAtualPorId(historico).find((h) => normalizar(h.membro || '') === normalizar(contato));
  if (!atual) return { vinculado: false, ciclos: [] };
  const ciclos = historico
    .filter((h) => h.id_item_conselho === atual.id_item_conselho)
    .sort((a, b) => (b.data_conselho || '').localeCompare(a.data_conselho || ''))
    .map((h) => montarCiclo(h, h === atual));
  return { vinculado: true, ciclos };
}

// Agregado do CS: razão pooled das etapas dos ciclos atuais dos conselhos dele, mais a lista de
// conselhos com barra, atrasadas e data do encontro. contatosVinculados são os conselheiros que
// casam com um conselho ativo (para marcar os não vinculados).
export function gtdAgregadoCS(
  historico: LinhaHistoricoGtd[], csNome: string, normalizar: (s: string) => string,
  contatosVinculados: Set<string>,
) {
  const atuais = cicloAtualPorId(historico).filter((h) => normalizar(h.cs_responsavel || '') === normalizar(csNome));
  const conselhos = atuais.map((h) => {
    const c = montarCiclo(h, true);
    return { membro: h.membro, ...c, vinculado: contatosVinculados.has(normalizar(h.membro || '')) };
  }).sort((a, b) => (a.dataConselho || '').localeCompare(b.dataConselho || ''));
  return {
    taxa: taxaGtdAgregada(conselhos),
    feitas: conselhos.reduce((s, c) => s + c.feitas, 0),
    total: conselhos.reduce((s, c) => s + c.total, 0),
    conselhos,
  };
}
