// 1:1 em três partes (08/10/2026). Funções puras para ordenação, vencido, visão compartilhada e
// resumo, mais a leitura. Nenhuma função daqui chama modelo de linguagem: toda leitura é por regra.
// Roda com: node --experimental-strip-types tests/um-a-um.test.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import { STATUS_VOZ, type StatusVoz } from './voz.ts';

export type TipoItemUmAUm = 'passo_lideranca' | 'passo_liderado' | 'ponto_atencao';
export type VisibilidadeItemUmAUm = 'compartilhado' | 'privado_gestor';
export type PrioridadeItemUmAUm = 'alta' | 'media' | 'baixa';

export type ItemUmAUm = {
  id: string;
  csNome: string;
  registroId: string | null;
  tipo: TipoItemUmAUm;
  texto: string;
  visibilidade: VisibilidadeItemUmAUm;
  status: StatusVoz;
  prioridade: PrioridadeItemUmAUm;
  prazo: string | null;
  observacao: string | null;
  criadoEm: string;
  statusAlteradoEm: string | null;
  excluidoEm: string | null;
  // Data da 1:1 de origem, preenchida na visão compartilhada a partir do registro.
  dataOrigem?: string | null;
};

export type RegistroUmAUmCS = { id: string; data: string; resumoCompartilhado: string | null };

const PRIORIDADE_ORDEM: Record<PrioridadeItemUmAUm, number> = { alta: 0, media: 1, baixa: 2 };

function estaAberto(item: ItemUmAUm): boolean {
  return !item.excluidoEm && (item.status === 'backlog' || item.status === 'em_andamento');
}

// Vencido: prazo anterior a hoje e ainda aberto. Datas são "AAAA-MM-DD", então a comparação é textual.
export function itemVencido(item: ItemUmAUm, hoje: string): boolean {
  return !!item.prazo && item.prazo < hoje && estaAberto(item);
}

// Ordem: vencidos primeiro, depois prioridade (alta, média, baixa), depois prazo mais próximo
// (sem prazo por último), depois criação mais antiga. Só devolve itens abertos.
export function ordenarItensAbertos(itens: ItemUmAUm[], hoje: string): ItemUmAUm[] {
  return itens
    .filter(estaAberto)
    .sort((a, b) => {
      const va = itemVencido(a, hoje) ? 0 : 1;
      const vb = itemVencido(b, hoje) ? 0 : 1;
      if (va !== vb) return va - vb;
      const pa = PRIORIDADE_ORDEM[a.prioridade] ?? 1;
      const pb = PRIORIDADE_ORDEM[b.prioridade] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.prazo !== b.prazo) {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo < b.prazo ? -1 : 1;
      }
      return a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0;
    });
}

// Segunda trava: a visão do CS nunca contém ponto de atenção, item privado nem item excluído,
// mesmo que a consulta tenha trazido essas linhas por engano.
export function visaoCompartilhada(registros: RegistroUmAUmCS[], itens: ItemUmAUm[]) {
  const datas = new Map(registros.map((r) => [r.id, r.data]));
  const visiveis = itens
    .filter((i) => !i.excluidoEm && i.visibilidade === 'compartilhado' && i.tipo !== 'ponto_atencao')
    .map((i) => ({ ...i, dataOrigem: i.registroId ? datas.get(i.registroId) ?? null : null }));
  return {
    registros: registros
      .slice()
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
      .map((r) => ({ id: r.id, data: r.data, resumoCompartilhado: r.resumoCompartilhado })),
    passosLiderado: visiveis.filter((i) => i.tipo === 'passo_liderado'),
    compromissosLideranca: visiveis.filter((i) => i.tipo === 'passo_lideranca'),
  };
}

export type ResumoUmAUm = {
  liderancaAbertos: number;
  liderancaVencidos: number;
  lideradoAbertos: number;
  atencaoAbertos: number;
};

