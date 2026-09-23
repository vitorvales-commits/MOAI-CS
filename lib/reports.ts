// Port do Code.gs original (Apps Script) para o novo stack Next.js + Supabase.
// Mesma lógica de negócio do arquivo "Code.Gs" no projeto MOAI — só troca a origem dos dados
// (Monday API -> Postgres, já espelhado pela Edge Function sync-monday) e corrige o bug do
// dia 31 fixo em periodoDatas (ver seção "Bug crítico" em claude/migracao_vercel_supabase.md).
//
// Este arquivo não usa cache (CacheService/planilha do Apps Script não existem aqui) porque
// ler do Postgres já é rápido o bastante — era o Monday que exigia cache agressivo.

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import {
  MESES_ORDEM, PRODUCT_PRICES, CHURN_EXCLUIR, ROUNDS_STATUS_VALIDO, UD_STATUS_VALIDO,
  STATUS_PRESENTE, STATUS_AUSENTE_SET, STATUS_NAO_ERA, STATUS_CONFIRMADO,
  AGENDA_STATUS_CANCELADO, FEEDBACK_CATEGORIAS, EX_MEMBROS_SEM_CONTA, APELIDOS_AGENDA,
  PESOS_SCORE_CS, FOTOS_CS,
} from './constants';

// ============ util ============

export function normalizeNome(s: any): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function nomeBateColunaPessoa(textoColuna: string | null, nomeCompletoCS: string | null): boolean {
  if (!textoColuna || !nomeCompletoCS) return false;
  const alvo = normalizeNome(nomeCompletoCS);
  return textoColuna.split(',').map((s) => normalizeNome(s)).includes(alvo);
}

function tituloContemApelido(titulo: string, apelido: string | null): boolean {
  if (!titulo || !apelido) return false;
  return normalizeNome(titulo).includes('(' + normalizeNome(apelido) + ')');
}

function extrairContatoDoTitulo(titulo: string): string | null {
  if (!titulo) return null;
  const t = titulo.replace(/\[?congelado\]?/i, '').trim();
  const m = t.match(/^(.*?)\s*\|\s*(.*?)\s*\((.*?)\)\s*$/i);
  if (!m) return null;
  return m[2].trim();
}

// BUG FIX (17/09/2026): a versão anterior fixava o dia 31 como último dia de qualquer mês,
// gerando datas inválidas tipo "2026-09-31" (erro Postgres 22008) sempre que o mês tinha menos
// de 31 dias. Agora calcula o último dia real (cobre os 12 meses e ano bissexto) usando o
// truque do dia 0 do mês seguinte.
export function periodoDatas(seletorMes: string, ano: number) {
  const geral = seletorMes === 'Visão Geral';
  if (geral) return { mesInicio: `${ano}-01-01`, mesFim: `${ano}-12-31`, geral };
  const mesIdx = MESES_ORDEM.indexOf(seletorMes);
  if (mesIdx === -1) throw new Error('Mês inválido: ' + seletorMes);
  const mm = String(mesIdx + 1).padStart(2, '0');
  const ultimoDia = new Date(ano, mesIdx + 1, 0).getDate();
  const dd = String(ultimoDia).padStart(2, '0');
  return { mesInicio: `${ano}-${mm}-01`, mesFim: `${ano}-${mm}-${dd}`, geral };
}

