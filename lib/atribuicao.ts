// Data de atribuição de cada item a um período (mês e semana), centralizada (05/11/2026, D7 e fase 1).
// Todo realizado semanal e o realizado mensal de matchmakings_resultado passam por esta função. Não há
// outro lugar que escolha a data de um item.
//
// Fonte de cada indicador:
//   cases                 created_at_monday do item no Monday (cases_items não tem data de evento)
//   matchmakings          data do item; na falta, created_at_monday
//   matchmakings_resultado resultado_registrado_em (D7: o mês é o do registro do resultado, não o do matchmaking)
//   rounds                inicio; na falta, created_at_monday
//   upsell                data do item (upsell_downsell_items.data)
//   indicacoes            data do formulário do report semanal (reports_semanais_items.data); na falta,
//                         created_at_monday do item. A origem Tomato não aparece no código; ver o registro.
//
// Retorna 'AAAA-MM-DD' no calendário de Brasília, ou null quando o item não tem nenhuma data utilizável.
// P8: null quer dizer "sem data", e nunca é adivinhado. O chamador conta esses itens à parte.
import { hojeSP } from './gtd-prazos.ts';

export type IndicadorAtribuicao = 'cases' | 'matchmakings' | 'matchmakings_resultado' | 'rounds' | 'upsell' | 'indicacoes';

export interface ItemAtribuicao {
  data?: string | null; // date (AAAA-MM-DD)
  inicio?: string | null; // timestamptz
  created_at_monday?: string | null; // timestamptz
  resultado_registrado_em?: string | null; // timestamptz
}

// Instante (timestamptz do banco ou do Monday) convertido para a data de Brasília.
export function dataBRT(instante: string | null | undefined): string | null {
  if (!instante) return null;
  const t = new Date(instante);
  if (Number.isNaN(t.getTime())) return null;
  return hojeSP(t);
}

// Recorta uma data 'AAAA-MM-DD' vinda de coluna date. Valor vazio ou malformado vira null, sem adivinhar.
function dataSimples(v: string | null | undefined): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function dataDeAtribuicao(indicador: IndicadorAtribuicao, item: ItemAtribuicao): string | null {
  switch (indicador) {
    case 'cases':
      return dataBRT(item.created_at_monday);
    case 'matchmakings':
      return dataSimples(item.data) ?? dataBRT(item.created_at_monday);
    case 'matchmakings_resultado':
      return dataBRT(item.resultado_registrado_em);
    case 'rounds':
      return dataBRT(item.inicio) ?? dataBRT(item.created_at_monday);
    case 'upsell':
      return dataSimples(item.data);
    case 'indicacoes':
      return dataSimples(item.data) ?? dataBRT(item.created_at_monday);
  }
}
