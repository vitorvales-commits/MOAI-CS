// Intenção "próximas reuniões" da consulta rápida (revisão out/2026, rodada 2, Fase 5; reescrita na Parte A da
// correção). Sem IA: regra fixa. O reconhecimento é por tokens (radical simples, sem acento, minúsculas), e não por
// frase literal. A parte pura não usa banco; o carregamento só faz SELECT.
import type { SupabaseClient } from '@supabase/supabase-js';
import { chaveAgenda, acharChaveTolerante, normalizarApelidos, chavesDoContato } from '../agenda-nomes.ts';
import { APELIDOS_AGENDA } from '../constants.ts';

// Radicais de tempo e de evento. O "s" final de plural já sai ("proximos" vira "proximo", "datas" vira "data").
export const TOKENS_TEMPO = ['proximo', 'proxima', 'quando', 'data', 'dia', 'agenda', 'calendario', 'marcado', 'marcada'];
export const TOKENS_EVENTO = ['conselho', 'reuniao', 'reunioe', 'encontro', 'sessao'];
// Palavras de metas. Quando aparecem, a pergunta é de metas, mesmo com "quando".
const TOKENS_METAS = ['meta', 'bateu', 'bater', 'atingiu', 'cumpriu', 'alcancou', 'desempenho', 'indicador', 'resultado'];

export interface ReuniaoAgenda { conselheiro: string; dataIso: string; status: string | null }

// Vínculos já resolvidos: conselheiros (nome do conselho), membros com o conselheiro do grupo, e cada CS com os membros.
export interface Vinculos {
  conselheiros: string[];
  membros: { nome: string; conselheiro: string | null }[];
  css: { nome: string; membros: string[] }[];
}

export type Entidade =
  | { tipo: 'conselheiro' | 'membro' | 'cs'; nome: string; conselheiros: string[] }
  | { tipo: 'ambiguo'; nome: string; candidatos: string[] };

const STATUS_CANCELADO = ['cancelado'];

