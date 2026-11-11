// Respostas de time e carteira do Vitorio (B1, parte puro). Sem banco: recebe os dados já lidos.
// Elenco de um mês: histórico de períodos antes da carga, registro depois, CS ativos hoje no mês corrente.
// Carteira de um conselho: registro a partir da carga; antes, o Vitorio diz que não há registro.
// Texto visível: datas em português ("05/11/2026", "setembro de 2026"), nunca AAAA-MM-DD.
import { fonteParaData, elencoAntesDaCarga, csDaCarteira, csVigentes, type VigenciaConselho } from './fonte-cs.ts';
import type { LinhaPeriodo } from '../cs-periodos.ts';
import { tituloDeExibicao } from './titulo.ts';

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
  // Texto para o usuário, em "Como cheguei nisso"
  comoCheguei: string;
  // Rótulo técnico da fonte, para o log e os testes
  fonteTecnica: string;
  temRegistro: boolean;
  // Carteira: conselho e CS responsável, para a tela montar os links (sem deduzir nada do texto)
  groupId?: string | null;
  csNome?: string | null;
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
  return { texto, comoCheguei: `Fonte: ${f.rotuloUsuario}. Período: ${mes}.`, fonteTecnica: f.rotulo, temRegistro };
}

// "Quem cuida do conselho X em novembro?" Verbo segue a data: "estava" para antes de hoje, "está" para hoje ou depois.
export function responderCarteira(groupId: string, dataIso: string, d: DadosTime): RespostaTime {
  const f = fonteParaData(dataIso, 'carteira', d.hojeIso);
  // Título sem o CS entre parênteses: o parêntese é o CS atual, e numa data passada pode não bater.
  const titulo = tituloDeExibicao(d.conselhos[groupId] || 'esse conselho');
  const data = dataBR(dataIso);
  if (f.fonte === 'sem_registro') {
    return {
      texto: `Não tenho esse registro: o dash só passou a guardar quem cuida de cada conselho em 30/10/2026. Para ${data}, consulte o gestor da área ou o board do Monday.`,
      comoCheguei: `Fonte: ${f.rotuloUsuario}. Data: ${data}.`,
      fonteTecnica: f.rotulo,
      temRegistro: false,
    };
  }
  const id = csDaCarteira(d.vigencias, groupId, dataIso);
  const nome = id === null ? null : d.csPorId[id] || null;
  const verbo = dataIso.slice(0, 10) >= d.hojeIso ? 'está' : 'estava';
  return {
    texto: nome
      ? `O conselho ${titulo} ${verbo} com ${nome} em ${data}.`
      : `Não encontrei quem estava com o conselho ${titulo} em ${data}.`,
    comoCheguei: `Fonte: ${f.rotuloUsuario}. Data: ${data}.`,
    fonteTecnica: f.rotulo,
    temRegistro: !!nome,
  };
}
