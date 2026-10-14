// Tokens de faixa da agenda de conselhos (14/10/2026). Fonte única: a cor de destaque é a mesma da
// bolinha (SEMAFORO_CONFIRMADOS, e SEMAFORO_NEUTRO para sem_dados), o fundo é essa cor a 10% sobre
// branco, e o texto de destaque é um tom mais escuro da mesma família para ler bem sobre o fundo claro
// (contraste acima de 6:1 em todas as faixas). O CSS sai daqui: o cartão e a lâmpada só recebem
// data-faixa, sem estilo inline.
import { SEMAFORO_CONFIRMADOS, SEMAFORO_NEUTRO, AGENDA_PASSADO_COR } from './constants';

export type AgendaFaixaChave = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul' | 'sem_dados';

export type AgendaFaixaToken = {
  fundo: string;          // fundo suave do card
  borda: string;          // borda de 1px do card
  destaque: string;       // barra lateral e lâmpada
  textoDestaque: string;  // linha de cobrança e demais textos de destaque
};

// Tom escuro para texto de destaque sobre o fundo claro (por faixa).
const TEXTO_DESTAQUE: Record<AgendaFaixaChave, string> = {
  vermelho: '#8A2A24', laranja: '#8A4413', amarelo: '#6B5300', verde: '#245C3B', azul: '#1B4FA8', sem_dados: '#4A4A4A',
};

const FUNDO_PCT = 0.10;

function hexParaRgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Mistura a cor com branco: pct da cor, o resto branco.
function sobreBranco(hex: string, pct: number): string {
  return '#' + hexParaRgb(hex).map((c) => Math.round(c * pct + 255 * (1 - pct)).toString(16).padStart(2, '0')).join('');
}

function tokenDe(destaque: string, chave: AgendaFaixaChave): AgendaFaixaToken {
  return { fundo: sobreBranco(destaque, FUNDO_PCT), borda: destaque, destaque, textoDestaque: TEXTO_DESTAQUE[chave] };
}

export const AGENDA_FAIXA_TOKENS: Record<AgendaFaixaChave, AgendaFaixaToken> = {
  ...Object.fromEntries(SEMAFORO_CONFIRMADOS.map((f) => [f.chave, tokenDe(f.corFundo, f.chave as AgendaFaixaChave)])),
  sem_dados: tokenDe(SEMAFORO_NEUTRO.corFundo, 'sem_dados'),
} as Record<AgendaFaixaChave, AgendaFaixaToken>;

// Bloco CSS com as variáveis por faixa e as regras únicas de cartão, lâmpada e cobrança.
export function agendaFaixaCss(): string {
  const vars = (Object.keys(AGENDA_FAIXA_TOKENS) as AgendaFaixaChave[]).map((chave) => {
    const t = AGENDA_FAIXA_TOKENS[chave];
    return `[data-faixa="${chave}"] { --ag-faixa-fundo:${t.fundo}; --ag-faixa-borda:${t.borda}; --ag-faixa-destaque:${t.destaque}; --ag-faixa-texto:${t.textoDestaque}; }`;
  }).join('\n');
  return `
${vars}
.ag-card[data-faixa] { background:var(--ag-faixa-fundo); border:1px solid var(--ag-faixa-borda); border-left:4px solid var(--ag-faixa-destaque); color:#1A1A1A; }
.ag-lamp[data-faixa] { background:var(--ag-faixa-destaque); }
.ag-lamp.encerrado { background:${AGENDA_PASSADO_COR.corFundo}; }
.ag-cobranca { color:var(--ag-faixa-texto,#8A2A24); }
`;
}
