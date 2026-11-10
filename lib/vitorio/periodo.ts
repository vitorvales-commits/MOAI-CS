// Datas e períodos em português para o Vitorio (30/10/2026): hoje, ontem, essa semana, semana passada, este mês, mês passado,
// nomes de meses com ou sem ano, trimestre, "em setembro". Funções puras: a data de hoje entra por parâmetro (AAAA-MM-DD, Brasília).
import { MESES_ORDEM } from '../constants.ts';
import { normalizar } from './busca.ts';
import type { Periodo } from './tipos.ts';

// Palavras que o extrator de período entende; entram no vocabulário da correção para nunca serem trocadas por outra (passada por passado).
export const VOCABULARIO_PERIODO = ['hoje', 'ontem', 'anteontem', 'amanha', 'semana', 'passada', 'anterior', 'ultima', 'proxima', 'atual', 'essa', 'esta', 'nessa', 'nesta', 'mes', 'passado', 'ultimo', 'proximo', 'corrente', 'este', 'esse', 'neste', 'nesse', 'trimestre', 'primeiro', 'segundo', 'terceiro', 'quarto', 'que', 'vem'];
const MESES_NORM = MESES_ORDEM.map((m) => normalizar(m));
const nomeMes = (i: number) => MESES_ORDEM[i];
const rotuloMes = (mes: string, ano: number) => mes.toLowerCase() + ' de ' + ano;

