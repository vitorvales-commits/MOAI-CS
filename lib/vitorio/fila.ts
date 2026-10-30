// Fonte "Dúvidas sem resposta" da Fila de ação do gestor (30/10/2026). Regra determinística: uma entrada por consulta
// normalizada que ficou sem resposta (resultado nada) ou foi marcada como não útil pelo menos VITORIO_FILA_MIN_OCORRENCIAS
// vezes nos últimos VITORIO_FILA_JANELA_DIAS dias. Consultas já tratadas (pergunta extra cadastrada) não contam.
import type { SupabaseClient } from '@supabase/supabase-js';
import { VITORIO_FILA_JANELA_DIAS, VITORIO_FILA_MIN_OCORRENCIAS } from '../constants.ts';

export type ConsultaVitorio = { criado_em: string; consulta_normalizada: string; resultado: string; util: boolean | null; tratada_em: string | null };
export type DuvidaSemResposta = { consulta: string; ocorrencias: number; ultima: string; perfis: string[] };

export function duvidasSemResposta(linhas: (ConsultaVitorio & { perfil?: string })[], agora: Date = new Date()): DuvidaSemResposta[] {
  const desde = agora.getTime() - VITORIO_FILA_JANELA_DIAS * 86_400_000;
  const por = new Map<string, DuvidaSemResposta>();
  linhas.forEach((l) => {
    if (l.tratada_em) return;
    if (!(l.resultado === 'nada' || l.util === false)) return;
    const t = new Date(l.criado_em).getTime();
    if (!(t >= desde)) return;
    const d = por.get(l.consulta_normalizada) || { consulta: l.consulta_normalizada, ocorrencias: 0, ultima: l.criado_em, perfis: [] };
    d.ocorrencias++;
    if (l.criado_em > d.ultima) d.ultima = l.criado_em;
    if (l.perfil && !d.perfis.includes(l.perfil)) d.perfis.push(l.perfil);
    por.set(l.consulta_normalizada, d);
  });
  return [...por.values()].filter((d) => d.ocorrencias >= VITORIO_FILA_MIN_OCORRENCIAS)
    .sort((a, b) => b.ocorrencias - a.ocorrencias || (a.ultima < b.ultima ? 1 : -1));
}

// Lê as consultas da janela (a tabela só é legível por gestor, via RLS) e aplica a regra.
export async function listarDuvidasSemResposta(sb: SupabaseClient): Promise<DuvidaSemResposta[]> {
  const desde = new Date(Date.now() - VITORIO_FILA_JANELA_DIAS * 86_400_000).toISOString();
  const { data, error } = await sb.from('vitorio_consultas')
    .select('criado_em, perfil, consulta_normalizada, resultado, util, tratada_em')
    .gte('criado_em', desde).is('tratada_em', null).or('resultado.eq.nada,util.eq.false').limit(2000);
  // Antes de a migração 20261030_vitorio.sql ser aplicada a tabela não existe: a fila fica vazia em vez de quebrar a seção.
  if (error && /does not exist|schema cache/i.test(error.message)) return [];
  if (error) throw new Error('Erro ao ler vitorio_consultas: ' + error.message);
  return duvidasSemResposta((data || []) as any[]);
}
