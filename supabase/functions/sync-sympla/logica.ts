// Funções puras da sync-sympla (11/11/2026). Recebem o que a API pública v3 do Sympla devolve e produzem
// só contagens: nenhum nome, email, documento ou número de ingresso sai daqui.

export const SYMPLA_BASE = 'https://api.sympla.com.br/public/v3';
// Janela de leitura: eventos que começam a partir de 45 dias atrás (os passados recentes ainda recebem
// check-in e servem de comparação), e no máximo este número de eventos com contagem por ciclo.
export const SYMPLA_JANELA_PASSADO_DIAS = 45;
export const SYMPLA_MAX_EVENTOS_CONTAGEM = 40;
export const SYMPLA_PAGE_SIZE = 200;

// "2026-11-24 10:00:00" (horário de Brasília, sem fuso) vira ISO com -03:00. ISO com fuso passa direto.
export function dataSymplaParaIso(txt: unknown): string | null {
  if (!txt || typeof txt !== 'string') return null;
  const t = txt.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)) return new Date(t).toISOString();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4] || '00'}-03:00`).toISOString();
}

function booleano(v: unknown): boolean | null {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return null;
}

export type EventoSymplaLinha = {
  id: number; nome: string; inicio: string | null; fim: string | null; url: string | null;
  publicado: boolean | null; cancelado: boolean | null;
};
export function eventoDaApi(e: any): EventoSymplaLinha | null {
  const id = Number(e?.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    nome: String(e?.name || '').trim() || `Evento ${id}`,
    inicio: dataSymplaParaIso(e?.start_date),
    fim: dataSymplaParaIso(e?.end_date),
    url: typeof e?.url === 'string' ? e.url.split('?')[0] : null,
    publicado: booleano(e?.published),
    cancelado: booleano(e?.cancelled),
  };
}

// Check-in: v3 traz checkin como lista [{ check_in: true, ... }] ou como objeto.
function fezCheckin(p: any): boolean {
  const c = p?.checkin;
  if (Array.isArray(c)) return c.some((x) => booleano(x?.check_in) === true);
  if (c && typeof c === 'object') return booleano(c.check_in) === true;
  return false;
}

// Pedido aprovado: status "A" na v3. Sem status conhecido, conta (a lista de participantes da v3 já
// traz só ingressos válidos).
function pedidoAprovado(o: any): boolean {
  const s = String(o?.order_status ?? '').toUpperCase();
  return s === '' || s === 'A' || s === 'APPROVED';
}

export type ContagemEvento = { vendidos: number; checkins: number; vendidos_7d: number; ultima_venda: string | null };
// participantes: lista da v3 (um por ingresso). pedidos: lista de pedidos, para data da venda.
export function contarEvento(participantes: any[], pedidos: any[], agoraMs: number): ContagemEvento {
  const dataPorPedido = new Map<string, number>();
  const aprovados = new Set<string>();
  (pedidos || []).forEach((o) => {
    const id = String(o?.id ?? '');
    if (!id) return;
    if (pedidoAprovado(o)) aprovados.add(id);
    const iso = dataSymplaParaIso(o?.approved_date || o?.order_date);
    if (iso) dataPorPedido.set(id, new Date(iso).getTime());
  });
  const temPedidos = (pedidos || []).length > 0;
  let vendidos = 0; let checkins = 0; let v7 = 0; let ultima = 0;
  const limite7 = agoraMs - 7 * 86_400_000;
  (participantes || []).forEach((p) => {
    const pedido = String(p?.order_id ?? '');
    if (temPedidos && pedido && dataPorPedido.has(pedido) && !aprovados.has(pedido)) return;
    vendidos++;
    if (fezCheckin(p)) checkins++;
    const quando = dataPorPedido.get(pedido);
    if (quando != null) {
      if (quando >= limite7) v7++;
      if (quando > ultima) ultima = quando;
    }
  });
  return { vendidos, checkins, vendidos_7d: v7, ultima_venda: ultima ? new Date(ultima).toISOString() : null };
}

// Quais eventos recebem contagem neste ciclo: não cancelados, que terminam a partir de 2 dias atrás,
// os mais próximos primeiro, até o máximo.
export function eventosParaContar(eventos: EventoSymplaLinha[], agoraMs: number, max = SYMPLA_MAX_EVENTOS_CONTAGEM): EventoSymplaLinha[] {
  const corte = agoraMs - 2 * 86_400_000;
  return eventos
    .filter((e) => !e.cancelado && new Date(e.fim || e.inicio || 0).getTime() >= corte)
    .sort((a, b) => new Date(a.inicio || 0).getTime() - new Date(b.inicio || 0).getTime())
    .slice(0, max);
}

// Paginação da v3: { data: [...], pagination: { has_next } }.
export function temProximaPagina(corpo: any): boolean {
  return booleano(corpo?.pagination?.has_next) === true;
}