function somar(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function segunda(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return somar(iso, -((d.getUTCDay() + 6) % 7));
}
export function mesDe(iso: string, deslocar = 0): { mes: string; ano: number } {
  const [a, m] = iso.split('-').map(Number);
  const i = a * 12 + (m - 1) + deslocar;
  return { mes: nomeMes(((i % 12) + 12) % 12), ano: Math.floor(i / 12) };
}
const mensal = (hoje: string, desloc: number): Periodo => { const p = mesDe(hoje, desloc); return { tipo: 'mes', ...p, rotulo: rotuloMes(p.mes, p.ano) }; };

export type Trecho = { periodo: Periodo; texto: string }; // texto: a parte da pergunta que virou período
// Procura um período na pergunta (já normalizada, sem acento). Devolve também o trecho consumido para mascarar.
export function extrairPeriodo(q: string, hoje: string): Trecho | null {
  const t = ' ' + q + ' ';
  const achar = (re: RegExp) => { const m = re.exec(t); return m ? m[0].trim() : null; };
  let x: string | null;
  if ((x = achar(/ (semana passada|semana anterior|ultima semana) /))) { const s = segunda(somar(hoje, -7)); return { texto: x, periodo: { tipo: 'semana', inicio: s, fim: somar(s, 6), rotulo: 'semana passada' } }; }
  if ((x = achar(/ (proxima semana|semana que vem) /))) { const s = segunda(somar(hoje, 7)); return { texto: x, periodo: { tipo: 'semana', inicio: s, fim: somar(s, 6), rotulo: 'próxima semana' } }; }
  if ((x = achar(/ (essa semana|esta semana|semana atual|nessa semana|nesta semana|na semana|da semana) /))) { const s = segunda(hoje); return { texto: x, periodo: { tipo: 'semana', inicio: s, fim: somar(s, 6), rotulo: 'esta semana' } }; }
  if ((x = achar(/ (anteontem) /))) return { texto: x, periodo: { tipo: 'dia', data: somar(hoje, -2), rotulo: 'anteontem' } };
  if ((x = achar(/ (ontem) /))) return { texto: x, periodo: { tipo: 'dia', data: somar(hoje, -1), rotulo: 'ontem' } };
  if ((x = achar(/ (amanha) /))) return { texto: x, periodo: { tipo: 'dia', data: somar(hoje, 1), rotulo: 'amanhã' } };
  if ((x = achar(/ (hoje) /))) return { texto: x, periodo: { tipo: 'dia', data: hoje, rotulo: 'hoje' } };
  if ((x = achar(/ (mes passado|mes anterior|ultimo mes) /))) return { texto: x, periodo: mensal(hoje, -1) };
  if ((x = achar(/ (proximo mes|mes que vem) /))) return { texto: x, periodo: mensal(hoje, 1) };
  if ((x = achar(/ (este mes|esse mes|neste mes|nesse mes|mes atual|no mes|do mes|mes corrente) /))) return { texto: x, periodo: mensal(hoje, 0) };
  const tri = /(?:^| )(?:no |neste |nesse |este |esse |ultimo |)(primeiro|segundo|terceiro|quarto|1o|2o|3o|4o|ultimo|este|esse|neste|nesse) trimestre(?: de (\d{4}))?(?= |$)/.exec(q);
  if (tri) {
    const ano = tri[2] ? Number(tri[2]) : Number(hoje.slice(0, 4));
    const ord: Record<string, number> = { primeiro: 0, '1o': 0, segundo: 1, '2o': 1, terceiro: 2, '3o': 2, quarto: 3, '4o': 3 };
    let n: number;
    if (tri[1] in ord) n = ord[tri[1]];
    else if (tri[1] === 'ultimo') n = Math.floor((Number(hoje.slice(5, 7)) - 1) / 3) - 1;
    else n = Math.floor((Number(hoje.slice(5, 7)) - 1) / 3);
    let anoUsado = ano;
    if (n < 0) { n = 3; anoUsado = ano - 1; }
    const meses = [0, 1, 2].map((k) => ({ mes: nomeMes(n * 3 + k), ano: anoUsado }));
    return { texto: tri[0].trim(), periodo: { tipo: 'trimestre', meses, rotulo: (n + 1) + 'º trimestre de ' + anoUsado } };
  }
  // nome de mês, com ou sem ano: "setembro", "em setembro de 2026", "setembro 2026"
  for (let i = 0; i < 12; i++) {
    const m = new RegExp('(?:^| )(?:em |de |no |do |para )?' + MESES_NORM[i] + '(?: de | )?(\\d{4})?(?= |$)').exec(q);
    if (m) {
      const [aHoje, mHoje] = hoje.split('-').map(Number);
      // sem ano: o mês mais recente que não seja futuro (setembro dito em outubro é este ano; dezembro dito em outubro é do ano passado)
      const ano = m[1] ? Number(m[1]) : (i + 1 > mHoje ? aHoje - 1 : aHoje);
      return { texto: m[0].trim(), periodo: { tipo: 'mes', mes: nomeMes(i), ano, rotulo: rotuloMes(nomeMes(i), ano) } };
    }
  }
  return null;
}

export function periodoPadrao(tipo: 'mes_atual' | 'semana_atual' | 'hoje', hoje: string): Periodo {
  if (tipo === 'semana_atual') { const s = segunda(hoje); return { tipo: 'semana', inicio: s, fim: somar(s, 6), rotulo: 'esta semana' }; }
  if (tipo === 'hoje') return { tipo: 'dia', data: hoje, rotulo: 'hoje' };
  return mensal(hoje, 0);
}
// Meses cobertos por um período (para indicadores mensais). Semana e dia caem no mês em que terminam.
export function mesesDoPeriodo(p: Periodo): { mes: string; ano: number }[] {
  if (p.tipo === 'mes') return [{ mes: p.mes, ano: p.ano }];
  if (p.tipo === 'trimestre') return p.meses;
  const iso = p.tipo === 'semana' ? p.fim : p.data;
  return [mesDe(iso)];
}
export function mesAnterior(p: { mes: string; ano: number }): { mes: string; ano: number } {
  const i = MESES_ORDEM.indexOf(p.mes);
  return i === 0 ? { mes: MESES_ORDEM[11], ano: p.ano - 1 } : { mes: MESES_ORDEM[i - 1], ano: p.ano };
}
export const dataBr = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
export { somar as somarDias, segunda as segundaDe };
