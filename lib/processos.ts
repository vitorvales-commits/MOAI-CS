// Processos da área de CS (13/10/2026, revisto no mesmo dia com o arquivo real).
// O documento de processos é uma aplicação HTML completa (abas, busca, diagramas, POPs) cujo conteúdo
// vem de constantes de dados no script (META, PROCESSOS, FLUXOS, POPS, FAQ, MODELOS...). Por isso ele
// é guardado em duas partes: a moldura (o HTML inteiro com o bloco de dados trocado por PROC_MARCADOR)
// e os dados (a lista ordenada dessas constantes, já avaliadas como JSON). Editar = mexer em itens dos
// dados; a moldura só muda quando se importa um HTML novo. Arquivo sem bloco de dados é guardado
// inteiro na moldura, com dados vazios.
// A extração, a avaliação dos dados e a comparação rodam no navegador (public/processos.js); aqui
// ficam a leitura, a validação do que chega do cliente e as chamadas às funções SECURITY DEFINER.
// Testes: tests/processos.test.ts

import type { SupabaseClient } from '@supabase/supabase-js';

export const PROC_MARCADOR = '/*PROC_DADOS*/';
// Limite do corpo de requisição de função serverless na Vercel é 4,5 MB. Ficamos abaixo com folga.
export const PROC_LIMITE_BYTES = 4_000_000;
export const PROC_LIMITE_CONSTANTES = 200;
export const PROC_LIMITE_DESCRICAO = 300;

export type ConstanteProcessos =
  | { nome: string; tipo: 'valor'; valor: unknown }
  | { nome: string; tipo: 'fonte'; fonte: string };
export type DocumentoProcessos = {
  titulo: string; moldura: string; dados: ConstanteProcessos[];
  versao: number; atualizadoEm: string | null; atualizadoPor: string | null;
};
export type PublicacaoProcessos = {
  titulo: string; moldura: string; dados: ConstanteProcessos[]; descricao: string; versaoBase: number;
};

const NOME_VALIDO = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function contar(h: string, agulha: string): number {
  return h.split(agulha).length - 1;
}

// Valida e normaliza o que o editor envia. Devolve a publicação pronta ou a mensagem para a tela.
export function validarPublicacao(corpo: unknown): { ok: true; valor: PublicacaoProcessos } | { ok: false; erro: string } {
  const b = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, unknown>;
  const descricao = texto(b.descricao).trim();
  if (!descricao) return { ok: false, erro: 'Descreva o que mudou antes de publicar.' };
  if (descricao.length > PROC_LIMITE_DESCRICAO) return { ok: false, erro: 'A descrição passa de ' + PROC_LIMITE_DESCRICAO + ' caracteres.' };
  const versaoBase = Number(b.versaoBase);
  if (!Number.isInteger(versaoBase) || versaoBase < 0) return { ok: false, erro: 'Versão de base inválida. Recarregue a página.' };
  const moldura = texto(b.moldura);
  if (!moldura.trim()) return { ok: false, erro: 'O documento está vazio.' };
  if (!Array.isArray(b.dados)) return { ok: false, erro: 'Dados do documento em formato inválido.' };
  if (b.dados.length > PROC_LIMITE_CONSTANTES) return { ok: false, erro: 'O documento passa de ' + PROC_LIMITE_CONSTANTES + ' blocos de dados.' };
  const marcadores = contar(moldura, PROC_MARCADOR);
  if (b.dados.length > 0 && marcadores !== 1) return { ok: false, erro: 'A moldura precisa ter exatamente um marcador de dados.' };
  if (b.dados.length === 0 && marcadores !== 0) return { ok: false, erro: 'A moldura tem marcador de dados, mas nenhum dado foi enviado.' };

  const nomes = new Set<string>();
  const dados: ConstanteProcessos[] = [];
  for (let i = 0; i < b.dados.length; i++) {
    const c = (b.dados[i] && typeof b.dados[i] === 'object' ? b.dados[i] : {}) as Record<string, unknown>;
    const nome = texto(c.nome);
    if (!NOME_VALIDO.test(nome)) return { ok: false, erro: 'Nome de bloco de dados inválido na posição ' + (i + 1) + '.' };
    if (nomes.has(nome)) return { ok: false, erro: 'O bloco de dados ' + nome + ' aparece duas vezes.' };
    nomes.add(nome);
    if (c.tipo === 'valor') {
      if (c.valor === undefined) return { ok: false, erro: 'O bloco ' + nome + ' está sem valor.' };
      dados.push({ nome, tipo: 'valor', valor: c.valor });
    } else if (c.tipo === 'fonte') {
      const fonte = texto(c.fonte);
      if (!fonte.trim()) return { ok: false, erro: 'O bloco ' + nome + ' está sem código.' };
      if (/<\/script/i.test(fonte)) return { ok: false, erro: 'O bloco ' + nome + ' fecha a tag de script.' };
      dados.push({ nome, tipo: 'fonte', fonte });
    } else {
      return { ok: false, erro: 'Tipo inválido no bloco ' + nome + '.' };
    }
  }
  const valor: PublicacaoProcessos = {
    titulo: texto(b.titulo).trim().slice(0, 200) || 'Processos de CS',
    moldura, dados, descricao, versaoBase,
  };
  const bytes = Buffer.byteLength(JSON.stringify(valor), 'utf8');
  if (bytes > PROC_LIMITE_BYTES) return { ok: false, erro: 'O documento ficou com ' + (bytes / 1e6).toFixed(1) + ' MB, acima do limite de ' + (PROC_LIMITE_BYTES / 1e6) + ' MB.' };
  return { ok: true, valor };
}

