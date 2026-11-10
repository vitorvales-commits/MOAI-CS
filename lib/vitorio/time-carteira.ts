// Respostas de time e carteira do Vitorio (B1, parte puro). Sem banco: recebe os dados já lidos.
// Elenco de um mês: cs_periodos antes da carga, vigência depois, CS ativos hoje no mês corrente.
// Carteira de um conselho: vigência a partir da carga; antes, o Vitorio diz que não tem o registro.
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

function nomesDoIds(ids: number[], csPorId: Record<number, string>): string[] {
  return ids.map((id) => csPorId[id]).filter((n): n is string => !!n).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// "Quem era CS em setembro de 2026?"
export function responderElenco(mesIso: string, d: DadosTime): RespostaTime {
  const f = fonteParaData(mesIso, 'elenco', d.hojeIso);
  let nomes: string[];
  if (f.fonte === 'vigencia') nomes = nomesDoIds(csVigentes(d.vigencias, mesIso), d.csPorId);
  else if (f.fonte === 'ativos_hoje') nomes = d.ativosHoje.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
  else nomes = elencoAntesDaCarga(d.periodos, mesIso, d.hojeIso, d.ativosHoje);
  const mes = mesIso.slice(0, 7);
  const texto = nomes.length
    ? `CS no período ${mes}: ${nomes.join(', ')}.`
    : `Não encontrei CS registrado no período ${mes}.`;
  return { texto, comoCheguei: `Fonte: ${f.rotulo}. Período ${mes}.`, temRegistro: true };
}

// "Quem cuida do conselho X em novembro?"
export function responderCarteira(groupId: string, dataIso: string, d: DadosTime): RespostaTime {
  const f = fonteParaData(dataIso, 'carteira', d.hojeIso);
  const titulo = d.conselhos[groupId] || 'esse conselho';
  if (f.fonte === 'sem_registro') {
    return {
      texto: `Não tenho esse registro: a carteira de ${titulo} em ${dataIso.slice(0, 10)} é anterior à carga de 30/10/2026, e antes dela não há histórico de carteira.`,
      comoCheguei: `Fonte: ${f.rotulo}. Data ${dataIso.slice(0, 10)}.`,
      temRegistro: false,
    };
  }
  const id = csDaCarteira(d.vigencias, groupId, dataIso);
  const nome = id === null ? null : d.csPorId[id] || null;
  return {
    texto: nome
      ? `${titulo} era cuidado por ${nome} em ${dataIso.slice(0, 10)}.`
      : `Não encontrei quem cuidava de ${titulo} em ${dataIso.slice(0, 10)}.`,
    comoCheguei: `Fonte: ${f.rotulo}. Data ${dataIso.slice(0, 10)}.`,
    temRegistro: !!nome,
  };
}
