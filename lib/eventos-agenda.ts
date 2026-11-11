// Eventos da MOAI na agenda (11/11/2026): junta o espelho da Escala de Eventos (eventos_items, Monday) com
// as contagens do Sympla (sympla_eventos) e devolve um item por evento, pronto para o componente da agenda.
// Meta efetiva, ritmo de venda, casamento e turno saem daqui; o cliente só desenha.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgendaTurnoChave } from './constants';
import { instanteBRT, turnoDoMinuto, hhmmDeMinutos, csDoRound, diaNumero } from './agenda';
import { parseMeta, metaTotal, casarEventos, ritmoDoEvento, eventoCancelado, type RitmoEvento } from './eventos';

export type AgendaEventoItem = {
  tipo: 'evento';
  id: string; // m<id do Monday> ou s<id do Sympla>
  nome: string; label: string | null; produto: string | null; local: string | null;
  // diaIso é o dia em que o cartão aparece na semana; diaInicioIso e diaFimIso são as datas reais.
  diaIso: string; diaInicioIso: string; diaFimIso: string; hhmm: string; turno: AgendaTurnoChave; horarioTexto: string | null;
  passado: boolean; cancelado: boolean; escalaStatus: string | null;
  cs: string | null; csLista: string[];
  meta: { tipo: 'total' | 'por_escalado'; valor: number; total: number | null; texto: string } | null;
  sympla: { id: number; vendidos: number | null; checkins: number | null; vendidos7d: number | null; url: string | null; contagemEm: string | null } | null;
  ritmo: RitmoEvento; faltam: number | null; diasAteEvento: number;
  fonte: 'monday' | 'sympla' | 'ambos';
  // Id do Sympla tirado do link dos convites no Monday, mesmo quando o Sympla ainda não foi lido.
  symplaIdVinculado: number | null;
};

const COLS_MONDAY = 'id,nome,nome_limpo,data_inicio,data_fim,horario_raw,inicio,local,label,produto,escala_status,status_evento,meta_raw,escalados_raw,sympla_event_id';
const COLS_SYMPLA = 'id,nome,inicio,fim,url,cancelado,vendidos,checkins,vendidos_7d,contagem_em';

function somarDiasIso(diaIso: string, n: number): string {
  return new Date((diaNumero(diaIso) + n) * 86_400_000).toISOString().slice(0, 10);
}

