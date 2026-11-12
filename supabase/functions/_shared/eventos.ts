// Fonte única: este arquivo é importado pelas Edge Functions (sync-monday, sync-sympla) e reexportado
// para o Next.js por lib/eventos.ts. Sem imports, para servir aos dois ambientes (Deno e Node).
// Eventos da MOAI na agenda (11/11/2026). Funções puras, sem I/O, usadas pela Edge Function sync-monday
// (leitura do board "Escala de Eventos", 18396183284), pela sync-sympla (casamento por id) e pelo gerador
// da agenda (lib/reports.ts). Fonte única das regras de meta, horário, casamento Monday e Sympla e ritmo
// de venda: o cliente só desenha o que chega pronto.
//
// Fontes:
//   Monday, board Escala de Eventos: nome, data (timeline), horário em texto livre, local, label, produto,
//   status da escala, meta em texto livre ("60 pessoas", "5 para cada"), escalados (coluna de pessoas) e o
//   link dos convites, que costuma ser o link do Sympla com o id numérico do evento.
//   Sympla, API pública v3: eventos do organizador e contagem de ingressos (participantes) e check-ins.
//   Nada de nome, email ou documento de participante é gravado: só contagens.

export type MetaEvento =
  | { tipo: 'total'; valor: number; texto: string }
  | { tipo: 'por_escalado'; valor: number; texto: string }
  | null;

// "60 pessoas", "60", "meta 60", "5 para cada", "3 por CS", "5 cada". Texto sem número ou "a definir" vira null.
export function parseMeta(raw: string | null | undefined): MetaEvento {
  if (!raw) return null;
  const texto = String(raw).trim();
  const m = texto.match(/(\d{1,4})/);
  if (!m) return null;
  const valor = Number(m[1]);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const porPessoa = /\b(para cada|pra cada|por cada|cada|por cs|por escalad\w*|por pessoa|por cabe[cç]a)\b/i.test(texto);
  return { tipo: porPessoa ? 'por_escalado' : 'total', valor, texto };
}

// Meta total efetiva: a meta por escalado multiplica pelo número de escalados; sem escalados, fica sem total.
export function metaTotal(meta: MetaEvento, escalados: number): number | null {
  if (!meta) return null;
  if (meta.tipo === 'total') return meta.valor;
  return escalados > 0 ? meta.valor * escalados : null;
}

// Primeiro horário do texto livre: "19h", "19h30", "10h-12h", "09-18 e 09-20", "8h às 14h", "19:30".
// "A definir", vazio ou sem hora plausível devolve null.
export function parseHorarioInicio(raw: string | null | undefined): { minutos: number } | null {
  if (!raw) return null;
  const t = String(raw).toLowerCase();
  const m = t.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?|(\d{1,2})(?=\s*(?:-|às|as|a)\s*\d)/);
  if (!m) return null;
  const hora = Number(m[1] ?? m[3]);
  const min = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(hora) || hora > 23 || min > 59) return null;
  return { minutos: hora * 60 + min };
}

// Turno a partir da coluna Turno do board, quando o horário não tem hora.
export function minutosDoTurno(turno: string | null | undefined): number | null {
  const t = String(turno || '').toLowerCase();
  if (t.startsWith('manh') || t.startsWith('dia todo')) return 9 * 60;
  if (t.startsWith('tarde')) return 14 * 60;
  if (t.startsWith('noite')) return 19 * 60;
  return null;
}

// Timeline do Monday em texto: "2026-11-12 - 2026-11-13" ou "2026-11-24".
export function parseTimeline(raw: string | null | undefined): { inicio: string; fim: string } | null {
  if (!raw) return null;
  const datas = String(raw).match(/\d{4}-\d{2}-\d{2}/g);
  if (!datas || !datas.length) return null;
  return { inicio: datas[0], fim: datas[datas.length - 1] };
}

// Instante ISO com fuso de Brasília a partir do dia e dos minutos do dia.
export function isoBRT(diaIso: string, minutos: number): string {
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mm = String(minutos % 60).padStart(2, '0');
  return `${diaIso}T${hh}:${mm}:00-03:00`;
}

