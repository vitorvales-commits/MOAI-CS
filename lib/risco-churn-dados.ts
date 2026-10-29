// Monta os sinais de risco de churn por membro a partir do que já está espelhado no banco (29/10/2026) e aplica
// calcularRisco. Mensalidade e data de início da fidelidade não existem em tabela espelhada: a fidelidade vem de
// visitas_churn.fim_fidelidade (só para quem já teve pedido de visita) e a exposição fica nula sem mensalidade.
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDadosBrutos, normalizeNome, parseTituloConselho } from './reports';
import { listarAlertasNps } from './alertas-nps-dados';
import { hojeSP } from './gtd-prazos';
import { MESES_ORDEM } from './constants';
import {
  calcularRisco, mesclarConfig, ordenarPorUrgencia, resumirCarteira, RISCO_CONFIG_PADRAO,
  type ConfigRisco, type MembroComRisco, type SinaisMembro,
} from './risco-churn';

// Quem já saiu, congelou ou não é do conselho fica fora do universo de risco.
const FORA = new Set(['churn', 'retirado', 'congelado', 'cogelado', 'não era do conselho', 'nao era do conselho']);
// Só status de fato ocorrido entra na leitura de presença (Confirmado e Agd. Confirmação são futuros).
const APURADOS = new Set(['presente', 'ausente', 'não vai', 'nao vai', 'reposição', 'reposicao', 'sem retorno']);
const mesIdx = (m: string) => MESES_ORDEM.indexOf(m);

export async function carregarConfigRisco(sb: SupabaseClient): Promise<{ config: ConfigRisco; origem: 'banco' | 'padrao'; linhas: { chave: string; valor: number; descricao: string }[] }> {
  const { data, error } = await sb.from('risco_churn_config').select('chave, valor, descricao');
  // Tabela ainda não criada (migration pendente) ou sem permissão: o padrão do código vale.
  if (error || !data?.length) return { config: { ...RISCO_CONFIG_PADRAO }, origem: 'padrao', linhas: [] };
  return { config: mesclarConfig(data), origem: 'banco', linhas: data.map((l: any) => ({ chave: l.chave, valor: Number(l.valor), descricao: l.descricao })) };
}

// semanasReportAtrasadoPorCS: null quando o report não pôde ser lido (o sinal fica ausente em vez de zero).
export async function calcularRiscoCarteira(sb: SupabaseClient, semanasReportAtrasadoPorCS: Record<string, number> | null = null) {
  const hoje = hojeSP();
  const [dados, { config, origem, linhas }, alertas, visitas] = await Promise.all([
    getDadosBrutos(sb), carregarConfigRisco(sb),
    listarAlertasNps(sb, { apenasAbertos: true }).catch(() => null),
    sb.rpc('visitas_resultado').then((r: any) => (r.error ? null : (r.data || []) as any[])),
  ]);

  const grupos = new Map<string, { titulo: string; cs: string; nivel: string }>();
  (dados.conselhosGrupos as any[]).forEach((g) => {
    const p = parseTituloConselho(g.titulo);
    if (p) grupos.set(g.group_id, { titulo: g.titulo, cs: p.cs, nivel: p.nivel });
  });
  const statusPorMembro = new Map<number, [string, string][]>();
  (dados.conselhosStatusMensal as any[]).forEach((s) => {
    if (mesIdx(s.mes) < 0 || !s.status) return;
    const l = statusPorMembro.get(s.membro_id) || [];
    l.push([s.mes, s.status]);
    statusPorMembro.set(s.membro_id, l);
  });
  const npsPorMembro = new Map<string, { nota: number; quando: string }>();
  (dados.npsConselhos as any[]).forEach((n) => {
    const nota = n.nota_conselho ?? n.nota_conselheiro;
    if (nota === null || nota === undefined || !n.group_id) return;
    const k = n.group_id + '|' + normalizeNome(n.respondente_nome);
    const quando = String(n.monday_updated_at || n.synced_at || '');
    const atual = npsPorMembro.get(k);
    if (!atual || quando > atual.quando) npsPorMembro.set(k, { nota: Number(nota), quando });
  });
  const alertasPorGrupo = new Map<string, number>();
  (alertas || []).forEach((a) => alertasPorGrupo.set(a.groupId, (alertasPorGrupo.get(a.groupId) || 0) + 1));
  const visitasPorMembro = new Map<number, any[]>();
  (visitas || []).forEach((v) => { if (v.membro_id !== null && v.membro_id !== undefined) visitasPorMembro.set(Number(v.membro_id), [...(visitasPorMembro.get(Number(v.membro_id)) || []), v]); });

  const membros: MembroComRisco[] = [];
  (dados.conselhosMembros as any[]).forEach((m) => {
    const g = grupos.get(m.group_id);
    if (!g) return;
    const hist = (statusPorMembro.get(m.id) || []).sort((a, b) => mesIdx(a[0]) - mesIdx(b[0])).filter((x) => norm(x[1]) !== 'não teve');
    const atual = hist.length ? hist[hist.length - 1][1] : null;
    if (atual && FORA.has(norm(atual))) return;
    const vs = visitasPorMembro.get(Number(m.id)) || [];
    const comFim = vs.filter((v) => v.fim_fidelidade).sort((a, b) => String(b.data_pedido || '').localeCompare(String(a.data_pedido || '')))[0];
    const nps = npsPorMembro.get(m.group_id + '|' + normalizeNome(m.nome));
    const sinais: SinaisMembro = {
      membroId: m.id, nome: m.nome, groupId: m.group_id, conselho: g.titulo, cs: g.cs,
      notaNps: nps ? nps.nota : null,
      alertasNpsAbertos: alertas === null ? null : (alertasPorGrupo.get(m.group_id) || 0),
      statusAtual: norm(m.status_pagamento) === 'inadimplente' ? 'Inadimplente' : atual,
      statusRecentes: hist.map((x) => x[1]).filter((s) => APURADOS.has(norm(s))),
      semanasReportAtrasadoCs: semanasReportAtrasadoPorCS === null ? null : (semanasReportAtrasadoPorCS[g.cs] ?? 0),
      fimFidelidade: comFim ? String(comFim.fim_fidelidade).slice(0, 10) : null,
      mensalidade: null,
      visitaAberta: vs.some((v) => v.encerrada === false),
    };
    membros.push({ ...sinais, risco: calcularRisco(sinais, hoje, config) });
  });

  const ordenados = ordenarPorUrgencia(membros);
  return { hoje, configOrigem: origem, configLinhas: linhas, membros: ordenados, resumo: resumirCarteira(ordenados) };
}
const norm = (s: string | null | undefined) => String(s || '').trim().toLowerCase();

// Fonte da fila de ação do gestor: crítico sem visita aberta.
export function criticosSemVisita(membros: MembroComRisco[]) {
  return membros.filter((m) => m.risco.nivel === 'critico' && !m.risco.semDados && !m.visitaAberta)
    .map((m) => ({ membroId: m.membroId, nome: m.nome, cs: m.cs, groupId: m.groupId, conselho: m.conselho, pontos: m.risco.pontos,
      motivo: m.risco.motivos.map((x) => x.texto).slice(0, 2).join('; '), mesesRestantes: m.risco.mesesRestantesFidelidade }));
}
