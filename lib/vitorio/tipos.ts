// Tipos do pipeline do Vitorio 2 (30/10/2026). Tudo determinístico: sem IA, sem API externa.
export type Perfil = 'cs' | 'gestor';
export type TipoEntidade = 'cs' | 'conselho' | 'membro' | 'indicador' | 'produto' | 'advertencia';

export type Entidade = { tipo: TipoEntidade; id: string; rotulo: string };
// mes: nome do seletor ('Outubro'); varios meses (trimestre) usam meses.
export type Periodo =
  | { tipo: 'mes'; mes: string; ano: number; rotulo: string }
  | { tipo: 'trimestre'; meses: { mes: string; ano: number }[]; rotulo: string }
  | { tipo: 'semana'; inicio: string; fim: string; rotulo: string }
  | { tipo: 'dia'; data: string; rotulo: string };

export type Ambiguidade = { tipo: TipoEntidade; texto: string; opcoes: Entidade[] };
export type Entidades = {
  cs?: Entidade; conselho?: Entidade; membro?: Entidade; indicador?: Entidade; produto?: Entidade; advertencia?: Entidade;
  periodo?: Periodo;
  eu?: boolean; // a pergunta usa primeira pessoa (meu, minha, eu): o CS é o usuário logado
  ambiguas: Ambiguidade[];
};

export type Intencao = {
  id: string;
  familia: 'time' | 'carteira' | 'agenda' | 'indicadores' | 'report' | 'pontos' | 'relatorio' | 'gtd' | 'nps' | 'churn' | 'um_a_um' | 'saude' | 'causa' | 'plataforma' | 'processo' | 'social';
  // Frases exemplo. Marcadores de entidade: {cs} {conselho} {membro} {indicador} {periodo} {produto}
  exemplos: string[];
  obrigatorias: TipoEntidade[]; // sem valor padrão, o Vitorio pergunta
  opcionais?: TipoEntidade[];
  // Valores padrão quando faltam: periodo = mês atual; cs = o próprio usuário (se for CS)
  padrao?: { periodo?: 'mes_atual' | 'semana_atual' | 'hoje'; cs?: 'eu' };
  perfis: Perfil[];
  manipulador: string;
  modelos: string[]; // variações de frase; {placeholders} são preenchidos pelo manipulador
  continuacoes: string[]; // perguntas de continuação sugeridas
};

export type Comparacao = { rotulo: string; valor: string; tom?: 'bom' | 'ruim' | 'neutro' };
export type Bloco =
  | { tipo: 'numero'; rotulo: string; valor: string; unidade?: string; comparacoes: Comparacao[]; foraDoAlvo?: boolean }
  | { tipo: 'lista'; itens: { titulo: string; sub?: string; foto?: string | null }[]; total: number; verTodos?: { rotulo: string; url: string } }
  | { tipo: 'passos'; passos: { n: number; texto: string; responsavel?: string; prazo?: string }[] }
  | { tipo: 'trecho'; texto: string; origem: string; data?: string | null };
export type Fonte = { origem: string; periodo: string; regra: string; sincronizadoEm?: string | null };
export type Opcao = { rotulo: string; preencher: { tipo: TipoEntidade; id: string; rotulo: string } };

export type ResultadoResposta = 'resposta' | 'ambigua' | 'nada' | 'social' | 'recusa';
export type Resposta = {
  resultado: ResultadoResposta;
  intencao: string | null;
  confianca: number;
  texto: string;
  blocos: Bloco[];
  fonte?: Fonte; // obrigatória em toda resposta de dado
  destino?: { rotulo: string; url: string };
  esclarecer?: { pergunta: string; opcoes: Opcao[]; faltando: TipoEntidade };
  sugestoes: string[];
  entidades: Entidades;
  chave?: string | null; // item de processo escolhido, para o registro
};

export type Turno = { pergunta: string; intencao: string | null; entidades: Entidades; destino?: { rotulo: string; url: string } };
