// Evolução por período (08/10/2026). Funções puras: janela de meses, mês aberto, mediana, leitura por
// regra, maior queda por indicador e variação do ranking. Sem acesso a banco e sem importar reports.ts,
// para o teste rodar no Node (tests/evolucao.test.ts). O acesso a dados está em lib/evolucao-dados.ts.
// Nenhuma leitura chama modelo de linguagem: são frases fixas preenchidas com números.
import {
  EVOLUCAO_MES_INICIAL,
  QUEDA_APROVEITAMENTO_ALERTA_PP,
  QUEDA_PONTUACAO_ALERTA,
  QUEDA_POSICOES_ALERTA,
} from './constants.ts';

export type MesRef = { ano: number; mes: number };

// Os n meses terminando em anoFim/mesFim, do mais antigo ao mais recente. Nunca antes de inicio.
export function mesesDaJanela(anoFim: number, mesFim: number, n: number, inicio: string = EVOLUCAO_MES_INICIAL): MesRef[] {
  const [anoIni, mesIni] = inicio.split('-').map(Number);
  const lista: MesRef[] = [];
  let ano = anoFim, mes = mesFim;
  for (let k = 0; k < n; k++) {
    if (ano < anoIni || (ano === anoIni && mes < mesIni)) break;
    lista.unshift({ ano, mes });
    mes -= 1;
    if (mes === 0) { mes = 12; ano -= 1; }
  }
  return lista;
}

// Mês aberto: hoje (AAAA-MM-DD) é até o dia diaCorte do mês seguinte, inclusive.
export function mesAberto(ano: number, mes: number, hoje: string, diaCorte: number): boolean {
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const fim = proximoAno + '-' + String(proximoMes).padStart(2, '0') + '-' + String(diaCorte).padStart(2, '0');
  return hoje <= fim;
}

// Mediana ignorando nulos. Sem valores, null.
export function mediana(valores: (number | null | undefined)[]): number | null {
  const v = valores.filter((x): x is number => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

export type PontoSerie = { rotulo: string; aberto: boolean; pontuacao: number | null; posicao: number | null; medianaTime: number | null };

// Série do CS a partir dos meses já calculados (cada um com cs e medianaTime).
export function serieDoCS(meses: { rotulo: string; aberto: boolean; cs: { pontuacao: number | null; posicao: number | null } | null; medianaTime: number | null }[]): PontoSerie[] {
  return meses.map((m) => ({
    rotulo: m.rotulo,
    aberto: m.aberto,
    pontuacao: m.cs?.pontuacao ?? null,
    posicao: m.cs?.posicao ?? null,
    medianaTime: m.medianaTime,
  }));
}

// Frases de leitura por regra. Só aparece o que tem dado nos dois extremos da série.
export function leituraEvolucao(serie: PontoSerie[]): string[] {
  const com = serie.filter((p) => p.pontuacao !== null);
  const frases: string[] = [];
  if (com.length >= 2) {
    const primeiro = com[0], ultimo = com[com.length - 1];
    const meses = serie.indexOf(ultimo) - serie.indexOf(primeiro);
    frases.push('A pontuação foi de ' + primeiro.pontuacao + ' para ' + ultimo.pontuacao + ' em ' + meses + (meses === 1 ? ' mês.' : ' meses.'));
  }
  const comPos = serie.filter((p) => p.posicao !== null);
  if (comPos.length >= 2) {
    const p1 = comPos[0], p2 = comPos[comPos.length - 1];
    frases.push('A posição foi de ' + p1.posicao + 'º para ' + p2.posicao + 'º.');
  }
  return frases;
}

export type EixoSerie = { chave: string; label: string; pctPorMes: (number | null)[] };

// Maior queda de aproveitamento entre os eixos com histórico (GTD fica de fora: sem série confiável).
// Compara o penúltimo mês com dado e o último. Só vale se a queda for igual ou maior que o limite.
export function maiorQuedaIndicador(eixos: EixoSerie[], limite: number = QUEDA_APROVEITAMENTO_ALERTA_PP) {
  let melhor: { chave: string; label: string; de: number; para: number; queda: number } | null = null;
  for (const eixo of eixos) {
    if (eixo.chave === 'cumprimentoGtd') continue;
    const comDado = eixo.pctPorMes.filter((p): p is number => typeof p === 'number');
    if (comDado.length < 2) continue;
    const para = comDado[comDado.length - 1];
    const de = comDado[comDado.length - 2];
    const queda = de - para;
    if (queda >= limite && (!melhor || queda > melhor.queda)) {
      melhor = { chave: eixo.chave, label: eixo.label, de, para, queda };
    }
  }
  return melhor;
}

// Variação do ranking contra o mês anterior. Posições positivas = subiu. Pontos positivos = ganhou.
// Sem um dos dois meses, null.
export function variacaoRanking(atual: { posicao: number | null; pontuacao: number | null } | null, anterior: { posicao: number | null; pontuacao: number | null } | null) {
  if (!atual || !anterior || atual.posicao === null || anterior.posicao === null || atual.pontuacao === null || anterior.pontuacao === null) return null;
  const posicoes = anterior.posicao - atual.posicao;
  const pontos = atual.pontuacao - anterior.pontuacao;
  const alerta = posicoes <= -QUEDA_POSICOES_ALERTA || pontos <= -QUEDA_PONTUACAO_ALERTA;
  return { posicoes, pontos, alerta };
}

export type LinhaFechamento = {
  csNome: string;
  pontuacao: number | null;
  estado: 'com_pontuacao' | 'sem_dados_suficientes';
  elegiveis: number;
  posicao: number | null;
  totalRankeados: number;
  radar: { chave: string; label: string; tipoMeta: 'min' | 'max'; pct: number | null; valor: number | null; meta: number | null; unidade: string | null }[];
};

// Monta a linha gravada em cs_fechamento_mensal a partir de porCS e ranking de generateVisaoGestor.
// eixos é RADAR_EIXOS (passado por quem chama, para este arquivo não importar reports.ts).
export function linhasFechamento(
  porCS: any[],
  ranking: { nome: string; posicao: number | null }[],
  eixos: { chave: string; label: string; tipoMeta: 'min' | 'max' }[],
): LinhaFechamento[] {
  return porCS.map((c) => {
    const posicao = ranking.find((r) => r.nome === c.nome)?.posicao ?? null;
    return {
      csNome: c.nome,
      pontuacao: c.scoreReal ?? null,
      estado: c.pontuacao.estado,
      elegiveis: c.pontuacao.elegiveis ?? 0,
      posicao,
      totalRankeados: ranking.length,
      radar: eixos.map((e, i) => {
        const ind = c.indicadores?.[e.chave];
        return {
          chave: e.chave,
          label: e.label,
          tipoMeta: e.tipoMeta,
          pct: c.radar?.[i] ?? null,
          valor: ind?.calculado ?? null,
          meta: ind?.meta ?? null,
          unidade: ind?.unidade ?? null,
        };
      }),
    };
  });
}
