// Ritmo do mês em andamento (revisão out/2026, V3). Função pura: recebe os dados prontos e devolve
// o previsto até hoje, o status e a projeção de fechamento. Sem acesso a banco.
//
// Previsto = meta x fração do mês decorrida. A fração vem de duas bases:
//   - conselho: para Matchmakings e Cases de Sucesso, conselhos realizados até hoje dividido pelo total
//     de conselhos do CS no mês. Sem conselho no mês, cai para dias úteis.
//   - util: para Rounds, Upsell, Downsell e Indicações, dias úteis decorridos dividido pelo total.
// GTD e cumprimento são percentuais e não têm ritmo: quem chama compara o realizado direto com a meta.
import { FERIADOS_NACIONAIS_2026 } from './feriados';

export type BaseRitmo = 'conselho' | 'util';
export type StatusRitmo = 'no_ritmo' | 'atencao' | 'atras' | 'cedo' | 'sem_meta';

export interface EntradaRitmo {
  indicador: string;
  base: BaseRitmo;
  // Mês no formato AAAA-MM e data de hoje no formato AAAA-MM-DD (fuso de São Paulo, vindo de quem chama).
  mes: string;
  hoje: string;
  meta: number | null;
  realizado: number | null;
  // Só para base 'conselho': conselhos do CS no mês e quantos já aconteceram até hoje.
  conselhosTotal?: number;
  conselhosRealizados?: number;
}

export interface ResultadoRitmo {
  previsto: number | null;
  fracao: number;
  status: StatusRitmo;
  projecao: number | null;
  baseTexto: string;
}

// Limiar entre "Atenção" e "Atrás", em fração do previsto.
export const RITMO_LIMIAR_ATENCAO = 0.7;
// Abaixo dessa fração decorrida do mês não se projeta o fechamento (poucos dias de dado).
export const RITMO_FRACAO_MINIMA_PROJECAO = 0.25;

function diasDoMes(mes: string): string[] {
  const [ano, m] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const dias: string[] = [];
  for (let d = 1; d <= total; d++) dias.push(`${mes}-${String(d).padStart(2, '0')}`);
  return dias;
}

function ehDiaUtil(iso: string): boolean {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !FERIADOS_NACIONAIS_2026.includes(iso);
}

// Dias úteis do mês e quantos já passaram até hoje (hoje inclusive). Hoje depois do mês: tudo decorrido.
export function diasUteisDoMes(mes: string, hoje: string): { decorridos: number; total: number } {
  const dias = diasDoMes(mes);
  const uteis = dias.filter(ehDiaUtil);
  const decorridos = uteis.filter((d) => d <= hoje).length;
  return { decorridos, total: uteis.length };
}

export function calcularRitmo(e: EntradaRitmo): ResultadoRitmo {
  const uteis = diasUteisDoMes(e.mes, e.hoje);
  const fracaoUtil = uteis.total ? uteis.decorridos / uteis.total : 0;
  const usaConselho = e.base === 'conselho' && (e.conselhosTotal ?? 0) > 0;

  let fracao: number;
  let baseTexto: string;
  if (usaConselho) {
    const total = e.conselhosTotal!;
    const realizados = Math.min(e.conselhosRealizados ?? 0, total);
    fracao = realizados / total;
    baseTexto = `${realizados} de ${total} conselhos realizados`;
  } else {
    fracao = fracaoUtil;
    baseTexto = `${uteis.decorridos} de ${uteis.total} dias úteis`;
  }

  const realizado = e.realizado ?? null;
  const meta = e.meta;
  if (meta === null || meta === undefined || !(meta > 0)) {
    return { previsto: null, fracao, status: 'sem_meta', projecao: null, baseTexto };
  }

  const previsto = meta * fracao;
  const projecao = fracao >= RITMO_FRACAO_MINIMA_PROJECAO && realizado !== null && fracao > 0
    ? realizado / fracao
    : null;

  let status: StatusRitmo;
  if (previsto < 1 && (realizado ?? 0) === 0) status = 'cedo';
  else if (realizado === null) status = 'atras';
  else if (realizado >= previsto) status = 'no_ritmo';
  else if (previsto > 0 && realizado / previsto >= RITMO_LIMIAR_ATENCAO) status = 'atencao';
  else status = 'atras';

  return { previsto, fracao, status, projecao, baseTexto };
}

// Indicador sem ritmo (GTD): compara o realizado direto com a meta cheia, sem previsto.
// Até 70% da meta é "Atrás"; de 70% a 100% é "Atenção"; a partir de 100% é "No ritmo".
export function avaliarMetaCheia(meta: number | null | undefined, realizado: number | null | undefined): ResultadoRitmo {
  const baseTexto = 'meta cheia';
  if (meta === null || meta === undefined || !(meta > 0)) {
    return { previsto: null, fracao: 1, status: 'sem_meta', projecao: null, baseTexto };
  }
  if (realizado === null || realizado === undefined) {
    return { previsto: meta, fracao: 1, status: 'atras', projecao: null, baseTexto };
  }
  const razao = realizado / meta;
  const status: StatusRitmo = razao >= 1 ? 'no_ritmo' : razao >= RITMO_LIMIAR_ATENCAO ? 'atencao' : 'atras';
  return { previsto: meta, fracao: 1, status, projecao: null, baseTexto };
}
