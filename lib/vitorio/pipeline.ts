// Pipeline do Vitorio no servidor (B1, começo): classifica, extrai entidades e responde ou pede esclarecimento.
// Puro: recebe os dados já lidos (dicionário, períodos, vigências). Sem SQL montado a partir do texto.
import { classificar, type Intencao } from './classificador.ts';
import { extrairConselho, extrairCs, extrairData, type ConselhoRef, type CsRef } from './entidades.ts';
import { responderCarteira, responderElenco, type DadosTime, type RespostaTime } from './time-carteira.ts';

export interface DadosPipeline extends DadosTime {
  conselhosLista: ConselhoRef[];
  csLista: CsRef[];
}

export interface Entidades {
  conselho: string | null;
  data: string | null;
  mes: string | null;
  cs: number[];
}

export type Saida =
  | { status: 'resposta'; intencao: Intencao; confianca: number; entidades: Entidades; resposta: RespostaTime }
  | { status: 'esclarecimento'; intencao: Intencao; confianca: number; entidades: Entidades; pergunta: string; opcoes: { label: string; valor: string }[] }
  | { status: 'sem_intencao'; intencao: null; confianca: number; entidades: Entidades };

const MAX_OPCOES = 5;

export function responderTexto(texto: string, d: DadosPipeline): Saida {
  const hoje = d.hojeIso.slice(0, 10);
  const dataEnt = extrairData(texto, hoje);
  const conselho = extrairConselho(texto, d.conselhosLista);
  const cs = extrairCs(texto, d.csLista);
  const { intencao, confianca } = classificar(texto, { temData: !!dataEnt, temConselho: conselho.candidatos.length > 0 });
  const entidades: Entidades = {
    conselho: conselho.candidatos.length === 1 ? conselho.candidatos[0] : null,
    data: dataEnt?.tipo === 'dia' ? dataEnt.iso : null,
    mes: dataEnt ? (dataEnt.tipo === 'mes' ? dataEnt.iso : dataEnt.iso.slice(0, 7) + '-01') : null,
    cs,
  };

  if (!intencao) return { status: 'sem_intencao', intencao: null, confianca, entidades };

  if (intencao === 'elenco') {
    const mes = entidades.mes ?? hoje.slice(0, 7) + '-01';
    return { status: 'resposta', intencao, confianca, entidades: { ...entidades, mes }, resposta: responderElenco(mes, d) };
  }

  // carteira: precisa de conselho e de dia
  if (conselho.candidatos.length !== 1) {
    const ordenados = conselho.ordenados.slice(0, MAX_OPCOES);
    const opcoes = ordenados.map((o) => ({ label: d.conselhosLista.find((c) => c.group_id === o.group_id)?.titulo || o.group_id, valor: o.group_id }));
    const pergunta = conselho.candidatos.length > 1 ? 'Qual conselho?' : 'De qual conselho?';
    return { status: 'esclarecimento', intencao, confianca, entidades, pergunta, opcoes };
  }
  if (!entidades.data) {
    return { status: 'esclarecimento', intencao, confianca, entidades, pergunta: 'Em qual dia?', opcoes: [] };
  }
  return { status: 'resposta', intencao, confianca, entidades, resposta: responderCarteira(entidades.conselho as string, entidades.data, d) };
}
