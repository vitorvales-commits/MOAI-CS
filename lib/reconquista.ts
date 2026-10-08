// Rastreio de reconquista (08/10/2026). Quem respondeu no formulário de saída que voltaria para a MOAI
// (nota 9 ou 10 na pergunta de 0 a 10, ou 7 e 8 quando o gestor incluir os que talvez voltem) vira um item
// de acompanhamento: status do contato, responsável, próximo contato e observação.
//
// A lista sai de churn_items e churn_detalhes (board de churn 10008640053); o que o gestor registra fica
// em reconquista_ex_membros e só é gravado pela função reconquista_definir (migração
// 20261008b_reconquista.sql), que confere is_gestor e audita. Formulário preenchido pelo CS fica fora:
// a nota não foi dada pelo membro.
import type { SupabaseClient } from '@supabase/supabase-js';
import { infoMotivo } from './churn.ts';
import { ehPreenchidoPeloCs, faixaRetorno, type FaixaRetorno } from './voz-membro.ts';

export type StatusReconquista = 'a_contatar' | 'contatado' | 'em_conversa' | 'voltou' | 'sem_interesse';
export const STATUS_RECONQUISTA: { chave: StatusReconquista; rotulo: string; aberto: boolean }[] = [
  { chave: 'a_contatar', rotulo: 'A contatar', aberto: true },
  { chave: 'contatado', rotulo: 'Contatado', aberto: true },
  { chave: 'em_conversa', rotulo: 'Em conversa', aberto: true },
  { chave: 'voltou', rotulo: 'Voltou', aberto: false },
  { chave: 'sem_interesse', rotulo: 'Sem interesse', aberto: false },
];
export function statusReconquistaValido(s: unknown): s is StatusReconquista {
  return STATUS_RECONQUISTA.some((x) => x.chave === s);
}
function statusAberto(s: StatusReconquista): boolean {
  return STATUS_RECONQUISTA.find((x) => x.chave === s)?.aberto ?? true;
}

export const LINK_ITEM_CHURN = 'https://moai-global.monday.com/boards/10008640053/pulses/';

export type EntradaReconquista = {
  churnId: number;
  membro: string | null;
  empresa: string | null;
  cs: string | null;
  produto: string | null;
  dataSaida: string | null; // AAAA-MM-DD
  motivo: string;
  nota: number | null;
  explicacao: string | null;
  registro: { status: StatusReconquista; responsavel: string | null; proximo_contato: string | null; observacao: string | null; atualizado_em: string | null; atualizado_por: string | null } | null;
};

export type LinhaReconquista = {
  churnId: number;
  membro: string;
  empresa: string | null;
  cs: string | null;
  produto: string | null;
  dataSaida: string | null;
  diasDesdeSaida: number | null;
  motivo: string;
  motivoRotulo: string;
  nota: number;
  faixa: FaixaRetorno;
  status: StatusReconquista;
  aberto: boolean;
  responsavel: string | null;
  proximoContato: string | null;
  vencido: boolean;
  diasVencido: number | null;
  observacao: string | null;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  link: string;
};

function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((Date.parse(ateISO + 'T12:00:00Z') - Date.parse(deISO + 'T12:00:00Z')) / 86_400_000);
}

// Monta e ordena a fila. Ordem: abertos antes de encerrados; entre os abertos, contato vencido primeiro,
// depois quem ainda não foi contatado, depois nota maior e saída mais recente.
export function montarReconquista(entradas: EntradaReconquista[], hojeISO: string, incluirTalvez: boolean) {
  const preenchidosPeloCs = entradas.filter((e) => ehPreenchidoPeloCs(e.explicacao)).length;
  const itens: LinhaReconquista[] = [];
  for (const e of entradas) {
    if (ehPreenchidoPeloCs(e.explicacao)) continue;
    const faixa = faixaRetorno(e.nota);
    if (faixa !== 'voltaria' && !(incluirTalvez && faixa === 'talvez')) continue;
    const status = e.registro?.status ?? 'a_contatar';
    const aberto = statusAberto(status);
    const proximo = e.registro?.proximo_contato ?? null;
    const vencido = aberto && !!proximo && proximo < hojeISO;
    itens.push({
      churnId: e.churnId,
      membro: (e.membro || '').trim() || 'Sem nome no formulário',
      empresa: e.empresa,
      cs: e.cs,
      produto: e.produto,
      dataSaida: e.dataSaida,
      diasDesdeSaida: e.dataSaida ? diasEntre(e.dataSaida, hojeISO) : null,
      motivo: e.motivo,
      motivoRotulo: infoMotivo(e.motivo).rotulo,
      nota: Number(e.nota),
      faixa: faixa as FaixaRetorno,
      status,
      aberto,
      responsavel: e.registro?.responsavel ?? null,
      proximoContato: proximo,
      vencido,
      diasVencido: vencido && proximo ? diasEntre(proximo, hojeISO) : null,
      observacao: e.registro?.observacao ?? null,
      atualizadoEm: e.registro?.atualizado_em ?? null,
      atualizadoPor: e.registro?.atualizado_por ?? null,
      link: LINK_ITEM_CHURN + e.churnId,
    });
  }
  const pesoStatus = (s: StatusReconquista) => STATUS_RECONQUISTA.findIndex((x) => x.chave === s);
  itens.sort((a, b) =>
    Number(b.aberto) - Number(a.aberto) ||
    Number(b.vencido) - Number(a.vencido) ||
    pesoStatus(a.status) - pesoStatus(b.status) ||
    b.nota - a.nota ||
    (b.dataSaida || '').localeCompare(a.dataSaida || ''));

  const porStatus = Object.fromEntries(STATUS_RECONQUISTA.map((s) => [s.chave, 0])) as Record<StatusReconquista, number>;
  itens.forEach((i) => { porStatus[i.status]++; });
  return {
    itens,
    resumo: {
      total: itens.length,
      porStatus,
      abertos: itens.filter((i) => i.aberto).length,
      vencidos: itens.filter((i) => i.vencido).length,
      semContato: porStatus.a_contatar,
      voltaram: porStatus.voltou,
      preenchidosPeloCs,
    },
  };
}

