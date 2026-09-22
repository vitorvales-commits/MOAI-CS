// Port do Code.gs original (Apps Script) para o novo stack Next.js + Supabase.
// Mesma lógica de negócio do arquivo "Code.Gs" no projeto MOAI — só troca a origem dos dados
// (Monday API -> Postgres, já espelhado pela Edge Function sync-monday) e corrige o bug do
// dia 31 fixo em periodoDatas (ver seção "Bug crítico" em claude/migracao_vercel_supabase.md).
//
// Este arquivo não usa cache (CacheService/planilha do Apps Script não existem aqui) porque
// ler do Postgres já é rápido o bastante — era o Monday que exigia cache agressivo.

import type { SupabaseClient } from '@supabase/supabase-js';
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

async function fetchAll(sb: SupabaseClient, table: string) {
  const { data, error } = await sb.from(table).select('*').range(0, 9999);
  if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
  return data || [];
}

export async function getDadosBrutos(sb: SupabaseClient) {
  const [
    churn, upsellDownsell, reportsSemanais, metas, rounds, feedback, cases, matchmakings,
    conselhosGrupos, conselhosMembros, conselhosStatusMensal, agenda, historico,
  ] = await Promise.all([
    fetchAll(sb, 'churn_items'), fetchAll(sb, 'upsell_downsell_items'), fetchAll(sb, 'reports_semanais_items'),
    fetchAll(sb, 'metas_subitens'), fetchAll(sb, 'rounds_items'), fetchAll(sb, 'feedback_items'), fetchAll(sb, 'cases_items'),
    fetchAll(sb, 'matchmakings_items'), fetchAll(sb, 'conselhos_grupos'), fetchAll(sb, 'conselhos_membros'),
    fetchAll(sb, 'conselhos_status_mensal'), fetchAll(sb, 'agenda_conselhos_items'), fetchAll(sb, 'historico_conselhos_items'),
  ]);
  return {
    churn, upsellDownsell, reportsSemanais, metas, rounds, feedback, cases, matchmakings,
    conselhosGrupos, conselhosMembros, conselhosStatusMensal, agenda, historico,
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

  return {
    nome: nomeGrupo, congelado, membros: membrosBase,
    presente: temDado ? presentes : null,
    ausente: temDado ? (agendados - presentes) : null,
    reposicao: temDado ? reposPresentes : null,
    registros: temDado ? agendados : null,
    status: temDado ? 'realizado' : 'aguardando_confirmacao',
    membrosDetalhe: membrosDetalhe.map((m) => ({ nome: m.nome, reposicao: m.reposicao, taxa: m.registros > 0 ? Math.round((m.presente / m.registros) * 100) : null })),
    confirmadosFuturos: confirmadosDeduplicados,
    proximaData: proximoConselho ? proximoConselho.dataIso : null,
    proximaDataEhFutura: proximoConselho ? proximoConselho.futuro : null,
    proximaDataStatus: proximoConselho ? proximoConselho.status : null,
    gtd: null as null | { taxaCumprimento: number | null; dataConselho: string | null; etapas: any[]; etapasAtrasadas: string[] },
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
    return parseConselhoItems(itemsPrincipais, itemsRepo, g.titulo, g.congelado, mesesRelevantes, statusPorMembro, agendaMap);
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

  // impacto dos conselhos (histórico completo, independente do período selecionado): cases e
  // matchmakings atribuídos a cada conselho, casando pelo nome do conselheiro extraído do título.
  const impactoConselhos = calcularImpactoConselhos(dados);

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
    impactoConselhos,
  };
}

// impacto dos conselhos: soma, por conselho (grupo ativo), todos os cases/matchmakings de todos
// os meses que mencionam esse conselheiro (casamento por nome, já que o Monday não guarda um
// vínculo direto item -> conselho) — histórico completo, não filtrado por mês/ano selecionado.
function calcularImpactoConselhos(dados: DadosBrutos) {
  const gruposAtivos = dados.conselhosGrupos.filter((g: any) => !g.is_repo);
  let totalCases = 0, totalMatchmakings = 0, matchmakingsSemResultado = 0;
  const porConselho: { nome: string; cs: string; total: number }[] = [];
  gruposAtivos.forEach((g: any) => {
    const contato = extrairContatoDoTitulo(g.titulo);
    if (!contato) return;
    const casesDoConselho = dados.cases.filter((c: any) => c.empresa && normalizeNome(c.nome).includes(normalizeNome(contato)));
    const mmDoConselho = dados.matchmakings.filter((m: any) => normalizeNome(m.nome).includes(normalizeNome(contato)));
    totalCases += casesDoConselho.length;
    totalMatchmakings += mmDoConselho.length;
    const total = casesDoConselho.length + mmDoConselho.length;
    if (total > 0) {
      const cfgMatch = g.titulo.match(/\((.*?)\)\s*$/);
      porConselho.push({ nome: g.titulo, cs: cfgMatch ? cfgMatch[1] : '', total });
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
