// Data de atribuição de cada item a um período (mês e semana), centralizada (05/11/2026, D7 e fase 1).
// Todo realizado semanal e o realizado mensal de matchmakings_resultado passam por esta função. Não há
// outro lugar que escolha a data de um item.
//
// Fonte de cada indicador:
//   cases                  created_at_monday, subordinado ao grupo do mês (regra abaixo)
//   matchmakings           data própria do item; na falta, created_at_monday subordinado ao grupo
//   matchmakings_resultado resultado_registrado_em (D7: o mês é o do registro, sem subordinar ao grupo)
//   rounds                 inicio próprio; na falta, created_at_monday subordinado ao grupo
//   upsell                 data do item (upsell_downsell_items.data)
//   indicacoes             data do formulário do report semanal (reports_semanais_items.data); na falta,
//                          created_at_monday. A origem Tomato não aparece no código; ver o registro.
//
// Subordinação ao grupo (decisão de 05/11/2026): o Geral segue o grupo do mês (mes_grupo_titulo). Para a semana
// acompanhar o Geral, uma data de criação que cai antes do mês do grupo vai para o primeiro dia útil do mês, e uma
// que cai depois vai para o último dia útil. Quem está dentro do mês mantém a data. Assim nenhum item sai do mês
// do grupo e a soma das semanas fecha com o Geral. A data própria (data, inicio) não é subordinada.
//
// Retorna 'AAAA-MM-DD' no calendário de Brasília, ou null quando o item não tem nenhuma data utilizável.
// P8: null quer dizer "sem data", e nunca é adivinhado. O chamador conta esses itens à parte.
import { hojeSP } from './gtd-prazos.ts';
import { primeiroDiaUtilDoMes, ultimoDiaUtilDoMes } from './semanas.ts';

export type IndicadorAtribuicao = 'cases' | 'matchmakings' | 'matchmakings_resultado' | 'rounds' | 'upsell' | 'indicacoes';

export interface ItemAtribuicao {
  data?: string | null; // date (AAAA-MM-DD)
  inicio?: string | null; // timestamptz
  created_at_monday?: string | null; // timestamptz
  resultado_registrado_em?: string | null; // timestamptz
}

// Mês do grupo ('AAAA-MM-01') e feriados, para a subordinação. Sem grupo, a criação vale como está.
export interface GrupoMes {
  mes: string;
  feriados: readonly string[];
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

// Subordina a data de criação ao mês do grupo: antes do mês vai para o primeiro dia útil, depois para o último.
export function subordinarAoGrupo(data: string | null, grupo: GrupoMes | undefined): string | null {
  if (!data || !grupo) return data;
  const ini = primeiroDiaUtilDoMes(grupo.mes, grupo.feriados);
  const fim = ultimoDiaUtilDoMes(grupo.mes, grupo.feriados);
  if (data < ini) return ini;
  if (data > fim) return fim;
  return data;
}

export function dataDeAtribuicao(indicador: IndicadorAtribuicao, item: ItemAtribuicao, grupo?: GrupoMes): string | null {
  switch (indicador) {
    case 'cases':
      return subordinarAoGrupo(dataBRT(item.created_at_monday), grupo);
    case 'matchmakings':
      return dataSimples(item.data) ?? subordinarAoGrupo(dataBRT(item.created_at_monday), grupo);
    case 'matchmakings_resultado':
      return dataBRT(item.resultado_registrado_em);
    case 'rounds':
      return dataBRT(item.inicio) ?? subordinarAoGrupo(dataBRT(item.created_at_monday), grupo);
    case 'upsell':
      return dataSimples(item.data);
    case 'indicacoes':
      return dataSimples(item.data) ?? dataBRT(item.created_at_monday);
  }
}
