// Funções puras do semáforo de confirmações, das faixas de presença e do Health da Base
// (07/10/2026). Sem acesso a banco nem a rede, para poderem ser testadas direto com
// node --experimental-strip-types (tests/indicadores-base.test.ts). Nenhum componente nem rota
// recalcula nada disto por conta própria: tudo passa por aqui.
//
// Presenças e Health da Base trabalham em inteiros de décimos de ponto percentual: 800 significa
// 80,0 por cento. Evita erro de ponto flutuante e mantém uma casa decimal exata na tela.
import {
  SEMAFORO_CONFIRMADOS, SEMAFORO_NEUTRO, AGENDA_PASSADO_COR, FAIXAS_PRESENCA,
  PESO_PONTO_ADVERTENCIA_DECIMOS, HEALTH_BASE_ESCALA_INVERSA,
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

// Presença individual de um membro em décimos de ponto percentual, ou null sem nenhum registro.
export function presencaMembroDecimos(presentes: number, registros: number): number | null {
  if (!registros || registros <= 0) return null;
  return Math.round((presentes * 1000) / registros);
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

// ============ Health da Base ============

export function formatarDecimos(d: number): string {
  return (d / 10).toFixed(1).replace('.', ',');
}

export type HealthBase = {
  presencaMediaDecimos: number | null;
  descontoDecimos: number;
  saudeLiquidaDecimos: number | null;
  healthBaseDecimos: number | null;
  membrosApurados: number;
  semApuracao: boolean;
  pontosAtivos: number;
  composicao: string;
};

// Recebe a presença individual de cada membro titular da carteira (décimos, null para quem não tem
// nenhum mês realizado) e a pontuação de advertência ativa do CS. Membro sem apuração fica fora da
// média. Carteira sem nenhum membro apurado devolve semApuracao, nunca zero.
export function calcularHealthBase(presencasDecimos: (number | null)[], pontosAtivos: number): HealthBase {
  const pontos = Number.isInteger(pontosAtivos) && pontosAtivos > 0 ? pontosAtivos : 0;
  const descontoDecimos = pontos * PESO_PONTO_ADVERTENCIA_DECIMOS;
  const validas = presencasDecimos.filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
  if (!validas.length) {
    return { presencaMediaDecimos: null, descontoDecimos, saudeLiquidaDecimos: null, healthBaseDecimos: null, membrosApurados: 0, semApuracao: true, pontosAtivos: pontos, composicao: 'Sem apuração: nenhum membro da carteira com presença registrada.' };
  }
  const presencaMediaDecimos = Math.round(validas.reduce((s, p) => s + p, 0) / validas.length);
  const saudeLiquidaDecimos = Math.max(0, presencaMediaDecimos - descontoDecimos);
  const healthBaseDecimos = HEALTH_BASE_ESCALA_INVERSA ? 1000 - saudeLiquidaDecimos : saudeLiquidaDecimos;
  const composicao = `Presença média da carteira ${formatarDecimos(presencaMediaDecimos)}%, `
    + `advertências ativas ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}, `
    + `saúde líquida ${formatarDecimos(saudeLiquidaDecimos)}%, `
    + `Health da Base ${formatarDecimos(healthBaseDecimos)}%.`;
  return { presencaMediaDecimos, descontoDecimos, saudeLiquidaDecimos, healthBaseDecimos, membrosApurados: validas.length, semApuracao: false, pontosAtivos: pontos, composicao };
}