// Id numérico do evento no link do Sympla: /evento/<slug>/3647115 ou /evento/3647115.
export function idSymplaDoLink(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/sympla\.com\.br\/(?:evento|eventos|evento-online)\/(?:[^/?#\s]+\/)?(\d{5,10})/i);
  return m ? Number(m[1]) : null;
}

// Nome sem o prefixo de data "[12/11-13/11]" e sem espaços repetidos.
export function nomeLimpo(raw: string | null | undefined): string {
  return String(raw || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim();
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const PALAVRAS_VAZIAS = new Set(['moai', 'de', 'da', 'do', 'e', 'a', 'o', 'com', 'para', 'na', 'no', 'em', 'evento', 'the']);
function palavras(s: string): Set<string> {
  return new Set(normalizar(s).split(' ').filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p)));
}
// Semelhança de nomes (Jaccard das palavras relevantes), de 0 a 1.
export function semelhancaNomes(a: string, b: string): number {
  const pa = palavras(a); const pb = palavras(b);
  if (!pa.size || !pb.size) return 0;
  let comum = 0; pa.forEach((p) => { if (pb.has(p)) comum++; });
  return comum / (pa.size + pb.size - comum);
}
export const SEMELHANCA_MINIMA_CASAMENTO = 0.34;

export type EventoMonday = {
  id: number; nome: string; data_inicio: string | null; data_fim: string | null; inicio: string | null;
  sympla_event_id: number | null;
};
export type EventoSympla = { id: number; nome: string; inicio: string | null };

// Casamento Monday e Sympla. Primeiro pelo id do link; depois, para quem sobrou, mesmo dia em Brasília
// e nome parecido (o mais parecido acima do mínimo). Cada evento do Sympla casa com um só do Monday.
export function casarEventos(monday: EventoMonday[], sympla: EventoSympla[]): Map<number, number> {
  const casados = new Map<number, number>(); // id Monday -> id Sympla
  const usados = new Set<number>();
  const porId = new Map(sympla.map((s) => [s.id, s]));
  monday.forEach((m) => {
    if (m.sympla_event_id != null && porId.has(m.sympla_event_id) && !usados.has(m.sympla_event_id)) {
      casados.set(m.id, m.sympla_event_id); usados.add(m.sympla_event_id);
    }
  });
  const diaDe = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10) : null);
  monday.forEach((m) => {
    if (casados.has(m.id) || !m.data_inicio) return;
    let melhor: { id: number; nota: number } | null = null;
    sympla.forEach((s) => {
      if (usados.has(s.id)) return;
      const dia = diaDe(s.inicio);
      if (!dia || dia < m.data_inicio! || dia > (m.data_fim || m.data_inicio!)) return;
      const nota = semelhancaNomes(m.nome, s.nome);
      if (nota >= SEMELHANCA_MINIMA_CASAMENTO && (!melhor || nota > melhor.nota)) melhor = { id: s.id, nota };
    });
    if (melhor) { casados.set(m.id, (melhor as { id: number }).id); usados.add((melhor as { id: number }).id); }
  });
  return casados;
}

// Ritmo de venda contra a meta. Cor só para exceção: 'atencao' quando faltam poucos dias e a venda
// está longe da meta; 'critico' na véspera ou no dia com menos da metade. Evento passado não tem ritmo.
export const EVENTO_RITMO = { diasAtencao: 7, proporcaoAtencao: 0.7, diasCritico: 1, proporcaoCritico: 0.5 };
export type RitmoEvento = 'sem_meta' | 'sem_venda' | 'no_ritmo' | 'atencao' | 'critico' | 'meta_batida' | 'encerrado';
export function ritmoDoEvento(p: { vendidos: number | null; meta: number | null; diasAteEvento: number; passado: boolean }): RitmoEvento {
  if (p.passado) return 'encerrado';
  if (p.meta == null) return 'sem_meta';
  if (p.vendidos == null) return 'sem_venda';
  if (p.vendidos >= p.meta) return 'meta_batida';
  const prop = p.vendidos / p.meta;
  if (p.diasAteEvento <= EVENTO_RITMO.diasCritico && prop < EVENTO_RITMO.proporcaoCritico) return 'critico';
  if (p.diasAteEvento <= EVENTO_RITMO.diasAtencao && prop < EVENTO_RITMO.proporcaoAtencao) return 'atencao';
  return 'no_ritmo';
}

// Escala cancelada ou status do evento cancelado.
export function eventoCancelado(escala: string | null | undefined, status: string | null | undefined): boolean {
  return /cancelad/i.test(String(escala || '')) || /cancelad/i.test(String(status || ''));
}
