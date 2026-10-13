// Funções puras da agenda de conselhos (13/10/2026). Única fonte de faixa, turno, cobrança e prazo:
// o gerador (lib/reports.ts) chama estas funções e o componente do cliente só lê o resultado, então
// nenhum limiar é repetido no navegador.
import { SEMAFORO_CONFIRMADOS, SemaforoChave, AGENDA_TURNOS, AgendaTurnoChave } from './constants';

const MS_DIA = 86_400_000;
const OFFSET_BRT_MS = 3 * 60 * 60 * 1000; // Brasília não tem horário de verão desde 2019

// Faixa de confirmados (vermelho 0 a 1, laranja 2 a 3, amarelo 4 a 5, verde 6 a 7, azul 8 ou mais).
export function faixaDoSemaforo(confirmados: number): SemaforoChave {
  const f = SEMAFORO_CONFIRMADOS.find((x) => confirmados >= x.de && (x.ate === null || confirmados <= x.ate));
  if (!f) throw new Error(`Confirmados fora da faixa: ${confirmados}`);
  return f.chave;
}

// Dia (YYYY-MM-DD) e minuto do dia em Brasília de um instante ISO.
export function instanteBRT(iso: string): { diaIso: string; minutos: number } {
  const brt = new Date(new Date(iso).getTime() - OFFSET_BRT_MS);
  return {
    diaIso: brt.toISOString().slice(0, 10),
    minutos: brt.getUTCHours() * 60 + brt.getUTCMinutes(),
  };
}

export function turnoDoMinuto(minutos: number): AgendaTurnoChave {
  let escolhido: AgendaTurnoChave = AGENDA_TURNOS[0].chave;
  for (const t of AGENDA_TURNOS) if (minutos >= t.inicioMin) escolhido = t.chave;
  return escolhido;
}

// Dias corridos desde a época, a partir de YYYY-MM-DD.
export function diaNumero(diaIso: string): number {
  const [y, m, d] = diaIso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_DIA);
}

function diaDeNumero(n: number): string {
  return new Date(n * MS_DIA).toISOString().slice(0, 10);
}

// Precisa de cobrança: conselho ainda não passado, não congelado, na faixa vermelha ou laranja.
export function precisaCobranca(p: { confirmados: number; passado: boolean; congelado: boolean }): boolean {
  if (p.passado || p.congelado) return false;
  const faixa = faixaDoSemaforo(p.confirmados);
  return faixa === 'vermelho' || faixa === 'laranja';
}

// Prazo de cobrança: até a véspera do conselho. Se hoje já é a véspera ou o próprio dia, o prazo é
// hoje (texto "cobrar hoje").
export type PrazoCobranca = { tipo: 'hoje' } | { tipo: 'ate'; diaIso: string };
export function prazoCobranca(diaConselhoIso: string, hojeIso: string): PrazoCobranca {
  const dc = diaNumero(diaConselhoIso);
  const hoje = diaNumero(hojeIso);
  if (hoje >= dc - 1) return { tipo: 'hoje' };
  return { tipo: 'ate', diaIso: diaDeNumero(dc - 1) };
}

// Nome exibido: o cadastro (conselheiros.nome) quando há vínculo; senão o nome da agenda sem o
// trecho entre colchetes ou parênteses (ex. "Henrique Guimalhaes [André Froes]").
export function nomeExibido(nomeAgenda: string, nomeCadastro: string | null | undefined): string {
  if (nomeCadastro && nomeCadastro.trim()) return nomeCadastro.trim();
  return nomeAgenda.replace(/\s*[\[(][^\])]*[\])]/g, '').replace(/\s+/g, ' ').trim();
}

// Lista de CS de um round (cs_responsavel_raw é multi-pessoa, ex. "Vitor, Mateus").
export function csDoRound(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

// Horário HH:MM a partir de minutos do dia.
export function hhmmDeMinutos(minutos: number): string {
  return String(Math.floor(minutos / 60)).padStart(2, '0') + ':' + String(minutos % 60).padStart(2, '0');
}