export function normalizarBusca(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Quebra em palavras e reduz cada uma ao radical: tira o "s" final de plural quando a palavra tem mais de três letras.
export function tokensDaPergunta(pergunta: string): string[] {
  return normalizarBusca(pergunta)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
}

// Verdadeiro com tempo e evento; ou com tempo sozinho, que a resolução de entidade completa depois
// (ex.: "quando é o Daniel Brayer"). Pergunta de metas nunca entra aqui.
export function reconhecePerguntaReunioes(pergunta: string): boolean {
  const tokens = tokensDaPergunta(pergunta);
  const tempo = tokens.some((t) => TOKENS_TEMPO.includes(t));
  const metas = tokens.some((t) => TOKENS_METAS.includes(t));
  if (metas) return false;
  return tempo;
}

// Um nome aparece na pergunta como palavra inteira, sem acento e sem caixa.
function contemNome(pergunta: string, nome: string): boolean {
  const n = normalizarBusca(nome);
  if (!n) return false;
  const p = normalizarBusca(pergunta);
  const escapado = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapado}($|[^a-z0-9])`).test(p);
}

// Um nome casa por token quando alguma palavra do nome (com quatro letras ou mais) aparece na pergunta.
// Assim "Brayer" sozinho casa com "Daniel Brayer".
function casaPorToken(pergunta: string, nome: string): boolean {
  const tokensPergunta = new Set(tokensDaPergunta(pergunta));
  return normalizarBusca(nome).split(' ')
    .filter((p) => p.length >= 4)
    .some((p) => tokensPergunta.has(p) || tokensPergunta.has(p.endsWith('s') ? p.slice(0, -1) : p));
}

// Ordem: conselheiro, membro, CS (nome completo; o mais longo vence). Sem nome completo, tenta por token entre os
// conselheiros: um só casa e resolve; vários viram ambiguidade, que a resposta trata.
export function resolverEntidade(pergunta: string, v: Vinculos): Entidade | null {
  const porTamanho = <T extends { nome: string }>(lista: T[]) => [...lista].sort((a, b) => b.nome.length - a.nome.length);
  const conselheiro = porTamanho(v.conselheiros.map((nome) => ({ nome }))).find((c) => contemNome(pergunta, c.nome));
  if (conselheiro) return { tipo: 'conselheiro', nome: conselheiro.nome, conselheiros: [conselheiro.nome] };
  const membro = porTamanho(v.membros.filter((m) => m.conselheiro)).find((m) => contemNome(pergunta, m.nome));
  if (membro) return { tipo: 'membro', nome: membro.nome, conselheiros: [membro.conselheiro as string] };
  const cs = porTamanho(v.css).find((c) => contemNome(pergunta, c.nome));
  if (cs) {
    const conselheiros = Array.from(new Set(cs.membros.map((nomeMembro) => v.membros.find((m) => m.nome === nomeMembro)?.conselheiro)
      .filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return { tipo: 'cs', nome: cs.nome, conselheiros };
  }
  const candidatos = v.conselheiros.filter((c) => casaPorToken(pergunta, c)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (candidatos.length === 1) return { tipo: 'conselheiro', nome: candidatos[0], conselheiros: [candidatos[0]] };
  if (candidatos.length > 1) return { tipo: 'ambiguo', nome: candidatos[0], candidatos };
  return null;
}

// Partes da data no fuso de São Paulo, sem depender do fuso do servidor.
const FORMATO_SP = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
});
const SEMANA_PT: Record<string, string> = {
  Sunday: 'Domingo', Monday: 'Segunda', Tuesday: 'Terça', Wednesday: 'Quarta', Thursday: 'Quinta', Friday: 'Sexta', Saturday: 'Sábado',
};
export function partesSP(dataIso: string): { dia: string; mes: string; hora: number; minuto: string; semana: string } {
  const p: Record<string, string> = {};
  FORMATO_SP.formatToParts(new Date(dataIso)).forEach((x) => { p[x.type] = x.value; });
  return { dia: p.day, mes: p.month, hora: Number(p.hour) % 24, minuto: p.minute, semana: SEMANA_PT[p.weekday] || p.weekday };
}

// "9h" para hora cheia, "14h30" com minutos. A hora nunca tem zero à esquerda.
export function formatarHora(hora: number, minuto: string): string {
  return minuto === '00' ? `${hora}h` : `${hora}h${minuto}`;
}

export function formatarLinhaReuniao(dataIso: string): string {
  const p = partesSP(dataIso);
  return `- ${p.dia}/${p.mes} às ${formatarHora(p.hora, p.minuto)} (${p.semana})`;
}

// Reuniões futuras de um conselheiro, sem cancelada, em ordem crescente, no máximo `limite`.
export function proximasDoConselheiro(agenda: ReuniaoAgenda[], conselheiro: string, agoraIso: string, limite = 6): string[] {
  const agora = new Date(agoraIso).getTime();
  return agenda
    .filter((r) => r.conselheiro === conselheiro)
    .filter((r) => !STATUS_CANCELADO.includes(normalizarBusca(r.status || '')))
    .filter((r) => new Date(r.dataIso).getTime() >= agora)
    .sort((a, b) => new Date(a.dataIso).getTime() - new Date(b.dataIso).getTime())
    .slice(0, limite)
    .map((r) => r.dataIso);
}

function blocoConselho(conselheiro: string, datas: string[]): string {
  if (!datas.length) return `Nenhuma reunião futura cadastrada para o conselho ${conselheiro}.`;
  return `📆 Próximas Reuniões:\n\n${datas.map(formatarLinhaReuniao).join('\n')}`;
}

export function responderProximasReunioes(pergunta: string, v: Vinculos, agenda: ReuniaoAgenda[], agoraIso: string): string {
  const entidade = resolverEntidade(pergunta, v);
  if (!entidade) {
    // Sem entidade: os três conselhos com reunião futura mais próxima viram atalhos
    const atalhos = v.conselheiros
      .map((c) => ({ c, datas: proximasDoConselheiro(agenda, c, agoraIso, 1) }))
      .filter((x) => x.datas.length)
      .sort((a, b) => new Date(a.datas[0]).getTime() - new Date(b.datas[0]).getTime())
      .slice(0, 3);
    const linhas = atalhos.map((x) => `- Conselho ${x.c}: ${formatarLinhaReuniao(x.datas[0]).slice(2)}`);
    return 'De qual conselho? Escreva o nome do conselheiro, do membro ou do CS.' +
      (linhas.length ? `\n\n${linhas.join('\n')}` : '');
  }
  if (entidade.tipo === 'ambiguo') {
    const atalhos = entidade.candidatos.map((c) => {
      const datas = proximasDoConselheiro(agenda, c, agoraIso, 1);
      return `- ${c}${datas.length ? `: ${formatarLinhaReuniao(datas[0]).slice(2)}` : ''}`;
    });
    return `Encontrei mais de um conselho com esse nome:\n\n${atalhos.join('\n')}`;
  }
  if (entidade.tipo !== 'cs') {
    return blocoConselho(entidade.conselheiros[0], proximasDoConselheiro(agenda, entidade.conselheiros[0], agoraIso));
  }
  // CS com vários conselhos: um bloco por conselho, precedido da linha com o nome do conselho
  if (!entidade.conselheiros.length) return `Nenhum conselho na carteira de ${entidade.nome}.`;
  return entidade.conselheiros.map((c) => `Conselho ${c}\n${blocoConselho(c, proximasDoConselheiro(agenda, c, agoraIso))}`).join('\n\n');
}

// Carrega os vínculos e a agenda do banco. Somente SELECT, em páginas de 1000 linhas.
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
// Nome do conselheiro no título do grupo: entre "| " e " (" (formato atual) ou antes de " [" (formato antigo).
const parseContato = (titulo: string | null): string | null => {
  const t = String(titulo || '');
  const m = /\|\s*(.+?)(?:\s*\(|$)/.exec(t);
  if (m && m[1].trim()) return m[1].trim();
  return t.split(' [')[0].trim() || null;
};

// Monta os vínculos a partir do título do grupo ("Nível | Conselheiro (CS)"), fonte única de quem é o CS de cada
// conselho. O nome da agenda é digitado à mão ("Kadydja Albuquerque" para o contato "Kadydja"), então passa pelo
// mesmo casamento de lib/agenda-nomes.ts e vira o nome do contato do título. O histórico de GTD não entra: o
// campo membro dele carrega anotações como "Kadydja (?)" e fez o conselho sumir da carteira do CS na consulta.
export function montarVinculos(
  agendaRows: { conselheiro_nome: string | null; data_iso: string | null; status: string | null }[],
  grupos: { group_id: string; titulo: string | null; is_repo?: boolean | null }[],
  membrosRows: { nome: string; group_id: string }[],
): { vinculos: Vinculos; agenda: ReuniaoAgenda[] } {
  const apelidos = normalizarApelidos(APELIDOS_AGENDA);
  const ativos = grupos.filter((g) => !g.is_repo && parseContato(g.titulo));
  const contatos = Array.from(new Set(ativos.map((g) => parseContato(g.titulo) as string)));
  const dono = new Map<string, string>(); // chave de agenda -> contato do título
  contatos.forEach((c) => chavesDoContato(c, apelidos).forEach((k) => { if (!dono.has(k)) dono.set(k, c); }));
  const canonico = (nome: string): string => {
    const k = chaveAgenda(nome);
    const achada = dono.has(k) ? k : acharChaveTolerante(k, dono.keys());
    return (achada && dono.get(achada)) || nome;
  };
  const csDoGrupo = (titulo: string | null) => /(([^)]*))/.exec(String(titulo || ''))?.[1].trim() || '';
  const grupoPorId = new Map(ativos.map((g) => [g.group_id, g]));
  const membros = membrosRows
    .filter((m) => grupoPorId.has(m.group_id))
    .map((m) => ({ nome: m.nome, conselheiro: parseContato(grupoPorId.get(m.group_id)!.titulo) }));
  // O próprio conselheiro entra como membro do grupo, para o CS resolver o conselho mesmo sem linha em conselhos_membros.
  ativos.forEach((g) => membros.push({ nome: parseContato(g.titulo) as string, conselheiro: parseContato(g.titulo) }));
  const porCs = new Map<string, Set<string>>();
  ativos.forEach((g) => {
    const cs = csDoGrupo(g.titulo);
    if (!cs) return;
    if (!porCs.has(cs)) porCs.set(cs, new Set());
    porCs.get(cs)!.add(parseContato(g.titulo) as string);
    membrosRows.filter((m) => m.group_id === g.group_id).forEach((m) => porCs.get(cs)!.add(m.nome));
  });
  const agenda: ReuniaoAgenda[] = agendaRows
    .filter((a) => a.conselheiro_nome && a.data_iso)
    .map((a) => ({ conselheiro: canonico(a.conselheiro_nome as string), dataIso: a.data_iso as string, status: a.status ?? null }));
  const conselheiros = Array.from(new Set([...contatos, ...agenda.map((a) => a.conselheiro)]));
  return { vinculos: { conselheiros, membros, css: Array.from(porCs.entries()).map(([nome, set]) => ({ nome, membros: Array.from(set) })) }, agenda };
}

export async function carregarReunioes(supabase: SupabaseClient): Promise<{ vinculos: Vinculos; agenda: ReuniaoAgenda[] }> {
  const [agendaRows, grupos, membrosRows] = await Promise.all([
    todas((de, ate) => supabase.from('agenda_conselhos_items').select('conselheiro_nome, data_iso, status').order('id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_grupos').select('group_id, titulo, is_repo').order('group_id').range(de, ate)),
    todas((de, ate) => supabase.from('conselhos_membros').select('nome, group_id').order('id').range(de, ate)),
  ]);
  return montarVinculos(agendaRows, grupos, membrosRows);
}

// Intenção registrada em lib/consulta.ts (INTENCOES), antes da de metas.
export const intencaoProximasReunioes = {
  nome: 'proximas_reunioes',
  reconhece: reconhecePerguntaReunioes,
  responder: async (supabase: SupabaseClient, pergunta: string, _roster: unknown, hoje: Date = new Date()) => {
    const { vinculos, agenda } = await carregarReunioes(supabase);
    const resposta = responderProximasReunioes(pergunta, vinculos, agenda, hoje.toISOString());
    return { resposta, resource: 'proximas_reunioes' };
  },
};
