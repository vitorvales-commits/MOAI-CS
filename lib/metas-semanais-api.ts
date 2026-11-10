// Validação dos corpos das rotas de metas semanais e feriados (05/11/2026). Puro: nada de banco aqui.
// Regra de entrada: nunca confiar no cliente. Tipos, formato de data, segunda-feira e faixa de valor são checados
// aqui; as regras de negócio (indicador do P4, semana com parcela no mês, CS existente) continuam no banco.
import { INDICADORES_SEMANAIS } from './metas-semanais.ts';

// Forma simples de propósito: com strict desligado, a união discriminada não estreita e quebra as rotas.
export type Validado<T> = { ok: boolean; valor?: T; erro?: string };

const RE_MES = /^\d{4}-\d{2}-01$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataReal(iso: string): boolean {
  const [a, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function ehSegunda(iso: string): boolean {
  if (!RE_DATA.test(iso) || !dataReal(iso)) return false;
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() === 1;
}

const texto = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
};

export interface SalvarMetaSemanal { mes: string; csNome: string; indicador: string; semanaInicio: string; valor: number }

export function validarSalvarMetaSemanal(body: unknown): Validado<SalvarMetaSemanal> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.mes !== 'string' || !RE_MES.test(b.mes)) return { ok: false, erro: 'mes precisa estar no formato AAAA-MM-01.' };
  const csNome = texto(b.csNome, 120);
  if (!csNome) return { ok: false, erro: 'csNome é obrigatório.' };
  if (typeof b.indicador !== 'string' || !(INDICADORES_SEMANAIS as readonly string[]).includes(b.indicador)) {
    return { ok: false, erro: 'indicador não tem meta semanal.' };
  }
  if (typeof b.semanaInicio !== 'string' || !ehSegunda(b.semanaInicio)) return { ok: false, erro: 'semanaInicio precisa ser uma segunda-feira (AAAA-MM-DD).' };
  if (typeof b.valor !== 'number' || !Number.isInteger(b.valor) || b.valor < 0 || b.valor > 100000) {
    return { ok: false, erro: 'valor precisa ser um número inteiro entre 0 e 100000.' };
  }
  return { ok: true, valor: { mes: b.mes, csNome, indicador: b.indicador, semanaInicio: b.semanaInicio, valor: b.valor } };
}

export interface RemoverMetaSemanal { mes: string; csNome: string; indicador: string; semanaInicio: string }

export function validarRemoverMetaSemanal(body: unknown): Validado<RemoverMetaSemanal> {
  const r = validarSalvarMetaSemanal({ ...(body as object), valor: 0 });
  if (!r.ok) return r;
  return { ok: true, valor: { mes: r.valor.mes, csNome: r.valor.csNome, indicador: r.valor.indicador, semanaInicio: r.valor.semanaInicio } };
}

export interface FeriadoEntrada { data: string; nome: string; abrangencia: string }

export function validarFeriado(body: unknown): Validado<FeriadoEntrada> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.data !== 'string' || !RE_DATA.test(b.data) || !dataReal(b.data)) return { ok: false, erro: 'data precisa ser uma data válida (AAAA-MM-DD).' };
  const nome = texto(b.nome, 120);
  if (!nome) return { ok: false, erro: 'nome é obrigatório (até 120 caracteres).' };
  const abrangencia = b.abrangencia === undefined ? 'nacional' : texto(b.abrangencia, 40);
  if (!abrangencia) return { ok: false, erro: 'abrangencia inválida.' };
  return { ok: true, valor: { data: b.data, nome, abrangencia } };
}
