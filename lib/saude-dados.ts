// Classificação determinística da saúde dos dados a partir de public.saude_dados() (29/10/2026). Sem IA: só os
// limiares de SAUDE_DADOS_LIMITES. Devolve a faixa de relance e a lista de exceções, da mais grave à menos grave.
import { SAUDE_DADOS_LIMITES, SAUDE_DADOS_NOMES, SAUDE_DADOS_ROTINAS_15_MIN } from './constants.ts';

export type LinhaSaude = {
  board: string;
  ultima_sucesso: string | null;
  ultima_execucao: string | null;
  falhas_consecutivas: number;
  ultimo_erro: string | null;
  ultimo_erro_em: string | null;
};
export type Gravidade = 'atrasado' | 'critico';
export type ItemSaude = {
  board: string;
  nome: string;
  gravidade: Gravidade;
  minutosParado: number | null; // null: nunca houve execução bem sucedida
  ultimaSucesso: string | null;
  falhasConsecutivas: number;
  ultimoErro: string | null;
  acao: string;
};
export type ResumoSaude = {
  estado: 'saudavel' | 'atrasado' | 'critico' | 'vazio';
  texto: string;
  itens: ItemSaude[];
};

export function nomeDoBoard(board: string): string {
  return SAUDE_DADOS_NOMES[board] || board.replace(/_/g, ' ');
}

function acaoSugerida(erro: string | null): string {
  if (erro && /resend/i.test(erro)) return 'Acionar o responsável técnico: o serviço de envio de email recusou a chave. Os alertas continuam gravados, só o email não sai.';
  if (erro && /monday/i.test(erro)) return 'Acionar o responsável técnico se continuar assim no próximo ciclo: a leitura do Monday está falhando.';
  return 'Acionar o responsável técnico e informar o nome desta rotina e o último erro.';
}

export function minutosTexto(min: number): string {
  if (min < 1) return 'menos de 1 minuto';
  if (min < 60) return min === 1 ? '1 minuto' : `${min} minutos`;
  const h = Math.floor(min / 60);
  if (h < 48) return h === 1 ? '1 hora' : `${h} horas`;
  return `${Math.floor(h / 24)} dias`;
}

export function classificarSaude(linhas: LinhaSaude[], agora: Date = new Date()): ResumoSaude {
  if (!linhas.length) return { estado: 'vazio', texto: 'Ainda não há registro de sincronização.', itens: [] };
  const itens: ItemSaude[] = [];
  let maiorIdade = 0;
  for (const l of linhas) {
    const lim = SAUDE_DADOS_ROTINAS_15_MIN.includes(l.board) ? SAUDE_DADOS_LIMITES.quinzeMin : SAUDE_DADOS_LIMITES.cincoMin;
    const idade = l.ultima_sucesso ? Math.max(0, Math.floor((agora.getTime() - new Date(l.ultima_sucesso).getTime()) / 60000)) : null;
    if (idade !== null) maiorIdade = Math.max(maiorIdade, idade);
    const critico = idade === null || idade > lim.criticoMin || l.falhas_consecutivas >= SAUDE_DADOS_LIMITES.falhasCriticas;
    const atrasado = idade !== null && idade > lim.atrasadoMin;
    if (!critico && !atrasado) continue;
    itens.push({
      board: l.board, nome: nomeDoBoard(l.board), gravidade: critico ? 'critico' : 'atrasado', minutosParado: idade,
      ultimaSucesso: l.ultima_sucesso, falhasConsecutivas: l.falhas_consecutivas, ultimoErro: l.ultimo_erro, acao: acaoSugerida(l.ultimo_erro),
    });
  }
  const peso = (i: ItemSaude) => (i.gravidade === 'critico' ? 1 : 0);
  itens.sort((a, b) => peso(b) - peso(a) || (b.minutosParado ?? Infinity) - (a.minutosParado ?? Infinity));
  if (!itens.length) return { estado: 'saudavel', texto: `Dados atualizados há ${minutosTexto(maiorIdade)}`, itens };
  const criticos = itens.filter((i) => i.gravidade === 'critico').length;
  const atrasados = itens.length - criticos;
  const rotinas = (n: number) => (n === 1 ? '1 rotina' : `${n} rotinas`);
  const e = atrasados ? ` e ${atrasados} atrasada${atrasados === 1 ? '' : 's'}` : '';
  return criticos
    ? { estado: 'critico', texto: `${rotinas(criticos)} de dados parada${criticos === 1 ? '' : 's'}${e}. Abra para ver o que tratar.`, itens }
    : { estado: 'atrasado', texto: `${rotinas(itens.length)} de dados atrasada${itens.length === 1 ? '' : 's'}. Abra para ver.`, itens };
}
