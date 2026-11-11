// Pipeline do Vitorio no servidor (B1): classifica, extrai entidades e responde ou pede esclarecimento.
// Puro: recebe os dados já lidos (dicionário, períodos, vigências). Sem SQL montado a partir do texto.
import { classificar, type Intencao } from './classificador.ts';
import { extrairConselho, extrairCs, extrairData, NOMES_DE_MES, type ConselhoRef, type CsRef } from './entidades.ts';
import { normalizarTexto } from './texto.ts';
import { csDaCarteira } from './fonte-cs.ts';
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

export interface Opcao { label: string; valor: string }

export type Saida =
  | { status: 'resposta'; intencao: Intencao; confianca: number; entidades: Entidades; resposta: RespostaTime }
  | { status: 'esclarecimento'; intencao: Intencao; confianca: number; entidades: Entidades; pergunta: string; opcoes: Opcao[] }
  | { status: 'sem_intencao'; intencao: null; confianca: number; entidades: Entidades };

// Até cinco conselhos por pergunta de esclarecimento. Mais que isso: pede mais do nome.
const MAX_OPCOES = 5;
export const OPCAO_NENHUM: Opcao = { label: 'Nenhum desses', valor: 'nenhum' };

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

// Resposta de carteira com o conselho e o CS responsável, para os links da tela.
function respostaCarteiraComVinculos(groupId: string, dataIso: string, d: DadosPipeline): RespostaTime {
  const resp = responderCarteira(groupId, dataIso, d);
  const csId = csDaCarteira(d.vigencias, groupId, dataIso);
  return { ...resp, groupId, csNome: csId === null ? null : d.csPorId[csId] ?? null };
}

// escolhido: group_id que o usuário escolheu numa pergunta de esclarecimento. A pergunta já vem resolvida.
export function responderTexto(texto: string, d: DadosPipeline, escolhido?: string): Saida {
  const hoje = d.hojeIso.slice(0, 10);
  const dataEnt = extrairData(texto, hoje);
  const conselho = extrairConselho(texto, d.conselhosLista, palavrasDeCs(d.csLista));
  const cs = extrairCs(texto, d.csLista);
  const escolhidoValido = !!escolhido && escolhido !== 'nenhum' && !!d.conselhos[escolhido];

  const candidatos = escolhidoValido ? [escolhido as string] : conselho.candidatos;
  const { intencao, confianca } = escolhidoValido
    ? { intencao: 'carteira' as Intencao, confianca: 0.6 }
    : classificar(texto, {
      temConselho: candidatos.length > 0,
      conselhoAmbiguo: candidatos.length > 1,
      temData: !!dataEnt,
      temCs: cs.length > 0,
    });
  const entidades: Entidades = {
    conselho: candidatos.length === 1 ? candidatos[0] : null,
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
  if (candidatos.length !== 1) {
    const ambiguo = candidatos.length > 1;
    if (ambiguo && candidatos.length > MAX_OPCOES) {
      return {
        status: 'esclarecimento',
        intencao,
        confianca,
        entidades,
        pergunta: 'Digite mais do nome do conselho para eu identificar qual é.',
        // Mesmo com muitos candidatos, a saída "Nenhum desses" continua disponível.
        opcoes: [OPCAO_NENHUM],
      };
    }
    const lista = ambiguo
      ? candidatos
      : conselho.ordenados.slice(0, MAX_OPCOES).map((o) => o.group_id);
    return {
      status: 'esclarecimento',
      intencao,
      confianca,
      entidades,
      pergunta: ambiguo ? 'Qual destes conselhos você quer dizer?' : 'De qual conselho?',
      opcoes: [...lista.map((gid) => ({ label: d.conselhos[gid] || gid, valor: gid })), OPCAO_NENHUM],
    };
  }
  const data = entidades.data
    ?? (entidades.mes ? (entidades.mes.slice(0, 7) === hoje.slice(0, 7) ? hoje : ultimoDiaDoMes(entidades.mes)) : hoje);
  return {
    status: 'resposta',
    intencao,
    confianca,
    entidades: { ...entidades, data },
    resposta: respostaCarteiraComVinculos(entidades.conselho as string, data, d),
  };
}
