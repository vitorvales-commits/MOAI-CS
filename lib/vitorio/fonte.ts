// Interface de dados do Vitorio 2 (30/10/2026). Os manipuladores só enxergam esta interface: a implementação real
// (lib/vitorio/fonte-supabase.ts) reaproveita as funções do dash, e os testes usam uma fixture. Nunca há SQL montado a partir do texto.
export type CSLite = { nome: string; nomeCompleto?: string | null; apelido?: string | null };
export type ConselhoLite = { groupId: string; titulo: string; congelado: boolean };
export type NpsLite = { total: number; conselheiro: number | null; conselho: number | null; notaCS: number | null };
export type EncontroRelatorioLite = { groupId: string; conselho: string; cs: string | null; dataEncontro: string; prazo: string; estado: string; diasRestantes: number };
export type IndicadorLite = { meta: number | null; alcancado: number | null; tipoMeta: 'min' | 'max'; unidade?: string };
export type RelatorioCSLite = {
  indicadores: Record<string, IndicadorLite>;
  conselhos: { nome: string; groupId: string; membros: number; proximaData: string | null; proximaDataEhFutura: boolean | null; confirmados: number | null; status: string; congelado: boolean; presente: number | null; registros: number | null }[];
};
export type AdvertenciasLite = { ativos: number; total: number; proximoVencimento: string | null; registros: { tipo: string; pontos: number; data: string; validoAte: string; observacao: string | null; origem: string; ativa: boolean }[] };

export interface FonteDados {
  roster(mes: string, ano: number): Promise<CSLite[]>;
  conselhos(): Promise<ConselhoLite[]>;
  membros(groupId: string): Promise<{ nome: string; statusPagamento: string | null }[]>;
  contagemMembros(groupIds: string[]): Promise<number>;
  conselhosDoMembro(nome: string): Promise<ConselhoLite[]>;
  gestores(): Promise<{ nome: string | null; email: string }[]>;
  encontros(groupIds: string[], de: string, ate: string): Promise<{ groupId: string; data: string }[]>;
  relatorioCS(nome: string, mes: string, ano: number): Promise<RelatorioCSLite>;
  revelarEquipe(): Promise<boolean>;
  advertencias(cs: string): Promise<AdvertenciasLite>;
  reportsDaSemana(inicioSemana: string): Promise<{ cs: string; enviadoEm: string | null }[]>;
  encontrosRelatorio(cs: string | null): Promise<EncontroRelatorioLite[]>;
  gtd(cs: string | null): Promise<{ cs: string; atrasadas: number; aVencer: number; maiorAtrasoDias: number }[]>;
  nps(mes: string, ano: number): Promise<{ geral: NpsLite; porCS: (NpsLite & { cs: string })[] }>;
  alertasNps(): Promise<{ texto: string }[]>;
  umAUm(cs: string, gestor: boolean): Promise<{ ultimaData: string | null; resumo: string | null; abertos: number }>;
  saude(): Promise<{ estado: string; texto: string }>;
  sincronizadoEm(): Promise<string | null>;
}
