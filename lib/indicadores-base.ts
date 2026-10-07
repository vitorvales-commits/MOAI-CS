// Funções puras do semáforo de confirmações, das faixas de presença e do Health da Base
// (07/10/2026). Sem acesso a banco nem a rede, para poderem ser testadas direto com
// node --experimental-strip-types (tests/indicadores-base.test.ts). Nenhum componente nem rota
// recalcula nada disto por conta própria: tudo passa por aqui.
//
// Percentuais e Health da Base trabalham em inteiros de décimos de ponto percentual: 800 significa
// 80,0 por cento. Evita erro de ponto flutuante e mantém uma casa decimal exata na tela.
import {
  SEMAFORO_CONFIRMADOS, SEMAFORO_NEUTRO, AGENDA_PASSADO_COR, FAIXAS_PRESENCA,
  PESO_PONTO_ADVERTENCIA_DECIMOS, REPORT_VALIDADE_DIAS,
  type SemaforoChave, type FaixaPresencaChave,
} from './constants.ts';

// ============ semáforo de confirmações ============

export type SemaforoResultado = {
  chave: SemaforoChave | 'neutro'; corFundo: string; corTexto: string; rotulo: string; intervalo: string;
};

export function intervaloSemaforo(de: number, ate: number | null): string {
  return ate === null ? `${de} ou mais` : `de ${de} a ${ate}`;
}

// Recebe a contagem de confirmados (já deduplicada por nome). Entrada inválida devolve o neutro.
export function semaforoConfirmados(n: unknown): SemaforoResultado {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    return { chave: 'neutro', corFundo: SEMAFORO_NEUTRO.corFundo, corTexto: SEMAFORO_NEUTRO.corTexto, rotulo: 'sem faixa', intervalo: '' };
  }
  const faixa = SEMAFORO_CONFIRMADOS.find((f) => n >= f.de && (f.ate === null || n <= f.ate))!;
  return { chave: faixa.chave, corFundo: faixa.corFundo, corTexto: faixa.corTexto, rotulo: faixa.rotulo, intervalo: intervaloSemaforo(faixa.de, faixa.ate) };
}

// Estilo do bloco de um conselho na agenda: semáforo se aberto, neutro se já encerrado.
// Rounds não passam por aqui (mantêm a pílula de status).
export function corBlocoAgenda(confirmados: number, encerrado: boolean): { corFundo: string; corTexto: string; chave: string } {
  if (encerrado) return { corFundo: AGENDA_PASSADO_COR.corFundo, corTexto: AGENDA_PASSADO_COR.corTexto, chave: 'encerrado' };
  const s = semaforoConfirmados(confirmados);
  return { corFundo: s.corFundo, corTexto: s.corTexto, chave: s.chave };
}

// ============ faixas de presença ============

// Presença de 0 a 100 (a mesma taxa inteira que o kanban já exibia). Fora do intervalo ou não
// numérica devolve null, nunca uma faixa inventada.
export function faixaPresenca(taxa: unknown): FaixaPresencaChave | null {
  if (typeof taxa !== 'number' || !Number.isFinite(taxa) || taxa < 0 || taxa > 100) return null;
  return FAIXAS_PRESENCA.find((f) => f.ate === null || taxa <= f.ate)!.chave;
}

// Percentuais inteiros em décimos que somam exatamente 1000, pelo método do maior resto.
// Empate de resto vai para a faixa de menor índice.
export function percentuaisMaiorResto(contagens: number[]): number[] {
  const total = contagens.reduce((s, c) => s + c, 0);
  if (total <= 0) return contagens.map(() => 0);
  const itens = contagens.map((c, idx) => ({ idx, piso: Math.floor((c * 1000) / total), resto: (c * 1000) % total }));
  let falta = 1000 - itens.reduce((s, i) => s + i.piso, 0);
  const ordem = [...itens].sort((a, b) => b.resto - a.resto || a.idx - b.idx);
  const resultado = itens.map((i) => i.piso);
  for (let k = 0; k < ordem.length && falta > 0; k++, falta--) resultado[ordem[k].idx]++;
  return resultado;
}

export type DistribuicaoPresenca = {
  contagens: Record<FaixaPresencaChave, number>;
  percentuaisDecimos: Record<FaixaPresencaChave, number>;
  totalApurado: number;
  semApuracao: number;
};

// Recebe a presença inteira (0 a 100) de cada membro, ou null para quem ainda não tem registro.
export function distribuicaoPresenca(taxas: (number | null)[]): DistribuicaoPresenca {
  const contagens = { critica: 0, baixa: 0, atencao: 0, saudavel: 0 } as Record<FaixaPresencaChave, number>;
  let semApuracao = 0;
  taxas.forEach((t) => {
    const f = t === null || t === undefined ? null : faixaPresenca(t);
    if (f === null) semApuracao++;
    else contagens[f]++;
  });
  const chaves = FAIXAS_PRESENCA.map((f) => f.chave);
  const decimos = percentuaisMaiorResto(chaves.map((c) => contagens[c]));
  const percentuaisDecimos = {} as Record<FaixaPresencaChave, number>;
  chaves.forEach((c, i) => { percentuaisDecimos[c] = decimos[i]; });
  return { contagens, percentuaisDecimos, totalApurado: chaves.reduce((s, c) => s + contagens[c], 0), semApuracao };
}

