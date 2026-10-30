// Motor de busca do Vitorio com tipos. A implementação é public/vitorio-busca.js (um arquivo só, servido ao navegador e
// importado aqui e nos testes), para o navegador e o servidor nunca divergirem. Funções puras: sem rede, sem DOM.
import {
  VITORIO_LIMIAR_RESPOSTA, VITORIO_LIMIAR_MINIMO, VITORIO_MARGEM_AMBIGUIDADE,
} from '../constants.ts';
import motorJs from '../../public/vitorio-busca.js';

const motor: any = motorJs; // módulo UMD em JS: os tipos públicos estão declarados abaixo

export type DocVitorio = {
  chave: string; // colecao:id, estável
  colecao: 'faq' | 'processos' | 'pops' | 'fluxos' | 'modelos' | 'navegacao' | 'glossario';
  titulo: string;
  corpo: string; // texto original sem HTML
  perguntas: string[];
  palavras: string[]; // vocabulário extra do item (por exemplo o campo de busca do fluxo)
  destino: string | null;
  origem: string; // "Processos, POP"
  verbo: string; // "Abrir o POP"
  data: string | null; // data da publicação vigente (só processos)
  alvo?: string; // rota interna do documento de processos
};
export type ClasseBusca = 'resposta' | 'ambigua' | 'nada';
export type ResultadoBusca = { tipo: ClasseBusca; itens: { doc: DocVitorio; score: number }[]; realce: string[]; ranking?: { doc: DocVitorio; score: number }[] };
export type Trecho = { texto: string; prefixo: boolean; sufixo: boolean; marcas: [number, number][] };
export type Indice = unknown;
export type ConfigBusca = { limiarResposta: number; limiarMinimo: number; margemAmbiguidade: number };

export const CONFIG_BUSCA: ConfigBusca = {
  limiarResposta: VITORIO_LIMIAR_RESPOSTA, limiarMinimo: VITORIO_LIMIAR_MINIMO, margemAmbiguidade: VITORIO_MARGEM_AMBIGUIDADE,
};
export const PESOS_CAMPOS: Record<'titulo' | 'perguntas' | 'sinonimos' | 'corpo', number> = motor.PESOS;

export const normalizar: (texto: string) => string = motor.normalizar;
export const radical: (palavra: string) => string = motor.radical;
export const indexar: (docs: DocVitorio[], sinonimos: string[][]) => Indice = motor.indexar;
export const trecho: (texto: string, realce: string[], max?: number) => Trecho = motor.trecho;
export function buscar(indice: Indice, consulta: string, cfg: ConfigBusca = CONFIG_BUSCA): ResultadoBusca {
  return motor.buscar(indice, consulta, cfg);
}