// Traduz os erros das funções do banco para mensagens de tela. 409 para conflito de versão.
export function erroDoBanco(e: { message?: string; code?: string } | null): { status: number; erro: string } {
  const msg = String(e?.message || '');
  if (e?.code === '40001' || msg.startsWith('conflito')) return { status: 409, erro: 'Outra pessoa publicou uma versão nova enquanto você editava. Recarregue e refaça a alteração.' };
  if (e?.code === '42501' || msg.includes('acesso negado')) return { status: 403, erro: 'Só gestor pode alterar os processos.' };
  if (e?.code === '22023') return { status: 400, erro: msg.charAt(0).toUpperCase() + msg.slice(1) + '.' };
  return { status: 500, erro: 'Não foi possível salvar os processos agora.' };
}

export async function lerProcessos(supabase: SupabaseClient): Promise<DocumentoProcessos> {
  const { data, error } = await supabase.from('processos_documento')
    .select('titulo, moldura, dados, versao, atualizado_em, atualizado_por').eq('id', 1).maybeSingle();
  if (error) throw new Error('Erro ao ler processos_documento: ' + error.message);
  return {
    titulo: data?.titulo || 'Processos de CS', moldura: data?.moldura || '', dados: Array.isArray(data?.dados) ? data.dados : [],
    versao: data?.versao || 0, atualizadoEm: data?.atualizado_em || null, atualizadoPor: data?.atualizado_por || null,
  };
}

export async function publicarProcessos(supabase: SupabaseClient, p: PublicacaoProcessos) {
  return supabase.rpc('processos_publicar', {
    p_titulo: p.titulo, p_moldura: p.moldura, p_dados: p.dados, p_descricao: p.descricao, p_versao_base: p.versaoBase,
  });
}

export async function listarVersoesProcessos(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('processos_versoes')
    .select('versao, criado_em, criado_por, descricao, tamanho_bytes')
    .order('versao', { ascending: false });
  if (error) throw new Error('Erro ao ler processos_versoes: ' + error.message);
  return (data || []).map((v: any) => ({
    versao: v.versao, criadoEm: v.criado_em, criadoPor: v.criado_por, descricao: v.descricao, tamanhoBytes: v.tamanho_bytes,
  }));
}

export async function lerVersaoProcessos(supabase: SupabaseClient, versao: number) {
  const { data, error } = await supabase.from('processos_versoes').select('versao, snapshot').eq('versao', versao).maybeSingle();
  if (error) throw new Error('Erro ao ler a versão: ' + error.message);
  if (!data) return null;
  const s = data.snapshot || {};
  return { versao: data.versao, titulo: s.titulo || 'Processos de CS', moldura: s.moldura || '', dados: Array.isArray(s.dados) ? s.dados : [] };
}
