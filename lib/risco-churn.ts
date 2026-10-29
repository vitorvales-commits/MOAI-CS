// Risco de churn por membro (29/10/2026). Funções puras, sem IA: soma de pontos por sinal, com pesos e limiares
// vindos de configuração (tabela risco_churn_config, editável pelo gestor; RISCO_CONFIG_PADRAO é o valor inicial e o
// fallback quando a tabela não responde). Sinal ausente (null) não pontua e fica listado em `ausentes`.
// Roda com: node --experimental-strip-types tests/risco-churn.test.ts

export type NivelRisco = 'baixo' | 'atencao' | 'critico';

export const RISCO_CONFIG_PADRAO = {
  nps_nota_detrator: 6,        // nota até este valor conta como detratora
  nps_nota_neutra: 8,          // nota até este valor (e acima do detrator) conta como neutra
  nps_pontos_detrator: 30,
  nps_pontos_neutra: 10,
  alerta_pontos_cada: 15,      // por alerta de NPS aberto do conselho do membro
  alerta_pontos_teto: 30,
  status_pontos_inadimplente: 40,
  status_pontos_sem_retorno: 35,
  status_pontos_downsell: 25,
  presenca_janela_meses: 3,    // últimos meses com status apurado
  presenca_pontos_por_falta: 10,
  presenca_pontos_teto: 30,
  report_semanas_atraso_pontos: 3, // por semana de report atrasado do CS responsável (sinal de carteira)
  report_pontos_teto: 9,
  fidelidade_meses_proximos: 3, // faltam até estes meses para fechar os 12
  fidelidade_pontos: 15,
  limiar_atencao: 25,
  limiar_critico: 55,
} as const;
export type ChaveRisco = keyof typeof RISCO_CONFIG_PADRAO;
export type ConfigRisco = Record<ChaveRisco, number>;

export const ROTULO_NIVEL_RISCO: Record<NivelRisco, string> = { baixo: 'Baixo', atencao: 'Atenção', critico: 'Crítico' };
export const FIDELIDADE_MESES = 12;

// Une o que veio do banco ao padrão; chave desconhecida ou valor não numérico é ignorado.
export function mesclarConfig(linhas: { chave: string; valor: unknown }[] | null | undefined): ConfigRisco {
  const cfg: ConfigRisco = { ...RISCO_CONFIG_PADRAO };
  (linhas || []).forEach((l) => {
    const n = typeof l.valor === 'string' ? Number(l.valor) : l.valor;
    if (l.chave in cfg && typeof n === 'number' && Number.isFinite(n)) cfg[l.chave as ChaveRisco] = n;
  });
  return cfg;
}

export type SinaisMembro = {
  membroId: number; nome: string; groupId: string; conselho: string; cs: string;
  notaNps: number | null;            // nota 0 a 10 da resposta mais recente do membro
  alertasNpsAbertos: number | null;  // alertas de NPS abertos no conselho
  statusAtual: string | null;        // status mais recente do mês (Presente, Ausente, Inadimplente, Sem retorno, Downsell...)
  statusRecentes: string[];          // status dos últimos meses apurados, do mais antigo ao mais recente
  semanasReportAtrasadoCs: number | null;
  fimFidelidade: string | null;      // AAAA-MM-DD, só existe para quem tem visita registrada
  mensalidade: number | null;        // MRR; hoje não existe em tabela espelhada
  visitaAberta: boolean;
};

export type Motivo = { sinal: string; pontos: number; texto: string };
export type ResultadoRisco = {
  nivel: NivelRisco; pontos: number; motivos: Motivo[]; ausentes: string[]; semDados: boolean;
  mesesRestantesFidelidade: number | null; pctMensalidadesRestantes: number | null; exposicao: number | null;
};

const FALTAS = new Set(['ausente', 'não vai', 'nao vai', 'sem retorno']);
const norm = (s: string | null | undefined) => String(s || '').trim().toLowerCase();