export async function eventosDaAgenda(sb: SupabaseClient, dataInicioISO: string, dataFimISO: string, agora = new Date()): Promise<AgendaEventoItem[]> {
  // Um evento de vários dias que começou antes da semana também aparece: a busca abre 7 dias para trás.
  const desde = somarDiasIso(dataInicioISO, -7);
  const [m, s] = await Promise.all([
    sb.from('eventos_items').select(COLS_MONDAY).gte('data_inicio', desde).lt('data_inicio', dataFimISO),
    sb.from('sympla_eventos').select(COLS_SYMPLA).gte('inicio', desde + 'T00:00:00-03:00').lt('inicio', dataFimISO + 'T00:00:00-03:00'),
  ]);
  if (m.error) throw new Error('eventos_items: ' + m.error.message);
  if (s.error) throw new Error('sympla_eventos: ' + s.error.message);
  const monday = (m.data || []) as any[];
  const sympla = (s.data || []) as any[];

  const casados = casarEventos(
    monday.map((r) => ({ id: Number(r.id), nome: r.nome_limpo || r.nome, data_inicio: r.data_inicio, data_fim: r.data_fim, inicio: r.inicio, sympla_event_id: r.sympla_event_id == null ? null : Number(r.sympla_event_id) })),
    sympla.map((r) => ({ id: Number(r.id), nome: r.nome, inicio: r.inicio })),
  );
  const symplaPorId = new Map(sympla.map((r) => [Number(r.id), r]));
  const usados = new Set(casados.values());
  const hojeIso = instanteBRT(agora.toISOString()).diaIso;

  const resumoSympla = (r: any | undefined) => r ? {
    id: Number(r.id), vendidos: r.vendidos ?? null, checkins: r.checkins ?? null, vendidos7d: r.vendidos_7d ?? null,
    url: r.url || null, contagemEm: r.contagem_em || null,
  } : null;

  const itens: AgendaEventoItem[] = [];
  monday.forEach((r) => {
    if (!r.data_inicio) return;
    const sy = casados.has(Number(r.id)) ? symplaPorId.get(casados.get(Number(r.id))!) : undefined;
    const inicioIso: string | null = r.inicio || (sy ? sy.inicio : null);
    const temHora = !!inicioIso;
    const { minutos } = temHora ? instanteBRT(inicioIso!) : { minutos: 9 * 60 };
    const diaIso = r.data_inicio as string;
    const diaFimIso = (r.data_fim || r.data_inicio) as string;
    const passado = diaFimIso < hojeIso;
    const csLista = csDoRound(r.escalados_raw);
    const metaP = parseMeta(r.meta_raw);
    const total = metaTotal(metaP, csLista.length);
    const sym = resumoSympla(sy);
    const dias = diaNumero(diaIso) - diaNumero(hojeIso);
    itens.push({
      tipo: 'evento', id: 'm' + r.id,
      nome: r.nome_limpo || r.nome, label: r.label || null, produto: r.produto || null, local: r.local || null,
      diaIso, diaInicioIso: diaIso, diaFimIso, hhmm: temHora ? hhmmDeMinutos(minutos) : '', turno: turnoDoMinuto(minutos), horarioTexto: r.horario_raw || null,
      passado, cancelado: eventoCancelado(r.escala_status, r.status_evento), escalaStatus: r.escala_status || null,
      cs: csLista.length ? csLista.join(', ') : null, csLista,
      meta: metaP ? { tipo: metaP.tipo, valor: metaP.valor, total, texto: metaP.texto } : null,
      sympla: sym,
      ritmo: ritmoDoEvento({ vendidos: sym ? sym.vendidos : null, meta: total, diasAteEvento: dias, passado }),
      faltam: total != null && sym && sym.vendidos != null ? Math.max(0, total - sym.vendidos) : null,
      diasAteEvento: dias,
      fonte: sym ? 'ambos' : 'monday',
      symplaIdVinculado: r.sympla_event_id == null ? null : Number(r.sympla_event_id),
    });
  });

  // Eventos do Sympla sem par no Monday entram sozinhos (sem escala e sem meta), exceto os cancelados.
  sympla.forEach((r) => {
    if (usados.has(Number(r.id)) || r.cancelado || !r.inicio) return;
    const { diaIso, minutos } = instanteBRT(r.inicio);
    const diaFimIso = r.fim ? instanteBRT(r.fim).diaIso : diaIso;
    const passado = diaFimIso < hojeIso;
    const sym = resumoSympla(r);
    itens.push({
      tipo: 'evento', id: 's' + r.id, nome: r.nome, label: null, produto: null, local: null,
      diaIso, diaInicioIso: diaIso, diaFimIso, hhmm: hhmmDeMinutos(minutos), turno: turnoDoMinuto(minutos), horarioTexto: null,
      passado, cancelado: false, escalaStatus: null, cs: null, csLista: [], meta: null, sympla: sym,
      ritmo: ritmoDoEvento({ vendidos: sym!.vendidos, meta: null, diasAteEvento: diaNumero(diaIso) - diaNumero(hojeIso), passado }),
      faltam: null, diasAteEvento: diaNumero(diaIso) - diaNumero(hojeIso), fonte: 'sympla', symplaIdVinculado: Number(r.id),
    });
  });

  // Só o que toca a semana pedida: começa antes do fim e termina a partir do início.
  return itens
    .filter((e) => e.diaIso < dataFimISO && e.diaFimIso >= dataInicioISO)
    .map((e) => (e.diaIso < dataInicioISO ? { ...e, diaIso: dataInicioISO } : e))
    .sort((a, b) => (a.diaIso + a.hhmm < b.diaIso + b.hhmm ? -1 : 1));
}