function filtrarPorMesSeguro<T extends { mes_grupo_titulo: string }>(rows: T[], mes: string): T[] {
  const mesUp = mes.trim().toUpperCase();
  const exato = rows.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase() === mesUp);
  if (exato.length > 0) return exato;
  return rows.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase().indexOf(mesUp) !== -1);
}
function filtrarAnoSeguro<T extends { mes_grupo_titulo: string }>(rows: T[]): T[] {
  return rows.filter((r) => MESES_ORDEM.some((m) => (r.mes_grupo_titulo || '').trim().toUpperCase() === m.toUpperCase()));
}
function filtrarPorMesAnoFlexivel<T extends { mes_grupo_titulo: string }>(rows: T[], mes: string, ano: number): T[] {
  const alvo1 = (mes + ' ' + ano).toUpperCase();
  const comAno = rows.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase() === alvo1);
  if (comAno.length > 0) return comAno;
  const alvo2 = mes.trim().toUpperCase();
  return rows.filter((r) => (r.mes_grupo_titulo || '').trim().toUpperCase() === alvo2);
}
function filtrarAnoFlexivel<T extends { mes_grupo_titulo: string }>(rows: T[], ano: number): T[] {
  return rows.filter((r) => {
    const t = (r.mes_grupo_titulo || '').trim().toUpperCase();
    return MESES_ORDEM.some((m) => t === (m.toUpperCase() + ' ' + ano) || t === m.toUpperCase());
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============ CS list ============

export type CSConfig = { nome: string; nomeCompleto: string; userId: number | null; apelidoConselho: string | null; vezesDestaque: number; fotoUrl: string | null };

export async function getCSListCompleto(sb: SupabaseClient): Promise<CSConfig[]> {
  const { data, error } = await sb.from('cs_config').select('*').eq('ativo', true).order('nome');
  if (error) throw new Error('Erro ao buscar cs_config: ' + error.message);
  return (data || []).map((r: any) => ({
    nome: r.nome, nomeCompleto: r.nome_completo, userId: r.monday_user_id,
    apelidoConselho: r.apelido_conselho, vezesDestaque: r.vezes_destaque || 0,
    fotoUrl: FOTOS_CS[r.nome] || null,
  }));
}

export async function getCSListParaAgregados(sb: SupabaseClient): Promise<CSConfig[]> {
  const { data, error } = await sb.from('cs_config').select('*').order('nome');
  if (error) throw new Error('Erro ao buscar cs_config: ' + error.message);
  const ativos = (data || []).map((r: any) => ({
    nome: r.nome, nomeCompleto: r.nome_completo, userId: r.monday_user_id,
    apelidoConselho: r.apelido_conselho, vezesDestaque: r.vezes_destaque || 0,
    fotoUrl: FOTOS_CS[r.nome] || null,
  }));
  const exMembros = (EX_MEMBROS_SEM_CONTA as Omit<CSConfig, 'fotoUrl'>[]).map((m) => ({ ...m, fotoUrl: FOTOS_CS[m.nome] || null }));
  return ativos.concat(exMembros);
}

export async function getVezesDestaque(sb: SupabaseClient, nome: string): Promise<number> {
  const { data } = await sb.from('cs_config').select('vezes_destaque').eq('nome', nome).maybeSingle();
  return data ? (data.vezes_destaque || 0) : 0;
}
// Única escrita do app: passa pela função set_destaque (SECURITY DEFINER), que faz uma segunda
// checagem de autorização dentro do banco (is_moai_user()), garante o intervalo permitido e grava
// no log de auditoria — cs_config não tem policy de UPDATE direto, só SELECT (ver migração
// secure_set_destaque_rpc), então um .update() direto aqui não escreveria nada.
export async function setVezesDestaque(sb: SupabaseClient, nome: string, vezes: number): Promise<number> {
  const { data, error } = await sb.rpc('set_destaque', { p_nome: nome, p_valor: Math.round(Number(vezes) || 0) });
  if (error) throw new Error('Erro ao salvar vezes_destaque: ' + error.message);
  return data as number;
}

// ============ controle de perfis (aba do gestor) ============
// Roster ADMIN (ativos e inativos juntos, pra tela de toggle) — diferente de getCSListCompleto
// (só ativo=true, usado pelo resto do app). cs_config já tem policy de SELECT liberada pra
// qualquer authenticated, então um select direto funciona; a restrição de quem pode VER essa
// lista com inativos e quem pode TOGGLAR fica a cargo da rota de API (checa isGestor antes).
export type CSRosterAdminItem = { nome: string; nomeCompleto: string; ativo: boolean };
export async function getCSRosterAdmin(sb: SupabaseClient): Promise<CSRosterAdminItem[]> {
  const { data, error } = await sb.from('cs_config').select('nome, nome_completo, ativo').order('nome');
  if (error) throw new Error('Erro ao buscar cs_config: ' + error.message);
  return (data || []).map((r: any) => ({ nome: r.nome, nomeCompleto: r.nome_completo, ativo: !!r.ativo }));
}
// set_cs_ativo (SECURITY DEFINER) checa is_gestor() de novo dentro do banco e grava auditoria —
// mesmo padrão de setVezesDestaque/set_destaque, só que restrito a gestor (não a qualquer moai
// user), já que inativar um CS tira ele do roster corrente da equipe inteira.
export async function setCSAtivo(sb: SupabaseClient, nome: string, ativo: boolean): Promise<boolean> {
  const { data, error } = await sb.rpc('set_cs_ativo', { p_nome: nome, p_ativo: ativo });
  if (error) throw new Error('Erro ao alterar status do CS: ' + error.message);
  return data as boolean;
}

// gestores: tabela sem NENHUMA policy (RLS deny-all) — só dá pra ler/escrever via essas três
// funções SECURITY DEFINER (listar_gestores/adicionar_gestor/remover_gestor), que checam
// is_gestor() dentro do banco antes de qualquer coisa.
export type GestorItem = { email: string; nome: string | null; criadoEm: string };
export async function listarGestores(sb: SupabaseClient): Promise<GestorItem[]> {
  const { data, error } = await sb.rpc('listar_gestores');
  if (error) throw new Error('Erro ao listar gestores: ' + error.message);
  return (data || []).map((r: any) => ({ email: r.email, nome: r.nome, criadoEm: r.criado_em }));
}
export async function adicionarGestor(sb: SupabaseClient, email: string): Promise<void> {
  const { error } = await sb.rpc('adicionar_gestor', { p_email: email });
  if (error) throw new Error(error.message);
}
export async function removerGestor(sb: SupabaseClient, email: string): Promise<void> {
  const { error } = await sb.rpc('remover_gestor', { p_email: email });
  if (error) throw new Error(error.message);
}

// ============ busca única de dados brutos (equivalente a getDadosBrutos_) ============
// Tabelas são pequenas o bastante (centenas de linhas) pra buscar por inteiro e filtrar em
// memória, com .range() explícito pra nunca esbarrar no limite default de 1000 linhas do
// PostgREST (mesma lição da correção de paginação feita na Edge Function).

// BUG FIX (confirmados sumindo em silêncio): o "Max Rows" da Data API do Supabase (padrão 1000)
// corta a resposta do PostgREST no servidor mesmo pedindo um range maior — sem erro, sem aviso.
// conselhos_status_mensal já passou de 1000 linhas, então um único range(0, 9999) só trazia as
// primeiras ~1000, deixando o restante fora do Map em getDadosBrutos (daí membros aparecerem como
// se não tivessem status algum). Pagina de verdade, blocos de 1000, até vir uma página incompleta.
async function fetchAll(sb: SupabaseClient, table: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

export async function getDadosBrutos(sb: SupabaseClient) {
  noStore();
  const [
    churn, upsellDownsell, reportsSemanais, metas, rounds, feedback, cases, matchmakings,
    conselhosGrupos, conselhosMembros, conselhosStatusMensal, agenda, historico, atas,
    statusHistorico, conselheirosFotos,
  ] = await Promise.all([
    fetchAll(sb, 'churn_items'), fetchAll(sb, 'upsell_downsell_items'), fetchAll(sb, 'reports_semanais_items'),
    fetchAll(sb, 'metas_subitens'), fetchAll(sb, 'rounds_items'), fetchAll(sb, 'feedback_items'), fetchAll(sb, 'cases_items'),
    fetchAll(sb, 'matchmakings_items'), fetchAll(sb, 'conselhos_grupos'), fetchAll(sb, 'conselhos_membros'),
    fetchAll(sb, 'conselhos_status_mensal'), fetchAll(sb, 'agenda_conselhos_items'), fetchAll(sb, 'historico_conselhos_items'),
    fetchAll(sb, 'atas_conselho_extraido'),
    fetchAll(sb, 'conselhos_status_historico'), fetchAll(sb, 'conselheiros_fotos'),
  ]);
  return {
    churn, upsellDownsell, reportsSemanais, metas, rounds, feedback, cases, matchmakings,
    conselhosGrupos, conselhosMembros, conselhosStatusMensal, agenda, historico, atas,
    statusHistorico, conselheirosFotos,
  };
}
export type DadosBrutos = Awaited<ReturnType<typeof getDadosBrutos>>;

// ============ agenda real dos conselhos ============

function buildAgendaMap(agendaRows: any[]) {
  const map = new Map<string, { dataIso: string; status: string | null }[]>();
  agendaRows.forEach((r) => {
    if (!r.data_iso) return;
    const chave = normalizeNome(r.conselheiro_nome);
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave)!.push({ dataIso: r.data_iso, status: r.status || null });
  });
  return map;
}
const APELIDOS_AGENDA_NORM: Record<string, string> = {};
Object.keys(APELIDOS_AGENDA).forEach((k) => { APELIDOS_AGENDA_NORM[normalizeNome(k)] = normalizeNome(APELIDOS_AGENDA[k]); });

function proximaDataConselho(tituloGrupo: string, agendaMap: Map<string, { dataIso: string; status: string | null }[]>) {
  const contato = extrairContatoDoTitulo(tituloGrupo);
  if (!contato) return null;
  const chaveContato = normalizeNome(contato);
  const chaveAlias = APELIDOS_AGENDA_NORM[chaveContato];
  const registros = agendaMap.get(chaveContato) || (chaveAlias ? agendaMap.get(chaveAlias) : null);
  if (!registros || registros.length === 0) return null;
  const agora = new Date();
  const futuros = registros.filter((r) => r.status !== AGENDA_STATUS_CANCELADO && new Date(r.dataIso) >= agora)
    .sort((a, b) => new Date(a.dataIso).getTime() - new Date(b.dataIso).getTime());
  if (futuros.length > 0) return { dataIso: futuros[0].dataIso, status: futuros[0].status, futuro: true };
  const passados = registros.filter((r) => r.status !== AGENDA_STATUS_CANCELADO)
    .sort((a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime());
  if (passados.length > 0) return { dataIso: passados[0].dataIso, status: passados[0].status, futuro: false };
  return null;
}

// ============ histórico de GTD ============

function cicloAtualPorConselho(historicoRows: any[]) {
  const porId = new Map<string, any>();
  historicoRows.forEach((it) => {
    if (!it.id_item_conselho) return;
    const atual = porId.get(it.id_item_conselho);
    if (!atual || (it.data_conselho || '') > (atual.data_conselho || '')) porId.set(it.id_item_conselho, it);
  });
  return [...porId.values()];
}
function historicoDoCS(cicloAtual: any[], nomeCS: string) {
  return cicloAtual.filter((it) => normalizeNome(it.cs_responsavel) === normalizeNome(nomeCS));
}

// ============ parsers ============

function parseMetas(metasRows: any[], nomeCS: string, mes: string, ano: number, geral: boolean) {
  const rowsFiltradas = geral ? filtrarAnoSeguro(metasRows) : filtrarPorMesSeguro(metasRows, mes);
  const doCS = rowsFiltradas.filter((r) => normalizeNome(r.cs_nome) === normalizeNome(nomeCS));
  const acc: Record<string, { metaSum: number; metaN: number; alcSum: number; alcN: number }> = {};
  doCS.forEach((r) => {
    const chave = String(r.item_metrica || '').replace(/[^\p{L}\s]/gu, '').trim().replace(/\s+/g, ' ');
    if (!acc[chave]) acc[chave] = { metaSum: 0, metaN: 0, alcSum: 0, alcN: 0 };
    if (r.meta !== null && r.meta !== undefined) { acc[chave].metaSum += Number(r.meta); acc[chave].metaN++; }
    if (r.alcancado !== null && r.alcancado !== undefined) { acc[chave].alcSum += Number(r.alcancado); acc[chave].alcN++; }
  });
  const out: Record<string, { meta: number | null; metaMedia: number | null; alcancadoSoma: number | null; alcancadoMedia: number | null }> = {};
  Object.keys(acc).forEach((k) => {
    const a = acc[k];
    out[k] = {
      meta: a.metaN > 0 ? a.metaSum : null,
      metaMedia: a.metaN > 0 ? Math.round(a.metaSum / a.metaN) : null,
      alcancadoSoma: a.alcN > 0 ? a.alcSum : null,
      alcancadoMedia: a.alcN > 0 ? Math.round(a.alcSum / a.alcN) : null,
    };
  });
  return out;
}

function parseChurn(churnRows: any[], nomeCS: string, mesInicio: string, mesFim: string) {
  let churnCount = 0, revenueChurn = 0;
  const detalheProdutos: Record<string, number> = {};
  churnRows.forEach((r) => {
    const cs = r.quem_e_seu_cs;
    if (!cs || CHURN_EXCLUIR.includes(cs) || normalizeNome(cs) !== normalizeNome(nomeCS)) return;
    const dataStr = r.data;
    if (!dataStr || dataStr < mesInicio || dataStr > mesFim) return;
    churnCount++;
    const preco = PRODUCT_PRICES[r.produto];
    if (preco) { revenueChurn += preco; detalheProdutos[r.produto] = (detalheProdutos[r.produto] || 0) + 1; }
  });
  return { churn: churnCount, revenueChurn, detalheProdutos: Object.keys(detalheProdutos).map((p) => ({ produto: p, qtd: detalheProdutos[p], valorAprox: PRODUCT_PRICES[p] })) };
}

function parseChurnOrfao(churnRows: any[], nomesConhecidosNormalizados: string[], mesInicio: string, mesFim: string) {
  let qtd = 0;
  const porNome: Record<string, number> = {};
  churnRows.forEach((r) => {
    const cs = r.quem_e_seu_cs;
    const dataStr = r.data;
    if (!cs || CHURN_EXCLUIR.includes(cs)) return;
    if (!dataStr || dataStr < mesInicio || dataStr > mesFim) return;
    if (nomesConhecidosNormalizados.includes(normalizeNome(cs))) return;
    qtd++;
    porNome[cs] = (porNome[cs] || 0) + 1;
  });
  return { qtd, detalhe: Object.keys(porNome).map((n) => ({ nome: n, qtd: porNome[n] })) };
}

function parseCases(casesRows: any[], nomeCompletoCS: string, mes: string, ano: number, geral: boolean) {
  const filtradas = geral ? filtrarAnoFlexivel(casesRows, ano) : filtrarPorMesAnoFlexivel(casesRows, mes, ano);
  return filtradas.filter((r) => nomeBateColunaPessoa(r.cs_raw, nomeCompletoCS))
    .map((r) => ({ id: r.id, nome: r.nome, empresa: r.empresa || '', produto: r.produto || '' }));
}

function parseMatchmakings(mmRows: any[], userId: number | null, mes: string, ano: number, geral: boolean) {
  if (userId === null || userId === undefined) return 0;
  const filtradas = geral ? filtrarAnoFlexivel(mmRows, ano) : filtrarPorMesAnoFlexivel(mmRows, mes, ano);
  return filtradas.filter((r) => Number(r.creator_id) === userId).length;
}

function parseRounds(roundsRows: any[], nomeCompletoCS: string, mes: string, geral: boolean) {
  const filtradas = geral ? filtrarAnoSeguro(roundsRows) : filtrarPorMesSeguro(roundsRows, mes);
  return filtradas.filter((r) => r.status === ROUNDS_STATUS_VALIDO && nomeBateColunaPessoa(r.cs_responsavel_raw, nomeCompletoCS)).length;
}

function parseUpsellDownsell(udRows: any[], nomeCompletoCS: string, mesInicio: string, mesFim: string) {
  let upsell = 0, downsell = 0;
  udRows.forEach((r) => {
    if (!nomeBateColunaPessoa(r.cs_raw, nomeCompletoCS) || r.status !== UD_STATUS_VALIDO) return;
    const dataStr = r.data;
    if (!dataStr || dataStr < mesInicio || dataStr > mesFim) return;
    if (r.tipo_troca === 'Upsell') upsell++;
    if (r.tipo_troca === 'Downsell' || r.tipo_troca === 'Downsell (Retirada de sócio)') downsell++;
  });
  return { upsell, downsell };
}

function parseReportsSemanais(rows: any[], userId: number | null, mesInicio: string, mesFim: string) {
  if (userId === null || userId === undefined) return [];
  return rows.filter((r) => Number(r.creator_id) === userId)
    .map((r) => {
      const dataEfetiva = r.data || (r.created_at_monday ? String(r.created_at_monday).slice(0, 10) : null);
      return { data: dataEfetiva, dataAproximada: !r.data && !!r.created_at_monday, nota: r.nota, matchmakings: r.matchmakings || 0, indicacoes: r.indicacoes || 0 };
    })
    .filter((r) => r.data && r.data >= mesInicio && r.data <= mesFim)
    .sort((a, b) => (a.data! < b.data! ? -1 : 1));
}
function somaIndicacoesSemanal(semanal: { indicacoes: number }[]) {
  return semanal.reduce((soma, r) => soma + (r.indicacoes || 0), 0);
}

function parseBlocosPorNome(texto: string | null): Record<string, string> {
  if (!texto) return {};
  const blocos: Record<string, string> = {};
  const partes = texto.split(/\n\s*\n/).length > 1 ? texto.split(/\n\s*\n/) : texto.split(/\n/);
  partes.forEach((bloco) => {
    const m = bloco.match(/^\**\s*([A-ZÀ-Ú][\wÀ-ú]+)\s*\**\s*[-:]\s*(.+)$/s);
    if (m) blocos[m[1].trim()] = m[2].trim();
  });
  return blocos;
}

function parseFeedback(feedbackRows: any[], nomeCS: string, mes: string, ano: number, geral: boolean) {
  const filtradas = geral ? filtrarAnoSeguro(feedbackRows) : filtrarPorMesSeguro(feedbackRows, mes);
  const positivos: string[] = [], construtivos: string[] = [];
  const votos: Record<string, number> = {};
  FEEDBACK_CATEGORIAS.forEach((c) => (votos[c] = 0));
  let avaliadores = 0;
  filtradas.forEach((item) => {
    if (item.avaliador_nome === nomeCS) return;
    const pos = parseBlocosPorNome(item.positivo_texto);
    const con = parseBlocosPorNome(item.construtivo_texto);
    let participou = false;
    if (pos[nomeCS]) { positivos.push(pos[nomeCS]); participou = true; }
    if (con[nomeCS]) { construtivos.push(con[nomeCS]); participou = true; }
    const votosItem = item.votos || {};
    FEEDBACK_CATEGORIAS.forEach((cat) => {
      const lista: string[] = votosItem[cat] || [];
      if (lista.includes(nomeCS)) { votos[cat]++; participou = true; }
    });
    if (participou) avaliadores++;
  });
  return { avaliadores, votos: FEEDBACK_CATEGORIAS.map((k) => ({ categoria: k, qtd: votos[k] })), positivos: shuffle(positivos), construtivos: shuffle(construtivos) };
}

// ============ conselhos ============

function parseConselhoItems(
  itemsPrincipais: any[], itemsRepo: any[], groupTitle: string, congelado: boolean,
  mesesRelevantes: string[], statusPorMembro: Map<number, Map<string, string>>,
  agendaMap: Map<string, { dataIso: string; status: string | null }[]>,
  groupId: string,
) {
  let presentes = 0, agendados = 0, reposPresentes = 0, temDado = false;
  const confirmados: { nome: string; mes: string }[] = [];
  const membrosDetalhe = itemsPrincipais.map((m) => ({ nome: m.nome, presente: 0, ausente: 0, reposicao: 0, registros: 0 }));

  mesesRelevantes.forEach((mes) => {
    itemsPrincipais.forEach((m, idx) => {
      const s = statusPorMembro.get(m.id)?.get(mes) || null;
      if (s === STATUS_CONFIRMADO) confirmados.push({ nome: m.nome, mes });
      if (!s || s === STATUS_NAO_ERA) return;
      temDado = true;
      const md = membrosDetalhe[idx];
      if (s === STATUS_PRESENTE) { presentes++; agendados++; md.presente++; md.registros++; }
      else if (STATUS_AUSENTE_SET.includes(s)) { agendados++; md.ausente++; md.registros++; }
      else if (s === 'Reposição') { md.reposicao++; }
    });
    itemsRepo.forEach((r) => {
      const s = statusPorMembro.get(r.id)?.get(mes) || null;
      if (s === STATUS_CONFIRMADO) confirmados.push({ nome: r.nome, mes });
      if (s === STATUS_PRESENTE) { presentes++; agendados++; reposPresentes++; temDado = true; }
    });
  });

  const nomeGrupo = groupTitle.replace(/\[?congelado\]?/i, '').trim();
  const membrosBase = itemsPrincipais.length;
  const proximoConselho = proximaDataConselho(groupTitle, agendaMap);

  // BUG FIX (confirmados inflados em "Visão Geral"): no board do Monday, a coluna de status de um
  // mês já resolvido às vezes fica esquecida em "Confirmado" em vez de ser atualizada pra
  // Presente/Ausente depois da reunião (achado real, verificado direto no board: ex. membro
  // 10866669928 tinha "Confirmado" tanto em Fevereiro quanto em Abril). Como mesesRelevantes
  // percorre os 12 meses em "Visão Geral", isso fazia a MESMA pessoa entrar duas ou mais vezes em
  // confirmadosFuturos — inflando o card "N confirmado(s)". "Confirmado" só faz sentido pra
  // próxima reunião pendente da pessoa, então aqui deduplicamos por nome, mantendo a ocorrência
  // do mês cronologicamente mais recente (a mais provável de ainda ser válida, não esquecida).
  const confirmadosPorNome = new Map<string, { nome: string; mes: string }>();
  confirmados.forEach((c) => {
    const atual = confirmadosPorNome.get(c.nome);
    if (!atual || MESES_ORDEM.indexOf(c.mes) > MESES_ORDEM.indexOf(atual.mes)) {
      confirmadosPorNome.set(c.nome, c);
    }
  });
  const confirmadosDeduplicados = [...confirmadosPorNome.values()];

  // TEMP DEBUG (investigação bug "confirmados" divergindo do Monday — remover depois de achar a causa)
  console.log(`[CONSELHO_DEBUG] ${new Date().toISOString()} grupo="${nomeGrupo}" meses=[${mesesRelevantes.join(',')}] brutos=${confirmados.length} dedup=${confirmadosDeduplicados.length} nomes=[${confirmadosDeduplicados.map((c) => c.nome + '/' + c.mes).join('; ')}]`);
  const _debugMembros = itemsPrincipais.map((m) => ({
    id: m.id,
    idTipo: typeof m.id,
    nome: m.nome,
    statusSetembro: statusPorMembro.get(m.id)?.get('Setembro') ?? 'SEM_MATCH',
  }));

  return {
    nome: nomeGrupo, groupId, congelado, membros: membrosBase,
    presente: temDado ? presentes : null,
    ausente: temDado ? (agendados - presentes) : null,
    reposicao: temDado ? reposPresentes : null,
    registros: temDado ? agendados : null,
    status: temDado ? 'realizado' : 'aguardando_confirmacao',
    membrosDetalhe: membrosDetalhe.map((m) => ({ nome: m.nome, reposicao: m.reposicao, taxa: m.registros > 0 ? Math.round((m.presente / m.registros) * 100) : null })),
    confirmadosFuturos: confirmadosDeduplicados,
    _debugMembros,
    proximaData: proximoConselho ? proximoConselho.dataIso : null,
    proximaDataEhFutura: proximoConselho ? proximoConselho.futuro : null,
    proximaDataStatus: proximoConselho ? proximoConselho.status : null,
    gtd: null as null | { taxaCumprimento: number | null; dataConselho: string | null; etapas: any[]; etapasAtrasadas: string[] },
  };
}

// ============ presença/no-show de um mês específico ============
// Pizza de "taxa de presença geral" pedida pelo Vitor — sempre um mês concreto (nunca o período
// inteiro somado, que não faz sentido numa pizza). "Visão Geral" resolve pro mês real atual (ver
// mesAtualReal), nunca soma os 12 meses.
//
// No-show = confirmou presença (status "Confirmado" em algum momento) e o status final do
// mês virou falta (Ausente/Não vai) — só é detectável a partir de conselhos_status_historico, um
// log que só existe a partir de 23/09/2026 (ver nota v12 na Edge Function sync-monday). Setembro
// de 2026 é o "mês zero": meses anteriores a essa data não têm histórico de transição, então toda
// falta anterior cai em "faltouSemConfirmacaoRegistrada" — não porque a pessoa não confirmou, mas
// porque o pipeline não tinha como saber. O card assim explicita "comece com o que você tiver"
// (pedido do Vitor) sem fingir um dado que a gente não tem.
export function mesAtualReal(): string {
  return MESES_ORDEM[new Date().getMonth()];
}

export type PresencaMes = {
  mes: string; totalAgendados: number; presente: number; noShow: number; faltouSemConfirmacaoRegistrada: number;
  taxaPresenca: number | null;
};

function calcularPresencaMes(
  itemsPrincipais: any[], itemsRepo: any[], mes: string,
  statusPorMembro: Map<number, Map<string, string>>,
  historicoPorMembroMes: Map<string, { statusAnterior: string | null }[]>,
): PresencaMes {
  let presente = 0, noShow = 0, faltou = 0;
  const confirmouAntes = (membroId: number) => {
    const transicoes = historicoPorMembroMes.get(`${membroId}|${mes}`) || [];
    return transicoes.some((t) => t.statusAnterior === STATUS_CONFIRMADO);
  };
  [...itemsPrincipais, ...itemsRepo].forEach((m) => {
    const s = statusPorMembro.get(m.id)?.get(mes) || null;
    if (s === STATUS_PRESENTE) presente++;
    else if (s && STATUS_AUSENTE_SET.includes(s)) {
      if (confirmouAntes(m.id)) noShow++;
      else faltou++;
    }
  });
  const total = presente + noShow + faltou;
  return {
    mes, totalAgendados: total, presente, noShow, faltouSemConfirmacaoRegistrada: faltou,
    taxaPresenca: total > 0 ? Math.round((presente / total) * 100) : null,
  };
}

// ============ realizado: manual x calculado ============

// Além do valor "vencedor" (valor/fonte, usado por toda a UI existente sem mudar nada), devolve
// os dois valores brutos — manual e calculado — pra quem precisar enxergar a divergência entre
// o que o CS reportou manualmente e o que o sistema encontrou sozinho (visão do gestor).
function valorRealizado(valorManual: number | null | undefined, valorCalculado: number | null | undefined) {
  const m = valorManual === null || valorManual === undefined ? null : valorManual;
  const c = valorCalculado === null || valorCalculado === undefined ? null : valorCalculado;
  if (m === null && c === null) return { valor: null as number | null, fonte: null as string | null, manual: null as number | null, calculado: null as number | null };
  if (m === null) return { valor: c, fonte: 'calculado', manual: null as number | null, calculado: c };
  if (c === null) return { valor: m, fonte: 'manual', manual: m, calculado: null as number | null };
  return c > m
    ? { valor: c, fonte: 'calculado', manual: m, calculado: c }
    : { valor: m, fonte: 'manual', manual: m, calculado: c };
}

function achievementIndicador(ind: any): number | null {
  if (!ind || ind.alcancado === null || ind.alcancado === undefined) return null;
  const meta = ind.meta;
  if (meta === null || meta === undefined || meta === 0) {
    if (ind.tipoMeta === 'max') return ind.alcancado === 0 ? 1 : 0.4;
    return ind.alcancado > 0 ? 0.7 : 0.3;
  }
  if (ind.tipoMeta === 'min') return Math.max(0, Math.min(1, ind.alcancado / meta));
  return Math.max(0, Math.min(1, 1 - ind.alcancado / meta));
}

function calcularScoreCS(indicadores: any, numConselhos: number, maxConselhosTime: number): number | null {
  let somaPeso = 0, somaPonderada = 0;
  Object.keys(PESOS_SCORE_CS).forEach((chave) => {
    if (chave === 'carteira') return;
    const ach = achievementIndicador(indicadores[chave]);
    if (ach === null) return;
    somaPonderada += ach * PESOS_SCORE_CS[chave];
    somaPeso += PESOS_SCORE_CS[chave];
  });
  if (maxConselhosTime > 0) {
    const achCarteira = Math.max(0, Math.min(1, numConselhos / maxConselhosTime));
    somaPonderada += achCarteira * PESOS_SCORE_CS.carteira;
    somaPeso += PESOS_SCORE_CS.carteira;
  }
  return somaPeso > 0 ? Math.round((somaPonderada / somaPeso) * 100) : null;
}

// ============ relatório individual ============

export async function generateCSReport(sb: SupabaseClient, nomeCS: string, seletorMes: string, ano: number, dadosParam?: DadosBrutos) {
  const { mesInicio, mesFim, geral } = periodoDatas(seletorMes, ano);
  const dados = dadosParam || (await getDadosBrutos(sb));

  const listaCS = await getCSListParaAgregados(sb);
  const cfg = listaCS.find((c) => c.nome === nomeCS);
  if (!cfg) throw new Error(`CS "${nomeCS}" não encontrado`);

  const agendaMap = buildAgendaMap(dados.agenda);
  const temUserId = cfg.userId !== null && cfg.userId !== undefined;

  const metas = parseMetas(dados.metas, cfg.nome, seletorMes, ano, geral);
  const churn = parseChurn(dados.churn, cfg.nome, mesInicio, mesFim);
  const casesRegistrados = parseCases(dados.cases, cfg.nomeCompleto, seletorMes, ano, geral);
  const casesCalc = casesRegistrados.length;
  const mmCalc = parseMatchmakings(dados.matchmakings, cfg.userId, seletorMes, ano, geral);
  const roundsCalc = parseRounds(dados.rounds, cfg.nomeCompleto, seletorMes, geral);
  const upDown = parseUpsellDownsell(dados.upsellDownsell, cfg.nomeCompleto, mesInicio, mesFim);
  const semanal = temUserId ? parseReportsSemanais(dados.reportsSemanais, cfg.userId, mesInicio, mesFim) : [];
  const indicacoesCalc = somaIndicacoesSemanal(semanal);
  const feedback = parseFeedback(dados.feedback, cfg.nome, seletorMes, ano, geral);

  // conselhos do CS: grupos ativos (não-repo) cujo título contém "(ApelidoConselho)"
  const membrosPorGrupo = new Map<string, any[]>();
  dados.conselhosMembros.forEach((m: any) => {
    if (!membrosPorGrupo.has(m.group_id)) membrosPorGrupo.set(m.group_id, []);
    membrosPorGrupo.get(m.group_id)!.push(m);
  });
  const statusPorMembro = new Map<number, Map<string, string>>();
  dados.conselhosStatusMensal.forEach((s: any) => {
    if (!statusPorMembro.has(s.membro_id)) statusPorMembro.set(s.membro_id, new Map());
    statusPorMembro.get(s.membro_id)!.set(s.mes, s.status);
  });
  const gruposDoCS = cfg.apelidoConselho
    ? dados.conselhosGrupos.filter((g: any) => !g.is_repo && tituloContemApelido(g.titulo, cfg.apelidoConselho) && !g.titulo.startsWith('Reposições'))
    : [];
  const mesesRelevantes = geral ? MESES_ORDEM : [seletorMes];
  const conselhos = gruposDoCS.map((g: any) => {
    const itemsPrincipais = membrosPorGrupo.get(g.group_id) || [];
    const itemsRepo = g.repo_group_id ? (membrosPorGrupo.get(g.repo_group_id) || []) : [];
    return parseConselhoItems(itemsPrincipais, itemsRepo, g.titulo, g.congelado, mesesRelevantes, statusPorMembro, agendaMap, g.group_id);
  });

  // GTD (histórico de desempenho dos conselhos)
  const cicloAtual = cicloAtualPorConselho(dados.historico);
  const historicoDoCSAtual = historicoDoCS(cicloAtual, cfg.nome);
  gruposDoCS.forEach((g: any, idx: number) => {
    const contato = extrairContatoDoTitulo(g.titulo);
    if (!contato) return;
    const hist = historicoDoCSAtual.find((h: any) => normalizeNome(h.membro) === normalizeNome(contato));
    if (!hist) return;
    conselhos[idx].gtd = {
      taxaCumprimento: hist.taxa_cumprimento, dataConselho: hist.data_conselho,
      etapas: hist.etapas || [], etapasAtrasadas: hist.etapas_atrasadas || [],
    };
  });
  const taxasGtdValidas = historicoDoCSAtual.map((h: any) => h.taxa_cumprimento).filter((v: any) => v !== null && v !== undefined);
  const cumprimentoGtdMedia = taxasGtdValidas.length > 0 ? Math.round(taxasGtdValidas.reduce((a: number, b: number) => a + b, 0) / taxasGtdValidas.length) : null;

  const futurosDoCS = conselhos.filter((c) => c.proximaData && c.proximaDataEhFutura)
    .sort((a, b) => new Date(a.proximaData!).getTime() - new Date(b.proximaData!).getTime());
  const proximoConselhoGeral = futurosDoCS.length > 0 ? { nome: futurosDoCS[0].nome, dataIso: futurosDoCS[0].proximaData } : null;

  const health = metas['Health da Base'];
  const churnR = valorRealizado(metas['Churn']?.alcancadoSoma, churn.churn);
  const casesR = valorRealizado(metas['Cases de Sucesso']?.alcancadoSoma, casesCalc);
  const mmR = valorRealizado(metas['Matchmakings']?.alcancadoSoma, mmCalc);
  const roundsR = valorRealizado(metas['Rounds']?.alcancadoSoma, roundsCalc);
  const upsellR = valorRealizado(metas['Upsell']?.alcancadoSoma, upDown.upsell);
  const downsellR = valorRealizado(metas['Downsell']?.alcancadoSoma, upDown.downsell);
  const indicacoesR = valorRealizado(metas['Indicações']?.alcancadoSoma, indicacoesCalc);

  return {
    cs: { nome: cfg.nome, nomeCompleto: cfg.nomeCompleto, userId: cfg.userId, apelidoConselho: cfg.apelidoConselho, fotoUrl: cfg.fotoUrl, proximoConselho: proximoConselhoGeral, vezesDestaque: cfg.vezesDestaque || 0 },
    periodo: { mes: seletorMes, ano, geral, geradoEm: new Date().toISOString() },
    indicadores: {
      churn: { meta: metas['Churn']?.meta ?? null, tipoMeta: 'max', alcancado: churnR.valor, fonte: churnR.fonte, unidade: 'qtd', manual: churnR.manual, calculado: churnR.calculado },
      revenueChurn: { meta: null, alcancado: churn.revenueChurn, unidade: 'R$', detalheProdutos: churn.detalheProdutos },
      casesSucesso: { meta: metas['Cases de Sucesso']?.meta ?? null, tipoMeta: 'min', alcancado: casesR.valor, fonte: casesR.fonte, unidade: 'qtd', manual: casesR.manual, calculado: casesR.calculado },
      matchmakings: { meta: metas['Matchmakings']?.meta ?? null, tipoMeta: 'min', alcancado: mmR.valor, fonte: mmR.fonte, unidade: 'qtd', manual: mmR.manual, calculado: mmR.calculado },
      rounds: { meta: metas['Rounds']?.meta ?? null, tipoMeta: 'min', alcancado: roundsR.valor, fonte: roundsR.fonte, unidade: 'qtd', manual: roundsR.manual, calculado: roundsR.calculado },
      upsell: { meta: metas['Upsell']?.meta ?? null, tipoMeta: 'min', alcancado: upsellR.valor, fonte: upsellR.fonte, unidade: 'qtd', manual: upsellR.manual, calculado: upsellR.calculado },
      downsell: { meta: metas['Downsell']?.meta ?? null, tipoMeta: 'max', alcancado: downsellR.valor, fonte: downsellR.fonte, unidade: 'qtd', manual: downsellR.manual, calculado: downsellR.calculado },
      indicacoes: { meta: metas['Indicações']?.meta ?? null, tipoMeta: 'min', alcancado: indicacoesR.valor, fonte: indicacoesR.fonte, unidade: 'qtd', manual: indicacoesR.manual, calculado: indicacoesR.calculado },
      healthDaBase: { meta: health?.metaMedia ?? null, tipoMeta: 'max', alcancado: health?.alcancadoMedia ?? null, unidade: '%' },
      cumprimentoGtd: { meta: 100, tipoMeta: 'min', alcancado: cumprimentoGtdMedia, unidade: '%' },
    },
    semanal, conselhos, feedback, casesRegistrados,
  };
}

// ============ relatório da equipe ============

export async function generateEquipeReport(sb: SupabaseClient, seletorMes: string, ano: number) {
  const { mesInicio, mesFim, geral } = periodoDatas(seletorMes, ano);
  const dados = await getDadosBrutos(sb);
  const membros = await getCSListParaAgregados(sb);

  const relatorios = (await Promise.all(membros.map(async (m) => {
    try { return await generateCSReport(sb, m.nome, seletorMes, ano, dados); }
    catch (e) { return null; }
  }))).filter(Boolean) as Awaited<ReturnType<typeof generateCSReport>>[];

  function somaInd(chave: string) {
    let meta = 0, temMeta = false, alcancado = 0;
    relatorios.forEach((r) => {
      const ind: any = (r.indicadores as any)[chave];
      if (ind.meta !== null && ind.meta !== undefined) { meta += ind.meta; temMeta = true; }
      if (ind.alcancado !== null && ind.alcancado !== undefined) alcancado += ind.alcancado;
    });
    return { meta: temMeta ? meta : null, alcancado, tipoMeta: (relatorios[0]?.indicadores as any)?.[chave]?.tipoMeta || 'min', unidade: (relatorios[0]?.indicadores as any)?.[chave]?.unidade || 'qtd' };
  }
  function mediaInd(chave: string) {
    const vals = relatorios.map((r) => (r.indicadores as any)[chave].alcancado).filter((v) => v !== null && v !== undefined);
    const metasArr = relatorios.map((r) => (r.indicadores as any)[chave].meta).filter((v) => v !== null && v !== undefined);
    return {
      meta: metasArr.length ? Math.round(metasArr.reduce((a, b) => a + b, 0) / metasArr.length) : null,
      alcancado: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      tipoMeta: 'max', unidade: '%',
    };
  }

  const casesPorCS = relatorios.map((r) => ({ nome: r.cs.nome, qtd: (r.casesRegistrados || []).length })).sort((a, b) => b.qtd - a.qtd);

  const todosConselhos: any[] = [];
  relatorios.forEach((r) => r.conselhos.forEach((c) => todosConselhos.push(Object.assign({ cs: r.cs.nome }, c))));

  const proximosConselhos = todosConselhos.filter((c) => c.proximaData && c.proximaDataEhFutura)
    .sort((a, b) => new Date(a.proximaData).getTime() - new Date(b.proximaData).getTime())
    .slice(0, 12)
    .map((c) => ({ cs: c.cs, nome: c.nome, dataIso: c.proximaData, proximaDataStatus: c.proximaDataStatus || null, confirmadosFuturos: c.confirmadosFuturos || [] }));

  function ranking(chave: string, ordem: 'asc' | 'desc') {
    const lista = relatorios.map((r) => ({ nome: r.cs.nome, valor: (r.indicadores as any)[chave].alcancado }))
      .filter((x) => x.valor !== null && x.valor !== undefined);
    lista.sort((a, b) => (ordem === 'asc' ? a.valor - b.valor : b.valor - a.valor));
    return lista;
  }
  const rankingIndicadores = {
    matchmakings: ranking('matchmakings', 'desc'), indicacoes: ranking('indicacoes', 'desc'),
    rounds: ranking('rounds', 'desc'), upsell: ranking('upsell', 'desc'), casesSucesso: ranking('casesSucesso', 'desc'),
    downsellMais: ranking('downsell', 'desc'), downsellMenos: ranking('downsell', 'asc'), churnMais: ranking('churn', 'desc'),
  };

  const maxConselhosTime = relatorios.reduce((max, r) => Math.max(max, r.conselhos.length), 0);
  const csTop = relatorios
    .map((r) => ({ nome: r.cs.nome, nomeCompleto: r.cs.nomeCompleto, fotoUrl: r.cs.fotoUrl, score: calcularScoreCS(r.indicadores, r.conselhos.length, maxConselhosTime) }))
    .filter((x) => x.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, 3);

  const nomesConhecidos = membros.map((c) => normalizeNome(c.nome));
  const churnOrfao = parseChurnOrfao(dados.churn, nomesConhecidos, mesInicio, mesFim);

  // impacto dos conselhos: as duas visões lado a lado (decisão confirmada com o Vitor — manter
  // as duas, nunca substituir uma pela outra). O front-end decide qual mostrar via toggle.
  const impactoConselhosHistorico = calcularImpactoConselhos(dados);
  const impactoConselhosPeriodo = calcularImpactoConselhos(dados, seletorMes, ano);

  return {
    periodo: { mes: seletorMes, ano, geral, geradoEm: new Date().toISOString() },
    membrosIncluidos: relatorios.map((r) => r.cs.nome),
    indicadores: {
      churn: somaInd('churn'), revenueChurn: somaInd('revenueChurn'), casesSucesso: somaInd('casesSucesso'),
      matchmakings: somaInd('matchmakings'), rounds: somaInd('rounds'), upsell: somaInd('upsell'),
      downsell: somaInd('downsell'), indicacoes: somaInd('indicacoes'), healthDaBase: mediaInd('healthDaBase'),
    },
    churnOrfao,
    casesPorCS,
    ranking: rankingIndicadores,
    csTop,
    conselhos: todosConselhos,
    proximosConselhos,
    // impactoConselhos: alias pro histórico, mantido pra não quebrar nada que já lê esse campo
    // (dashboard-html.ts atual) — o front-end novo passa a ler impactoConselhosHistorico/
    // impactoConselhosPeriodo diretamente.
    impactoConselhos: impactoConselhosHistorico,
    impactoConselhosHistorico,
    impactoConselhosPeriodo,
  };
}

// Casamento de nome por token — usado tanto pra atribuir cases/matchmakings ao roster de um
// conselho (calcularImpactoConselhos) quanto pra casar membro_nome_ata (texto livre da ata) com
// o roster oficial (buscarAtasPorConselho). Um único lugar pra essa lógica, pra nunca divergir
// entre os dois usos.
//
// BUG FIX (produção derrubada em 23/09/2026): nomes no formato "Fulano + 1" (convenção de "mais
// um convidado" no Monday) faziam o primeiro token virar só "+" — um metacaractere de regex
// sozinho, sem nada pra repetir, o que lançava "Invalid regular expression: /\b+\b/: Nothing to
// repeat" dentro de generateEquipeReport, sem try/catch, derrubando a resposta inteira da API de
// equipe. Corrigido filtrando tokens sem nenhuma letra/número (\w) antes de virarem termo de
// busca, e escapando qualquer caractere especial de regex que sobrar, como proteção extra.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function primeirosDoisTokens(nome: string): string[] {
  return normalizeNome(nome).split(/\s+/).filter((t) => /\w/.test(t)).slice(0, 2);
}

// itemNome "pertence" a algum membro do roster quando os dois primeiros tokens do nome DO MEMBRO
// aparecem, cada um como palavra inteira, dentro do nome do item — funciona tanto pra "Daniel de
// Castro | JCastro Consultoria" (item) casando com membro "Daniel de Castro | JCastro
// Consultoria" (roster) quanto pra variações de grafia entre os dois textos.
function itemPertenceRoster(itemNome: string, roster: any[]): boolean {
  const itemNorm = normalizeNome(itemNome);
  return roster.some((m: any) => {
    const tokens = primeirosDoisTokens(m.nome);
    if (tokens.length === 0) return false;
    return tokens.every((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`).test(itemNorm));
  });
}
// Mesmo critério, mas casando contra um nome de membro digitado à mão numa ata (não vindo do
// roster do Monday) — mesma direção de comparação (tokens do NOME MAIS CURTO/confiável dentro do
// texto do outro), então reaproveita a função inteira: quem chama decide qual dos dois lados
// entra como "item" (texto livre) e qual como "roster" (lista de candidatos oficiais).
function nomeCasaComRoster(nomeLivre: string, roster: any[]): any | null {
  const nomeNorm = normalizeNome(nomeLivre);
  return roster.find((m: any) => {
    const tokens = primeirosDoisTokens(m.nome);
    if (tokens.length === 0) return false;
    return tokens.every((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`).test(nomeNorm));
  }) || null;
}

function montarRosterConselho(g: any, membrosPorGrupo: Map<string, any[]>): any[] {
  const roster = [...(membrosPorGrupo.get(g.group_id) || [])];
  if (g.repo_group_id) roster.push(...(membrosPorGrupo.get(g.repo_group_id) || []));
  return roster;
}

// impacto dos conselhos: soma, por conselho (grupo ativo), os cases/matchmakings que mencionam
// algum MEMBRO desse conselho (casamento por nome, já que o Monday não guarda um vínculo direto
// item -> conselho).
//
// Duas visões, nunca uma substituindo a outra (decisão confirmada com o Vitor): sem
// seletorMes/ano, olha o HISTÓRICO INTEIRO (todos os mes_grupo_titulo, comportamento original);
// com seletorMes/ano, filtra cases_items/matchmakings_items pro período antes de agregar —
// mesmo parâmetro/formato de periodoDatas() já usado no resto do dashboard. A lógica de
// casamento por nome (itemPertenceRoster) é a mesma nos dois casos, só muda o conjunto de itens
// de entrada.
//
// BUG FIX (23/09/2026): a versão anterior comparava contra extrairContatoDoTitulo(g.titulo), que
// extrai o CONSELHEIRO (advisor) do título (ex. "Fast Track | Julio Faccioli (Vitor)" -> "Julio
// Faccioli") — mas cases_items/matchmakings_items são sobre o negócio de cada MEMBRO cliente do
// conselho, não sobre o conselheiro. O nome do conselheiro quase nunca aparece nesses registros
// (confirmado: "Julio Faccioli" tinha 0 cases e só 3 matchmakings, enquanto os 9 membros reais
// desse conselho, como Daniel de Castro e Thamires Botelho, tinham cases/matchmakings próprios
// nunca contados), o que zerava o impacto de quase todo conselho. Corrigido comparando contra o
// roster inteiro do conselho (titulares + substitutos do grupo de reposição).
function calcularImpactoConselhos(dados: DadosBrutos, seletorMes?: string, ano?: number) {
  const gruposAtivos = dados.conselhosGrupos.filter((g: any) => !g.is_repo);
  const membrosPorGrupo = new Map<string, any[]>();
  dados.conselhosMembros.forEach((m: any) => {
    if (!membrosPorGrupo.has(m.group_id)) membrosPorGrupo.set(m.group_id, []);
    membrosPorGrupo.get(m.group_id)!.push(m);
  });

  const temPeriodo = !!seletorMes && ano !== undefined;
  const geral = temPeriodo && seletorMes === 'Visão Geral';
  const casesEntrada = temPeriodo
    ? (geral ? filtrarAnoFlexivel(dados.cases, ano!) : filtrarPorMesAnoFlexivel(dados.cases, seletorMes!, ano!))
    : dados.cases;
  const mmEntrada = temPeriodo
    ? (geral ? filtrarAnoFlexivel(dados.matchmakings, ano!) : filtrarPorMesAnoFlexivel(dados.matchmakings, seletorMes!, ano!))
    : dados.matchmakings;

  let totalCases = 0, totalMatchmakings = 0, matchmakingsSemResultado = 0;
  const porConselho: { nome: string; groupId: string; cs: string; total: number }[] = [];

  gruposAtivos.forEach((g: any) => {
    const roster = montarRosterConselho(g, membrosPorGrupo);
    if (roster.length === 0) return;

    const casesDoConselho = casesEntrada.filter((c: any) => itemPertenceRoster(c.nome, roster));
    const mmDoConselho = mmEntrada.filter((m: any) => itemPertenceRoster(m.nome, roster));

    totalCases += casesDoConselho.length;
    totalMatchmakings += mmDoConselho.length;
    matchmakingsSemResultado += mmDoConselho.filter((m: any) => !m.resultado || !m.resultado.trim()).length;

    const total = casesDoConselho.length + mmDoConselho.length;
    if (total > 0) {
      const cfgMatch = g.titulo.match(/\((.*?)\)\s*$/);
      porConselho.push({ nome: g.titulo, groupId: g.group_id, cs: cfgMatch ? cfgMatch[1] : '', total });
    }
  });

  const topConselhos = porConselho.sort((a, b) => b.total - a.total).slice(0, 8);
  return { totalCases, totalMatchmakings, matchmakingsSemResultado, topConselhos };
}

// ============ visão do gestor (dados não mascarados) ============
// Diferente de generateEquipeReport (que só expõe "alcancado", o maior entre manual e
// calculado), esta visão é só pra quem tem is_gestor()=true: mostra o valor calculado puro, o
// manual quando existe, e a divergência entre os dois — pra gestão enxergar quando um CS está
// reportando manualmente um número mais otimista do que o sistema encontra sozinho.

const INDICADORES_GESTOR = ['churn', 'casesSucesso', 'matchmakings', 'rounds', 'upsell', 'downsell', 'indicacoes'] as const;

const LABELS_INDICADOR: Record<string, string> = {
  churn: 'Churn', casesSucesso: 'Cases de Sucesso', matchmakings: 'Matchmakings', rounds: 'Rounds',
  upsell: 'Upsell', downsell: 'Downsell', indicacoes: 'Indicações', cumprimentoGtd: 'Cumprimento do GTD',
  numConselhos: 'Carteira de conselhos',
};

// Eixos do radar comparativo do gestor, na ordem em que devem aparecer no gráfico — combinados
// aqui uma única vez pra back-end e front-end nunca divergirem na ordem/rótulo dos eixos. Nove
// eixos (mesma ordem de INDICADORES_GESTOR + cumprimentoGtd + numConselhos, ou seja, os mesmos
// nove indicadores já expostos em indicadoresOrdem) — cobre todo indicador que a área acompanha,
// não só os seis originais.
const RADAR_EIXOS: { chave: string; label: string; tipoMeta: 'min' | 'max' }[] = [
  { chave: 'churn', label: 'Churn', tipoMeta: 'max' },
  { chave: 'casesSucesso', label: 'Cases', tipoMeta: 'min' },
  { chave: 'matchmakings', label: 'Matchmakings', tipoMeta: 'min' },
  { chave: 'rounds', label: 'Rounds', tipoMeta: 'min' },
  { chave: 'upsell', label: 'Upsell', tipoMeta: 'min' },
  { chave: 'downsell', label: 'Downsell', tipoMeta: 'max' },
  { chave: 'indicacoes', label: 'Indicações', tipoMeta: 'min' },
  { chave: 'cumprimentoGtd', label: 'GTD', tipoMeta: 'min' },
  { chave: 'numConselhos', label: 'Carteira', tipoMeta: 'min' },
];

// Limite de alerta de divergência: indiceDivergencia (soma das divergências positivas — CS
// reportou manualmente mais do que o sistema calculou sozinho) acima de 20% da soma dos valores
// calculados do próprio CS no período. Limite arbitrário (não existe ainda um SLA formal da área
// pra isso), documentado aqui pra ficar fácil de revisar/ajustar num único lugar.
const LIMITE_DIVERGENCIA_PCT = 0.2;

// Normaliza calculado/meta pra escala 0-100 (100 = bateu a meta em cheio), capado em 150 pra um
// outlier não esticar o eixo do radar pros demais CS. Pra tipoMeta='max' (churn: menos é melhor)
// inverte em torno da meta — 2x a meta vira 0, a própria meta vira 100, 0 vira 200 (capado em
// 150) — assim os dois tipos de indicador ficam na mesma unidade "% de bom desempenho", com 100
// sempre significando "bateu a meta em cheio" nos dois sentidos.
function radarPct(calculado: number | null | undefined, meta: number | null | undefined, tipoMeta: 'min' | 'max'): number {
  if (calculado === null || calculado === undefined) return 0;
  if (meta === null || meta === undefined || meta === 0) {
    if (calculado <= 0) return tipoMeta === 'max' ? 100 : 0;
    return tipoMeta === 'max' ? 0 : 100;
  }
  const pct = tipoMeta === 'max' ? ((2 * meta - calculado) / meta) * 100 : (calculado / meta) * 100;
  return Math.max(0, Math.min(150, Math.round(pct)));
}

// Três faixas de risco pro painel do gestor. 80% do alvo como fronteira "no limite" é uma escolha
// documentada aqui (não existe ainda um valor "oficial" da área pra isso) — fácil de ajustar num
// único lugar se a área definir outro corte no futuro.
type StatusRisco = 'sem_dado' | 'dentro_da_meta' | 'no_limite' | 'abaixo_da_meta';
function statusRisco(ach: number | null): StatusRisco {
  if (ach === null || ach === undefined) return 'sem_dado';
  if (ach >= 1) return 'dentro_da_meta';
  if (ach >= 0.8) return 'no_limite';
  return 'abaixo_da_meta';
}

export type VisaoGestorCS = ReturnType<typeof montarVisaoGestorCS>;

function montarVisaoGestorCS(r: Awaited<ReturnType<typeof generateCSReport>>, maxConselhosTime: number) {
  const ind = r.indicadores as any;
  const indicadores: Record<string, { meta: number | null; calculado: number | null; manual: number | null; unidade: string; status: StatusRisco; divergencia: number | null }> = {};

  INDICADORES_GESTOR.forEach((chave) => {
    const i = ind[chave];
    const ach = achievementIndicador({ meta: i.meta, tipoMeta: i.tipoMeta, alcancado: i.calculado });
    const temOsDois = i.manual !== null && i.manual !== undefined && i.calculado !== null && i.calculado !== undefined;
    const divergencia = temOsDois && i.manual !== i.calculado ? i.manual - i.calculado : null;
    indicadores[chave] = { meta: i.meta, calculado: i.calculado, manual: i.manual, unidade: i.unidade, status: statusRisco(ach), divergencia };
  });

  // cumprimentoGtd e numConselhos (carteira) não têm par manual/calculado — já são 100% apurados
  // pelo sistema (GTD vem do histórico, carteira é a contagem de conselhos do CS), então
  // "calculado" é o único valor que existe pra eles.
  const achGtd = achievementIndicador({ meta: ind.cumprimentoGtd.meta, tipoMeta: ind.cumprimentoGtd.tipoMeta, alcancado: ind.cumprimentoGtd.alcancado });
  indicadores.cumprimentoGtd = { meta: ind.cumprimentoGtd.meta, calculado: ind.cumprimentoGtd.alcancado, manual: null, unidade: '%', status: statusRisco(achGtd), divergencia: null };

  const achCarteira = achievementIndicador({ meta: maxConselhosTime || null, tipoMeta: 'min', alcancado: r.conselhos.length });
  indicadores.numConselhos = { meta: maxConselhosTime || null, calculado: r.conselhos.length, manual: null, unidade: 'qtd', status: statusRisco(achCarteira), divergencia: null };

  const indiceDivergencia = INDICADORES_GESTOR.reduce((soma, chave) => {
    const d = indicadores[chave].divergencia;
    return soma + (d !== null && d > 0 ? d : 0);
  }, 0);
  const somaCalculado = INDICADORES_GESTOR.reduce((soma, chave) => soma + (indicadores[chave].calculado || 0), 0);

  const alertas: string[] = [];
  Object.keys(indicadores).forEach((chave) => {
    if (indicadores[chave].status === 'abaixo_da_meta') {
      const i = indicadores[chave];
      alertas.push(`${LABELS_INDICADOR[chave] || chave} abaixo da meta (${i.calculado ?? '—'} de ${i.meta ?? '—'}).`);
    }
  });
  if (somaCalculado > 0 && indiceDivergencia > somaCalculado * LIMITE_DIVERGENCIA_PCT) {
    alertas.push(`Divergência entre o valor reportado manualmente e o calculado pelo sistema passa de ${Math.round(LIMITE_DIVERGENCIA_PCT * 100)}% (${indiceDivergencia} acima do que o sistema encontrou).`);
  }

  // scoreReal: mesmo calcularScoreCS, só que os indicadores passados têm "alcancado" = calculado
  // em vez do alcancado mascarado — reaproveita a função inteira (mesmos pesos, mesma lógica de
  // achievement) em vez de duplicar a ponderação.
  const indicadoresParaScoreReal: any = {};
  Object.keys(PESOS_SCORE_CS).forEach((chave) => {
    if (chave === 'carteira') return;
    const i = ind[chave];
    indicadoresParaScoreReal[chave] = { ...i, alcancado: i.calculado };
  });
  const scoreReal = calcularScoreCS(indicadoresParaScoreReal, r.conselhos.length, maxConselhosTime);

  const radar = RADAR_EIXOS.map((eixo) => {
    const i = eixo.chave === 'cumprimentoGtd' ? indicadores.cumprimentoGtd : (indicadores as any)[eixo.chave];
    return radarPct(i.calculado, i.meta, eixo.tipoMeta);
  });

  const temIndicadorAbaixoDaMeta = Object.values(indicadores).some((i) => i.status === 'abaixo_da_meta');

  return {
    nome: r.cs.nome, nomeCompleto: r.cs.nomeCompleto, fotoUrl: r.cs.fotoUrl,
    indicadores, indiceDivergencia, scoreReal, alertas, radar, temIndicadorAbaixoDaMeta,
  };
}

export async function generateVisaoGestor(sb: SupabaseClient, seletorMes: string, ano: number) {
  const dados = await getDadosBrutos(sb);
  const membros = await getCSListParaAgregados(sb);

  const relatorios = (await Promise.all(membros.map(async (m) => {
    try { return await generateCSReport(sb, m.nome, seletorMes, ano, dados); }
    catch (e) { return null; }
  }))).filter(Boolean) as Awaited<ReturnType<typeof generateCSReport>>[];

  const maxConselhosTime = relatorios.reduce((max, r) => Math.max(max, r.conselhos.length), 0);
  const porCS = relatorios.map((r) => montarVisaoGestorCS(r, maxConselhosTime));

  const radarEquipe = RADAR_EIXOS.map((_, idx) => {
    const vals = porCS.map((c) => c.radar[idx]).filter((v) => v !== null && v !== undefined) as number[];
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });

  const ranking = [...porCS]
    .filter((c) => c.scoreReal !== null)
    .sort((a, b) => (b.scoreReal as number) - (a.scoreReal as number))
    .map((c) => ({ nome: c.nome, nomeCompleto: c.nomeCompleto, fotoUrl: c.fotoUrl, scoreReal: c.scoreReal }));

  return {
    periodo: { mes: seletorMes, ano, geradoEm: new Date().toISOString() },
    indicadoresOrdem: [...INDICADORES_GESTOR, 'cumprimentoGtd', 'numConselhos'],
    labelsIndicador: LABELS_INDICADOR,
    radarEixos: RADAR_EIXOS.map((e) => e.label),
    radarEquipe,
    csAbaixoDaMeta: porCS.filter((c) => c.temIndicadorAbaixoDaMeta).length,
    porCS,
    ranking,
  };
}

// ============ ata do conselho (desafio/compromisso/ganhos/anotações/sugestões por membro/mês) ============
// Fonte: atas_conselho_extraido, tabela populada por um processo de extração separado (fora
// deste app) a partir do documento bruto da ata no Drive/Google Docs. Cobertura parcial por
// design — hoje só o conselho piloto (group_id='new_group') tem linhas; os demais mostram
// "ata ainda não processada" até serem processados, um conselho de cada vez. Este arquivo NUNCA
// fala com o Drive em tempo real, só lê essa tabela (igual lê todo o resto).

function normalizarMesSemAcento(mes: string): string {
  return String(mes || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
const MESES_SEM_ACENTO = MESES_ORDEM.map(normalizarMesSemAcento);
function indiceMesAta(mesAta: string): number {
  return MESES_SEM_ACENTO.indexOf(normalizarMesSemAcento(mesAta));
}

// mes_ata não carrega ano (ex. "Marco", nunca "Março 2026"). Pra decidir o ano, cruza com a
// agenda real do conselho (mesma fonte que já resolve a próxima data em proximaDataConselho):
// entre os encontros já agendados pro conselheiro desse conselho, pega o ano mais recente cujo
// mês bate com mes_ata. V1: sem nenhum encontro de agenda com esse mês, assume o ano informado
// como fallback — pode errar em conselhos com histórico de mais de 12 meses sem cobertura de
// agenda pro período.
function anoDaAta(mesAta: string, contatoConselho: string | null, agendaMap: Map<string, { dataIso: string; status: string | null }[]>, anoFallback: number): number {
  const mesIdx = indiceMesAta(mesAta);
  if (mesIdx === -1 || !contatoConselho) return anoFallback;
  const chave = normalizeNome(contatoConselho);
  const chaveAlias = APELIDOS_AGENDA_NORM[chave];
  const registros = agendaMap.get(chave) || (chaveAlias ? agendaMap.get(chaveAlias) : null);
  if (!registros || registros.length === 0) return anoFallback;
  const candidatos = registros.map((r) => new Date(r.dataIso)).filter((d) => d.getMonth() === mesIdx).map((d) => d.getFullYear());
  if (candidatos.length === 0) return anoFallback;
  return Math.max(...candidatos);
}

export type AtaMembroMes = {
  membroNome: string; mesAta: string; ano: number;
  desafio: string | null; compromisso: string | null; ganhos: string | null;
  anotacoes: string | null; sugestoes: string | null;
  oportunidadesMapeadas: string[]; fonteDocUrl: string | null;
};

// Organiza as atas de UM conselho por membro do roster oficial, casando membro_nome_ata (texto
// livre da ata, pode ter empresa junto ou pontuação residual) contra o roster via
// nomeCasaComRoster — nunca por igualdade exata de string. Membro do roster sem nenhuma ata
// casada simplesmente não aparece no Map; quem consome decide como mostrar "ata ainda não
// processada" (nunca omite a linha do membro silenciosamente).
function organizarAtasDoConselho(
  atasRows: any[], groupId: string, roster: any[], contatoConselho: string | null,
  agendaMap: Map<string, { dataIso: string; status: string | null }[]>, anoFallback: number,
): Map<string, AtaMembroMes[]> {
  const porMembro = new Map<string, AtaMembroMes[]>();
  atasRows.filter((a: any) => a.group_id === groupId).forEach((a: any) => {
    const membro = nomeCasaComRoster(a.membro_nome_ata, roster);
    if (!membro) return;
    const item: AtaMembroMes = {
      membroNome: membro.nome, mesAta: a.mes_ata, ano: anoDaAta(a.mes_ata, contatoConselho, agendaMap, anoFallback),
      desafio: a.desafio, compromisso: a.compromisso, ganhos: a.ganhos, anotacoes: a.anotacoes, sugestoes: a.sugestoes,
      oportunidadesMapeadas: a.oportunidades_mapeadas || [], fonteDocUrl: a.fonte_doc_url,
    };
    if (!porMembro.has(membro.nome)) porMembro.set(membro.nome, []);
    porMembro.get(membro.nome)!.push(item);
  });
  return porMembro;
}

// ============ healthscore v1 ============
// Primeira versão, sujeita a ajuste com feedback do Vitor — documentado aqui, nunca apresentado
// como definitivo. Média ponderada simples (0-100) de três sinais, todos já calculados a partir
// de dado que o app já lê, sem depender de nenhuma fonte nova:
//   - taxa de presença no período (peso maior — o sinal mais direto de saúde do conselho),
//     mesma lógica de parseConselhoItems já existente;
//   - cumprimento de GTD no período (etapas já rastreadas pela automação existente, via
//     historico_conselhos_items);
//   - volume de cases + matchmakings gerados no período, normalizado pelo número de membros do
//     conselho (evita que um conselho grande pareça sempre "mais saudável" só por ter mais
//     gente).
// NÃO inclui Big Deal nem nenhum dado de ata na fórmula v1 (cobertura de ata ainda parcial) —
// plugar aqui quando a extração cobrir todos os conselhos. Só o número final (selo) é exposto
// pro usuário final, nunca a fórmula.
const PESOS_HEALTHSCORE = { presenca: 0.5, gtd: 0.3, volume: 0.2 };

function calcularHealthscore(params: {
  presente: number | null; registros: number | null;
  taxaCumprimentoGtd: number | null;
  totalCasesMatchmakings: number; numMembros: number;
}): number | null {
  const sinais: { valor: number; peso: number }[] = [];
  if (params.registros !== null && params.registros > 0) {
    sinais.push({ valor: Math.max(0, Math.min(1, (params.presente || 0) / params.registros)), peso: PESOS_HEALTHSCORE.presenca });
  }
  if (params.taxaCumprimentoGtd !== null && params.taxaCumprimentoGtd !== undefined) {
    sinais.push({ valor: Math.max(0, Math.min(1, params.taxaCumprimentoGtd / 100)), peso: PESOS_HEALTHSCORE.gtd });
  }
  if (params.numMembros > 0) {
    // volume por membro numa escala arbitrária v1 (3 cases+matchmakings por membro no período =
    // 100%) — ajustável; capado em 1 pra um outlier não estourar o score.
    const porMembro = params.totalCasesMatchmakings / params.numMembros;
    sinais.push({ valor: Math.max(0, Math.min(1, porMembro / 3)), peso: PESOS_HEALTHSCORE.volume });
  }
  if (sinais.length === 0) return null;
  const somaPeso = sinais.reduce((s, x) => s + x.peso, 0);
  const somaPonderada = sinais.reduce((s, x) => s + x.valor * x.peso, 0);
  return Math.round((somaPonderada / somaPeso) * 100);
}

// ============ página/modal completo do conselho ============
// Uma função só alimenta os dois níveis de drill-down (modal rápido e página completa /
// conselho/[grupo]) — o front-end de cada um decide qual subconjunto do retorno mostrar, sem
// duplicar nenhuma busca ou lógica de casamento por nome.
export async function generateConselhoDetalhe(sb: SupabaseClient, groupId: string, seletorMes: string, ano: number, dadosParam?: DadosBrutos) {
  const dados = dadosParam || (await getDadosBrutos(sb));
  const { geral } = periodoDatas(seletorMes, ano);

  const grupo = dados.conselhosGrupos.find((g: any) => g.group_id === groupId && !g.is_repo);
  if (!grupo) throw new Error(`Conselho "${groupId}" não encontrado`);

  const membrosPorGrupo = new Map<string, any[]>();
  dados.conselhosMembros.forEach((m: any) => {
    if (!membrosPorGrupo.has(m.group_id)) membrosPorGrupo.set(m.group_id, []);
    membrosPorGrupo.get(m.group_id)!.push(m);
  });
  const roster = montarRosterConselho(grupo, membrosPorGrupo);
  const itemsPrincipais = membrosPorGrupo.get(grupo.group_id) || [];
  const itemsRepo = grupo.repo_group_id ? (membrosPorGrupo.get(grupo.repo_group_id) || []) : [];

  const statusPorMembro = new Map<number, Map<string, string>>();
  dados.conselhosStatusMensal.forEach((s: any) => {
    if (!statusPorMembro.has(s.membro_id)) statusPorMembro.set(s.membro_id, new Map());
    statusPorMembro.get(s.membro_id)!.set(s.mes, s.status);
  });
  const agendaMap = buildAgendaMap(dados.agenda);
  const mesesRelevantes = geral ? MESES_ORDEM : [seletorMes];

  const resumo = parseConselhoItems(itemsPrincipais, itemsRepo, grupo.titulo, grupo.congelado, mesesRelevantes, statusPorMembro, agendaMap, grupo.group_id);

  // pizza de presença: sempre um mês concreto — "Visão Geral" resolve pro mês real atual (ver
  // comentário em calcularPresencaMes/mesAtualReal).
  const historicoPorMembroMes = new Map<string, { statusAnterior: string | null }[]>();
  dados.statusHistorico.forEach((h: any) => {
    const chave = `${h.membro_id}|${h.mes}`;
    if (!historicoPorMembroMes.has(chave)) historicoPorMembroMes.set(chave, []);
    historicoPorMembroMes.get(chave)!.push({ statusAnterior: h.status_anterior });
  });
  const mesPresenca = geral ? mesAtualReal() : seletorMes;
  const presencaMes = calcularPresencaMes(itemsPrincipais, itemsRepo, mesPresenca, statusPorMembro, historicoPorMembroMes);

  // nível / conselheiro / CS responsável a partir do título, ex. "Fast Track | Julio Faccioli (Vitor)"
  const contato = extrairContatoDoTitulo(grupo.titulo);
  const nivelMatch = grupo.titulo.match(/^(.*?)\s*\|/);
  const nivel = nivelMatch ? nivelMatch[1].trim() : null;
  const csMatch = grupo.titulo.match(/\((.*?)\)\s*$/);
  const csResponsavel = csMatch ? csMatch[1].trim() : null;

  // cases/matchmakings do período, só deste conselho — mesmo critério de casamento por nome de
  // calcularImpactoConselhos, aplicado a um roster só em vez de todos os grupos de uma vez.
  const casesPeriodo = (geral ? filtrarAnoFlexivel(dados.cases, ano) : filtrarPorMesAnoFlexivel(dados.cases, seletorMes, ano))
    .filter((c: any) => itemPertenceRoster(c.nome, roster));
  const mmPeriodo = (geral ? filtrarAnoFlexivel(dados.matchmakings, ano) : filtrarPorMesAnoFlexivel(dados.matchmakings, seletorMes, ano))
    .filter((m: any) => itemPertenceRoster(m.nome, roster));

  // ata do período selecionado (por nome de mês sem acento + ano resolvido via anoDaAta)
  const atasDoConselho = organizarAtasDoConselho(dados.atas, groupId, roster, contato, agendaMap, ano);
  const atasNoPeriodo = new Map<string, AtaMembroMes[]>();
  atasDoConselho.forEach((lista, nomeMembro) => {
    const filtradas = lista.filter((a) => geral
      ? a.ano === ano
      : (a.ano === ano && normalizarMesSemAcento(a.mesAta) === normalizarMesSemAcento(seletorMes)));
    if (filtradas.length > 0) atasNoPeriodo.set(nomeMembro, filtradas);
  });
  const totalOportunidadesMapeadas = [...atasNoPeriodo.values()]
    .reduce((soma, lista) => soma + lista.reduce((s, a) => s + (a.oportunidadesMapeadas?.length || 0), 0), 0);

  // GTD do período — mesma fonte que já alimenta o card do CS (historico_conselhos_items),
  // casado pelo conselheiro extraído do título.
  const cicloAtual = cicloAtualPorConselho(dados.historico);
  const histDoConselho = contato ? cicloAtual.find((h: any) => normalizeNome(h.membro) === normalizeNome(contato)) : null;
  const taxaCumprimentoGtd = histDoConselho ? histDoConselho.taxa_cumprimento : null;

  const healthscore = calcularHealthscore({
    presente: resumo.presente, registros: resumo.registros,
    taxaCumprimentoGtd,
    totalCasesMatchmakings: casesPeriodo.length + mmPeriodo.length,
    numMembros: roster.length,
  });

  // membros expansíveis: cada membro do roster oficial (titulares), com a presença e a ata (se
  // existir) de cada mês do período — membro/mês sem ata fica de fora do array `atas` daquele
  // membro; quem renderiza mostra o estado vazio explícito, nunca omite a linha do membro.
  const membros = itemsPrincipais.map((m: any) => {
    const presencaPorMes = mesesRelevantes.map((mes) => ({ mes, status: statusPorMembro.get(m.id)?.get(mes) || null }));
    const atas = (atasNoPeriodo.get(m.nome) || []).sort((a, b) => a.ano - b.ano || indiceMesAta(a.mesAta) - indiceMesAta(b.mesAta));
    return { nome: m.nome, presencaPorMes, atas };
  });

  // lista de encontros dentro do período: um encontro por mês (cada mês tem no máximo uma
  // reunião do conselho), com a presença agregada daquele mês — inclui titulares E substitutos
  // do grupo de reposição (mesmo critério de resumo.presente/registros em parseConselhoItems,
  // pra "totalEncontros" nas métricas e a soma aqui nunca divergirem). Só entra na lista o mês
  // que realmente teve algum dado de presença/ausência (agendados > 0).
  const encontros = mesesRelevantes.map((mes) => {
    let presentesNoMes = 0, agendadosNoMes = 0;
    itemsPrincipais.forEach((m: any) => {
      const s = statusPorMembro.get(m.id)?.get(mes);
      if (s === STATUS_PRESENTE) { presentesNoMes++; agendadosNoMes++; }
      else if (s && STATUS_AUSENTE_SET.includes(s)) agendadosNoMes++;
    });
    itemsRepo.forEach((r: any) => {
      const s = statusPorMembro.get(r.id)?.get(mes);
      if (s === STATUS_PRESENTE) { presentesNoMes++; agendadosNoMes++; }
    });
    return { mes, presentes: presentesNoMes, agendados: agendadosNoMes };
  }).filter((e) => e.agendados > 0);

  const fotoConselheiro = contato
    ? dados.conselheirosFotos.find((f: any) => normalizeNome(f.conselheiro_nome) === normalizeNome(contato))
    : null;

  return {
    grupo: {
      groupId: grupo.group_id, titulo: resumo.nome, nivel, conselheiro: contato, csResponsavel,
      congelado: grupo.congelado,
      fotoConselheiroUrl: fotoConselheiro?.foto_base64 || null,
    },
    periodo: { mes: seletorMes, ano, geral },
    metricas: {
      totalEncontros: resumo.registros || 0,
      totalMatchmakings: mmPeriodo.length,
      totalCases: casesPeriodo.length,
      totalOportunidadesMapeadas,
      healthscore,
    },
    presencaMes,
    encontros,
    membros,
  };
}
export type ConselhoDetalhe = Awaited<ReturnType<typeof generateConselhoDetalhe>>;