// Meses inteiros entre hoje e o fim da fidelidade; 0 quando já passou.
export function mesesAteFimFidelidade(fim: string | null, hoje: string): number | null {
  if (!fim || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return null;
  const [a1, m1, d1] = hoje.split('-').map(Number), [a2, m2, d2] = fim.split('-').map(Number);
  const meses = (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  return Math.max(0, Math.min(FIDELIDADE_MESES, meses));
}

export function calcularRisco(s: SinaisMembro, hoje: string, cfg: ConfigRisco = RISCO_CONFIG_PADRAO): ResultadoRisco {
  const motivos: Motivo[] = [], ausentes: string[] = [];
  const add = (sinal: string, pontos: number, texto: string) => { if (pontos > 0) motivos.push({ sinal, pontos, texto }); };

  if (s.notaNps === null) ausentes.push('nps');
  else if (s.notaNps <= cfg.nps_nota_detrator) add('nps', cfg.nps_pontos_detrator, `Nota ${s.notaNps} no NPS, de detrator`);
  else if (s.notaNps <= cfg.nps_nota_neutra) add('nps', cfg.nps_pontos_neutra, `Nota ${s.notaNps} no NPS, de neutro`);

  if (s.alertasNpsAbertos === null) ausentes.push('alertas');
  else add('alertas', Math.min(cfg.alerta_pontos_teto, s.alertasNpsAbertos * cfg.alerta_pontos_cada),
    `${s.alertasNpsAbertos} ${s.alertasNpsAbertos === 1 ? 'alerta de NPS aberto' : 'alertas de NPS abertos'} no conselho`);

  const st = norm(s.statusAtual);
  if (!st) ausentes.push('status');
  else if (st === 'inadimplente') add('status', cfg.status_pontos_inadimplente, 'Inadimplente no mês');
  else if (st === 'sem retorno') add('status', cfg.status_pontos_sem_retorno, 'Sem retorno no mês');
  else if (st === 'downsell') add('status', cfg.status_pontos_downsell, 'Downsell no mês');

  const recentes = s.statusRecentes.slice(-cfg.presenca_janela_meses);
  if (!recentes.length) ausentes.push('presenca');
  else {
    const faltas = recentes.filter((x) => FALTAS.has(norm(x))).length;
    add('presenca', Math.min(cfg.presenca_pontos_teto, faltas * cfg.presenca_pontos_por_falta),
      `${faltas} ${faltas === 1 ? 'falta' : 'faltas'} nos últimos ${recentes.length} ${recentes.length === 1 ? 'mês' : 'meses'}`);
  }

  if (s.semanasReportAtrasadoCs === null) ausentes.push('report');
  else add('report', Math.min(cfg.report_pontos_teto, s.semanasReportAtrasadoCs * cfg.report_semanas_atraso_pontos),
    `CS com ${s.semanasReportAtrasadoCs} ${s.semanasReportAtrasadoCs === 1 ? 'semana' : 'semanas'} de report atrasado`);

  const meses = mesesAteFimFidelidade(s.fimFidelidade, hoje);
  if (meses === null) ausentes.push('fidelidade');
  else if (meses > 0 && meses <= cfg.fidelidade_meses_proximos) add('fidelidade', cfg.fidelidade_pontos, `Faltam ${meses} ${meses === 1 ? 'mês' : 'meses'} para o fim da fidelidade`);

  const pontos = Math.min(100, motivos.reduce((t, m) => t + m.pontos, 0));
  const nivel: NivelRisco = pontos >= cfg.limiar_critico ? 'critico' : pontos >= cfg.limiar_atencao ? 'atencao' : 'baixo';
  // Sem os três sinais próprios do membro (NPS, status, presença) a leitura não é confiável.
  const semDados = ['nps', 'status', 'presenca'].every((k) => ausentes.includes(k));
  const pct = meses === null ? null : Math.round((meses / FIDELIDADE_MESES) * 100);
  const exposicao = meses !== null && s.mensalidade !== null ? Math.round(meses * s.mensalidade * 100) / 100 : null;
  return { nivel, pontos, motivos, ausentes, semDados, mesesRestantesFidelidade: meses, pctMensalidadesRestantes: pct, exposicao };
}

export type MembroComRisco = SinaisMembro & { risco: ResultadoRisco };

// Urgência primeiro (nível e pontos), depois impacto (exposição, menos meses para o fim da fidelidade).
export function ordenarPorUrgencia(l: MembroComRisco[]): MembroComRisco[] {
  const peso: Record<NivelRisco, number> = { critico: 2, atencao: 1, baixo: 0 };
  return [...l].sort((a, b) => peso[b.risco.nivel] - peso[a.risco.nivel] || b.risco.pontos - a.risco.pontos
    || (b.risco.exposicao ?? -1) - (a.risco.exposicao ?? -1)
    || (a.risco.mesesRestantesFidelidade ?? 99) - (b.risco.mesesRestantesFidelidade ?? 99) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export type DistribuicaoRisco = { total: number; critico: number; atencao: number; baixo: number; pctCritico: number | null; pctAtencao: number | null };
const distribuir = (l: MembroComRisco[]): DistribuicaoRisco => {
  const c = l.filter((m) => m.risco.nivel === 'critico').length, a = l.filter((m) => m.risco.nivel === 'atencao').length;
  const pct = (n: number) => (l.length ? Math.round((n / l.length) * 1000) / 10 : null);
  return { total: l.length, critico: c, atencao: a, baixo: l.length - c - a, pctCritico: pct(c), pctAtencao: pct(a) };
};

// Carteira inteira e cada CS lado a lado: o gestor vê quem concentra mais risco do que a média da rede.
export function resumirCarteira(l: MembroComRisco[]) {
  const porCS = new Map<string, MembroComRisco[]>();
  l.forEach((m) => porCS.set(m.cs || 'Sem CS', [...(porCS.get(m.cs || 'Sem CS') || []), m]));
  return {
    carteira: distribuir(l),
    porCS: [...porCS.entries()].map(([cs, ms]) => ({ cs, ...distribuir(ms) }))
      .sort((a, b) => (b.pctCritico ?? 0) - (a.pctCritico ?? 0) || b.critico - a.critico || a.cs.localeCompare(b.cs, 'pt-BR')),
    semDados: l.filter((m) => m.risco.semDados).length,
    exposicaoTotal: l.some((m) => m.risco.exposicao !== null) ? l.reduce((t, m) => t + (m.risco.exposicao ?? 0), 0) : null,
  };
}
