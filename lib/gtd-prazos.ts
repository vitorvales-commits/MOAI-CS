// Prazo, ciclo aberto e status das etapas do GTD de conselho (07/10/2026). Funções puras, sem
// acesso a banco. Fonte única: Urgências do gestor, seção Andamento do GTD da página do CS e
// detalhe do conselho usam estas mesmas funções. O prazo NUNCA é deduzido do prefixo do rótulo
// (os rótulos trazem sinais inconsistentes): vem de GTD_PRAZOS_ETAPA em lib/constants.ts.
// Datas são strings ISO AAAA-MM-DD; "hoje" é sempre o dia civil em America/Sao_Paulo.
// Roda com: node --experimental-strip-types tests/gtd-prazos.test.ts
import { GTD_PRAZOS_ETAPA, GTD_DIAS_CICLO_ABERTO, GTD_JANELA_A_VENCER_DIAS } from './constants.ts';

const MS_DIA = 86_400_000;

export function diaNumero(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_DIA);
}
export function isoDeDia(n: number): string {
  return new Date(n * MS_DIA).toISOString().slice(0, 10);
}
export function somarDias(iso: string, dias: number): string | null {
  const n = diaNumero(iso);
  return n === null ? null : isoDeDia(n + dias);
}
// Dia civil de hoje em America/Sao_Paulo.
export function hojeSP(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

export function normalizarRotulo(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function chaveEtapaGTD(rotulo: unknown): string | null {
  const n = normalizarRotulo(rotulo);
  const achada = GTD_PRAZOS_ETAPA.find((e) => n.includes(e.trecho));
  return achada ? achada.chave : null;
}

// Data de prazo da etapa, ou null quando o rótulo não casa com a tabela.
export function prazoEtapaGTD(rotulo: unknown, dataConselho: string | null | undefined): string | null {
  const n = normalizarRotulo(rotulo);
  const achada = GTD_PRAZOS_ETAPA.find((e) => n.includes(e.trecho));
  if (!achada || diaNumero(dataConselho) === null) return null;
  return somarDias(String(dataConselho).slice(0, 10), achada.dias);
}

// Ciclo aberto: hoje é menor ou igual a data_conselho mais GTD_DIAS_CICLO_ABERTO.
export function cicloAberto(dataConselho: string | null | undefined, hoje: string = hojeSP()): boolean {
  const c = diaNumero(dataConselho), h = diaNumero(hoje);
  if (c === null || h === null) return false;
  return h <= c + GTD_DIAS_CICLO_ABERTO;
}

export type StatusEtapa = 'feita' | 'atrasada' | 'a_vencer' | 'futura' | 'ciclo_fechado' | 'sem_prazo';
export type ResultadoEtapa = {
  status: StatusEtapa; prazo: string | null;
  // Dias de atraso (status atrasada) ou dias restantes (a_vencer, 0 é vence hoje). Nulo nos demais.
  dias: number | null;
};

export function statusEtapaGTD(rotulo: unknown, feito: boolean, dataConselho: string | null | undefined, hoje: string = hojeSP()): ResultadoEtapa {
  if (feito) return { status: 'feita', prazo: prazoEtapaGTD(rotulo, dataConselho), dias: null };
  if (!cicloAberto(dataConselho, hoje)) return { status: 'ciclo_fechado', prazo: prazoEtapaGTD(rotulo, dataConselho), dias: null };
  const prazo = prazoEtapaGTD(rotulo, dataConselho);
  if (prazo === null) return { status: 'sem_prazo', prazo: null, dias: null };
  const p = diaNumero(prazo) as number, h = diaNumero(hoje) as number;
  if (p < h) return { status: 'atrasada', prazo, dias: h - p };
  if (p <= h + GTD_JANELA_A_VENCER_DIAS) return { status: 'a_vencer', prazo, dias: p - h };
  return { status: 'futura', prazo, dias: null };
}

export type LinhaCicloGTD = {
  id_item_conselho: string | null; membro: string | null; cs_responsavel: string | null;
  data_conselho: string | null; data_snapshot?: string | null;
  etapas: { label: string; feito: boolean }[] | null;
};
export type EtapaPendente = {
  cs: string; membro: string; idItem: string | null; dataConselho: string;
  etapa: string; rotulo: string; status: 'atrasada' | 'a_vencer'; prazo: string; dias: number;
};

// Etapas atrasadas e a vencer de todos os ciclos ABERTOS. Ciclo fechado nunca entra (aparece só
// como taxa histórica nos insights). Rótulos sem prazo mapeado vão em naoMapeados.
export function etapasPendentes(linhas: LinhaCicloGTD[], hoje: string = hojeSP()): { pendentes: EtapaPendente[]; naoMapeados: string[]; ciclosAbertos: LinhaCicloGTD[] } {
  const pendentes: EtapaPendente[] = [];
  const naoMapeados = new Set<string>();
  const ciclosAbertos = linhas.filter((l) => cicloAberto(l.data_conselho, hoje));
  ciclosAbertos.forEach((l) => {
    (l.etapas || []).forEach((e) => {
      const r = statusEtapaGTD(e.label, !!e.feito, l.data_conselho, hoje);
      if (r.status === 'sem_prazo') naoMapeados.add(String(e.label));
      if ((r.status === 'atrasada' || r.status === 'a_vencer') && r.prazo !== null && r.dias !== null) {
        const rotulo = String(e.label).replace(/^\s*D\s*[+\-−–]\s*\d+\s*/i, '');
        pendentes.push({ cs: String(l.cs_responsavel || ''), membro: String(l.membro || ''), idItem: l.id_item_conselho, dataConselho: String(l.data_conselho), etapa: String(e.label), rotulo, status: r.status, prazo: r.prazo, dias: r.dias });
      }
    });
  });
  return { pendentes, naoMapeados: [...naoMapeados], ciclosAbertos };
}