// Pendências para "O que fazer agora": contatos vencidos (os mais atrasados primeiro) e quantos ainda
// não foram contatados. Só entre quem deu 9 ou 10.
export function pendenciasReconquista(itens: LinhaReconquista[], limite = 3): string[] {
  const out: string[] = [];
  itens.filter((i) => i.vencido).sort((a, b) => (b.diasVencido || 0) - (a.diasVencido || 0)).slice(0, limite).forEach((i) => {
    out.push(`Retomar o contato com ${i.membro} (nota ${i.nota} para voltar)${i.responsavel ? `, responsável ${i.responsavel}` : ''}: venceu há ${i.diasVencido} ${i.diasVencido === 1 ? 'dia' : 'dias'}.`);
  });
  const semContato = itens.filter((i) => i.status === 'a_contatar' && i.faixa === 'voltaria').length;
  if (semContato) out.push(`${semContato} ${semContato === 1 ? 'ex membro que disse que voltaria ainda não foi contatado' : 'ex membros que disseram que voltariam ainda não foram contatados'}.`);
  return out;
}

async function todas(consulta: (de: number, ate: number) => any): Promise<any[]> {
  const out: any[] = [];
  let de = 0;
  while (true) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    de += 1000;
  }
  return out;
}

export function hojeBrasiliaISO(): string {
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export async function carregarReconquista(supabase: SupabaseClient, incluirTalvez: boolean) {
  const [itens, detalhes, registros] = await Promise.all([
    todas((de, ate) => supabase.from('churn_items').select('id, data, created_at_monday, quem_e_seu_cs, produto, motivo_principal').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('churn_detalhes').select('churn_id, membro_nome, empresa, explicacao, nota_retorno').order('churn_id').range(de, ate)),
    todas((de, ate) => supabase.from('reconquista_ex_membros').select('churn_id, status, responsavel, proximo_contato, observacao, atualizado_em, atualizado_por').order('churn_id').range(de, ate)),
  ]);
  const detPor = new Map<number, any>(detalhes.map((d: any) => [Number(d.churn_id), d]));
  const regPor = new Map<number, any>(registros.map((r: any) => [Number(r.churn_id), r]));
  const entradas: EntradaReconquista[] = itens.map((it: any) => {
    const d = detPor.get(Number(it.id)) || {};
    return {
      churnId: Number(it.id),
      membro: d.membro_nome ?? null,
      empresa: d.empresa ?? null,
      cs: it.quem_e_seu_cs ?? null,
      produto: it.produto ?? null,
      dataSaida: it.data || (it.created_at_monday ? String(it.created_at_monday).slice(0, 10) : null),
      motivo: it.motivo_principal || 'nao_informado',
      nota: d.nota_retorno ?? null,
      explicacao: d.explicacao ?? null,
      registro: regPor.get(Number(it.id)) || null,
    };
  });
  const hoje = hojeBrasiliaISO();
  const montado = montarReconquista(entradas, hoje, incluirTalvez);
  // As pendências sempre olham só quem deu 9 ou 10, mesmo quando a lista inclui os 7 e 8
  const soVoltaria = incluirTalvez ? montarReconquista(entradas, hoje, false).itens : montado.itens;
  return {
    hoje,
    incluirTalvez,
    status: STATUS_RECONQUISTA,
    ...montado,
    pendencias: pendenciasReconquista(soVoltaria),
  };
}

export type EntradaDefinir = { churnId: number; status: StatusReconquista; responsavel?: string | null; proximoContato?: string | null; observacao?: string | null };

export function validarEntradaDefinir(corpo: any): EntradaDefinir {
  const churnId = Number(corpo?.churnId);
  if (!Number.isInteger(churnId) || churnId <= 0) throw new Error('Saída inválida.');
  if (!statusReconquistaValido(corpo?.status)) throw new Error('Status inválido.');
  const proximo = corpo?.proximoContato ? String(corpo.proximoContato) : null;
  if (proximo && !/^\d{4}-\d{2}-\d{2}$/.test(proximo)) throw new Error('Data do próximo contato inválida.');
  const texto = (v: any, max: number) => (v === null || v === undefined ? null : String(v).slice(0, max));
  return { churnId, status: corpo.status, responsavel: texto(corpo?.responsavel, 80), proximoContato: proximo, observacao: texto(corpo?.observacao, 600) };
}

export async function definirReconquista(supabase: SupabaseClient, e: EntradaDefinir) {
  const { data, error } = await supabase.rpc('reconquista_definir', {
    p_churn_id: e.churnId,
    p_status: e.status,
    p_responsavel: e.responsavel ?? null,
    p_proximo_contato: e.proximoContato ?? null,
    p_observacao: e.observacao ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}
