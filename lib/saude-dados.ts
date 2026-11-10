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

// ---- Exceções de dados (etapas 6 e 7): nomes de CS não reconhecidos e exclusões de dado nativo no dash ----
// Mesma faixa e mesmo painel da saúde das rotinas. Sem exceção, nada aparece. Ambas são âmbar: pedem um
// tratamento, mas não param nenhuma rotina.
export type PendenciaVinculo = {
  texto_original: string;
  texto_normalizado: string;
  fontes: string[];
  ocorrencias: number;
  sugestao_cs_id: number | null;
  sugestao_nome: string | null;
};
export type ExclusaoDado = {
  id: number;
  tabela: string;
  rotulo: string;
  chave: string;
  resumo: string | null;
  removido_em: string;
  removido_por: string | null;
  restaurado_em: string | null;
};
// CS ativo, como vem de cs_ativos_lista() (banco): id para canonico_confirmar_apelido, nome curto para a lista.
export type CsAtivo = { id: number; nome_curto: string; nome_completo: string | null };
export type AcaoExcecao =
  | { tipo: 'confirmar_cs'; rotulo: string; cs_id: number }
  | { tipo: 'escolher_cs'; rotulo: string }
  | { tipo: 'ignorar'; rotulo: string }
  | { tipo: 'restaurar'; rotulo: string };
export type ItemExcecao = {
  id: string;
  tipo: 'vinculo' | 'exclusao';
  gravidade: 'atrasado';
  titulo: string;
  texto: string;
  acoes: AcaoExcecao[];
  ref: { texto?: string; lixeiraId?: number };
};
export type ResumoExcecoes = { quantidade: number; texto: string | null };

const FONTES_LEGIVEIS: Record<string, string> = {
  'churn_items.quem_e_seu_cs': 'Churn (Quem é seu CS)',
};
export function fonteLegivel(fonte: string): string {
  return FONTES_LEGIVEIS[fonte] ?? fonte.replace(/[._]/g, ' ');
}

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios;
}

// "há 3 horas", "há 1 dia": reaproveita o formato de minutosTexto, com o prefixo que a frase pede.
export function haTexto(removidoEm: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(removidoEm).getTime()) / 60000));
  return `há ${minutosTexto(min)}`;
}

export function classificarExcecoesDados(
  pendencias: PendenciaVinculo[],
  exclusoes: ExclusaoDado[],
  agora: Date = new Date(),
): ItemExcecao[] {
  const vinculos: ItemExcecao[] = [...pendencias]
    .sort((a, b) => b.ocorrencias - a.ocorrencias || a.texto_normalizado.localeCompare(b.texto_normalizado))
    .map((p) => {
      const acoes: AcaoExcecao[] = [];
      if (p.sugestao_cs_id !== null && p.sugestao_nome) {
        acoes.push({ tipo: 'confirmar_cs', rotulo: `Este é o CS: ${p.sugestao_nome}`, cs_id: p.sugestao_cs_id });
      } else {
        // Sem sugestão do banco: o gestor escolhe o CS na lista de CS ativos (cs_ativos_lista).
        acoes.push({ tipo: 'escolher_cs', rotulo: 'Este é o CS...' });
      }
      acoes.push({ tipo: 'ignorar', rotulo: 'Não é um CS' });
      const fontes = [...new Set(p.fontes.map(fonteLegivel))].join(', ');
      return {
        id: `vinculo:${p.texto_normalizado}`,
        tipo: 'vinculo',
        gravidade: 'atrasado',
        titulo: `Nome de CS não reconhecido: ${p.texto_original}`,
        texto: `${p.ocorrencias} ${plural(p.ocorrencias, 'registro', 'registros')} em ${fontes || 'fonte não informada'} ${plural(p.ocorrencias, 'usa', 'usam')} esse nome. Ele precisa apontar para um CS ou ser ignorado para entrar nos indicadores.`,
        acoes,
        ref: { texto: p.texto_original },
      };
    });
  const exclusoesItens: ItemExcecao[] = [...exclusoes]
    .sort((a, b) => new Date(b.removido_em).getTime() - new Date(a.removido_em).getTime())
    .map((e) => ({
      id: `exclusao:${e.id}`,
      tipo: 'exclusao',
      gravidade: 'atrasado',
      titulo: `${e.rotulo} excluído no dash`,
      texto: `${e.resumo || e.rotulo}. Excluído por ${e.removido_por || 'autor não informado'} ${haTexto(e.removido_em, agora)}.`,
      acoes: [{ tipo: 'restaurar', rotulo: 'Restaurar' }],
      ref: { lixeiraId: e.id },
    }));
  return [...vinculos, ...exclusoesItens];
}

// Frase da faixa para as exceções, ou nula quando não há nenhuma.
export function resumoExcecoes(itens: ItemExcecao[]): ResumoExcecoes {
  const nomes = itens.filter((i) => i.tipo === 'vinculo').length;
  const exclusoes = itens.length - nomes;
  if (!itens.length) return { quantidade: 0, texto: null };
  const partes: string[] = [];
  if (nomes) partes.push(`${nomes} ${plural(nomes, 'nome de CS não reconhecido', 'nomes de CS não reconhecidos')}`);
  if (exclusoes) partes.push(`${exclusoes} ${plural(exclusoes, 'exclusão de dado no dash', 'exclusões de dado no dash')}`);
  return { quantidade: itens.length, texto: `${partes.join(' e ')}. Ver o que tratar.` };
}

// Estado da faixa combinado: a exceção mais grave manda. Rotina parada (crítico) continua na frente; exceção
// de dados só torna a faixa âmbar quando as rotinas estão saudáveis.
export function combinarEstadoFaixa(
  rotinas: ResumoSaude,
  excecoes: ResumoExcecoes,
): { estado: ResumoSaude['estado']; texto: string } {
  if (rotinas.estado === 'vazio') return { estado: 'vazio', texto: rotinas.texto };
  if (!excecoes.quantidade) return { estado: rotinas.estado, texto: rotinas.texto };
  if (rotinas.estado === 'critico') return { estado: 'critico', texto: `${rotinas.texto} ${excecoes.texto}` };
  if (rotinas.estado === 'atrasado') return { estado: 'atrasado', texto: `${rotinas.texto} ${excecoes.texto}` };
  return { estado: 'atrasado', texto: excecoes.texto as string };
}
