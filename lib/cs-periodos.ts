// Quem foi CS em cada mês (revisão out/2026, rodada 2, Fase 4). Puro: não acessa banco.
// Regra C2: é CS no mês quem tem pelo menos uma meta em metas_subitens naquele mês. A regra é a certa
// porque a pontuação depende de meta. Os títulos de mês de metas_subitens são inconsistentes
// ("Metas Maio", "Ale - Maio", "JUNHO", "SETEMBRO"), e esta função é a única que os interpreta.

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface MesNormalizado { ano: number; mes: number; primeiroDia: string }

// "Metas Maio" e "Ale - Maio" viram maio do ano padrão; "JUNHO" vira junho. Ano com quatro dígitos
// no título prevalece. Título sem nenhum mês reconhecido devolve null.
export function normalizarMes(titulo: string, anoPadrao: number): MesNormalizado | null {
  const tokens = semAcento(titulo).split(/[^a-z0-9]+/).filter(Boolean);
  const indice = tokens.map((t) => MESES.indexOf(t)).find((i) => i >= 0);
  if (indice === undefined) return null;
  const anoToken = tokens.find((t) => /^\d{4}$/.test(t));
  const ano = anoToken ? Number(anoToken) : anoPadrao;
  const mes = indice + 1;
  return { ano, mes, primeiroDia: `${ano}-${String(mes).padStart(2, '0')}-01` };
}

export interface LinhaMetaMes { mes_grupo_titulo: string; cs_nome: string }

export interface PeriodoCs {
  nome_curto: string;
  primeiro_mes: string;
  ultimo_mes: string | null;
  // Confirmado quando o CS está em cs_config. Os demais precisam de revisão do gestor.
  confirmado: boolean;
}

// Monta o período de cada CS a partir das linhas de metas. O primeiro e o último mês com meta viram os
// limites. ultimo_mes fica nulo quando o CS está em cs_config (ainda ativo) e o último mês é o mais
// recente do histórico. Nomes são comparados sem acento e sem caixa; "RODRIGO" e "Rodrigo" são o mesmo CS.
export function periodosPorMetas(
  linhas: LinhaMetaMes[],
  anoPadrao: number,
  csAtivosEmCsConfig: string[],
): PeriodoCs[] {
  const chave = (nome: string) => semAcento(nome).trim();
  const ativos = new Set(csAtivosEmCsConfig.map(chave));
  const primeiro = new Map<string, { nome: string; ini: string; fim: string }>();
  for (const l of linhas) {
    const m = normalizarMes(l.mes_grupo_titulo, anoPadrao);
    if (!m) continue;
    const k = chave(l.cs_nome);
    const atual = primeiro.get(k);
    if (!atual) primeiro.set(k, { nome: l.cs_nome.trim(), ini: m.primeiroDia, fim: m.primeiroDia });
    else {
      if (m.primeiroDia < atual.ini) atual.ini = m.primeiroDia;
      if (m.primeiroDia > atual.fim) atual.fim = m.primeiroDia;
    }
  }
  return Array.from(primeiro.entries()).map(([k, v]) => {
    const ativo = ativos.has(k);
    return {
      nome_curto: v.nome,
      primeiro_mes: v.ini,
      ultimo_mes: ativo ? null : v.fim,
      confirmado: ativo,
    };
  }).sort((a, b) => a.primeiro_mes.localeCompare(b.primeiro_mes) || a.nome_curto.localeCompare(b.nome_curto, 'pt-BR'));
}

export interface LinhaPeriodo { nome_curto: string; nome_completo: string; primeiro_mes: string; ultimo_mes: string | null }

// Quem era CS no mês AAAA-MM: período que começa até o mês e não termina antes dele (ultimo_mes nulo = ainda ativo).
export function csDoMes(periodos: LinhaPeriodo[], mesIso: string): LinhaPeriodo[] {
  const alvo = mesIso.slice(0, 7);
  return periodos
    .filter((p) => p.primeiro_mes.slice(0, 7) <= alvo && (p.ultimo_mes === null || p.ultimo_mes.slice(0, 7) >= alvo))
    .sort((a, b) => a.nome_curto.localeCompare(b.nome_curto, 'pt-BR'));
}
