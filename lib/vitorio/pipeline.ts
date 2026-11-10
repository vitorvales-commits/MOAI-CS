// Pipeline do Vitorio no servidor (B1, começo): classifica, extrai entidades e responde ou pede esclarecimento.
// Puro: recebe os dados já lidos (dicionário, períodos, vigências). Sem SQL montado a partir do texto.
import { classificar, type Intencao } from './classificador.ts';
import { extrairConselho, extrairCs, extrairData, NOMES_DE_MES, type ConselhoRef, type CsRef } from './entidades.ts';
import { normalizarTexto } from './texto.ts';
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

// Último dia do mês AAAA-MM-01 -> AAAA-MM-DD.
function ultimoDiaDoMes(mesIso: string): string {
  const [y, m] = mesIso.slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Nomes de CS (nome curto e apelidos) e nomes de mês: essas palavras não contam para reconhecer conselho.
function palavrasDeCs(csLista: CsRef[]): Set<string> {
  const s = new Set<string>(NOMES_DE_MES);
  csLista.forEach((c) => [c.nome_curto, ...c.apelidos].forEach((n) => normalizarTexto(n).split(' ').forEach((p) => p && s.add(p))));
  return s;
}

export function responderTexto(texto: string, d: DadosPipeline): Saida {
  const hoje = d.hojeIso.slice(0, 10);
  const dataEnt = extrairData(texto, hoje);
  const conselho = extrairConselho(texto, d.conselhosLista, palavrasDeCs(d.csLista));
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

  // carteira: precisa de conselho. Sem data, usa hoje; com só o mês, o último dia do mês (antes da carga, sem registro).
  if (conselho.candidatos.length !== 1) {
    const opcoes = conselho.candidatos.length > 1
      ? conselho.candidatos
      : conselho.ordenados.slice(0, MAX_OPCOES).map((o) => o.group_id);
    return {
      status: 'esclarecimento',
      intencao,
      confianca,
      entidades,
      pergunta: conselho.candidatos.length > 1 ? 'Qual conselho?' : 'De qual conselho?',
      opcoes: opcoes.slice(0, MAX_OPCOES).map((gid) => ({ label: d.conselhos[gid] || gid, valor: gid })),
    };
  }
  const data = entidades.data
    ?? (entidades.mes ? (entidades.mes.slice(0, 7) === hoje.slice(0, 7) ? hoje : ultimoDiaDoMes(entidades.mes)) : hoje);
  return {
    status: 'resposta',
    intencao,
    confianca,
    entidades: { ...entidades, data },
    resposta: responderCarteira(entidades.conselho as string, data, d),
  };
}
