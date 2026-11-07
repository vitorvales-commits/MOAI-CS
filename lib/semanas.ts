// Calendário de semanas e dias úteis para as metas semanais (05/11/2026). Funções puras: nenhuma lê banco
// nem relógio. Datas trafegam como 'AAAA-MM-DD'; toda aritmética é em UTC, para não depender do fuso do
// servidor. O "hoje" de Brasília vem de hojeSP() em lib/gtd-prazos.ts, passado pelo chamador.
//
// Semana vai de segunda a domingo (D2). Dia útil é segunda a sexta que não está na lista de feriados (D2).

export type Intervalo = { inicio: string; fim: string };

// Semana exibida dentro de um mês. A parcela é a interseção da semana com o mês; a semana inteira pode
// começar ou terminar em outro mês, e cada mês recebe só a sua parcela.
export type SemanaDoMes = {
  inicio: string; // segunda-feira da semana (sempre)
  fim: string; // domingo da semana (sempre)
  parcelaInicio: string; // primeiro dia da semana que cai no mês
  parcelaFim: string; // último dia da semana que cai no mês
  diasUteis: number; // dias úteis da parcela, descontados feriados
};

const MS_DIA = 86_400_000;

function paraUTC(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}
function deUTC(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function somarDias(iso: string, n: number): string {
  return deUTC(paraUTC(iso) + n * MS_DIA);
}

// Dia da semana: 0 domingo, 1 segunda ... 6 sábado.
function diaDaSemana(iso: string): number {
  return new Date(paraUTC(iso)).getUTCDay();
}

// Segunda-feira da semana que contém a data.
export function inicioDaSemana(data: string): string {
  const dow = diaDaSemana(data);
  const deslocamento = dow === 0 ? 6 : dow - 1;
  return somarDias(data, -deslocamento);
}

// Dias úteis dentro de um intervalo fechado, descontados os feriados. Intervalo invertido vale zero.
export function diasUteis(intervalo: Intervalo, feriados: Iterable<string>): number {
  const set = new Set(feriados);
  const ini = paraUTC(intervalo.inicio), fim = paraUTC(intervalo.fim);
  let n = 0;
  for (let t = ini; t <= fim; t += MS_DIA) {
    const iso = deUTC(t);
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6 && !set.has(iso)) n++;
  }
  return n;
}

// Semanas (segunda a domingo) que tocam o mês, cada uma com a parcela de dias úteis dentro do mês.
// mes aceita 'AAAA-MM' ou 'AAAA-MM-DD' (só o ano e o mês importam).
// Parcela sem nenhum dia útil não entra na lista (ex.: só o domingo 01/11/2026). Ela teria peso zero, e o
// pedido de novembro de 2026 fixa 5 semanas (4, 5, 4, 5 e 1). Um item datado nessa parcela não pertence a
// nenhuma semana do mês; continua no Geral mensal.
export function semanasDoMes(mes: string, feriados: Iterable<string>): SemanaDoMes[] {
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7));
  const primeiro = deUTC(Date.UTC(ano, m - 1, 1));
  const ultimo = deUTC(Date.UTC(ano, m, 0));
  const set = [...feriados];
  const semanas: SemanaDoMes[] = [];
  for (let inicio = inicioDaSemana(primeiro); paraUTC(inicio) <= paraUTC(ultimo); inicio = somarDias(inicio, 7)) {
    const fim = somarDias(inicio, 6);
    const parcelaInicio = paraUTC(inicio) < paraUTC(primeiro) ? primeiro : inicio;
    const parcelaFim = paraUTC(fim) > paraUTC(ultimo) ? ultimo : fim;
    const dias = diasUteis({ inicio: parcelaInicio, fim: parcelaFim }, set);
    if (dias > 0) semanas.push({ inicio, fim, parcelaInicio, parcelaFim, diasUteis: dias });
  }
  return semanas;
}

// Dias úteis da semana já decorridos até hoje, inclusive. Antes da semana: zero. Depois dela: todos.
// Ritmo esperado usa esta contagem sobre o total de dias úteis da semana.
export function diasUteisDecorridos(semana: Intervalo, hoje: string, feriados: Iterable<string>): number {
  if (paraUTC(hoje) < paraUTC(semana.inicio)) return 0;
  const fimConsiderado = paraUTC(hoje) > paraUTC(semana.fim) ? semana.fim : hoje;
  return diasUteis({ inicio: semana.inicio, fim: fimConsiderado }, feriados);
}

// Primeiro e último dia útil do mês. Têm parcela de semana com dia útil, então um item levado para essas bordas
// sempre cai numa semana do mês (ver subordinação ao grupo em lib/atribuicao.ts).
export function primeiroDiaUtilDoMes(mes: string, feriados: Iterable<string>): string {
  const set = new Set(feriados);
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7));
  for (let t = Date.UTC(ano, m - 1, 1); ; t += MS_DIA) {
    const iso = deUTC(t), dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6 && !set.has(iso)) return iso;
  }
}

export function ultimoDiaUtilDoMes(mes: string, feriados: Iterable<string>): string {
  const set = new Set(feriados);
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7));
  for (let t = Date.UTC(ano, m, 0); ; t -= MS_DIA) {
    const iso = deUTC(t), dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6 && !set.has(iso)) return iso;
  }
}

// Total de dias úteis de uma semana inteira (não a parcela de um mês).
export function diasUteisDaSemana(semana: Intervalo, feriados: Iterable<string>): number {
  return diasUteis(semana, feriados);
}