export function resumoAbertos(itens: ItemUmAUm[], hoje: string): ResumoUmAUm {
  const abertos = itens.filter(estaAberto);
  return {
    liderancaAbertos: abertos.filter((i) => i.tipo === 'passo_lideranca').length,
    liderancaVencidos: abertos.filter((i) => i.tipo === 'passo_lideranca' && itemVencido(i, hoje)).length,
    lideradoAbertos: abertos.filter((i) => i.tipo === 'passo_liderado').length,
    atencaoAbertos: abertos.filter((i) => i.tipo === 'ponto_atencao').length,
  };
}

export function mapItemUmAUmRow(r: any): ItemUmAUm {
  return {
    id: r.id,
    csNome: r.cs_nome,
    registroId: r.registro_id ?? null,
    tipo: r.tipo,
    texto: r.texto,
    visibilidade: r.visibilidade,
    status: (STATUS_VOZ.some((s) => s.chave === r.status) ? r.status : 'backlog') as StatusVoz,
    prioridade: r.prioridade,
    prazo: r.prazo ?? null,
    observacao: r.observacao ?? null,
    criadoEm: r.criado_em,
    statusAlteradoEm: r.status_alterado_em ?? null,
    excluidoEm: r.excluido_em ?? null,
  };
}

// Leitura do gestor: registros com notas privadas, todos os itens (inclusive privados e excluídos).
export async function carregarUmAUmGestor(sb: SupabaseClient, cs: string) {
  const [{ data: registros, error: errR }, { data: itens, error: errI }] = await Promise.all([
    sb.from('um_a_um_registros')
      .select('id, cs_nome, gestor_email, data, resumo_compartilhado, granola_note_id, criado_em, um_a_um_privado(notas)')
      .eq('cs_nome', cs)
      .order('data', { ascending: false }),
    sb.from('um_a_um_itens').select('*').eq('cs_nome', cs).order('criado_em', { ascending: true }),
  ]);
  if (errR) throw new Error('Erro ao buscar 1:1: ' + errR.message);
  if (errI) throw new Error('Erro ao buscar itens da 1:1: ' + errI.message);
  return {
    registros: (registros || []).map((r: any) => ({
      id: r.id,
      data: r.data,
      gestorEmail: r.gestor_email,
      resumoCompartilhado: r.resumo_compartilhado ?? null,
      notasPrivadas: r.um_a_um_privado?.notas ?? null,
      granolaNoteId: r.granola_note_id ?? null,
      criadoEm: r.criado_em,
    })),
    itens: (itens || []).map(mapItemUmAUmRow),
  };
}

// Leitura do CS: select explícito, sem um_a_um_privado nem granola_notas, e a segunda trava acima.
export async function carregarUmAUmCompartilhado(sb: SupabaseClient, cs: string) {
  const [{ data: registros, error: errR }, { data: itens, error: errI }] = await Promise.all([
    sb.from('um_a_um_registros').select('id, data, resumo_compartilhado').eq('cs_nome', cs).order('data', { ascending: false }),
    sb.from('um_a_um_itens')
      .select('id, cs_nome, registro_id, tipo, texto, visibilidade, status, prioridade, prazo, observacao, criado_em, status_alterado_em, excluido_em')
      .eq('cs_nome', cs)
      .eq('visibilidade', 'compartilhado')
      .is('excluido_em', null),
  ]);
  if (errR) throw new Error('Erro ao buscar 1:1: ' + errR.message);
  if (errI) throw new Error('Erro ao buscar itens da 1:1: ' + errI.message);
  const registrosMapeados: RegistroUmAUmCS[] = (registros || []).map((r: any) => ({
    id: r.id,
    data: r.data,
    resumoCompartilhado: r.resumo_compartilhado ?? null,
  }));
  const itensMapeados = (itens || []).map(mapItemUmAUmRow);
  return visaoCompartilhada(registrosMapeados, itensMapeados);
}
