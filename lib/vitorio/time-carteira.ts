// Respostas de time e carteira do Vitorio (B1, parte puro). Sem banco: recebe os dados já lidos.
// Elenco de um mês: cs_periodos antes da carga, vigência depois, CS ativos hoje no mês corrente.
// Carteira de um conselho: vigência a partir da carga; antes, o Vitorio diz que não tem o registro.
// Texto visível: datas em português ("05/11/2026", "setembro de 2026"), nunca AAAA-MM-DD.
import { fonteParaData, elencoAntesDaCarga, csDaCarteira, csVigentes, type VigenciaConselho } from './fonte-cs.ts';
import type { LinhaPeriodo } from '../cs-periodos.ts';

export interface DadosTime {
  hojeIso: string;
  periodos: LinhaPeriodo[];
  ativosHoje: string[];
  vigencias: VigenciaConselho[];
  // id de canonico.cs -> nome curto (lista completa, ativos e ex CS)
  csPorId: Record<number, string>;
  // group_id -> título do conselho
  conselhos: Record<string, string>;
}

export interface RespostaTime {
  texto: string;
  // Fonte usada, para o bloco "Como cheguei nisso"
  comoCheguei: string;
  temRegistro: boolean;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "2026-11-05" -> "05/11/2026"
export function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// "2026-09-01" ou "2026-09" -> "setembro de 2026"
export function mesPorExtenso(iso: string): string {
  const [a, m] = iso.slice(0, 7).split('-');
  return `${MESES[Number(m) - 1]} de ${a}`;
}

function nomesOrdenados(nomes: string[]): string[] {
  return nomes.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function nomesDoIds(ids: number[], csPorId: Record<number, string>): string[] {
  return nomesOrdenados(ids.map((id) => csPorId[id]).filter((n): n is string => !!n));
}

// "Quem era CS em setembro de 2026?"
export function responderElenco(mesIso: string, d: DadosTime): RespostaTime {
  const f = fonteParaData(mesIso, 'elenco', d.hojeIso);
  let nomes: string[];
  if (f.fonte === 'vigencia') nomes = nomesDoIds(csVigentes(d.vigencias, mesIso), d.csPorId);
  else if (f.fonte === 'ativos_hoje') nomes = nomesOrdenados(d.ativosHoje);
  else nomes = nomesOrdenados(elencoAntesDaCarga(d.periodos, mesIso, d.hojeIso, d.ativosHoje));
  const mes = mesPorExtenso(mesIso);
  const temRegistro = nomes.length > 0;
  const texto = temRegistro
    ? `CS em ${mes}: ${nomes.join(', ')}.`
    : `Não encontrei CS registrado em ${mes}.`;
  return { texto, comoCheguei: `Fonte: ${f.rotulo}. Período: ${mes}.`, temRegistro };
}

// "Quem cuida do conselho X em novembro?" O verbo segue a data: "é" para hoje ou depois, "era" para antes.
export function responderCarteira(groupId: string, dataIso: string, d: DadosTime): RespostaTime {
  const f = fonteParaData(dataIso, 'carteira', d.hojeIso);
  const titulo = d.conselhos[groupId] || 'esse conselho';
  const data = dataBR(dataIso);
  if (f.fonte === 'sem_registro') {
    return {
      texto: `Sobre ${titulo} em ${data}: o dash só passou a guardar quem cuida de cada conselho em 30/10/2026, então não tenho esse registro.`,
      comoCheguei: `Fonte: ${f.rotulo}. Data: ${data}.`,
      temRegistro: false,
    };
  }
  const id = csDaCarteira(d.vigencias, groupId, dataIso);
  const nome = id === null ? null : d.csPorId[id] || null;
  const verbo = dataIso.slice(0, 10) >= d.hojeIso ? 'é cuidado por' : 'era cuidado por';
  return {
    texto: nome
      ? `${titulo} ${verbo} ${nome} em ${data}.`
      : `Não encontrei quem cuidava de ${titulo} em ${data}.`,
    comoCheguei: `Fonte: ${f.rotulo}. Data: ${data}.`,
    temRegistro: !!nome,
  };
}