// ============ advertências ============

// Mesma regra que já existia em mapAdvertenciaAplicadaRow: ativa enquanto aplicado_em mais a
// validade congelada (em meses) ainda não passou. Único lugar onde essa validade é calculada.
export function advertenciaAtiva(aplicadoEmIso: string, validadeMeses: number, agora: Date = new Date()): boolean {
  const expiraEm = new Date(aplicadoEmIso);
  expiraEm.setMonth(expiraEm.getMonth() + validadeMeses);
  return expiraEm.getTime() > agora.getTime();
}

export function pontuacaoAtiva(registros: { aplicado_em: string; validade_meses: number; pontos: number }[], agora: Date = new Date()): number {
  return registros.filter((r) => advertenciaAtiva(r.aplicado_em, r.validade_meses, agora)).reduce((s, r) => s + (r.pontos || 0), 0);
}

// ============ Health da Base (redefinido em 07/10/2026) ============
// Health da Base = percentual de membros críticos na base do CS, mais os pontos de advertência
// ativos vezes PESO_PONTO_ADVERTENCIA_DECIMOS, com teto de 100,0. Menor é melhor. Críticos e base
// vêm do report semanal (nativo: críticos nomeados sobre o snapshot da carteira; importado do
// Monday: contagem e base declaradas pelo CS). Presença não entra.

export function formatarDecimos(d: number): string {
  return (d / 10).toFixed(1).replace('.', ',');
}

// Percentual de críticos em décimos de ponto, arredondado meio para cima. Base zero, entrada não
// inteira ou críticos acima da base devolvem null (sem valor), nunca zero.
export function percentualCriticosDecimos(criticos: unknown, base: unknown): number | null {
  if (!Number.isInteger(criticos) || !Number.isInteger(base)) return null;
  const c = criticos as number;
  const b = base as number;
  if (b <= 0 || c < 0 || c > b) return null;
  return Math.floor((c * 2000 + b) / (2 * b));
}

export type HealthBase = {
  criticos: number | null;
  base: number | null;
  percentualCriticosDecimos: number | null;
  acrescimoDecimos: number;
  healthBaseDecimos: number | null;
  pontosAtivos: number;
  semApuracao: boolean;
  composicao: string;
};

export function calcularHealthBase(criticos: number | null | undefined, base: number | null | undefined, pontosAtivos: number): HealthBase {
  const pontos = Number.isInteger(pontosAtivos) && pontosAtivos > 0 ? pontosAtivos : 0;
  const acrescimoDecimos = pontos * PESO_PONTO_ADVERTENCIA_DECIMOS;
  const pct = percentualCriticosDecimos(criticos, base);
  const c = Number.isInteger(criticos) ? (criticos as number) : null;
  const b = Number.isInteger(base) ? (base as number) : null;
  if (pct === null) {
    const motivo = b === 0 ? 'base sem membros elegíveis' : 'sem críticos e base apurados';
    return { criticos: c, base: b, percentualCriticosDecimos: null, acrescimoDecimos, healthBaseDecimos: null, pontosAtivos: pontos, semApuracao: true, composicao: `Sem apuração: ${motivo}.` };
  }
  const healthBaseDecimos = Math.min(1000, pct + acrescimoDecimos);
  const composicao = `Críticos ${c} de ${b} (${formatarDecimos(pct)}%), `
    + `advertências ativas ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}, `
    + `Health da Base ${formatarDecimos(healthBaseDecimos)}%.`;
  return { criticos: c, base: b, percentualCriticosDecimos: pct, acrescimoDecimos, healthBaseDecimos, pontosAtivos: pontos, semApuracao: false, composicao };
}

// ============ report individual ============

export type StatusReport = 'atual' | 'desatualizado' | 'sem_report';
// Idade medida a partir da data do report (ou do fim da semana, se não houver data).
export function statusReport(dataReferencia: string | null | undefined, hoje: Date = new Date()): StatusReport {
  if (!dataReferencia) return 'sem_report';
  const ref = new Date(String(dataReferencia).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(ref.getTime())) return 'sem_report';
  const dias = (hoje.getTime() - ref.getTime()) / 86_400_000;
  return dias > REPORT_VALIDADE_DIAS ? 'desatualizado' : 'atual';
}

// Busca de membro por nome: ignora maiúsculas, acentos e espaços extras, e exige que todos os
// termos apareçam, em qualquer ordem. Autocontida de propósito: o template do dashboard injeta o
// próprio código desta função no navegador (casaBusca.toString()), para existir uma regra só.
export function casaBusca(termo: string, nome: string): boolean {
  const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const alvo = norm(nome);
  return norm(termo).split(' ').filter(Boolean).every((t) => alvo.indexOf(t) !== -1);
}

// Segunda feira (YYYY-MM-DD) da semana de uma data, no calendário de Brasília.
export function segundaFeiraBRT(agora: Date = new Date()): string {
  const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const dow = brt.getUTCDay();
  brt.setUTCDate(brt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return brt.toISOString().slice(0, 10);
}
